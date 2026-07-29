package middleware

import (
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"github.com/labstack/echo/v5"
)

func HostRouter(domain string) echo.MiddlewareFunc {
	if domain == "" {
		domain = "inlb.site"
	}
	domainSuffix := "." + strings.ToLower(domain)

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			host := strings.ToLower(c.Request().Host)
			if idx := strings.Index(host, ":"); idx != -1 {
				host = host[:idx]
			}

			isDomainMatch := strings.HasSuffix(host, domainSuffix)
			isLocalhostMatch := strings.HasSuffix(host, ".localhost")

			if isDomainMatch || isLocalhostMatch {
				var subdomain string
				if isDomainMatch {
					subdomain = strings.TrimSuffix(host, domainSuffix)
				} else {
					subdomain = strings.TrimSuffix(host, ".localhost")
				}

				if subdomain != "" && subdomain != "www" && subdomain != "api" && subdomain != "agni" {
					dir := filepath.Join(".", "data", "apps", subdomain)
					if info, err := os.Stat(dir); err == nil && info.IsDir() {
						slog.InfoContext(c.Request().Context(), "host router rendering app UI", "subdomain", subdomain, "host", c.Request().Host, "path", c.Request().URL.Path)
						reqPath := c.Request().URL.Path
						if reqPath == "" || reqPath == "/" {
							reqPath = "index.html"
						}
						targetFile := filepath.Join(dir, filepath.Clean(reqPath))
						if tInfo, tErr := os.Stat(targetFile); tErr == nil && tInfo.IsDir() {
							targetFile = filepath.Join(targetFile, "index.html")
						}
						if _, tErr := os.Stat(targetFile); os.IsNotExist(tErr) {
							targetFile = filepath.Join(dir, "index.html")
						}
						return c.File(targetFile)
					}
				}
			}

			return next(c)
		}
	}
}
