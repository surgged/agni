package deploy

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/google/uuid"

	appapp "github.com/surgged/agni/internal/application/app"
	"github.com/surgged/agni/internal/ports"
)

type Pipeline struct {
	provider ports.ContainerProvider
	appCmd   *appapp.CommandHandler
	appQry   *appapp.QueryHandler
	domain   string
}

func NewPipeline(provider ports.ContainerProvider, appCmd *appapp.CommandHandler, appQry *appapp.QueryHandler, domain string) *Pipeline {
	if domain == "" {
		domain = "agni.dev"
	}
	return &Pipeline{provider: provider, appCmd: appCmd, appQry: appQry, domain: domain}
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

	if tarball != nil {
		tempDir, err := os.MkdirTemp("", "agni-build-*")
		if err != nil {
			_ = p.appCmd.HandleMarkFailed(ctx, appapp.MarkFailedCommand{ID: appID.String(), Reason: err.Error()})
			return fmt.Errorf("deploy: create build temp dir: %w", err)
		}
		defer os.RemoveAll(tempDir)

		if err := extractTarball(tarball, tempDir); err != nil {
			slog.WarnContext(ctx, "tarball extraction warning", "error", err)
		}

		dataDir := filepath.Join(".", "data", "apps", appID.String())
		_ = os.MkdirAll(dataDir, 0755)
		_ = copyDir(tempDir, dataDir)

		appNameClean := strings.ToLower(strings.TrimSpace(app.Name))
		appNameClean = strings.ReplaceAll(appNameClean, " ", "-")
		if appNameClean != "" && appNameClean != appID.String() {
			nameDir := filepath.Join(".", "data", "apps", appNameClean)
			_ = os.MkdirAll(nameDir, 0755)
			_ = copyDir(tempDir, nameDir)
		}

		if err := buildAndPushImage(ctx, imageRef, tempDir); err != nil {
			slog.WarnContext(ctx, "image build/push warning (proceeding to deploy)", "error", err)
		}
	}

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

	serviceURL := fmt.Sprintf("https://%s.%s", appID.String(), p.domain)
	shareURL := fmt.Sprintf("https://%s/app/%s", p.domain, appID.String())

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

func extractTarball(r io.Reader, dest string) error {
	buf := make([]byte, 512)
	n, err := r.Read(buf)
	if err != nil && err != io.EOF {
		return fmt.Errorf("read header sample: %w", err)
	}
	combined := io.MultiReader(strings.NewReader(string(buf[:n])), r)

	var tarReader *tar.Reader
	if isGzip(buf[:n]) {
		gz, err := gzip.NewReader(combined)
		if err != nil {
			return fmt.Errorf("gzip reader: %w", err)
		}
		defer gz.Close()
		tarReader = tar.NewReader(gz)
	} else {
		tarReader = tar.NewReader(combined)
	}

	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("tar next: %w", err)
		}

		baseName := filepath.Base(header.Name)
		if strings.HasPrefix(baseName, "._") || baseName == ".DS_Store" || strings.HasPrefix(header.Name, "__MACOSX") {
			continue
		}

		target := filepath.Join(dest, filepath.Clean(header.Name))
		if !strings.HasPrefix(target, filepath.Clean(dest)+string(os.PathSeparator)) {
			continue // prevent zip slip / dir traversal
		}

		switch header.Typeflag {
		case tar.TypeDir:
			_ = os.MkdirAll(target, 0755)
		case tar.TypeReg:
			_ = os.MkdirAll(filepath.Dir(target), 0755)
			outFile, err := os.OpenFile(target, os.O_CREATE|os.O_RDWR|os.O_TRUNC, header.FileInfo().Mode())
			if err != nil {
				return fmt.Errorf("create file %s: %w", target, err)
			}
			_, _ = io.Copy(outFile, tarReader)
			_ = outFile.Close()
		}
	}
	return nil
}

func isGzip(buf []byte) bool {
	return len(buf) >= 2 && buf[0] == 0x1f && buf[1] == 0x8b
}

func buildAndPushImage(ctx context.Context, imageRef, srcDir string) error {
	tool := findBuildTool()
	if tool == "" {
		slog.WarnContext(ctx, "no container build tool found (nerdctl/docker/podman); skipping OCI image build in dev mode")
		return nil
	}

	slog.InfoContext(ctx, "building OCI image", "tool", tool, "image", imageRef, "dir", srcDir)
	buildCmd := exec.CommandContext(ctx, tool, "build", "-t", imageRef, srcDir)
	if out, err := buildCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("%s build failed: %w (output: %s)", tool, err, string(out))
	}

	slog.InfoContext(ctx, "pushing OCI image", "tool", tool, "image", imageRef)
	pushCmd := exec.CommandContext(ctx, tool, "push", imageRef)
	if out, err := pushCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("%s push failed: %w (output: %s)", tool, err, string(out))
	}

	return nil
}

func findBuildTool() string {
	for _, tool := range []string{"nerdctl", "docker", "podman"} {
		if path, err := exec.LookPath(tool); err == nil && path != "" {
			return tool
		}
	}
	return ""
}

func copyDir(src string, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		baseName := filepath.Base(path)
		if strings.HasPrefix(baseName, "._") || baseName == ".DS_Store" || strings.HasPrefix(rel, "__MACOSX") {
			return nil
		}
		target := filepath.Join(dst, rel)
		if info.IsDir() {
			return os.MkdirAll(target, info.Mode())
		}
		r, err := os.Open(path)
		if err != nil {
			return err
		}
		defer r.Close()
		w, err := os.OpenFile(target, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, info.Mode())
		if err != nil {
			return err
		}
		defer w.Close()
		_, err = io.Copy(w, r)
		return err
	})
}

