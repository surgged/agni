package app

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/surgged/agni/internal/application/uow"
	domain "github.com/surgged/agni/internal/domain/app"
)

type CommandHandler struct {
	repo domain.Repository
	uow  uow.UnitOfWork
}

func NewCommandHandler(repo domain.Repository, uow uow.UnitOfWork) *CommandHandler {
	return &CommandHandler{repo: repo, uow: uow}
}

func (h *CommandHandler) HandleCreate(ctx context.Context, cmd CreateAppCommand) (*domain.App, error) {
	id, err := uuid.Parse(cmd.ID)
	if err != nil {
		return nil, fmt.Errorf("create app: %w", err)
	}
	x, err := domain.NewApp(id, cmd.OwnerEmail, cmd.Name)
	if err != nil {
		return nil, fmt.Errorf("create app: %w", err)
	}
	if err := h.uow.SaveAndPublish(ctx, func(ctx context.Context, repos uow.TxRepositories) error {
		return repos.Apps().Save(ctx, x)
	}, x.PullEvents()); err != nil {
		return nil, fmt.Errorf("save app: %w", err)
	}
	return x, nil
}

func (h *CommandHandler) HandleQueueDeploy(ctx context.Context, cmd QueueDeployCommand) error {
	id, err := uuid.Parse(cmd.ID)
	if err != nil {
		return fmt.Errorf("queue deploy: %w", err)
	}
	x, err := h.repo.Get(ctx, id)
	if err != nil {
		return err
	}
	if err := x.Queue(cmd.ArchiveKey, cmd.Slug, cmd.Port); err != nil {
		return fmt.Errorf("queue deploy: %w", err)
	}
	if err := h.uow.SaveAndPublish(ctx, func(ctx context.Context, repos uow.TxRepositories) error {
		return repos.Apps().Save(ctx, x)
	}, x.PullEvents()); err != nil {
		return fmt.Errorf("save app: %w", err)
	}
	return nil
}

func (h *CommandHandler) HandleRetryDeploy(ctx context.Context, cmd RetryDeployCommand) error {
	id, err := uuid.Parse(cmd.ID)
	if err != nil {
		return fmt.Errorf("retry deploy: %w", err)
	}
	x, err := h.repo.Get(ctx, id)
	if err != nil {
		return err
	}
	if err := x.Retry(); err != nil {
		return fmt.Errorf("retry deploy: %w", err)
	}
	if err := h.uow.SaveAndPublish(ctx, func(ctx context.Context, repos uow.TxRepositories) error {
		return repos.Apps().Save(ctx, x)
	}, x.PullEvents()); err != nil {
		return fmt.Errorf("save app: %w", err)
	}
	return nil
}

func (h *CommandHandler) HandleMarkBuilding(ctx context.Context, cmd MarkBuildingCommand) error {
	id, err := uuid.Parse(cmd.ID)
	if err != nil {
		return fmt.Errorf("mark building: %w", err)
	}
	x, err := h.repo.Get(ctx, id)
	if err != nil {
		return err
	}
	if err := x.MarkBuilding(); err != nil {
		return fmt.Errorf("mark building: %w", err)
	}
	if err := h.uow.SaveAndPublish(ctx, func(ctx context.Context, repos uow.TxRepositories) error {
		return repos.Apps().Save(ctx, x)
	}, x.PullEvents()); err != nil {
		return fmt.Errorf("save app: %w", err)
	}
	return nil
}

func (h *CommandHandler) HandleMarkDeploying(ctx context.Context, cmd MarkDeployingCommand) error {
	id, err := uuid.Parse(cmd.ID)
	if err != nil {
		return fmt.Errorf("mark deploying: %w", err)
	}
	x, err := h.repo.Get(ctx, id)
	if err != nil {
		return err
	}
	if err := x.MarkDeploying(cmd.ImageRef, cmd.PodName); err != nil {
		return fmt.Errorf("mark deploying: %w", err)
	}
	if err := h.uow.SaveAndPublish(ctx, func(ctx context.Context, repos uow.TxRepositories) error {
		return repos.Apps().Save(ctx, x)
	}, x.PullEvents()); err != nil {
		return fmt.Errorf("save app: %w", err)
	}
	return nil
}

func (h *CommandHandler) HandleMarkLive(ctx context.Context, cmd MarkLiveCommand) error {
	id, err := uuid.Parse(cmd.ID)
	if err != nil {
		return fmt.Errorf("mark live: %w", err)
	}
	x, err := h.repo.Get(ctx, id)
	if err != nil {
		return err
	}
	if err := x.MarkLive(cmd.ServiceURL, cmd.ShareURL); err != nil {
		return fmt.Errorf("mark live: %w", err)
	}
	if err := h.uow.SaveAndPublish(ctx, func(ctx context.Context, repos uow.TxRepositories) error {
		return repos.Apps().Save(ctx, x)
	}, x.PullEvents()); err != nil {
		return fmt.Errorf("save app: %w", err)
	}
	return nil
}

func (h *CommandHandler) HandleMarkFailed(ctx context.Context, cmd MarkFailedCommand) error {
	id, err := uuid.Parse(cmd.ID)
	if err != nil {
		return fmt.Errorf("mark failed: %w", err)
	}
	x, err := h.repo.Get(ctx, id)
	if err != nil {
		return err
	}
	if err := x.MarkFailed(cmd.Step, cmd.Reason); err != nil {
		return fmt.Errorf("mark failed: %w", err)
	}
	if err := h.uow.SaveAndPublish(ctx, func(ctx context.Context, repos uow.TxRepositories) error {
		return repos.Apps().Save(ctx, x)
	}, x.PullEvents()); err != nil {
		return fmt.Errorf("save app: %w", err)
	}
	return nil
}

func (h *CommandHandler) HandleDestroy(ctx context.Context, cmd DestroyAppCommand) error {
	id, err := uuid.Parse(cmd.ID)
	if err != nil {
		return fmt.Errorf("destroy app: %w", err)
	}
	x, err := h.repo.Get(ctx, id)
	if err != nil {
		return err
	}
	if err := x.Destroy(); err != nil {
		return fmt.Errorf("destroy app: %w", err)
	}
	if err := h.uow.SaveAndPublish(ctx, func(ctx context.Context, repos uow.TxRepositories) error {
		return repos.Apps().Delete(ctx, id)
	}, x.PullEvents()); err != nil {
		return fmt.Errorf("delete app: %w", err)
	}
	return nil
}
