package workflow

import (
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

// DeploymentInput is the serializable argument passed to DeploymentWorkflow.
// All fields must remain JSON-serializable (no channels, funcs, or unexported fields).
type DeploymentInput struct {
	AppID        string `json:"app_id"`
	ArchiveKey   string `json:"archive_key"`
	Slug         string `json:"slug"`
	PortOverride int32  `json:"port_override"`
	Runtime      string `json:"runtime"`
}

// QueryStatus is the workflow query type used to expose the live pipeline
// state to callers (and the Temporal UI).
const QueryStatus = "status"

// Status is returned by the "status" workflow query for live tracking.
// It mirrors the current pipeline step the workflow is on.
type Status struct {
	Step    string `json:"step"`
	Detail  string `json:"detail,omitempty"`
	Failed  bool   `json:"failed,omitempty"`
	Success bool   `json:"success,omitempty"`
}

// ---------------------------------------------------------------------------
// DeploymentWorkflow — durable deploy pipeline.
// ---------------------------------------------------------------------------
// Step order (no skipping, caught failures run compensation + MarkFailed):
//  1. MarkBuilding    — advance aggregate from queued → building
//  2. ValidateArchive — HEAD S3 object, confirm it exists (non-retryable if missing)
//  3. BuildImage      — buildah bud + push (non-retryable on user build failure)
//  4. MarkDeploying   — advance aggregate from building → deploying
//  5. ResolvePort     — user override → 8080
//  6. DeployRuntime   — Pod + Service + Ingress on k3s
//  7. WaitHealthy     — readiness + HTTP probe
//  8. Finalize        — persist URL, mark live
//
// On activity error: CleanupPartial + MarkFailed(step, reason) via
// a disconnected context so compensation always runs even under cancellation.
// ---------------------------------------------------------------------------
func DeploymentWorkflow(ctx workflow.Context, in DeploymentInput) error {
	logger := workflow.GetLogger(ctx)
	logger.Info("deployment workflow started", "app_id", in.AppID, "slug", in.Slug, "runtime", in.Runtime)

	status := &Status{Step: "init"}
	if err := workflow.SetQueryHandler(ctx, QueryStatus, func() (Status, error) {
		return *status, nil
	}); err != nil {
		return err
	}

	// Base retry policy shared by every activity. Per-step timeouts override
	// StartToCloseTimeout below.
	baseRetry := &temporal.RetryPolicy{
		InitialInterval:        5 * time.Second,
		BackoffCoefficient:     2.0,
		MaximumInterval:        time.Minute,
		MaximumAttempts:        3,
		NonRetryableErrorTypes: []string{
			// NonRetryableApplicationError created with "non-retryable" flag is
			// honored regardless of this list, but keep it for explicit clarity.
		},
	}

	mkOpts := func(timeout time.Duration) workflow.Context {
		return workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
			StartToCloseTimeout: timeout,
			RetryPolicy:         baseRetry,
		})
	}

	// 1. MarkBuilding — short metadata write
	status.Step = "mark_building"
	if _, err := executeActivity[string](mkOpts(30*time.Second), "MarkBuilding", in.AppID); err != nil {
		return fail(ctx, status, in.AppID, "mark_building", err)
	}

	// 2. ValidateArchive — non-retryable when the archive is missing
	status.Step = "validate"
	if _, err := executeActivity[bool](mkOpts(30*time.Second), "ValidateArchive", in.AppID, in.ArchiveKey); err != nil {
		return compensate(ctx, status, in.AppID, "validate", err)
	}

	// 3. BuildImage — long, I/O heavy
	status.Step = "build"
	imageRef, err := executeActivity[string](mkOpts(10*time.Minute), "BuildImage", in.AppID, in.ArchiveKey)
	if err != nil {
		return compensate(ctx, status, in.AppID, "build", err)
	}

	// 4. MarkDeploying
	status.Step = "mark_deploying"
	if _, err := executeActivity[string](mkOpts(30*time.Second), "MarkDeploying", in.AppID, imageRef); err != nil {
		return compensate(ctx, status, in.AppID, "mark_deploying", err)
	}

	// 5. ResolvePort
	status.Step = "resolve_port"
	port, err := executeActivity[int32](mkOpts(30*time.Second), "ResolvePort", in.AppID, in.PortOverride)
	if err != nil {
		return compensate(ctx, status, in.AppID, "resolve_port", err)
	}

	// 6. DeployRuntime
	status.Step = "deploy"
	podName, err := executeActivity[string](mkOpts(2*time.Minute), "DeployRuntime", in.AppID, imageRef, in.Slug, in.Runtime, port)
	if err != nil {
		return compensate(ctx, status, in.AppID, "deploy", err)
	}

	// 7. WaitHealthy
	status.Step = "health_check"
	if _, err := executeActivity[bool](mkOpts(3*time.Minute), "WaitHealthy", in.AppID, podName, port); err != nil {
		return compensate(ctx, status, in.AppID, "health_check", err)
	}

	// 8. Finalize
	status.Step = "finalize"
	if _, err := executeActivity[string](mkOpts(30*time.Second), "Finalize", in.AppID, in.Slug); err != nil {
		return compensate(ctx, status, in.AppID, "finalize", err)
	}

	status.Step = "done"
	status.Success = true
	logger.Info("deployment workflow completed successfully")
	return nil
}

// executeActivity wraps workflow.ExecuteActivity for ergonomics.
func executeActivity[T any](ctx workflow.Context, name string, args ...any) (T, error) {
	var zero T
	fut := workflow.ExecuteActivity(ctx, name, args...)
	var out T
	if err := fut.Get(ctx, &out); err != nil {
		return zero, err
	}
	return out, nil
}

// fail marks the workflow failed without compensation (used only for the very
// first step where there is nothing to clean up yet).
func fail(ctx workflow.Context, status *Status, appID, step string, err error) error {
	status.Step = step
	status.Failed = true
	status.Detail = err.Error()
	dctx, cancel := workflow.NewDisconnectedContext(ctx)
	defer cancel()
	_ = workflow.ExecuteActivity(dctx, "MarkFailed", appID, status.Step, err.Error()).Get(dctx, nil)
	return err
}

// compensate runs CleanupPartial + MarkFailed for a failed step using a
// disconnected context so cancellation does not skip compensation.
func compensate(ctx workflow.Context, status *Status, appID, step string, err error) error {
	status.Step = step
	status.Failed = true
	status.Detail = err.Error()

	dctx, cancel := workflow.NewDisconnectedContext(ctx)
	defer cancel()
	// Run both compensation activities concurrently.
	cleanup := workflow.ExecuteActivity(dctx, "CleanupPartial", appID)
	markFailed := workflow.ExecuteActivity(dctx, "MarkFailed", appID, status.Step, err.Error())
	_ = cleanup.Get(dctx, nil)
	_ = markFailed.Get(dctx, nil)
	return err
}
