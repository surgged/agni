package resend

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"
)

type Client struct {
	apiKey     string
	fromAddr   string
	domain     string
	httpClient *http.Client
}

func NewClient(apiKey, fromAddr, domain string) *Client {
	return &Client{
		apiKey:   apiKey,
		fromAddr: fromAddr,
		domain:   domain,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type resendRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

func (c *Client) SendMagicLink(ctx context.Context, recipientEmail string, token string) error {
	link := "https://" + c.domain + "/auth/magic?token=" + token
	slog.InfoContext(ctx, "sending magic link", "email", recipientEmail, "link", link)

	if c.apiKey == "" {
		slog.WarnContext(ctx, "resend_api_key not configured; magic link logged above for dev/testing")
		return nil
	}

	payload := resendRequest{
		From:    c.fromAddr,
		To:      []string{recipientEmail},
		Subject: "Your Agni Magic Login Link",
		HTML:    fmt.Sprintf("<p>Click the link below to log in to Agni:</p><p><a href=\"%s\">%s</a></p><p>This link expires in 24 hours.</p>", link, link),
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("resend: marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("resend: new request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("resend: send email http: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("resend: API error (%d): %s", resp.StatusCode, string(respBody))
	}

	slog.InfoContext(ctx, "magic link email sent via resend", "email", recipientEmail)
	return nil
}

