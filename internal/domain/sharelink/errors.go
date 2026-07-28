package sharelink

import "errors"

var ErrShareLinkNotFound = errors.New("share link not found")

var ErrInvalidShareLink = errors.New("invalid share link")

var ErrShareLinkExpired = errors.New("share link expired")

var ErrShareLinkRevoked = errors.New("share link revoked")

var ErrShareLinkTokenMismatch = errors.New("share link token mismatch")
