package app

import (
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/surgged/agni/internal/domain/shared"
)

type Status string

const (
	StatusCreated   Status = "created"
	StatusBuilding  Status = "building"
	StatusDeploying Status = "deploying"
	StatusLive      Status = "live"
	StatusFailed    Status = "failed"
	StatusDestroyed Status = "destroyed"
)

var validTransitions = map[Status][]Status{
	StatusCreated:   {StatusBuilding, StatusDestroyed},
	StatusBuilding:  {StatusDeploying, StatusFailed, StatusDestroyed},
	StatusDeploying: {StatusLive, StatusFailed, StatusDestroyed},
	StatusLive:      {StatusDestroyed},
	StatusFailed:    {StatusDestroyed},
}

type App struct {
	ID           uuid.UUID            `gorm:"column:id;primaryKey;type:uuid"`
	CreatedAt    time.Time            `gorm:"column:created_at;not null"`
	UpdatedAt    time.Time            `gorm:"column:updated_at;not null"`
	OwnerEmail   string               `gorm:"column:owner_email;not null;type:TEXT"`
	Name         string               `gorm:"column:name;not null;type:TEXT"`
	Runtime      string               `gorm:"column:runtime;not null;default:kata;type:TEXT"`
	ImageRef     string               `gorm:"column:image_ref;not null;default:'';type:TEXT"`
	PodName      string               `gorm:"column:pod_name;not null;default:'';type:TEXT"`
	ServiceURL   string               `gorm:"column:service_url;not null;default:'';type:TEXT"`
	ShareURL     string               `gorm:"column:share_url;not null;default:'';type:TEXT"`
	Status       Status               `gorm:"column:status;not null;default:'created';type:TEXT"`
	ErrorMessage string               `gorm:"column:error_message;not null;default:'';type:TEXT"`
	events       []shared.DomainEvent `gorm:"-"`
}

func (a *App) TableName() string {
	return "apps"
}

func NewApp(id uuid.UUID, ownerEmail, name string) (*App, error) {
	if id == uuid.Nil {
		return nil, ErrInvalidApp
	}
	if ownerEmail == "" {
		return nil, ErrInvalidApp
	}
	if name == "" {
		return nil, ErrInvalidApp
	}
	now := time.Now().UTC()
	a := &App{
		ID:         id,
		CreatedAt:  now,
		UpdatedAt:  now,
		OwnerEmail: ownerEmail,
		Name:       name,
		Runtime:    "kata",
		Status:     StatusCreated,
	}
	a.recordEvent(AppCreated{ID: id, occurredAt: now})
	return a, nil
}

func (a *App) canTransitionTo(target Status) bool {
	for _, allowed := range validTransitions[a.Status] {
		if allowed == target {
			return true
		}
	}
	return false
}

func (a *App) MarkBuilding() error {
	if !a.canTransitionTo(StatusBuilding) {
		return ErrInvalidAppTransition
	}
	a.Status = StatusBuilding
	a.UpdatedAt = time.Now().UTC()
	a.recordEvent(AppBuilding{ID: a.ID, occurredAt: a.UpdatedAt})
	return nil
}

func (a *App) MarkDeploying(imageRef, podName string) error {
	if !a.canTransitionTo(StatusDeploying) {
		return ErrInvalidAppTransition
	}
	now := time.Now().UTC()
	a.Status = StatusDeploying
	a.ImageRef = imageRef
	a.PodName = podName
	a.UpdatedAt = now
	a.recordEvent(AppDeploying{ID: a.ID, ImageRef: imageRef, PodName: podName, occurredAt: now})
	return nil
}

func (a *App) MarkLive(serviceURL, shareURL string) error {
	if !a.canTransitionTo(StatusLive) {
		return ErrInvalidAppTransition
	}
	now := time.Now().UTC()
	a.Status = StatusLive
	a.ServiceURL = serviceURL
	a.ShareURL = shareURL
	a.UpdatedAt = now
	a.recordEvent(AppLive{ID: a.ID, ServiceURL: serviceURL, ShareURL: shareURL, occurredAt: now})
	return nil
}

func (a *App) MarkFailed(reason string) error {
	if !a.canTransitionTo(StatusFailed) {
		return ErrInvalidAppTransition
	}
	a.Status = StatusFailed
	a.ErrorMessage = reason
	a.UpdatedAt = time.Now().UTC()
	a.recordEvent(AppFailed{ID: a.ID, Reason: reason, occurredAt: a.UpdatedAt})
	return nil
}

func (a *App) Destroy() error {
	if a.Status == StatusDestroyed {
		return errors.New("app already destroyed")
	}
	if !a.canTransitionTo(StatusDestroyed) {
		return ErrInvalidAppTransition
	}
	a.Status = StatusDestroyed
	a.UpdatedAt = time.Now().UTC()
	a.recordEvent(AppDestroyed{ID: a.ID, occurredAt: a.UpdatedAt})
	return nil
}

func (a *App) PullEvents() []shared.DomainEvent {
	out := a.events
	a.events = nil
	return out
}

func (a *App) recordEvent(e shared.DomainEvent) {
	a.events = append(a.events, e)
}

func Rehydrate(id uuid.UUID, ownerEmail, name, runtime, imageRef, podName, serviceURL, shareURL string, status Status, errorMessage string, created, updated time.Time) *App {
	return &App{
		ID:           id,
		CreatedAt:    created,
		UpdatedAt:    updated,
		OwnerEmail:   ownerEmail,
		Name:         name,
		Runtime:      runtime,
		ImageRef:     imageRef,
		PodName:      podName,
		ServiceURL:   serviceURL,
		ShareURL:     shareURL,
		Status:       status,
		ErrorMessage: errorMessage,
	}
}
