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
