package v1

import (
	"net/http"
	"runtime"

	"github.com/labstack/echo/v5"
)

type ClusterHealthHandler struct{}

func NewClusterHealthHandler() *ClusterHealthHandler {
	return &ClusterHealthHandler{}
}

func (h *ClusterHealthHandler) Get(c *echo.Context) error {
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status":       "healthy",
		"nodes":        1,
		"active_vms":   0,
		"total_vms":    0,
		"memory": map[string]interface{}{
			"alloc_mb":       memStats.Alloc / 1024 / 1024,
			"total_alloc_mb": memStats.TotalAlloc / 1024 / 1024,
			"sys_mb":         memStats.Sys / 1024 / 1024,
			"num_gc":         memStats.NumGC,
		},
		"go_version":    runtime.Version(),
		"goroutines":    runtime.NumGoroutine(),
		"uptime_seconds": 0,
	})
}
