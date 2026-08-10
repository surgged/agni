package buildah

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	"github.com/surgged/agni/internal/ports"
)

// JobBuilder implements ports.ImageBuilder by launching a Kubernetes Job that
// runs buildah inside the cluster. This makes image builds happen on the k3s
// node rather than on the machine running the worker.
//
// The Job:
//   - downloads the source archive from the presigned ContextURL
//   - runs `buildah bud` to build the image
//   - runs `buildah push` to push it to the OCI registry (zot)
//
// Registry credentials are passed via a Secret (never on the command line).
type JobBuilder struct {
	clientset kubernetes.Interface
	namespace string
	image     string // buildah-capable image, e.g. quay.io/buildah/stable
}

// NewJobBuilder creates a JobBuilder. If no cluster is reachable it returns
// nil so callers can fall back to the host buildah builder.
func NewJobBuilder(namespace, image string) *JobBuilder {
	cs, err := buildClusterClientset()
	if err != nil {
		slog.Warn("k8s job builder: no cluster available", "error", err)
		return nil
	}
	if namespace == "" {
		namespace = "agni"
	}
	if image == "" {
		image = "quay.io/buildah/stable"
	}
	return &JobBuilder{clientset: cs, namespace: namespace, image: image}
}

// NewJobBuilderWithClientset is a test-friendly constructor.
func NewJobBuilderWithClientset(cs kubernetes.Interface, namespace, image string) *JobBuilder {
	if namespace == "" {
		namespace = "agni"
	}
	if image == "" {
		image = "quay.io/buildah/stable"
	}
	return &JobBuilder{clientset: cs, namespace: namespace, image: image}
}

func (b *JobBuilder) Build(ctx context.Context, spec ports.BuildSpec) error {
	logCtx := slog.With("app_id", spec.AppID, "image_ref", spec.ImageRef, "step", "build")
	jobName := "agni-build-" + spec.AppID

	// 1. Ensure the namespace exists.
	if _, err := b.clientset.CoreV1().Namespaces().Get(ctx, b.namespace, metav1.GetOptions{}); err != nil {
		if _, createErr := b.clientset.CoreV1().Namespaces().Create(ctx, &corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{Name: b.namespace},
		}, metav1.CreateOptions{}); createErr != nil {
			return fmt.Errorf("k8s build job: create namespace: %w", createErr)
		}
	}

	// 2. Create a Secret holding registry credentials (only if provided).
	secretName := jobName + "-creds"
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      secretName,
			Namespace: b.namespace,
			Labels:    map[string]string{"agni.build": jobName},
		},
		StringData: map[string]string{},
	}
	if spec.RegistryAuth.Username != "" || spec.RegistryAuth.Password != "" {
		secret.StringData = map[string]string{
			"REGISTRY_USERNAME": spec.RegistryAuth.Username,
			"REGISTRY_PASSWORD": spec.RegistryAuth.Password,
		}
	}
	if _, err := b.clientset.CoreV1().Secrets(b.namespace).Create(ctx, secret, metav1.CreateOptions{}); err != nil {
		return fmt.Errorf("k8s build job: create secret: %w", err)
	}
	defer func() {
		_ = b.clientset.CoreV1().Secrets(b.namespace).Delete(ctx, secretName, metav1.DeleteOptions{})
	}()

	// 3. The build script — download archive, extract, build, push.
	// ARCHIVE_URL and IMAGE_REF come from env. buildah uses the vfs storage
	// driver which needs no special kernel features and works in containers.
	script := `#!/bin/sh
set -eux
mkdir -p /build/src
cd /build/src
echo "==> downloading archive"
curl -fsSL "${ARCHIVE_URL}" -o archive.tar.gz
tar -xzf archive.tar.gz
echo "==> building image"
if [ -f Dockerfile ]; then
  DOCKERFILE="Dockerfile"
elif [ -f dockerfile ]; then
  DOCKERFILE="dockerfile"
else
  echo "no Dockerfile found" >&2
  exit 1
fi
buildah bud --storage-driver=vfs --layers -t "${IMAGE_REF}" -f "${DOCKERFILE}" .
echo "==> pushing image"
if [ -n "${REGISTRY_USERNAME:-}" ] && [ -n "${REGISTRY_PASSWORD:-}" ]; then
  buildah push --storage-driver=vfs --tls-verify=true \
    --creds "${REGISTRY_USERNAME}:${REGISTRY_PASSWORD}" \
    "${IMAGE_REF}"
else
  buildah push --storage-driver=vfs --tls-verify=true "${IMAGE_REF}"
fi
echo "==> build job complete"
`

	// 4. Create the Job.
	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      jobName,
			Namespace: b.namespace,
			Labels:    map[string]string{"agni.build": jobName},
		},
		Spec: batchv1.JobSpec{
			BackoffLimit: int32Ptr(0), // the workflow retries the activity itself
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{"agni.build": jobName}},
				Spec: corev1.PodSpec{
					RestartPolicy: corev1.RestartPolicyNever,
					Containers: []corev1.Container{
						{
							Name:    "build",
							Image:   b.image,
							Command: []string{"/bin/sh", "-c", script},
							Env: []corev1.EnvVar{
								{Name: "ARCHIVE_URL", Value: spec.ContextURL},
								{Name: "IMAGE_REF", Value: spec.ImageRef},
							},
							EnvFrom: []corev1.EnvFromSource{
								{
									SecretRef: &corev1.SecretEnvSource{
										LocalObjectReference: corev1.LocalObjectReference{Name: secretName},
									},
								},
							},
							SecurityContext: &corev1.SecurityContext{
								Privileged: boolPtr(true), // buildah needs privileges
							},
							Resources: corev1.ResourceRequirements{
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("250m"),
									corev1.ResourceMemory: resource.MustParse("512Mi"),
								},
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("2"),
									corev1.ResourceMemory: resource.MustParse("2Gi"),
								},
							},
						},
					},
				},
			},
		},
	}

	if _, err := b.clientset.BatchV1().Jobs(b.namespace).Create(ctx, job, metav1.CreateOptions{}); err != nil {
		return fmt.Errorf("k8s build job: create job: %w", err)
	}
	defer func() {
		_ = b.clientset.BatchV1().Jobs(b.namespace).Delete(ctx, jobName, metav1.DeleteOptions{})
	}()

	// 5. Wait for completion (with context timeout).
	logCtx.Info("k8s build job created", "job", jobName, "image", b.image)
	return b.waitForJob(ctx, jobName, spec)
}

func (b *JobBuilder) waitForJob(ctx context.Context, jobName string, spec ports.BuildSpec) error {
	logCtx := slog.With("app_id", spec.AppID, "job", jobName)
	timeout := spec.Timeout
	if timeout <= 0 {
		timeout = 10 * time.Minute
	}
	deadline := time.Now().Add(timeout)
	interval := 5 * time.Second

	for time.Now().Before(deadline) {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(interval):
		}

		job, err := b.clientset.BatchV1().Jobs(b.namespace).Get(ctx, jobName, metav1.GetOptions{})
		if err != nil {
			continue
		}

		if job.Status.Succeeded > 0 {
			logCtx.Info("k8s build job succeeded")
			return nil
		}
		if job.Status.Failed > 0 {
			logs := b.podLogs(ctx, jobName)
			return fmt.Errorf("k8s build job failed: %s", logs)
		}
	}

	return fmt.Errorf("k8s build job timed out after %v", timeout)
}

// podLogs returns the logs of the job's first pod for error diagnostics.
func (b *JobBuilder) podLogs(ctx context.Context, jobName string) string {
	pods, err := b.clientset.CoreV1().Pods(b.namespace).List(ctx, metav1.ListOptions{
		LabelSelector: "agni.build=" + jobName,
	})
	if err != nil || len(pods.Items) == 0 {
		return "(logs unavailable)"
	}

	req := b.clientset.CoreV1().Pods(b.namespace).GetLogs(
		pods.Items[0].Name,
		&corev1.PodLogOptions{TailLines: int64Ptr(50)},
	)
	readCloser, err := req.Stream(ctx)
	if err != nil {
		return "(log stream unavailable)"
	}
	defer readCloser.Close()

	buf := new(bytes.Buffer)
	if _, err := buf.ReadFrom(readCloser); err != nil {
		return "(log read failed)"
	}
	return buf.String()
}

// buildClusterClientset builds a k8s clientset from in-cluster config (worker
// inside the cluster) or KUBECONFIG (host dev).
func buildClusterClientset() (kubernetes.Interface, error) {
	if config, err := rest.InClusterConfig(); err == nil {
		return kubernetes.NewForConfig(config)
	}
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		home, err := os.UserHomeDir()
		if err == nil {
			kubeconfig = filepath.Join(home, ".kube", "config")
		}
		if _, err := os.Stat("/etc/rancher/k3s/k3s.yaml"); err == nil {
			kubeconfig = "/etc/rancher/k3s/k3s.yaml"
		}
	}
	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		return nil, err
	}
	return kubernetes.NewForConfig(config)
}

func int32Ptr(v int32) *int32 { return &v }
func int64Ptr(v int64) *int64 { return &v }
func boolPtr(v bool) *bool    { return &v }

var _ ports.ImageBuilder = (*JobBuilder)(nil)
