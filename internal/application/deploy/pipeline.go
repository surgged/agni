package deploy

import (
	"context"
	"fmt"
	"io"
	"log/slog"

	"github.com/google/uuid"

	appapp "github.com/surgged/agni/internal/application/app"
	"github.com/surgged/agni/internal/ports"
)

type Pipeline struct {
	provider ports.ContainerProvider
	appCmd   *appapp.CommandHandler
	appQry   *appapp.QueryHandler
}

func NewPipeline(provider ports.ContainerProvider, appCmd *appapp.CommandHandler, appQry *appapp.QueryHandler) *Pipeline {
	return &Pipeline{provider: provider, appCmd: appCmd, appQry: appQry}
}

func (p *Pipeline) Deploy(ctx context.Context, appID uuid.UUID, tarball io.Reader) error {
	app, err := p.appQry.HandleGet(ctx, appapp.GetAppQuery{ID: appID.String()})
	if err != nil {
		return fmt.Errorf("deploy: get app: %w", err)
	}

	if err := p.appCmd.HandleMarkBuilding(ctx, appapp.MarkBuildingCommand{ID: appID.String()}); err != nil {
		return fmt.Errorf("deploy: mark building: %w", err)
	}

	imageRef := fmt.Sprintf("registry.agni.svc:5000/apps/%s:latest", appID.String())
	podName := fmt.Sprintf("app-%s", appID.String())

	slog.InfoContext(ctx, "building image", "app_id", appID, "image", imageRef)

	if err := p.appCmd.HandleMarkDeploying(ctx, appapp.MarkDeployingCommand{
		ID:       appID.String(),
		ImageRef: imageRef,
		PodName:  podName,
	}); err != nil {
		return fmt.Errorf("deploy: mark deploying: %w", err)
	}

	spec := ports.PodSpec{
		Name:       podName,
		ImageRef:   imageRef,
		OwnerEmail: app.OwnerEmail,
		Port:       8080,
		AppID:      appID.String(),
	}
	if err := p.provider.Deploy(ctx, spec); err != nil {
		_ = p.appCmd.HandleMarkFailed(ctx, appapp.MarkFailedCommand{
			ID:     appID.String(),
			Reason: err.Error(),
		})
		return fmt.Errorf("deploy: k3s deploy: %w", err)
	}

	serviceURL := fmt.Sprintf("https://%s.agni.dev", appID.String())
	shareURL := fmt.Sprintf("https://agni.dev/app/%s", appID.String())

	if err := p.appCmd.HandleMarkLive(ctx, appapp.MarkLiveCommand{
		ID:         appID.String(),
		ServiceURL: serviceURL,
		ShareURL:   shareURL,
	}); err != nil {
		return fmt.Errorf("deploy: mark live: %w", err)
	}

	slog.InfoContext(ctx, "deploy complete", "app_id", appID, "url", serviceURL)
	return nil
}
