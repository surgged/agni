# Todo Tracker: Agni — MCP-First App Hosting Platform (v1)

- Status: Done
- Slug: `edge-mcp-v1`
- Linked engineering doc: `./02-engineering-doc.md`
- Last updated: 2026-07-29

Derived from the Phase 2 Execution Strategy. Update continuously during implementation.

## Task Board

| # | Task | Owner (agent) | Write scope | Status | Link (commit/PR) |
|---|------|---------------|-------------|--------|------------------|
| 1 | High-end animated Landing Page | landing-builder | `views/src/components/landing/*`, `views/src/pages/LandingPage.tsx` | done | Completed |
| 2 | Vercel/Railway Dashboard & App Detail UI | dashboard-builder | `views/src/components/dashboard/*`, `views/src/pages/Dashboard.tsx`, `views/src/pages/AppDetail.tsx`, `views/src/types/app.ts` | done | Completed |
| 3 | Magic Link Auth & Agent Token UI | auth-builder | `views/src/pages/Login.tsx`, `views/src/pages/AuthCallback.tsx`, `views/src/contexts/auth.tsx`, `views/src/api.ts`, `views/src/components/layout/*` | done | Completed |
| 4 | Frontend route wiring & build validation | main-agent | `views/src/App.tsx`, `views/src/components/landing/Navbar.tsx` | done | Verified `npm run build` |
| 5 | Domain aggregates (`app`, `sharelink`) & GORM repos | backend-agent | `internal/domain/*`, `internal/adapters/persistence/gorm/*` | done | Completed |
| 6 | k3s Provider adapter (`client-go`) & deploy pipeline | backend-agent | `internal/adapters/provider/k3s/*`, `internal/application/deploy/*` | done | Completed |
| 7 | HTTP API endpoints & Ingress session validator | backend-agent | `internal/adapters/http/web/v1/*`, `cmd/server/main.go` | done | Completed |
| 8 | Swagger API docs & BE/FE integration | main-agent | `docs/*`, `cmd/server/main.go`, `views/*` | done | Verified `crank build` & `crank make swag` |
| 9 | Orval React Query + Axios generation | main-agent | `views/orval.config.ts`, `views/src/lib/mutator.ts`, `views/src/lib/generated/*` | done | Verified `bun run generate` & `bun run build` |
| 10 | Go dependencies: Add `client-go` and `k8s.io/api` | backend-agent | `go.mod`, `go.sum` | done | Verified `go get` & `go mod tidy` |
| 11 | Resend Email HTTP API adapter | backend-agent | `internal/adapters/email/resend/client.go` | done | Completed & tested |
| 12 | Real k3s Kubernetes provider via `client-go` | backend-agent | `internal/adapters/provider/k3s/provider.go` | done | Completed & tested |
| 13 | Tarball build (`nerdctl`/`docker`) & push deploy pipeline | backend-agent | `internal/application/deploy/pipeline.go` | done | Completed |
| 14 | Pod container log streaming SSE handler | backend-agent | `internal/adapters/http/web/v1/app_handler.go` | done | Completed |
| 15 | Verification: `crank test` and `crank build` | main-agent | project root | done | Verified `crank test` & `crank build` |

## Done Log

- 2026-07-29 — Completed Landing Page components (Navbar, Hero, TerminalDemo, Architecture, Features, Footer).
- 2026-07-29 — Completed Dashboard UI (AppCard, LogViewer streaming terminal, ShareModal, DeploySimulatorModal, Dashboard, AppDetail).
- 2026-07-29 — Completed Auth UI & Mock API fallback layer (Login card with Magic Link & Agent Token generator, AuthCallback, AuthContext, AppShell header & sidebar).
- 2026-07-29 — Reconciled App.tsx routing and verified clean production build (`npm run check` & `npm run build` succeeded with code 0).
- 2026-07-29 — Executed `crank make swag` to generate OpenAPI / Swagger documentation (`docs/docs.go`, `docs/swagger.json`, `docs/swagger.yaml`).
- 2026-07-29 — Integrated Go Echo backend & React Vite frontend (`web.ServeViews`, embedded dist, proxy configuration) and verified with `crank build` & `crank test`.
- 2026-07-29 — Integrated Orval with Bun (`bun add axios @tanstack/react-query -D orval`), configured `orval.config.ts` and `src/lib/mutator.ts`, generated API hooks into `src/lib/generated/api.ts`, and wrapped app with `QueryClientProvider`.
- 2026-07-29 — Implemented real backend functionality: added `client-go`, `k8s.io/api`, and `apimachinery` dependencies, implemented real Resend HTTP API client, built real k3s provider with fake/simulated fallback, tarball OCI build/push pipeline, safe async upload handling, k3s pod log SSE streaming, and verified clean build with `crank test` and `crank build`.


