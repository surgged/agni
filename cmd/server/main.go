package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/labstack/echo/v5"
	echomw "github.com/labstack/echo/v5/middleware"
	echoSwagger "github.com/swaggo/echo-swagger/v2"

	_ "github.com/surgged/agni/docs"
	"github.com/surgged/agni/internal/adapters/auth/agentapikey"
	"github.com/surgged/agni/internal/adapters/auth/jwt"
	redisclient "github.com/surgged/agni/internal/adapters/cache/redis"
	resendadapter "github.com/surgged/agni/internal/adapters/email/resend"
	"github.com/surgged/agni/internal/adapters/eventbus"
	"github.com/surgged/agni/internal/adapters/http/web"
	"github.com/surgged/agni/internal/adapters/http/web/middleware"
	v1 "github.com/surgged/agni/internal/adapters/http/web/v1"
	"github.com/surgged/agni/internal/adapters/persistence/gorm"
	"github.com/surgged/agni/internal/adapters/uow"
	"github.com/surgged/agni/internal/adapters/workflow"
	appapp "github.com/surgged/agni/internal/application/app"
	"github.com/surgged/agni/internal/application/deploy"
	shareapp "github.com/surgged/agni/internal/application/sharelink"
	userapp "github.com/surgged/agni/internal/application/user"
	"github.com/surgged/agni/internal/composition"

	// crank:composition-imports (do not remove — `crank make handler` splices new application imports here)
	"github.com/surgged/agni/internal/config"
	"github.com/surgged/agni/pkg/crypto"
	"github.com/surgged/agni/pkg/logging"
)

// @title           agni API
// @version         1.0
// @description     Production-ready backend service scaffolded by crank.
//
// @host            localhost:8080
// @BasePath        /
//
// @accept          json
// @produce         json
//
// @securityDefinitions.apikey BearerAuth
// @in   header
// @name Authorization
// @description Enter "Bearer {token}" to authenticate.

func main() {
	cfg := config.Load()

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	logger := logging.New(logging.ParseLevel(cfg.Logging.Level), cfg.Logging.AddSource)
	slog.SetDefault(logger)

	logger.Info("starting application",
		"app", cfg.App.Name,
		"env", cfg.App.Env,
		"log_level", cfg.Logging.Level,
	)

	// Shared infrastructure (Postgres, S3, buildah, k3s) — also used by the
	// worker binary via the same composition package.
	infra, err := composition.NewInfra(cfg)
	if err != nil {
		logger.Error("failed to initialize infrastructure", "error", err)
		os.Exit(1)
	}
	defer infra.Close()

	logger.Info("S3 archive store connected", "bucket", cfg.S3.Bucket, "endpoint", cfg.S3.Endpoint)

	rdb, err := redisclient.NewClient(cfg.Redis)
	if err != nil {
		logger.Warn("redis unavailable, continuing without it", "error", err)
		rdb = nil
	}
	defer redisclient.Close(rdb)

	// ---- Composition root: explicit DDD wiring ----
	bus := eventbus.NewInMemory()
	userRepo := gorm.NewUserRepository(infra.GormDB)
	// crank:repos (do not remove — `crank make handler` splices new repository constructors here)
	appRepo := gorm.NewAppRepository(infra.GormDB)
	sharelinkRepo := gorm.NewShareLinkRepository(infra.GormDB)

	uowOpts := []uow.Option{
		uow.WithUserRepo(userRepo),
		// crank:uow-repos (do not remove — `crank make handler` splices new WithXxxRepo options here)
		uow.WithAppRepo(appRepo),
		uow.WithShareLinkRepo(sharelinkRepo),
	}
	unit := uow.NewInMemoryUoW(bus, userRepo, uowOpts...)

	hasher := crypto.NewBCryptHasher()

	denylist := gorm.NewTokenDenylist(infra.GormDB)
	tokens := jwt.NewTokenService(cfg.JWT, denylist)

	// ---- Agent token service ----
	agentTokens := agentapikey.NewAgentTokenService(cfg.MCP.AgentSigningSecret, cfg.MCP.AgentTokenTTL)

	// ---- Email adapter ----
	emailClient := resendadapter.NewClient(cfg.Email.ResendAPIKey, cfg.Email.FromAddress, cfg.Share.Domain)

	userCmd := userapp.NewCommandHandler(userRepo, unit, hasher, emailClient)
	userQry := userapp.NewQueryHandler(userRepo)
	userHandler := v1.NewUserHandler(userCmd, userQry)

	// ---- Application services ----
	appCmd := appapp.NewCommandHandler(appRepo, unit)
	appQry := appapp.NewQueryHandler(appRepo)
	sharelinkCmd := shareapp.NewCommandHandler(sharelinkRepo, unit)
	sharelinkQry := shareapp.NewQueryHandler(sharelinkRepo)

	// ---- Deploy service ----
	deploySvc := deploy.NewService(deploy.ServiceConfig{
		ArchiveStore:      infra.S3Store,
		ImageBuilder:      infra.ImageBuilder,
		Provider:          infra.Provider,
		Workflow:          nil, // wired below after Temporal client dials
		AppCmd:            appCmd,
		AppQry:            appQry,
		Domain:            cfg.Share.Domain,
		RegistryURL:       cfg.Registry.URL,
		MaxRunningPerUser: 1,
	})

	// ---- Temporal client (starts/cancels workflows; does NOT run a worker) ----
	wfClient, err := workflow.Dial(workflow.WorkerConfig{
		HostPort:  cfg.Workflows.HostPort,
		Namespace: cfg.Workflows.Namespace,
		TaskQueue: cfg.Workflows.TaskQueue,
	})
	if err != nil {
		logger.Warn("failed to dial temporal, deployments will not be processed", "error", err)
	} else {
		deploySvc.SetWorkflow(wfClient)
		logger.Info("temporal client connected",
			"host_port", cfg.Workflows.HostPort,
			"namespace", cfg.Workflows.Namespace,
			"task_queue", cfg.Workflows.TaskQueue,
		)
		defer wfClient.Close()
	}

	appHandler := v1.NewAppHandler(appCmd, appQry, deploySvc, agentTokens, infra.Provider)
	shareHandler := v1.NewShareHandler(sharelinkCmd, sharelinkQry)
	magicHandler := v1.NewMagicHandler(cfg.Share, agentTokens, emailClient, userCmd, userQry)
	sessionHandler := v1.NewSessionHandler(agentTokens, sharelinkRepo)
	meHandler := v1.NewMeHandler(userQry, tokens, agentTokens)
	clusterHealthHandler := v1.NewClusterHealthHandler()
	// crank:composition-root (do not remove — `crank make handler` splices new cmd/qry/handler wiring here)

	e := web.NewServer(logger)
	e.Use(echomw.Recover())
	e.Use(middleware.RequestLogger())
	e.Use(middleware.HostRouter(cfg.Share.Domain))

	e.Use(echomw.CORSWithConfig(echomw.CORSConfig{
		UnsafeAllowOriginFunc: func(c *echo.Context, origin string) (string, bool, error) { return origin, true, nil },
		AllowMethods:          []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodOptions},
		AllowHeaders:          []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
		AllowCredentials:      true,
		MaxAge:                300,
	}))

	e.GET("/swagger", func(c *echo.Context) error {
		return c.Redirect(http.StatusMovedPermanently, "/swagger/index.html")
	})
	e.GET("/swagger/*", echoSwagger.WrapHandler)
	e.GET("/health", web.Health)

	mountCfg := v1.MountConfig{
		UserHandler:          userHandler,
		AppHandler:           appHandler,
		ShareHandler:         shareHandler,
		MagicHandler:         magicHandler,
		SessionHandler:       sessionHandler,
		MeHandler:            meHandler,
		ClusterHealthHandler: clusterHealthHandler,
		// crank:mount-config (do not remove — `crank make handler` splices new handler fields here)
	}
	v1.Mount(e, mountCfg)

	authHandler := web.NewAuthHandler(userCmd, userQry, tokens)
	authHandler.Register(e)

	web.ServeViews(e, cfg.Views, logger)

	addr := cfg.App.Host + ":" + strconv.Itoa(cfg.App.Port)
	logger.Info("server listening", "addr", addr)

	sc := echo.StartConfig{
		Address:         addr,
		HideBanner:      true,
		HidePort:        true,
		GracefulTimeout: 10 * time.Second,
	}
	if err := sc.Start(ctx, e); err != nil && err != http.ErrServerClosed {
		logger.Error("server error", "error", err)
		os.Exit(1)
	}

	logger.Info("server stopped")
}
