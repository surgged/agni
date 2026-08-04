package workflow

import (
	"context"
	"fmt"
	"log/slog"

	"go.temporal.io/sdk/temporal"
)

// ValidateArchive checks the archive object exists in S3.
// Failures here are non-retryable user errors (ErrArchiveMissing).
func (a *Activities) ValidateArchive(ctx context.Context, appID, archiveKey string) (bool, error) {
	logCtx := slog.With("app_id", appID, "step", "validate", "archive_key", archiveKey)

	if a.Deps == nil {
		logCtx.Error("activity deps nil")
		return false, fmt.Errorf("validate: nil deps")
	}

	logCtx.Info("validating archive existence")
	_, found, err := a.Deps.ArchiveStore.Head(ctx, archiveKey)
	if err != nil {
		logCtx.Error("archive head failed", "error", err)
		return false, fmt.Errorf("validate: head archive: %w", err)
	}
	if !found {
		logCtx.Warn("archive not found")
		return false, temporal.NewNonRetryableApplicationError(
			"archive not found", "ArchiveMissing", nil, "app_id", appID,
		)
	}

	logCtx.Info("archive validated")
	return true, nil
}
