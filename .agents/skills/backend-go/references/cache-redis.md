# Cache — go-redis + ports.Cache

Redis is optional infrastructure exposed through the `ports.Cache` port so the
application layer never imports go-redis directly.

## The port

```go
type Cache interface {
	Get(ctx context.Context, key string) (string, bool, error) // ("", false, nil) on miss
	Set(ctx context.Context, key, value string, ttl time.Duration) error // ttl 0 = no expiry
	Del(ctx context.Context, keys ...string) (int64, error)
}
```

Depend on `ports.Cache`, not `*redis.Client`, everywhere above the adapter.

## Client construction

`redisclient.NewClient(cfg config.RedisConfig)` builds a `*redis.Client` with sane
timeouts and pings to verify connectivity:

```go
client := redis.NewClient(&redis.Options{
	Addr:         cfg.Addr,
	Password:     cfg.Password, // secret from .env (REDIS_PASSWORD)
	DB:           cfg.DB,
	DialTimeout:  5 * time.Second,
	ReadTimeout:  3 * time.Second,
	WriteTimeout: 3 * time.Second,
})
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
if err := client.Ping(ctx).Err(); err != nil { /* close + wrap */ }
```

In `main.go` redis is treated as optional: on connect failure it logs a warning and
continues with `rdb == nil`. Design cache usage so a missing cache degrades
gracefully (fall through to the source of truth).

## The adapter (nil-safe)

`RedisCache` implements `ports.Cache` and is **nil-safe** — a nil receiver or nil
client returns the miss/no-op result instead of panicking, which is what lets the
app run without redis. Map `redis.Nil` to a miss, wrap other errors with context,
and log at Debug (hit/miss/set) / Error (failure).

```go
var _ ports.Cache = (*RedisCache)(nil)

func (c *RedisCache) Get(ctx context.Context, key string) (string, bool, error) {
	if c == nil || c.client == nil {
		return "", false, nil
	}
	val, err := c.client.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", false, nil // miss, not an error
	}
	if err != nil {
		return "", false, fmt.Errorf("redis get %s: %w", key, err)
	}
	return val, true, nil
}
```

## Conventions

- Always pass `ctx` to redis calls so timeouts/cancellation/tracing propagate.
- Treat a miss as a normal control-flow value (`bool` false), not an error. Only
  connection/protocol failures are errors.
- Namespace keys clearly (e.g. `user:{id}`) and always set a TTL for cache entries
  unless there is a deliberate reason not to.
- Add the `var _ ports.Cache = (*RedisCache)(nil)` assertion.
- Never store secrets or large blobs; cache derived/read-heavy data.
