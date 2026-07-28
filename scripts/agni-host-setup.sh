#!/usr/bin/env bash
set -euo pipefail

echo "=== Agni Host Setup ==="

# 1. Install k3s (single-node)
if ! command -v kubectl &>/dev/null; then
    echo "Installing k3s..."
    curl -sfL https://get.k3s.io | sh -
    mkdir -p ~/.kube
    sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
    sudo chown $(id -u):$(id -g) ~/.kube/config
fi
echo "✓ k3s ready"

# 2. Wait for node to be ready
echo "Waiting for node..."
kubectl wait --for=condition=Ready node --all --timeout=120s

# 3. Create agni namespace
kubectl create namespace agni --dry-run=client -o yaml | kubectl apply -f -
echo "✓ namespace created"

# 4. Install cert-manager
echo "Installing cert-manager..."
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.16.0/cert-manager.yaml
kubectl -n cert-manager wait --for=condition=Available deployment/cert-manager --timeout=120s
kubectl -n cert-manager wait --for=condition=Available deployment/cert-manager-webhook --timeout=120s
echo "✓ cert-manager ready"

# 5. Apply ClusterIssuer
kubectl apply -f deploy/cert-manager/cluster-issuer.yaml
echo "✓ cluster issuer applied"

# 6. Install ingress-nginx via Helm (or kubectl manifest)
echo "Installing ingress-nginx..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/cloud/deploy.yaml
kubectl -n ingress-nginx wait --for=condition=Available deployment/ingress-nginx-controller --timeout=120s
echo "✓ ingress-nginx ready"

# 7. Apply kata RuntimeClass
kubectl apply -f deploy/kata-runtimeclass.yaml
echo "✓ kata RuntimeClass applied"

# 8. Start in-cluster registry
echo "Starting registry..."
nerdctl run -d --restart=always -p 5000:5000 --name registry registry:2 2>/dev/null || echo "registry already running"
echo "✓ registry ready"

echo ""
echo "=== Agni Host Setup Complete ==="
echo "Next steps:"
echo "  1. Set up DNS A record for agni.dev → $(hostname -I | awk '{print $1}')"
echo "  2. Create agni-secrets and agni-config ConfigMap"
echo "  3. Deploy agni-api: kubectl apply -f deploy/agni-api/"
