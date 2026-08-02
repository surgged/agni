package workflow

import (
	"context"
	"fmt"
	"log/slog"

	appapp "github.com/surgged/agni/internal/application/app"
)

// MarkBuilding transitions the app from queued → building.
func (a *Activities) MarkBuilding(ctx context.Context, appID string) (string, error) {
	logCtx := slog.With("app_id", appID, "step", "mark_building")

	if a.Deps == nil {
		logCtx.Error("activity deps nil")
		return "", fmt.Errorf("mark_building: nil deps")
	}

	logCtx.Info("transitioning to building")
	if err := a.Deps.AppCmd.HandleMarkBuilding(ctx, appapp.MarkBuildingCommand{ID: appID}); err != nil {
		logCtx.Error("mark_building failed", "error", err)
		return "", fmt.Errorf("mark_building: %w", err)
	}

	return "building", nil
}

// MarkDeploying transitions the app from building → deploying.
func (a *Activities) MarkDeploying(ctx context.Context, appID, imageRef string) (string, error) {
	logCtx := slog.With("app_id", appID, "step", "mark_deploying", "image_ref", imageRef)

	if a.Deps == nil {
		logCtx.Error("activity deps nil")
		return "", fmt.Errorf("mark_deploying: nil deps")
	}

	podName := fmt.Sprintf("app-%s", appID)

	logCtx.Info("transitioning to deploying", "pod_name", podName)
	if err := a.Deps.AppCmd.HandleMarkDeploying(ctx, appapp.MarkDeployingCommand{
		ID:       appID,
		ImageRef: imageRef,
		PodName:  podName,
	}); err != nil {
		logCtx.Error("mark_deploying failed", "error", err)
		return "", fmt.Errorf("mark_deploying: %w", err)
	}

	return podName, nil
}
