package resend

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSendMagicLink_DevMode(t *testing.T) {
	client := NewClient("", "agni@agni.dev", "agni.dev")
	err := client.SendMagicLink(context.Background(), "user@example.com", "test-token-123")
	assert.NoError(t, err)
}

func TestRenderMagicLinkHTML(t *testing.T) {
	link := "https://inlb.site/auth/magic?token=xyz123"
	email := "user@example.com"
	html := renderMagicLinkHTML(link, email)
	assert.Contains(t, html, link)
	assert.Contains(t, html, email)
	assert.Contains(t, html, "Hi user@example.com,")
	assert.Contains(t, html, "Sign in to your account")
	assert.Contains(t, html, "Agni")
}

