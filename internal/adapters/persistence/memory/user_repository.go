package memory

import (
	"context"
	"sync"

	"github.com/google/uuid"

	"github.com/surgged/agni/internal/domain/user"
)

// UserRepository is the in-memory implementation of
// domain/user.Repository. It is safe for concurrent use and is
// intended for tests, local development, and projects that do not enable the
// gorm feature.
type UserRepository struct {
	mu    sync.RWMutex
	items map[uuid.UUID]*user.User
	byEml map[string]*user.User
}

// NewUserRepository constructs an empty in-memory UserRepository.
func NewUserRepository() *UserRepository {
	return &UserRepository{
		items: make(map[uuid.UUID]*user.User),
		byEml: make(map[string]*user.User),
	}
}

// Save stores (or overwrites) a user aggregate.
func (r *UserRepository) Save(_ context.Context, x *user.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.items[x.ID] = x
	r.byEml[x.Email] = x
	return nil
}

// Get returns a user aggregate by id, mapping a missing key to
// domain/user.ErrUserNotFound.
func (r *UserRepository) Get(_ context.Context, id uuid.UUID) (*user.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	x, ok := r.items[id]
	if !ok {
		return nil, user.ErrUserNotFound
	}
	return x, nil
}

// List returns every stored user aggregate, in insertion order.
func (r *UserRepository) List(_ context.Context) ([]*user.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]*user.User, 0, len(r.items))
	for _, x := range r.items {
		out = append(out, x)
	}
	return out, nil
}

// GetByEmail returns a user aggregate by email address, or
// domain/user.ErrUserNotFound.
func (r *UserRepository) GetByEmail(_ context.Context, email string) (*user.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	x, ok := r.byEml[email]
	if !ok {
		return nil, user.ErrUserNotFound
	}
	return x, nil
}

// Delete removes a user aggregate by id, mapping a missing key to
// domain/user.ErrUserNotFound.
func (r *UserRepository) Delete(_ context.Context, id uuid.UUID) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	x, ok := r.items[id]
	if !ok {
		return user.ErrUserNotFound
	}
	delete(r.items, id)
	delete(r.byEml, x.Email)
	return nil
}
