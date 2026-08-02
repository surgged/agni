package app

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/surgged/agni/internal/domain/shared"
)

type AppCreated struct {
	ID         uuid.UUID `json:"id"`
	occurredAt time.Time
}

func (AppCreated) EventName() string       { return "app.created" }
func (e AppCreated) OccurredAt() time.Time { return e.occurredAt }

type AppQueued struct {
	ID         uuid.UUID `json:"id"`
	Slug       string    `json:"slug"`
	ArchiveKey string    `json:"archive_key"`
	Port       int32     `json:"port"`
	occurredAt time.Time
}

func (AppQueued) EventName() string       { return "app.queued" }
func (e AppQueued) OccurredAt() time.Time { return e.occurredAt }

type AppRetried struct {
	ID         uuid.UUID `json:"id"`
	occurredAt time.Time
}

func (AppRetried) EventName() string       { return "app.retried" }
func (e AppRetried) OccurredAt() time.Time { return e.occurredAt }

type AppBuilding struct {
	ID         uuid.UUID `json:"id"`
	occurredAt time.Time
}

func (AppBuilding) EventName() string       { return "app.building" }
func (e AppBuilding) OccurredAt() time.Time { return e.occurredAt }

type AppDeploying struct {
	ID         uuid.UUID `json:"id"`
	ImageRef   string    `json:"image_ref"`
	PodName    string    `json:"pod_name"`
	occurredAt time.Time
}

func (AppDeploying) EventName() string       { return "app.deploying" }
func (e AppDeploying) OccurredAt() time.Time { return e.occurredAt }

type AppLive struct {
	ID         uuid.UUID `json:"id"`
	ServiceURL string    `json:"service_url"`
	ShareURL   string    `json:"share_url"`
	occurredAt time.Time
}

func (AppLive) EventName() string       { return "app.live" }
func (e AppLive) OccurredAt() time.Time { return e.occurredAt }

type AppFailed struct {
	ID         uuid.UUID `json:"id"`
	Step       string    `json:"step"`
	Reason     string    `json:"reason"`
	occurredAt time.Time
}

func (AppFailed) EventName() string       { return "app.failed" }
func (e AppFailed) OccurredAt() time.Time { return e.occurredAt }

type AppDestroyed struct {
	ID         uuid.UUID `json:"id"`
	occurredAt time.Time
}

func (AppDestroyed) EventName() string       { return "app.destroyed" }
func (e AppDestroyed) OccurredAt() time.Time { return e.occurredAt }

func init() {
	shared.RegisterEventType("app.created", func(env shared.EventEnvelope) (shared.DomainEvent, error) {
		var e AppCreated
		if err := json.Unmarshal(env.Body, &e); err != nil {
			return nil, err
		}
		e.occurredAt = env.Time
		return e, nil
	})
	shared.RegisterEventType("app.queued", func(env shared.EventEnvelope) (shared.DomainEvent, error) {
		var e AppQueued
		if err := json.Unmarshal(env.Body, &e); err != nil {
			return nil, err
		}
		e.occurredAt = env.Time
		return e, nil
	})
	shared.RegisterEventType("app.retried", func(env shared.EventEnvelope) (shared.DomainEvent, error) {
		var e AppRetried
		if err := json.Unmarshal(env.Body, &e); err != nil {
			return nil, err
		}
		e.occurredAt = env.Time
		return e, nil
	})
	shared.RegisterEventType("app.building", func(env shared.EventEnvelope) (shared.DomainEvent, error) {
		var e AppBuilding
		if err := json.Unmarshal(env.Body, &e); err != nil {
			return nil, err
		}
		e.occurredAt = env.Time
		return e, nil
	})
	shared.RegisterEventType("app.deploying", func(env shared.EventEnvelope) (shared.DomainEvent, error) {
		var e AppDeploying
		if err := json.Unmarshal(env.Body, &e); err != nil {
			return nil, err
		}
		e.occurredAt = env.Time
		return e, nil
	})
	shared.RegisterEventType("app.live", func(env shared.EventEnvelope) (shared.DomainEvent, error) {
		var e AppLive
		if err := json.Unmarshal(env.Body, &e); err != nil {
			return nil, err
		}
		e.occurredAt = env.Time
		return e, nil
	})
	shared.RegisterEventType("app.failed", func(env shared.EventEnvelope) (shared.DomainEvent, error) {
		var e AppFailed
		if err := json.Unmarshal(env.Body, &e); err != nil {
			return nil, err
		}
		e.occurredAt = env.Time
		return e, nil
	})
	shared.RegisterEventType("app.destroyed", func(env shared.EventEnvelope) (shared.DomainEvent, error) {
		var e AppDestroyed
		if err := json.Unmarshal(env.Body, &e); err != nil {
			return nil, err
		}
		e.occurredAt = env.Time
		return e, nil
	})
}
