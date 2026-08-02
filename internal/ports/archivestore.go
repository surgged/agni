package ports

import (
	"context"
	"time"
)

//go:generate mockgen -destination=../mocks/mock_archivestore.go -package=mocks github.com/surgged/agni/internal/ports ArchiveStore

type PartUploadURL struct {
	PartNumber int    `json:"part_number"`
	UploadURL  string `json:"upload_url"`
}

type UploadedPart struct {
	PartNumber int    `json:"part_number"`
	ETag       string `json:"etag"`
}

type MultipartUploadInit struct {
	UploadID   string          `json:"upload_id"`
	ArchiveKey string          `json:"archive_key"`
	Parts      []PartUploadURL `json:"parts"`
}

type ArchiveStore interface {
	PresignedPutURL(ctx context.Context, key string, ttl time.Duration) (string, error)
	PresignedGetURL(ctx context.Context, key string, ttl time.Duration) (string, error)
	Head(ctx context.Context, key string) (size int64, ok bool, err error)
	Delete(ctx context.Context, key string) error
	CreateMultipartUpload(ctx context.Context, key string, totalSize int64, partSize int64, ttl time.Duration) (uploadID string, parts []PartUploadURL, err error)
	CompleteMultipartUpload(ctx context.Context, key string, uploadID string, parts []UploadedPart) error
	AbortMultipartUpload(ctx context.Context, key string, uploadID string) error
}
