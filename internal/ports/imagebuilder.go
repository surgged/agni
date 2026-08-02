package ports

import (
	"context"
	"time"
)

//go:generate mockgen -destination=../mocks/mock_imagebuilder.go -package=mocks github.com/surgged/agni/internal/ports ImageBuilder

type RegistryAuth struct {
	Username string
	Password string
}

func (r RegistryAuth) String() string {
	return "RegistryAuth{Username: ***, Password: ***}"
}

type BuildSpec struct {
	AppID        string
	ContextURL   string
	Dockerfile   string
	ImageRef     string
	RegistryAuth RegistryAuth
	Timeout      time.Duration
	MaxLogTail   int
}

type ImageBuilder interface {
	Build(ctx context.Context, spec BuildSpec) error
}
