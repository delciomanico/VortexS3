# VortexS3: Servidor de Object Storage em Go & Console de Cluster S3

Servidor de armazenamento de objetos leve, 100% compatível com a API S3 da AWS, escrito em Go nativo, acompanhado de sistema de replicação multi-nó com failover, motor de backups e snapshots automatizados, empacotamento pronto para publicação no Docker Hub e Console Web administrativo completo inspirado no MinIO.

## User Review & Critical Decisions

> [!IMPORTANT]
> Decisões confirmadas a partir do questionário de alinhamento técnico:
> - **Modelo de Replicação**: Replicação multi-nó com detecção de falhas de nós (heartbeat) e sincronização ativa de objetos entre nós pares.
> - **Camada de Persistência**: Sistema de arquivos local para blobs/dados brutos com metadados estruturados transacionais (BadgerDB/SQLite embutido no Go).
> - **Distribuição Docker Hub**: Imagem multi-arch otimizada em Go estático (`CGO_ENABLED=0`) sobre Alpine/Scratch com suporte a `linux/amd64` e `linux/arm64`.
> - **Console Administrativo**: Painel web completo com gestão de Buckets, Navegador de Arquivos (upload, download, presigned URLs, tags), Topologia de Nós de Replicação, Agendamento e Execução de Backups/Snapshots, Gestão de Access Keys (IAM S3) e Métricas em tempo real.

---

## 1. Visão Geral e Conceito Central

### O que o VortexS3 entrega:
1. **Engine Go do Servidor de Storage (S3 API Engine)**:
   - Implementação completa dos endpoints S3 standard (`GET`, `PUT`, `DELETE`, `HEAD` para Buckets e Objects).
   - Suporte a multipart uploads, presigned URLs temporárias com assinatura SHA256 HMAC, metadados customizados (`x-amz-meta-*`) e políticas de bucket.
   - Armazenamento em diretório particionado com integridade calculada por hash MD5/SHA256 (ETag compatível).
2. **Motor de Replicação Automática de Alta Disponibilidade**:
   - Registro de nós pares no cluster (nós locais e remotos).
   - Barramento de replicação síncrona/assíncrona de eventos de escrita e exclusão.
   - Detecção de heartbeat de peers e fila de sincronização atrasada (catch-up queue) quando nós voltam a ficar online.
3. **Sistema de Backups & Snapshots Automatizados**:
   - Políticas de backup agendadas (diário, semanal, contínuo).
   - Geração de arquivos de snapshot comprimidos (.tar.gz / tar.zst) do repositório de metadados e blobs.
   - Restauração pontual (Point-In-Time) com um clique e exportação remota.
4. **Erasure Coding (Reed-Solomon 4+2) & Bitrot Auto-Cura (Scrubber)**:
   - Fragmentação em 4 blocos de dados e 2 de paridade distribuídos pelo cluster.
   - Detecção silenciosa de corrupção física (HighwayHash / SHA256) e reconstrução matemática sem perda de dados.
5. **Métricas Prometheus Nativas & Kubernetes Probes**:
   - Endpoint `/metrics` no formato OpenMetrics (latência P99, TTFB, requisições por segundo).
   - Probes `/healthz` (liveness) e `/readyz` (readiness) com manifesto Kubernetes StatefulSet completo (`deploy/kubernetes.yaml`).
6. **Criptografia SSE-S3 & Object Lock (WORM)**:
   - Cifragem transparente em repouso com AES-256-GCM.
   - Imutabilidade contra exclusão acidental ou ransomware com Legal Hold e períodos de retenção em conformidade regulatória.
7. **Console Web de Administração no Estilo Supabase**:
   - Navegação lateral compacta, modo escuro (#121212 / #171717) com realces verde-esmeralda (#3ECF8E).
   - Navegação por buckets, upload drag-and-drop, presigned URLs instantâneas, logs e gerador de código Go pronto para Docker Hub.

---

## 2. Experiência do Usuário & Design Visual

Seguindo rigorosamente o `frontend-design` e as diretrizes de consoles SaaS/DevOps:
- **Identidade Visual**: Paleta neutra técnica escura/clara com ardósia profunda (`#0B1120`, `#1E293B`, `#F8FAFC`), azul cobalto industrial (`#2563EB`) para ações primárias e acentos semânticos pontuais (verde para nós saudáveis, âmbar para sincronização pendente, carmesim para falhas de nó).
- **Tipografia**: `Plus Jakarta Sans` para estrutura e navegação, combinado com `JetBrains Mono` / `tabular-nums` para tamanhos de arquivo em bytes, hashes MD5/ETag, chaves de API e timestamps ISO.
- **Top Bar Contract**:
  - Zona 1: Wordmark limpo `VortexS3 Storage`.
  - Zona 2: Links de navegação direta (`Buckets`, `Navegador`, `Replicação`, `Backups`, `Credenciais IAM`, `Docker & Código Go`).
  - Zona 3: Ação primária contextual (`Criar Bucket` ou `Iniciar Backup`).
- **Sem Anti-Padrões de IA**: Nada de pílulas coloridas estáticas, sem gradientes roxos genéricos, sem tickers falsos de telemetria; tabelas com alinhamento rigoroso e números tabulares.

---

## 3. Principais Decisões de Produto & Arquitetura

1. **Simulador e Runtime Totalmente Funcional no Applet + Exportador de Código Go Puro**:
   - O console no applet oferece o backend executável integrado para testar imediatamente todas as ações S3 (criar buckets, upload de arquivos reais com Blob/ArrayBuffer, simulação e teste de replicação em 3 nós em tempo real, geração de backups).
   - Inclui o gerador completo e testado dos arquivos Go nativos prontos para compilar com `go build` e empacotar no Docker.
2. **Camada de Metadados em Go**:
   - Metadados armazenados em banco embutido chave-valor indexado (BadgerDB/SQLite), garantindo transações atômicas para listagem rápida de prefixos, paginação de objetos e controle de lock sem travamentos em concorrência.
3. **Pipeline de Publicação no Docker Hub**:
   - `Dockerfile` com multi-stage build: etapa de compilação com `golang:1.23-alpine` e etapa final minimalista com `alpine:latest` ou `scratch` (imagem final < 25MB).
   - `docker-compose.yml` demonstrando 3 nós com replicação automática e Nginx/Traefik na frente.
   - Script shell automatizado `publish-dockerhub.sh` com suporte a `docker buildx build --platform linux/amd64,linux/arm64 -t seu-usuario/vortexs3:latest --push .`.

---

## 4. Diagrama de Arquitetura Técnica

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Cliente S3 / SDK AWS / Console Web                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST (Porta 9000 / 9001)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     VORTEX S3 CORE ENGINE (GO)                         │
│  ┌───────────────────────┐  ┌──────────────────────────────────────┐   │
│  │   S3 REST API Router  │  │   Autenticação AWS SigV4 / SigV2     │   │
│  │  (Buckets, Objects,   │  │   (Access Key & Secret Key IAM)      │   │
│  │   Multipart, Presign) │  └──────────────────────────────────────┘   │
│  └───────────┬───────────┘                                             │
│              ▼                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │             Camada de Storage & Metadados (Go Driver)            │  │
│  │  ┌─────────────────────────────┐ ┌────────────────────────────┐  │  │
│  │  │ Filesystem Blob Storage     │ │ SQLite / BadgerDB Metadata │  │  │
│  │  │ (data/buckets/obj/part_*)   │ │ (ETag, Size, ACLs, Ver)    │  │  │
│  │  └─────────────────────────────┘ └────────────────────────────┘  │  │
│  └───────────┬──────────────────────────────────┬───────────────────┘  │
│              │                                  │                      │
│              ▼                                  ▼                      │
│  ┌────────────────────────┐      ┌──────────────────────────────────┐  │
│  │  Replication Service   │      │   Automated Backup & Snapshot    │  │
│  │  - Peer Health Check   │      │   - Scheduled Cron Engine        │  │
│  │  - Sync Queue (Async)  │      │   - Tar/Gzip Point-in-time       │  │
│  │  - Conflict Resolution │      │   - Restore & Remote Export      │  │
│  └───────────┬────────────┘      └──────────────────────────────────┘  │
└──────────────┼─────────────────────────────────────────────────────────┘
               │ Eventos de Replicação HTTP / gRPC
               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  Nós Pares do Cluster (Node 2, Node 3)                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Roteiro de Implementação e Verificação

1. **Estado e Tipos de Domínio (`src/types/storage.ts`)**:
   - Definição completa de Buckets, Objects (ETag, MIME, metadados customizados, tamanho, data), Peers de Replicação, Snapshots/Backups, Credenciais S3 e Regras de Lifecycle.
2. **Motor de Storage & API S3 (`src/services/storageEngine.ts`)**:
   - Gerenciamento local em memória e persistência em IndexedDB/LocalStorage para o console interativo.
   - Suporte a upload real de arquivos, criação de pastas virtuais, presigned URLs com expiração configurável, e cálculo real de hash SHA256/MD5.
3. **Serviço de Replicação Multi-Nó (`src/services/replicationEngine.ts`)**:
   - Nós simulados e configuráveis com status de saúde, latência simulada, fila de replicação em tempo real e injeção de falhas para testar a recuperação e catch-up automático.
4. **Motor de Backup & Snapshot (`src/services/backupEngine.ts`)**:
   - Agendamento de snapshots, exportação de arquivos reais de backup (.json/.tar compactado para download imediato) e restauração instantânea.
5. **Gerador de Código Go Puro & Dockerfile (`src/services/goCodeGenerator.ts`)**:
   - Todo o código Go nativo (`main.go`, `config.go`, `s3_handlers.go`, `storage_fs.go`, `replication.go`, `backup.go`, `go.mod`), `Dockerfile` multi-estágio, `docker-compose.yml` e scripts de push para Docker Hub com visualizador com destaque de sintaxe, cópia rápida e download em lote (ZIP ou arquivos individuais).
6. **Interface de Usuário (`src/components/...`)**:
   - Sidebar com navegação fluida.
   - Visualização de Buckets & Object Explorer com suporte a upload drag-and-drop, filtros, pré-visualização de imagem/texto e geração de link temporário.
   - Dashboard de Nós e Replicação com topologia interativa e métricas em tempo real.
   - Gerenciador de Backups com disparador manual e log de integridade.
   - Painel de Credenciais IAM (criar chaves, revogar, permissões read-only ou read-write).
   - Painel Docker Hub & Exportação Go para levar o projeto para produção.
7. **Verificação & Compilação**:
   - Teste rigoroso de compilação com `compile_applet` e verificação de zero erros de lint.
