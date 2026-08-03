package gorm

import (
	"context"
	"errors"
	"log/slog"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/surgged/agni/internal/domain/sharelink"
)

type ShareLinkRepository struct {
	db *gorm.DB
}

func NewShareLinkRepository(db *gorm.DB) *ShareLinkRepository {
	return &ShareLinkRepository{db: db}
}

func (r *ShareLinkRepository) Save(ctx context.Context, x *sharelink.ShareLink) error {
	return r.db.WithContext(ctx).Save(x).Error
}

func (r *ShareLinkRepository) Get(ctx context.Context, id uuid.UUID) (*sharelink.ShareLink, error) {
	row := new(sharelink.ShareLink)
	err := r.db.WithContext(ctx).Where("id = ?", id).First(row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, sharelink.ErrShareLinkNotFound
	}
	if err != nil {
		slog.WarnContext(ctx, "failed to get share link", "share_id", id, "error", err)
		return nil, err
	}
	return row, nil
}

func (r *ShareLinkRepository) GetByAppID(ctx context.Context, appID uuid.UUID) ([]*sharelink.ShareLink, error) {
	var rows []sharelink.ShareLink
	if err := r.db.WithContext(ctx).Where("app_id = ?", appID).Order("id ASC").Find(&rows).Error; err != nil {
		slog.WarnContext(ctx, "failed to list share links by app", "app_id", appID, "error", err)
		return nil, err
	}
	out := make([]*sharelink.ShareLink, 0, len(rows))
	for i := range rows {
		out = append(out, &rows[i])
	}
	return out, nil
}

func (r *ShareLinkRepository) GetByRecipientEmail(ctx context.Context, email string) ([]*sharelink.ShareLink, error) {
	var rows []sharelink.ShareLink
	if err := r.db.WithContext(ctx).Where("recipient_email = ?", email).Order("id ASC").Find(&rows).Error; err != nil {
		slog.WarnContext(ctx, "failed to list share links by recipient", "email", email, "error", err)
		return nil, err
	}
	out := make([]*sharelink.ShareLink, 0, len(rows))
	for i := range rows {
		out = append(out, &rows[i])
	}
	return out, nil
}

func (r *ShareLinkRepository) Delete(ctx context.Context, id uuid.UUID) error {
	res := r.db.WithContext(ctx).Where("id = ?", id).Delete(&sharelink.ShareLink{})
	if res.Error != nil {
		slog.WarnContext(ctx, "failed to delete share link", "share_id", id, "error", res.Error)
		return res.Error
	}
	if res.RowsAffected == 0 {
		return sharelink.ErrShareLinkNotFound
	}
	return nil
}
