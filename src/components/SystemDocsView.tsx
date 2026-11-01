import React, { useState } from 'react';
import {
  BookOpen,
  Server,
  Terminal,
  Shield,
  Layers,
  HardDrive,
  Copy,
  Check,
  Search,
  Code2,
  Cpu,
  RefreshCw,
  Archive,
  Download,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  FileText,
  KeyRound,
  Network
} from 'lucide-react';

interface DocSection {
  id: string;
  title: string;
  category: 'architecture' | 'deployment' | 'cluster' | 'sdk' | 'operations' | 'config';
  icon: React.ReactNode;
  content: React.ReactNode;
}

export const SystemDocsView: React.FC = () => {
  const [activeSectionId, setActiveSectionId] = useState<string>('arch-overview');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const sections: DocSection[] = [
    {
      id: 'arch-overview',
      title: 'Visão Geral da Arquitetura',
      category: 'architecture',
      icon: <Layers className="w-4 h-4 text-emerald-400" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-zinc-100 mb-2">
              VortexS3: Sistema de Armazenamento de Objetos de Alta Disponibilidade
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              O <strong className="text-zinc-200">VortexS3</strong> é uma solução de armazenamento de objetos compatível com a API AWS S3, projetada com arquitetura de nós distribuídos, consenso Raft, codificação de apagamento Reed-Solomon (RS 4+2), criptografia de ponta a ponta e persistência de metadados em BadgerDB/SQLite integrado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1.5">
                <Shield className="w-4 h-4" />
                <span>Reed-Solomon RS(4+2)</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-normal">
                Cada objeto é fatiado em 4 shards de dados e 2 de paridade distribuídos entre os nós. O cluster tolera a perda simultânea de até 2 nós/discos sem perda de dados.
              </p>
            </div>

            <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-lg">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold mb-1.5">
                <RefreshCw className="w-4 h-4" />
                <span>Raft Multi-Node Quorum</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-normal">
                Sincronização de estado de buckets e metadados via protocolo de consenso Raft. Eleição automática de líder e detecção de nós em falha em tempo real.
              </p>
            </div>

            <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-lg">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold mb-1.5">
                <HardDrive className="w-4 h-4" />
                <span>BadgerDB / SQLite Metadata</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-normal">
                Estrutura de dados LSM-Tree embutida de ultra-baixo consumo de memória em Go, provendo buscas de prefixo O(log N) e milhões de IOPS sem overhead de bancos externos.
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-2 font-mono">
              Topologia de Rede e Portas do Cluster
            </h4>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-[11px] text-zinc-300 overflow-x-auto">
              <pre className="leading-relaxed">
{`+---------------------------------------------------------------------------------+
|                                 CLIENTES S3 / SDKs                              |
|                (AWS CLI, Boto3 Python, Terraform, Next.js, K8s Pods)            |
+---------------------------------------------------------------------------------+
                                       |
                                       v
                    [ Load Balancer / Reverse Proxy HAProxy / Nginx ]
                                       |
         +-----------------------------+-----------------------------+
         | (Porta 9000 S3 REST)        |                             |
         v                             v                             v
+------------------+          +------------------+          +------------------+
|   VortexS3 Node1 | <=====>  |   VortexS3 Node2 | <=====>  |   VortexS3 Node3 |
|   (Raft Leader)  |  mTLS    |  (Raft Follower) |  mTLS    |  (Raft Follower) |
|   Porta: 9000    |  Port:   |   Porta: 9000    |  Port:   |   Porta: 9000    |
|   Console: 9001  |  9002    |   Console: 9001  |  9002    |   Console: 9001  |
+------------------+          +------------------+          +------------------+
   | (RS Shards 1,2)             | (RS Shards 3,4)             | (RS Parity 5,6)
   v                             v                             v
 [ NVMe / Data Dir ]           [ NVMe / Data Dir ]           [ NVMe / Data Dir ]
 [ BadgerDB Metadata]          [ BadgerDB Metadata]          [ BadgerDB Metadata]`}
              </pre>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/40 rounded-lg">
            <h4 className="text-xs font-semibold text-emerald-400 mb-1">
              Garantias de Consistência e Durabilidade
            </h4>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              O VortexS3 implementa consistência forte <em>Read-After-Write</em> para todas as operações de <code className="text-emerald-300">PUT</code> e <code className="text-emerald-300">DELETE</code> em objetos. Atualizações de metadados são cometidas em quorum estrito antes de confirmar o status HTTP 200 ao cliente.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'cluster-nodes',
      title: 'Conexão de Nós Multi-Servidor',
      category: 'cluster',
      icon: <Network className="w-4 h-4 text-emerald-400" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-zinc-100 mb-1">
              Topologia Multi-Servidor e Cross-Data Center
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Você pode executar nós do VortexS3 em servidores físicos dedicados, instâncias em nuvens diferentes (AWS, GCP, Hetzner, Oracle Cloud) ou máquinas virtuais locais, interconectados com autenticação mTLS.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-200">1. Portas Requeridas no Firewall / Security Group</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-zinc-800 rounded-lg overflow-hidden">
                <thead className="bg-zinc-800/60 text-zinc-300 font-mono text-[11px]">
                  <tr>
                    <th className="p-2.5">Porta</th>
                    <th className="p-2.5">Protocolo</th>
                    <th className="p-2.5">Propósito</th>
                    <th className="p-2.5">Acesso Recomendado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 text-zinc-400 text-[11px]">
                  <tr>
                    <td className="p-2.5 font-mono text-emerald-400">9000/TCP</td>
                    <td className="p-2.5 font-mono">HTTP/HTTPS</td>
                    <td className="p-2.5">API S3 REST Endpoint</td>
                    <td className="p-2.5">Público ou atrás do Load Balancer</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-emerald-400">9001/TCP</td>
                    <td className="p-2.5 font-mono">HTTP/HTTPS</td>
                    <td className="p-2.5">Console Web Administrativo</td>
                    <td className="p-2.5">VPN ou IP restrito dos administradores</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-emerald-400">9002/TCP</td>
                    <td className="p-2.5 font-mono">TCP / mTLS</td>
                    <td className="p-2.5">Comunicação Interna Raft / Replicação de Shards</td>
                    <td className="p-2.5">Exclusivo entre IPs dos Nós do Cluster</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-emerald-400">9090/TCP</td>
                    <td className="p-2.5 font-mono">HTTP</td>
                    <td className="p-2.5">Métricas Prometheus (/metrics)</td>
                    <td className="p-2.5">Servidor Prometheus / Monitoramento interno</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-zinc-200">2. Iniciar Novo Nó Follower e Conectar ao Cluster</h4>
              <button
                onClick={() => handleCopy('join-node-cmd', `docker run -d --name vortexs3-node-04 \\
  -p 9000:9000 -p 9001:9001 -p 9002:9002 \\
  -e VORTEX_NODE_ID="node-brazil-south-01" \\
  -e VORTEX_CLUSTER_JOIN="192.168.1.100:9002" \\
  -e VORTEX_CLUSTER_TOKEN="vtx_cl_token_8f912c9b" \\
  -e VORTEX_DATA_DIR="/data" \\
  -v /mnt/disks/storage-nvme:/data \\
  vortexs3/vortexs3-server:latest`)}
                className="text-[11px] text-zinc-400 hover:text-emerald-400 flex items-center gap-1 font-mono transition-colors"
              >
                {copiedKey === 'join-node-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar Comando</span>
              </button>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 font-mono text-[11px] text-emerald-400">
              <pre className="overflow-x-auto whitespace-pre">
{`docker run -d --name vortexs3-node-04 \\
  -p 9000:9000 -p 9001:9001 -p 9002:9002 \\
  -e VORTEX_NODE_ID="node-brazil-south-01" \\
  -e VORTEX_CLUSTER_JOIN="192.168.1.100:9002" \\
  -e VORTEX_CLUSTER_TOKEN="vtx_cl_token_8f912c9b" \\
  -e VORTEX_DATA_DIR="/data" \\
  -v /mnt/disks/storage-nvme:/data \\
  vortexs3/vortexs3-server:latest`}
              </pre>
            </div>
          </div>

          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-2">
            <h4 className="text-xs font-semibold text-zinc-200">Processo Automático de Handshake:</h4>
            <ol className="list-decimal list-inside text-[11px] text-zinc-400 space-y-1">
              <li>O novo nó inicia e envia requisição de adesão via porta 9002 para o Líder Raft.</li>
              <li>O Líder valida o <code className="text-zinc-200">VORTEX_CLUSTER_TOKEN</code> e registra o ID e IP do novo participante.</li>
              <li>O nó recebe o snapshot atual dos metadados de buckets e políticas IAM.</li>
              <li>Novas escritas de objetos passam a distribuir shards no novo nó imediatamente.</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 'deploy-docker',
      title: 'Implantação com Docker & Compose',
      category: 'deployment',
      icon: <Terminal className="w-4 h-4 text-emerald-400" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-zinc-100 mb-1">
              Execução em Contêiner Docker
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              O binário Go estático roda dentro de uma imagem Scratch ou Alpine mínima (~18MB), sem dependências externas.
            </p>
          </div>

          {/* Docker Compose Multi-Node */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-zinc-200">docker-compose.yml (Cluster 3 Nós com Reed-Solomon)</h4>
              <button
                onClick={() => handleCopy('compose-file', `version: '3.8'

services:
  vortex-node1:
    image: vortexs3/vortexs3-server:latest
    container_name: vortex-node1
    restart: always
    environment:
      - VORTEX_NODE_ID=node-1
      - VORTEX_PORT=9000
      - VORTEX_CONSOLE_PORT=9001
      - VORTEX_RAFT_PORT=9002
      - VORTEX_ROOT_USER=admin
      - VORTEX_ROOT_PASSWORD=MudarSenhaSegura123!
      - VORTEX_STORAGE_PATH=/data
      - VORTEX_CLUSTER_PEERS=node-1:9002,node-2:9002,node-3:9002
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - node1_data:/data
    networks:
      - vortex_net

  vortex-node2:
    image: vortexs3/vortexs3-server:latest
    container_name: vortex-node2
    restart: always
    environment:
      - VORTEX_NODE_ID=node-2
      - VORTEX_PORT=9000
      - VORTEX_CONSOLE_PORT=9001
      - VORTEX_RAFT_PORT=9002
      - VORTEX_ROOT_USER=admin
      - VORTEX_ROOT_PASSWORD=MudarSenhaSegura123!
      - VORTEX_STORAGE_PATH=/data
      - VORTEX_CLUSTER_PEERS=node-1:9002,node-2:9002,node-3:9002
    volumes:
      - node2_data:/data
    networks:
      - vortex_net

  vortex-node3:
    image: vortexs3/vortexs3-server:latest
    container_name: vortex-node3
    restart: always
    environment:
      - VORTEX_NODE_ID=node-3
      - VORTEX_PORT=9000
      - VORTEX_CONSOLE_PORT=9001
      - VORTEX_RAFT_PORT=9002
      - VORTEX_ROOT_USER=admin
      - VORTEX_ROOT_PASSWORD=MudarSenhaSegura123!
      - VORTEX_STORAGE_PATH=/data
      - VORTEX_CLUSTER_PEERS=node-1:9002,node-2:9002,node-3:9002
    volumes:
      - node3_data:/data
    networks:
      - vortex_net

volumes:
  node1_data:
  node2_data:
  node3_data:

networks:
  vortex_net:
    driver: bridge`)}
                className="text-[11px] text-zinc-400 hover:text-emerald-400 flex items-center gap-1 font-mono transition-colors"
              >
                {copiedKey === 'compose-file' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar Compose</span>
              </button>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 font-mono text-[11px] text-zinc-300 max-h-72 overflow-y-auto">
              <pre className="whitespace-pre">
{`version: '3.8'

services:
  vortex-node1:
    image: vortexs3/vortexs3-server:latest
    container_name: vortex-node1
    restart: always
    environment:
      - VORTEX_NODE_ID=node-1
      - VORTEX_PORT=9000
      - VORTEX_CONSOLE_PORT=9001
      - VORTEX_RAFT_PORT=9002
      - VORTEX_ROOT_USER=admin
      - VORTEX_ROOT_PASSWORD=MudarSenhaSegura123!
      - VORTEX_STORAGE_PATH=/data
      - VORTEX_CLUSTER_PEERS=node-1:9002,node-2:9002,node-3:9002
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - node1_data:/data
    networks:
      - vortex_net

  vortex-node2:
    image: vortexs3/vortexs3-server:latest
    container_name: vortex-node2
    restart: always
    environment:
      - VORTEX_NODE_ID=node-2
      - VORTEX_PORT=9000
      - VORTEX_CONSOLE_PORT=9001
      - VORTEX_RAFT_PORT=9002
      - VORTEX_ROOT_USER=admin
      - VORTEX_ROOT_PASSWORD=MudarSenhaSegura123!
      - VORTEX_STORAGE_PATH=/data
      - VORTEX_CLUSTER_PEERS=node-1:9002,node-2:9002,node-3:9002
    volumes:
      - node2_data:/data
    networks:
      - vortex_net

  vortex-node3:
    image: vortexs3/vortexs3-server:latest
    container_name: vortex-node3
    restart: always
    environment:
      - VORTEX_NODE_ID=node-3
      - VORTEX_PORT=9000
      - VORTEX_CONSOLE_PORT=9001
      - VORTEX_RAFT_PORT=9002
      - VORTEX_ROOT_USER=admin
      - VORTEX_ROOT_PASSWORD=MudarSenhaSegura123!
      - VORTEX_STORAGE_PATH=/data
      - VORTEX_CLUSTER_PEERS=node-1:9002,node-2:9002,node-3:9002
    volumes:
      - node3_data:/data
    networks:
      - vortex_net

volumes:
  node1_data:
  node2_data:
  node3_data:

networks:
  vortex_net:
    driver: bridge`}
              </pre>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'deploy-k8s',
      title: 'Implantação no Kubernetes (StatefulSet)',
      category: 'deployment',
      icon: <Cpu className="w-4 h-4 text-emerald-400" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-zinc-100 mb-1">
              Kubernetes Cloud-Native StatefulSet
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Para orquestração escalável no EKS, GKE ou baremetal K8s, utilize um StatefulSet com Headless Service para descoberta estável de pods via DNS interno.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-zinc-200">vortexs3-statefulset.yaml</h4>
              <button
                onClick={() => handleCopy('k8s-manifest', `apiVersion: v1
kind: Service
metadata:
  name: vortexs3-headless
  labels:
    app: vortexs3
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
            storage: 500Gi`)}
                className="text-[11px] text-zinc-400 hover:text-emerald-400 flex items-center gap-1 font-mono transition-colors"
              >
                {copiedKey === 'k8s-manifest' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar YAML</span>
              </button>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 font-mono text-[11px] text-zinc-300 max-h-72 overflow-y-auto">
              <pre className="whitespace-pre">
{`apiVersion: v1
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
            storage: 500Gi`}
              </pre>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'sdk-integration',
      title: 'Compatibilidade com SDKs AWS S3',
      category: 'sdk',
      icon: <Code2 className="w-4 h-4 text-emerald-400" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-zinc-100 mb-1">
              Integração com SDKs Oficiais da AWS
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              O VortexS3 implementa o protocolo AWS Signature Version 4 (SigV4). Nenhum SDK customizado é necessário: você usa as bibliotecas oficiais apontando o parâmetro <code className="text-zinc-200">endpoint_url</code> para o VortexS3.
            </p>
          </div>

          {/* AWS CLI */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-zinc-200">1. AWS CLI (Terminal Linux / macOS / Windows)</h4>
              <button
                onClick={() => handleCopy('aws-cli', `export AWS_ACCESS_KEY_ID="vtx_prod_live_88319f0a"
export AWS_SECRET_ACCESS_KEY="vtx_sec_live_99120481239aa81230f"
export AWS_DEFAULT_REGION="us-east-1"

# Listar Buckets
aws --endpoint-url http://localhost:9000 s3 ls

# Fazer Upload de Arquivo com Criptografia SSE-S3
aws --endpoint-url http://localhost:9000 s3 cp dataset.parquet s3://prod-analytics/data/ \\
    --sse AES256

# Sincronizar Diretório Completo
aws --endpoint-url http://localhost:9000 s3 sync ./dist s3://web-assets/`)}
                className="text-[11px] text-zinc-400 hover:text-emerald-400 flex items-center gap-1 font-mono transition-colors"
              >
                {copiedKey === 'aws-cli' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar Snippet</span>
              </button>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 font-mono text-[11px] text-zinc-300">
              <pre className="overflow-x-auto whitespace-pre">
{`export AWS_ACCESS_KEY_ID="vtx_prod_live_88319f0a"
export AWS_SECRET_ACCESS_KEY="vtx_sec_live_99120481239aa81230f"
export AWS_DEFAULT_REGION="us-east-1"

# Listar Buckets
aws --endpoint-url http://localhost:9000 s3 ls

# Upload com Criptografia SSE-S3
aws --endpoint-url http://localhost:9000 s3 cp dataset.parquet s3://prod-analytics/ \\
    --sse AES256`}
              </pre>
            </div>
          </div>

          {/* Python Boto3 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-zinc-200">2. Python (boto3)</h4>
              <button
                onClick={() => handleCopy('python-boto3', `import boto3
from botocore.client import Config

s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='vtx_prod_live_88319f0a',
    aws_secret_access_key='vtx_sec_live_99120481239aa81230f',
    config=Config(signature_version='s3v4')
)

# Upload de Objeto
s3_client.upload_file(
    Filename='relatorio.pdf',
    Bucket='backups-financeiro',
    Key='2026/relatorio.pdf',
    ExtraArgs={'ServerSideEncryption': 'AES256'}
)

# Gerar URL Pré-assinada (download com expiração em 1 hora)
presigned_url = s3_client.generate_presigned_url(
    'get_object',
    Params={'Bucket': 'backups-financeiro', 'Key': '2026/relatorio.pdf'},
    ExpiresIn=3600
)
print("URL Pré-assinada:", presigned_url)`)}
                className="text-[11px] text-zinc-400 hover:text-emerald-400 flex items-center gap-1 font-mono transition-colors"
              >
                {copiedKey === 'python-boto3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar Python</span>
              </button>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 font-mono text-[11px] text-zinc-300">
              <pre className="overflow-x-auto whitespace-pre">
{`import boto3
from botocore.client import Config

s3 = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='vtx_prod_live_88319f0a',
    aws_secret_access_key='vtx_sec_live_99120481239aa81230f',
    config=Config(signature_version='s3v4')
)

# Upload direto
s3.upload_file('documento.pdf', 'meu-bucket', 'documentos/doc1.pdf')`}
              </pre>
            </div>
          </div>

          {/* Node.js / TypeScript AWS SDK v3 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-zinc-200">3. Node.js & TypeScript (@aws-sdk/client-s3)</h4>
              <button
                onClick={() => handleCopy('node-sdk', `import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.VORTEX_ACCESS_KEY!,
    secretAccessKey: process.env.VORTEX_SECRET_KEY!,
  },
  forcePathStyle: true, // Essencial para compatibilidade com endpoints locais
});

// Upload com streaming
async function uploadFile(bucket: string, key: string, data: Buffer) {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: data,
    ServerSideEncryption: 'AES256'
  }));
}`)}
                className="text-[11px] text-zinc-400 hover:text-emerald-400 flex items-center gap-1 font-mono transition-colors"
              >
                {copiedKey === 'node-sdk' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar TypeScript</span>
              </button>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 font-mono text-[11px] text-zinc-300">
              <pre className="overflow-x-auto whitespace-pre">
{`import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: { accessKeyId: '...', secretAccessKey: '...' },
  forcePathStyle: true,
});`}
              </pre>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'dr-and-scrubber',
      title: 'Disaster Recovery & Scrubber de Bitrot',
      category: 'operations',
      icon: <Archive className="w-4 h-4 text-emerald-400" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-zinc-100 mb-1">
              Proteção Ativa contra Falhas e Bitrot Silencioso
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              O VortexS3 possui dois mecanismos complementares para garantir durabilidade de dados 99.999999999% (11 noves):
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg space-y-2">
              <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4" />
                Bitrot Scrubber Contínuo
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Varredor em background que recalcula ciclicamente o hash SHA-256 de todos os fragmentos no disco. Ao identificar divergência de integridade física em qualquer setor, o algoritmo Reed-Solomon reconstrói matematicamente o shard corrompido usando os blocos de paridade remanescentes e sobrescreve o bloco degradado.
              </p>
            </div>

            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg space-y-2">
              <h4 className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                Object Lock WORM & Legal Hold
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Bloqueio <em>Write Once, Read Many</em> em nível de objeto para conformidade com normas regulatórias (ex: LGPD, Bacen, SEC 17a-4). Uma vez ativado em modo Compliance, nem mesmo a conta root pode apagar ou alterar o objeto antes do vencimento do período de retenção.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-200">Playbook de Recuperação de Desastre (Cold Restore)</h4>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 font-mono text-[11px] text-zinc-300">
              <pre className="overflow-x-auto whitespace-pre">
{`# 1. Parar serviços no nó afetado
systemctl stop vortexs3

# 2. Restaurar dados a partir de arquivo de backup imutável
vortexs3-cli restore --archive /backups/cluster-snapshot-20261101.tar.gz \\
                     --target-dir /mnt/disks/storage-nvme \\
                     --verify-sha256

# 3. Reiniciar nó e validar reconciliação Raft
systemctl start vortexs3
vortexs3-cli cluster status --quorum-check`}
              </pre>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'env-vars',
      title: 'Variáveis de Ambiente (.env) e Configuração',
      category: 'config',
      icon: <FileText className="w-4 h-4 text-emerald-400" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-zinc-100 mb-1">
              Dicionário Completo de Configuração do Servidor
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Todas as opções podem ser informadas via arquivo de ambiente <code className="text-zinc-200">/etc/vortexs3/vortexs3.conf</code> ou variáveis de contêiner.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-zinc-800 rounded-lg overflow-hidden">
              <thead className="bg-zinc-800/60 text-zinc-300 font-mono text-[11px]">
                <tr>
                  <th className="p-2.5">Variável</th>
                  <th className="p-2.5">Padrão</th>
                  <th className="p-2.5">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-zinc-400 text-[11px] font-mono">
                <tr>
                  <td className="p-2.5 text-emerald-400">VORTEX_PORT</td>
                  <td className="p-2.5 text-zinc-500">9000</td>
                  <td className="p-2.5 font-sans text-zinc-300">Porta de escuta para requisições da API S3 REST.</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-emerald-400">VORTEX_CONSOLE_PORT</td>
                  <td className="p-2.5 text-zinc-500">9001</td>
                  <td className="p-2.5 font-sans text-zinc-300">Porta da interface Web administrativa.</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-emerald-400">VORTEX_RAFT_PORT</td>
                  <td className="p-2.5 text-zinc-500">9002</td>
                  <td className="p-2.5 font-sans text-zinc-300">Porta TCP para protocolo de consenso Raft e replicação interna.</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-emerald-400">VORTEX_STORAGE_PATH</td>
                  <td className="p-2.5 text-zinc-500">/data</td>
                  <td className="p-2.5 font-sans text-zinc-300">Caminho no sistema de arquivos para gravação dos shards e BadgerDB.</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-emerald-400">VORTEX_RS_DATA_SHARDS</td>
                  <td className="p-2.5 text-zinc-500">4</td>
                  <td className="p-2.5 font-sans text-zinc-300">Quantidade de fatias de dados da codificação Reed-Solomon.</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-emerald-400">VORTEX_RS_PARITY_SHARDS</td>
                  <td className="p-2.5 text-zinc-500">2</td>
                  <td className="p-2.5 font-sans text-zinc-300">Quantidade de fatias de paridade para proteção contra falhas simultâneas.</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-emerald-400">VORTEX_CLUSTER_TOKEN</td>
                  <td className="p-2.5 text-zinc-500">None</td>
                  <td className="p-2.5 font-sans text-zinc-300">Token secreto compartilhado para autenticação mTLS de novos nós.</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-emerald-400">VORTEX_SCRUBBER_INTERVAL</td>
                  <td className="p-2.5 text-zinc-500">12h</td>
                  <td className="p-2.5 font-sans text-zinc-300">Periodicidade da varredura de bitrot e auto-healing nos discos.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
  ];

  const filteredSections = sections.filter(sec => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return sec.title.toLowerCase().includes(q) || sec.category.toLowerCase().includes(q);
  });

  const activeSection = sections.find(s => s.id === activeSectionId) || sections[0];

  const downloadFullDocs = () => {
    const markdownContent = `# VortexS3 - Documentação Técnica Oficial de Produção

## 1. Visão Geral
O VortexS3 é um servidor de armazenamento de objetos compatível com AWS S3 com as seguintes características:
- Codificação de Apagamento Reed-Solomon RS(4+2)
- Consenso Raft distribuído
- Metadados de alta performance indexados em BadgerDB / SQLite
- Criptografia SSE-S3 AES-256-GCM
- Object Lock WORM e Retenção Legal
- Métricas nativas em formato Prometheus (/metrics)

## 2. Portas de Rede
- 9000/TCP: API S3 REST
- 9001/TCP: Console Web Administrativo
- 9002/TCP: Sincronização Raft mTLS
- 9090/TCP: Métricas Prometheus

## 3. Compatibilidade SDK
Compatível com boto3 (Python), @aws-sdk/client-s3 (Node.js/TypeScript), aws-cli e AWS SDK Go v2.
`;

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'VORTEXS3_MANUAL_TECNICO.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-zinc-100">Documentação do Sistema</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manuais técnicos de implantação, arquitetura de resiliência, SDKs e guias operacionais
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar na documentação..."
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 w-56"
            />
          </div>

          <button
            onClick={downloadFullDocs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors border border-zinc-700/80 cursor-pointer"
            title="Baixar Manual Técnico em Markdown"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar .MD</span>
          </button>
        </div>
      </div>

      {/* Docs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 space-y-1">
          <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
            Tópicos & Guias
          </div>

          {filteredSections.map(sec => {
            const isSelected = sec.id === activeSectionId;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSectionId(sec.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-800 text-emerald-400 font-semibold border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={isSelected ? 'text-emerald-400' : 'text-zinc-500'}>
                    {sec.icon}
                  </span>
                  <span className="truncate">{sec.title}</span>
                </div>
                {isSelected && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-emerald-400" />}
              </button>
            );
          })}
        </div>

        {/* Content Viewer */}
        <div className="lg:col-span-3 bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 shadow-xl">
          {activeSection.content}
        </div>
      </div>
    </div>
  );
};
