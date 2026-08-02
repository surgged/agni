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
	StatusQueued    Status = "queued"
	StatusBuilding  Status = "building"
	StatusDeploying Status = "deploying"
	StatusLive      Status = "live"
	StatusFailed    Status = "failed"
	StatusDestroyed Status = "destroyed"
)

var validTransitions = map[Status][]Status{
	StatusCreated:   {StatusQueued, StatusDestroyed},
	StatusQueued:    {StatusBuilding, StatusFailed, StatusDestroyed},
	StatusBuilding:  {StatusDeploying, StatusFailed, StatusDestroyed},
	StatusDeploying: {StatusLive, StatusFailed, StatusDestroyed},
	StatusLive:      {StatusDestroyed},
	StatusFailed:    {StatusQueued, StatusDestroyed},
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
	Slug         string               `gorm:"column:slug;not null;default:'';type:TEXT"`
	Port         int32                `gorm:"column:port;not null;default:8080"`
	ArchiveKey   string               `gorm:"column:archive_key;not null;default:'';type:TEXT"`
	FailedStep   string               `gorm:"column:failed_step;not null;default:'';type:TEXT"`
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

func (a *App) Queue(archiveKey, slug string, port int32) error {
	if !a.canTransitionTo(StatusQueued) {
		return ErrInvalidAppTransition
	}
	now := time.Now().UTC()
	a.Status = StatusQueued
	a.ArchiveKey = archiveKey
	a.Slug = slug
	a.Port = port
	a.UpdatedAt = now
	a.recordEvent(AppQueued{ID: a.ID, Slug: slug, ArchiveKey: archiveKey, Port: port, occurredAt: now})
	return nil
}

func (a *App) Retry() error {
	if !a.canTransitionTo(StatusQueued) {
		return ErrInvalidAppTransition
	}
	a.Status = StatusQueued
	a.FailedStep = ""
	a.ErrorMessage = ""
	a.UpdatedAt = time.Now().UTC()
	a.recordEvent(AppRetried{ID: a.ID, occurredAt: a.UpdatedAt})
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

func (a *App) MarkFailed(step, reason string) error {
	if !a.canTransitionTo(StatusFailed) {
		return ErrInvalidAppTransition
	}
	a.Status = StatusFailed
	a.FailedStep = step
	a.ErrorMessage = reason
	a.UpdatedAt = time.Now().UTC()
	a.recordEvent(AppFailed{ID: a.ID, Step: step, Reason: reason, occurredAt: a.UpdatedAt})
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

func Rehydrate(id uuid.UUID, ownerEmail, name, runtime, imageRef, podName, serviceURL, shareURL, slug string, port int32, archiveKey, failedStep, errorMessage string, status Status, created, updated time.Time) *App {
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
		Slug:         slug,
		Port:         port,
		ArchiveKey:   archiveKey,
		FailedStep:   failedStep,
		Status:       status,
		ErrorMessage: errorMessage,
	}
}
