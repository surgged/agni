# Eval Scenarios (Worked Examples)

Use these to sanity-check that a change follows the skill. Each scenario lists the
task, the correct sequence of touchpoints, and the traps that fail the eval. They
double as self-grading prompts: after implementing, confirm you hit every
"expected" bullet and avoided every "fail" bullet, then run the checklist in
`checklist.md`.

---

## Scenario 1 — Add a new resource vertical (`Widget`)

**Task:** expose CRUD for a `Widget { id, name, size }` owned by a user.

**Expected touchpoints (in order):**
1. `crank make migration create_widgets` → edit up/down SQL (`id UUID PK`,
   timestamps `TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`, `name TEXT NOT NULL`,
   `size INT NOT NULL`). `crank migrate up`.
2. `internal/domain/widget/`: `widget.go` (aggregate + `NewWidget` with invariants +
   events + `TableName`), `events.go` (`widget.created/updated/deleted`),
   `errors.go` (`ErrWidgetNotFound`, `ErrInvalidWidget`), `repository.go`
   (`Repository` interface + mockgen directive).
3. `internal/application/widget/`: `commands.go`, `queries.go`,
   `command_handler.go` (writes via `uow.SaveAndPublish` + `PullEvents`),
   `query_handler.go`.
4. `internal/adapters/persistence/gorm/widget_repository.go`: implements the
   interface, maps `gorm.ErrRecordNotFound` → `ErrWidgetNotFound`, `WithContext(ctx)`.
5. `internal/adapters/http/web/v1/widget_handler.go`: `widgetDTO` (json+validate),
   `NewWidgetHandler`, `Register`, methods with Swagger godoc, ownership check → 404.
6. `routes.go`: add `WidgetHandler` field to `MountConfig` + group registration in
   `Mount` under `JWTAuth`. `cmd/server/main.go`: construct repo→cmd→qry→handler and
   pass in `MountConfig{...}`.
7. Add `Widgets()` to `uow.TxRepositories` and the `GormUoW` if widgets are written
   inside multi-aggregate transactions.
8. Tests: domain invariants + handler happy/not-found. `go generate ./...`,
   `crank swag`, `crank gofmt && crank vet && crank test`.

**Fail conditions:** JSON/validate tags on the aggregate; handler calling
`repo.Save` directly; missing `ErrRecordNotFound` mapping; ownership mismatch
returning 403 instead of 404; forgetting to wire into `main.go`/`MountConfig`;
skipping mock regeneration; Echo v4 handler signature.

> Shortcut: `crank make scaffold Widget name:string size:int` generates most of
> this. Still review each layer against the references and add ownership + tests.

---

## Scenario 2 — Add a field to an existing aggregate

**Task:** add `description string` to `Project`.

**Expected:** migration `add_description_to_projects` (up: `ALTER TABLE ... ADD
COLUMN description TEXT NOT NULL DEFAULT ''`; down: `DROP COLUMN`); add the field +
`gorm:` tag to the aggregate and thread it through `NewProject`/`Update`; extend
the DTO (`json`+`validate`) and DTO↔command mappers; extend command/query structs
and handlers; update the gorm repo only if it maps columns manually; update tests
and `crank swag`.

**Fail conditions:** editing the aggregate but not the DTO/command (field silently
dropped); adding a `NOT NULL` column with no default over existing rows; forgetting
the down migration; not updating tests.

---

## Scenario 3 — Cache an expensive read

**Task:** cache `GetWidget` results in redis.

**Expected:** depend on `ports.Cache` (not `*redis.Client`) in the query handler or
a decorator; key like `widget:{id}`; on `Get` return the cached value when the
bool is true, else load from repo and `Set` with a TTL; pass `ctx` to every cache
call; tolerate a nil/absent cache (miss → fall through). Invalidate (`Del`) on
update/delete.

**Fail conditions:** importing go-redis above the adapter; treating a cache miss as
an error; caching without a TTL; not invalidating on writes; panicking when redis
is down instead of degrading.

---

## Scenario 4 — Long-running/provisioning action

**Task:** provisioning a `Widget` triggers external work.

**Expected:** command handler takes a `ports.WorkflowExecutor`; it mutates + saves
the aggregate via the UoW **first**, then starts the Temporal workflow; failures
are wrapped and logged with `slog.*Context`; the HTTP layer returns 202/200 with
the operation reference. Temporal SDK types stay in `internal/adapters/temporal`.

**Fail conditions:** launching the workflow before/without persisting; importing
`go.temporal.io/...` into application or domain; losing `ctx`.

---

## Scenario 5 — Reviewing a PR

Walk the diff against `checklist.md`. Flag, at minimum: layering violations
(framework imports inward), missing `ErrRecordNotFound`→sentinel mapping, writes
bypassing the UoW, ownership checks that 403 instead of 404, secrets in YAML/logs,
Echo v4 idioms, missing or stale Swagger, and absent tests. Prefer concrete,
line-anchored review comments that reference the relevant rule.
