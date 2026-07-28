# PRD: Agni — MCP-First App Hosting Platform (v1)

**Date:** 2026-07-28
**Status:** DRAFT
**Build target:** 3 weeks
**Branch:** `feat/mcp-deploy-slice`

---

## Pitch

Claude Code and Cursor users finish writing an app and have nowhere good to put it. Agni is the neutral deploy target for open agents: one MCP call deploys an app with TLS, magic-link auth, and a shareable URL — on any cloud, or on bare metal.

No Vercel. No IAM. No `git push` ritual. No cloud lock-in.

---

## The Wedge

**MCP server. Two verbs. k3s + Kata Containers (Firecracker). TLS from day one. Basic dashboard. Multi-machine from day one.**

User's agent calls `deploy({ path })` → The agni-mcp server (running on the user's machine) tarballs the project directory, sends it to the Agni API. Agni builds the OCI image with nerdctl, pushes to an in-cluster registry, creates a k3s Pod with the kata-fc RuntimeClass (Firecracker microVM), cert-manager provisions TLS, and returns a URL.

User visits the dashboard at `agni.dev` → sees their apps, manages shares, logs in with magic-link.

**The agent is the primary interface. The dashboard is the human fallback.**

---

## Two Key Decisions

### 1. Agni builds the image, not the user

The user's machine has source code. The Agni server has nerdctl, containerd, the kata runtime, and k3s. The MCP `deploy` tool bridges them:

```
User's machine                         Agni server
──────────────                         ───────────
1. Agent calls deploy({ path })
2. MCP tarballs the directory ──────→ 3. API receives tarball
                                      4. nerdctl build .
                                      5. nerdctl push (in-cluster registry)
                                      6. kubectl apply Pod (kata-fc RuntimeClass)
                                      7. kubectl apply Ingress (+cert-manager annotation)
                                      8. Returns URL
9. Agent receives { appId, url } ←──
```

This is how every PaaS works (Heroku slug, Fly.io remote builder, Railway). **The user needs nothing installed** — no Docker, no nerdctl, no k3s. Just source code and the agni-mcp npm package.

### 2. k3s from day one, not "k8s-ready for later"

I resisted k8s for three revisions and I was wrong. **k3s makes v1 easier.** Here's the honest accounting:

| We were going to write | k3s gives us for free |
|------------------------|----------------------|
| Health check loop + restart (~80 lines Go) | Pod liveness/readiness probes (3 lines YAML) |
| CNI networking + bridge config (~100 lines bash) | Built-in Flannel (zero config) |
| Reverse proxy route table + IP tracking (~120 lines Go) | Ingress + Services (standard API) |
| Per-app TLS cert provisioning + renewal (~100 lines Go) | cert-manager (one annotation on Ingress) |
| Container log streaming (~60 lines Go) | `kubectl logs` / k8s API |
| PID tracking for stop/destroy (~50 lines Go) | `kubectl delete pod` |
| Resource limit enforcement (~30 lines Go) | Pod resource requests/limits |
| Multi-machine (scheduler, overlay, service discovery) | `k3s agent --server ...` — one command to add nodes |

**~540 lines of Go we don't write.** Instead: ~80 lines of YAML templates + ~100 lines of k8s client-go calls. And adding a second machine is literally one command.

k3s is a single binary, certified Kubernetes distribution. ~512MB RAM, runs perfectly on one node, enterprise-hardened by Rancher/SUSE. For v1 single-host it eliminates code we'd write. For v2 multi-host it's already solved — same architecture, zero code changes.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    Agni Host (k3s node)                           │
│  (AWS EC2 / Azure VM / Hetzner dedi / your rack)                 │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  cert-manager                                             │   │
│  │  (Let's Encrypt HTTP-01 via Ingress, auto-renews)         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Ingress NGINX                                            │   │
│  │  agni.dev               → agni-api Service                │   │
│  │  {app-id}.agni.dev      → app-{id} Service (session-gated)│   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │  Pod: agni-api │  │  Pod: app-abc  │  │  Pod: app-xyz  │     │
│  │  (Echo server) │  │  kata-fc       │  │  kata-fc       │     │
│  │                │  │  ┌───────────┐ │  │  ┌───────────┐ │     │
│  │                │  │  │Firecrack  │ │  │  │Firecrack  │ │     │
│  │                │  │  │ microVM   │ │  │  │ microVM   │ │     │
│  │                │  │  │ :8080     │ │  │  │ :8080     │ │     │
│  │                │  │  └───────────┘ │  │  └───────────┘ │     │
│  └────────────────┘  └────────────────┘  └────────────────┘     │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  containerd (per-node)                                    │   │
│  │  ┌──────────────┐  ┌────────────────────────────────┐    │   │
│  │  │ kata-fc shim │  │ in-cluster registry             │    │   │
│  │  └──────────────┘  └────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Why Kata Containers + Firecracker

Kata Containers (8,400+ GitHub stars, CNCF graduated) wraps Firecracker as a containerd shim. It's k8s-native via `RuntimeClass`. Each app Pod gets a dedicated Firecracker microVM with its own kernel — hardware isolation without the image-conversion nightmare.

**No image conversion. No nbdkit. No kernel compilation.** The user's Dockerfile builds normally. Kata handles the VM.

---

## Runtime Contract

```
Source code (user's machine) → tarball → Agni server →
  nerdctl build → OCI image → in-cluster registry →
  k3s Pod (kata-fc RuntimeClass) → Firecracker microVM →
  Ingress + cert-manager → https://{id}.agni.dev
```

---

## Reality Check: What Exists

| Assumed | Actual |
|---------|--------|
| Temporal, outbox, audit | ❌ None exist |
| org/project/env/deployment aggregates | ❌ Only user + token exist |
| AWS SDK, Caddy | ❌ Not in go.mod |

**What we reuse:**

| Existing | How v1 uses it |
|----------|---------------|
| DDD patterns | New `app` + `sharelink` aggregates |
| JWT auth | Agent tokens + magic-link + sessions |
| GORM + SQLite | Aggregate persistence |
| Echo HTTP server | Agni API server |
| React + Vite + Tailwind + shadcn/ui (`views/`) | Dashboard SPA |
| In-memory event bus | Domain events |
| Config (Viper + env) | All new config |
| BCrypt (`pkg/crypto/`) | Sharelink tokens |

---

## Project Structure

```
agni/                           # Backend API + k3s operator (this repo)
├── cmd/server/main.go          # Echo API server
├── internal/                   # Domain, adapters, application
├── deploy/                     # k3s YAML manifests
│   ├── agni-api/               # API Deployment + Service + Ingress
│   ├── app-template/           # App Pod + Service + Ingress template
│   └── cert-manager/           # ClusterIssuer
├── views/                      # React dashboard SPA
├── configs/config.yaml
└── scripts/agni-host-setup.sh  # k3s, kata, firecracker, nerdctl, cert-manager, ingress-nginx, registry

agni-mcp/                       # MCP server (separate repo)
├── src/
│   ├── server.ts               # MCP stdio server
│   ├── tools/
│   │   ├── deploy.ts           # tarball → POST /api/v1/apps
│   │   └── share.ts            # share({ appId, email })
│   ├── client.ts               # Agni API HTTP client
│   └── auth.ts                 # Agent token management
├── package.json
└── README.md
```

---

## User Stories

1. **Deploy from agent:** `deploy({ path })` → tarball sent to Agni → built → kata-fc Pod → live HTTPS URL
2. **Share by link:** `share({ appId, email })` → magic-link → friend accesses app
3. **View apps in dashboard:** Visit `agni.dev`, login, see apps with status + share links
4. **Manage shares from dashboard:** Click app → create/revoke shares
5. **Agent-friendly errors:** Machine-readable error codes, Dockerfile linting before build

---

## New Domain Aggregates

### `app` aggregate (`internal/domain/app/`)

```go
type App struct {
    ID           uuid.UUID
    CreatedAt    time.Time
    UpdatedAt    time.Time
    OwnerEmail   string
    Name         string
    Runtime      string    // "kata"
    ImageRef     string    // registry image ref
    PodName      string    // k8s Pod name
    ServiceURL   string    // https://{id}.agni.dev
    ShareURL     string    // https://agni.dev/app/{id}
    Status       Status    // created|building|deploying|live|failed|destroyed
    ErrorMessage string
    events       []shared.DomainEvent `gorm:"-"`
}

func NewApp(id uuid.UUID, ownerEmail, name string) (*App, error)
func (a *App) MarkBuilding() error
func (a *App) MarkDeploying(imageRef, podName string) error
func (a *App) MarkLive(serviceURL, shareURL string) error
func (a *App) MarkFailed(reason string) error
func (a *App) Destroy() error
func (a *App) PullEvents() []shared.DomainEvent
```

### `sharelink` aggregate (`internal/domain/sharelink/`)

```go
type ShareLink struct {
    ID             uuid.UUID
    CreatedAt      time.Time
    AppID          uuid.UUID
    RecipientEmail string
    Permission     Permission
    TokenHash      string
    ExpiresAt      time.Time
    RevokedAt      *time.Time
    AcceptedAt     *time.Time
    events         []shared.DomainEvent `gorm:"-"`
}

func NewShareLink(id, appID uuid.UUID, recipientEmail string, permission Permission, ttl time.Duration) (*ShareLink, error)
func (s *ShareLink) Accept(plaintextToken string) error
func (s *ShareLink) Revoke() error
func (s *ShareLink) IsValid() bool
func (s *ShareLink) PullEvents() []shared.DomainEvent
```

---

## New Adapters

### Agent API Key (`internal/adapters/auth/agentapikey/`)
JWT signed with server secret. `sub=email`, `typ=agent`.

### Deploy Pipeline (`internal/application/deploy/`)
Goroutine: receive tarball → nerdctl build → nerdctl push → kubectl apply Pod → wait Ready → apply Ingress → live.

### k3s Provider (`internal/adapters/provider/k3s/`)
```go
type K3sProvider struct {
    clientset    *kubernetes.Clientset
    namespace    string
    registryAddr string
}
func (p *K3sProvider) Deploy(ctx context.Context, spec PodSpec) error
func (p *K3sProvider) Destroy(ctx context.Context, name string) error
func (p *K3sProvider) Status(ctx context.Context, name string) (PodStatus, error)
```
Uses `client-go` for Pod/Service/Ingress CRUD + status watch.

### Email Adapter (`internal/adapters/email/resend/`)
HTTP POST to Resend API.

---

## k3s App Pod Template

```yaml
# deploy/app-template/manifest.yaml (applied with values substituted)
apiVersion: v1
kind: Pod
metadata:
  name: app-{id}
  labels: {app: app-{id}, agni.owner: {ownerEmail}}
spec:
  runtimeClassName: kata-fc
  containers:
  - name: app
    image: registry.agni.svc:5000/apps/{id}:latest
    ports: [{containerPort: 8080}]
    resources:
      requests: {cpu: "250m", memory: "256Mi"}
      limits: {cpu: "1", memory: "512Mi"}
    livenessProbe:  {httpGet: {path: /, port: 8080}, initialDelaySeconds: 10, periodSeconds: 15}
    readinessProbe: {httpGet: {path: /, port: 8080}, initialDelaySeconds: 5, periodSeconds: 5}
---
apiVersion: v1
kind: Service
metadata: {name: app-{id}}
spec: {selector: {app: app-{id}}, ports: [{port: 8080, targetPort: 8080}]}
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-{id}
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/auth-url: "http://agni-api.agni.svc/auth/session?app={id}"
    nginx.ingress.kubernetes.io/auth-signin: "https://agni.dev/login?app={id}"
spec:
  tls: [{hosts: ["{id}.agni.dev"], secretName: app-{id}-tls}]
  rules:
  - host: "{id}.agni.dev"
    http:
      paths:
      - path: /
        pathType: Prefix
        backend: {service: {name: app-{id}, port: {number: 8080}}}
```

**This single template replaces** ~400 lines of Go code: Echo reverse proxy middleware, IP tracking, health checks, TLS provisioning, restart logic.

---

## HTTP API Surface

```
POST   /api/v1/apps                      → Receive tarball, start deploy (agent token)
GET    /api/v1/apps                      → List user's apps (session or agent token)
GET    /api/v1/apps/:id                  → Get app detail
DELETE /api/v1/apps/:id                  → Destroy app (deletes k8s Pod+Service+Ingress)

POST   /api/v1/apps/:id/share            → Create sharelink, send email
GET    /auth/magic                        → Verify token, set session cookie
POST   /auth/magic                        → Enter email, send magic link
DELETE /api/v1/apps/:id/shares/:sid      → Revoke share

GET    /auth/session?app={id}            → Called by Ingress auth-url. Returns 200/401.
```

### Session Validation Endpoint

The Ingress calls `GET /auth/session?app={appId}` with the request's cookies. The handler validates the session JWT against the sharelink for that app. Returns 200 if valid, 401 if not. The Ingress proxies or redirects accordingly. No custom proxy code — k8s Ingress handles routing.

---

## Dashboard

React SPA using existing `views/` scaffold + shadcn/ui (already configured).

| Page | Path | Purpose |
|------|------|---------|
| Login | `/login` | Enter email → magic link → session cookie |
| Apps list | `/apps` | Cards with status, URL, share count |
| App detail | `/apps/:id` | Details, share management, destroy |
| Auth callback | `/auth/callback?token=...` | Verify token → set session → redirect |

Deploy is agent-only. Dashboard is for viewing + managing shares.

---

## Config

```yaml
mcp:
  agent_signing_secret: "change-me-in-production"
  agent_token_ttl: 720h

email:
  provider: "resend"
  resend_api_key: ""
  from_address: "agni@agni.dev"

share:
  domain: "agni.dev"
  magic_link_ttl: 24h
  session_ttl: 168h

deploy:
  max_tarball_size_mb: 500
  build_timeout_s: 300
  deploy_timeout_s: 120

k3s:
  namespace: "agni"
  registry_addr: "registry.agni.svc:5000"
  kata_runtime_class: "kata-fc"
  ingress_class: "nginx"
  cert_issuer: "letsencrypt-prod"

views:
  enabled: true
  dev_server: ""
```

Note what's gone: no TLS config (cert-manager), no bridge/subnet (k3s Flannel), no health check config (k8s probes), no proxy config (Ingress).

---

## Dependencies

**agni (Go):**
```
github.com/containerd/containerd
k8s.io/client-go
k8s.io/api
```

**agni-mcp (TypeScript):**
```
@modelcontextprotocol/sdk
```

**Not adding:** firecracker-go-sdk, CNI plugins, nbdkit, cert-manager SDK, ingress-nginx SDK, Docker client, Caddy, Echo AutoTLS code.

---

## Files to Create

**Domain + persistence:**
- `internal/domain/app/app.go`, `events.go`, `repository.go`
- `internal/domain/sharelink/sharelink.go`, `events.go`, `repository.go`
- `internal/adapters/persistence/gorm/app_repository.go`
- `internal/adapters/persistence/gorm/sharelink_repository.go`

**Adapters:**
- `internal/adapters/auth/agentapikey/agent_token.go`
- `internal/adapters/email/resend/client.go`, `internal/adapters/email/ports.go`
- `internal/ports/provider.go`
- `internal/adapters/provider/k3s/provider.go`, `templates.go`

**Application:**
- `internal/application/deploy/pipeline.go`

**HTTP handlers:**
- `internal/adapters/http/web/v1/app_handler.go`
- `internal/adapters/http/web/v1/share_handler.go`
- `internal/adapters/http/web/v1/magic_handler.go`
- `internal/adapters/http/web/v1/session_handler.go`

**k3s manifests:**
- `deploy/kata-runtimeclass.yaml`
- `deploy/cert-manager/cluster-issuer.yaml`
- `deploy/app-template/manifest.yaml`
- `deploy/agni-api/deployment.yaml`, `service.yaml`, `ingress.yaml`

**Dashboard:**
- `views/src/pages/Login.tsx`, `Apps.tsx`, `AppDetail.tsx`, `AuthCallback.tsx`
- `views/src/components/AppCard.tsx`, `ShareDialog.tsx`

**Scripts + migrations:**
- `scripts/agni-host-setup.sh`
- `db/migrations/001_create_apps.{up,down}.sql`
- `db/migrations/002_create_sharelinks.{up,down}.sql`

## Files to Modify
| File | Change |
|------|--------|
| `internal/config/config.go` | Add MCPConfig, EmailConfig, ShareConfig, DeployConfig, K3sConfig |
| `configs/config.yaml` | Add config blocks |
| `cmd/server/main.go` | Wire k3s provider, pipeline, session handler |
| `internal/adapters/http/web/v1/routes.go` | Add app/share/magic-link/session routes |
| `internal/adapters/persistence/gorm/db.go` | Register App, ShareLink models |
| `views/src/App.tsx` | Add dashboard routes |
| `views/src/api.ts` | Add app/share endpoints |
| `views/src/contexts/AuthContext.tsx` | Session management |
| `go.mod` | Add client-go, k8s.io/api, containerd |

---

## Migration SQL

### `001_create_apps.up.sql`
```sql
CREATE TABLE apps (
    id              TEXT PRIMARY KEY,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    owner_email     TEXT NOT NULL,
    name            TEXT NOT NULL,
    runtime         TEXT NOT NULL DEFAULT 'kata',
    image_ref       TEXT NOT NULL DEFAULT '',
    pod_name        TEXT NOT NULL DEFAULT '',
    service_url     TEXT NOT NULL DEFAULT '',
    share_url       TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'created',
    error_message   TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_apps_owner ON apps(owner_email);
CREATE INDEX idx_apps_status ON apps(status);
```

### `002_create_sharelinks.up.sql`
```sql
CREATE TABLE share_links (
    id              TEXT PRIMARY KEY,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    app_id          TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    permission      TEXT NOT NULL DEFAULT 'use',
    token_hash      TEXT NOT NULL,
    expires_at      DATETIME NOT NULL,
    revoked_at      DATETIME,
    accepted_at     DATETIME
);
CREATE INDEX idx_sharelinks_app ON share_links(app_id);
CREATE INDEX idx_sharelinks_email ON share_links(recipient_email);
```

---

## k3s Cluster Setup

`agni-host-setup.sh` automates:
```
1. curl -sfL https://get.k3s.io | sh -                    # k3s single-node
2. kubectl apply -f kata-runtimeclass.yaml                  # kata-fc handler
3. kubectl apply -f https://github.com/cert-manager/...     # cert-manager
4. kubectl apply -f cluster-issuer.yaml                     # Let's Encrypt
5. helm install ingress-nginx ingress-nginx/...             # Ingress controller
6. nerdctl run -d -p 5000:5000 registry:2                  # In-cluster registry
7. Smoke test: kubectl run --rm -it --image=hello-world \
     --overrides='{"spec":{"runtimeClassName":"kata-fc"}}' test-pod
```

Tested on Ubuntu 24.04 + Debian 12.

---

## Build Order (3 Weeks)

| Week | Day | Deliverable |
|------|-----|-------------|
| **W1** | 1 | `app` aggregate + tests + GORM repo + migration |
| | 2 | `sharelink` aggregate + tests + GORM repo + migration |
| | 3 | Agent API key adapter + session handler |
| | 4 | Run `agni-host-setup.sh`. Verify k3s, kata-fc RuntimeClass, cert-manager, ingress-nginx. Write k3s provider (client-go: apply Pod template, watch). |
| | 5 | Tarball → nerdctl build → push → kubectl apply. End-to-end: tarball → live kata-fc Pod with TLS via cert-manager. |
| **W2** | 6 | App HTTP handlers + wire deploy pipeline. API POST tarball → live URL. |
| | 7 | Resend adapter + magic-link token issue/verify |
| | 8 | Magic-link handlers + session cookie |
| | 9 | Ingress auth-url → session validation endpoint. Share proxy via Ingress. |
| | 10 | Share handlers end-to-end + agni-mcp `share` tool |
| **W3** | 11 | Dashboard: login + auth callback + auth context |
| | 12 | Dashboard: apps list + app detail + share management |
| | 13 | agni-mcp `deploy` tool (tarball → multipart POST) + MCP README |
| | 14 | End-to-end test + hardening + polish setup script |
| | 15 | **Recruit 3 testers. Watch them try it. Take notes.** |

---

## Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| k3s + kata + cert-manager + registry setup | `agni-host-setup.sh` fully automated, idempotent |
| In-cluster registry setup | `nerdctl run registry:2` as part of setup. k3s also supports `--docker` |
| nerdctl build edge cases | Dockerfile linter + known-good template fallback |
| cert-manager HTTP-01 needs DNS + Ingress | Test DNS + Ingress before writing Agni code |
| KVM not available (non-Linux) | Linux-only server; docker provider in v2 |
| MCP install friction | `npx agni-mcp` one-command install + copy-paste config |

---

## What k3s Eliminates

| Code we don't write | Replaced by |
|---------------------|-------------|
| `internal/adapters/tls/autocert.go` (~100 lines) | cert-manager ClusterIssuer (1 YAML) |
| `internal/adapters/http/web/shareproxy/middleware.go` (~120 lines) | Ingress + auth-url annotation |
| Health check goroutine (~60 lines) | Pod liveness/readiness probes |
| Container restart logic (~40 lines) | Pod restartPolicy |
| CNI networking (~100 lines bash) | k3s built-in Flannel |
| Route table / IP tracking (~60 lines) | Service + Endpoints |
| PID tracking for stop (~30 lines) | `kubectl delete pod` |
| Resource limit enforcement (~30 lines) | Pod requests/limits |

**~540 lines of Go eliminated.** ~180 lines of k8s YAML + client-go code added. Net reduction: ~360 lines.

---

## Explicitly OUT of Scope (v1)

- ❌ Custom domains — `*.agni.dev` subdomains only
- ❌ Team/organization — single user
- ❌ Billing — free
- ❌ Temporal — goroutine pipeline
- ❌ Transactional outbox — in-memory event bus
- ❌ Audit trail — structured logging
- ❌ Deploy from dashboard — agent-only
- ❌ VM snapshots — cold boot
- ❌ `view`/`admin` permissions — `use` only
- ❌ macOS/Windows host — Linux only (KVM)

---

## Multi-Node Scaling (Works Today, Zero Code Changes)

Adding a second node:
```bash
curl -sfL https://get.k3s.io | K3S_URL=https://{server-ip}:6443 K3S_TOKEN={token} sh -
```

k3s scheduler distributes Pods across nodes. Ingress routes regardless of Pod location. cert-manager continues issuing certs. kata-fc RuntimeClass works on every node. **Zero code changes.** The architecture scales from 1 node to N nodes with no Agni code modifications.

---

## Success Criteria

At least 2 of 3 recruited devs:
1. Install agni-mcp in Claude Code
2. Deploy a real app → live at `https://{app-id}.agni.dev`
3. See their app in the dashboard
4. Share it with a friend
5. Friend can access and use the app

---

## Pre-Build Assignment

1. **Email 3 devs.**
2. **Pick sample app.** Test: nerdctl build → push → k3s Pod (kata-fc + cert-manager + Ingress).
3. **Register domain.** DNS → k3s node IP.
4. **Provision Linux server.** Run `agni-host-setup.sh`. Verify everything.
5. **Create `agni-mcp` repo.**

---

## v2+ Roadmap

- **Multi-node k3s** — already works
- **VM snapshots** — near-instant cold starts
- **Custom domains** — user domain → cert-manager
- **Provider backends** — EKS, AKS, GKE via ContainerProvider interface
- **Remote registry** — Harbor or ECR
- **Resource metering** — per-app billing
- **Team semantics** — multi-user orgs
- **Temporal** — durable workflows
- **Docker dev mode** — local provider without KVM
- **Prometheus** — kube-prometheus-stack

---

## Quick Reference: Project Conventions

| Convention | Pattern |
|------------|---------|
| Domain aggregate | `internal/domain/<name>/<name>.go` |
| Domain events | `internal/domain/<name>/events.go` |
| Repository port | `internal/domain/<name>/repository.go` |
| Port interface | `internal/ports/<name>.go` |
| GORM repo | `internal/adapters/persistence/gorm/<name>_repository.go` |
| Provider adapter | `internal/adapters/provider/<name>/` |
| HTTP handler | `internal/adapters/http/web/v1/<name>_handler.go` |
| k3s manifest | `deploy/<component>/<name>.yaml` |
| Dashboard page | `views/src/pages/<Name>.tsx` |
| Aggregate constructor | `func NewX(id uuid.UUID, ...) (*X, error)` |
| Events (unexported) | `events []shared.DomainEvent` with `gorm:"-"` |
| Event access | `func (x *X) PullEvents() []shared.DomainEvent` |
| SQL column order | `id`, `created_at`, `updated_at`, then business columns |
| Migrations | `db/migrations/NNN_description.{up,down}.sql` |
