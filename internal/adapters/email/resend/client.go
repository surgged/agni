package resend

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/surgged/agni/internal/adapters/email/templates"
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
		HTML:    renderMagicLinkHTML(link, recipientEmail),
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
		slog.ErrorContext(ctx, "resend: send magic link http error", "email", recipientEmail, "error", err)
		return fmt.Errorf("resend: send email http: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			slog.WarnContext(ctx, "resend: failed to read error response body for magic link", "email", recipientEmail, "error", readErr)
		}
		return fmt.Errorf("resend: API error (%d): %s", resp.StatusCode, string(respBody))
	}

	slog.InfoContext(ctx, "magic link email sent via resend", "email", recipientEmail)
	return nil
}

func (c *Client) SendVerificationEmail(ctx context.Context, recipientEmail, recipientName, token string) error {
	domain := c.domain
	if domain == "" {
		domain = "localhost:5173"
	}
	proto := "https://"
	if strings.HasPrefix(domain, "localhost") || strings.HasPrefix(domain, "127.0.0.1") {
		proto = "http://"
	}
	link := fmt.Sprintf("%s%s/verify-email?token=%s", proto, domain, token)
	slog.InfoContext(ctx, "sending email verification", "email", recipientEmail, "name", recipientName, "link", link)

	if c.apiKey == "" {
		slog.WarnContext(ctx, "resend_api_key not configured; email verification link logged above for dev/testing")
		return nil
	}

	payload := resendRequest{
		From:    c.fromAddr,
		To:      []string{recipientEmail},
		Subject: "Verify Your Email Address - Agni",
		HTML:    renderVerifyEmailHTML(link, recipientName, recipientEmail),
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
		slog.ErrorContext(ctx, "resend: send verification email http error", "email", recipientEmail, "error", err)
		return fmt.Errorf("resend: send email http: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			slog.WarnContext(ctx, "resend: failed to read error response body for verification email", "email", recipientEmail, "error", readErr)
		}
		return fmt.Errorf("resend: API error (%d): %s", resp.StatusCode, string(respBody))
	}

	slog.InfoContext(ctx, "verification email sent via resend", "email", recipientEmail)
	return nil
}

func renderMagicLinkHTML(link string, recipientEmail string) string {
	r := strings.NewReplacer(
		"{{MAGIC_LINK}}", link,
		"{{RECIPIENT_EMAIL}}", recipientEmail,
	)
	return r.Replace(templates.MagicLinkHTML)
}

func renderVerifyEmailHTML(link string, recipientName string, recipientEmail string) string {
	name := recipientName
	if name == "" {
		name = "there"
	}
	r := strings.NewReplacer(
		"{{VERIFY_LINK}}", link,
		"{{RECIPIENT_NAME}}", name,
		"{{RECIPIENT_EMAIL}}", recipientEmail,
	)
	return r.Replace(templates.VerifyEmailHTML)
}
