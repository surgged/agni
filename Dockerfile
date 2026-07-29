# syntax=docker/dockerfile:1.6

# Stage 1 — build the React SPA frontend
FROM oven/bun:1-alpine AS frontend
WORKDIR /src/views
COPY views/package.json views/bun.lock ./
RUN bun install --frozen-lockfile
COPY views/ .
RUN bun run build

# Stage 2 — compile the Go server (embeds static/dist/)
FROM golang:1.26-alpine AS backend
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /src/views/../static/dist/ ./static/dist/
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/server ./cmd/server

# Stage 3 — minimal runtime
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=backend /out/server /app/server
COPY --from=backend /src/configs/config.yaml /app/configs/config.yaml
COPY --from=backend /src/db/migrations /app/db/migrations
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/app/server"]
