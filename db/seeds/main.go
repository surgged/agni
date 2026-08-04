package main

import (
	"flag"
	"fmt"
	"log"

	seedgorm "github.com/surgged/agni/db/seeds/gorm"
	"github.com/surgged/agni/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	cfg := config.Load()

	var dir string
	flag.StringVar(&dir, "dir", "up", "Seed direction: up or down")
	flag.Parse()

	db, err := gorm.Open(postgres.Open(cfg.Database.DSN), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	seeder := seedgorm.NewSeeder(db)
	switch dir {
	case "up":
		if err := seeder.SeedUp(); err != nil {
			log.Fatalf("seed up failed: %v", err)
		}
		fmt.Println("✓ All seeds applied successfully")
	case "down":
		if err := seeder.SeedDown(); err != nil {
			log.Fatalf("seed down failed: %v", err)
		}
		fmt.Println("✓ All seeds rolled back successfully")
	default:
		log.Fatalf("invalid direction: %s (use 'up' or 'down')", dir)
	}
}
