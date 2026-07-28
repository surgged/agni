# Todo Tracker: User Deactivation

- Status: Done
- Slug: `user-deactivation`
- Linked engineering doc: `./02-engineering-doc.md`
- Last updated: 2026-07-22

Derived from the Phase 2 Execution Strategy. Update continuously during
implementation. Statuses: `todo` | `in-progress` | `done` | `blocked`.

## Task Board

| # | Task | Owner (agent) | Write scope | Status | Depends on | Link (commit/PR) |
|---|------|---------------|-------------|--------|------------|------------------|
| 1 | Migration 042 + event types | agent-A | `migration 042_*`, event definitions | done | - | a1b2c3 |
| 2 | Domain User + tests | agent-B | domain layer (user) | done | 1 | d4e5f6 |
| 3 | Persistence model + repo tests | agent-C | persistence layer (user) | done | 1 | 7g8h9i |
| 4 | Use cases + tests | agent-D | use-case layer (user) | done | 2 | j0k1l2 |
| 5 | API handlers | agent-E | API/transport layer (user) | done | 4 | m3n4o5 |
| 6 | Auth middleware cache | agent-F | auth middleware, config | done | 1 | p6q7r8 |
| 7 | Wire routes + bootstrap + regenerate + tidy | agent-A | choke-point files | done | 2–6 | s9t0u1 |

## Per-Agent Sections

> Each agent edited ONLY its own section and only files inside its write scope.
> Shared choke-point files were touched ONLY in Task 7 by agent-A.

### Agent: agent-A (pre + post)
- [x] Task 1 — migration + events
- [x] Task 7 — serial close-out (routes, bootstrap, regenerated code, tidy)
- Notes: ran the project's mock/codegen command once at the end; no contract
  changes so regeneration was a no-op but ran anyway to be safe.

### Agent: agent-B
- [x] Task 2 — domain `status`, `deactivate`, `reactivate`, invariant tests
- Notes: decided to return a domain error on double-deactivate; handler maps it
  to 204 per review decision.

### Agent: agent-C
- [x] Task 3 — persistence fields, index, repo round-trip test
- Notes: none.

### Agent: agent-D
- [x] Task 4 — use cases + tests
- Notes: consumed existing transaction and event-publisher abstractions unchanged.

### Agent: agent-E
- [x] Task 5 — two API handlers, request validation, error mapping
- Notes: route registration deferred to Task 7.

### Agent: agent-F
- [x] Task 6 — auth middleware cache for status
- Notes: cache TTL configurable via `auth.status_cache_ttl`.

## Newly Discovered Work

> Purely additive tasks land here without re-approval. Anything that changes
> Phase 1 goals or Phase 2 architecture goes back to that phase for re-approval
> BEFORE being added here.

- [x] Add metrics counter for cache hits/misses on auth status check
      (additive; added in commit v2w3x4).
- [ ] Follow-up: cancel in-flight background jobs on deactivation (logged as
      separate feature; out of scope here).

## Drift Check

> If you resumed work and the table above looked stale, you would reconstruct
> from recent commits + open PRs + working-tree status, update this file,
> THEN continue.

- Last reconciled against version control: 2026-07-22

## Done Log

- 2026-07-18 — Tasks 1–6 completed in parallel (agents A–F)
- 2026-07-19 — Task 7 serial close-out, PR #118 merged (agent-A)
- 2026-07-22 — additive cache metrics landed (agent-F)
