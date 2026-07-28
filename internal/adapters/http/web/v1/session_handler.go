package v1

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/labstack/echo/v5"

	"github.com/surgged/agni/internal/adapters/auth/agentapikey"
	domain "github.com/surgged/agni/internal/domain/sharelink"
)

type SessionHandler struct {
	tokens       *agentapikey.AgentTokenService
	sharelinkRepo domain.Repository
}

func NewSessionHandler(tokens *agentapikey.AgentTokenService, sharelinkRepo domain.Repository) *SessionHandler {
	return &SessionHandler{tokens: tokens, sharelinkRepo: sharelinkRepo}
}

func (h *SessionHandler) Validate(c *echo.Context) error {
	appID := c.QueryParam("app")
	if appID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "app is required"})
	}

	cookie, err := c.Cookie("agni_session")
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "no session"})
	}

	email, err := h.tokens.ValidateSessionToken(cookie.Value)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid session"})
	}

	parsedAppID, err := uuid.Parse(appID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid app id"})
	}

	links, err := h.sharelinkRepo.GetByAppID(c.Request().Context(), parsedAppID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "internal error"})
	}

	for _, link := range links {
		if link.RecipientEmail == email && link.IsValid() {
			return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
		}
	}

	return c.JSON(http.StatusUnauthorized, map[string]string{"error": "access denied"})
}
