package gorm

import (
	"log"

	"time"

	"github.com/google/uuid"
	"github.com/surgged/agni/internal/domain/user"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const seedPData = "password123"

func SeedUsersUp(db *gorm.DB) error {
	entries := []user.User{
		{ID: uuid.MustParse("a0000000-0000-4000-a000-000000000001"), CreatedAt: time.Date(2026, 8, 3, 10, 0, 0, 0, time.UTC), UpdatedAt: time.Date(2026, 8, 3, 10, 0, 0, 0, time.UTC), Name: "Paul Rodriguez", Email: "tina.garcia@mailinator.com", Password: seedPData, EmailVerifiedAt: new(time.Date(2026, 8, 3, 10, 0, 0, 0, time.UTC)), VerificationToken: "tok_a751617cebfc0328"},
		{ID: uuid.MustParse("a0000000-0000-4000-a000-000000000002"), CreatedAt: time.Date(2026, 8, 2, 10, 0, 0, 0, time.UTC), UpdatedAt: time.Date(2026, 8, 2, 10, 0, 0, 0, time.UTC), Name: "Mia Rodriguez", Email: "frank.smith@mailinator.com", Password: seedPData, EmailVerifiedAt: new(time.Date(2026, 8, 2, 10, 0, 0, 0, time.UTC)), VerificationToken: "tok_7c20cb6b6ff165e2"},
		{ID: uuid.MustParse("a0000000-0000-4000-a000-000000000003"), CreatedAt: time.Date(2026, 8, 1, 10, 0, 0, 0, time.UTC), UpdatedAt: time.Date(2026, 8, 1, 10, 0, 0, 0, time.UTC), Name: "Hank Miller", Email: "hank.johnson@example.com", Password: seedPData, EmailVerifiedAt: new(time.Date(2026, 8, 1, 10, 0, 0, 0, time.UTC)), VerificationToken: "tok_38fccecfe0026337"},
		{ID: uuid.MustParse("a0000000-0000-4000-a000-000000000004"), CreatedAt: time.Date(2026, 7, 31, 10, 0, 0, 0, time.UTC), UpdatedAt: time.Date(2026, 7, 31, 10, 0, 0, 0, time.UTC), Name: "Mia Jones", Email: "eve.thomas@startup.dev", Password: seedPData, EmailVerifiedAt: new(time.Date(2026, 7, 31, 10, 0, 0, 0, time.UTC)), VerificationToken: "tok_fe757902761ce83b"},
		{ID: uuid.MustParse("a0000000-0000-4000-a000-000000000005"), CreatedAt: time.Date(2026, 7, 30, 10, 0, 0, 0, time.UTC), UpdatedAt: time.Date(2026, 7, 30, 10, 0, 0, 0, time.UTC), Name: "Jack Martinez", Email: "kate.smith@startup.dev", Password: seedPData, EmailVerifiedAt: new(time.Date(2026, 7, 30, 10, 0, 0, 0, time.UTC)), VerificationToken: "tok_e3f44102cf7041db"},
		{ID: uuid.MustParse("a0000000-0000-4000-a000-000000000006"), CreatedAt: time.Date(2026, 7, 29, 10, 0, 0, 0, time.UTC), UpdatedAt: time.Date(2026, 7, 29, 10, 0, 0, 0, time.UTC), Name: "Sam Davis", Email: "ivy.smith@demo.io", Password: seedPData, EmailVerifiedAt: new(time.Date(2026, 7, 29, 10, 0, 0, 0, time.UTC)), VerificationToken: "tok_d2a55a6695581a00"},
		{ID: uuid.MustParse("a0000000-0000-4000-a000-000000000007"), CreatedAt: time.Date(2026, 7, 28, 10, 0, 0, 0, time.UTC), UpdatedAt: time.Date(2026, 7, 28, 10, 0, 0, 0, time.UTC), Name: "Rose Martinez", Email: "paul.davis@mailinator.com", Password: seedPData, EmailVerifiedAt: new(time.Date(2026, 7, 28, 10, 0, 0, 0, time.UTC)), VerificationToken: "tok_8b9b6961ed92f99d"},
		{ID: uuid.MustParse("a0000000-0000-4000-a000-000000000008"), CreatedAt: time.Date(2026, 7, 27, 10, 0, 0, 0, time.UTC), UpdatedAt: time.Date(2026, 7, 27, 10, 0, 0, 0, time.UTC), Name: "Frank Taylor", Email: "frank.williams@demo.io", Password: seedPData, EmailVerifiedAt: new(time.Date(2026, 7, 27, 10, 0, 0, 0, time.UTC)), VerificationToken: "tok_98501780c6d67bcf"},
		{ID: uuid.MustParse("a0000000-0000-4000-a000-000000000009"), CreatedAt: time.Date(2026, 7, 26, 10, 0, 0, 0, time.UTC), UpdatedAt: time.Date(2026, 7, 26, 10, 0, 0, 0, time.UTC), Name: "Charlie Martinez", Email: "noah.miller@demo.io", Password: seedPData, EmailVerifiedAt: new(time.Date(2026, 7, 26, 10, 0, 0, 0, time.UTC)), VerificationToken: "tok_61521c19c0fe1a66"},
		{ID: uuid.MustParse("a0000000-0000-4000-a000-00000000000a"), CreatedAt: time.Date(2026, 7, 25, 10, 0, 0, 0, time.UTC), UpdatedAt: time.Date(2026, 7, 25, 10, 0, 0, 0, time.UTC), Name: "Ivy Thomas", Email: "hank.rodriguez@startup.dev", Password: seedPData, EmailVerifiedAt: new(time.Date(2026, 7, 25, 10, 0, 0, 0, time.UTC)), VerificationToken: "tok_f8ee066168bd3e41"},
	}
	for _, e := range entries {
		if err := db.Clauses(clause.OnConflict{DoNothing: true}).Create(&e).Error; err != nil {
			return err
		}
		log.Printf("  ✓ users %s", e.Name)
	}
	return nil
}

func SeedUsersDown(db *gorm.DB) error {
	return db.Where("id LIKE 'a0000000-0000-4000-a000-00000000000%%'").Delete(&user.User{}).Error
}
