import { ClusterNode, ReplicationEvent } from '../types/storage';

const REPLICATION_STORAGE_KEYS = {
  NODES: 'vortexs3_nodes_v1',
  EVENTS: 'vortexs3_repl_events_v1',
};

const INITIAL_NODES: ClusterNode[] = [
  {
    id: 'node-1',
    name: 'vortex-node-1 (Principal)',
    endpoint: 'http://node1.cluster.local:9000',
    role: 'leader',
    status: 'online',
    latencyMs: 1.2,
    diskTotalBytes: 500000000000, // 500 GB
    diskUsedBytes: 258350000,
    replicatedObjectsCount: 9,
    lastHeartbeat: new Date().toISOString(),
    replicationQueueLength: 0,
    ipAddress: '10.0.1.10',
    serverLocation: 'Datacenter SP-01 (Principal)',
    region: 'sa-east-1',
    tlsEnabled: false,
  },
  {
    id: 'node-2',
    name: 'vortex-node-2 (Réplica A)',
    endpoint: 'http://node2.cluster.local:9000',
    role: 'follower',
    status: 'online',
    latencyMs: 8.4,
    diskTotalBytes: 500000000000,
    diskUsedBytes: 258350000,
    replicatedObjectsCount: 9,
    lastHeartbeat: new Date().toISOString(),
    replicationQueueLength: 0,
    ipAddress: '10.0.1.11',
    serverLocation: 'AWS us-east-1 (Servidor Remoto)',
    region: 'us-east-1',
    tlsEnabled: false,
  },
  {
    id: 'node-3',
    name: 'vortex-node-3 (Réplica B)',
    endpoint: 'http://node3.cluster.local:9000',
    role: 'follower',
    status: 'online',
    latencyMs: 12.1,
    diskTotalBytes: 500000000000,
    diskUsedBytes: 258350000,
    replicatedObjectsCount: 9,
    lastHeartbeat: new Date().toISOString(),
    replicationQueueLength: 0,
    ipAddress: '10.0.1.12',
    serverLocation: 'Baremetal OVH FRA (Servidor Remoto)',
    region: 'eu-west-1',
    tlsEnabled: true,
  },
];

const INITIAL_EVENTS: ReplicationEvent[] = [
  {
    id: 'ev-1',
    timestamp: '2026-10-29T16:30:12Z',
    action: 'PUT',
    bucket: 'docker-artifacts',
    objectKey: 'manifest-list.json',
    sourceNodeId: 'node-1',
    targetNodeId: 'node-2',
    status: 'success',
    durationMs: 18,
    bytes: 5100000,
  },
  {
    id: 'ev-2',
    timestamp: '2026-10-29T16:30:13Z',
    action: 'PUT',
    bucket: 'docker-artifacts',
    objectKey: 'manifest-list.json',
    sourceNodeId: 'node-1',
    targetNodeId: 'node-3',
    status: 'success',
    durationMs: 24,
    bytes: 5100000,
  },
  {
    id: 'ev-3',
    timestamp: '2026-10-29T16:20:05Z',
    action: 'PUT',
    bucket: 'production-media',
    objectKey: 'branding/logo-vortexs3.svg',
    sourceNodeId: 'node-1',
    targetNodeId: 'node-2',
    status: 'success',
    durationMs: 12,
    bytes: 24500,
  },
  {
    id: 'ev-4',
    timestamp: '2026-10-29T16:20:06Z',
    action: 'PUT',
    bucket: 'production-media',
    objectKey: 'branding/logo-vortexs3.svg',
    sourceNodeId: 'node-1',
    targetNodeId: 'node-3',
    status: 'success',
    durationMs: 15,
    bytes: 24500,
  },
];

class ReplicationEngine {
  private nodes: ClusterNode[] = [];
  private events: ReplicationEvent[] = [];
  private listeners: (() => void)[] = [];
  private pendingQueueByNode: Record<string, { bucket: string; key: string; size: number }[]> = {};

  constructor() {
    this.loadState();
    this.startHeartbeatSimulator();
  }

  private loadState() {
    try {
      const storedNodes = localStorage.getItem(REPLICATION_STORAGE_KEYS.NODES);
      const storedEvents = localStorage.getItem(REPLICATION_STORAGE_KEYS.EVENTS);
      this.nodes = storedNodes ? JSON.parse(storedNodes) : INITIAL_NODES;
      this.events = storedEvents ? JSON.parse(storedEvents) : INITIAL_EVENTS;
    } catch {
      this.nodes = INITIAL_NODES;
      this.events = INITIAL_EVENTS;
    }
  }

  private persist() {
    try {
      localStorage.setItem(REPLICATION_STORAGE_KEYS.NODES, JSON.stringify(this.nodes));
      localStorage.setItem(REPLICATION_STORAGE_KEYS.EVENTS, JSON.stringify(this.events));
    } catch (e) {
      console.warn('Could not persist replication state', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public getNodes(): ClusterNode[] {
    return [...this.nodes];
  }

  public getEvents(): ReplicationEvent[] {
    return [...this.events];
  }

  public generateClusterJoinToken(): {
    token: string;
    expiresAt: string;
    joinCommand: string;
    dockerCommand: string;
    clusterEndpoint: string;
  } {
    const leader = this.nodes.find(n => n.role === 'leader') || this.nodes[0];
    const clusterEndpoint = leader?.endpoint || 'http://10.0.1.10:9000';
    const token = `vxtk_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`;
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const joinCommand = `vortexs3 node join --cluster-token "${token}" --peer "${clusterEndpoint}" --listen "0.0.0.0:9000"`;
    const dockerCommand = `docker run -d --name vortexs3-node \\
  --restart always \\
  -p 9000:9000 \\
  -v /data/vortexs3:/data \\
  -e VORTEX_CLUSTER_TOKEN="${token}" \\
  -e VORTEX_PEER_ENDPOINTS="${clusterEndpoint}" \\
  -e VORTEX_NODE_ROLE="follower" \\
  vortexs3/vortexs3:latest`;

    return { token, expiresAt, joinCommand, dockerCommand, clusterEndpoint };
  }

  public addNode(params: {
    name: string;
    endpoint: string;
    ipAddress: string;
    role?: 'follower' | 'observer';
    diskTotalGB?: number;
    serverLocation?: string;
    region?: string;
    tlsEnabled?: boolean;
    joinToken?: string;
  }): ClusterNode {
    const cleanEndpoint = params.endpoint.trim().replace(/\/+$/, '');
    if (!cleanEndpoint.startsWith('http://') && !cleanEndpoint.startsWith('https://')) {
      throw new Error('O endpoint do nó deve iniciar com http:// ou https://');
    }

    if (this.nodes.some(n => n.endpoint.toLowerCase() === cleanEndpoint.toLowerCase())) {
      throw new Error(`Já existe um nó registrado com o endpoint "${cleanEndpoint}".`);
    }

    const newNodeId = `node-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const diskBytes = (params.diskTotalGB || 500) * 1024 * 1024 * 1024;
    const isHttps = cleanEndpoint.startsWith('https://') || !!params.tlsEnabled;

    const newNode: ClusterNode = {
      id: newNodeId,
      name: params.name.trim() || `vortex-node-${this.nodes.length + 1}`,
      endpoint: cleanEndpoint,
      role: params.role || 'follower',
      status: 'syncing', // Inicia handshake e sincronização
      latencyMs: Math.floor(Math.random() * 25) + 12,
      diskTotalBytes: diskBytes,
      diskUsedBytes: 0,
      replicatedObjectsCount: 0,
      lastHeartbeat: new Date().toISOString(),
      replicationQueueLength: 0,
      ipAddress: params.ipAddress.trim() || '192.168.1.100',
      serverLocation: params.serverLocation || 'Servidor Remoto Externo',
      region: params.region || 'us-east-1',
      tlsEnabled: isHttps,
      joinToken: params.joinToken,
    };

    this.nodes.push(newNode);

    this.events.unshift({
      id: `ev-${Date.now()}-node-join`,
      timestamp: new Date().toISOString(),
      action: 'NODE_JOIN',
      bucket: '*',
      objectKey: `Novo nó remoto conectado ao cluster: ${newNode.name} (${newNode.ipAddress})`,
      sourceNodeId: newNode.id,
      targetNodeId: this.nodes[0]?.id || 'cluster',
      status: 'success',
      durationMs: 45,
      bytes: 0,
    });

    if (this.events.length > 50) this.events = this.events.slice(0, 50);
    this.persist();

    // Simula conclusão de sincronização de metadados
    setTimeout(() => {
      const target = this.nodes.find(n => n.id === newNodeId);
      if (target && target.status === 'syncing') {
        target.status = 'online';
        target.replicatedObjectsCount = 9;
        target.diskUsedBytes = 258350000;
        this.persist();
      }
    }, 1800);

    return newNode;
  }

  public removeNode(nodeId: string): void {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) throw new Error('Nó não encontrado.');

    if (node.role === 'leader') {
      throw new Error('Não é possível remover o nó Líder do cluster. Promova outro nó a líder antes de desconectá-lo.');
    }

    if (this.nodes.length <= 2) {
      throw new Error('O cluster necessita de no mínimo 2 nós para manter o quorum de replicação ativo.');
    }

    this.nodes = this.nodes.filter(n => n.id !== nodeId);

    this.events.unshift({
      id: `ev-${Date.now()}-node-remove`,
      timestamp: new Date().toISOString(),
      action: 'NODE_REMOVE',
      bucket: '*',
      objectKey: `Nó desprovisionado e desconectado do cluster: ${node.name} (${node.ipAddress})`,
      sourceNodeId: nodeId,
      targetNodeId: 'cluster',
      status: 'success',
      durationMs: 25,
      bytes: 0,
    });

    if (this.events.length > 50) this.events = this.events.slice(0, 50);
    this.persist();
  }

  public toggleNodeStatus(nodeId: string): void {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.status === 'online') {
      node.status = 'offline';
      node.latencyMs = 0;
      this.persist();
    } else {
      // Coming back online -> Trigger automatic catchup
      node.status = 'syncing';
      this.persist();

      setTimeout(() => {
        this.runCatchupSync(nodeId);
      }, 1200);
    }
  }

  public triggerManualSyncAll(): void {
    const onlineFollowers = this.nodes.filter(n => n.role === 'follower' && n.status !== 'offline');
    onlineFollowers.forEach(node => {
      node.status = 'syncing';
    });
    this.persist();

    setTimeout(() => {
      onlineFollowers.forEach(node => {
        node.status = 'online';
        node.replicationQueueLength = 0;
        node.lastHeartbeat = new Date().toISOString();

        this.events.unshift({
          id: `ev-${Date.now()}-${node.id}`,
          timestamp: new Date().toISOString(),
          action: 'SYNC_CATCHUP',
          bucket: '*',
          objectKey: 'Todas as chaves sincronizadas',
          sourceNodeId: 'node-1',
          targetNodeId: node.id,
          status: 'success',
          durationMs: Math.floor(Math.random() * 40) + 15,
          bytes: 258350000,
        });
      });

      if (this.events.length > 50) this.events = this.events.slice(0, 50);
      this.persist();
    }, 1500);
  }

  public handleObjectPut(bucket: string, key: string, sizeBytes: number): void {
    const leader = this.nodes.find(n => n.role === 'leader') || this.nodes[0];
    const followers = this.nodes.filter(n => n.id !== leader.id);

    followers.forEach(follower => {
      if (follower.status === 'offline') {
        // Queue for delayed catch-up
        if (!this.pendingQueueByNode[follower.id]) {
          this.pendingQueueByNode[follower.id] = [];
        }
        this.pendingQueueByNode[follower.id].push({ bucket, key, size: sizeBytes });
        follower.replicationQueueLength = this.pendingQueueByNode[follower.id].length;

        this.events.unshift({
          id: `ev-${Date.now()}-${follower.id}`,
          timestamp: new Date().toISOString(),
          action: 'PUT',
          bucket,
          objectKey: key,
          sourceNodeId: leader.id,
          targetNodeId: follower.id,
          status: 'failed',
          durationMs: 5000,
          bytes: sizeBytes,
        });
      } else {
        follower.replicatedObjectsCount += 1;
        follower.diskUsedBytes += sizeBytes;

        this.events.unshift({
          id: `ev-${Date.now()}-${follower.id}`,
          timestamp: new Date().toISOString(),
          action: 'PUT',
          bucket,
          objectKey: key,
          sourceNodeId: leader.id,
          targetNodeId: follower.id,
          status: 'success',
          durationMs: Math.floor(Math.random() * 25) + 8,
          bytes: sizeBytes,
        });
      }
    });

    if (this.events.length > 50) this.events = this.events.slice(0, 50);
    this.persist();
  }

  public handleObjectDelete(bucket: string, key: string): void {
    const leader = this.nodes.find(n => n.role === 'leader') || this.nodes[0];
    const followers = this.nodes.filter(n => n.id !== leader.id);

    followers.forEach(follower => {
      if (follower.status === 'online') {
        follower.replicatedObjectsCount = Math.max(0, follower.replicatedObjectsCount - 1);

        this.events.unshift({
          id: `ev-${Date.now()}-${follower.id}`,
          timestamp: new Date().toISOString(),
          action: 'DELETE',
          bucket,
          objectKey: key,
          sourceNodeId: leader.id,
          targetNodeId: follower.id,
          status: 'success',
          durationMs: Math.floor(Math.random() * 15) + 5,
          bytes: 0,
        });
      }
    });

    if (this.events.length > 50) this.events = this.events.slice(0, 50);
    this.persist();
  }

  private runCatchupSync(nodeId: string) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const queuedItems = this.pendingQueueByNode[nodeId] || [];
    const totalQueuedBytes = queuedItems.reduce((acc, i) => acc + i.size, 0);

    node.status = 'online';
    node.replicatedObjectsCount += queuedItems.length;
    node.diskUsedBytes += totalQueuedBytes;
    node.replicationQueueLength = 0;
    node.lastHeartbeat = new Date().toISOString();
    node.latencyMs = Math.floor(Math.random() * 10) + 5;

    this.pendingQueueByNode[nodeId] = [];

    this.events.unshift({
      id: `ev-${Date.now()}-${node.id}-catchup`,
      timestamp: new Date().toISOString(),
      action: 'SYNC_CATCHUP',
      bucket: '*',
      objectKey: `${queuedItems.length || 'Cluster'} objetos sincronizados no retorno do nó`,
      sourceNodeId: 'node-1',
      targetNodeId: nodeId,
      status: 'success',
      durationMs: 340,
      bytes: totalQueuedBytes,
    });

    if (this.events.length > 50) this.events = this.events.slice(0, 50);
    this.persist();
  }

  private startHeartbeatSimulator() {
    setInterval(() => {
      let updated = false;
      this.nodes.forEach(n => {
        if (n.status === 'online') {
          n.lastHeartbeat = new Date().toISOString();
          // slight natural jitter
          n.latencyMs = Math.max(0.5, Number((n.latencyMs + (Math.random() * 0.8 - 0.4)).toFixed(1)));
          updated = true;
        }
      });
      if (updated) {
        this.notify();
      }
    }, 4000);
  }
}

export const replicationEngine = new ReplicationEngine();
