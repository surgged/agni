package ports

import "context"

type PodSpec struct {
	Name       string
	ImageRef   string
	OwnerEmail string
	Port       int32
	AppID      string
}

type PodStatus struct {
	Phase string
	URL   string
}

type ContainerProvider interface {
	Deploy(ctx context.Context, spec PodSpec) error
	Destroy(ctx context.Context, name string) error
	Status(ctx context.Context, name string) (PodStatus, error)
}
