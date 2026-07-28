# syntax=docker/dockerfile:1.6
FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/server ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=build /out/server /app/server
COPY --from=build /src/configs/config.yaml /app/configs/config.yaml
COPY --from=build /src/db/migrations /app/db/migrations
COPY --from=build /src/static /app/static
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/app/server"]
