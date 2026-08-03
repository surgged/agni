package config

import (
	"fmt"
	"os"

	"time"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
	"github.com/spf13/viper"
)

// Config is the top-level application configuration.
//
// Non-secret values are loaded from configs/config.yaml by Viper. Secret fields
// (tagged with `env:"..."`) are overlaid from .env / environment variables via
// caarlos0/env so they never appear in committed config files. Feature-specific
// config blocks are injected at the markers below by `crank add` (and by
// `crank init` for multi-feature generations).
type Config struct {
	App       AppConfig       `mapstructure:"app"`
	JWT       JWTConfig       `mapstructure:"jwt"`
	Redis     RedisConfig     `mapstructure:"redis"`
	Views     ViewsConfig     `mapstructure:"views"`
	Database  DatabaseConfig  `mapstructure:"database"`
	Logging   LoggingConfig   `mapstructure:"logging"`
	MCP       MCPConfig       `mapstructure:"mcp"`
	Email     EmailConfig     `mapstructure:"email"`
	Share     ShareConfig     `mapstructure:"share"`
	Deploy    DeployConfig    `mapstructure:"deploy"`
	K3s       K3sConfig       `mapstructure:"k3s"`
	S3        S3Config        `mapstructure:"s3"`
	Registry  RegistryConfig  `mapstructure:"registry"`
	Workflows WorkflowsConfig `mapstructure:"workflows"`
	// crank:config-fields
}

// AppConfig holds settings for the HTTP server itself.
type AppConfig struct {
	Name string `mapstructure:"name"`
	Host string `mapstructure:"host"`
	Port int    `mapstructure:"port"`
	Env  string `mapstructure:"env"`
}

// JWTConfig holds settings for JWT issuance and validation.
type JWTConfig struct {
	Secret            string        `mapstructure:"secret" env:"JWT_SECRET"`
	Expiration        time.Duration `mapstructure:"expiration"`
	RefreshExpiration time.Duration `mapstructure:"refresh_expiration"`
}

// RedisConfig holds the Redis connection settings.
type RedisConfig struct {
	Addr     string `mapstructure:"addr" env:"REDIS_ADDR"`
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
type DatabaseConfig struct {
	DSN string `mapstructure:"dsn" env:"DATABASE_DSN"`
}

// crank:config-structs
// LoggingConfig controls slog output.
type LoggingConfig struct {
	Level     string `mapstructure:"level"`
	Format    string `mapstructure:"format"`
	AddSource bool   `mapstructure:"add_source"`
}

// MCPConfig holds settings for the MCP agent authentication.
type MCPConfig struct {
	AgentSigningSecret string        `mapstructure:"agent_signing_secret"`
	AgentTokenTTL      time.Duration `mapstructure:"agent_token_ttl"`
}

// EmailConfig holds settings for the email provider.
type EmailConfig struct {
	Provider     string `mapstructure:"provider"`
	ResendAPIKey string `mapstructure:"resend_api_key" env:"RESEND_API_KEY"`
	FromAddress  string `mapstructure:"from_address"`
}

// ShareConfig holds settings for share links and magic links.
type ShareConfig struct {
	Domain       string        `mapstructure:"domain"`
	MagicLinkTTL time.Duration `mapstructure:"magic_link_ttl"`
	SessionTTL   time.Duration `mapstructure:"session_ttl"`
}

// DeployConfig holds settings for the deploy pipeline.
type DeployConfig struct {
	MaxTarballSizeMB int `mapstructure:"max_tarball_size_mb"`
	BuildTimeoutS    int `mapstructure:"build_timeout_s"`
	DeployTimeoutS   int `mapstructure:"deploy_timeout_s"`
}

// K3sConfig holds settings for the k3s cluster.
type K3sConfig struct {
	Namespace        string `mapstructure:"namespace"`
	RegistryAddr     string `mapstructure:"registry_addr"`
	KataRuntimeClass string `mapstructure:"kata_runtime_class"`
	IngressClass     string `mapstructure:"ingress_class"`
	CertIssuer       string `mapstructure:"cert_issuer"`
}

// S3Config holds settings for S3-compatible object storage.
type S3Config struct {
	Endpoint  string `mapstructure:"endpoint"`
	Region    string `mapstructure:"region"`
	Bucket    string `mapstructure:"bucket"`
	AccessKey string `mapstructure:"access_key" env:"AGNI_S3_ACCESS_KEY"`
	SecretKey string `mapstructure:"secret_key" env:"AGNI_S3_SECRET_KEY"`
	UseSSL    bool   `mapstructure:"use_ssl"`
}

// RegistryConfig holds settings for the OCI registry (zot).
type RegistryConfig struct {
	URL      string `mapstructure:"url"`
	Username string `mapstructure:"username" env:"AGNI_REGISTRY_USERNAME"`
	Password string `mapstructure:"password" env:"AGNI_REGISTRY_PASSWORD"`
}

// WorkflowsConfig holds settings for the go-workflows diagnostic UI.
type WorkflowsConfig struct {
	DatabaseDSN string `mapstructure:"database_dsn" env:"WORKFLOWS_DATABASE_DSN"`
	UIUser      string `mapstructure:"ui_user" env:"WORKFLOWS_UI_USER"`
	UIPassword  string `mapstructure:"ui_password" env:"WORKFLOWS_UI_PASSWORD"`
}

// Load reads non-secret values from configs/config.yaml (via Viper) and then
// overlays secrets from .env / environment variables (via caarlos0/env). Only
// fields tagged with `env:"..."` are affected by the env overlay — all other
// fields stay as configured in the YAML file.
func Load() *Config {
	// 1. Load .env file into the process environment (silently skip if missing).
	if err := godotenv.Load(); err != nil {
		fmt.Fprintf(os.Stderr, "warning: could not read .env file: %v\n", err)
	}

	// 2. Read non-secret config from YAML.
	v := viper.New()
	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath("./configs")
	v.AddConfigPath(".")

	setDefaults(v)

	if err := v.ReadInConfig(); err != nil {
		fmt.Fprintf(os.Stderr, "warning: could not read configs/config.yaml: %v\n", err)
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
	v.SetDefault("jwt.secret", "change-me-in-production")
	v.SetDefault("jwt.expiration", "24h")
	v.SetDefault("jwt.refresh_expiration", "168h")
	v.SetDefault("redis.addr", "localhost:6379")
	v.SetDefault("redis.password", "")
	v.SetDefault("redis.db", 0)
	v.SetDefault("views.enabled", false)
	v.SetDefault("views.dev_server", "")
	v.SetDefault("database.dsn", "postgres://agni:agni@localhost:5432/agni?sslmode=disable")
	v.SetDefault("logging.level", "info")
	v.SetDefault("logging.format", "text")
	v.SetDefault("logging.add_source", false)
	v.SetDefault("mcp.agent_signing_secret", "change-me-in-production")
	v.SetDefault("mcp.agent_token_ttl", "720h")
	v.SetDefault("email.provider", "resend")
	v.SetDefault("email.resend_api_key", "")
	v.SetDefault("email.from_address", "agni@agni.dev")
	v.SetDefault("share.domain", "agni.dev")
	v.SetDefault("share.magic_link_ttl", "24h")
	v.SetDefault("share.session_ttl", "168h")
	v.SetDefault("deploy.max_tarball_size_mb", 500)
	v.SetDefault("deploy.build_timeout_s", 300)
	v.SetDefault("deploy.deploy_timeout_s", 120)
	v.SetDefault("k3s.namespace", "agni")
	v.SetDefault("k3s.registry_addr", "registry.agni.svc:5000")
	v.SetDefault("k3s.kata_runtime_class", "kata-fc")
	v.SetDefault("k3s.ingress_class", "nginx")
	v.SetDefault("k3s.cert_issuer", "letsencrypt-prod")
	v.SetDefault("s3.endpoint", "")
	v.SetDefault("s3.region", "us-east-1")
	v.SetDefault("s3.bucket", "agni-archives")
	v.SetDefault("s3.access_key", "")
	v.SetDefault("s3.secret_key", "")
	v.SetDefault("s3.use_ssl", true)
	v.SetDefault("registry.url", "registry.agni.svc:5000")
	v.SetDefault("registry.username", "")
	v.SetDefault("registry.password", "")
	v.SetDefault("workflows.database_dsn", "postgres://agni:agni@localhost:5432/agni_worker?sslmode=disable")
	v.SetDefault("workflows.ui_user", "admin")
	v.SetDefault("workflows.ui_password", "agni-admin")
	// crank:config-defaults
}
