package workflow

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
)

// WorkerConfig configures the Temporal worker + client connection.
type WorkerConfig struct {
	HostPort  string // e.g. "localhost:7233"
	Namespace string // e.g. "default"
	TaskQueue string // e.g. "agni-deploy"
}

// Worker owns the Temporal client, the running worker, and the workflow
// Client surfaced to the application layer.
type Worker struct {
	c      client.Client
	w      worker.Worker
	client *Client
}

// StartWorker dials Temporal, registers the DeploymentWorkflow and every
// activity on the given task queue, then starts the worker. The returned
// Worker's Client() is what the deploy service calls to start/cancel
// deployments.
func StartWorker(_ context.Context, cfg WorkerConfig, deps *ActivityDeps) (*Worker, error) {
	if cfg.HostPort == "" {
		return nil, errors.New("workflow: HostPort is required")
	}
	if cfg.TaskQueue == "" {
		return nil, errors.New("workflow: TaskQueue is required")
	}
	if cfg.Namespace == "" {
		cfg.Namespace = client.DefaultNamespace
	}

	c, err := client.Dial(client.Options{
		HostPort:  cfg.HostPort,
		Namespace: cfg.Namespace,
	})
	if err != nil {
		return nil, fmt.Errorf("workflow: dial temporal: %w", err)
	}

	w := worker.New(c, cfg.TaskQueue, worker.Options{})

	w.RegisterWorkflow(DeploymentWorkflow)

	a := &Activities{Deps: deps}
	// RegisterActivity registers every exported method on *Activities
	// under its method name (MarkBuilding, ValidateArchive, …). The string
	// names used in workflow.ExecuteActivity must match these exactly.
	w.RegisterActivity(a)

	slog.Info("temporal worker registered",
		"task_queue", cfg.TaskQueue,
		"namespace", cfg.Namespace,
		"host_port", cfg.HostPort,
	)

	go func() {
		defer func() {
			if r := recover(); r != nil {
				slog.Error("temporal worker panicked", "panic", r)
			}
		}()
		slog.Info("temporal worker starting")
		if err := w.Run(worker.InterruptCh()); err != nil {
			slog.Error("temporal worker exited with error", "error", err)
		}
	}()

	return &Worker{
		c:      c,
		w:      w,
		client: NewClient(c, cfg.TaskQueue),
	}, nil
}

// Client returns the workflow Client used by the deploy service.
func (w *Worker) Client() *Client { return w.client }

// Stop closes the Temporal client. The worker goroutine exits on
// SIGTERM via worker.InterruptCh(); Stop only releases the client
// connection during graceful shutdown.
func (w *Worker) Stop() {
	if w.c != nil {
		w.c.Close()
	}
}
