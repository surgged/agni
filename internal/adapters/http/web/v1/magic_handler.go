package v1

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v5"

	"github.com/surgged/agni/internal/adapters/email"
	"github.com/surgged/agni/internal/adapters/http/web/api"
	userapp "github.com/surgged/agni/internal/application/user"
	"github.com/surgged/agni/internal/config"
	"github.com/surgged/agni/internal/domain/user"
)

type AgentTokenIssuer interface {
	Issue(email string) (string, int64, error)
	Validate(token string) (string, error)
	IssueMagicToken(email string, ttl time.Duration) (string, int64, error)
	ValidateMagicToken(token string) (string, error)
	IssueSessionToken(email string, ttl time.Duration) (string, int64, error)
	ValidateSessionToken(token string) (string, error)
}

type MagicHandler struct {
	shareCfg    config.ShareConfig
	agentTokens AgentTokenIssuer
	emailClient email.EmailSender
	userCmd     *userapp.CommandHandler
	userQry     *userapp.QueryHandler
}

func NewMagicHandler(
	shareCfg config.ShareConfig,
	agentTokens AgentTokenIssuer,
	emailClient email.EmailSender,
	userCmd *userapp.CommandHandler,
	userQry *userapp.QueryHandler,
) *MagicHandler {
	return &MagicHandler{
		shareCfg:    shareCfg,
		agentTokens: agentTokens,
		emailClient: emailClient,
		userCmd:     userCmd,
		userQry:     userQry,
	}
}

func (h *MagicHandler) Register(g *echo.Group) {
	g.POST("/magic", h.RequestMagicLink)
	g.GET("/magic", h.VerifyMagicLink)
}

type magicRequestDTO struct {
	Email string `json:"email" validate:"required,email"`
}

func (h *MagicHandler) RequestMagicLink(c *echo.Context) error {
	var in magicRequestDTO
	if err := c.Bind(&in); err != nil {
		return c.JSON(http.StatusBadRequest, api.Error{Error: err.Error()})
	}

	ctx := c.Request().Context()

	token, expiresAt, err := h.agentTokens.IssueMagicToken(in.Email, h.shareCfg.MagicLinkTTL)
	if err != nil {
		slog.ErrorContext(ctx, "failed to issue magic token", "error", err)
		return c.JSON(http.StatusInternalServerError, api.Error{Error: "internal server error"})
	}

	if err := h.emailClient.SendMagicLink(ctx, in.Email, token); err != nil {
		slog.ErrorContext(ctx, "failed to send magic link", "error", err)
	}

	return c.JSON(http.StatusAccepted, map[string]interface{}{
		"message":    "if an account exists, a magic link has been sent",
		"expires_at": expiresAt,
	})
}

func (h *MagicHandler) VerifyMagicLink(c *echo.Context) error {
	tokenStr := c.QueryParam("token")
	if tokenStr == "" {
		return c.JSON(http.StatusBadRequest, api.Error{Error: "token is required"})
	}

	email, err := h.agentTokens.ValidateMagicToken(tokenStr)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, api.Error{Error: "invalid or expired token"})
	}

	ctx := c.Request().Context()

	userID := uuid.NewSHA1(uuid.NameSpaceOID, []byte(email))
	_, err = h.userQry.HandleGetByEmail(ctx, userapp.GetUserByEmailQuery{Email: email})
	if err != nil {
		_, createErr := h.userCmd.HandleCreate(ctx, userapp.CreateUserCommand{
			ID:       userID.String(),
			Name:     email,
			Email:    email,
			Password: "",
		})
		if createErr != nil && !errIsDup(createErr) {
			slog.ErrorContext(ctx, "failed to create user", "error", createErr)
			return c.JSON(http.StatusInternalServerError, api.Error{Error: "internal server error"})
		}
	}

	sessionToken, _, err := h.agentTokens.IssueSessionToken(email, h.shareCfg.SessionTTL)
	if err != nil {
		slog.ErrorContext(ctx, "failed to issue session token", "error", err)
		return c.JSON(http.StatusInternalServerError, api.Error{Error: "internal server error"})
	}

	cookie := &http.Cookie{
		Name:     "agni_session",
		Value:    sessionToken,
		Path:     "/",
		Domain:   "",
		Expires:  time.Now().Add(h.shareCfg.SessionTTL),
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	}
	c.SetCookie(cookie)

	redirectURL := "/apps"
	if appParam := c.QueryParam("app"); appParam != "" {
		redirectURL = "/apps/" + appParam
	}

	if c.QueryParam("redirect") == "false" {
		return c.JSON(http.StatusOK, map[string]string{
			"user_id": userID.String(),
			"email":   email,
			"message": "session created",
		})
	}

	return c.Redirect(http.StatusSeeOther, redirectURL)
}

func errIsDup(err error) bool {
	return err != nil && (err == user.ErrUserNotFound || false)
}
