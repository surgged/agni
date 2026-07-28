---
name: backend-go
description: Write, extend, and review Go backend code in this repository's DDD + CQRS + hexagonal architecture. Use for any work touching HTTP handlers (Echo v5), GORM/Postgres persistence, domain aggregates, application command/query handlers, config (Viper + godotenv + caarlos0/env), Redis cache, OpenTelemetry tracing, slog logging, validation, the transactional outbox/Unit-of-Work, or table-driven tests with testify + go.uber.org/mock. Apply it when adding a feature, wiring a new resource, fixing a bug, or reviewing a PR in the Go backend.
---

# Backend Go (Echo v5 · GORM · DDD/CQRS)

Authoritative playbook for backend Go work in this repo. It encodes the layering
rules, the idiomatic use of each library (Echo v5, GORM, Viper/godotenv/caarlos0-env,
go-redis, OpenTelemetry, log/slog, go-playground/validator, gomock), and a
definition-of-done you must satisfy before claiming a task is complete.

Ground every change in the conventions below. When a detail is not covered here,
read the matching reference file rather than guessing — the API surface of some
of these libraries (especially **Echo v5**, which is not Echo v4) is easy to get
wrong from memory.

## When to use this skill

Use it for any task that touches the Go backend: adding or changing an HTTP
endpoint, a domain aggregate, an application handler, a repository, a migration,
config, middleware, caching, tracing, or tests — and for reviewing such changes.

## First, orient yourself

1. Confirm the stack with `cat .crank.yaml` and skim `go.mod`. This is a
   `crank`-generated project; prefer the system `crank` CLI for scaffolding,
   migrations, tests, and Swagger (see `AGENTS.md`). Never invoke `./crank`.
2. Find the closest existing example of what you're building and mirror it. The
   `user`, `organization`, and `region` verticals are the cleanest end-to-end
   references (domain → application → gorm → http → tests).
3. Only then write code. Consistency with the existing vertical beats novelty.

## The layering law (never violate)

```
domain  ←  application  ←  adapters (http, gorm, redis, temporal, …)
   ↑             ↑
 ports (interfaces)  ──────────┘
```

- **`internal/domain/<agg>`** — pure Go aggregates, value objects, domain events,
  and the repository *interface*. No imports of GORM, Echo, JSON tags, validation
  tags, or any framework. The only struct tags allowed are `gorm:"..."` column
  mappings on the aggregate (the repo keeps aggregates tag-light; DTOs live
  elsewhere).
- **`internal/application/<agg>`** — CQRS command/query handlers (use cases).
  Depends only on domain ports + `application/uow`. Never imports an adapter.
- **`internal/ports`** — cross-cutting interfaces (Cache, TokenService, Tracer,
  EventBus, ScopeChecker, WorkflowExecutor, …). Adapters implement them.
- **`internal/adapters/**`** — the only place framework code lives (Echo, GORM,
  go-redis, Temporal, OTel). Adapters translate between the outside world and
  domain/application types via their own DTOs.
- **`cmd/server/main.go`** — the composition root. All wiring is explicit and
  manual here (no DI container). New handlers get constructed and mounted here.

Dependencies point inward only. If you find yourself importing `gorm` or `echo`
from `internal/application` or `internal/domain`, stop — the design is wrong.

## Golden rules (apply to every change)

1. **Context first.** Every function that does I/O takes `ctx context.Context` as
   its first parameter and threads it through (DB calls use `db.WithContext(ctx)`,
   Redis calls pass `ctx`, logs use `slog.*Context`). Never use `context.TODO()`
   in request paths.
2. **Errors wrap, sentinels compare.** Wrap with `fmt.Errorf("doing x: %w", err)`.
   Define sentinel errors (`ErrUserNotFound`) in the domain and compare with
   `errors.Is`. Adapters map infra errors (e.g. `gorm.ErrRecordNotFound`) to
   domain sentinels; handlers map domain sentinels to HTTP status codes.
3. **DTOs at the edges.** HTTP request/response structs carry `json:` + `validate:`
   tags and live in the `v1` package. Convert DTO ↔ application command/query;
   never bind JSON straight onto a domain aggregate.
4. **Structured logging only.** Use `log/slog` with `*Context` variants and
   key/value attrs (`slog.InfoContext(ctx, "user created", "user_id", id)`).
   Never `fmt.Println`, never log secrets.
5. **Writes go through the Unit of Work.** Command handlers mutate an aggregate,
   pull its events, and call `uow.SaveAndPublish(...)` so the row write and the
   outbox event commit atomically. Don't call `repo.Save` + `bus.Publish`
   directly from a handler.
6. **Secrets come from the environment.** Non-secret config lives in
   `configs/config.yaml` (Viper); secret fields carry an `env:"..."` tag and are
   overlaid from `.env`/env via `caarlos0/env`. Never hardcode or commit secrets,
   never put a secret in the YAML.
7. **Ownership is enforced.** Resource endpoints check the caller owns the
   resource (via `ports.ScopeChecker`) and return the domain `NotFound` (404) on
   a false result — never leak existence of another user's resource (IDOR).
8. **Compile-time interface assertions.** Add `var _ ports.Cache = (*RedisCache)(nil)`
   style guards so an adapter that drifts from its port fails to build.

## Standard workflow to add a resource vertical

Prefer `crank make scaffold <Name> <field:type>...` to generate the whole vertical,
then adjust. If doing it by hand, create in this order (see reference files):

1. **Migration** — `crank make migration create_<things>`, then edit the up/down
   SQL. See `references/persistence-gorm.md`.
2. **Domain** — aggregate + constructor with invariants, value objects, events,
   sentinel errors, and the `Repository` interface with a `//go:generate mockgen`
   directive. See `references/domain-layer.md`.
3. **Application** — `commands.go`, `queries.go`, `command_handler.go`,
   `query_handler.go`. See `references/application-layer.md`.
4. **GORM adapter** — repository implementing the domain interface, mapping
   `gorm.ErrRecordNotFound` → domain sentinel. See `references/persistence-gorm.md`.
5. **HTTP handler** — DTO, `New…Handler`, `Register(g *echo.Group)`, one method
   per route with Swagger godoc comments. See `references/http-echo-v5.md`.
6. **Wire it up** — add a field to `MountConfig`, register the group in `Mount`,
   and construct the handler in `cmd/server/main.go`.
7. **Tests** — handler tests with `gomock` + `httptest`; domain tests for
   invariants. See `references/testing.md`.
8. **Regenerate** — `go generate ./...` (mocks) and `crank swag` (docs) if the API
   surface changed. Then `crank gofmt`, `crank vet`, `crank test`.

## Reference files (read the relevant one before editing)

- `references/architecture.md` — layer boundaries, dependency rules, composition root, outbox/UoW.
- `references/domain-layer.md` — aggregates, value objects, domain events, repository ports.
- `references/application-layer.md` — CQRS commands/queries/handlers, UnitOfWork usage.
- `references/http-echo-v5.md` — Echo **v5** handlers, DTOs, binder+validation, error handling, routing, middleware, Swagger.
- `references/persistence-gorm.md` — GORM repositories, connection setup, error mapping, migrations, transactions.
- `references/config-and-secrets.md` — Viper + godotenv + caarlos0/env layering; adding a config block.
- `references/observability.md` — slog logging stack, OTel tracing, request logging, redaction.
- `references/cache-redis.md` — go-redis client + `ports.Cache`, nil-safety, key/TTL conventions.
- `references/testing.md` — table-driven tests, testify, gomock (`go.uber.org/mock`), httptest, DB-dependent tests.

## Evals — check your work before finishing

Before declaring done, self-review against `evals/checklist.md` (a hard rubric)
and, for larger tasks, walk the `evals/scenarios.md` worked examples. Then run:

```bash
crank gofmt && crank vet && crank test
```

Report exactly which of these you ran and their result. Do not claim validation
passed unless you saw it pass. If a live Postgres is unavailable, GORM repo tests
will skip/fail on connection — say so explicitly rather than hiding it.
