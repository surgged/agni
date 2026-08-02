package k3s

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/client-go/kubernetes/fake"

	"github.com/surgged/agni/internal/ports"
)

func TestK3sProvider_WithFakeClientset(t *testing.T) {
	fakeClient := fake.NewSimpleClientset()
	provider := NewProviderWithClientset(fakeClient, "agni-test", "registry.agni.svc:5000", "inlb.site")
	require.NotNil(t, provider)

	spec := ports.PodSpec{
		Name:       "app-test-123",
		ImageRef:   "registry.agni.svc:5000/apps/test-123:latest",
		OwnerEmail: "test@example.com",
		Port:       8080,
		AppID:      "test-123",
	}

	err := provider.Deploy(context.Background(), spec)
	assert.NoError(t, err)

	status, err := provider.Status(context.Background(), "app-test-123")
	assert.NoError(t, err)
	assert.Equal(t, "Pending", status.Phase) // fake client creates pod in Pending state

	err = provider.Destroy(context.Background(), "app-test-123")
	assert.NoError(t, err)
}

func TestK3sProvider_SimulatedDevMode(t *testing.T) {
	provider := NewProviderWithClientset(nil, "agni-test", "registry.agni.svc:5000", "inlb.site")
	require.NotNil(t, provider)

	spec := ports.PodSpec{
		Name:       "app-test-456",
		ImageRef:   "registry.agni.svc:5000/apps/test-456:latest",
		OwnerEmail: "dev@example.com",
		Port:       8080,
		AppID:      "test-456",
	}

	err := provider.Deploy(context.Background(), spec)
	assert.NoError(t, err)

	status, err := provider.Status(context.Background(), "app-test-456")
	assert.NoError(t, err)
	assert.Equal(t, "Running", status.Phase)

	err = provider.Destroy(context.Background(), "app-test-456")
	assert.NoError(t, err)
}
