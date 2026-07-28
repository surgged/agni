package app

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	domain "github.com/surgged/agni/internal/domain/app"
)

type QueryHandler struct {
	repo domain.Repository
}

func NewQueryHandler(repo domain.Repository) *QueryHandler {
	return &QueryHandler{repo: repo}
}

func (h *QueryHandler) HandleGet(ctx context.Context, q GetAppQuery) (*domain.App, error) {
	id, err := uuid.Parse(q.ID)
	if err != nil {
		return nil, fmt.Errorf("get app: %w", err)
	}
	return h.repo.Get(ctx, id)
}

func (h *QueryHandler) HandleList(ctx context.Context, _ ListAppsQuery) ([]*domain.App, error) {
	return h.repo.List(ctx)
}

func (h *QueryHandler) HandleListByOwner(ctx context.Context, q ListByOwnerQuery) ([]*domain.App, error) {
	return h.repo.GetByOwner(ctx, q.OwnerEmail)
}
