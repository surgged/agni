package workflow

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/surgged/agni/internal/ports"
)

// ResolvePort determines the application port.
// Priority: user override → 8080 default.
// v1 does not inspect image EXPOSE config yet (deferred).
func (a *Activities) ResolvePort(ctx context.Context, appID string, portOverride int32) (int32, error) {
	logCtx := slog.With("app_id", appID, "step", "resolve_port")

	if portOverride > 0 {
		logCtx.Info("port resolved from override", "port", portOverride)
		return portOverride, nil
	}

	logCtx.Info("port resolved from default", "port", 8080)
	return 8080, nil
}

// DeployRuntime creates the Pod + Service + Ingress on k3s with the
// configured RuntimeClass and imagePullSecret. Returns the k8s pod name.
func (a *Activities) DeployRuntime(ctx context.Context, appID, imageRef, slug, runtime string, port int32) (string, error) {
	logCtx := slog.With("app_id", appID, "step", "deploy", "image_ref", imageRef)
	start := time.Now()

	if a.Deps == nil {
		logCtx.Error("activity deps nil")
		return "", fmt.Errorf("deploy: nil deps")
	}

	runtimeClass := "kata-fc"
	if runtime == "firecracker" {
		runtimeClass = "firecracker"
	}

	podName := fmt.Sprintf("app-%s", appID)
	logCtx = logCtx.With("pod_name", podName, "runtime_class", runtimeClass, "port", port)

	logCtx.Info("deploying to k3s")
	err := a.Deps.Provider.Deploy(ctx, ports.PodSpec{
		Name:            podName,
		ImageRef:        imageRef,
		OwnerEmail:      "",
		Port:            port,
		AppID:           appID,
		RuntimeClass:    runtimeClass,
		ImagePullSecret: "zot-pull",
	})
	elapsed := time.Since(start).Round(time.Millisecond)

	if err != nil {
		logCtx.Error("deploy failed", "error", err, "duration_ms", elapsed.Milliseconds())
		return "", fmt.Errorf("deploy: %w", err)
	}

	logCtx.Info("deploy succeeded", "duration_ms", elapsed.Milliseconds())
	return podName, nil
}
