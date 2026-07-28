package v1

import (
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v5"

	"github.com/surgged/agni/internal/adapters/http/web/api"
	shareapp "github.com/surgged/agni/internal/application/sharelink"
	domain "github.com/surgged/agni/internal/domain/sharelink"
)

type shareDTO struct {
	ID             string `json:"id" validate:"omitempty,uuid"`
	AppID          string `json:"app_id" validate:"required,uuid"`
	RecipientEmail string `json:"recipient_email" validate:"required,email"`
	Permission     string `json:"permission"`
}

type shareResponseDTO struct {
	ID             string `json:"id"`
	AppID          string `json:"app_id"`
	RecipientEmail string `json:"recipient_email"`
	Permission     string `json:"permission"`
	Token          string `json:"token"`
	ExpiresAt      string `json:"expires_at"`
	AcceptedAt     *string `json:"accepted_at,omitempty"`
	RevokedAt      *string `json:"revoked_at,omitempty"`
}

func toShareDTO(x *domain.ShareLink) shareResponseDTO {
	dto := shareResponseDTO{
		ID:             x.ID.String(),
		AppID:          x.AppID.String(),
		RecipientEmail: x.RecipientEmail,
		Permission:     string(x.Permission),
		ExpiresAt:      x.ExpiresAt.Format(time.RFC3339),
	}
	if x.AcceptedAt != nil {
		s := x.AcceptedAt.Format(time.RFC3339)
		dto.AcceptedAt = &s
	}
	if x.RevokedAt != nil {
		s := x.RevokedAt.Format(time.RFC3339)
		dto.RevokedAt = &s
	}
	return dto
}

func (d shareDTO) toCreateCommand() shareapp.CreateShareLinkCommand {
	return shareapp.CreateShareLinkCommand{
		ID:             d.ID,
		AppID:          d.AppID,
		RecipientEmail: d.RecipientEmail,
		Permission:     d.Permission,
	}
}

type ShareHandler struct {
	cmd *shareapp.CommandHandler
	qry *shareapp.QueryHandler
}

func NewShareHandler(cmd *shareapp.CommandHandler, qry *shareapp.QueryHandler) *ShareHandler {
	return &ShareHandler{cmd: cmd, qry: qry}
}

func (h *ShareHandler) Register(g *echo.Group) {
	g.POST("/:id/share", h.Create)
	g.GET("/:id/shares", h.List)
	g.DELETE("/:id/shares/:sid", h.Revoke)
}

func (h *ShareHandler) Create(c *echo.Context) error {
	var in shareDTO
	if err := c.Bind(&in); err != nil {
		return c.JSON(http.StatusBadRequest, api.Error{Error: err.Error()})
	}
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	in.AppID = c.Param("id")
	if in.Permission == "" {
		in.Permission = "use"
	}
	x, plaintext, err := h.cmd.HandleCreate(c.Request().Context(), in.toCreateCommand())
	if err != nil {
		return c.JSON(http.StatusUnprocessableEntity, api.Error{Error: err.Error()})
	}
	resp := toShareDTO(x)
	resp.Token = plaintext
	return c.JSON(http.StatusCreated, resp)
}

func (h *ShareHandler) List(c *echo.Context) error {
	appID := c.Param("id")
	links, err := h.qry.HandleListByApp(c.Request().Context(), shareapp.ListByAppQuery{AppID: appID})
	if err != nil {
		return c.JSON(http.StatusBadRequest, api.Error{Error: err.Error()})
	}
	dtos := make([]shareResponseDTO, 0, len(links))
	for _, l := range links {
		dtos = append(dtos, toShareDTO(l))
	}
	return c.JSON(http.StatusOK, dtos)
}

func (h *ShareHandler) Revoke(c *echo.Context) error {
	err := h.cmd.HandleRevoke(c.Request().Context(), shareapp.RevokeShareLinkCommand{ID: c.Param("sid")})
	if err != nil {
		return c.JSON(http.StatusBadRequest, api.Error{Error: err.Error()})
	}
	return c.NoContent(http.StatusNoContent)
}
