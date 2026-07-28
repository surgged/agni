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
  runtimeClassName: kata-fc
  restartPolicy: Always
  containers:
  - name: app
    image: {{.ImageRef}}
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
    nginx.ingress.kubernetes.io/auth-signin: "https://agni.dev/login?app={{.ID}}"
spec:
  ingressClassName: {{.IngressClass}}
  tls:
  - hosts:
    - "{{.ID}}.agni.dev"
    secretName: app-{{.ID}}-tls
  rules:
  - host: "{{.ID}}.agni.dev"
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
