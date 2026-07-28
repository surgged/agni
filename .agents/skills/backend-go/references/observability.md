# Observability — slog logging + OpenTelemetry

## Structured logging with log/slog

The logger is built in `pkg/logging/logger.go` as a three-layer handler stack and
installed as the process default in `main.go`:

```
slog.JSONHandler → redactionHandler → ContextHandler
```

- **JSONHandler** emits structured JSON to stdout at the configured level.
- **redactionHandler** scrubs sensitive values before they're written.
- **ContextHandler** auto-injects `request_id` and `user_id` from the Go context
  into every record — so any `slog.*Context` call is enriched for free.

`main.go` does:

```go
logger := logging.New(logging.ParseLevel(cfg.Logging.Level), cfg.Logging.AddSource)
slog.SetDefault(logger)
```

### How to log

- Use the package-level `slog` functions with the **`*Context`** variants and pass
  `ctx` so request/user IDs attach automatically:
  `slog.InfoContext(ctx, "user created", "user_id", id)`.
- Message is a short, stable, lower-case phrase; everything else is key/value
  attrs. Never interpolate values into the message string.
- Levels: `Debug` for chatty internal detail (DB hits, cache hits/misses), `Info`
  for lifecycle/business events, `Warn` for recoverable/degraded conditions
  (optional dependency unavailable, client error), `Error` for failures needing
  attention.
- Never log secrets, tokens, passwords, or full request bodies. Do not use
  `fmt.Print*` or the standard `log` package.

### Request logging & IDs

`middleware.RequestLogger()` assigns/propagates an `X-Request-ID`, stores it on the
context via `logging.WithRequestID`, echoes it as a response header, and logs one
`request completed` line per request with method, path, status, latency,
client_ip, bytes_out. Status ≥500 logs at Error, ≥400 at Warn, else Info. Because
the id is on the context, all downstream `slog.*Context` calls carry it. Don't add
your own per-request logging that duplicates this.

### Context propagation helpers

`logging.WithRequestID(ctx, id)` / `WithUserID(ctx, id)` store IDs;
`RequestIDFromContext` / `UserIDFromContext` read them. The auth path stores the
principal so logs and traces correlate.

## Tracing with OpenTelemetry

- The tracer provider is created in `main.go` via
  `telemetry.NewProvider(ctx, telemetry.Config{ServiceName, Exporter})` and shut
  down gracefully on exit (`Shutdown` with a timeout).
- `middleware.Tracing(serviceName)` opens a server span per request, extracts any
  inbound W3C trace context (`propagation.TraceContext{}` + `Baggage{}`), sets
  `http.method`/`http.path`/`http.client_ip`/`http.status_code` attributes, records
  errors, and puts the span context back on the request so downstream work nests
  under it.
- To trace a specific operation, get a tracer from `otel.Tracer(name)` and
  `ctx, span := tracer.Start(ctx, "operation"); defer span.End()`, then thread
  `ctx` onward. Record failures with `span.RecordError(err)`. Prefer instrumenting
  at boundaries (handlers/middleware) over sprinkling spans everywhere.
- Because DB/redis/http calls receive the request `ctx`, they already participate
  in the active span through context propagation — always pass `ctx`.

## Config knobs

`logging` block: `level` (debug/info/warn/error), `format`, `add_source` (adds a
compressed source location like `handler/user.go:42`). `telemetry` block:
`service_name`, `exporter` (e.g. `stdout`). See `references/config-and-secrets.md`.
