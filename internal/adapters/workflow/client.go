package workflow

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	enumspb "go.temporal.io/api/enums/v1"
	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/temporal"

	"github.com/surgged/agni/internal/ports"
)

// Client is the Temporal-native entry point used by the deploy service
// to start, cancel, and query deployment workflows. There is no longer
// a ports.Orchestrator indirection — the application layer depends on
// this concrete adapter.
type Client struct {
	c         client.Client
	taskQueue string
}

func NewClient(c client.Client, taskQueue string) *Client {
	return &Client{c: c, taskQueue: taskQueue}
}

// Dial connects to Temporal and returns a Client for starting, canceling,
// and querying deployment workflows. It does NOT register a worker —
// use StartWorker (in the worker binary) for that.
func Dial(cfg WorkerConfig) (*Client, error) {
	if cfg.HostPort == "" {
		return nil, fmt.Errorf("workflow: HostPort is required")
	}
	if cfg.TaskQueue == "" {
		return nil, fmt.Errorf("workflow: TaskQueue is required")
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
	return NewClient(c, cfg.TaskQueue), nil
}

// Close releases the underlying Temporal client connection.
func (c *Client) Close() {
	if c.c != nil {
		c.c.Close()
	}
}

// Compile-time assertion that *Client satisfies the application-layer port.
var _ ports.DeploymentWorkflow = (*Client)(nil)

// StartDeployment kicks off a DeploymentWorkflow. Workflow ID is the app ID,
// allowing the pipeline to be looked up directly from the Temporal UI.
// WorkflowIDReusePolicy=ALLOW_DUPLICATE_FAILED_ONLY lets the application
// retry a failed deployment under the same ID.
func (c *Client) StartDeployment(ctx context.Context, in ports.DeploymentInput) error {
	if _, err := uuid.Parse(in.AppID); err != nil {
		return fmt.Errorf("workflow client: parse app id: %w", err)
	}

	wfInput := DeploymentInput{
		AppID:        in.AppID,
		ArchiveKey:   in.ArchiveKey,
		Slug:         in.Slug,
		PortOverride: in.PortOverride,
		Runtime:      in.Runtime,
	}

	opts := client.StartWorkflowOptions{
		ID:                    in.AppID,
		TaskQueue:             c.taskQueue,
		WorkflowIDReusePolicy: enumspb.WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE_FAILED_ONLY,
		// The workflow itself manages activity retries. We do not want Temporal
		// to automatically re-run the whole workflow on terminal failure — the
		// application layer (deploy.Service.Retry) triggers that explicitly.
		RetryPolicy: &temporal.RetryPolicy{MaximumAttempts: 1},
	}

	we, err := c.c.ExecuteWorkflow(ctx, opts, DeploymentWorkflow, wfInput)
	if err != nil {
		return fmt.Errorf("workflow client: execute: %w", err)
	}
	// We intentionally do not wait for completion here; the deploy pipeline
	// is long-running. Status is observable via the query handler / UI.
	_ = we
	return nil
}

// CancelDeployment requests cancellation of a running workflow. Activities
// observe ctx cancellation; the workflow's compensation path runs in a
// disconnected context so cleanup still completes.
func (c *Client) CancelDeployment(ctx context.Context, appID string) error {
	if err := c.c.CancelWorkflow(ctx, appID, ""); err != nil {
		return fmt.Errorf("workflow client: cancel: %w", err)
	}
	return nil
}

// QueryStatus returns the current pipeline step for a deployment. Returns
// an error if the workflow does not exist (or has completed and timed out
// of the visibility store).
func (c *Client) QueryStatus(ctx context.Context, appID string) (Status, error) {
	resp, err := c.c.QueryWorkflow(ctx, appID, "", QueryStatus)
	if err != nil {
		return Status{}, fmt.Errorf("workflow client: query: %w", err)
	}
	var s Status
	if err := resp.Get(&s); err != nil {
		return Status{}, fmt.Errorf("workflow client: decode query: %w", err)
	}
	return s, nil
}
