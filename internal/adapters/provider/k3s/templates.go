package k3s

const AppPodTemplate = `apiVersion: v1
kind: Pod
metadata:
  name: app-{{.ID}}
  namespace: {{.Namespace}}
  labels:
    app: app-{{.ID}}
    agni.owner: "{{.OwnerEmail}}"
spec:
  runtimeClassName: {{.RuntimeClass}}
  restartPolicy: Always
  {{if .ImagePullSecret}}imagePullSecrets:
  - name: {{.ImagePullSecret}}{{end}}
  containers:
  - name: app
    image: {{.ImageRef}}
    env:
    - name: PORT
      value: "{{.Port}}"
    ports:
    - containerPort: {{.Port}}
    resources:
      requests:
        cpu: "250m"
        memory: "256Mi"
      limits:
        cpu: "1"
        memory: "512Mi"
    livenessProbe:
      httpGet:
        path: /
        port: {{.Port}}
      initialDelaySeconds: 10
      periodSeconds: 15
    readinessProbe:
      httpGet:
        path: /
        port: {{.Port}}
      initialDelaySeconds: 5
      periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: app-{{.ID}}
  namespace: {{.Namespace}}
spec:
  selector:
    app: app-{{.ID}}
  ports:
  - port: {{.Port}}
    targetPort: {{.Port}}
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-{{.ID}}
  namespace: {{.Namespace}}
  annotations:
    cert-manager.io/cluster-issuer: "{{.CertIssuer}}"
    nginx.ingress.kubernetes.io/auth-url: "http://agni-api.{{.Namespace}}.svc:8080/auth/session?app={{.ID}}"
    nginx.ingress.kubernetes.io/auth-signin: "https://{{.Domain}}/login?app={{.ID}}"
spec:
  ingressClassName: {{.IngressClass}}
  tls:
  - hosts:
    - "{{.Slug}}.{{.Domain}}"
    secretName: app-{{.ID}}-tls
  rules:
  - host: "{{.Slug}}.{{.Domain}}"
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-{{.ID}}
            port:
              number: {{.Port}}
`
