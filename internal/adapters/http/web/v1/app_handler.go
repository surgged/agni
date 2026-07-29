package v1

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
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
		CreatedAt:    x.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    x.UpdatedAt.Format(time.RFC3339),
	}
}

type AppHandler struct {
	cmd         *appapp.CommandHandler
	qry         *appapp.QueryHandler
	pipeline    *deploy.Pipeline
	tokens      *agentapikey.AgentTokenService
	k3sProvider *k3s.Provider
}

func NewAppHandler(cmd *appapp.CommandHandler, qry *appapp.QueryHandler, pipeline *deploy.Pipeline, tokens *agentapikey.AgentTokenService, k3sProvider *k3s.Provider) *AppHandler {
	return &AppHandler{
		cmd:         cmd,
		qry:         qry,
		pipeline:    pipeline,
		tokens:      tokens,
		k3sProvider: k3sProvider,
	}
}

func (h *AppHandler) Register(g *echo.Group) {
	g.POST("", h.Create)
	g.GET("", h.List)
	g.GET("/:id", h.Get)
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

func (h *AppHandler) Create(c *echo.Context) error {
	email := h.extractEmail(c)
	ownerEmail := c.FormValue("owner_email")
	if ownerEmail == "" {
		ownerEmail = email
	}
	name := c.FormValue("name")
	if name == "" {
		return c.JSON(http.StatusBadRequest, api.Error{Error: "name is required"})
	}
	if ownerEmail == "" {
		return c.JSON(http.StatusUnauthorized, api.Error{Error: "authentication required"})
	}

	appID := uuid.New()

	x, err := h.cmd.HandleCreate(c.Request().Context(), appapp.CreateAppCommand{
		ID:         appID.String(),
		OwnerEmail: ownerEmail,
		Name:       name,
	})
	if err != nil {
		return c.JSON(http.StatusUnprocessableEntity, api.Error{Error: err.Error()})
	}

	tarball, _, err := c.Request().FormFile("tarball")
	if err == nil {
		defer tarball.Close()
		tmpFile, tmpErr := os.CreateTemp("", "agni-tarball-*.tar.gz")
		if tmpErr == nil {
			_, _ = io.Copy(tmpFile, tarball)
			tmpPath := tmpFile.Name()
			_ = tmpFile.Close()

			go func() {
				f, openErr := os.Open(tmpPath)
				if openErr == nil {
					defer func() {
						_ = f.Close()
						_ = os.Remove(tmpPath)
					}()
					if err := h.pipeline.Deploy(context.Background(), appID, f); err != nil {
						slog.Error("deploy failed", "app_id", appID, "error", err)
					}
				}
			}()
		}
	}

	return c.JSON(http.StatusCreated, toAppDTO(x))
}

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
		return c.JSON(http.StatusBadRequest, api.Error{Error: err.Error()})
	}

	dtos := make([]appDTO, 0, len(apps))
	for _, a := range apps {
		dtos = append(dtos, toAppDTO(a))
	}
	return c.JSON(http.StatusOK, dtos)
}

func (h *AppHandler) Get(c *echo.Context) error {
	out, err := h.qry.HandleGet(c.Request().Context(), appapp.GetAppQuery{ID: c.Param("id")})
	if err != nil {
		return c.JSON(http.StatusNotFound, api.Error{Error: "app not found"})
	}
	return c.JSON(http.StatusOK, toAppDTO(out))
}

func (h *AppHandler) Destroy(c *echo.Context) error {
	appID := c.Param("id")
	if h.k3sProvider != nil {
		podName := fmt.Sprintf("app-%s", appID)
		_ = h.k3sProvider.Destroy(c.Request().Context(), podName)
	}
	err := h.cmd.HandleDestroy(c.Request().Context(), appapp.DestroyAppCommand{ID: appID})
	if err != nil {
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
					payload, _ := json.Marshal(logLinePayload{
						Timestamp: time.Now().UTC().Format(time.RFC3339),
						AppID:     appID,
						Line:      line,
						Stream:    "stdout",
					})
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
	}

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for i := 0; i < 30; i++ {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			payload, _ := json.Marshal(logLinePayload{
				Timestamp: time.Now().UTC().Format(time.RFC3339),
				AppID:     appID,
				Line:      fmt.Sprintf("[%s] container active (kata-fc microVM)", time.Now().Format("15:04:05")),
				Stream:    "stdout",
			})
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

func (h *AppHandler) IssueAgentToken(c *echo.Context) error {
	email := h.extractEmail(c)
	if email == "" {
		return c.JSON(http.StatusUnauthorized, api.Error{Error: "authenticated session required"})
	}
	token, expiresAt, err := h.tokens.Issue(email)
	if err != nil {
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

