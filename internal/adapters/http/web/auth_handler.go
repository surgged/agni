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
//
//	@Summary      Register a new user
//	@Description  Registers a new user account with name, email, and password.
//	@Tags         auth
//	@Accept       json
//	@Produce      json
//	@Param        request  body      registerRequest  true  "Registration payload"
//	@Success      201      {object}  map[string]string
//	@Failure      400      {object}  api.Error
//	@Failure      422      {object}  api.Error
//	@Router       /auth/register [post]
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
		slog.ErrorContext(ctx, "user registration failed", "email", in.Email, "error", err)
		return c.JSON(http.StatusUnprocessableEntity, api.Error{Error: err.Error()})
	}
	return c.JSON(http.StatusCreated, map[string]string{
		"message": "Verification email sent. Please check your email inbox to verify your account.",
	})
}

// Login godoc
//
//	@Summary      User login
//	@Description  Authenticates a user with email and password, returning access and refresh JWT tokens.
//	@Tags         auth
//	@Accept       json
//	@Produce      json
//	@Param        credentials  body      credentials  true  "Login credentials"
//	@Success      200          {object}  tokenResponse
//	@Failure      401          {object}  api.Error
//	@Failure      403          {object}  map[string]interface{}
//	@Router       /auth/login [post]
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
		slog.ErrorContext(ctx, "failed to issue tokens after login", "user_id", u.ID.String(), "error", err)
		return c.JSON(http.StatusInternalServerError, api.Error{Error: err.Error()})
	}
	return c.JSON(http.StatusOK, tokenResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    tokens.ExpiresAt,
	})
}

// VerifyEmail godoc
//
//	@Summary      Verify email address
//	@Description  Verifies user email using token parameter and returns session credentials.
//	@Tags         auth
//	@Produce      json
//	@Param        token  query     string  true  "Verification token"
//	@Success      200    {object}  map[string]interface{}
//	@Failure      400    {object}  api.Error
//	@Router       /auth/verify-email [get]
func (h *AuthHandler) VerifyEmail(c *echo.Context) error {
	token := c.QueryParam("token")
	if token == "" {
		return c.JSON(http.StatusBadRequest, api.Error{Error: "verification token is required"})
	}
	ctx := c.Request().Context()
	u, err := h.cmd.HandleVerifyEmail(ctx, user.VerifyEmailCommand{Token: token})
	if err != nil {
		slog.WarnContext(ctx, "email verification failed", "error", err)
		return c.JSON(http.StatusBadRequest, api.Error{Error: err.Error()})
	}
	tokens, err := h.tokens.Issue(u.ID.String())
	if err != nil {
		slog.ErrorContext(ctx, "failed to issue tokens after email verification", "user_id", u.ID.String(), "error", err)
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

// ResendVerification godoc
//
//	@Summary      Resend email verification
//	@Description  Resends verification link to the target user email address.
//	@Tags         auth
//	@Accept       json
//	@Produce      json
//	@Param        request  body      resendVerificationRequest  true  "Resend verification request"
//	@Success      200      {object}  map[string]string
//	@Failure      400      {object}  api.Error
//	@Router       /auth/resend-verification [post]
func (h *AuthHandler) ResendVerification(c *echo.Context) error {
	var in resendVerificationRequest
	if err := c.Bind(&in); err != nil {
		return err
	}
	ctx := c.Request().Context()
	if err := h.cmd.HandleResendVerification(ctx, user.ResendVerificationCommand{Email: in.Email}); err != nil {
		slog.WarnContext(ctx, "failed to resend verification email", "email", in.Email, "error", err)
	}
	return c.JSON(http.StatusOK, map[string]string{
		"message": "If an unverified account exists with that email, a new verification link has been sent.",
	})
}

// Refresh godoc
//
//	@Summary      Refresh access token
//	@Description  Reissues a new access/refresh token pair using a valid refresh token.
//	@Tags         auth
//	@Accept       json
//	@Produce      json
//	@Param        request  body      refreshRequest  true  "Refresh payload"
//	@Success      200      {object}  tokenResponse
//	@Failure      401      {object}  api.Error
//	@Router       /auth/refresh [post]
func (h *AuthHandler) Refresh(c *echo.Context) error {
	var in refreshRequest
	if err := c.Bind(&in); err != nil {
		return err
	}
	pair, err := h.tokens.Refresh(in.RefreshToken)
	if err != nil {
		slog.WarnContext(c.Request().Context(), "token refresh failed", "error", err)
		return c.JSON(http.StatusUnauthorized, api.Error{Error: err.Error()})
	}
	return c.JSON(http.StatusOK, tokenResponse{
		AccessToken:  pair.AccessToken,
		RefreshToken: pair.RefreshToken,
		ExpiresAt:    pair.ExpiresAt,
	})
}

// Logout godoc
//
//	@Summary      Logout user
//	@Description  Revokes the user refresh token and invalidates the session.
//	@Tags         auth
//	@Security     BearerAuth
//	@Accept       json
//	@Produce      json
//	@Param        request  body      refreshRequest  true  "Logout payload"
//	@Success      204      "No Content"
//	@Failure      401      {object}  api.Error
//	@Router       /auth/logout [post]
func (h *AuthHandler) Logout(c *echo.Context) error {
	var in refreshRequest
	if err := c.Bind(&in); err != nil {
		return err
	}
	if err := h.tokens.Revoke(in.RefreshToken); err != nil {
		slog.WarnContext(c.Request().Context(), "token revoke failed", "error", err)
		return c.JSON(http.StatusUnauthorized, api.Error{Error: err.Error()})
	}
	return c.NoContent(http.StatusNoContent)
}

// Me godoc
//
//	@Summary      Get authenticated user ID
//	@Description  Returns the subject user ID from the Bearer JWT token.
//	@Tags         auth
//	@Security     BearerAuth
//	@Produce      json
//	@Success      200  {object}  map[string]interface{}
//	@Failure      401  {object}  api.Error
//	@Router       /me [get]
func (h *AuthHandler) Me(c *echo.Context) error {
	uid, _ := c.Get("user_id").(string)
	return c.JSON(http.StatusOK, map[string]interface{}{"user_id": uid})
}
