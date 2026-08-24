package ports

import "context"

// DeploymentInput is the data needed to start a deployment workflow.
// It is the only shape the application layer needs to know about; everything
// else (Temporal IDs, retry policies, query handlers) is an adapter detail
// owned by internal/adapters/workflow.
type DeploymentInput struct {
	AppID        string
	ArchiveKey   string
	Slug         string
	PortOverride int32
	Runtime      string
}

// DeploymentWorkflow is the deploy pipeline entry point used by the
// application layer.
//
// This interface is required for two reasons:
//  1. Layering — the application layer may not import adapters.
//  2. Import cycle — the Temporal adapter's activities depend on the deploy
//     application service (for helpers like SanitizeUserError), so the deploy
//     service cannot depend on the adapter package directly.
//
// It is implemented concretely by *workflow.Client in
// internal/adapters/workflow. Compared to the old ports.Orchestrator, this is
// scoped to deployment only and is satisfied by a Temporal-native client.
type DeploymentWorkflow interface {
	StartDeployment(ctx context.Context, input DeploymentInput) error
	CancelDeployment(ctx context.Context, appID string) error
}
