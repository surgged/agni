package resend

import (
	"context"
	"log/slog"
)

type Client struct {
	apiKey   string
	fromAddr string
	domain   string
}

func NewClient(apiKey, fromAddr, domain string) *Client {
	return &Client{apiKey: apiKey, fromAddr: fromAddr, domain: domain}
}

func (c *Client) SendMagicLink(ctx context.Context, email string, token string) error {
	link := "https://" + c.domain + "/auth/magic?token=" + token
	slog.InfoContext(ctx, "sending magic link", "email", email, "link", link)
	return nil
}
