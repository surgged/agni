package k3s

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"sync"

	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	utilyaml "k8s.io/apimachinery/pkg/util/yaml"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	"github.com/surgged/agni/internal/ports"
)

type Provider struct {
	clientset    kubernetes.Interface
	namespace    string
	registryAddr string
	certIssuer   string
	ingressClass string

	mu             sync.RWMutex
	devStatusStore map[string]ports.PodStatus
}

func NewProvider(namespace, registryAddr string) *Provider {
	if namespace == "" {
		namespace = "agni"
	}
	p := &Provider{
		namespace:      namespace,
		registryAddr:   registryAddr,
		certIssuer:     "letsencrypt-prod",
		ingressClass:   "nginx",
		devStatusStore: make(map[string]ports.PodStatus),
	}

	cs, err := buildClientset()
	if err != nil {
		slog.Warn("k3s client-go unavailable, running in simulated dev/test mode", "error", err)
	} else {
		p.clientset = cs
		slog.Info("k3s client-go connected successfully", "namespace", namespace)
	}

	return p
}

func NewProviderWithClientset(cs kubernetes.Interface, namespace, registryAddr string) *Provider {
	if namespace == "" {
		namespace = "agni"
	}
	return &Provider{
		clientset:      cs,
		namespace:      namespace,
		registryAddr:   registryAddr,
		certIssuer:     "letsencrypt-prod",
		ingressClass:   "nginx",
		devStatusStore: make(map[string]ports.PodStatus),
	}
}

func (p *Provider) GetClientset() kubernetes.Interface {
	return p.clientset
}

func buildClientset() (kubernetes.Interface, error) {
	config, err := rest.InClusterConfig()
	if err == nil {
		return kubernetes.NewForConfig(config)
	}

	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		home, _ := os.UserHomeDir()
		kubeconfig = filepath.Join(home, ".kube", "config")
		if _, err := os.Stat("/etc/rancher/k3s/k3s.yaml"); err == nil {
			kubeconfig = "/etc/rancher/k3s/k3s.yaml"
		}
	}

	config, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		return nil, fmt.Errorf("failed to build kubeconfig from %s: %w", kubeconfig, err)
	}

	return kubernetes.NewForConfig(config)
}

type templateParams struct {
	ID           string
	Namespace    string
	OwnerEmail   string
	ImageRef     string
	Port         int32
	CertIssuer   string
	IngressClass string
}

func (p *Provider) Deploy(ctx context.Context, spec ports.PodSpec) error {
	slog.InfoContext(ctx, "k3s deploy requested",
		"name", spec.Name,
		"image", spec.ImageRef,
		"namespace", p.namespace,
		"app_id", spec.AppID,
	)

	tmpl, err := template.New("manifest").Parse(AppPodTemplate)
	if err != nil {
		return fmt.Errorf("k3s: parse manifest template: %w", err)
	}

	params := templateParams{
		ID:           spec.AppID,
		Namespace:    p.namespace,
		OwnerEmail:   spec.OwnerEmail,
		ImageRef:     spec.ImageRef,
		Port:         spec.Port,
		CertIssuer:   p.certIssuer,
		IngressClass: p.ingressClass,
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, params); err != nil {
		return fmt.Errorf("k3s: execute manifest template: %w", err)
	}

	if p.clientset == nil {
		p.mu.Lock()
		p.devStatusStore[spec.Name] = ports.PodStatus{
			Phase: "Running",
			URL:   fmt.Sprintf("https://%s.agni.dev", spec.AppID),
		}
		p.mu.Unlock()
		slog.WarnContext(ctx, "k3s deploy simulated (dev mode)", "name", spec.Name)
		return nil
	}

	decoder := utilyaml.NewYAMLOrJSONDecoder(&buf, 4096)
	for {
		var raw map[string]interface{}
		if err := decoder.Decode(&raw); err != nil {
			if err == io.EOF {
				break
			}
			return fmt.Errorf("k3s: decode manifest chunk: %w", err)
		}
		if len(raw) == 0 {
			continue
		}

		jsonBytes, err := json.Marshal(raw)
		if err != nil {
			return fmt.Errorf("k3s: marshal raw manifest: %w", err)
		}

		kind, _ := raw["kind"].(string)
		switch kind {
		case "Pod":
			var pod corev1.Pod
			if err := utilyaml.NewYAMLOrJSONDecoder(bytes.NewReader(jsonBytes), 4096).Decode(&pod); err != nil {
				return fmt.Errorf("k3s: decode pod: %w", err)
			}
			if _, err := p.clientset.CoreV1().Pods(p.namespace).Get(ctx, pod.Name, metav1.GetOptions{}); err == nil {
				if _, err := p.clientset.CoreV1().Pods(p.namespace).Update(ctx, &pod, metav1.UpdateOptions{}); err != nil {
					return fmt.Errorf("k3s: update pod %s: %w", pod.Name, err)
				}
			} else {
				if _, err := p.clientset.CoreV1().Pods(p.namespace).Create(ctx, &pod, metav1.CreateOptions{}); err != nil {
					return fmt.Errorf("k3s: create pod %s: %w", pod.Name, err)
				}
			}

		case "Service":
			var svc corev1.Service
			if err := utilyaml.NewYAMLOrJSONDecoder(bytes.NewReader(jsonBytes), 4096).Decode(&svc); err != nil {
				return fmt.Errorf("k3s: decode service: %w", err)
			}
			if existing, err := p.clientset.CoreV1().Services(p.namespace).Get(ctx, svc.Name, metav1.GetOptions{}); err == nil {
				svc.ResourceVersion = existing.ResourceVersion
				if _, err := p.clientset.CoreV1().Services(p.namespace).Update(ctx, &svc, metav1.UpdateOptions{}); err != nil {
					return fmt.Errorf("k3s: update service %s: %w", svc.Name, err)
				}
			} else {
				if _, err := p.clientset.CoreV1().Services(p.namespace).Create(ctx, &svc, metav1.CreateOptions{}); err != nil {
					return fmt.Errorf("k3s: create service %s: %w", svc.Name, err)
				}
			}

		case "Ingress":
			var ing networkingv1.Ingress
			if err := utilyaml.NewYAMLOrJSONDecoder(bytes.NewReader(jsonBytes), 4096).Decode(&ing); err != nil {
				return fmt.Errorf("k3s: decode ingress: %w", err)
			}
			if existing, err := p.clientset.NetworkingV1().Ingresses(p.namespace).Get(ctx, ing.Name, metav1.GetOptions{}); err == nil {
				ing.ResourceVersion = existing.ResourceVersion
				if _, err := p.clientset.NetworkingV1().Ingresses(p.namespace).Update(ctx, &ing, metav1.UpdateOptions{}); err != nil {
					return fmt.Errorf("k3s: update ingress %s: %w", ing.Name, err)
				}
			} else {
				if _, err := p.clientset.NetworkingV1().Ingresses(p.namespace).Create(ctx, &ing, metav1.CreateOptions{}); err != nil {
					return fmt.Errorf("k3s: create ingress %s: %w", ing.Name, err)
				}
			}
		}
	}

	slog.InfoContext(ctx, "k3s deploy resources created/updated", "name", spec.Name)
	return nil
}

func (p *Provider) Destroy(ctx context.Context, name string) error {
	slog.InfoContext(ctx, "k3s destroy requested", "name", name)

	if p.clientset == nil {
		p.mu.Lock()
		delete(p.devStatusStore, name)
		p.mu.Unlock()
		slog.WarnContext(ctx, "k3s destroy simulated (dev mode)", "name", name)
		return nil
	}

	deletePolicy := metav1.DeletePropagationBackground
	delOpts := metav1.DeleteOptions{PropagationPolicy: &deletePolicy}

	_ = p.clientset.NetworkingV1().Ingresses(p.namespace).Delete(ctx, name, delOpts)
	_ = p.clientset.CoreV1().Services(p.namespace).Delete(ctx, name, delOpts)
	_ = p.clientset.CoreV1().Pods(p.namespace).Delete(ctx, name, delOpts)

	slog.InfoContext(ctx, "k3s destroy complete", "name", name)
	return nil
}

func (p *Provider) Status(ctx context.Context, name string) (ports.PodStatus, error) {
	if p.clientset == nil {
		p.mu.RLock()
		st, ok := p.devStatusStore[name]
		p.mu.RUnlock()
		if !ok {
			st = ports.PodStatus{Phase: "Running", URL: ""}
		}
		return st, nil
	}

	pod, err := p.clientset.CoreV1().Pods(p.namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return ports.PodStatus{Phase: "Unknown", URL: ""}, err
	}

	phase := string(pod.Status.Phase)
	if phase == "" {
		phase = "Pending"
	}

	return ports.PodStatus{
		Phase: phase,
		URL:   "",
	}, nil
}

var _ ports.ContainerProvider = (*Provider)(nil)

