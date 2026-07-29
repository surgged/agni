# Engineering Doc: Agni — Real Backend Implementation (v1)

- Status: Done
- Slug: `edge-mcp-v1`
- Linked overview: `./01-overview.md`
- Skills consulted:
  - `crank-project`: Crank CLI conventions (`crank test`, `crank build`).
  - `backend-go`: DDD + CQRS hexagonal patterns for Go aggregate boundaries, Echo handlers, GORM persistence, client-go integration.
- Author: Gemini 3.6 Flash / 2026-07-29
- Date: 2026-07-29

## 1. Summary

This document specifies the concrete backend implementation replacing all stubbed/mocked components in Agni:
1. **Real k3s Provider Adapter (`internal/adapters/provider/k3s/`)**: Using `k8s.io/client-go` to dynamically apply and manage `kata-fc` Pods, Services, and Ingresses.
2. **Real Build & Deploy Pipeline (`internal/application/deploy/pipeline.go`)**: Extracting tarballs into workspace temp directories, building OCI images via `nerdctl build`, and pushing to `registry.agni.svc:5000` before triggering k3s deployment.
3. **Async File Upload Fix (`internal/adapters/http/web/v1/app_handler.go`)**: Saving tarball upload payloads to temporary files before background deployment goroutines run.
4. **Real Container Log Streaming (`GET /api/v1/apps/:id/logs`)**: Streaming live stdout/stderr logs from k3s Pods via `client-go`'s `GetLogs` API.
5. **Real Email Adapter (`internal/adapters/email/resend/client.go`)**: Dispatching magic link emails via direct HTTP POST requests to `https://api.resend.com/emails`.

## 2. Low-Level Design & Component Specifications

### 2.1 Dependencies (`go.mod`)
- Add `k8s.io/client-go` (v0.32+) and `k8s.io/api`.
- Run `go mod tidy` to clean indirect dependencies.

### 2.2 Email Adapter (`internal/adapters/email/resend/client.go`)
- Construct an `http.Client` with timeout (10s).
- On `SendMagicLink(ctx, email, token)`:
  - If `apiKey` is empty, fallback to logging in dev/test mode.
  - Send HTTP `POST https://api.resend.com/emails` with header `Authorization: Bearer <apiKey>` and JSON body:
    ```json
    {
      "from": "<fromAddr>",
      "to": ["<email>"],
      "subject": "Your Agni Magic Login Link",
      "html": "<p>Click <a href='https://<domain>/auth/magic?token=<token>'>here</a> to log in.</p>"
    }
    ```

### 2.3 k3s Provider (`internal/adapters/provider/k3s/`)
- Struct definition in `provider.go`:
  ```go
  type Provider struct {
      clientset    kubernetes.Interface
      namespace    string
      registryAddr string
  }
  ```
- Support initialization from:
  1. In-cluster config (`rest.InClusterConfig()`)
  2. Kubeconfig file fallback (`clientcmd.BuildConfigFromFlags("", kubeconfigPath)`)
  3. Memory fake/mock fallback if no k8s cluster is available (e.g. unit test mode).
- `Deploy(ctx, spec)`:
  - Render YAML templates in `templates.go` for Pod, Service, and Ingress.
  - Decode dynamic YAML objects into `v1.Pod`, `v1.Service`, `networkingv1.Ingress`.
  - Execute `Create` or `Update` using `clientset.CoreV1().Pods(namespace)`, `Services(namespace)`, `Ingresses(namespace)`.
- `Destroy(ctx, name)`:
  - Delete Ingress `app-{id}`, Service `app-{id}`, and Pod `app-{id}` with background propagation policy.
- `Status(ctx, name)`:
  - Query Pod `app-{id}` status phase (`Pending`, `Running`, `Succeeded`, `Failed`).

### 2.4 Build & Deploy Pipeline (`internal/application/deploy/pipeline.go` & `app_handler.go`)
- **Fix in `app_handler.go`**:
  - Save `tarball` form file to a temporary file on disk (e.g., `os.CreateTemp("", "agni-tarball-*.tar.gz")`) before launching the background goroutine.
  - Pass the temp file path or open file to `p.pipeline.Deploy(...)`, ensuring cleanup (`defer os.Remove(...)`) when deploy finishes.
- **Pipeline Implementation (`pipeline.go`)**:
  - Step 1: Create temp directory for extracted source code.
  - Step 2: Un-tar tarball archive into temp directory.
  - Step 3: Run `exec.CommandContext(ctx, "nerdctl", "build", "-t", imageRef, tempDir)` (falling back to `docker build` if `nerdctl` is missing, or logging mock build in non-KVM dev mode).
  - Step 4: Run `exec.CommandContext(ctx, "nerdctl", "push", imageRef)`.
  - Step 5: Call `p.provider.Deploy(ctx, spec)`.
  - Step 6: Mark app status live on success or failed on error.

### 2.5 Container Log Streaming (`internal/adapters/http/web/v1/app_handler.go`)
- In `Logs(c *echo.Context)`:
  - Query `clientset.CoreV1().Pods(namespace).GetLogs(podName, &v1.PodLogOptions{Follow: true, Stream: ...}).Stream(ctx)`.
  - Fallback to mock log ticker if k8s stream fails or unavailable.
  - Read lines continuously and write SSE events (`data: <log-line>\n\n`) to response writer.

## 3. Execution Strategy

- **Pattern:** Serial execution of backend updates across dependencies, adapters, application logic, and verification.
- **Write Scopes:**
  - `go.mod`, `go.sum`
  - `internal/adapters/email/resend/client.go`
  - `internal/adapters/provider/k3s/provider.go`, `templates.go`
  - `internal/application/deploy/pipeline.go`
  - `internal/adapters/http/web/v1/app_handler.go`
  - `cmd/server/main.go`

## 4. Review & Approval

- Status: In Review — Awaiting user approval to proceed with execution.

