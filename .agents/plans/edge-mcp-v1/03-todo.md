# Todo Tracker: Agni — MCP-First App Hosting Platform (v1)

- Status: In progress
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

## Done Log

- 2026-07-29 — Completed Landing Page components (Navbar, Hero, TerminalDemo, Architecture, Features, Footer).
- 2026-07-29 — Completed Dashboard UI (AppCard, LogViewer streaming terminal, ShareModal, DeploySimulatorModal, Dashboard, AppDetail).
- 2026-07-29 — Completed Auth UI & Mock API fallback layer (Login card with Magic Link & Agent Token generator, AuthCallback, AuthContext, AppShell header & sidebar).
- 2026-07-29 — Reconciled App.tsx routing and verified clean production build (`npm run check` & `npm run build` succeeded with code 0).
- 2026-07-29 — Executed `crank make swag` to generate OpenAPI / Swagger documentation (`docs/docs.go`, `docs/swagger.json`, `docs/swagger.yaml`).
- 2026-07-29 — Integrated Go Echo backend & React Vite frontend (`web.ServeViews`, embedded dist, proxy configuration) and verified with `crank build` & `crank test`.
- 2026-07-29 — Integrated Orval with Bun (`bun add axios @tanstack/react-query -D orval`), configured `orval.config.ts` and `src/lib/mutator.ts`, generated API hooks into `src/lib/generated/api.ts`, and wrapped app with `QueryClientProvider`.
