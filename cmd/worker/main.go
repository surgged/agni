// Command worker runs the Temporal worker process. It registers the
// DeploymentWorkflow and all deploy activities on the configured task
// queue and polls Temporal for work until SIGINT/SIGTERM.
//
// Run separately from the API server:
//
//	crank run              # API server (cmd/server)
//	go run ./cmd/worker    # Temporal worker (this binary)
package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/surgged/agni/internal/adapters/eventbus"
	"github.com/surgged/agni/internal/adapters/persistence/gorm"
	"github.com/surgged/agni/internal/adapters/uow"
	"github.com/surgged/agni/internal/adapters/workflow"
	appapp "github.com/surgged/agni/internal/application/app"
	"github.com/surgged/agni/internal/application/deploy"
	"github.com/surgged/agni/internal/composition"
	"github.com/surgged/agni/internal/config"
	"github.com/surgged/agni/pkg/logging"
)

func main() {
	cfg := config.Load()

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	logger := logging.New(logging.ParseLevel(cfg.Logging.Level), cfg.Logging.AddSource)
	slog.SetDefault(logger)

	logger.Info("starting temporal worker",
		"temporal", cfg.Workflows.HostPort,
		"namespace", cfg.Workflows.Namespace,
		"task_queue", cfg.Workflows.TaskQueue,
	)

	// Shared infrastructure (Postgres, S3, buildah, k3s).
	infra, err := composition.NewInfra(cfg)
	if err != nil {
		logger.Error("failed to initialize infrastructure", "error", err)
		os.Exit(1)
	}
	defer infra.Close()

	// Application layer — the worker only needs app commands (status
	// transitions) and the deploy service (for BuildImageRef / BuildServiceURL
	// / SanitizeUserError utilities used by activities).
	bus := eventbus.NewInMemory()
	appRepo := gorm.NewAppRepository(infra.GormDB)
	userRepo := gorm.NewUserRepository(infra.GormDB) // UoW requires a user repo
	unit := uow.NewInMemoryUoW(bus, userRepo, uow.WithAppRepo(appRepo))

	appCmd := appapp.NewCommandHandler(appRepo, unit)
	appQry := appapp.NewQueryHandler(appRepo)

	deploySvc := deploy.NewService(deploy.ServiceConfig{
		ArchiveStore:      infra.S3Store,
		ImageBuilder:      infra.ImageBuilder,
		Provider:          infra.Provider,
		Workflow:          nil, // worker doesn't start workflows
		AppCmd:            appCmd,
		AppQry:            appQry,
		Domain:            cfg.Share.Domain,
		RegistryURL:       cfg.Registry.URL,
		MaxRunningPerUser: 1,
	})

	deps := &workflow.ActivityDeps{
		ArchiveStore:  infra.S3Store,
		ImageBuilder:  infra.ImageBuilder,
		Provider:      infra.Provider,
		AppCmd:        appCmd,
		DeployService: deploySvc,
	}

	wrk, err := workflow.StartWorker(ctx, workflow.WorkerConfig{
		HostPort:  cfg.Workflows.HostPort,
		Namespace: cfg.Workflows.Namespace,
		TaskQueue: cfg.Workflows.TaskQueue,
	}, deps)
	if err != nil {
		logger.Error("failed to start temporal worker", "error", err)
		os.Exit(1)
	}
	defer wrk.Stop()

	logger.Info("temporal worker running — waiting for shutdown signal")
	<-ctx.Done()
	logger.Info("worker shutting down")
}
