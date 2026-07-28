# Domain Layer

`internal/domain/<agg>/` holds pure business logic. No framework imports, no
`json:`/`validate:` tags, no I/O. A domain package typically contains:

```
<agg>.go        aggregate root: fields, constructor, behaviour, event recording
errors.go       sentinel errors (ErrXxxNotFound, ErrInvalidXxx)
events.go       domain events implementing shared.DomainEvent
repository.go    Repository interface + //go:generate mockgen directive
<vo>.go          value objects (Email, Password, …) with validation in the constructor
```

## Aggregate root

- The aggregate owns its invariants. Enforce them in the constructor and in each
  mutating method — an aggregate can never exist in an invalid state.
- Carry `gorm:"column:..."` tags for persistence mapping and a `TableName()`
  method. Keep an unexported `events []shared.DomainEvent` field tagged
  `gorm:"-"` so GORM ignores it.
- Provide explicit rehydration setters (`SetPasswordHash`, `SetTimestamps`) the
  persistence layer uses when loading a row — don't expose raw field mutation.
- Use `time.Now().UTC()` for timestamps. Use `github.com/google/uuid` for IDs.

```go
package user

type User struct {
	ID        uuid.UUID            `gorm:"column:id;primaryKey;type:uuid"`
	CreatedAt time.Time            `gorm:"column:created_at;not null;default:current_timestamp"`
	UpdatedAt time.Time            `gorm:"column:updated_at;not null;default:current_timestamp"`
	Name      string               `gorm:"column:name;not null"`
	Email     string               `gorm:"column:email;not null;unique"`
	events    []shared.DomainEvent `gorm:"-"`
}

func NewUser(id uuid.UUID, name, email string) (*User, error) {
	if id == uuid.Nil {
		return nil, ErrInvalidUserID
	}
	if name == "" || email == "" {
		return nil, ErrInvalidUser
	}
	now := time.Now().UTC()
	u := &User{ID: id, Name: name, Email: email, CreatedAt: now, UpdatedAt: now}
	u.recordEvent(UserCreated{ID: id, occurredAt: now})
	return u, nil
}

func (u *User) Update(name, email string) {
	now := time.Now().UTC()
	u.Name, u.Email, u.UpdatedAt = name, email, now
	u.recordEvent(UserUpdated{ID: u.ID, occurredAt: now})
}

func (u *User) MarkDeleted() { u.recordEvent(UserDeleted{ID: u.ID, occurredAt: time.Now().UTC()}) }

func (u *User) PullEvents() []shared.DomainEvent { out := u.events; u.events = nil; return out }
func (u *User) recordEvent(e shared.DomainEvent) { u.events = append(u.events, e) }
func (u *User) TableName() string { return "users" }
```

Mutating methods record an event; `PullEvents` drains the buffer for the UoW.
`MarkDeleted` only records the event — the handler still calls `repo.Delete`.

## Value objects

Encapsulate a validated primitive. Construct via a `New…` function that returns
`(VO, error)`; keep the raw value unexported. Value objects are immutable.

```go
type Email struct{ value string }

func NewEmail(s string) (Email, error) {
	v := strings.ToLower(strings.TrimSpace(s))
	if v == "" || !strings.Contains(v, "@") || !strings.Contains(v, ".") {
		return Email{}, ErrInvalidEmail
	}
	return Email{value: v}, nil
}
func (e Email) String() string { return e.value }
```

Secrets-as-VOs (e.g. `Password`) must never expose plaintext. Hash in the
constructor (`bcrypt.GenerateFromPassword`), store only the hash, and offer an
`Authenticate(plaintext) bool` predicate. Provide a `…FromHash` constructor for
rehydration from the DB.

## Domain events

Implement `shared.DomainEvent` (`EventName() string`, `OccurredAt() time.Time`).
Keep the timestamp field unexported; expose it through the method. Use stable,
dotted, past-tense names: `user.created`, `user.updated`, `user.deleted`.

```go
type UserCreated struct {
	ID         uuid.UUID
	occurredAt time.Time
}

func (UserCreated) EventName() string      { return "user.created" }
func (e UserCreated) OccurredAt() time.Time { return e.occurredAt }
```

Events are JSON-encoded by `shared.EncodeEvent` into an envelope for the outbox,
so exported fields become the serialized body.

## Sentinel errors

Define with `errors.New` in `errors.go`. Two families:
`ErrXxxNotFound` (repository miss → 404 at the edge) and `ErrInvalidXxx` /
`ErrInvalidXxxID` (invariant violation → 422/400). Callers compare with
`errors.Is`; never compare error strings.

```go
var ErrUserNotFound  = errors.New("user not found")
var ErrInvalidUser   = errors.New("invalid user")
var ErrInvalidUserID = errors.New("invalid user id")
```

## Repository interface

The port lives with the domain. Methods take `ctx` first and speak in aggregate
types. Add the `mockgen` directive so `go generate ./...` produces the mock into
`internal/mocks`.

```go
//go:generate mockgen -destination=../../mocks/mock_user_repository.go -package=mocks -mock_names=Repository=MockUserRepository github.com/surgged/edge/internal/domain/user Repository

type Repository interface {
	Save(ctx context.Context, u *User) error
	Get(ctx context.Context, id uuid.UUID) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	List(ctx context.Context) ([]*User, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
```

Document that `Get`/`Delete` return `ErrXxxNotFound` on a miss — the adapter is
responsible for that mapping, and handlers rely on it.
