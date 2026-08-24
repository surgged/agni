package app

import (
	"context"

	"github.com/google/uuid"
)

type Repository interface {
	Save(ctx context.Context, x *App) error
	Get(ctx context.Context, id uuid.UUID) (*App, error)
	GetByOwner(ctx context.Context, ownerEmail string) ([]*App, error)
	List(ctx context.Context) ([]*App, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
