package workflow

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"

	_ "github.com/jackc/pgx/v5/stdlib"

	pgbackend "github.com/cschleiden/go-workflows/backend/postgres"
	"github.com/cschleiden/go-workflows/client"
	"github.com/cschleiden/go-workflows/worker"
	"github.com/cschleiden/go-workflows/workflow"

	"github.com/surgged/agni/internal/ports"
)

// Worker wraps the go-workflows worker, its backend, and exposes an
// Orchestrator the application layer uses to start/cancel deployments.
type Worker struct {
	w            *worker.Worker
	activities   *Activities
	orchestrator ports.Orchestrator
}

// StartWorker creates a Postgres-backed go-workflows worker, registers
// every activity + the DeploymentWorkflow, and starts the worker in a
// background goroutine. Returns a Worker whose Orchestrator() can be
// wired into the deploy service.
func StartWorker(ctx context.Context, deps *ActivityDeps, workerDSN string) (*Worker, error) {
	db, err := sql.Open("pgx", workerDSN)
	if err != nil {
		return nil, fmt.Errorf("open worker database: %w", err)
	}

	b := pgbackend.NewPostgresBackendWithDB(db,
		pgbackend.WithBackendOptions(),
	)

	a := &Activities{Deps: deps}
	w := worker.New(b, &worker.Options{})

	// Register workflow
	if err := w.RegisterWorkflow(DeploymentWorkflow); err != nil {
		return nil, fmt.Errorf("register workflow: %w", err)
	}

	// Register all activities (one per file in activities_*.go)
	activities := []struct {
		fn   workflow.Activity
		name string
	}{
		{a.MarkBuilding, "MarkBuilding"},
		{a.MarkDeploying, "MarkDeploying"},
		{a.ValidateArchive, "ValidateArchive"},
		{a.BuildImage, "BuildImage"},
		{a.ResolvePort, "ResolvePort"},
		{a.DeployRuntime, "DeployRuntime"},
		{a.WaitHealthy, "WaitHealthy"},
		{a.Finalize, "Finalize"},
		{a.CleanupPartial, "CleanupPartial"},
		{a.MarkFailed, "MarkFailed"},
	}

	for _, act := range activities {
		if err := w.RegisterActivity(act.fn); err != nil {
			return nil, fmt.Errorf("register activity %s: %w", act.name, err)
		}
	}

	slog.Info("workflow worker activities registered",
		"count", len(activities),
		"names", func() []string {
			out := make([]string, len(activities))
			for i, a := range activities {
				out[i] = a.name
			}
			return out
		}(),
	)

	go func() {
		slog.Info("workflow worker starting")
		if err := w.Start(ctx); err != nil {
			slog.Error("workflow worker exited with error", "error", err)
		}
	}()

	return &Worker{
		w:            w,
		activities:   a,
		orchestrator: NewOrchestrator(client.New(b)),
	}, nil
}

func (w *Worker) Orchestrator() ports.Orchestrator {
	return w.orchestrator
}

func (w *Worker) Stop() {
	// Context cancellation in main.go's signal handler stops the worker goroutine.
}
