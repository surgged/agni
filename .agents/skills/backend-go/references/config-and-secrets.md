# Configuration & Secrets

Config is loaded once at startup by `config.Load()` in `internal/config/config.go`
using a three-step layering: **godotenv → Viper (YAML) → caarlos0/env**. The split
exists so non-secret defaults are committed and readable, while secrets stay out of
version control.

## The loading order (and why)

```go
func Load() *Config {
	_ = godotenv.Load()                     // 1. load .env into process env (ignore if missing)

	v := viper.New()                        // 2. read non-secret config from YAML
	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath("./configs")
	v.AddConfigPath(".")
	setDefaults(v)                          //    baked-in defaults for every key
	_ = v.ReadInConfig()                    //    warn (don't fail) if the file is absent
	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		panic(fmt.Errorf("fatal: cannot parse configuration: %w", err))
	}

	if err := env.ParseWithOptions(&cfg, env.Options{RequiredIfNoDef: false}); err != nil {
		panic(fmt.Errorf("fatal: cannot parse environment: %w", err)) // 3. overlay secrets
	}
	return &cfg
}
```

1. **godotenv** loads `.env` into the process environment. `.env` is gitignored and
   holds secrets for local dev. Silently skipped when missing (prod uses real env
   vars / a secret manager).
2. **Viper** reads `configs/config.yaml` (checked in) into the `Config` struct via
   `mapstructure` tags. `setDefaults` provides a default for every key so the app
   boots even with no YAML.
3. **caarlos0/env/v11** overlays only fields tagged `env:"..."`. These are the
   secrets; the env value wins over whatever the YAML had.

Fail fast: parse/unmarshal errors `panic`. A missing YAML only warns.

## Struct tags: mapstructure vs env

Every field has a `mapstructure` tag (for Viper). **Secret** fields additionally
carry an `env` tag, which is the only thing the caarlos0/env pass touches.

```go
type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password" env:"DATABASE_PASSWORD"` // secret → env only
	Name     string `mapstructure:"name"`
	SSLMode  string `mapstructure:"sslmode"`
}
```

Known secret env vars: `DATABASE_PASSWORD`, `JWT_SECRET`, `REDIS_PASSWORD`,
`QDRANT_API_KEY`, `CRYPTO_SECRET`.

## Adding a new config block

Do all four, keeping them consistent:

1. Add a `XConfig` struct with `mapstructure` tags; tag any secret field with `env`.
2. Add the field to the top-level `Config` struct (feature blocks go near the
   `// crank:config-fields` / `// crank:config-structs` markers).
3. Add defaults in `setDefaults(v)` for every key (near `// crank:config-defaults`).
4. Add the non-secret keys to `configs/config.yaml` (near `// crank:config-section`).
   **Never** put a real secret in the YAML — leave a placeholder and document the
   `.env` var.

For durations use `time.Duration` fields with string YAML values like `"24h"`,
`"1s"` — Viper/mapstructure parse them.

## Derived values

Put computed accessors on the config struct, e.g. `DatabaseConfig.DSN()` builds the
Postgres connection string. Keep such helpers pure and total.

## Rules

- Config is read once in `main.go` and passed down explicitly; do not call
  `config.Load()` from library code or read `os.Getenv` scattered around.
- Never hardcode a secret, never commit one, never log one (the slog redactor
  scrubs common secret keys — see `references/observability.md`, but don't rely on
  it as the primary control).
- Provide a sane default for every non-secret key so the service is runnable
  out-of-the-box; provide safe placeholder defaults (e.g.
  `"change-me-in-production"`) for secrets so local dev boots, and make it obvious
  they must be overridden.
