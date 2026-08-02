package workflow

import (
	"context"
	"fmt"
	"log/slog"

	appapp "github.com/surgged/agni/internal/application/app"
	"github.com/surgged/agni/internal/application/deploy"
)

// CleanupPartial tears down partial k8s resources left by a failed deployment.
// Runs in a disconnected context so cancellation does not skip cleanup.
func (a *Activities) CleanupPartial(ctx context.Context, appID string) error {
	logCtx := slog.With("app_id", appID, "step", "cleanup")

	if a.Deps == nil {
		logCtx.Error("activity deps nil")
		return fmt.Errorf("cleanup: nil deps")
	}

	podName := fmt.Sprintf("app-%s", appID)

	logCtx.Warn("cleaning up partial deployment", "pod_name", podName)
	if err := a.Deps.Provider.Destroy(ctx, podName); err != nil {
		logCtx.Error("cleanup destroy failed", "error", err)
	}

	logCtx.Info("partial cleanup complete")
	return nil
}

// MarkFailed transitions the app aggregate to status=failed with the
// failing step and a sanitized error message safe for user display.
func (a *Activities) MarkFailed(ctx context.Context, appID, step, reason string) error {
	logCtx := slog.With("app_id", appID, "step", "mark_failed", "failed_step", step)

	if a.Deps == nil {
		logCtx.Error("activity deps nil")
		return fmt.Errorf("mark_failed: nil deps")
	}

	sanitized := deploy.SanitizeUserError(fmt.Errorf("%s", reason))

	logCtx.Error("deployment failed", "reason", sanitized)
	err := a.Deps.AppCmd.HandleMarkFailed(ctx, appapp.MarkFailedCommand{
		ID:     appID,
		Step:   step,
		Reason: sanitized,
	})
	if err != nil {
		logCtx.Error("mark_failed handler error", "error", err)
		return fmt.Errorf("mark_failed: %w", err)
	}

	logCtx.Info("deployment marked as failed")
	return nil
}
