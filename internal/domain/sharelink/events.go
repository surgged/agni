package sharelink

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/surgged/agni/internal/domain/shared"
)

type ShareLinkCreated struct {
	ID             uuid.UUID `json:"id"`
	AppID          uuid.UUID `json:"app_id"`
	RecipientEmail string    `json:"recipient_email"`
	occurredAt     time.Time
}

func (ShareLinkCreated) EventName() string       { return "sharelink.created" }
func (e ShareLinkCreated) OccurredAt() time.Time { return e.occurredAt }

type ShareLinkAccepted struct {
	ID         uuid.UUID `json:"id"`
	occurredAt time.Time
}

func (ShareLinkAccepted) EventName() string       { return "sharelink.accepted" }
func (e ShareLinkAccepted) OccurredAt() time.Time { return e.occurredAt }

type ShareLinkRevoked struct {
	ID         uuid.UUID `json:"id"`
	occurredAt time.Time
}

func (ShareLinkRevoked) EventName() string       { return "sharelink.revoked" }
func (e ShareLinkRevoked) OccurredAt() time.Time { return e.occurredAt }

func init() {
	shared.RegisterEventType("sharelink.created", func(env shared.EventEnvelope) (shared.DomainEvent, error) {
		var e ShareLinkCreated
		if err := json.Unmarshal(env.Body, &e); err != nil {
			return nil, err
		}
		e.occurredAt = env.Time
		return e, nil
	})
	shared.RegisterEventType("sharelink.accepted", func(env shared.EventEnvelope) (shared.DomainEvent, error) {
		var e ShareLinkAccepted
		if err := json.Unmarshal(env.Body, &e); err != nil {
			return nil, err
		}
		e.occurredAt = env.Time
		return e, nil
	})
	shared.RegisterEventType("sharelink.revoked", func(env shared.EventEnvelope) (shared.DomainEvent, error) {
		var e ShareLinkRevoked
		if err := json.Unmarshal(env.Body, &e); err != nil {
			return nil, err
		}
		e.occurredAt = env.Time
		return e, nil
	})
}
