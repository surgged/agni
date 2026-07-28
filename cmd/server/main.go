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
	"github.com/surgged/agni/internal/adapters/eventbus"
	"github.com/surgged/agni/internal/adapters/http/web"
	"github.com/surgged/agni/internal/adapters/http/web/middleware"
	v1 "github.com/surgged/agni/internal/adapters/http/web/v1"
	"github.com/surgged/agni/internal/adapters/persistence/gorm"
	"github.com/surgged/agni/internal/adapters/uow"
	userapp "github.com/surgged/agni/internal/application/user"
	// crank:composition-imports (do not remove — `crank make handler` splices new application imports here)
	"github.com/surgged/agni/internal/adapters/auth/jwt"
	redisclient "github.com/surgged/agni/internal/adapters/cache/redis"
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

	uowOpts := []uow.Option{
		uow.WithUserRepo(userRepo),
		// crank:uow-repos (do not remove — `crank make handler` splices new WithXxxRepo options here)
	}
	uow := uow.NewInMemoryUoW(bus, userRepo, uowOpts...)

	hasher := crypto.NewBCryptHasher()

	denylist := gorm.NewTokenDenylist(gormDB)
	tokens := jwt.NewTokenService(cfg.JWT, denylist)

	userCmd := userapp.NewCommandHandler(userRepo, uow, hasher)
	userQry := userapp.NewQueryHandler(userRepo)
	userHandler := v1.NewUserHandler(userCmd, userQry)
	// crank:composition-root (do not remove — `crank make handler` splices new cmd/qry/handler wiring here)

	e := web.NewServer(logger)
	e.Use(echomw.Recover())
	e.Use(middleware.RequestLogger())

	e.Use(echomw.CORSWithConfig(echomw.CORSConfig{
		AllowOrigins:     cfg.App.CORSOrigins,
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	e.GET("/swagger/*", echoSwagger.WrapHandler)
	e.GET("/health", web.Health)

	mountCfg := v1.MountConfig{
		UserHandler: userHandler,
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
