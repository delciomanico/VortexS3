# ==============================================================================
# VortexS3 - Multi-Stage Dockerfile Otimizado para Docker Hub (Multi-Arch)
# Suporta: linux/amd64, linux/arm64
# ==============================================================================

FROM --platform=$BUILDPLATFORM golang:1.23-alpine AS builder

WORKDIR /build
RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum* ./
RUN go mod download || true

COPY . .

ARG TARGETOS TARGETARCH
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build \
    -trimpath \
    -ldflags="-s -w -X main.Version=v1.0.0 -extldflags '-static'" \
    -o /vortexs3 ./cmd/server

FROM alpine:3.20

LABEL maintainer="VortexS3 Team <contato@vortexs3.io>"
LABEL description="Servidor de Object Storage compatível com AWS S3 com replicação e backups"

RUN apk --no-cache add ca-certificates tzdata curl

RUN addgroup -S -g 10001 vortex && \
    adduser -S -u 10001 -G vortex -h /data vortex

WORKDIR /data
COPY --from=builder /vortexs3 /usr/local/bin/vortexs3

RUN mkdir -p /data/buckets /data/meta /data/backups && \
    chown -R vortex:vortex /data

USER vortex:vortex

EXPOSE 9000 9001
VOLUME ["/data"]

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:9000/healthz || exit 1

ENTRYPOINT ["/usr/local/bin/vortexs3"]
CMD ["-data", "/data", "-address", ":9000", "-console-address", ":9001"]
