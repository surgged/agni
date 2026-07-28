# Architecture: DDD + CQRS + Hexagonal

This backend is a domain-driven, ports-and-adapters (hexagonal) design with CQRS
application handlers. Understanding the boundaries is the single most important
thing for producing correct changes.

## Package map

```
cmd/
  server/main.go        composition root: builds the whole object graph, starts Echo + Temporal worker + outbox
  worker/main.go        standalone Temporal worker
internal/
  domain/<agg>/         aggregates, value objects, events, repository INTERFACE, sentinel errors
  application/<agg>/    CQRS handlers (use cases): commands.go, queries.go, command_handler.go, query_handler.go
  application/uow/       UnitOfWork + TxRepositories ports (live here because expressed in domain terms)
  ports/                cross-cutting interfaces: Cache, TokenService, EventBus, Tracer, ScopeChecker, WorkflowExecutor, …
  adapters/
    http/web/           Echo server, binder, error handler; v1/ handlers; middleware/
    persistence/gorm/   GORM repository implementations + DB setup
    persistence/memory/ in-memory repos for tests/local
    cache/redis/        go-redis client + ports.Cache impl
    telemetry/          OTel tracer provider
    temporal/           Temporal client, worker, workflows, activities, WorkflowExecutor
    outbox/             GormUoW (transactional outbox) + outbox worker
    eventbus/           in-memory EventBus
  config/               Config struct + Load() (Viper + godotenv + caarlos0/env)
  validator/            go-playground/validator wrapper + structured ValidationError
pkg/
  logging/              slog logger stack (JSON → redaction → context handlers)
  helpers/              small Echo helpers (helpers.Ctx(c))
db/migrations/          golang-migrate style up/down SQL pairs
configs/config.yaml     non-secret defaults read by Viper
```

## The dependency rule

Dependencies point **inward**. Outer layers know about inner layers, never the reverse.

- `domain` imports nothing from the project except `domain/shared`.
- `application` imports `domain` + `application/uow`. Never an adapter, never a framework.
- `ports` imports only stdlib/domain types.
- `adapters` import `application`, `domain`, `ports`, and their framework.
- `cmd` imports everything and wires it together.

Quick self-test: if a file under `internal/domain` or `internal/application`
imports `gorm.io/...`, `github.com/labstack/echo/...`, `github.com/redis/...`, or
`go.temporal.io/...`, the layering is broken. Fix the design, don't add the import.

## Why aggregates stay framework-free

The domain aggregate (e.g. `internal/domain/user/user.go`) carries `gorm:"column:..."`
tags for column mapping but **no** `json:` or `validate:` tags. HTTP DTOs own those.
This keeps one aggregate usable by many adapters and prevents transport concerns
from leaking into business rules. When you need JSON in/out, define a DTO in the
`v1` package and map to/from application commands.

## The composition root (`cmd/server/main.go`)

There is no DI framework. Everything is wired by hand, top to bottom:

1. `config.Load()` → `logging.New(...)` → `slog.SetDefault(...)`.
2. Open infra: `gorm.NewDB`, `telemetry.NewProvider`, `redisclient.NewClient`,
   `qdrantclient.NewClient`, `temporal.NewClient`. Infra that is optional in dev
   (redis, qdrant, temporal) logs a warning and continues as `nil` on failure.
3. Build the event bus, outbox repo, UoW, token service.
4. Per resource: `repo := gorm.New<X>Repository(db)` →
   `cmd := <x>app.NewCommandHandler(repo, uow, …)` →
   `qry := <x>app.NewQueryHandler(repo)` →
   `handler := v1.New<X>Handler(cmd, qry, userRepo)`.
5. `e := web.NewServer(logger)`, attach middleware (`Recover`, `RequestLogger`,
   `CORS`, `Tracing`), mount Swagger + `/health`, then `v1.Mount(e, v1.MountConfig{...})`.
6. Start the outbox worker goroutine, then `echo.StartConfig{...}.Start(ctx, e)`
   with graceful shutdown wired to `signal.NotifyContext`.

When you add a resource, you add: a `MountConfig` field, a `Mount` registration,
and a construction block in `main.go`. Keep the ordering consistent with the
neighbours.

## Domain events, Unit of Work, and the transactional outbox

This is the atomicity backbone. Follow it exactly for any write.

- An aggregate records events internally (`recordEvent`) during state changes and
  exposes them via `PullEvents()` (which also clears the buffer).
- A command handler does: load/construct aggregate → mutate → then
  `uow.SaveAndPublish(ctx, save, aggregate.PullEvents())`.
- `save` is a closure `func(ctx, repos uow.TxRepositories) error` — it fetches a
  **transaction-scoped** repository from `repos` (e.g. `repos.Users()`), so the
  write joins the same DB transaction as the outbox append.
- The `GormUoW` (`internal/adapters/outbox/gorm_uow.go`) opens a GORM transaction,
  runs `save`, then encodes each event (`shared.EncodeEvent`) and appends it to
  the `outbox_events` table — all in one commit.
- A background outbox worker polls the table and republishes events to the
  `EventBus`; subscribers (e.g. the audit logger) react. This gives at-least-once
  delivery without dual-write races.

Consequence: never publish domain events by hand from a handler, and never write
an aggregate outside the UoW closure when it also emits events. Read-only queries
use the plain repository directly (no UoW).

## Ports you will commonly implement or depend on

- `ports.Cache` — key/value store (redis impl is nil-safe).
- `ports.TokenService` — JWT issue/verify; `Subject(token)` used by auth middleware.
- `ports.EventBus` — publish/subscribe domain events.
- `ports.ScopeChecker` — `UserOwns<X>(ctx, userID, id)` ownership checks for IDOR safety.
- `ports.WorkflowExecutor` — kicks off Temporal workflows from a command handler.
- `ports.Tracer` — tracing seam (OTel-backed).

Add a compile-time assertion (`var _ ports.X = (*Impl)(nil)`) in every adapter
that implements a port.
