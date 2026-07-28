package email

import "context"

type EmailSender interface {
	SendMagicLink(ctx context.Context, email, token string) error
}
