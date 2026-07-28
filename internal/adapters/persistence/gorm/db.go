package gorm

import (
	"fmt"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/surgged/agni/internal/config"
)

// NewDB opens a connection to SQLite using the supplied configuration
// and returns a configured *gorm.DB ready to use. The caller is responsible
// for closing the underlying *sql.DB at shutdown.
func NewDB(cfg config.DatabaseConfig) (*gorm.DB, error) {
	db, err := gorm.Open(sqlite.Open(cfg.Path), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("connect to sqlite at %s: %w", cfg.Path, err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get underlying *sql.DB: %w", err)
	}
	sqlDB.SetMaxOpenConns(1) // SQLite only supports a single writer.

	return db, nil
}
