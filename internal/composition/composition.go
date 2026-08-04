// Package composition holds the infrastructure wiring shared between the
// API server (cmd/server) and the Temporal worker (cmd/worker). Both
// binaries need database access, S3 storage, an image builder, and a
// container provider; this package constructs those adapters once.
package composition

import (
	"fmt"

	"github.com/surgged/agni/internal/adapters/builder/buildah"
	gormadapter "github.com/surgged/agni/internal/adapters/persistence/gorm"
	"github.com/surgged/agni/internal/adapters/provider/k3s"
	"github.com/surgged/agni/internal/adapters/storage/s3"
	"github.com/surgged/agni/internal/config"
	"gorm.io/gorm"
)

// Infra holds shared infrastructure connections needed by both binaries.
type Infra struct {
	GormDB       *gorm.DB
	S3Store      *s3.Store
	ImageBuilder *buildah.Builder
	Provider     *k3s.Provider
}

// NewInfra connects to every external system the deploy pipeline touches:
// Postgres (for app state), S3 (for source archives), buildah (for image
// builds), and k3s (for runtime deployment).
func NewInfra(cfg *config.Config) (*Infra, error) {
	gormDB, err := gormadapter.NewDB(cfg.Database.DSN)
	if err != nil {
		return nil, fmt.Errorf("composition: connect database: %w", err)
	}

	store, err := s3.NewStore(
		cfg.S3.Endpoint,
		cfg.S3.Region,
		cfg.S3.Bucket,
		cfg.S3.AccessKey,
		cfg.S3.SecretKey,
		cfg.S3.UseSSL,
	)
	if err != nil {
		return nil, fmt.Errorf("composition: connect s3: %w", err)
	}

	builder := buildah.NewBuilder("buildah", "", "")
	provider := k3s.NewProvider(cfg.K3s.Namespace, cfg.K3s.RegistryAddr, cfg.Share.Domain)

	return &Infra{
		GormDB:       gormDB,
		S3Store:      store,
		ImageBuilder: builder,
		Provider:     provider,
	}, nil
}

// Close releases infrastructure connections.
func (i *Infra) Close() {
	if i.GormDB != nil {
		gormadapter.Close(i.GormDB)
	}
}
