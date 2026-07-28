# Eval Checklist (Definition of Done)

Self-review every backend change against this rubric before declaring the task
complete. Treat any **must** you cannot satisfy as a blocker to call out, not to
silently skip. This is the acceptance test for the `backend-go` skill.

## Architecture & layering (must)

- [ ] `internal/domain/**` imports no framework (no gorm/echo/redis/temporal), no
      `json:`/`validate:` tags on aggregates.
- [ ] `internal/application/**` imports only domain + `application/uow`; no adapter,
      no framework, no SQL, no HTTP status codes.
- [ ] Framework code appears only under `internal/adapters/**`.
- [ ] Every new adapter that implements a port has a `var _ ports.X = (*Impl)(nil)`
      compile-time assertion.
- [ ] Dependencies point inward only; nothing inner imports something outer.

## Context, errors, logging (must)

- [ ] Every I/O function takes `ctx context.Context` first and threads it (DB uses
      `WithContext(ctx)`, redis passes `ctx`, logs use `slog.*Context`).
- [ ] Errors are wrapped with `fmt.Errorf("...: %w", err)`; domain misses are
      sentinels compared via `errors.Is`.
- [ ] The GORM adapter maps `gorm.ErrRecordNotFound` (and `RowsAffected == 0` on
      delete) to the domain `ErrXxxNotFound`.
- [ ] The HTTP handler maps domain sentinels to correct status codes (404 not
      found, 422 validation/business, 400 bad input, 401 unauthenticated).
- [ ] Logging is `log/slog` with `*Context` + key/value attrs; no `fmt.Print*`, no
      standard `log`, no secrets/tokens/passwords logged.

## Writes, events, UoW (must)

- [ ] Writes that emit events go through `uow.SaveAndPublish(ctx, save, agg.PullEvents())`.
- [ ] The `save` closure obtains its repo from `repos uow.TxRepositories`
      (transaction-scoped), not from a handler field.
- [ ] No hand-rolled `repo.Save` + `bus.Publish` in a handler; no ad-hoc
      transaction for a multi-aggregate write outside the UoW.
- [ ] Read-only paths use the plain repository (no UoW).

## HTTP / Echo v5 (must)

- [ ] Handlers use the **v5** signature `func(c *echo.Context) error` and v5 APIs
      (`echo.UnwrapResponse`, `SetPathValues`, `StartConfig`) — not Echo v4 patterns.
- [ ] Request/response DTOs live in the `v1` package with `json:`+`validate:` tags;
      no JSON is bound onto a domain aggregate.
- [ ] The handler does not re-run validation after `c.Bind` (the binder already did).
- [ ] Routes are registered via `Register(g *echo.Group)`, added to `MountConfig`
      and `Mount`, and the handler is constructed and passed in `cmd/server/main.go`.
- [ ] Protected routes are grouped under `middleware.JWTAuth`; ownership is enforced
      and a mismatch returns **404** (IDOR-safe), reading the principal from
      `c.Get("user_id")` / `ScopeChecker`.
- [ ] New/changed endpoints have Swagger godoc annotations; `crank swag` was run if
      the API surface changed (and `docs/` was not hand-edited).

## Config & secrets (must)

- [ ] New config has `mapstructure` tags; secret fields also have `env:"..."` tags.
- [ ] Defaults added in `setDefaults`; non-secret keys added to
      `configs/config.yaml`; the field added to the `Config` struct.
- [ ] No secret is hardcoded, committed, put in YAML, or logged.

## Persistence & migrations (should)

- [ ] Migration created via `crank make migration ...` with a real, reversible
      `down`; columns/constraints match the aggregate's `gorm:` tags.
- [ ] Queries are parameterized (`?`), never `fmt.Sprintf` into SQL.
- [ ] Lists are deterministically ordered.

## Tests (must)

- [ ] New behaviour has tests: domain invariants (pure), handler happy-path +
      not-found (gomock + httptest), application logic where meaningful.
- [ ] Mocks come from `internal/mocks` (regenerated via `go generate ./...` if an
      interface changed); no hand-editing generated files.
- [ ] `crank gofmt && crank vet && crank test` were run; results reported honestly.
      If a live DB is unavailable, GORM repo/integration tests are called out as
      skipped/failing rather than hidden.

## Hygiene (should)

- [ ] Change mirrors the closest existing vertical (user/organization/region) in
      structure and naming.
- [ ] No unrelated refactors or drive-by changes; diff is minimal and focused.
- [ ] `// crank:*` injected marker blocks were not hand-edited where the guide says
      they are generated.
