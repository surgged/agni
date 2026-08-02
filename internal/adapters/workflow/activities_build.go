package workflow

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/surgged/agni/internal/ports"
)

// BuildImage builds a container image from the archive via buildah and returns
// the full image reference. User build failures are wrapped as ErrBuildFailed
// (non-retryable); infra errors are transient (retryable by workflow policy).
func (a *Activities) BuildImage(ctx context.Context, appID, archiveKey string) (string, error) {
	logCtx := slog.With("app_id", appID, "step", "build")
	start := time.Now()

	if a.Deps == nil || a.Deps.DeployService == nil || a.Deps.ArchiveStore == nil {
		logCtx.Error("activity deps nil")
		return "", fmt.Errorf("build: nil deps")
	}

	imageRef := a.Deps.DeployService.BuildImageRef(appID)
	logCtx = logCtx.With("image_ref", imageRef)

	contextURL, err := a.Deps.ArchiveStore.PresignedGetURL(ctx, archiveKey, 30*time.Minute)
	if err != nil {
		logCtx.Error("failed to generate download URL", "error", err)
		return "", fmt.Errorf("build: presign get: %w", err)
	}

	logCtx.Info("building image", "context_url", contextURL)
	err = a.Deps.ImageBuilder.Build(ctx, ports.BuildSpec{
		AppID:      appID,
		ContextURL: contextURL,
		ImageRef:   imageRef,
		MaxLogTail: 20,
	})
	elapsed := time.Since(start).Round(time.Millisecond)

	if err != nil {
		logCtx.Error("build failed", "error", err, "duration_ms", elapsed.Milliseconds())
		return "", fmt.Errorf("build: %w", err)
	}

	logCtx.Info("build succeeded", "duration_ms", elapsed.Milliseconds())
	return imageRef, nil
}
