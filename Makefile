# ==============================================================================
# VortexS3 - Makefile de Desenvolvimento e Compilação
# ==============================================================================

BINARY_NAME := vortexs3
DOCKER_USER := delciomanico2003
IMAGE_NAME := vortexs3
VERSION := v1.0.0

.PHONY: all build run test clean docker-build docker-push help

all: build

## build: Compila o binário estático Go nativo
build:
	@echo "==> Compilando $(BINARY_NAME) Go estático..."
	CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X main.Version=$(VERSION)" -o bin/$(BINARY_NAME) ./cmd/server
	@echo "==> Binário gerado em bin/$(BINARY_NAME)"

## run: Executa o servidor Go localmente
run: build
	@echo "==> Iniciando VortexS3 em :9000 (S3) e :9001 (Console)..."
	./bin/$(BINARY_NAME) -data ./local-data -address :9000 -console-address :9001

## test: Executa todos os testes unitários do código Go
test:
	@echo "==> Executando testes unitários Go..."
	go test -v -race ./pkg/...

## docker-build: Constrói a imagem Docker multi-arquitetura
docker-build:
	@echo "==> Construindo imagem Docker..."
	docker build -t $(DOCKER_USER)/$(IMAGE_NAME):$(VERSION) -t $(DOCKER_USER)/$(IMAGE_NAME):latest .

## docker-push: Publica a imagem no Docker Hub
docker-push: docker-build
	@echo "==> Publicando no Docker Hub..."
	docker push $(DOCKER_USER)/$(IMAGE_NAME):$(VERSION)
	docker push $(DOCKER_USER)/$(IMAGE_NAME):latest

## clean: Remove binários compilados e dados locais temporários
clean:
	@echo "==> Limpando diretórios de build..."
	rm -rf bin/ local-data/

## help: Mostra os comandos disponíveis
help:
	@echo "VortexS3 Makefile - Comandos disponíveis:"
	@sed -n 's/^##//p' $(MAKEFILE_LIST) | column -t -s ':'
