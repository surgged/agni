package s3

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	"github.com/surgged/agni/internal/ports"
)

type Store struct {
	client   *minio.Client
	bucket   string
	endpoint string
	region   string
	useSSL   bool
}

func NewStore(endpoint, region, bucket, accessKey, secretKey string, useSSL bool) (*Store, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
		Region: region,
	})
	if err != nil {
		return nil, fmt.Errorf("s3: create client: %w", err)
	}
	return &Store{
		client:   client,
		bucket:   bucket,
		endpoint: endpoint,
		region:   region,
		useSSL:   useSSL,
	}, nil
}

func (s *Store) PresignedPutURL(ctx context.Context, key string, ttl time.Duration) (string, error) {
	u, err := s.client.PresignedPutObject(ctx, s.bucket, key, ttl)
	if err != nil {
		return "", fmt.Errorf("s3: presign put %s: %w", key, err)
	}
	return u.String(), nil
}

func (s *Store) PresignedGetURL(ctx context.Context, key string, ttl time.Duration) (string, error) {
	reqParams := make(url.Values)
	u, err := s.client.PresignedGetObject(ctx, s.bucket, key, ttl, reqParams)
	if err != nil {
		return "", fmt.Errorf("s3: presign get %s: %w", key, err)
	}
	return u.String(), nil
}

func (s *Store) Head(ctx context.Context, key string) (int64, bool, error) {
	info, err := s.client.StatObject(ctx, s.bucket, key, minio.StatObjectOptions{})
	if err != nil {
		resp := minio.ToErrorResponse(err)
		if resp.Code == "NoSuchKey" || resp.StatusCode == 404 {
			return 0, false, nil
		}
		return 0, false, fmt.Errorf("s3: head %s: %w", key, err)
	}
	return info.Size, true, nil
}

func (s *Store) Delete(ctx context.Context, key string) error {
	err := s.client.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("s3: delete %s: %w", key, err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// Multipart upload — for files > 100 MB.
// ---------------------------------------------------------------------------

func (s *Store) CreateMultipartUpload(ctx context.Context, key string, totalSize int64, partSize int64, ttl time.Duration) (string, []ports.PartUploadURL, error) {
	core := &minio.Core{Client: s.client}
	uploadID, err := core.NewMultipartUpload(ctx, s.bucket, key, minio.PutObjectOptions{})
	if err != nil {
		return "", nil, fmt.Errorf("s3: create multipart upload: %w", err)
	}

	numParts := int((totalSize + partSize - 1) / partSize)
	parts := make([]ports.PartUploadURL, numParts)

	for i := 1; i <= numParts; i++ {
		reqParams := make(url.Values)
		reqParams.Set("partNumber", fmt.Sprintf("%d", i))
		reqParams.Set("uploadId", uploadID)

		u, err := s.client.PresignHeader(ctx, http.MethodPut, s.bucket, key, ttl, reqParams, nil)
		if err != nil {
			_ = core.AbortMultipartUpload(ctx, s.bucket, key, uploadID)
			return "", nil, fmt.Errorf("s3: presign part %d: %w", i, err)
		}
		parts[i-1] = ports.PartUploadURL{
			PartNumber: i,
			UploadURL:  u.String(),
		}
	}

	return uploadID, parts, nil
}

func (s *Store) CompleteMultipartUpload(ctx context.Context, key string, uploadID string, parts []ports.UploadedPart) error {
	core := &minio.Core{Client: s.client}

	minioParts := make([]minio.CompletePart, len(parts))
	for i, p := range parts {
		minioParts[i] = minio.CompletePart{
			PartNumber: p.PartNumber,
			ETag:       p.ETag,
		}
	}

	_, err := core.CompleteMultipartUpload(ctx, s.bucket, key, uploadID, minioParts, minio.PutObjectOptions{})
	if err != nil {
		return fmt.Errorf("s3: complete multipart upload: %w", err)
	}
	return nil
}

func (s *Store) AbortMultipartUpload(ctx context.Context, key string, uploadID string) error {
	core := &minio.Core{Client: s.client}
	if err := core.AbortMultipartUpload(ctx, s.bucket, key, uploadID); err != nil {
		return fmt.Errorf("s3: abort multipart upload: %w", err)
	}
	return nil
}

var _ ports.ArchiveStore = (*Store)(nil)
