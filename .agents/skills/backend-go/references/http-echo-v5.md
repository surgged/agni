# HTTP Layer — Echo v5

Handlers live in `internal/adapters/http/web/v1/`. **This project uses Echo v5
(`github.com/labstack/echo/v5`), not v4.** The API differs from v4 in ways that
break naive from-memory code. The rules below reflect v5 as used in this repo.

## Echo v5 API differences you MUST respect

- The handler context is a **pointer**: `func(c *echo.Context) error` — v5 uses
  `*echo.Context` (a struct), not the `echo.Context` interface from v4.
- Binder signature is `Bind(c *echo.Context, target any) error`.
- Get the underlying response writer via `echo.UnwrapResponse(c.Response())`
  (returns `(*echo.Response, error)`); read `.Status` and `.Size`, `.Committed`
  from it. There is no `c.Response().Status` shortcut like v4.
- Path params in tests are set with `c.SetPathValues(echo.PathValues{echo.PathValue{Name: "id", Value: "…"}})`.
- The error handler signature is `func(c *echo.Context, err error)`.
- Start the server with `echo.StartConfig{Address, HideBanner, HidePort, GracefulTimeout}.Start(ctx, e)`
  (context-aware, graceful) rather than `e.Start(addr)`.
- Routes are enumerated via `e.Router().Routes()` (each has `.Method` and `.Path`).
- Middleware `middleware` sub-package is `github.com/labstack/echo/v5/middleware`
  (imported as `echomw` in the composition root).

When in doubt about a v5 signature, grep the repo for the call — the existing
handlers and `server.go` are the source of truth, not general Echo tutorials.

## Server construction and the auto-validating binder

`web.NewServer` returns a configured `*echo.Echo`. It installs a custom binder
that runs struct validation automatically after binding, and a JSON error handler
that renders the standard `api.Error` envelope.

```go
type EchoBinder struct {
	DefaultBinder *echo.DefaultBinder
	Logger        *slog.Logger
}

func (b *EchoBinder) Bind(c *echo.Context, target any) error {
	if err := b.DefaultBinder.Bind(c, target); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return validator.Struct(target) // returns *validator.ValidationError on failure
}
```

Because the binder validates, **a successful `c.Bind(&dto)` means the DTO is
already valid** — do not re-run the validator in the handler. The central
`HTTPErrorHandler` turns a `*validator.ValidationError` into a 422 with per-field
`details`, and an `*echo.HTTPError` into its code; anything else becomes a 500.

## DTOs own transport tags

The `v1` package defines request/response DTOs with `json:` + `validate:` tags and
maps them to application commands/queries. The domain aggregate stays tag-free.

```go
type userDTO struct {
	ID    string `json:"id"    validate:"omitempty"`
	Name  string `json:"name"  validate:"required,min=2,max=100"`
	Email string `json:"email" validate:"required,email"`
}

func (d userDTO) toCreateCommand() appuser.CreateUserCommand {
	return appuser.CreateUserCommand{ID: d.ID, Name: d.Name, Email: d.Email}
}
func toUserDTO(u *user.User) userDTO {
	return userDTO{ID: u.ID.String(), Name: u.Name, Email: u.Email}
}
```

Common `validate` tags: `required`, `omitempty`, `email`, `uuid`, `min`/`max`,
`len`, `oneof=a b c`, `url`, `gt/gte/lt/lte`. These map to human messages in
`internal/validator/errors.go` — extend `humanMessage` if you add a new tag.

## Handler struct, constructor, Register

A handler depends only on application services (and `userRepo`/ScopeChecker for
ownership). It exposes `Register(g *echo.Group)` to attach its routes.

```go
type UserHandler struct {
	cmd *appuser.CommandHandler
	qry *appuser.QueryHandler
}

func NewUserHandler(cmd *appuser.CommandHandler, qry *appuser.QueryHandler) *UserHandler {
	return &UserHandler{cmd: cmd, qry: qry}
}

func (h *UserHandler) Register(g *echo.Group) {
	g.POST("", h.Create)
	g.GET("/:id", h.Get)
	g.PUT("/:id", h.Update)
	g.DELETE("/:id", h.Delete)
}
```

## Handler method shape

Get `ctx` from `helpers.Ctx(c)` (= `c.Request().Context()`), bind, call the
application service, map domain sentinels to status codes, log, and render.

```go
func (h *UserHandler) Create(c *echo.Context) error {
	ctx := helpers.Ctx(c)
	var in userDTO
	if err := c.Bind(&in); err != nil {
		return c.JSON(http.StatusBadRequest, api.Error{Error: err.Error()})
	}
	out, err := h.cmd.HandleCreate(ctx, in.toCreateCommand())
	if errors.Is(err, user.ErrUserNotFound) {
		return c.JSON(http.StatusNotFound, api.Error{Error: "user not found"})
	}
	if err != nil {
		slog.ErrorContext(ctx, "user create failed", "error", err)
		return c.JSON(http.StatusUnprocessableEntity, api.Error{Error: err.Error()})
	}
	slog.InfoContext(ctx, "user created", "user_id", out.ID.String())
	return c.JSON(http.StatusCreated, toUserDTO(out))
}
```

Status-code conventions: `201` create, `200` get/update/list, `204` delete,
`400` bad input/parse, `401` unauthenticated, `404` not found (and for
ownership failures), `422` validation/business-rule failure, `500` unhandled.

## AuthN and ownership (IDOR safety)

Routes are grouped with the JWT middleware, which validates the Bearer token and
stores the subject under `user_id`:

```go
g := v1.Group("/users", middleware.JWTAuth(cfg.Tokens))
```

In the handler, read the principal and enforce ownership before touching the
resource. On mismatch return **404**, not 403 — never reveal that another user's
resource exists:

```go
userID, ok := c.Get("user_id").(string)
if !ok || userID == "" {
	return c.JSON(http.StatusUnauthorized, api.Error{Error: "unauthenticated"})
}
if c.Param("id") != userID { // or scopeChecker.UserOwnsX(ctx, userID, id)
	return c.JSON(http.StatusNotFound, api.Error{Error: "user not found"})
}
```

For nested resources, inject the `ScopeChecker` (the `userRepo` implements it) and
call `UserOwns<X>(ctx, userID, id)`.

## Wiring routes

Add a field to `MountConfig` (near the `// crank:http-fields` marker) and a group
registration in `Mount` (near `// crank:http-register`) in
`internal/adapters/http/web/v1/routes.go`. Then construct the handler and pass it
in the `v1.MountConfig{...}` literal in `cmd/server/main.go`. Do not hand-edit
inside `// crank:*` marker blocks that are described as injected.

## Swagger / OpenAPI

Annotate each handler method with `godoc` comments (`@Summary`, `@Tags`, `@Param`,
`@Success`, `@Failure`, `@Security BearerAuth`, `@Router`). Regenerate docs with
`crank swag` (never hand-edit `docs/`). The top-level API metadata + security
scheme live as comments above `main()`.

## Middleware

Custom middleware lives in `internal/adapters/http/web/middleware/` and returns an
`echo.MiddlewareFunc`. Existing: `JWTAuth`, `RequestLogger` (request id + latency
logging), `Tracing` (OTel span per request). Stock middleware (`Recover`, `CORS`)
comes from `echomw`. Order in `main.go`: `Recover` → `RequestLogger` → `CORS` →
`Tracing`. Keep new cross-cutting concerns as middleware, not per-handler code.
