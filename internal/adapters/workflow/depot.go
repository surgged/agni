package workflow

import (
	appapp "github.com/surgged/agni/internal/application/app"
	"github.com/surgged/agni/internal/application/deploy"
	"github.com/surgged/agni/internal/ports"
)

// ActivityDeps holds every port the workflow activities need.
// It is the DI container injected into *Activities at worker start.
type ActivityDeps struct {
	ArchiveStore  ports.ArchiveStore
	ImageBuilder  ports.ImageBuilder
	Provider      ports.ContainerProvider
	AppCmd        *appapp.CommandHandler
	DeployService *deploy.Service
}

// Activities is the single struct whose methods are registered as
// go-workflows activities. Methods live in separate per-concern files:
//
//	activities_validate.go  — ValidateArchive
//	activities_build.go     — BuildImage
//	activities_deploy.go    — ResolvePort, DeployRuntime
//	activities_health.go    — WaitHealthy
//	activities_finalize.go  — Finalize
//	activities_failure.go   — CleanupPartial, MarkFailed
type Activities struct {
	Deps *ActivityDeps
}
