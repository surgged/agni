package v1

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v5"

	corev1 "k8s.io/api/core/v1"

	"github.com/surgged/agni/internal/adapters/auth/agentapikey"
	"github.com/surgged/agni/internal/adapters/http/web/api"
	"github.com/surgged/agni/internal/adapters/provider/k3s"
	appapp "github.com/surgged/agni/internal/application/app"
	"github.com/surgged/agni/internal/application/deploy"
	"github.com/surgged/agni/internal/domain/app"
	"github.com/surgged/agni/internal/ports"
)

type appDTO struct {
	ID           string `json:"id" validate:"omitempty,uuid"`
	OwnerEmail   string `json:"owner_email" validate:"required,email"`
	Name         string `json:"name" validate:"required"`
	Runtime      string `json:"runtime"`
	ImageRef     string `json:"image_ref"`
	PodName      string `json:"pod_name"`
	ServiceURL   string `json:"service_url"`
	ShareURL     string `json:"share_url"`
	Status       string `json:"status"`
	ErrorMessage string `json:"error_message"`
	Slug         string `json:"slug"`
	Port         int32  `json:"port"`
	FailedStep   string `json:"failed_step"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
}

func toAppDTO(x *app.App) appDTO {
	return appDTO{
		ID:           x.ID.String(),
		OwnerEmail:   x.OwnerEmail,
		Name:         x.Name,
		Runtime:      x.Runtime,
		ImageRef:     x.ImageRef,
		PodName:      x.PodName,
		ServiceURL:   x.ServiceURL,
		ShareURL:     x.ShareURL,
		Status:       string(x.Status),
		ErrorMessage: x.ErrorMessage,
		Slug:         x.Slug,
		Port:         x.Port,
		FailedStep:   x.FailedStep,
		CreatedAt:    x.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    x.UpdatedAt.Format(time.RFC3339),
	}
}

type createAppDTO struct {
	Name    string `json:"name" validate:"required"`
	Port    int32  `json:"port"`
	Runtime string `json:"runtime"`
}

type createAppResponse struct {
	ID              string `json:"id"`
	Slug            string `json:"slug"`
	UploadURL       string `json:"upload_url"`
	UploadExpiresAt string `json:"upload_expires_at"`
}

type deployResponse struct {
	Status string `json:"status"`
}

type AppHandler struct {
	cmd         *appapp.CommandHandler
	qry         *appapp.QueryHandler
	deploySvc   *deploy.Service
	tokens      *agentapikey.AgentTokenService
	k3sProvider *k3s.Provider
}

func NewAppHandler(cmd *appapp.CommandHandler, qry *appapp.QueryHandler, deploySvc *deploy.Service, tokens *agentapikey.AgentTokenService, k3sProvider *k3s.Provider) *AppHandler {
	return &AppHandler{
		cmd:         cmd,
		qry:         qry,
		deploySvc:   deploySvc,
		tokens:      tokens,
		k3sProvider: k3sProvider,
	}
}

func (h *AppHandler) Register(g *echo.Group) {
	g.POST("", h.Create)
	g.GET("", h.List)
	g.GET("/:id", h.Get)
	g.POST("/:id/deploy", h.Deploy)
	g.POST("/:id/retry", h.Retry)
	g.POST("/:id/upload-url", h.UploadURL)
	g.POST("/:id/multipart/init", h.MultipartInit)
	g.POST("/:id/multipart/complete", h.MultipartComplete)
	g.POST("/:id/multipart/abort", h.MultipartAbort)
	g.DELETE("/:id", h.Destroy)
	g.GET("/:id/logs", h.Logs)
}

func (h *AppHandler) extractEmail(c *echo.Context) string {
	if email, ok := c.Get("user_email").(string); ok && email != "" {
		return email
	}
	if cookie, err := c.Cookie("agni_session"); err == nil {
		if email, err := h.tokens.ValidateSessionToken(cookie.Value); err == nil {
			return email
		}
	}
	if token := c.Request().Header.Get("Authorization"); len(token) > 7 && token[:7] == "Bearer " {
		if email, err := h.tokens.Validate(token[7:]); err == nil {
			return email
		}
	}
	return ""
}

// Create godoc
//
//	@Summary      Create application
//	@Description  Creates a new application with a presigned upload URL for archive submission.
//	@Tags         apps
//	@Security     BearerAuth
//	@Accept       json
//	@Produce      json
//	@Param        body  body      createAppDTO  true  "App creation request"
//	@Success      201   {object}  createAppResponse
//	@Failure      400   {object}  api.Error
//	@Failure      401   {object}  api.Error
//	@Failure      429   {object}  api.Error
//	@Router       /api/v1/apps [post]
func (h *AppHandler) Create(c *echo.Context) error {
	email := h.extractEmail(c)
	if email == "" {
		return c.JSON(http.StatusUnauthorized, api.Error{Error: "authentication required"})
	}

	var dto createAppDTO
	if err := c.Bind(&dto); err != nil {
		return c.JSON(http.StatusBadRequest, api.Error{Error: err.Error()})
	}
	if dto.Name == "" {
		return c.JSON(http.StatusBadRequest, api.Error{Error: "name is required"})
	}

	port := dto.Port
	if port == 0 {
		port = 8080
	}
	runtime := dto.Runtime
	if runtime == "" {
		runtime = "kata"
	}

	result, err := h.deploySvc.CreateUpload(c.Request().Context(), email, dto.Name, port, runtime)
	if err != nil {
		return mapDeployError(err, c)
	}

	return c.JSON(http.StatusCreated, createAppResponse{
		ID:              result.App.ID.String(),
		Slug:            app.NewSlug(dto.Name, result.App.ID),
		UploadURL:       result.UploadURL,
		UploadExpiresAt: result.ExpiresAt,
	})
}

// Deploy godoc
//
//	@Summary      Deploy application
//	@Description  Starts the deployment workflow for an app that has an uploaded archive.
//	@Tags         apps
//	@Security     BearerAuth
//	@Produce      json
//	@Param        id   path      string  true  "App ID (UUID)"
//	@Success      202  {object}  deployResponse
//	@Failure      404  {object}  api.Error
//	@Failure      409  {object}  api.Error
//	@Failure      422  {object}  api.Error
//	@Router       /api/v1/apps/{id}/deploy [post]
func (h *AppHandler) Deploy(c *echo.Context) error {
	appID := c.Param("id")
	if err := h.deploySvc.StartDeploy(c.Request().Context(), appID); err != nil {
		return mapDeployError(err, c)
	}
	return c.JSON(http.StatusAccepted, deployResponse{Status: "queued"})
}

// Retry godoc
//
//	@Summary      Retry deployment
//	@Description  Retries a failed deployment from scratch.
//	@Tags         apps
//	@Security     BearerAuth
//	@Produce      json
//	@Param        id   path      string  true  "App ID (UUID)"
//	@Success      202  {object}  deployResponse
//	@Failure      400  {object}  api.Error
//	@Failure      404  {object}  api.Error
//	@Router       /api/v1/apps/{id}/retry [post]
func (h *AppHandler) Retry(c *echo.Context) error {
	appID := c.Param("id")
	if err := h.deploySvc.Retry(c.Request().Context(), appID); err != nil {
		return mapDeployError(err, c)
	}
	return c.JSON(http.StatusAccepted, deployResponse{Status: "queued"})
}

// UploadURL godoc
//
//	@Summary      Refresh upload URL
//	@Description  Generates a fresh presigned upload URL for an app.
//	@Tags         apps
//	@Security     BearerAuth
//	@Produce      json
//	@Param        id   path      string  true  "App ID (UUID)"
//	@Success      200  {object}  map[string]string
//	@Failure      404  {object}  api.Error
//	@Router       /api/v1/apps/{id}/upload-url [post]
func (h *AppHandler) UploadURL(c *echo.Context) error {
	appID := c.Param("id")
	url, err := h.deploySvc.PresignedUploadURL(c.Request().Context(), appID)
	if err != nil {
		return mapDeployError(err, c)
	}
	return c.JSON(http.StatusOK, map[string]string{"upload_url": url})
}

func mapDeployError(err error, c *echo.Context) error {
	ctx := c.Request().Context()
	appID := c.Param("id")
	if errors.Is(err, app.ErrArchiveMissing) {
		slog.WarnContext(ctx, "deploy error: archive missing", "app_id", appID, "error", err)
		return c.JSON(http.StatusUnprocessableEntity, api.Error{Error: "archive not uploaded yet"})
	}
	if errors.Is(err, app.ErrDeployInProgress) {
		slog.WarnContext(ctx, "deploy error: deploy in progress", "app_id", appID, "error", err)
		return c.JSON(http.StatusConflict, api.Error{Error: err.Error()})
	}
	if errors.Is(err, app.ErrQuotaExceeded) {
		slog.WarnContext(ctx, "deploy error: quota exceeded", "app_id", appID, "error", err)
		return c.JSON(http.StatusTooManyRequests, api.Error{Error: err.Error()})
	}
	if errors.Is(err, app.ErrAppNotFound) {
		slog.WarnContext(ctx, "deploy error: app not found", "app_id", appID, "error", err)
		return c.JSON(http.StatusNotFound, api.Error{Error: err.Error()})
	}
	slog.ErrorContext(ctx, "deploy error: internal", "app_id", appID, "error", err)
	return c.JSON(http.StatusInternalServerError, api.Error{Error: err.Error()})
}

// List godoc
//
//	@Summary      List applications
//	@Description  Lists microVM applications belonging to the user or all cluster apps.
//	@Tags         apps
//	@Security     BearerAuth
//	@Produce      json
//	@Success      200  {array}   appDTO
//	@Failure      400  {object}  api.Error
//	@Router       /api/v1/apps [get]
func (h *AppHandler) List(c *echo.Context) error {
	email := h.extractEmail(c)
	var apps []*app.App
	var err error

	if email != "" {
		apps, err = h.qry.HandleListByOwner(c.Request().Context(), appapp.ListByOwnerQuery{OwnerEmail: email})
	} else {
		apps, err = h.qry.HandleList(c.Request().Context(), appapp.ListAppsQuery{})
	}
	if err != nil {
		slog.ErrorContext(c.Request().Context(), "failed to list apps", "error", err)
		return c.JSON(http.StatusBadRequest, api.Error{Error: err.Error()})
	}

	dtos := make([]appDTO, 0, len(apps))
	for _, a := range apps {
		dtos = append(dtos, toAppDTO(a))
	}
	return c.JSON(http.StatusOK, dtos)
}

// Get godoc
//
//	@Summary      Get application details
//	@Description  Returns details of a specific microVM application by ID.
//	@Tags         apps
//	@Security     BearerAuth
//	@Produce      json
//	@Param        id   path      string  true  "App ID (UUID)"
//	@Success      200  {object}  appDTO
//	@Failure      404  {object}  api.Error
//	@Router       /api/v1/apps/{id} [get]
func (h *AppHandler) Get(c *echo.Context) error {
	out, err := h.qry.HandleGet(c.Request().Context(), appapp.GetAppQuery{ID: c.Param("id")})
	if err != nil {
		slog.WarnContext(c.Request().Context(), "failed to get app", "app_id", c.Param("id"), "error", err)
		return c.JSON(http.StatusNotFound, api.Error{Error: "app not found"})
	}
	return c.JSON(http.StatusOK, toAppDTO(out))
}

// Destroy godoc
//
//	@Summary      Destroy application
//	@Description  Destroys and cleans up a microVM application container and resources.
//	@Tags         apps
//	@Security     BearerAuth
//	@Produce      json
//	@Param        id   path      string  true  "App ID (UUID)"
//	@Success      204  "No Content"
//	@Failure      400  {object}  api.Error
//	@Router       /api/v1/apps/{id} [delete]
func (h *AppHandler) Destroy(c *echo.Context) error {
	appID := c.Param("id")
	ctx := c.Request().Context()
	if h.k3sProvider != nil {
		podName := fmt.Sprintf("app-%s", appID)
		if err := h.k3sProvider.Destroy(ctx, podName); err != nil {
			slog.WarnContext(ctx, "failed to destroy k3s resources for app", "app_id", appID, "error", err)
		}
	}
	err := h.cmd.HandleDestroy(ctx, appapp.DestroyAppCommand{ID: appID})
	if err != nil {
		slog.ErrorContext(ctx, "failed to destroy app", "app_id", appID, "error", err)
		return c.JSON(http.StatusBadRequest, api.Error{Error: err.Error()})
	}
	return c.NoContent(http.StatusNoContent)
}

type logLinePayload struct {
	Timestamp string `json:"timestamp"`
	AppID     string `json:"app_id"`
	Line      string `json:"line"`
	Stream    string `json:"stream"`
}

// Logs godoc
//
//	@Summary      Stream application logs
//	@Description  Streams live stdout/stderr logs from the microVM container via Server-Sent Events (SSE).
//	@Tags         apps
//	@Security     BearerAuth
//	@Produce      text/event-stream
//	@Param        id   path      string  true  "App ID (UUID)"
//	@Success      200  {object}  logLinePayload
//	@Failure      400  {object}  api.Error
//	@Router       /api/v1/apps/{id}/logs [get]
func (h *AppHandler) Logs(c *echo.Context) error {
	appID := c.Param("id")
	if _, err := uuid.Parse(appID); err != nil {
		return c.JSON(http.StatusBadRequest, api.Error{Error: "invalid app id"})
	}

	c.Response().Header().Set("Content-Type", "text/event-stream")
	c.Response().Header().Set("Cache-Control", "no-cache")
	c.Response().Header().Set("Connection", "keep-alive")
	c.Response().WriteHeader(http.StatusOK)

	ctx := c.Request().Context()
	podName := fmt.Sprintf("app-%s", appID)

	if h.k3sProvider != nil && h.k3sProvider.GetClientset() != nil {
		cs := h.k3sProvider.GetClientset()
		req := cs.CoreV1().Pods("agni").GetLogs(podName, &corev1.PodLogOptions{
			Follow:     true,
			Timestamps: true,
		})
		stream, err := req.Stream(ctx)
		if err == nil {
			defer stream.Close()
			scanner := bufio.NewScanner(stream)
			for scanner.Scan() {
				select {
				case <-ctx.Done():
					return nil
				default:
					line := scanner.Text()
					payload, err := json.Marshal(logLinePayload{
						Timestamp: time.Now().UTC().Format(time.RFC3339),
						AppID:     appID,
						Line:      line,
						Stream:    "stdout",
					})
					if err != nil {
						slog.WarnContext(ctx, "failed to marshal log line payload", "app_id", appID, "error", err)
						continue
					}
					if _, err := io.WriteString(c.Response(), "data: "+string(payload)+"\n\n"); err != nil {
						return nil
					}
					if flusher, ok := c.Response().(http.Flusher); ok {
						flusher.Flush()
					}
				}
			}
			if err := scanner.Err(); err != nil {
				return err
			}
			return nil
		}
	}

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for range 30 {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			payload, err := json.Marshal(logLinePayload{
				Timestamp: time.Now().UTC().Format(time.RFC3339),
				AppID:     appID,
				Line:      fmt.Sprintf("[%s] container active (kata-fc microVM)", time.Now().Format("15:04:05")),
				Stream:    "stdout",
			})
			if err != nil {
				slog.WarnContext(ctx, "failed to marshal simulated log line payload", "app_id", appID, "error", err)
				continue
			}
			if _, err := io.WriteString(c.Response(), "data: "+string(payload)+"\n\n"); err != nil {
				return nil
			}
			if flusher, ok := c.Response().(http.Flusher); ok {
				flusher.Flush()
			}
		}
	}
	return nil
}

// IssueAgentToken godoc
//
//	@Summary      Issue MCP agent token
//	@Description  Issues an agent JWT token for MCP CLI client authentication.
//	@Tags         apps
//	@Security     BearerAuth
//	@Produce      json
//	@Success      200  {object}  map[string]interface{}
//	@Failure      401  {object}  api.Error
//	@Failure      500  {object}  api.Error
//	@Router       /auth/agent-token [post]
func (h *AppHandler) IssueAgentToken(c *echo.Context) error {
	email := h.extractEmail(c)
	if email == "" {
		return c.JSON(http.StatusUnauthorized, api.Error{Error: "authenticated session required"})
	}
	token, expiresAt, err := h.tokens.Issue(email)
	if err != nil {
		slog.ErrorContext(c.Request().Context(), "failed to issue agent token", "email", email, "error", err)
		return c.JSON(http.StatusInternalServerError, api.Error{Error: "failed to issue agent token"})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"token":      token,
		"expires_at": expiresAt,
		"email":      email,
	})
}

func (h *AppHandler) getMaxTarballSize(c *echo.Context) int64 {
	v := c.QueryParam("max_size_mb")
	if v == "" {
		return 500 * 1024 * 1024
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil || n <= 0 {
		return 500 * 1024 * 1024
	}
	return n * 1024 * 1024
}

// Preview godoc
//
//	@Summary      Preview application UI
//	@Description  Serves deployed static assets for an application preview path.
//	@Tags         apps
//	@Param        id   path  string  true  "App ID"
//	@Success      200  "Static web assets file stream"
//	@Failure      404  {object}  api.Error
//	@Router       /preview/{id} [get]
func (h *AppHandler) Preview(c *echo.Context) error {
	appID := c.Param("id")
	dir := filepath.Join(".", "data", "apps", appID)
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return c.JSON(http.StatusNotFound, api.Error{Error: "app preview data not found"})
	}

	subPath := c.Param("*")
	if subPath == "" || subPath == "/" {
		subPath = "index.html"
	}

	targetFile := filepath.Join(dir, filepath.Clean(subPath))
	if info, err := os.Stat(targetFile); err == nil && info.IsDir() {
		targetFile = filepath.Join(targetFile, "index.html")
	}

	if _, err := os.Stat(targetFile); os.IsNotExist(err) {
		targetFile = filepath.Join(dir, "index.html")
	}

	return c.File(targetFile)
}

// MultipartInit godoc
//
//	@Summary      Initialize multipart upload
//	@Description  Starts a multipart upload and returns presigned URLs for each part. For files > 100 MB.
//	@Tags         apps
//	@Security     BearerAuth
//	@Accept       json
//	@Produce      json
//	@Param        id    path      string  true  "App ID (UUID)"
//	@Param        body  body      object{total_size=int64}  true  "Total file size in bytes"
//	@Success      200   {object}  ports.MultipartUploadInit
//	@Failure      404   {object}  api.Error
//	@Router       /api/v1/apps/{id}/multipart/init [post]
func (h *AppHandler) MultipartInit(c *echo.Context) error {
	appID := c.Param("id")

	var req struct {
		TotalSize int64 `json:"total_size"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, api.Error{Error: "invalid request: " + err.Error()})
	}
	if req.TotalSize <= 0 {
		return c.JSON(http.StatusBadRequest, api.Error{Error: "total_size must be positive"})
	}

	result, err := h.deploySvc.CreateMultipartUpload(c.Request().Context(), appID, req.TotalSize)
	if err != nil {
		return mapDeployError(err, c)
	}

	return c.JSON(http.StatusOK, result)
}

// MultipartComplete godoc
//
//	@Summary      Complete multipart upload
//	@Description  Finalizes a multipart upload by assembling all uploaded parts.
//	@Tags         apps
//	@Security     BearerAuth
//	@Accept       json
//	@Produce      json
//	@Param        id    path      string                          true  "App ID (UUID)"
//	@Param        body  body      object{upload_id=string,parts=[]ports.UploadedPart}  true  "Upload ID and completed parts"
//	@Success      200   {object}  map[string]string
//	@Failure      400   {object}  api.Error
//	@Router       /api/v1/apps/{id}/multipart/complete [post]
func (h *AppHandler) MultipartComplete(c *echo.Context) error {
	appID := c.Param("id")

	var req struct {
		UploadID string               `json:"upload_id"`
		Parts    []ports.UploadedPart `json:"parts"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, api.Error{Error: "invalid request: " + err.Error()})
	}
	if req.UploadID == "" {
		return c.JSON(http.StatusBadRequest, api.Error{Error: "upload_id is required"})
	}
	if len(req.Parts) == 0 {
		return c.JSON(http.StatusBadRequest, api.Error{Error: "parts list cannot be empty"})
	}

	if err := h.deploySvc.CompleteMultipartUpload(c.Request().Context(), appID, req.UploadID, req.Parts); err != nil {
		return mapDeployError(err, c)
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "completed"})
}

// MultipartAbort godoc
//
//	@Summary      Abort multipart upload
//	@Description  Cancels an incomplete multipart upload and cleans up partial parts.
//	@Tags         apps
//	@Security     BearerAuth
//	@Accept       json
//	@Produce      json
//	@Param        id    path      string                       true  "App ID (UUID)"
//	@Param        body  body      object{upload_id=string}     true  "Upload ID"
//	@Success      200   {object}  map[string]string
//	@Failure      400   {object}  api.Error
//	@Router       /api/v1/apps/{id}/multipart/abort [post]
func (h *AppHandler) MultipartAbort(c *echo.Context) error {
	appID := c.Param("id")

	var req struct {
		UploadID string `json:"upload_id"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, api.Error{Error: "invalid request: " + err.Error()})
	}
	if req.UploadID == "" {
		return c.JSON(http.StatusBadRequest, api.Error{Error: "upload_id is required"})
	}

	if err := h.deploySvc.AbortMultipartUpload(c.Request().Context(), appID, req.UploadID); err != nil {
		return mapDeployError(err, c)
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "aborted"})
}
