package k3s

import (
	"context"
	"log/slog"

	"github.com/surgged/agni/internal/ports"
)

type Provider struct {
	namespace    string
	registryAddr string
}

func NewProvider(namespace, registryAddr string) *Provider {
	return &Provider{namespace: namespace, registryAddr: registryAddr}
}

func (p *Provider) Deploy(ctx context.Context, spec ports.PodSpec) error {
	slog.InfoContext(ctx, "k3s deploy",
		"name", spec.Name,
		"image", spec.ImageRef,
		"namespace", p.namespace,
		"app_id", spec.AppID,
	)
	return nil
}

func (p *Provider) Destroy(ctx context.Context, name string) error {
	slog.InfoContext(ctx, "k3s destroy", "name", name)
	return nil
}

func (p *Provider) Status(ctx context.Context, name string) (ports.PodStatus, error) {
	slog.InfoContext(ctx, "k3s status", "name", name)
	return ports.PodStatus{Phase: "Running", URL: ""}, nil
}

var _ ports.ContainerProvider = (*Provider)(nil)
