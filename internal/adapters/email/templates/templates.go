package templates

import _ "embed"

// MagicLinkHTML is the static HTML email template generated from views/src/emails/MagicLinkEmail.tsx.
//go:embed magic_link.html
var MagicLinkHTML string
