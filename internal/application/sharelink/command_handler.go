package sharelink

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/surgged/agni/internal/application/uow"
	domain "github.com/surgged/agni/internal/domain/sharelink"
)

type CommandHandler struct {
	repo domain.Repository
	uow  uow.UnitOfWork
}

func NewCommandHandler(repo domain.Repository, uow uow.UnitOfWork) *CommandHandler {
	return &CommandHandler{repo: repo, uow: uow}
}

func (h *CommandHandler) HandleCreate(ctx context.Context, cmd CreateShareLinkCommand) (*domain.ShareLink, string, error) {
	id, err := uuid.Parse(cmd.ID)
	if err != nil {
		return nil, "", fmt.Errorf("create share link: %w", err)
	}
	appID, err := uuid.Parse(cmd.AppID)
	if err != nil {
		return nil, "", fmt.Errorf("create share link: %w", err)
	}
	x, plaintext, err := domain.NewShareLink(id, appID, cmd.RecipientEmail, domain.Permission(cmd.Permission), 24*time.Hour)
	if err != nil {
		return nil, "", fmt.Errorf("create share link: %w", err)
	}
	if err := h.uow.SaveAndPublish(ctx, func(ctx context.Context, repos uow.TxRepositories) error {
		return repos.ShareLinks().Save(ctx, x)
	}, x.PullEvents()); err != nil {
		return nil, "", fmt.Errorf("save share link: %w", err)
	}
	return x, plaintext, nil
}

func (h *CommandHandler) HandleAccept(ctx context.Context, cmd AcceptShareLinkCommand) error {
	id, err := uuid.Parse(cmd.ID)
	if err != nil {
		return fmt.Errorf("accept share link: %w", err)
	}
	x, err := h.repo.Get(ctx, id)
	if err != nil {
		return err
	}
	if err := x.Accept(cmd.Token); err != nil {
		return fmt.Errorf("accept share link: %w", err)
	}
	if err := h.uow.SaveAndPublish(ctx, func(ctx context.Context, repos uow.TxRepositories) error {
		return repos.ShareLinks().Save(ctx, x)
	}, x.PullEvents()); err != nil {
		return fmt.Errorf("save share link: %w", err)
	}
	return nil
}

func (h *CommandHandler) HandleRevoke(ctx context.Context, cmd RevokeShareLinkCommand) error {
	id, err := uuid.Parse(cmd.ID)
	if err != nil {
		return fmt.Errorf("revoke share link: %w", err)
	}
	x, err := h.repo.Get(ctx, id)
	if err != nil {
		return err
	}
	if err := x.Revoke(); err != nil {
		return fmt.Errorf("revoke share link: %w", err)
	}
	if err := h.uow.SaveAndPublish(ctx, func(ctx context.Context, repos uow.TxRepositories) error {
		return repos.ShareLinks().Save(ctx, x)
	}, x.PullEvents()); err != nil {
		return fmt.Errorf("save share link: %w", err)
	}
	return nil
}
