package v1

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/labstack/echo/v5"

	"github.com/surgged/agni/internal/adapters/auth/agentapikey"
	domain "github.com/surgged/agni/internal/domain/sharelink"
)

type SessionHandler struct {
	tokens        *agentapikey.AgentTokenService
	sharelinkRepo domain.Repository
}

func NewSessionHandler(tokens *agentapikey.AgentTokenService, sharelinkRepo domain.Repository) *SessionHandler {
	return &SessionHandler{tokens: tokens, sharelinkRepo: sharelinkRepo}
}

// Validate godoc
//
//	@Summary      Validate application session
//	@Description  Validates session cookie access for a shared application.
//	@Tags         auth
//	@Produce      json
//	@Param        app  query     string  true  "App ID (UUID)"
//	@Success      200  {object}  map[string]string
//	@Failure      400  {object}  map[string]string
//	@Failure      401  {object}  map[string]string
//	@Failure      500  {object}  map[string]string
//	@Router       /auth/session [get]
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
