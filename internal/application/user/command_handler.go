package user

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/surgged/agni/internal/adapters/email"
	"github.com/surgged/agni/internal/application/uow"
	"github.com/surgged/agni/internal/domain/user"
	"github.com/surgged/agni/internal/ports"
)

// CommandHandler is the application service that mutates user aggregates
// in response to Create/Update/Delete commands.
type CommandHandler struct {
	repo        user.Repository
	uow         uow.UnitOfWork
	hasher      ports.Hasher
	emailSender email.EmailSender
}

// NewCommandHandler wires a CommandHandler against the given repository, unit of work,
// password hasher, and email sender.
func NewCommandHandler(repo user.Repository, uow uow.UnitOfWork, hasher ports.Hasher, emailSender email.EmailSender) *CommandHandler {
	return &CommandHandler{
		repo:        repo,
		uow:         uow,
		hasher:      hasher,
		emailSender: emailSender,
	}
}

func generateToken() string {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return uuid.New().String()
	}
	return hex.EncodeToString(b)
}

// HandleCreate creates a new user aggregate, persists it through the unit of work,
// and dispatches a verification email.
func (h *CommandHandler) HandleCreate(ctx context.Context, cmd CreateUserCommand) (*user.User, error) {
	id, err := uuid.Parse(cmd.ID)
	if err != nil {
		id = uuid.New()
	}
	vToken := generateToken()
	x, err := user.NewUser(id, cmd.Name, cmd.Email, cmd.Password, vToken)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
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

	if h.emailSender != nil {
		_ = h.emailSender.SendVerificationEmail(ctx, x.Email, x.Name, vToken)
	}
	return x, nil
}

// ErrInvalidCredentials is returned by HandleAuthenticate when the supplied
// email/password pair does not match a stored user.
var ErrInvalidCredentials = errors.New("invalid credentials")

// HandleAuthenticate verifies an email/password pair and checks if email is verified.
func (h *CommandHandler) HandleAuthenticate(ctx context.Context, cmd AuthenticateUserCommand) (*user.User, error) {
	u, err := h.repo.GetByEmail(ctx, cmd.Email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	if !h.hasher.Verify(u.Password, cmd.Password) {
		return nil, ErrInvalidCredentials
	}
	if !u.IsEmailVerified() {
		return nil, user.ErrEmailNotVerified
	}
	return u, nil
}

// HandleVerifyEmail verifies a user's email using the provided token.
func (h *CommandHandler) HandleVerifyEmail(ctx context.Context, cmd VerifyEmailCommand) (*user.User, error) {
	if cmd.Token == "" {
		return nil, user.ErrInvalidVerificationToken
	}
	u, err := h.repo.GetByVerificationToken(ctx, cmd.Token)
	if err != nil {
		return nil, user.ErrInvalidVerificationToken
	}
	if !u.ConfirmEmail(cmd.Token) {
		return nil, user.ErrInvalidVerificationToken
	}
	if err := h.uow.SaveAndPublish(ctx, func(ctx context.Context, repos uow.TxRepositories) error {
		return repos.Users().Save(ctx, u)
	}, u.PullEvents()); err != nil {
		return nil, fmt.Errorf("save verified user: %w", err)
	}
	return u, nil
}

// HandleResendVerification generates a new token and resends the verification email.
func (h *CommandHandler) HandleResendVerification(ctx context.Context, cmd ResendVerificationCommand) error {
	if cmd.Email == "" {
		return nil
	}
	u, err := h.repo.GetByEmail(ctx, cmd.Email)
	if err != nil {
		return nil // Avoid email enumeration
	}
	if u.IsEmailVerified() {
		return nil
	}
	newToken := generateToken()
	u.SetVerificationToken(newToken)
	if err := h.uow.SaveAndPublish(ctx, func(ctx context.Context, repos uow.TxRepositories) error {
		return repos.Users().Save(ctx, u)
	}, u.PullEvents()); err != nil {
		return fmt.Errorf("save user resend token: %w", err)
	}
	if h.emailSender != nil {
		_ = h.emailSender.SendVerificationEmail(ctx, u.Email, u.Name, newToken)
	}
	return nil
}

// HandleUpdate loads an existing user aggregate, mutates it through
// the domain's Update method, and routes the save+publish through the unit of work.
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

// HandleDelete removes a user aggregate.
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
