# VortexS3 - Manual e Documentação Técnica Completa do Sistema

## 1. Visão Geral Executiva

O **VortexS3** é um sistema de armazenamento de objetos distribuído de alto desempenho, compatível com a API padrão **AWS S3 (Amazon Simple Storage Service)**. Desenvolvido para oferecer máxima durabilidade de dados, baixa latência e operação autônoma sem dependências externas complexas.

### Principais Pilares:
- **Compatibilidade AWS S3 & Signature Version 4 (SigV4)**: Funciona nativamente com qualquer ferramenta, biblioteca ou SDK do ecossistema S3 (`boto3`, AWS CLI, `@aws-sdk/client-s3`, Terraform, MinIO Client `mc`, rclone, etc.).
- **Codificação de Apagamento Reed-Solomon RS(4+2)**: Cada objeto é dividido em 4 fatias (*shards*) de dados e 2 fatias de paridade. O sistema suporta a falha simultânea de até 2 nós ou discos sem qualquer indisponibilidade ou perda de bytes.
- **Consenso Raft Distribuído**: Replicação com consistência forte (*Read-After-Write*) para estados de buckets, políticas de acesso e metadados.
- **Indexação de Metadados com BadgerDB / SQLite**: Metadados estruturados armazenados em mecanismo *Key-Value* LSM-Tree (*Log-Structured Merge-tree*) de altíssima vazão, sem a necessidade de manter bancos de dados externos como PostgreSQL ou Redis.
- **Segurança Corporativa**: Criptografia em repouso SSE-S3 AES-256-GCM, Object Lock WORM (*Write Once, Read Many*) com retenção regulatória (*Compliance/Governance*), presigned URLs com limitação temporal e mTLS entre nós.
- **Console Web Administrativo Integrado**: Interface gráfica minimalista inspirada no design system Supabase, com suporte a gestão de nós, buckets, restauração de backups e métricas Prometheus.

---

## 2. Topologia de Rede e Portas do Cluster

Para comunicação entre clientes, balanceadores de carga e nós do cluster, as seguintes portas devem ser liberadas:

| Porta | Protocolo | Função | Escopo de Acesso |
|---|---|---|---|
| **9000/TCP** | HTTP/HTTPS | API S3 REST Endpoint | Clientes S3, SDKs, Ingress / Load Balancer |
| **9001/TCP** | HTTP/HTTPS | Console Web Administrativo | Administradores de Infraestrutura / VPN |
| **9002/TCP** | TCP / mTLS | Raft Protocol & Sincronização de Shards | Exclusivo entre os Nós do Cluster (Rede Interna) |
| **9090/TCP** | HTTP | Métricas em Formato Prometheus (`/metrics`) | Servidor Prometheus / Grafana |

---

## 3. Conexão de Nós Multi-Servidor (Cross-Server & Cross-Cloud)

O VortexS3 permite que nós sejam executados em servidores físicos diferentes ou em provedores de nuvem distintos (ex: Nó 1 na AWS, Nó 2 no Google Cloud, Nó 3 na Hetzner ou On-Premise).

### 3.1. Geração de Token do Cluster
O nó líder mantém um token de segurança de adesão:
\`\`\`bash
# Obter token de adesão do cluster via CLI no nó principal
vortexs3-cli cluster token --generate
# Exemplo de saída: vtx_cl_token_8f912c9b
\`\`\`

### 3.2. Conectando um Nó Remoto
No segundo servidor (ex: IP `203.0.113.15`), execute o VortexS3 apontando para o nó líder (ex: IP `198.51.100.10:9002`):
\`\`\`bash
docker run -d --name vortexs3-node-follower \\
  -p 9000:9000 -p 9001:9001 -p 9002:9002 \\
  -e VORTEX_NODE_ID="node-follower-datacenter-2" \\
  -e VORTEX_CLUSTER_JOIN="198.51.100.10:9002" \\
  -e VORTEX_CLUSTER_TOKEN="vtx_cl_token_8f912c9b" \\
  -e VORTEX_STORAGE_PATH="/data" \\
  -v /mnt/disks/nvme-pool:/data \\
  vortexs3/vortexs3-server:latest
\`\`\`

### 3.3. Ciclo de Vida e Resolução de Falhas
1. **Heartbeat**: Os nós enviam pulsos de sincronização a cada 2.000 ms.
2. **Timeout de Falha**: Se um nó não responder em 5.000 ms, ele é marcado como `unreachable`.
3. **Re-roteamento de Shards**: Leituras de objetos redirecionam imediatamente as consultas aos nós saudáveis, utilizando os 2 blocos de paridade para reconstruir os dados em voo.

---

---

## 4. Guias de Implantação em Produção

### 4.1. Implantação Padrão (1 Servidor / VPS - Standalone de Alta Performance)

Em uma VPS ou servidor dedicado único, **o padrão correto é executar 1 único nó do VortexS3**. Subir múltiplos nós na mesma VPS consome CPU e memória desnecessariamente, cria contenção no mesmo disco físico e **não oferece alta disponibilidade real** (se a VPS cair ou reiniciar, todos os nós caem juntos).

O arquivo `docker-compose.yml` padrão para uma VPS é simples, direto e de altíssima vazão:

```yaml
version: '3.8'

services:
  vortexs3:
    image: delciomanico2003/vortexs3:latest
    container_name: vortexs3
    restart: unless-stopped
    ports:
      - "9000:9000"   # API S3 REST
      - "9001:9001"   # Console Web Administrativo
    environment:
      - VORTEX_NODE_ID=node-principal
      - VORTEX_DATA_DIR=/data
      - VORTEX_ROOT_ACCESS_KEY=VXAKIA799PRODROOT
      - VORTEX_ROOT_SECRET_KEY=vxs_wJalrXUtnFEMIK7MDENGbPxRfiCYEXAMPLEKEY
    volumes:
      - vortex_storage:/data

volumes:
  vortex_storage:
    driver: local
```

### 4.2. Implantação em Cluster Multi-Servidor (Cross-VPS / Multi-Cloud)

Se você possui 3 VPS separadas (ex: 3 instâncias em provedores ou datacenters diferentes), **cada VPS executa 1 único nó**, e elas se comunicam via rede interna/privada ou Wireguard:

- **VPS 1 (IP `198.51.100.10`)**:
  ```yaml
  environment:
    - VORTEX_NODE_ID=vps-1
    - VORTEX_PEERS=http://198.51.100.20:9000,http://198.51.100.30:9000
  ```

- **VPS 2 (IP `198.51.100.20`)**:
  ```yaml
  environment:
    - VORTEX_NODE_ID=vps-2
    - VORTEX_PEERS=http://198.51.100.10:9000,http://198.51.100.30:9000
  ```

- **VPS 3 (IP `198.51.100.30`)**:
  ```yaml
  environment:
    - VORTEX_NODE_ID=vps-3
    - VORTEX_PEERS=http://198.51.100.10:9000,http://198.51.100.20:9000
  ```
```

### 4.2. Implantação no Kubernetes (StatefulSet)

\`\`\`yaml
apiVersion: v1
kind: Service
metadata:
  name: vortexs3-headless
spec:
  clusterIP: None
  ports:
    - port: 9002
      name: raft
  selector:
    app: vortexs3
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: vortexs3
spec:
  serviceName: "vortexs3-headless"
  replicas: 4
  selector:
    matchLabels:
      app: vortexs3
  template:
    metadata:
      labels:
        app: vortexs3
    spec:
      containers:
        - name: vortexs3
          image: vortexs3/vortexs3-server:latest
          ports:
            - containerPort: 9000
              name: s3-api
            - containerPort: 9001
              name: console
            - containerPort: 9002
              name: raft
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: VORTEX_NODE_ID
              value: $(POD_NAME)
            - name: VORTEX_STORAGE_PATH
              value: /data
          volumeMounts:
            - name: storage
              mountPath: /data
  volumeClaimTemplates:
    - metadata:
        name: storage
      spec:
        accessModes: [ "ReadWriteOnce" ]
        resources:
          requests:
            storage: 1000Gi
\`\`\`

### 4.3. Instalação Baremetal Linux com Systemd

1. **Baixar o binário Go compilado:**
\`\`\`bash
wget https://github.com/vortexs3/vortexs3/releases/download/v1.0.0/vortexs3-linux-amd64.tar.gz
tar -xzf vortexs3-linux-amd64.tar.gz
sudo mv vortexs3 /usr/local/bin/
sudo mkdir -p /var/lib/vortexs3 /etc/vortexs3
\`\`\`

2. **Arquivo de configuração (`/etc/vortexs3/vortexs3.conf`):**
\`\`\`ini
VORTEX_PORT=9000
VORTEX_CONSOLE_PORT=9001
VORTEX_RAFT_PORT=9002
VORTEX_STORAGE_PATH=/var/lib/vortexs3
VORTEX_NODE_ID=baremetal-srv-01
VORTEX_CLUSTER_TOKEN=vtx_cl_token_8f912c9b
\`\`\`

3. **Criar a unidade systemd (`/etc/systemd/system/vortexs3.service`):**
\`\`\`ini
[Unit]
Description=VortexS3 Distributed Object Storage
After=network.target

[Service]
Type=simple
User=root
EnvironmentFile=/etc/vortexs3/vortexs3.conf
ExecStart=/usr/local/bin/vortexs3 server
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
\`\`\`

4. **Habilitar e iniciar serviço:**
\`\`\`bash
sudo systemctl daemon-reload
sudo systemctl enable --now vortexs3
\`\`\`

---

## 5. Exemplos de Uso com SDKs Oficiais da AWS

### 5.1. AWS CLI
Configure suas credenciais ou exporte no terminal:
\`\`\`bash
export AWS_ACCESS_KEY_ID="vtx_prod_live_88319f0a"
export AWS_SECRET_ACCESS_KEY="vtx_sec_live_99120481239aa81230f"
export AWS_DEFAULT_REGION="us-east-1"

# Criar Bucket
aws --endpoint-url http://localhost:9000 s3 mb s3://meu-novo-bucket

# Enviar Arquivo com Criptografia SSE-S3
aws --endpoint-url http://localhost:9000 s3 cp base_dados.parquet s3://meu-novo-bucket/ \
    --sse AES256

# Listar Conteúdo do Bucket
aws --endpoint-url http://localhost:9000 s3 ls s3://meu-novo-bucket/
\`\`\`

### 5.2. Python com Boto3
\`\`\`python
import boto3
from botocore.client import Config

s3 = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='vtx_prod_live_88319f0a',
    aws_secret_access_key='vtx_sec_live_99120481239aa81230f',
    config=Config(signature_version='s3v4')
)

# Upload de arquivo com SSE-S3
s3.upload_file(
    Filename='dados.csv',
    Bucket='relatorios',
    Key='financeiro/dados.csv',
    ExtraArgs={'ServerSideEncryption': 'AES256'}
)

# Gerar URL Pré-assinada com validade de 2 horas
url = s3.generate_presigned_url(
    'get_object',
    Params={'Bucket': 'relatorios', 'Key': 'financeiro/dados.csv'},
    ExpiresIn=7200
)
print("URL para download seguro:", url)
\`\`\`

### 5.3. Node.js & TypeScript (AWS SDK v3)
\`\`\`typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.VORTEX_ACCESS_KEY!,
    secretAccessKey: process.env.VORTEX_SECRET_KEY!,
  },
  forcePathStyle: true, // Obrigatório para instâncias S3 on-premise
});

async function uploadBackup(bucket: string, key: string, content: Buffer) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: content,
    ServerSideEncryption: 'AES256',
  });

  await s3.send(command);
  console.log(`Objeto ${key} gravado com sucesso no bucket ${bucket}`);
}
\`\`\`

---

## 6. Disaster Recovery, Backups e Scrubber de Bitrot

### 6.1. Scrubber de Bitrot Contínuo
O armazenamento físico em disco está sujeito a corrupção silenciosa de setores (*silent data corruption* ou *bitrot*). O **VortexS3 Bitrot Scrubber** executa de forma assíncrona em segundo plano:
1. Lê cada shard físico no disco e calcula seu hash SHA-256 em tempo real.
2. Compara o hash calculado com a assinatura de integridade gravada no cabeçalho imutável do objeto.
3. Se um shard apresentar divergência, aciona a matriz de Cauchy do Reed-Solomon e reconstrói o shard saudável a partir dos demais blocos de dados e paridade, substituindo o arquivo corrompido automaticamente.

### 6.2. Políticas de Backup e Restauração Instantânea
- **Backup Incremental**: Salva apenas os deltas de blocos modificados desde o último snapshot.
- **Restauração de Emergência**: Através da aba **Backups & Restore** do painel ou pela linha de comando, é possível restaurar o cluster para qualquer ponto no tempo (*Point-in-Time Recovery*), garantindo conformidade com RPO (*Recovery Point Objective*) menor que 5 minutos e RTO (*Recovery Time Objective*) menor que 1 minuto.

---

## 7. Referência Completa de Variáveis de Ambiente

| Variável | Tipo | Valor Padrão | Descrição |
|---|---|---|---|
| `VORTEX_PORT` | Inteiro | `9000` | Porta HTTP/HTTPS da API S3 REST |
| `VORTEX_CONSOLE_PORT` | Inteiro | `9001` | Porta HTTP/HTTPS do Console Web Administrativo |
| `VORTEX_RAFT_PORT` | Inteiro | `9002` | Porta TCP para mTLS e sincronização Raft |
| `VORTEX_STORAGE_PATH` | String | `/data` | Diretório de persistência de shards e metadados |
| `VORTEX_NODE_ID` | String | `node-1` | Identificador único deste nó no cluster |
| `VORTEX_CLUSTER_TOKEN` | String | `None` | Chave pré-compartilhada para ingresso de nós |
| `VORTEX_CLUSTER_PEERS` | String | `""` | Lista separada por vírgula de nós iniciais (`host:9002`) |
| `VORTEX_RS_DATA_SHARDS` | Inteiro | `4` | Quantidade de shards de dados Reed-Solomon |
| `VORTEX_RS_PARITY_SHARDS` | Inteiro | `2` | Quantidade de shards de paridade Reed-Solomon |
| `VORTEX_SCRUBBER_INTERVAL` | String | `12h` | Intervalo da varredura de integridade física |
| `VORTEX_MAX_CONNECTIONS` | Inteiro | `10000` | Limite de conexões concorrentes da API S3 |
