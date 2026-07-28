# Persistence — GORM + Postgres

Repository implementations live in `internal/adapters/persistence/gorm/`. Each
implements a domain `Repository` interface and is the **only** place SQL/GORM
appears for that aggregate.

## Connection setup

`gorm.NewDB(cfg config.DatabaseConfig)` opens Postgres via `gorm.io/driver/postgres`,
tunes the pool, and pings. Note `SkipDefaultTransaction: true` (we manage
transactions explicitly through the UoW) and the pool limits.

```go
db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{SkipDefaultTransaction: true})
// ...
sqlDB, _ := db.DB()
sqlDB.SetMaxOpenConns(20)
sqlDB.SetMaxIdleConns(5)
sqlDB.SetConnMaxLifetime(30 * time.Minute)
if err := sqlDB.Ping(); err != nil { /* close + wrap */ }
```

The DSN is built by `DatabaseConfig.DSN()`; the password is a secret from `.env`.

## Repository implementation

- Constructor takes `*gorm.DB` and returns the concrete type.
- **Always** scope queries with `.WithContext(ctx)` so cancellation, deadlines,
  and tracing propagate.
- **Map `gorm.ErrRecordNotFound` → the domain sentinel** with `errors.Is`. Callers
  depend on this.
- For deletes, treat `RowsAffected == 0` as not-found.
- Add a compile-time interface assertion when the repo also satisfies a port
  (e.g. `var _ ports.ScopeChecker = (*UserRepository)(nil)`).
- Log at `Debug` for successful reads/writes and `Error` on failures, with a
  `"table"` attr.

```go
func NewUserRepository(db *gorm.DB) *UserRepository { return &UserRepository{db: db} }

func (r *UserRepository) Save(ctx context.Context, u *user.User) error {
	return r.db.WithContext(ctx).Save(u).Error
}

func (r *UserRepository) Get(ctx context.Context, id uuid.UUID) (*user.User, error) {
	row := new(user.User)
	err := r.db.WithContext(ctx).Where("id = ?", id).First(row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, user.ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return row, nil
}

func (r *UserRepository) List(ctx context.Context) ([]*user.User, error) {
	var rows []*user.User
	if err := r.db.WithContext(ctx).Order("id ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *UserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	res := r.db.WithContext(ctx).Where("id = ?", id).Delete(&user.User{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return user.ErrUserNotFound
	}
	return nil
}
```

## Query guidance

- Prefer parameterized queries (`?` placeholders) — GORM parameterizes for you.
  When you must drop to `Raw`, still use `?` placeholders; never `fmt.Sprintf`
  values into SQL (injection risk).
- Ownership checks are single-query joins that walk FKs up to the user; return a
  `COUNT(*) > 0` boolean. See the `UserOwns…` methods on `UserRepository`.
- `Save` performs upsert semantics on the primary key. Use `First`/`Find` with
  explicit `Where`. Order lists deterministically (`Order("id ASC")`) so tests and
  pagination are stable.
- Persistence maps rows directly onto the aggregate struct via its `gorm:` column
  tags and `TableName()`. If an aggregate needs different in-DB representation than
  its domain shape, introduce a separate persistence model struct and map — do not
  add transport concerns to the aggregate.

## Transactions and the Unit of Work

Do not open ad-hoc transactions in a repository for multi-aggregate writes. The
`GormUoW` (`internal/adapters/outbox/gorm_uow.go`) owns the transaction: it runs
`db.WithContext(ctx).Transaction(func(tx *gorm.DB) error { ... })`, hands the
closure transaction-scoped repos (`gormadapter.NewUserRepository(tx)`), and appends
the outbox event rows in the same commit. A repository method just needs to accept
whatever `*gorm.DB` it's constructed with (the `tx` inside a transaction, or the
root `db` outside).

## Migrations

- Golang-migrate style up/down pairs in `db/migrations/`. Create with
  `crank make migration create_<things>` (generates the timestamped pair), then
  edit the SQL. Apply with `crank migrate up`.
- Every up must have a real down (drop table / drop column) — keep them reversible.
- Match the aggregate's `gorm:` tags: `id UUID PRIMARY KEY`, `created_at`/`updated_at`
  as `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`, `NOT NULL`/`UNIQUE` where the
  domain requires it. Use `CREATE TABLE IF NOT EXISTS`.
- Postgres must be running before migrating or starting the server.

```sql
-- up
CREATE TABLE IF NOT EXISTS things (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    name TEXT NOT NULL
);
-- down
DROP TABLE IF EXISTS things;
```

## Testing repositories

GORM repo CRUD needs a live database. The repo test files here typically only
assert the constructor is non-nil (`assert.NotNil(t, NewXRepository(nil))`) and
leave full CRUD to integration runs. Use the in-memory repo
(`internal/adapters/persistence/memory`) or gomock of the domain interface to test
handlers and application logic without a DB. See `references/testing.md`.
