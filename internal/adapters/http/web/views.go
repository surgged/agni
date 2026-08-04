package web

import (
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/labstack/echo/v5"
	echomw "github.com/labstack/echo/v5/middleware"

	"github.com/surgged/agni/internal/config"
	"github.com/surgged/agni/static"
)

// ServeViews mounts the embedded SPA on the Echo instance.
//
// In production (DevServer empty), it serves the embedded static files with
// SPA fallback (any path that doesn't match a file returns index.html).
//
// In development (DevServer set), it proxies SPA requests to the Vite dev
// server for hot module replacement.
func ServeViews(e *echo.Echo, cfg config.ViewsConfig, logger *slog.Logger) {
	if !cfg.Enabled {
		return
	}

	if cfg.DevServer != "" {
		logger.Info("views: proxying non-API routes to Vite dev server", "dev_server", cfg.DevServer)
		e.Use(proxyToDevServerMiddleware(cfg.DevServer, logger))
		return
	}

	// Strip the "dist" prefix from the embedded FS so paths work naturally.
	dist, err := fs.Sub(static.FS, "dist")
	if err != nil {
		logger.Error("views: failed to open embedded static files", "error", err)
		return
	}

	// Serve the embedded SPA with index.html fallback for client-side routing.
	// Skipper ensures API routes, health checks, and Swagger docs are never handled as SPA routes.
	e.Use(echomw.StaticWithConfig(echomw.StaticConfig{
		Root:       ".",
		Index:      "index.html",
		HTML5:      true,
		Filesystem: dist,
		Skipper: func(c *echo.Context) bool {
			return isAPIPath(c.Request().URL.Path)
		},
	}))

	logger.Info("views: serving embedded SPA")
}

// proxyToDevServerMiddleware returns Echo middleware that proxies non-API
// requests to the Vite dev server. API routes, health checks, and Swagger
// pass through to Echo route handlers normally.
func proxyToDevServerMiddleware(target string, logger *slog.Logger) echo.MiddlewareFunc {
	target = strings.TrimRight(target, "/")

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			path := c.Request().URL.Path
			if isAPIPath(path) {
				return next(c)
			}

			proxyURL := target + path
			if c.Request().URL.RawQuery != "" {
				proxyURL += "?" + c.Request().URL.RawQuery
			}

			req, err := http.NewRequestWithContext(
				c.Request().Context(),
				c.Request().Method,
				proxyURL,
				c.Request().Body,
			)
			if err != nil {
				return err
			}

			// Copy headers.
			for k, vv := range c.Request().Header {
				for _, v := range vv {
					req.Header.Add(k, v)
				}
			}

			// Forward the host header that Vite expects.
			req.Header.Set("Host", strings.TrimPrefix(target, "http://"))

			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				logger.Warn("views: proxy error", "error", err, "url", proxyURL)
				return echo.NewHTTPError(http.StatusBadGateway, "dev server unreachable")
			}
			defer resp.Body.Close()

			// Copy response headers.
			for k, vv := range resp.Header {
				for _, v := range vv {
					c.Response().Header().Add(k, v)
				}
			}

			// Forward WebSocket upgrade if present (HMR uses WebSockets).
			if resp.StatusCode == http.StatusSwitchingProtocols {
				hijacker, ok := c.Response().(http.Hijacker)
				if !ok {
					return echo.NewHTTPError(http.StatusInternalServerError, "websocket not supported")
				}
				conn, _, err := hijacker.Hijack()
				if err != nil {
					return err
				}
				defer conn.Close()

				return c.NoContent(http.StatusOK)
			}

			return c.Stream(resp.StatusCode, resp.Header.Get("Content-Type"), resp.Body)
		}
	}
}

// isAPIPath returns true for paths that should NOT be handled as SPA routes or
// proxied to the Vite dev server (API routes, health checks, Swagger docs).
func isAPIPath(path string) bool {
	apiPrefixes := []string{"/api/", "/api", "/auth/", "/auth", "/health", "/swagger/", "/swagger", "/preview/", "/preview"}
	if v := os.Getenv("VIEWS_SKIP_PROXY"); v != "" {
		for _, prefix := range strings.Split(v, ",") {
			apiPrefixes = append(apiPrefixes, strings.TrimSpace(prefix))
		}
	}
	for _, prefix := range apiPrefixes {
		if strings.HasPrefix(path, prefix) || path == prefix {
			return true
		}
	}
	return false
}
