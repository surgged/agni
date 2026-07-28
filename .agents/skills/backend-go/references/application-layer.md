# Application Layer (CQRS)

`internal/application/<agg>/` holds use cases, split by command (writes) and query
(reads). It depends only on domain ports and `application/uow` — never on an
adapter or a framework.

```
commands.go         plain request structs for writes (Create/Update/Delete)
queries.go          plain request structs for reads (Get/List/…)
command_handler.go  CommandHandler: mutates aggregates, persists via the UnitOfWork
query_handler.go    QueryHandler: reads aggregates via the repository
```

## Commands and queries are dumb structs

They are the application's input contract, decoupled from HTTP. IDs are typically
stringly-typed here and parsed to `uuid.UUID` inside the handler, so the transport
layer doesn't need to know about UUIDs.

```go
type CreateUserCommand struct {
	ID       string
	Name     string
	Email    string
	Password string
}
type UpdateUserCommand struct{ ID, Name, Email string }
type DeleteUserCommand struct{ ID string }

type GetUserQuery struct{ ID string }
type ListUsersQuery struct{}
```

## CommandHandler

Constructed with the domain `Repository` and a `uow.UnitOfWork` (plus any extra
ports, e.g. a `WorkflowExecutor` or related repos for provisioning resources).

Every write follows the same shape:

1. Log start with `slog.InfoContext`.
2. Parse/validate inputs (`uuid.Parse`), wrapping errors with context.
3. Load (`repo.Get`) or construct (`domain.New…`) the aggregate.
4. Mutate through domain methods (`u.Update(...)`, `u.MarkDeleted()`).
5. Persist + publish atomically through the UoW, using a transaction-scoped repo.
6. Log success; return the aggregate (or `error`).

```go
func (h *CommandHandler) HandleCreate(ctx context.Context, cmd CreateUserCommand) (*user.User, error) {
	slog.InfoContext(ctx, "user create started", "user_id", cmd.ID)
	if cmd.ID == "" {
		cmd.ID = uuid.New().String()
	}
	id, err := uuid.Parse(cmd.ID)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	u, err := user.NewUser(id, cmd.Name, cmd.Email)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	if err := h.uow.SaveAndPublish(ctx, func(ctx context.Context, repos uow.TxRepositories) error {
		return repos.Users().Save(ctx, u)
	}, u.PullEvents()); err != nil {
		return nil, fmt.Errorf("save user: %w", err)
	}
	slog.InfoContext(ctx, "user created", "user_id", u.ID.String())
	return u, nil
}
```

Rules:
- **Always** route writes through `uow.SaveAndPublish` with `PullEvents()`. Do not
  call `repo.Save` + `bus.Publish` directly.
- Obtain the repo from the closure's `repos uow.TxRepositories` (e.g.
  `repos.Users()`), not from a field — that binds the write to the transaction.
- For update/delete, load with the handler's plain `repo` first (outside the tx is
  fine for the read), mutate, then run the UoW closure for the write.
- Propagate domain sentinels unwrapped when the handler is a thin passthrough
  (e.g. `return h.repo.Get(...)`), so `errors.Is(err, ErrXxxNotFound)` still works
  at the edge. When you wrap, use `%w` so `errors.Is` still traverses.

## QueryHandler

Read-only. Depends on just the repository (no UoW). Parse IDs, delegate, return.

```go
func (h *QueryHandler) HandleGet(ctx context.Context, q GetUserQuery) (*user.User, error) {
	id, err := uuid.Parse(q.ID)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	return h.repo.Get(ctx, id)
}

func (h *QueryHandler) HandleList(ctx context.Context, _ ListUsersQuery) ([]*user.User, error) {
	return h.repo.List(ctx)
}
```

## Handlers with side-effecting infrastructure

Resource verticals that provision cloud infra (instance, container, database, …)
take extra collaborators in their command handler, e.g.
`NewCommandHandler(repo, uow, temporalExecutor, bundleRepo, clusterRepo, environmentRepo)`.
The handler mutates the aggregate and persists via the UoW, then uses
`ports.WorkflowExecutor` to start a Temporal workflow. Keep the workflow kickoff
**after** a successful save so you never launch work for an unpersisted aggregate.

## What must NOT appear here

- No `echo`, `gorm`, `redis`, or `temporal` SDK imports.
- No HTTP status codes, no JSON marshalling.
- No SQL. Persistence details belong to the GORM adapter behind the repository port.
