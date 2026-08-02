package workflow

import (
	"context"
	"fmt"
	"log/slog"
	"time"
)

// WaitHealthy polls pod readiness then performs an HTTP health check against
// the ClusterIP service. Returns ErrNoWebPort on timeout.
func (a *Activities) WaitHealthy(ctx context.Context, appID, podName string, port int32) (bool, error) {
	logCtx := slog.With("app_id", appID, "step", "health_check", "pod_name", podName, "port", port)
	start := time.Now()
	timeout := 2 * time.Minute

	logCtx.Info("waiting for healthy", "timeout", timeout)
	err := a.Deps.Provider.WaitHealthy(ctx, podName, port, timeout)
	elapsed := time.Since(start).Round(time.Millisecond)

	if err != nil {
		logCtx.Error("health check failed", "error", err, "duration_ms", elapsed.Milliseconds())
		return false, fmt.Errorf("health: %w", err)
	}

	logCtx.Info("health check passed", "duration_ms", elapsed.Milliseconds())
	return true, nil
}
