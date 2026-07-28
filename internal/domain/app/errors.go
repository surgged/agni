package app

import "errors"

var ErrAppNotFound = errors.New("app not found")

var ErrInvalidApp = errors.New("invalid app")

var ErrInvalidAppTransition = errors.New("invalid app status transition")
