package gorm

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/surgged/agni/internal/domain/app"
)

type AppRepository struct {
	db *gorm.DB
}

func NewAppRepository(db *gorm.DB) *AppRepository {
	return &AppRepository{db: db}
}

func (r *AppRepository) Save(ctx context.Context, x *app.App) error {
	x.UpdatedAt = time.Now().UTC()
	return r.db.WithContext(ctx).Save(x).Error
}

func (r *AppRepository) Get(ctx context.Context, id uuid.UUID) (*app.App, error) {
	row := new(app.App)
	err := r.db.WithContext(ctx).Where("id = ?", id).First(row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, app.ErrAppNotFound
	}
	if err != nil {
		return nil, err
	}
	return row, nil
}

func (r *AppRepository) GetByOwner(ctx context.Context, ownerEmail string) ([]*app.App, error) {
	var rows []app.App
	if err := r.db.WithContext(ctx).Where("owner_email = ?", ownerEmail).Order("id ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*app.App, 0, len(rows))
	for i := range rows {
		out = append(out, &rows[i])
	}
	return out, nil
}

func (r *AppRepository) List(ctx context.Context) ([]*app.App, error) {
	var rows []app.App
	if err := r.db.WithContext(ctx).Order("id ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*app.App, 0, len(rows))
	for i := range rows {
		out = append(out, &rows[i])
	}
	return out, nil
}

func (r *AppRepository) Delete(ctx context.Context, id uuid.UUID) error {
	res := r.db.WithContext(ctx).Where("id = ?", id).Delete(&app.App{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return app.ErrAppNotFound
	}
	return nil
}
