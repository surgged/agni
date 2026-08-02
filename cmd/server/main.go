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
	"github.com/surgged/agni/internal/adapters/builder/buildah"
	redisclient "github.com/surgged/agni/internal/adapters/cache/redis"
	resendadapter "github.com/surgged/agni/internal/adapters/email/resend"
	"github.com/surgged/agni/internal/adapters/eventbus"
	"github.com/surgged/agni/internal/adapters/http/web"
	"github.com/surgged/agni/internal/adapters/http/web/middleware"
	v1 "github.com/surgged/agni/internal/adapters/http/web/v1"
	"github.com/surgged/agni/internal/adapters/persistence/gorm"
	"github.com/surgged/agni/internal/adapters/provider/k3s"
	"github.com/surgged/agni/internal/adapters/storage/s3"
	"github.com/surgged/agni/internal/adapters/uow"
	"github.com/surgged/agni/internal/adapters/workflow"
	appapp "github.com/surgged/agni/internal/application/app"
	"github.com/surgged/agni/internal/application/deploy"
	shareapp "github.com/surgged/agni/internal/application/sharelink"
	userapp "github.com/surgged/agni/internal/application/user"
	"github.com/surgged/agni/internal/ports"
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

	logger := logging.New(logging.ParseLevel(cfg.Logging.Level), cfg.Logging.AddSource)
	slog.SetDefault(logger)

	logger.Info("starting application",
		"app", cfg.App.Name,
		"env", cfg.App.Env,
		"log_level", cfg.Logging.Level,
	)

	gormDB, err := gorm.NewDB(cfg.Database)
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer func() {
		sqlDB, dbErr := gormDB.DB()
		if dbErr != nil {
			return
		}
		_ = sqlDB.Close()
	}()

	rdb, err := redisclient.NewClient(cfg.Redis)
	if err != nil {
		logger.Warn("redis unavailable, continuing without it", "error", err)
		rdb = nil
	}
	if rdb != nil {
		defer func() { _ = rdb.Close() }()
	}

	// ---- Composition root: explicit DDD wiring ----
	bus := eventbus.NewInMemory()
	userRepo := gorm.NewUserRepository(gormDB)
	// crank:repos (do not remove — `crank make handler` splices new repository constructors here)
	appRepo := gorm.NewAppRepository(gormDB)
	sharelinkRepo := gorm.NewShareLinkRepository(gormDB)

	uowOpts := []uow.Option{
		uow.WithUserRepo(userRepo),
		// crank:uow-repos (do not remove — `crank make handler` splices new WithXxxRepo options here)
		uow.WithAppRepo(appRepo),
		uow.WithShareLinkRepo(sharelinkRepo),
	}
	uow := uow.NewInMemoryUoW(bus, userRepo, uowOpts...)

	hasher := crypto.NewBCryptHasher()

	denylist := gorm.NewTokenDenylist(gormDB)
	tokens := jwt.NewTokenService(cfg.JWT, denylist)

	// ---- Agent token service ----
	agentTokens := agentapikey.NewAgentTokenService(cfg.MCP.AgentSigningSecret, cfg.MCP.AgentTokenTTL)

	// ---- Email adapter ----
	emailClient := resendadapter.NewClient(cfg.Email.ResendAPIKey, cfg.Email.FromAddress, cfg.Share.Domain)

	// ---- k3s provider ----
	k3sProvider := k3s.NewProvider(cfg.K3s.Namespace, cfg.K3s.RegistryAddr, cfg.Share.Domain)

	userCmd := userapp.NewCommandHandler(userRepo, uow, hasher, emailClient)
	userQry := userapp.NewQueryHandler(userRepo)
	userHandler := v1.NewUserHandler(userCmd, userQry)

	// ---- Application services ----
	appCmd := appapp.NewCommandHandler(appRepo, uow)
	appQry := appapp.NewQueryHandler(appRepo)
	sharelinkCmd := shareapp.NewCommandHandler(sharelinkRepo, uow)
	sharelinkQry := shareapp.NewQueryHandler(sharelinkRepo)

	// ---- Deploy service ----
	s3Store, err := s3.NewStore(
		cfg.S3.Endpoint,
		cfg.S3.Region,
		cfg.S3.Bucket,
		cfg.S3.AccessKey,
		cfg.S3.SecretKey,
		cfg.S3.UseSSL,
	)
	if err != nil {
		logger.Error("failed to create S3 store", "error", err)
		os.Exit(1)
	}
	logger.Info("S3 archive store connected", "bucket", cfg.S3.Bucket, "endpoint", cfg.S3.Endpoint)

	imageBuilder := buildah.NewBuilder("buildah", "", "")

	// Create deploy service early so workflow can reference it
	deploySvc := deploy.NewService(deploy.ServiceConfig{
		ArchiveStore:      s3Store,
		ImageBuilder:      imageBuilder,
		Provider:          k3sProvider,
		Orchestrator:      nil, // wired after worker starts
		AppCmd:            appCmd,
		AppQry:            appQry,
		Domain:            cfg.Share.Domain,
		RegistryURL:       cfg.Registry.URL,
		MaxRunningPerUser: 1,
	})

	// ---- Workflow worker (embedded, Postgres backend) ----
	activityDeps := &workflow.ActivityDeps{
		ArchiveStore:  s3Store,
		ImageBuilder:  imageBuilder,
		Provider:      k3sProvider,
		AppCmd:        appCmd,
		DeployService: deploySvc,
	}

	var orch ports.Orchestrator
	wrk, err := workflow.StartWorker(context.Background(), activityDeps, cfg.Database.WorkerDSN)
	if err != nil {
		logger.Warn("failed to start workflow worker, deployments run without orchestration", "error", err)
	} else {
		orch = wrk.Orchestrator()
		logger.Info("workflow worker started (embedded, Postgres backend)")
		defer wrk.Stop()
	}

	// Wire the orchestrator into deploy service (set after worker starts)
	deploySvc.SetOrchestrator(orch)

	appHandler := v1.NewAppHandler(appCmd, appQry, deploySvc, agentTokens, k3sProvider)
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

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

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
