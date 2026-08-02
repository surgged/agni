package workflow

import (
	"context"
	"fmt"
	"time"

	"github.com/cschleiden/go-workflows/client"
	"github.com/cschleiden/go-workflows/workflow"
	"github.com/google/uuid"

	"github.com/surgged/agni/internal/ports"
)

// Orchestrator implements ports.Orchestrator via go-workflows client.
type Orchestrator struct {
	client *client.Client
}

func NewOrchestrator(c *client.Client) *Orchestrator {
	return &Orchestrator{client: c}
}

func (o *Orchestrator) StartDeployment(ctx context.Context, input ports.DeploymentInput) error {
	appID, err := uuid.Parse(input.AppID)
	if err != nil {
		return fmt.Errorf("orchestrator: parse app id: %w", err)
	}

	_, err = o.client.CreateWorkflowInstance(ctx, client.WorkflowInstanceOptions{
		InstanceID: appID.String(),
	}, DeploymentWorkflow,
		appID.String(),
		input.ArchiveKey,
		input.Slug,
		input.PortOverride,
		input.Runtime,
	)
	if err != nil {
		return fmt.Errorf("orchestrator: create workflow: %w", err)
	}
	return nil
}

func (o *Orchestrator) CancelDeployment(ctx context.Context, appID string) error {
	instance := &workflow.Instance{InstanceID: appID}
	if err := o.client.CancelWorkflowInstance(ctx, instance); err != nil {
		return fmt.Errorf("orchestrator: cancel workflow: %w", err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// DeploymentWorkflow — durable pipeline
// ---------------------------------------------------------------------------
// Step order (no skipping, caught failures run compensation + MarkFailed):
//  1. MarkBuilding   — advance aggregate from queued → building
//  2. ValidateArchive — HEAD S3 object, confirm it exists
//  3. BuildImage     — buildah bud + push
//  4. MarkDeploying  — advance aggregate from building → deploying
//  5. ResolvePort    — user override → 8080
//  6. DeployRuntime  — Pod + Service + Ingress on k3s
//  7. WaitHealthy    — readiness + HTTP probe
//  8. Finalize       — persist URL, mark live
//
// On activity error: CleanupPartial + MarkFailed(step, reason) via
// disconnected context so cleanup always runs even under cancellation.
// ---------------------------------------------------------------------------
func DeploymentWorkflow(ctx workflow.Context, appID, archiveKey, slug string, portOverride int32, runtime string) error {
	wfStart := workflow.Now(ctx)
	logger := workflow.Logger(ctx).With("app_id", appID, "slug", slug, "runtime", runtime)
	logger.Info("workflow started")

	opts := workflow.DefaultActivityOptions
	opts.RetryOptions.MaxAttempts = 3
	opts.RetryOptions.FirstRetryInterval = 5 * time.Second
	opts.RetryOptions.BackoffCoefficient = 2.0

	// Escalate to building
	if _, err := workflow.ExecuteActivity[any](ctx, opts, (*Activities).MarkBuilding, appID).Get(ctx); err != nil {
		workflow.ExecuteActivity[any](ctx, opts, (*Activities).MarkFailed, appID, "building", err.Error())
		return err
	}

	// Validate
	if _, err := workflow.ExecuteActivity[bool](ctx, opts, (*Activities).ValidateArchive, appID, archiveKey).Get(ctx); err != nil {
		compensate(ctx, opts, appID, "validate", err)
		return err
	}

	// Build
	imageRef, err := workflow.ExecuteActivity[string](ctx, opts, (*Activities).BuildImage, appID, archiveKey).Get(ctx)
	if err != nil {
		compensate(ctx, opts, appID, "build", err)
		return err
	}

	// Escalate to deploying
	if _, err := workflow.ExecuteActivity[any](ctx, opts, (*Activities).MarkDeploying, appID, imageRef).Get(ctx); err != nil {
		compensate(ctx, opts, appID, "deploying", err)
		return err
	}

	// Resolve port
	port, err := workflow.ExecuteActivity[int32](ctx, opts, (*Activities).ResolvePort, appID, portOverride).Get(ctx)
	if err != nil {
		compensate(ctx, opts, appID, "port_resolve", err)
		return err
	}

	// Deploy k8s resources
	podName, err := workflow.ExecuteActivity[string](ctx, opts, (*Activities).DeployRuntime, appID, imageRef, slug, runtime, port).Get(ctx)
	if err != nil {
		compensate(ctx, opts, appID, "deploy", err)
		return err
	}

	// Health check
	if _, err := workflow.ExecuteActivity[bool](ctx, opts, (*Activities).WaitHealthy, appID, podName, port).Get(ctx); err != nil {
		compensate(ctx, opts, appID, "health_check", err)
		return err
	}

	// Finalize — persist live state
	serviceURL, err := workflow.ExecuteActivity[string](ctx, opts, (*Activities).Finalize, appID, slug).Get(ctx)
	if err != nil {
		compensate(ctx, opts, appID, "finalize", err)
		return err
	}

	elapsed := workflow.Now(ctx).Sub(wfStart).Round(time.Millisecond)
	logger.Info("workflow completed successfully", "service_url", serviceURL, "duration_ms", elapsed.Milliseconds())
	return nil
}

// compensate runs CleanupPartial + MarkFailed for a failed step.
// Uses a disconnected context so cancellation does not skip compensation,
// but still awaits both activities before returning.
func compensate(ctx workflow.Context, opts workflow.ActivityOptions, appID, step string, err error) {
	dctx := workflow.NewDisconnectedContext(ctx)
	cleanup := workflow.ExecuteActivity[any](dctx, opts, (*Activities).CleanupPartial, appID)
	markFailed := workflow.ExecuteActivity[any](dctx, opts, (*Activities).MarkFailed, appID, step, err.Error())
	cleanup.Get(dctx)
	markFailed.Get(dctx)
}

var _ ports.Orchestrator = (*Orchestrator)(nil)
