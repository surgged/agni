package v1

import (
	"net/http"

	"github.com/labstack/echo/v5"

	"github.com/surgged/agni/internal/adapters/http/web/api"
	userapp "github.com/surgged/agni/internal/application/user"
	"github.com/surgged/agni/internal/domain/user"
)

type MeHandler struct {
	userQry *userapp.QueryHandler
}

func NewMeHandler(userQry *userapp.QueryHandler) *MeHandler {
	return &MeHandler{userQry: userQry}
}

func (h *MeHandler) Get(c *echo.Context) error {
	email := ""

	if e, ok := c.Get("user_email").(string); ok {
		email = e
	}

	if email == "" {
		if bearer := c.Request().Header.Get("Authorization"); len(bearer) > 7 && bearer[:7] == "Bearer " {
			email = c.Request().Header.Get("X-User-Email")
		}
	}

	if email == "" {
		return c.JSON(http.StatusUnauthorized, api.Error{Error: "unauthenticated"})
	}

	u, err := h.userQry.HandleGetByEmail(c.Request().Context(), userapp.GetUserByEmailQuery{Email: email})
	if err != nil {
		if err == user.ErrUserNotFound {
			return c.JSON(http.StatusOK, map[string]string{
				"email": email,
				"role":  "guest",
			})
		}
		return c.JSON(http.StatusInternalServerError, api.Error{Error: err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"user_id": u.ID.String(),
		"email":   u.Email,
		"name":    u.Name,
		"role":    "user",
	})
}
