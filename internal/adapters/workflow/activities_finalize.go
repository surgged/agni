package workflow

import (
	"context"
	"fmt"
	"log/slog"

	appapp "github.com/surgged/agni/internal/application/app"
)

// Finalize persists the live status and service URL to the database.
// Called only after WaitHealthy succeeds.
func (a *Activities) Finalize(ctx context.Context, appID, slug string) (string, error) {
	logCtx := slog.With("app_id", appID, "step", "finalize")

	if a.Deps == nil || a.Deps.DeployService == nil {
		logCtx.Error("activity deps nil")
		return "", fmt.Errorf("finalize: nil deps")
	}

	serviceURL := a.Deps.DeployService.BuildServiceURL(slug)

	logCtx.Info("finalizing deployment", "service_url", serviceURL)
	err := a.Deps.AppCmd.HandleMarkLive(ctx, appapp.MarkLiveCommand{
		ID:         appID,
		ServiceURL: serviceURL,
		ShareURL:   serviceURL,
	})
	if err != nil {
		logCtx.Error("finalize failed", "error", err)
		return "", fmt.Errorf("finalize: %w", err)
	}

	logCtx.Info("deployment finalized successfully")
	return serviceURL, nil
}
