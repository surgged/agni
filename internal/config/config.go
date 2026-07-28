package config

import (
	"fmt"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
	"github.com/spf13/viper"
	"time"
)

// Config is the top-level application configuration.
//
// Non-secret values are loaded from configs/config.yaml by Viper. Secret fields
// (tagged with `env:"..."`) are overlaid from .env / environment variables via
// caarlos0/env so they never appear in committed config files. Feature-specific
// config blocks are injected at the markers below by `crank add` (and by
// `crank init` for multi-feature generations).
type Config struct {
	App AppConfig `mapstructure:"app"`
	JWT JWTConfig `mapstructure:"jwt"`

	Redis RedisConfig `mapstructure:"redis"`

	Views ViewsConfig `mapstructure:"views"`

	Database DatabaseConfig `mapstructure:"database"`

	// crank:config-fields
	Logging LoggingConfig `mapstructure:"logging"`
}

// AppConfig holds settings for the HTTP server itself.
type AppConfig struct {
	Name        string   `mapstructure:"name"`
	Host        string   `mapstructure:"host"`
	Port        int      `mapstructure:"port"`
	Env         string   `mapstructure:"env"`
	CORSOrigins []string `mapstructure:"cors_origins"`
}

// JWTConfig holds settings for JWT issuance and validation.
type JWTConfig struct {
	Secret            string        `mapstructure:"secret" env:"JWT_SECRET"`
	Expiration        time.Duration `mapstructure:"expiration"`
	RefreshExpiration time.Duration `mapstructure:"refresh_expiration"`
}

// RedisConfig holds the Redis connection settings.
type RedisConfig struct {
	Addr     string `mapstructure:"addr"`
	Password string `mapstructure:"password" env:"REDIS_PASSWORD"`
	DB       int    `mapstructure:"db"`
}

// ViewsConfig controls the embedded React SPA serving.
// When Enabled is false the SPA is not served (API-only mode).
// Set DevServer to a Vite dev server URL (e.g. "http://localhost:5173") for
// hot module replacement during frontend development.
type ViewsConfig struct {
	Enabled   bool   `mapstructure:"enabled"`
	DevServer string `mapstructure:"dev_server"`
}

// DatabaseConfig holds PostgreSQL connection settings.
// The Password field is a secret — set it via DATABASE_PASSWORD in .env.
type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password" env:"DATABASE_PASSWORD"`
	Name     string `mapstructure:"name"`
	SSLMode  string `mapstructure:"sslmode"`
}

// DSN returns a libpq-style connection string.
func (d DatabaseConfig) DSN() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=%s",
		d.User, d.Password, d.Host, d.Port, d.Name, d.SSLMode)
}

// crank:config-structs
// LoggingConfig controls slog output.
type LoggingConfig struct {
	Level     string `mapstructure:"level"`
	Format    string `mapstructure:"format"`
	AddSource bool   `mapstructure:"add_source"`
}

// Load reads non-secret values from configs/config.yaml (via Viper) and then
// overlays secrets from .env / environment variables (via caarlos0/env). Only
// fields tagged with `env:"..."` are affected by the env overlay — all other
// fields stay as configured in the YAML file.
func Load() *Config {
	// 1. Load .env file into the process environment (silently skip if missing).
	_ = godotenv.Load()

	// 2. Read non-secret config from YAML.
	v := viper.New()
	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath("./configs")
	v.AddConfigPath(".")

	setDefaults(v)

	if err := v.ReadInConfig(); err != nil {
		fmt.Printf("warning: could not read configs/config.yaml: %v\n", err)
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		panic(fmt.Errorf("fatal: cannot parse configuration: %w", err))
	}

	// 3. Overlay secrets from environment (tags only on secret fields).
	if err := env.ParseWithOptions(&cfg, env.Options{
		RequiredIfNoDef: false,
	}); err != nil {
		panic(fmt.Errorf("fatal: cannot parse environment: %w", err))
	}

	return &cfg
}

func setDefaults(v *viper.Viper) {
	v.SetDefault("app.name", "agni")
	v.SetDefault("app.host", "0.0.0.0")
	v.SetDefault("app.port", 8080)
	v.SetDefault("app.env", "development")
	v.SetDefault("app.cors_origins", []string{"*"})
	v.SetDefault("jwt.secret", "change-me-in-production")
	v.SetDefault("jwt.expiration", "24h")
	v.SetDefault("jwt.refresh_expiration", "168h")

	v.SetDefault("redis.addr", "localhost:6379")
	v.SetDefault("redis.password", "")
	v.SetDefault("redis.db", 0)

	v.SetDefault("views.enabled", false)
	v.SetDefault("views.dev_server", "")

	v.SetDefault("database.host", "localhost")
	v.SetDefault("database.port", 5432)
	v.SetDefault("database.user", "postgres")
	v.SetDefault("database.password", "postgres")
	v.SetDefault("database.name", "agni")
	v.SetDefault("database.sslmode", "disable")

	// crank:config-defaults
	v.SetDefault("logging.level", "info")
	v.SetDefault("logging.format", "text")
	v.SetDefault("logging.add_source", false)
}
