# Overview Plan: Agni — MCP-First App Hosting Platform (v1)

- Status: Approved
- Slug: `edge-mcp-v1`
- Form: Full
- Author: Gemini 3.6 Flash / 2026-07-29
- Date: 2026-07-29

## 1. Request & Problem

AI coding assistants like Claude Code, Cursor, and Windsurf generate web applications quickly, but developers lack a simple, neutral deployment target to publish their apps instantly. Traditional cloud platforms (AWS, GCP) involve heavy IAM configuration, and existing PaaS offerings (Vercel, Railway) lack direct agent-native protocol bindings or open VM hardware isolation.

**Agni** provides a zero-lock-in, neutral deploy target for open agents. A single MCP tool call (`deploy({ path })`) packages, builds, provisions TLS, and deploys an application onto a k3s cluster with Kata Containers + Firecracker microVM isolation.

## 2. Goals & Non-Goals

- **Goals:**
  - Build a high-end, responsive, animated React frontend SPA (`views/`) including Landing Page, Magic Link Auth, and Vercel/Railway-grade Dashboard.
  - Implement Go backend (`cmd/server`) with clean DDD + Hexagonal architecture for `app` and `sharelink` aggregates.
  - Implement k3s provider adapter with Kata Containers (`kata-fc` microVMs), Ingress-NGINX routing, and `cert-manager` TLS.
  - Deliver `agni-mcp` TypeScript package providing `deploy({ path })` and `share({ appId, email })` tools.
- **Non-goals (v1):**
  - Custom domain CNAME routing (subdomains `*.agni.dev` only).
  - Multi-tenant organization roles or billing meters.
  - Temporal workflow orchestration (in-memory pipeline for v1).

## 3. Product Features

- **User Stories:**
  - *As an AI Agent*, I want to call `deploy({ path: "./my-app" })` via MCP so that my generated app receives a live TLS URL instantly.
  - *As an App Developer*, I want to log into `agni.dev` via Magic Link so I can monitor microVM health, inspect logs, and manage share permissions.
  - *As a Recipient*, I want to click a share link sent to my email so I can access a protected staging app without account registration.

- **Key Features:**
  - **Animated Dark-Obsidian Landing Page:** Featuring agent deploy simulator, interactive architecture pipeline diagram, and MCP configuration guide.
  - **Vercel/Railway Dashboard:** Real-time microVM status pills (LIVE, BUILDING, FAILED), Kata/Firecracker runtime tags, live streaming container log viewer, and metrics.
  - **Magic-Link & Agent Token Auth:** Passwordless email login for humans + long-lived JWT token generator for AI agents.
  - **Kata + Firecracker MicroVM Isolation:** Pod execution with dedicated guest kernels for hardware-grade security.

## 4. Engineering Overview

- **Rough Approach:**
  - **Frontend (`views/`):** React 19 + Vite SPA built with Tailwind CSS, Lucide icons, and Radix UI components. Includes an in-memory/localStorage mock API layer for offline interactivity.
  - **Backend (`internal/`):** Go Echo HTTP server utilizing GORM + SQLite, client-go for k3s cluster orchestration, and Resend for transactional emails.
  - **Deploy Pipeline:** Agent sends tarball $\rightarrow$ server executes `nerdctl build` $\rightarrow$ pushes to in-cluster registry $\rightarrow$ applies Pod (`kata-fc`), Service, and Ingress manifests.

- **Affected Areas:**
  - `views/` (React SPA)
  - `internal/domain/app/`, `internal/domain/sharelink/`
  - `internal/adapters/persistence/gorm/`
  - `internal/adapters/provider/k3s/`
  - `internal/adapters/http/web/v1/`
  - `cmd/server/main.go`

## 5. Risks & Unknowns

- **k3s & Kata Setup Dependency:** Host machine must have KVM enabled and run `scripts/agni-host-setup.sh`.
- **Mitigation:** Fallback mock data layer in frontend for standalone development; containerized tests for backend.

## 6. Review

- Approval: [x] Approved by user (2026-07-29)
