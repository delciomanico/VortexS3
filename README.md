# VortexS3 - Seu Próprio Servidor de Object Storage em Go (100% S3 Compatível)

Substituto moderno, leve (<25MB) e de alta performance ao MinIO, desenvolvido em **Go nativo** sem taxas ou alterações de licenciamento surpresa.

## Recursos Principais

- ⚡ **100% Compatível com AWS S3 REST API**: funciona diretamente com `aws-cli`, `boto3`, MinIO Client (`mc`), `rclone`, Terraform e SDKs em qualquer linguagem.
- 🔄 **Replicação Multi-Nó Automática**: nós pares comunicam-se via heartbeat, com sincronização em tempo real e fila de recuperação automática (catch-up) caso um nó fique temporariamente indisponível.
- 📦 **Sistema de Backups & RESTAURAÇÃO**: agendamento cron integrado, compactação com tar.gz, restauração de point-in-time e comando de restore direto via CLI: `vortexs3 -restore /data/backups/snapshot.tar.gz`.
- 🕒 **Políticas de Ciclo de Vida (S3 Lifecycle)**: expiração automática de objetos e arquivos temporários, transição para GLACIER e cancelamento de partes multipart incompletas.
- 🔔 **Notificação de Eventos & Webhooks**: alertas HTTP POST em tempo real para `s3:ObjectCreated:*` e `s3:ObjectRemoved:*`.
- 🐳 **Pronto para Docker Hub**: imagem multi-arquitetura (`linux/amd64`, `linux/arm64`) com binário estático Go compilado sem CGO sobre Alpine Linux.
- 🛡️ **Pronto para Produção**: arquivos pré-configurados de Nginx SSL, Systemd, Docker Compose HA e GitHub Actions CI/CD incluídos no diretório `deploy/`.
