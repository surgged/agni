package web

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/labstack/echo/v5"

	"github.com/surgged/agni/internal/adapters/http/web/api"
	"github.com/surgged/agni/internal/adapters/http/web/middleware"
	"github.com/surgged/agni/internal/application/user"
	domainUser "github.com/surgged/agni/internal/domain/user"
	"github.com/surgged/agni/internal/ports"
)

// AuthHandler wires the /auth/* endpoints and the JWT-protected /me sample route.
type AuthHandler struct {
	cmd    *user.CommandHandler
	qry    *user.QueryHandler
	tokens ports.TokenService
}

// NewAuthHandler builds an AuthHandler from application services and a token service implementation.
func NewAuthHandler(cmd *user.CommandHandler, qry *user.QueryHandler, tokens ports.TokenService) *AuthHandler {
	return &AuthHandler{cmd: cmd, qry: qry, tokens: tokens}
}

// Register attaches /auth routes and the /me protected route to e.
func (h *AuthHandler) Register(e *echo.Echo) {
	g := e.Group("/auth")
	g.POST("/register", h.RegisterUser)
	g.POST("/login", h.Login)
	g.GET("/verify-email", h.VerifyEmail)
	g.POST("/resend-verification", h.ResendVerification)
	g.POST("/refresh", h.Refresh)
	g.POST("/logout", h.Logout, middleware.JWTAuth(h.tokens))

	e.GET("/me", h.Me, middleware.JWTAuth(h.tokens))
}

type registerRequest struct {
	Name            string `json:"name"             validate:"required,min=2,max=100"`
	Email           string `json:"email"            validate:"required,email"`
	Password        string `json:"password"         validate:"required,min=8"`
	ConfirmPassword string `json:"confirm_password" validate:"required"`
}

type credentials struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	Name     string `json:"name"     validate:"omitempty,min=2,max=100"`
}

type resendVerificationRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    int64  `json:"expires_at"`
}

// RegisterUser godoc
func (h *AuthHandler) RegisterUser(c *echo.Context) error {
	var in registerRequest
	if err := c.Bind(&in); err != nil {
		return err
	}
	if in.Password != in.ConfirmPassword {
		return c.JSON(http.StatusBadRequest, api.Error{Error: "passwords do not match"})
	}
	ctx := c.Request().Context()
	_, err := h.cmd.HandleCreate(ctx, user.CreateUserCommand{
		Name:     in.Name,
		Email:    in.Email,
		Password: in.Password,
	})
	if err != nil {
		return c.JSON(http.StatusUnprocessableEntity, api.Error{Error: err.Error()})
	}
	return c.JSON(http.StatusCreated, map[string]string{
		"message": "Verification email sent. Please check your email inbox to verify your account.",
	})
}

// Login godoc
func (h *AuthHandler) Login(c *echo.Context) error {
	var in credentials
	if err := c.Bind(&in); err != nil {
		return err
	}
	ctx := c.Request().Context()
	u, err := h.cmd.HandleAuthenticate(ctx, user.AuthenticateUserCommand{
		Email:    in.Email,
		Password: in.Password,
	})
	if err != nil {
		if errors.Is(err, domainUser.ErrEmailNotVerified) {
			return c.JSON(http.StatusForbidden, map[string]interface{}{
				"error":   "email_not_verified",
				"message": "Please verify your email address before logging in.",
				"email":   in.Email,
			})
		}
		slog.WarnContext(ctx, "login failed", "email", in.Email)
		return c.JSON(http.StatusUnauthorized, api.Error{Error: "invalid credentials"})
	}
	tokens, err := h.tokens.Issue(u.ID.String())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, api.Error{Error: err.Error()})
	}
	return c.JSON(http.StatusOK, tokenResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    tokens.ExpiresAt,
	})
}

// VerifyEmail verifies user email address by token.
func (h *AuthHandler) VerifyEmail(c *echo.Context) error {
	token := c.QueryParam("token")
	if token == "" {
		return c.JSON(http.StatusBadRequest, api.Error{Error: "verification token is required"})
	}
	ctx := c.Request().Context()
	u, err := h.cmd.HandleVerifyEmail(ctx, user.VerifyEmailCommand{Token: token})
	if err != nil {
		return c.JSON(http.StatusBadRequest, api.Error{Error: err.Error()})
	}
	tokens, err := h.tokens.Issue(u.ID.String())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, api.Error{Error: err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"access_token":  tokens.AccessToken,
		"refresh_token": tokens.RefreshToken,
		"expires_at":    tokens.ExpiresAt,
		"user": map[string]interface{}{
			"user_id": u.ID.String(),
			"name":    u.Name,
			"email":   u.Email,
		},
	})
}

// ResendVerification resends verification email to specified address.
func (h *AuthHandler) ResendVerification(c *echo.Context) error {
	var in resendVerificationRequest
	if err := c.Bind(&in); err != nil {
		return err
	}
	ctx := c.Request().Context()
	_ = h.cmd.HandleResendVerification(ctx, user.ResendVerificationCommand{Email: in.Email})
	return c.JSON(http.StatusOK, map[string]string{
		"message": "If an unverified account exists with that email, a new verification link has been sent.",
	})
}

// Refresh godoc
func (h *AuthHandler) Refresh(c *echo.Context) error {
	var in refreshRequest
	if err := c.Bind(&in); err != nil {
		return err
	}
	pair, err := h.tokens.Refresh(in.RefreshToken)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, api.Error{Error: err.Error()})
	}
	return c.JSON(http.StatusOK, tokenResponse{
		AccessToken:  pair.AccessToken,
		RefreshToken: pair.RefreshToken,
		ExpiresAt:    pair.ExpiresAt,
	})
}

// Logout godoc
func (h *AuthHandler) Logout(c *echo.Context) error {
	var in refreshRequest
	if err := c.Bind(&in); err != nil {
		return err
	}
	if err := h.tokens.Revoke(in.RefreshToken); err != nil {
		return c.JSON(http.StatusUnauthorized, api.Error{Error: err.Error()})
	}
	return c.NoContent(http.StatusNoContent)
}

// Me godoc
func (h *AuthHandler) Me(c *echo.Context) error {
	uid, _ := c.Get("user_id").(string)
	return c.JSON(http.StatusOK, map[string]interface{}{"user_id": uid})
}
