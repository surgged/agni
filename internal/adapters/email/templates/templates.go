package templates

import _ "embed"

// MagicLinkHTML is the static HTML email template generated from views/src/emails/MagicLinkEmail.tsx.
//
//go:embed magic_link.html
var MagicLinkHTML string

// VerifyEmailHTML is the static HTML email template for verifying a user's email address.
//
//go:embed verify_email.html
var VerifyEmailHTML string
