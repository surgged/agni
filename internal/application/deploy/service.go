package deploy

import (
	"context"
	"fmt"
	"log/slog"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"

	appapp "github.com/surgged/agni/internal/application/app"
	domain "github.com/surgged/agni/internal/domain/app"
	"github.com/surgged/agni/internal/ports"
)

type Service struct {
	archivestore      ports.ArchiveStore
	imagebuilder      ports.ImageBuilder
	provider          ports.ContainerProvider
	orchestrator      ports.Orchestrator
	appCmd            *appapp.CommandHandler
	appQry            *appapp.QueryHandler
	domain            string
	registryURL       string
	maxRunningPerUser int
}

type ServiceConfig struct {
	ArchiveStore      ports.ArchiveStore
	ImageBuilder      ports.ImageBuilder
	Provider          ports.ContainerProvider
	Orchestrator      ports.Orchestrator
	AppCmd            *appapp.CommandHandler
	AppQry            *appapp.QueryHandler
	Domain            string
	RegistryURL       string
	MaxRunningPerUser int
}

func NewService(cfg ServiceConfig) *Service {
	if cfg.Domain == "" {
		cfg.Domain = "agni.dev"
	}
	if cfg.MaxRunningPerUser <= 0 {
		cfg.MaxRunningPerUser = 1
	}
	return &Service{
		archivestore:      cfg.ArchiveStore,
		imagebuilder:      cfg.ImageBuilder,
		provider:          cfg.Provider,
		orchestrator:      cfg.Orchestrator,
		appCmd:            cfg.AppCmd,
		appQry:            cfg.AppQry,
		domain:            cfg.Domain,
		registryURL:       cfg.RegistryURL,
		maxRunningPerUser: cfg.MaxRunningPerUser,
	}
}

type CreateUploadResult struct {
	App       *domain.App
	UploadURL string
	ExpiresAt string
}

func (s *Service) CreateUpload(ctx context.Context, ownerEmail, name string, port int32, runtime string) (*CreateUploadResult, error) {
	if s.maxRunningPerUser > 0 {
		apps, err := s.appQry.HandleListByOwner(ctx, appapp.ListByOwnerQuery{OwnerEmail: ownerEmail})
		if err == nil {
			running := 0
			for _, a := range apps {
				if a.Status != domain.StatusFailed && a.Status != domain.StatusDestroyed {
					running++
				}
			}
			if running >= s.maxRunningPerUser {
				return nil, domain.ErrQuotaExceeded
			}
		}
	}

	appID := uuid.New()
	x, err := s.appCmd.HandleCreate(ctx, appapp.CreateAppCommand{
		ID:         appID.String(),
		OwnerEmail: ownerEmail,
		Name:       name,
	})
	if err != nil {
		return nil, fmt.Errorf("create upload: %w", err)
	}

	archiveKey := archiveKey(appID.String())
	uploadURL, err := s.archivestore.PresignedPutURL(ctx, archiveKey, 15*time.Minute)
	if err != nil {
		return nil, fmt.Errorf("create upload: presign: %w", err)
	}

	return &CreateUploadResult{
		App:       x,
		UploadURL: uploadURL,
		ExpiresAt: "15m",
	}, nil
}

func (s *Service) StartDeploy(ctx context.Context, appID string) error {
	id, err := uuid.Parse(appID)
	if err != nil {
		return fmt.Errorf("start deploy: parse id: %w", err)
	}

	appObj, err := s.appQry.HandleGet(ctx, appapp.GetAppQuery{ID: appID})
	if err != nil {
		return err
	}

	archiveKey := archiveKey(appID)
	_, ok, err := s.archivestore.Head(ctx, archiveKey)
	if err != nil {
		return fmt.Errorf("start deploy: head archive: %w", err)
	}
	if !ok {
		return domain.ErrArchiveMissing
	}

	slug := domain.NewSlug(appObj.Name, id)

	port := appObj.Port
	if port == 0 {
		port = 8080
	}

	runtime := appObj.Runtime
	if runtime == "" {
		runtime = "kata"
	}

	if err := s.appCmd.HandleQueueDeploy(ctx, appapp.QueueDeployCommand{
		ID:         appID,
		ArchiveKey: archiveKey,
		Slug:       slug,
		Port:       port,
		Runtime:    runtime,
	}); err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			slug = domain.NewSlug(appObj.Name+"-2", id)
			if err2 := s.appCmd.HandleQueueDeploy(ctx, appapp.QueueDeployCommand{
				ID:         appID,
				ArchiveKey: archiveKey,
				Slug:       slug,
				Port:       port,
				Runtime:    runtime,
			}); err2 != nil {
				return fmt.Errorf("start deploy: queue deploy (retry): %w", err2)
			}
		} else {
			return fmt.Errorf("start deploy: queue deploy: %w", err)
		}
	}

	if s.orchestrator != nil {
		if err := s.orchestrator.StartDeployment(ctx, ports.DeploymentInput{
			AppID:        appID,
			ArchiveKey:   archiveKey,
			Slug:         slug,
			PortOverride: port,
			Runtime:      runtime,
		}); err != nil {
			return fmt.Errorf("start deploy: orchestrator: %w", err)
		}
	} else {
		slog.Warn("orchestrator is nil, deployment queued but will not be processed", "app_id", appID)
	}

	return nil
}

func (s *Service) Retry(ctx context.Context, appID string) error {
	if err := s.appCmd.HandleRetryDeploy(ctx, appapp.RetryDeployCommand{ID: appID}); err != nil {
		return fmt.Errorf("retry: %w", err)
	}

	appObj, err := s.appQry.HandleGet(ctx, appapp.GetAppQuery{ID: appID})
	if err != nil {
		return err
	}

	if s.orchestrator != nil {
		if err := s.orchestrator.StartDeployment(ctx, ports.DeploymentInput{
			AppID:        appID,
			ArchiveKey:   appObj.ArchiveKey,
			Slug:         appObj.Slug,
			PortOverride: appObj.Port,
			Runtime:      appObj.Runtime,
		}); err != nil {
			return fmt.Errorf("retry: orchestrator: %w", err)
		}
	}
	return nil
}

func (s *Service) Destroy(ctx context.Context, appID string) error {
	if s.orchestrator != nil {
		_ = s.orchestrator.CancelDeployment(ctx, appID)
	}

	podName := fmt.Sprintf("app-%s", appID)
	_ = s.provider.Destroy(ctx, podName)

	appObj, err := s.appQry.HandleGet(ctx, appapp.GetAppQuery{ID: appID})
	if err == nil && appObj.ArchiveKey != "" {
		_ = s.archivestore.Delete(ctx, appObj.ArchiveKey)
	}

	return s.appCmd.HandleDestroy(ctx, appapp.DestroyAppCommand{ID: appID})
}

var urlSanitizeRE = regexp.MustCompile(`(https?://[^:]*:)[^@]+(@)`)

func SanitizeUserError(err error) string {
	msg := err.Error()
	msg = urlSanitizeRE.ReplaceAllString(msg, "${1}***${2}")
	return msg
}

// PresignedUploadURL generates a fresh presigned URL for an existing app.
func (s *Service) PresignedUploadURL(ctx context.Context, appID string) (string, error) {
	appObj, err := s.appQry.HandleGet(ctx, appapp.GetAppQuery{ID: appID})
	if err != nil {
		return "", err
	}
	return s.archivestore.PresignedPutURL(ctx, appObj.ArchiveKey, 15*time.Minute)
}

func (s *Service) GetApp(ctx context.Context, appID string) (*domain.App, error) {
	return s.appQry.HandleGet(ctx, appapp.GetAppQuery{ID: appID})
}

func (s *Service) ListApps(ctx context.Context, ownerEmail string) ([]*domain.App, error) {
	if ownerEmail != "" {
		return s.appQry.HandleListByOwner(ctx, appapp.ListByOwnerQuery{OwnerEmail: ownerEmail})
	}
	return s.appQry.HandleList(ctx, appapp.ListAppsQuery{})
}

func (s *Service) BuildImageRef(appID string) string {
	return fmt.Sprintf("%s/apps/%s:latest", s.registryURL, appID)
}

func (s *Service) BuildServiceURL(slug string) string {
	return fmt.Sprintf("https://%s.%s", slug, s.domain)
}

func (s *Service) SetOrchestrator(orch ports.Orchestrator) {
	s.orchestrator = orch
}

// ---------------------------------------------------------------------------
// Multipart upload — for files > 100 MB.
// ---------------------------------------------------------------------------

// CreateMultipartUpload starts a multipart upload and returns presigned URLs
// for each part. totalSize is the full file size in bytes.
func (s *Service) CreateMultipartUpload(ctx context.Context, appID string, totalSize int64) (*ports.MultipartUploadInit, error) {
	appObj, err := s.appQry.HandleGet(ctx, appapp.GetAppQuery{ID: appID})
	if err != nil {
		return nil, err
	}
	key := appObj.ArchiveKey
	if key == "" {
		key = archiveKey(appID)
	}

	partSize := int64(50 * 1024 * 1024) // 50 MB per part
	uploadID, parts, err := s.archivestore.CreateMultipartUpload(ctx, key, totalSize, partSize, 15*time.Minute)
	if err != nil {
		return nil, fmt.Errorf("create multipart upload: %w", err)
	}

	return &ports.MultipartUploadInit{
		UploadID:   uploadID,
		ArchiveKey: key,
		Parts:      parts,
	}, nil
}

// CompleteMultipartUpload finalizes a multipart upload by assembling all parts.
func (s *Service) CompleteMultipartUpload(ctx context.Context, appID string, uploadID string, parts []ports.UploadedPart) error {
	appObj, err := s.appQry.HandleGet(ctx, appapp.GetAppQuery{ID: appID})
	if err != nil {
		return err
	}
	key := appObj.ArchiveKey
	if key == "" {
		key = archiveKey(appID)
	}

	return s.archivestore.CompleteMultipartUpload(ctx, key, uploadID, parts)
}

// AbortMultipartUpload cancels an incomplete multipart upload.
func (s *Service) AbortMultipartUpload(ctx context.Context, appID string, uploadID string) error {
	appObj, err := s.appQry.HandleGet(ctx, appapp.GetAppQuery{ID: appID})
	if err != nil {
		return err
	}
	key := appObj.ArchiveKey
	if key == "" {
		key = archiveKey(appID)
	}

	return s.archivestore.AbortMultipartUpload(ctx, key, uploadID)
}

func archiveKey(appID string) string {
	return fmt.Sprintf("apps/%s/src", appID)
}
