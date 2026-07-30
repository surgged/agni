package user_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/surgged/agni/internal/adapters/eventbus"
	"github.com/surgged/agni/internal/adapters/persistence/memory"
	uowAdapter "github.com/surgged/agni/internal/adapters/uow"
	appUser "github.com/surgged/agni/internal/application/user"
	domainUser "github.com/surgged/agni/internal/domain/user"
	"github.com/surgged/agni/pkg/crypto"
)

type mockEmailSender struct {
	sentVerification map[string]string
}

func newMockEmailSender() *mockEmailSender {
	return &mockEmailSender{sentVerification: make(map[string]string)}
}

func (m *mockEmailSender) SendMagicLink(_ context.Context, _, _ string) error {
	return nil
}

func (m *mockEmailSender) SendVerificationEmail(_ context.Context, email, _, token string) error {
	m.sentVerification[email] = token
	return nil
}

func TestEmailVerificationWorkflow(t *testing.T) {
	ctx := context.Background()
	userRepo := memory.NewUserRepository()
	bus := eventbus.NewInMemory()
	unitOfWork := uowAdapter.NewInMemoryUoW(bus, userRepo)
	hasher := crypto.NewBCryptHasher()
	emailSender := newMockEmailSender()

	handler := appUser.NewCommandHandler(userRepo, unitOfWork, hasher, emailSender)

	// 1. Signup user
	u, err := handler.HandleCreate(ctx, appUser.CreateUserCommand{
		Name:     "Test User",
		Email:    "test@example.com",
		Password: "password123",
	})
	require.NoError(t, err)
	assert.False(t, u.IsEmailVerified())
	assert.Nil(t, u.EmailVerifiedAt)

	token, ok := emailSender.sentVerification["test@example.com"]
	assert.True(t, ok)
	assert.NotEmpty(t, token)

	// 2. Login before email verification should fail with ErrEmailNotVerified
	_, err = handler.HandleAuthenticate(ctx, appUser.AuthenticateUserCommand{
		Email:    "test@example.com",
		Password: "password123",
	})
	assert.ErrorIs(t, err, domainUser.ErrEmailNotVerified)

	// 3. Verify email with token
	verifiedUser, err := handler.HandleVerifyEmail(ctx, appUser.VerifyEmailCommand{Token: token})
	require.NoError(t, err)
	assert.True(t, verifiedUser.IsEmailVerified())
	assert.NotNil(t, verifiedUser.EmailVerifiedAt)
	assert.Empty(t, verifiedUser.VerificationToken)

	// 4. Login after verification should succeed
	authenticatedUser, err := handler.HandleAuthenticate(ctx, appUser.AuthenticateUserCommand{
		Email:    "test@example.com",
		Password: "password123",
	})
	require.NoError(t, err)
	assert.Equal(t, u.ID, authenticatedUser.ID)
}
