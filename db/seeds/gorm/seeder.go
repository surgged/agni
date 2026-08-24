package gorm

import (
	"fmt"
	"log"

	"gorm.io/gorm"
)

// Seeder orchestrates seed operations in dependency order.
type Seeder struct {
	db *gorm.DB
}

// NewSeeder creates a new Seeder.
func NewSeeder(db *gorm.DB) *Seeder {
	return &Seeder{db: db}
}

// SeedUp runs all seed operations in order (respecting FK dependencies).
func (s *Seeder) SeedUp() error {
	seeders := []struct {
		name string
		fn   func(*gorm.DB) error
	}{
		// crank:seed-up-begin
		{"users", SeedUsersUp},
		// crank:seed-up-end
	}

	for _, se := range seeders {
		log.Printf("seeding %s ...", se.name)
		if err := se.fn(s.db); err != nil {
			return fmt.Errorf("seed %s: %w", se.name, err)
		}
	}
	return nil
}

// SeedDown tears down all seeded data in reverse dependency order.
func (s *Seeder) SeedDown() error {
	seeders := []struct {
		name string
		fn   func(*gorm.DB) error
	}{
		// crank:seed-down-begin
		{"users", SeedUsersDown},
		// crank:seed-down-end
	}

	for _, se := range seeders {
		log.Printf("tearing down %s ...", se.name)
		if err := se.fn(s.db); err != nil {
			return fmt.Errorf("seed down %s: %w", se.name, err)
		}
	}
	return nil
}
