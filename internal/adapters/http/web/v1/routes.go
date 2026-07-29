package v1

import "github.com/labstack/echo/v5"

type MountConfig struct {
	UserHandler         *UserHandler // crank:http-fields (do not remove — `crank make handler` splices new fields here)
	AppHandler          *AppHandler
	ShareHandler        *ShareHandler
	MagicHandler        *MagicHandler
	SessionHandler      *SessionHandler
	MeHandler           *MeHandler
	ClusterHealthHandler *ClusterHealthHandler
}

func Mount(e *echo.Echo, cfg MountConfig) {
	g := e.Group("/api/v1")

	g2 := g.Group("/users")
	cfg.UserHandler.Register(g2) // crank:http-register (do not remove — `crank make handler` splices new route registrations here)

	appGroup := g.Group("/apps")
	cfg.AppHandler.Register(appGroup)
	cfg.ShareHandler.Register(appGroup)

	magicGroup := e.Group("/auth")
	cfg.MagicHandler.Register(magicGroup)
	e.GET("/auth/session", cfg.SessionHandler.Validate)
	e.POST("/auth/agent-token", cfg.AppHandler.IssueAgentToken)
	e.GET("/preview/:id", cfg.AppHandler.Preview)
	e.GET("/preview/:id/*", cfg.AppHandler.Preview)
	e.GET("/api/v1/me", cfg.MeHandler.Get)
	e.GET("/api/v1/cluster/health", cfg.ClusterHealthHandler.Get)
}
