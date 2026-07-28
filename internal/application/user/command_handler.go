package user

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"errors"
	"github.com/surgged/agni/internal/application/uow"
	"github.com/surgged/agni/internal/domain/user"
	"github.com/surgged/agni/internal/ports"
)

// CommandHandler is the application service that mutates user aggregates
// in response to Create/Update/Delete commands. It depends only on the
// domain Repository port (for reads) and a UnitOfWork that wraps the
// save+publish atomicity boundary and provides transaction-scoped
// repositories for writes.
type CommandHandler struct {
	repo   user.Repository
	uow    uow.UnitOfWork
	hasher ports.Hasher
}

// NewCommandHandler wires a CommandHandler against the given repository and
// unit of work.
func NewCommandHandler(repo user.Repository, uow uow.UnitOfWork, hasher ports.Hasher) *CommandHandler {
	return &CommandHandler{repo: repo, uow: uow, hasher: hasher}
}

// HandleCreate creates a new user aggregate, persists it through the
// unit of work, and the UoW publishes the events it recorded during
// construction.
func (h *CommandHandler) HandleCreate(ctx context.Context, cmd CreateUserCommand) (*user.User, error) {
	id, err := uuid.Parse(cmd.ID)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	x, err := user.NewUser(id, cmd.Name, cmd.Email, cmd.Password)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	// When a password is supplied, hash it through the Hasher port and store
	// only the hash on the aggregate. The plaintext never leaves this method.
	if cmd.Password != "" {
		hash, hashErr := h.hasher.Hash(cmd.Password)
		if hashErr != nil {
			return nil, fmt.Errorf("create user: hash password: %w", hashErr)
		}
		x.Password = hash
	}
	if err := h.uow.SaveAndPublish(ctx, func(ctx context.Context, repos uow.TxRepositories) error {
		return repos.Users().Save(ctx, x)
	}, x.PullEvents()); err != nil {
		return nil, fmt.Errorf("save user: %w", err)
	}
	return x, nil
}

// ErrInvalidCredentials is returned by HandleAuthenticate when the supplied
// email/password pair does not match a stored user. It is deliberately vague
// so callers cannot distinguish "no such user" from "wrong password".
var ErrInvalidCredentials = errors.New("invalid credentials")

// HandleAuthenticate verifies an email/password pair and returns the matching
// user aggregate. It returns ErrInvalidCredentials for both an unknown
// email and a wrong password so the two cases are indistinguishable.
func (h *CommandHandler) HandleAuthenticate(ctx context.Context, cmd AuthenticateUserCommand) (*user.User, error) {
	u, err := h.repo.GetByEmail(ctx, cmd.Email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	if !h.hasher.Verify(u.Password, cmd.Password) {
		return nil, ErrInvalidCredentials
	}
	return u, nil
}

// HandleUpdate loads an existing user aggregate, mutates it through
// the domain's Update method, and routes the save+publish through the unit
// of work so the write and recorded event are committed atomically.
func (h *CommandHandler) HandleUpdate(ctx context.Context, cmd UpdateUserCommand) (*user.User, error) {
	id, err := uuid.Parse(cmd.ID)
	if err != nil {
		return nil, fmt.Errorf("update user: %w", err)
	}
	x, err := h.repo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	x.Update(cmd.Name, cmd.Email, cmd.Password)
	if err := h.uow.SaveAndPublish(ctx, func(ctx context.Context, repos uow.TxRepositories) error {
		return repos.Users().Save(ctx, x)
	}, x.PullEvents()); err != nil {
		return nil, fmt.Errorf("save user: %w", err)
	}
	return x, nil
}

// HandleDelete removes a user aggregate. The delete is routed through
// the unit of work so the deletion and its recorded event are committed
// atomically.
func (h *CommandHandler) HandleDelete(ctx context.Context, cmd DeleteUserCommand) error {
	id, err := uuid.Parse(cmd.ID)
	if err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	x, err := h.repo.Get(ctx, id)
	if err != nil {
		return err
	}
	x.MarkDeleted()
	if err := h.uow.SaveAndPublish(ctx, func(ctx context.Context, repos uow.TxRepositories) error {
		return repos.Users().Delete(ctx, id)
	}, x.PullEvents()); err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	return nil
}
