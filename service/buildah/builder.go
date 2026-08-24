package buildah

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/surgged/agni/domain/app"
	"github.com/surgged/agni/ports"
)

type Builder struct {
	binary      string
	runUser     string
	storageRoot string
}

func NewBuilder(binary, runUser, storageRoot string) *Builder {
	if binary == "" {
		binary = "buildah"
	}
	if storageRoot == "" {
		storageRoot = "/var/lib/agni-builds"
	}
	return &Builder{
		binary:      binary,
		runUser:     runUser,
		storageRoot: storageRoot,
	}
}

// Build downloads the archive from ContextURL (S3 presigned GET or file://),
// extracts it, verifies a Dockerfile exists, and runs buildah bud. Returns
// ErrNoDockerfile or ErrBuildFailed on user errors.
func (b *Builder) Build(ctx context.Context, spec ports.BuildSpec) error {
	logCtx := slog.With("app_id", spec.AppID, "context_url", spec.ContextURL)

	tmpDir, err := os.MkdirTemp("", "agni-build-*")
	if err != nil {
		return fmt.Errorf("buildah: temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	// Download the archive from the presigned URL
	logCtx.Info("downloading archive")
	if err := b.download(ctx, spec.ContextURL, tmpDir); err != nil {
		return fmt.Errorf("buildah: download: %w", err)
	}

	// Find Dockerfile
	dockerfile := spec.Dockerfile
	if dockerfile == "" {
		dockerfile = b.findDockerfile(tmpDir)
	}
	if dockerfile == "" {
		return app.ErrNoDockerfile
	}

	imageRef := spec.ImageRef
	if imageRef == "" {
		imageRef = fmt.Sprintf("apps/%s:latest", spec.AppID)
	}

	// Run buildah bud (daemonless, per-build process)
	maxLog := spec.MaxLogTail
	if maxLog <= 0 {
		maxLog = 20
	}

	args := []string{"bud", "--layers", "-t", imageRef, "-f", dockerfile, tmpDir}
	logCtx.Info("building image", "command", b.binary, "args", strings.Join(args, " "))

	cmd := exec.CommandContext(ctx, b.binary, args...)
	var tailBuf bytes.Buffer
	cmd.Stdout = io.MultiWriter(os.Stdout, newRingBuffer(&tailBuf, maxLog))
	cmd.Stderr = io.MultiWriter(os.Stderr, newRingBuffer(&tailBuf, maxLog))

	if err := cmd.Run(); err != nil {
		tail := tailBuf.String()
		logCtx.Error("buildah failed", "error", err, "tail", tail)
		return fmt.Errorf("%w: %s", app.ErrBuildFailed, tail)
	}

	logCtx.Info("build succeeded")

	// Push the image to the configured registry (zot). Without this the
	// built image never leaves the builder and cannot be pulled at runtime.
	if err := b.push(ctx, spec, imageRef); err != nil {
		return err
	}

	return nil
}

// push pushes the built image to the OCI registry using buildah. Registry
// credentials come from BuildSpec.RegistryAuth (env-injected). buildah logs
// in via a temporary auth file to avoid leaking credentials on the command
// line.
func (b *Builder) push(ctx context.Context, spec ports.BuildSpec, imageRef string) error {
	logCtx := slog.With("app_id", spec.AppID, "image_ref", imageRef)

	authFile, err := os.CreateTemp("", "agni-auth-*")
	if err != nil {
		return fmt.Errorf("buildah: create auth file: %w", err)
	}
	defer os.Remove(authFile.Name())

	if spec.RegistryAuth.Username != "" || spec.RegistryAuth.Password != "" {
		auth := fmt.Sprintf("%s:%s", spec.RegistryAuth.Username, spec.RegistryAuth.Password)
		encoded := base64.StdEncoding.EncodeToString([]byte(auth))
		// Docker config JSON for the single registry server derived from the
		// image reference.
		server := registryServer(imageRef)
		authJSON := fmt.Sprintf(`{"auths":{%q:{"auth":%q}}}`, server, encoded)
		if _, err := authFile.WriteString(authJSON); err != nil {
			return fmt.Errorf("buildah: write auth file: %w", err)
		}
	}

	pushArgs := []string{"push", "--tls-verify=true"}
	if _, err := os.Stat(authFile.Name()); err == nil && spec.RegistryAuth.Username != "" {
		pushArgs = append(pushArgs, "--authfile", authFile.Name())
	}
	pushArgs = append(pushArgs, imageRef)

	logCtx.Info("pushing image", "command", b.binary, "args", strings.Join(pushArgs, " "))
	cmd := exec.CommandContext(ctx, b.binary, pushArgs...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		logCtx.Error("buildah push failed", "error", err, "output", string(out))
		return fmt.Errorf("%w: push: %s", app.ErrBuildFailed, string(out))
	}

	logCtx.Info("push succeeded")
	return nil
}

// registryServer extracts the registry host from an image reference
// (e.g. "zoteg.anurag.store/apps/123:latest" → "zoteg.anurag.store").
// Falls back to the whole reference prefix if no slash is present.
func registryServer(ref string) string {
	// Strip tag/digest.
	ref = strings.SplitN(ref, ":", 2)[0]
	if idx := strings.Index(ref, "/"); idx >= 0 {
		return ref[:idx]
	}
	return ref
}

func (b *Builder) findDockerfile(dir string) string {
	for _, name := range []string{"Dockerfile", "dockerfile"} {
		p := filepath.Join(dir, name)
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return ""
}

// download fetches the archive. Supports file:// for dev mode, https?:// for S3 presigned.
func (b *Builder) download(ctx context.Context, url string, dest string) error {
	if strings.HasPrefix(url, "file://") {
		src := strings.TrimPrefix(url, "file://")
		return b.copyFile(src, filepath.Join(dest, "archive.tar.gz"))
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("fetch archive: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("fetch archive: HTTP %d", resp.StatusCode)
	}

	f, err := os.Create(filepath.Join(dest, "archive.tar.gz"))
	if err != nil {
		return err
	}
	defer f.Close()

	_, err = io.Copy(f, resp.Body)
	return err
}

func (b *Builder) copyFile(src, dst string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return fmt.Errorf("read %s: %w", src, err)
	}
	return os.WriteFile(dst, data, 0644)
}

// ringBuffer keeps the last N lines of output for error reporting.
type ringBuffer struct {
	buf   *bytes.Buffer
	lines []byte
	max   int
}

func newRingBuffer(buf *bytes.Buffer, maxLines int) *ringBuffer {
	return &ringBuffer{buf: buf, max: maxLines}
}

func (rb *ringBuffer) Write(p []byte) (n int, err error) {
	if _, err := rb.buf.Write(p); err != nil {
		return 0, err
	}
	rb.lines = append(rb.lines, p...)
	newlines := bytes.Count(rb.lines, []byte{'\n'})
	for newlines > rb.max {
		idx := bytes.IndexByte(rb.lines, '\n')
		if idx < 0 {
			break
		}
		rb.lines = rb.lines[idx+1:]
		newlines--
	}
	return len(p), nil
}

func (rb *ringBuffer) String() string {
	return string(rb.lines)
}

var _ ports.ImageBuilder = (*Builder)(nil)
