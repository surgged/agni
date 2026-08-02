package app

import "errors"

var ErrAppNotFound = errors.New("app not found")

var ErrInvalidApp = errors.New("invalid app")

var ErrInvalidAppTransition = errors.New("invalid app status transition")

var ErrNoDockerfile = errors.New("no Dockerfile found in archive")

var ErrNoWebPort = errors.New("no web port detected")

var ErrArchiveMissing = errors.New("archive missing")

var ErrDeployInProgress = errors.New("deployment already in progress")

var ErrQuotaExceeded = errors.New("deployment quota exceeded")

var ErrBuildFailed = errors.New("image build failed")

var ErrSlugConflict = errors.New("slug conflict")
