package v1

import (
	"errors"
	"log/slog"
	"github.com/labstack/echo/v5"
	"net/http"

	"github.com/surgged/agni/internal/adapters/http/web/api"
	appUser "github.com/surgged/agni/internal/application/user"
	"github.com/surgged/agni/internal/domain/user"
)

// userDTO is the input/output DTO for user HTTP endpoints.
// The HTTP DTO owns validation tags and string-serialized IDs.
type userDTO struct {
	ID       string `json:"id" validate:"omitempty,uuid"`
	Name     string `json:"name" validate:"required"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// toCreateCommand converts the DTO to an application Create command.
// UUID-typed DTO fields are parsed from string to uuid.UUID for the command layer.
func (d userDTO) toCreateCommand() appUser.CreateUserCommand {
	return appUser.CreateUserCommand{
		ID:       d.ID,
		Name:     d.Name,
		Email:    d.Email,
		Password: d.Password,
	}
}

// toUpdateCommand converts the DTO to an application Update command.
func (d userDTO) toUpdateCommand() appUser.UpdateUserCommand {
	return appUser.UpdateUserCommand{
		ID:       d.ID,
		Name:     d.Name,
		Email:    d.Email,
		Password: d.Password,
	}
}

// toDTO projects a domain aggregate onto the response DTO shape.
func toUserDTO(x *user.User) userDTO {
	return userDTO{
		ID:       x.ID.String(),
		Name:     x.Name,
		Email:    x.Email,
		Password: x.Password,
	}
}

// UserHandler exposes CRUD HTTP endpoints for users. It
// depends only on the application-layer command/query handlers; the domain
// package is reachable only through their typed return values.
type UserHandler struct {
	cmd *appUser.CommandHandler
	qry *appUser.QueryHandler
}

// NewUserHandler builds a UserHandler wired to the given
// application services.
func NewUserHandler(cmd *appUser.CommandHandler, qry *appUser.QueryHandler) *UserHandler {
	return &UserHandler{cmd: cmd, qry: qry}
}

// Register attaches user routes to the supplied Echo group.
func (h *UserHandler) Register(g *echo.Group) {
	g.POST("", h.Create)
	g.GET("/:id", h.Get)
	g.PUT("/:id", h.Update)
	g.DELETE("/:id", h.Delete)
}

// Create godoc
//
//	@Summary      Create a user
//	@Description  Creates a new user.
//	@Tags         users
//	@Accept       json
//	@Produce      json
//	@Param        user  body      userDTO  true  "User payload"
//	@Success      201   {object}  userDTO
//	@Failure      422   {object}  api.Error
//	@Router       /v1/users [post]
func (h *UserHandler) Create(c *echo.Context) error {
	var in userDTO
	if err := c.Bind(&in); err != nil {
		return c.JSON(http.StatusBadRequest, api.Error{Error: err.Error()})
	}
	out, err := h.cmd.HandleCreate(c.Request().Context(), in.toCreateCommand())
	if errors.Is(err, user.ErrUserNotFound) {
		return c.JSON(http.StatusNotFound, api.Error{Error: "user not found"})
	}
	if err != nil {
		slog.ErrorContext(c.Request().Context(), "user create failed", "error", err)
		return c.JSON(http.StatusUnprocessableEntity, api.Error{Error: err.Error()})
	}
	return c.JSON(http.StatusCreated, toUserDTO(out))
}

// Get godoc
//
//	@Summary      Get a user
//	@Description  Returns a single user by ID.
//	@Tags         users
//	@Produce      json
//	@Param        id   path      string  true  "User ID"
//	@Success      200  {object}  userDTO
//	@Failure      404  {object}  api.Error
//	@Router       /v1/users/{id} [get]
func (h *UserHandler) Get(c *echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return c.JSON(http.StatusUnauthorized, api.Error{Error: "unauthenticated"})
	}
	if c.Param("id") != userID {
		return c.JSON(http.StatusNotFound, api.Error{Error: "user not found"})
	}
	out, err := h.qry.HandleGet(c.Request().Context(), appUser.GetUserQuery{ID: c.Param("id")})
	if errors.Is(err, user.ErrUserNotFound) {
		return c.JSON(http.StatusNotFound, api.Error{Error: "user not found"})
	}
	if err != nil {
		slog.ErrorContext(c.Request().Context(), "user get failed", "user_id", c.Param("id"), "error", err)
		return c.JSON(http.StatusBadRequest, api.Error{Error: err.Error()})
	}
	return c.JSON(http.StatusOK, toUserDTO(out))
}

// Update godoc
//
//	@Summary      Update a user
//	@Description  Updates an existing user by ID.
//	@Tags         users
//	@Accept       json
//	@Produce      json
//	@Param        id        path      string         true  "User ID"
//	@Param        user  body      userDTO  true  "User payload"
//	@Success      200  {object}  userDTO
//	@Failure      404  {object}  api.Error
//	@Failure      422  {object}  api.Error
//	@Router       /v1/users/{id} [put]
func (h *UserHandler) Update(c *echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return c.JSON(http.StatusUnauthorized, api.Error{Error: "unauthenticated"})
	}
	if c.Param("id") != userID {
		return c.JSON(http.StatusNotFound, api.Error{Error: "user not found"})
	}
	var in userDTO
	if err := c.Bind(&in); err != nil {
		return c.JSON(http.StatusBadRequest, api.Error{Error: err.Error()})
	}
	in.ID = c.Param("id")
	out, err := h.cmd.HandleUpdate(c.Request().Context(), in.toUpdateCommand())
	if errors.Is(err, user.ErrUserNotFound) {
		return c.JSON(http.StatusNotFound, api.Error{Error: "user not found"})
	}
	if err != nil {
		slog.ErrorContext(c.Request().Context(), "user update failed", "user_id", c.Param("id"), "error", err)
		return c.JSON(http.StatusUnprocessableEntity, api.Error{Error: err.Error()})
	}
	return c.JSON(http.StatusOK, toUserDTO(out))
}

// Delete godoc
//
//	@Summary      Delete a user
//	@Description  Deletes a user by ID.
//	@Tags         users
//	@Produce      json
//	@Param        id   path      string  true  "User ID"
//	@Success      204  "No Content"
//	@Failure      404  {object}  api.Error
//	@Router       /v1/users/{id} [delete]
func (h *UserHandler) Delete(c *echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return c.JSON(http.StatusUnauthorized, api.Error{Error: "unauthenticated"})
	}
	if c.Param("id") != userID {
		return c.JSON(http.StatusNotFound, api.Error{Error: "user not found"})
	}
	err := h.cmd.HandleDelete(c.Request().Context(), appUser.DeleteUserCommand{ID: c.Param("id")})
	if errors.Is(err, user.ErrUserNotFound) {
		return c.JSON(http.StatusNotFound, api.Error{Error: "user not found"})
	}
	if err != nil {
		slog.ErrorContext(c.Request().Context(), "user delete failed", "user_id", c.Param("id"), "error", err)
		return c.JSON(http.StatusBadRequest, api.Error{Error: err.Error()})
	}
	return c.NoContent(http.StatusNoContent)
}
