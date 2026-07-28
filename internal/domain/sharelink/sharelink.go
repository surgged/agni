package sharelink

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/google/uuid"

	"github.com/surgged/agni/internal/domain/shared"
)

type Permission string

const (
	PermissionUse Permission = "use"
)

type ShareLink struct {
	ID             uuid.UUID            `gorm:"column:id;primaryKey;type:uuid"`
	CreatedAt      time.Time            `gorm:"column:created_at;not null"`
	AppID          uuid.UUID            `gorm:"column:app_id;not null;type:uuid"`
	RecipientEmail string               `gorm:"column:recipient_email;not null;type:TEXT"`
	Permission     Permission           `gorm:"column:permission;not null;default:'use';type:TEXT"`
	TokenHash      string               `gorm:"column:token_hash;not null;type:TEXT"`
	ExpiresAt      time.Time            `gorm:"column:expires_at;not null"`
	RevokedAt      *time.Time           `gorm:"column:revoked_at"`
	AcceptedAt     *time.Time           `gorm:"column:accepted_at"`
	events         []shared.DomainEvent `gorm:"-"`
}

func (s *ShareLink) TableName() string {
	return "share_links"
}

func NewShareLink(id, appID uuid.UUID, recipientEmail string, permission Permission, ttl time.Duration) (*ShareLink, string, error) {
	if id == uuid.Nil {
		return nil, "", ErrInvalidShareLink
	}
	if appID == uuid.Nil {
		return nil, "", ErrInvalidShareLink
	}
	if recipientEmail == "" {
		return nil, "", ErrInvalidShareLink
	}

	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return nil, "", err
	}
	plaintext := hex.EncodeToString(raw)

	hash := sha256.Sum256([]byte(plaintext))

	now := time.Now().UTC()
	s := &ShareLink{
		ID:             id,
		CreatedAt:      now,
		AppID:          appID,
		RecipientEmail: recipientEmail,
		Permission:     permission,
		TokenHash:      hex.EncodeToString(hash[:]),
		ExpiresAt:      now.Add(ttl),
	}
	s.recordEvent(ShareLinkCreated{ID: id, AppID: appID, RecipientEmail: recipientEmail, occurredAt: now})
	return s, plaintext, nil
}

func (s *ShareLink) Accept(plaintextToken string) error {
	if s.RevokedAt != nil {
		return ErrShareLinkRevoked
	}
	if time.Now().UTC().After(s.ExpiresAt) {
		return ErrShareLinkExpired
	}
	hash := sha256.Sum256([]byte(plaintextToken))
	if hex.EncodeToString(hash[:]) != s.TokenHash {
		return ErrShareLinkTokenMismatch
	}
	now := time.Now().UTC()
	s.AcceptedAt = &now
	s.recordEvent(ShareLinkAccepted{ID: s.ID, occurredAt: now})
	return nil
}

func (s *ShareLink) Revoke() error {
	if s.RevokedAt != nil {
		return ErrShareLinkRevoked
	}
	now := time.Now().UTC()
	s.RevokedAt = &now
	s.recordEvent(ShareLinkRevoked{ID: s.ID, occurredAt: now})
	return nil
}

func (s *ShareLink) IsValid() bool {
	return s.RevokedAt == nil && time.Now().UTC().Before(s.ExpiresAt)
}

func (s *ShareLink) PullEvents() []shared.DomainEvent {
	out := s.events
	s.events = nil
	return out
}

func (s *ShareLink) recordEvent(e shared.DomainEvent) {
	s.events = append(s.events, e)
}
