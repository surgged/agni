# Testing

Tests use **testify** (`assert`/`require`) and **`go.uber.org/mock`** (gomock, the
maintained successor to `github.com/golang/mock`). Prefer table-driven tests. Every
layer except the GORM repository is tested against mocked ports — no DB required.

## Commands

```bash
crank test                                             # all
go test ./internal/domain/user                         # one package
go test -run TestName -v -count=1 ./internal/application/user   # one test, no cache
go generate ./...                                      # regenerate mocks after changing an interface
```

`-count=1` disables the test cache when you need a real re-run.

## Mocks

- Interfaces carry a `//go:generate mockgen -destination=../../mocks/mock_x.go -package=mocks ...`
  directive. All mocks live in the single `internal/mocks` package (`mocks`),
  never scattered next to the interface.
- Regenerate with `go generate ./...` after changing any mocked interface. Do not
  hand-edit generated mock files.
- Construct in tests as `mocks.NewMockUserRepository(ctrl)`,
  `mocks.NewMockUnitOfWork(ctrl)`, etc.

## gomock skeleton

```go
func TestX(t *testing.T) {
	ctrl := gomock.NewController(t)
	t.Cleanup(ctrl.Finish)

	repo := mocks.NewMockOrganizationRepository(ctrl)
	uow := mocks.NewMockUnitOfWork(ctrl)
	uow.EXPECT().SaveAndPublish(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil).AnyTimes()

	cmd := appOrganization.NewCommandHandler(repo, uow)
	qry := appOrganization.NewQueryHandler(repo)
	h := NewOrganizationHandler(cmd, qry)
	// ...
}
```

- Set expectations with `.EXPECT()`; match args with `gomock.Any()` or concrete
  values; control call count with `.Times(n)` / `.AnyTimes()`; stub returns with
  `.Return(...)`.
- Because the `UnitOfWork.SaveAndPublish` takes a closure, tests usually stub it to
  `Return(nil)` rather than executing the closure. When you need the closure's
  effects, provide a fake UoW that invokes `save` with a `TxRepositories` backed by
  mocks (or use the in-memory UoW at `internal/adapters/uow/in_memory_uow.go`).

## HTTP handler tests (Echo v5 + httptest)

Build a test Echo with the validating binder, create a context with `httptest`,
inject the authenticated principal via `c.Set("user_id", ...)`, set path params via
`SetPath` + `SetPathValues`, call the handler method directly, and assert on the
recorder.

```go
func newTestEcho() *echo.Echo {
	e := echo.New()
	e.Binder = &web.EchoBinder{DefaultBinder: new(echo.DefaultBinder)}
	return e
}

func TestHandler_CreateAndGet(t *testing.T) {
	// ... construct handler with mocked repo + uow ...
	e := newTestEcho()

	body, _ := json.Marshal(sampleDTO())
	req := httptest.NewRequest(http.MethodPost, "/organizations", bytes.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/organizations")
	c.Set("user_id", "123e4567-e89b-12d3-a456-426614174001")
	require.NoError(t, h.Create(c))
	assert.Equal(t, http.StatusCreated, rec.Code)

	repo.EXPECT().Get(gomock.Any(), id, gomock.Any()).Return(seed, nil)
	getRec := httptest.NewRecorder()
	gc := e.NewContext(httptest.NewRequest(http.MethodGet, "/", nil), getRec)
	gc.SetPath("/organizations/:id")
	gc.SetPathValues(echo.PathValues{echo.PathValue{Name: "id", Value: id.String()}})
	gc.Set("user_id", "123e4567-e89b-12d3-a456-426614174001")
	require.NoError(t, h.Get(gc))
	assert.Equal(t, http.StatusOK, getRec.Code)
}
```

Also useful: assert routes are registered via `e.Router().Routes()` after
`h.Register(g)`. Test the not-found path by stubbing the repo to return the domain
sentinel and asserting a `404`.

## Domain & value-object tests

Pure and fast — no mocks. Assert constructor invariants (empty name/email → the
right sentinel), value-object validation (`NewEmail`), event recording
(`PullEvents` returns the expected events then empties), and behaviour methods.

## GORM repository tests

CRUD needs a live Postgres, so committed repo tests generally only assert the
constructor is non-nil (`assert.NotNil(t, NewXRepository(nil))`). For logic that
must exercise storage, use the in-memory repository or a mocked domain interface.
If you write true integration tests, guard them so they clearly skip/fail with a
connection error when no DB is present, and say so in your results.

## Conventions

- `require` for preconditions that must hold to continue; `assert` for the actual
  checks. Use `t.Helper()` in test helpers and `t.Cleanup` for teardown.
- Use fixed UUIDs (`uuid.MustParse("123e4567-...")`) for deterministic assertions.
- Name tests `TestType_Scenario`; keep one behaviour per case in table rows.
- After changing code, run `crank gofmt && crank vet && crank test` and report the
  outcome honestly.
