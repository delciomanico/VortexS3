#!/usr/bin/env bash
set -e

DOCKER_USER="${1:-delciomanico2003}"
IMAGE_NAME="${2:-vortexs3}"
VERSION="${3:-v1.0.0}"

FULL_TAG="${DOCKER_USER}/${IMAGE_NAME}:${VERSION}"
LATEST_TAG="${DOCKER_USER}/${IMAGE_NAME}:latest"

echo "=================================================="
echo "🚀 Publicando ${FULL_TAG} no Docker Hub"
echo "=================================================="

echo "[1/4] Verificando Docker Buildx..."
docker buildx create --use --name vortex-builder 2>/dev/null || docker buildx use vortex-builder

echo "[2/4] Verificando login no Docker Hub..."
if ! docker info | grep -q "Username: ${DOCKER_USER}"; then
  echo "Por favor realize o login no Docker Hub:"
  docker login -u "${DOCKER_USER}"
fi

echo "[3/4] Compilando para linux/amd64 e linux/arm64 e enviando..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t "${FULL_TAG}" \
  -t "${LATEST_TAG}" \
  --push .

echo "=================================================="
echo "✅ Imagem publicada com sucesso no Docker Hub!"
echo "Para executar seu storage em qualquer servidor:"
echo "docker run -d -p 9000:9000 -p 9001:9001 -v /meu/storage:/data ${LATEST_TAG}"
echo "=================================================="
