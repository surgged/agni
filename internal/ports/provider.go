package ports

import (
	"context"
	"time"
)

//go:generate mockgen -destination=../mocks/mock_containerprovider.go -package=mocks github.com/surgged/agni/internal/ports ContainerProvider

type PodSpec struct {
	Name            string
	ImageRef        string
	OwnerEmail      string
	Port            int32
	AppID           string
	RuntimeClass    string
	ImagePullSecret string
}

type PodStatus struct {
	Phase string
	URL   string
}

type ContainerProvider interface {
	Deploy(ctx context.Context, spec PodSpec) error
	Destroy(ctx context.Context, name string) error
	Status(ctx context.Context, name string) (PodStatus, error)
	WaitHealthy(ctx context.Context, name string, port int32, timeout time.Duration) error
	EnsurePullSecret(ctx context.Context, namespace, name string, creds RegistryAuth) error
}
