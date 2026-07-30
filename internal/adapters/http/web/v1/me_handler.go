package v1

import (
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v5"

	"github.com/surgged/agni/internal/adapters/auth/agentapikey"
	"github.com/surgged/agni/internal/adapters/http/web/api"
	userapp "github.com/surgged/agni/internal/application/user"
	"github.com/surgged/agni/internal/domain/user"
	"github.com/surgged/agni/internal/ports"
)

type MeHandler struct {
	userQry     *userapp.QueryHandler
	tokens      ports.TokenService
	agentTokens *agentapikey.AgentTokenService
}

func NewMeHandler(userQry *userapp.QueryHandler, tokens ports.TokenService, agentTokens *agentapikey.AgentTokenService) *MeHandler {
	return &MeHandler{userQry: userQry, tokens: tokens, agentTokens: agentTokens}
}

// Get godoc
//
//	@Summary      Get authenticated user profile
//	@Description  Returns the profile of the authenticated user from JWT Bearer token or Session token.
//	@Tags         users
//	@Security     BearerAuth
//	@Produce      json
//	@Success      200  {object}  map[string]interface{}
//	@Failure      401  {object}  api.Error
//	@Router       /api/v1/me [get]
func (h *MeHandler) Get(c *echo.Context) error {
	var sub string

	if e, ok := c.Get("user_id").(string); ok && e != "" {
		sub = e
	} else if e, ok := c.Get("user_email").(string); ok && e != "" {
		sub = e
	}

	if sub == "" {
		header := c.Request().Header.Get("Authorization")
		if len(header) > 7 && strings.EqualFold(header[:7], "Bearer ") {
			rawToken := header[7:]
			if h.tokens != nil {
				if s, err := h.tokens.Subject(rawToken); err == nil && s != "" {
					sub = s
				}
			}
			if sub == "" && h.agentTokens != nil {
				if s, err := h.agentTokens.Validate(rawToken); err == nil && s != "" {
					sub = s
				} else if s, err := h.agentTokens.ValidateSessionToken(rawToken); err == nil && s != "" {
					sub = s
				} else if s, err := h.agentTokens.ValidateMagicToken(rawToken); err == nil && s != "" {
					sub = s
				}
			}
			if sub == "" {
				sub = c.Request().Header.Get("X-User-Email")
			}
		}
	}

	if sub == "" {
		return c.JSON(http.StatusUnauthorized, api.Error{Error: "unauthenticated"})
	}

	ctx := c.Request().Context()
	var u *user.User
	var err error

	if _, uuidErr := uuid.Parse(sub); uuidErr == nil {
		u, err = h.userQry.HandleGet(ctx, userapp.GetUserQuery{ID: sub})
	} else {
		u, err = h.userQry.HandleGetByEmail(ctx, userapp.GetUserByEmailQuery{Email: sub})
	}

	if err != nil {
		return c.JSON(http.StatusOK, map[string]interface{}{
			"user_id": sub,
			"email":   sub,
			"name":    sub,
			"role":    "user",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"user_id": u.ID.String(),
		"email":   u.Email,
		"name":    u.Name,
		"role":    "user",
	})
}
