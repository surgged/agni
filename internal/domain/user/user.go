package user

import (
	"github.com/google/uuid"
	"time"

	"github.com/surgged/agni/internal/domain/shared"
)

// User is the aggregate root for users. GORM tags live on
// the aggregate itself — the same struct is used as both the domain model and
// the persistence row. The constructor (NewUser) and the Update method
// remain the only sanctioned way to mutate the aggregate in the application
// layer; persistence adapters use Rehydrate to bypass validation when loading
// existing rows.
type User struct {
	ID        uuid.UUID            `gorm:"column:id;primaryKey;type:uuid"`
	CreatedAt time.Time            `gorm:"column:created_at;not null"`
	UpdatedAt time.Time            `gorm:"column:updated_at;not null"`
	Name      string               `gorm:"column:name;not null;type:TEXT"`
	Email     string               `gorm:"column:email;not null;type:TEXT"`
	Password  string               `gorm:"column:password;not null;type:TEXT"`
	events    []shared.DomainEvent `gorm:"-"`
}

func (o *User) TableName() string {
	return "users"
}

// NewUser constructs a new User aggregate, validates its
// invariants, and records a UserCreated event. Callers must persist
// the aggregate (via Repository.Save) and then call PullEvents to dispatch
// the recorded event through the application's event bus.
func NewUser(id uuid.UUID, name string, email string, password string) (*User, error) {
	if id == uuid.Nil {
		return nil, ErrInvalidUserID
	}
	if name == "" {
		return nil, ErrInvalidUser
	}
	if email == "" {
		return nil, ErrInvalidUser
	}
	if password == "" {
		return nil, ErrInvalidUser
	}
	now := time.Now().UTC()
	o := &User{
		ID:        id,
		CreatedAt: now,
		UpdatedAt: now,
		Name:      name,
		Email:     email,
		Password:  password,
	}
	o.recordEvent(UserCreated{
		ID:         id,
		occurredAt: now,
	})
	return o, nil
}

// Update replaces the aggregate's mutable fields and records a
// UserUpdated event. Callers must Save the aggregate afterwards and
// then publish the pulled events.
func (o *User) Update(name string, email string, password string) {
	now := time.Now().UTC()
	o.Name = name
	o.Email = email
	o.Password = password
	o.UpdatedAt = now
	o.recordEvent(UserUpdated{
		ID:         o.ID,
		occurredAt: now,
	})
}

// SetTimestamps overwrites the lifecycle timestamps. Used by the persistence
// layer to rehydrate an aggregate from a row whose created_at and updated_at
// columns were set at write time.
func (o *User) SetTimestamps(created, updated time.Time) {
	o.CreatedAt = created
	o.UpdatedAt = updated
}

// Rehydrate reconstructs an aggregate from a persistence row, bypassing the
// validation done by NewUser. It is intended for use by the GORM
// and in-memory adapters only. Callers must guarantee that id is non-zero.
func Rehydrate(id uuid.UUID, name string, email string, password string, created, updated time.Time) *User {
	return &User{
		ID:        id,
		CreatedAt: created,
		UpdatedAt: updated,
		Name:      name,
		Email:     email,
		Password:  password,
	}
}

// MarkDeleted records a UserDeleted event on the aggregate. The
// application service is responsible for calling Repository.Delete afterwards
// and then publishing the pulled events.
func (o *User) MarkDeleted() {
	o.recordEvent(UserDeleted{
		ID:         o.ID,
		occurredAt: time.Now().UTC(),
	})
}

// PullEvents returns the events recorded on the aggregate since the last
// call and clears the internal buffer.
func (o *User) PullEvents() []shared.DomainEvent {
	out := o.events
	o.events = nil
	return out
}

// recordEvent appends a domain event to the aggregate's internal buffer.
func (o *User) recordEvent(e shared.DomainEvent) {
	o.events = append(o.events, e)
}
