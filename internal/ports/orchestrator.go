package ports

import "context"

//go:generate mockgen -destination=../mocks/mock_orchestrator.go -package=mocks github.com/surgged/agni/internal/ports Orchestrator

type DeploymentInput struct {
	AppID        string
	ArchiveKey   string
	Slug         string
	PortOverride int32
	Runtime      string
}

type Orchestrator interface {
	StartDeployment(ctx context.Context, input DeploymentInput) error
	CancelDeployment(ctx context.Context, appID string) error
}
