package gorm

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/surgged/agni/internal/domain/user"
)

// UserRepository is the gorm-backed implementation of
// domain/user.Repository.
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository constructs a GORM-backed UserRepository.
func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// Save inserts a new row or updates an existing one keyed by id.
func (r *UserRepository) Save(ctx context.Context, x *user.User) error {
	x.UpdatedAt = time.Now().UTC()
	return r.db.WithContext(ctx).Save(x).Error
}

// Get returns a user aggregate by id, mapping gorm.ErrRecordNotFound to
// domain/user.ErrUserNotFound.
func (r *UserRepository) Get(ctx context.Context, id uuid.UUID) (*user.User, error) {
	row := new(user.User)
	err := r.db.WithContext(ctx).Where("id = ?", id).First(row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, user.ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return row, nil
}

// GetByEmail returns a user aggregate by email address, mapping
// gorm.ErrRecordNotFound to domain/user.ErrUserNotFound.
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*user.User, error) {
	row := new(user.User)
	err := r.db.WithContext(ctx).Where("email = ?", email).First(row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, user.ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return row, nil
}

// List returns every user aggregate.
func (r *UserRepository) List(ctx context.Context) ([]*user.User, error) {
	var rows []user.User
	if err := r.db.WithContext(ctx).Order("id ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*user.User, 0, len(rows))
	for i := range rows {
		out = append(out, &rows[i])
	}
	return out, nil
}

// Delete removes a user row by id, mapping zero affected rows to
// domain/user.ErrUserNotFound.
func (r *UserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	res := r.db.WithContext(ctx).Where("id = ?", id).Delete(&user.User{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return user.ErrUserNotFound
	}
	return nil
}
