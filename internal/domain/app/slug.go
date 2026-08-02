package app

import (
	"regexp"
	"strings"

	"github.com/google/uuid"
)

var slugSanitizeRE = regexp.MustCompile(`[^a-z0-9-]`)

func NewSlug(name string, id uuid.UUID) string {
	sanitized := strings.ToLower(strings.TrimSpace(name))
	sanitized = slugSanitizeRE.ReplaceAllString(sanitized, "-")
	sanitized = strings.Trim(sanitized, "-")

	multipleDash := regexp.MustCompile(`-+`)
	sanitized = multipleDash.ReplaceAllString(sanitized, "-")

	shortID := id.String()[:8]
	base := sanitized + "-" + shortID

	if len(base) > 48 {
		trimLen := 48 - len(shortID) - 1
		if trimLen > 0 {
			base = sanitized[:trimLen] + "-" + shortID
		} else {
			base = shortID
		}
	}

	return base
}
