package sharelink

import (
	"context"

	"github.com/google/uuid"
)

type Repository interface {
	Save(ctx context.Context, x *ShareLink) error
	Get(ctx context.Context, id uuid.UUID) (*ShareLink, error)
	GetByAppID(ctx context.Context, appID uuid.UUID) ([]*ShareLink, error)
	GetByRecipientEmail(ctx context.Context, email string) ([]*ShareLink, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
