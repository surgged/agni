package sharelink

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	domain "github.com/surgged/agni/internal/domain/sharelink"
)

type QueryHandler struct {
	repo domain.Repository
}

func NewQueryHandler(repo domain.Repository) *QueryHandler {
	return &QueryHandler{repo: repo}
}

func (h *QueryHandler) HandleGet(ctx context.Context, q GetShareLinkQuery) (*domain.ShareLink, error) {
	id, err := uuid.Parse(q.ID)
	if err != nil {
		return nil, fmt.Errorf("get share link: %w", err)
	}
	return h.repo.Get(ctx, id)
}

func (h *QueryHandler) HandleListByApp(ctx context.Context, q ListByAppQuery) ([]*domain.ShareLink, error) {
	appID, err := uuid.Parse(q.AppID)
	if err != nil {
		return nil, fmt.Errorf("list share links: %w", err)
	}
	return h.repo.GetByAppID(ctx, appID)
}
