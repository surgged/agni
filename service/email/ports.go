package email

import "context"

type EmailSender interface {
	SendMagicLink(ctx context.Context, email, token string) error
	SendVerificationEmail(ctx context.Context, recipientEmail, recipientName, token string) error
}
