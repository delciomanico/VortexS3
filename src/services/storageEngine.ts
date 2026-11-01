import {
  Bucket,
  StorageObject,
  ObjectShard,
  ScrubReport,
  IAMAccessKey,
  ClusterMetrics,
  LifecycleRule,
  BucketEventNotification,
  AccessLogEntry,
  RestoreOptions,
} from '../types/storage';
import { replicationEngine } from './replicationEngine';

const STORAGE_KEYS = {
  BUCKETS: 'vortexs3_buckets_v1',
  OBJECTS: 'vortexs3_objects_v1',
  IAM_KEYS: 'vortexs3_iam_keys_v1',
  LIFECYCLE: 'vortexs3_lifecycle_v1',
  WEBHOOKS: 'vortexs3_webhooks_v1',
  ACCESS_LOGS: 'vortexs3_access_logs_v1',
};

const INITIAL_BUCKETS: Bucket[] = [
  {
    id: 'b-prod-media',
    name: 'production-media',
    createdAt: '2026-10-20T10:00:00Z',
    region: 'us-east-1',
    versioningEnabled: true,
    objectCount: 4,
    sizeBytes: 14850000,
    publicAccess: 'public-read',
    tags: { env: 'production', tier: 'hot', team: 'frontend' },
    lifecycleRulesCount: 2,
    encryption: 'AES256',
    objectLockEnabled: false,
  },
  {
    id: 'b-db-backups',
    name: 'database-backups',
    createdAt: '2026-10-22T14:30:00Z',
    region: 'us-east-1',
    versioningEnabled: true,
    objectCount: 2,
    sizeBytes: 154200000,
    publicAccess: 'private',
    tags: { env: 'production', compliance: 'soc2', retention: '90d' },
    lifecycleRulesCount: 1,
    encryption: 'AES256',
    objectLockEnabled: true,
  },
  {
    id: 'b-docker-artifacts',
    name: 'docker-artifacts',
    createdAt: '2026-10-25T08:15:00Z',
    region: 'us-east-1',
    versioningEnabled: false,
    objectCount: 3,
    sizeBytes: 89300000,
    publicAccess: 'private',
    tags: { env: 'ci-cd', system: 'buildx' },
    lifecycleRulesCount: 0,
    encryption: 'none',
    objectLockEnabled: false,
  },
];

const INITIAL_OBJECTS: StorageObject[] = [
  {
    id: 'obj-1',
    bucketName: 'production-media',
    key: 'branding/logo-vortexs3.svg',
    sizeBytes: 24500,
    etag: '"9f840814fd16478e88b5462cf734a799"',
    contentType: 'image/svg+xml',
    lastModified: '2026-10-28T16:20:00Z',
    storageClass: 'STANDARD',
    customMetadata: { 'x-amz-meta-creator': 'designer', 'x-amz-meta-project': 'vortex' },
    tags: { type: 'vector', asset: 'logo' },
    versionId: 'v1.0.0',
    isLatest: true,
    replicationStatus: 'synced',
    encryption: 'AES256',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%232563EB" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
  },
  {
    id: 'obj-2',
    bucketName: 'production-media',
    key: 'banners/hero-dark-engine.webp',
    sizeBytes: 840500,
    etag: '"4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f"',
    contentType: 'image/webp',
    lastModified: '2026-10-28T18:10:00Z',
    storageClass: 'STANDARD',
    customMetadata: { 'x-amz-meta-optimized': 'true' },
    tags: { section: 'hero' },
    versionId: 'v1.1.0',
    isLatest: true,
    replicationStatus: 'synced',
    encryption: 'AES256',
  },
  {
    id: 'obj-3',
    bucketName: 'production-media',
    key: 'documents/architecture-whitepaper.pdf',
    sizeBytes: 3450000,
    etag: '"7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d"',
    contentType: 'application/pdf',
    lastModified: '2026-10-29T11:45:00Z',
    storageClass: 'STANDARD',
    customMetadata: { 'x-amz-meta-confidential': 'false' },
    tags: { doc: 'specs' },
    versionId: 'v1.0.0',
    isLatest: true,
    replicationStatus: 'synced',
    encryption: 'AES256',
  },
  {
    id: 'obj-4',
    bucketName: 'production-media',
    key: 'config/cluster-topology.json',
    sizeBytes: 12400,
    etag: '"3b2a1c0d4e5f6a7b8c9d0e1f2a3b4c5d"',
    contentType: 'application/json',
    lastModified: '2026-10-29T14:00:00Z',
    storageClass: 'STANDARD',
    customMetadata: { 'x-amz-meta-nodes': '3' },
    tags: { config: 'cluster' },
    versionId: 'v2.0.1',
    isLatest: true,
    replicationStatus: 'synced',
    encryption: 'AES256',
  },
  {
    id: 'obj-5',
    bucketName: 'database-backups',
    key: '2026-10-29/postgres-cluster-daily.sql.gz',
    sizeBytes: 112500000,
    etag: '"a1b2c3d4e5f60718293a4b5c6d7e8f90"',
    contentType: 'application/gzip',
    lastModified: '2026-10-29T03:00:00Z',
    storageClass: 'STANDARD',
    customMetadata: { 'x-amz-meta-db': 'primary', 'x-amz-meta-type': 'dump' },
    tags: { schedule: 'daily' },
    versionId: 'v-snap-01',
    isLatest: true,
    replicationStatus: 'synced',
    encryption: 'AES256',
    retentionUntil: '2027-01-29T00:00:00Z',
    legalHold: true,
  },
  {
    id: 'obj-6',
    bucketName: 'database-backups',
    key: '2026-10-28/postgres-cluster-daily.sql.gz',
    sizeBytes: 41700000,
    etag: '"f0e1d2c3b4a5968778695a4b3c2d1e0f"',
    contentType: 'application/gzip',
    lastModified: '2026-10-28T03:00:00Z',
    storageClass: 'STANDARD',
    customMetadata: { 'x-amz-meta-db': 'primary' },
    tags: { schedule: 'daily' },
    versionId: 'v-snap-00',
    isLatest: true,
    replicationStatus: 'synced',
    encryption: 'AES256',
    retentionUntil: '2027-01-28T00:00:00Z',
  },
  {
    id: 'obj-7',
    bucketName: 'docker-artifacts',
    key: 'vortexs3-linux-amd64.tar',
    sizeBytes: 42300000,
    etag: '"887766554433221100aabbccddeeff99"',
    contentType: 'application/x-tar',
    lastModified: '2026-10-29T15:20:00Z',
    storageClass: 'STANDARD',
    customMetadata: { 'x-amz-meta-arch': 'amd64' },
    tags: { dist: 'release' },
    versionId: 'v1.0.0',
    isLatest: true,
    replicationStatus: 'synced',
  },
  {
    id: 'obj-8',
    bucketName: 'docker-artifacts',
    key: 'vortexs3-linux-arm64.tar',
    sizeBytes: 41900000,
    etag: '"112233445566778899aabbccddeeff00"',
    contentType: 'application/x-tar',
    lastModified: '2026-10-29T15:25:00Z',
    storageClass: 'STANDARD',
    customMetadata: { 'x-amz-meta-arch': 'arm64' },
    tags: { dist: 'release' },
    versionId: 'v1.0.0',
    isLatest: true,
    replicationStatus: 'synced',
  },
  {
    id: 'obj-9',
    bucketName: 'docker-artifacts',
    key: 'manifest-list.json',
    sizeBytes: 5100000,
    etag: '"ccddee11223344556677889900aabbcc"',
    contentType: 'application/json',
    lastModified: '2026-10-29T15:30:00Z',
    storageClass: 'STANDARD',
    customMetadata: { 'x-amz-meta-format': 'oci' },
    tags: { oci: 'index' },
    versionId: 'v1.0.0',
    isLatest: true,
    replicationStatus: 'synced',
  },
];

const INITIAL_IAM_KEYS: IAMAccessKey[] = [
  {
    id: 'iam-1',
    accessKeyId: 'VXAKIA799PRODROOT',
    secretAccessKey: 'vxs_wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    name: 'Cluster Root Admin',
    createdAt: '2026-10-20T10:00:00Z',
    permissions: 'admin',
    allowedBuckets: ['*'],
    status: 'active',
    lastUsedAt: '2026-10-29T16:40:00Z',
  },
  {
    id: 'iam-2',
    accessKeyId: 'VXAKIA432DOCKERHUB',
    secretAccessKey: 'vxs_7XQW9uT+K0pLzNmRtYvWbC2dE4fGhIjKlMnOpQrS',
    name: 'CI/CD Docker & GitHub Actions',
    createdAt: '2026-10-24T12:00:00Z',
    permissions: 'read-write',
    allowedBuckets: ['docker-artifacts'],
    status: 'active',
    lastUsedAt: '2026-10-29T15:32:00Z',
  },
];

const INITIAL_LIFECYCLE: LifecycleRule[] = [
  {
    id: 'lc-1',
    bucketName: 'production-media',
    prefix: 'temp-uploads/',
    status: 'Enabled',
    expirationDays: 7,
    abortIncompleteMultipartDays: 1,
  },
  {
    id: 'lc-2',
    bucketName: 'database-backups',
    prefix: 'daily/',
    status: 'Enabled',
    expirationDays: 90,
    transitionDays: 30,
    transitionStorageClass: 'GLACIER',
  },
];

const INITIAL_WEBHOOKS: BucketEventNotification[] = [
  {
    id: 'wh-1',
    bucketName: 'production-media',
    endpointUrl: 'https://api.vortexs3.io/webhooks/media-processed',
    events: ['s3:ObjectCreated:*'],
    prefixFilter: 'images/',
    createdAt: '2026-10-25T10:00:00Z',
    status: 'active',
    lastDeliveredAt: '2026-10-29T16:20:06Z',
  },
];

const INITIAL_ACCESS_LOGS: AccessLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '2026-10-29T17:35:12Z',
    clientIp: '192.168.1.45',
    method: 'PUT',
    bucket: 'docker-artifacts',
    key: 'manifest-list.json',
    httpStatus: 200,
    bytesTransferred: 5100000,
    durationMs: 45,
    userAgent: 'Docker-Client/27.3.1 (linux)',
  },
  {
    id: 'log-2',
    timestamp: '2026-10-29T17:30:05Z',
    clientIp: '10.0.0.12',
    method: 'GET',
    bucket: 'production-media',
    key: 'branding/logo-vortexs3.svg',
    httpStatus: 200,
    bytesTransferred: 24500,
    durationMs: 8,
    userAgent: 'aws-sdk-nodejs/v3.690.0',
  },
  {
    id: 'log-3',
    timestamp: '2026-10-29T17:28:40Z',
    clientIp: '177.18.29.102',
    method: 'GET',
    bucket: 'database-backups',
    key: 'secret-keys.pem',
    httpStatus: 404,
    bytesTransferred: 0,
    durationMs: 4,
    userAgent: 'curl/8.5.0',
  },
];

class StorageEngine {
  private buckets: Bucket[] = [];
  private objects: StorageObject[] = [];
  private iamKeys: IAMAccessKey[] = [];
  private lifecycleRules: LifecycleRule[] = [];
  private webhooks: BucketEventNotification[] = [];
  private accessLogs: AccessLogEntry[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const storedBuckets = localStorage.getItem(STORAGE_KEYS.BUCKETS);
      const storedObjects = localStorage.getItem(STORAGE_KEYS.OBJECTS);
      const storedIAM = localStorage.getItem(STORAGE_KEYS.IAM_KEYS);
      const storedLC = localStorage.getItem(STORAGE_KEYS.LIFECYCLE);
      const storedWH = localStorage.getItem(STORAGE_KEYS.WEBHOOKS);
      const storedLogs = localStorage.getItem(STORAGE_KEYS.ACCESS_LOGS);

      this.buckets = storedBuckets ? JSON.parse(storedBuckets) : INITIAL_BUCKETS;
      const loadedObjects: StorageObject[] = storedObjects ? JSON.parse(storedObjects) : INITIAL_OBJECTS;
      this.objects = loadedObjects.map(obj => {
        if (!obj.shards || obj.shards.length === 0) {
          return {
            ...obj,
            shards: this.createErasureShards(obj.id, obj.sizeBytes),
            erasureHealthy: true,
            encryption: obj.encryption || 'AES256',
            encryptionCipher: 'AES-256-GCM',
          };
        }
        return obj;
      });
      this.iamKeys = storedIAM ? JSON.parse(storedIAM) : INITIAL_IAM_KEYS;
      this.lifecycleRules = storedLC ? JSON.parse(storedLC) : INITIAL_LIFECYCLE;
      this.webhooks = storedWH ? JSON.parse(storedWH) : INITIAL_WEBHOOKS;
      this.accessLogs = storedLogs ? JSON.parse(storedLogs) : INITIAL_ACCESS_LOGS;
    } catch {
      this.buckets = INITIAL_BUCKETS;
      this.objects = INITIAL_OBJECTS.map(obj => ({
        ...obj,
        shards: this.createErasureShards(obj.id, obj.sizeBytes),
        erasureHealthy: true,
        encryption: obj.encryption || 'AES256',
        encryptionCipher: 'AES-256-GCM',
      }));
      this.iamKeys = INITIAL_IAM_KEYS;
      this.lifecycleRules = INITIAL_LIFECYCLE;
      this.webhooks = INITIAL_WEBHOOKS;
      this.accessLogs = INITIAL_ACCESS_LOGS;
    }
  }

  public createErasureShards(objectId: string, sizeBytes: number): ObjectShard[] {
    const shardSizeBytes = Math.ceil(sizeBytes / 4);
    const nodes = [
      { id: 'node-1', name: 'vortex-node-1' },
      { id: 'node-2', name: 'vortex-node-2' },
      { id: 'node-3', name: 'vortex-node-3' },
    ];

    const shards: ObjectShard[] = [
      { shardIndex: 0, nodeId: nodes[0].id, nodeName: nodes[0].name, type: 'data', status: 'healthy', checksum: `hw64_${objectId}_d0`, sizeBytes: shardSizeBytes },
      { shardIndex: 1, nodeId: nodes[1].id, nodeName: nodes[1].name, type: 'data', status: 'healthy', checksum: `hw64_${objectId}_d1`, sizeBytes: shardSizeBytes },
      { shardIndex: 2, nodeId: nodes[2].id, nodeName: nodes[2].name, type: 'data', status: 'healthy', checksum: `hw64_${objectId}_d2`, sizeBytes: shardSizeBytes },
      { shardIndex: 3, nodeId: nodes[0].id, nodeName: nodes[0].name, type: 'data', status: 'healthy', checksum: `hw64_${objectId}_d3`, sizeBytes: shardSizeBytes },
      { shardIndex: 4, nodeId: nodes[1].id, nodeName: nodes[1].name, type: 'parity', status: 'healthy', checksum: `hw64_${objectId}_p0`, sizeBytes: shardSizeBytes },
      { shardIndex: 5, nodeId: nodes[2].id, nodeName: nodes[2].name, type: 'parity', status: 'healthy', checksum: `hw64_${objectId}_p1`, sizeBytes: shardSizeBytes },
    ];
    return shards;
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEYS.BUCKETS, JSON.stringify(this.buckets));
      localStorage.setItem(STORAGE_KEYS.OBJECTS, JSON.stringify(this.objects));
      localStorage.setItem(STORAGE_KEYS.IAM_KEYS, JSON.stringify(this.iamKeys));
      localStorage.setItem(STORAGE_KEYS.LIFECYCLE, JSON.stringify(this.lifecycleRules));
      localStorage.setItem(STORAGE_KEYS.WEBHOOKS, JSON.stringify(this.webhooks));
      localStorage.setItem(STORAGE_KEYS.ACCESS_LOGS, JSON.stringify(this.accessLogs));
    } catch (e) {
      console.warn('Could not persist to localStorage', e);
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

  // --- ACCESS LOGGING ---
  public logAccess(entry: Omit<AccessLogEntry, 'id' | 'timestamp'>) {
    const newLog: AccessLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.accessLogs.unshift(newLog);
    if (this.accessLogs.length > 100) this.accessLogs = this.accessLogs.slice(0, 100);
    this.persist();
  }

  public getAccessLogs(): AccessLogEntry[] {
    return [...this.accessLogs];
  }

  // --- BUCKETS ---
  public getBuckets(): Bucket[] {
    return [...this.buckets];
  }

  public getBucket(name: string): Bucket | undefined {
    return this.buckets.find(b => b.name === name);
  }

  public createBucket(params: {
    name: string;
    region?: string;
    versioningEnabled?: boolean;
    publicAccess?: 'private' | 'public-read' | 'public-read-write';
    tags?: Record<string, string>;
    encryption?: 'AES256' | 'none';
    objectLockEnabled?: boolean;
  }): Bucket {
    const cleanName = params.name.trim().toLowerCase();
    if (!/^[a-z0-9.-]{3,63}$/.test(cleanName)) {
      throw new Error('O nome do bucket deve ter entre 3 e 63 caracteres (letras minúsculas, números, pontos e hífens).');
    }

    if (this.buckets.some(b => b.name === cleanName)) {
      throw new Error(`O bucket "${cleanName}" já existe neste cluster.`);
    }

    const newBucket: Bucket = {
      id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      createdAt: new Date().toISOString(),
      region: params.region || 'us-east-1',
      versioningEnabled: !!params.versioningEnabled,
      objectCount: 0,
      sizeBytes: 0,
      publicAccess: params.publicAccess || 'private',
      tags: params.tags || { env: 'production' },
      lifecycleRulesCount: 0,
      encryption: params.encryption || 'AES256',
      objectLockEnabled: !!params.objectLockEnabled,
    };

    this.buckets.push(newBucket);
    this.logAccess({
      clientIp: '127.0.0.1',
      method: 'PUT',
      bucket: cleanName,
      key: '',
      httpStatus: 200,
      bytesTransferred: 0,
      durationMs: 12,
      userAgent: 'VortexS3-Console/1.0',
    });
    this.persist();
    return newBucket;
  }

  public deleteBucket(name: string): void {
    const bucket = this.buckets.find(b => b.name === name);
    if (!bucket) throw new Error('Bucket não encontrado');

    const hasObjects = this.objects.some(o => o.bucketName === name);
    if (hasObjects) {
      throw new Error('O bucket não está vazio. Exclua todos os objetos antes de deletá-lo.');
    }

    this.buckets = this.buckets.filter(b => b.name !== name);
    this.lifecycleRules = this.lifecycleRules.filter(r => r.bucketName !== name);
    this.webhooks = this.webhooks.filter(w => w.bucketName !== name);
    this.logAccess({
      clientIp: '127.0.0.1',
      method: 'DELETE',
      bucket: name,
      key: '',
      httpStatus: 204,
      bytesTransferred: 0,
      durationMs: 15,
      userAgent: 'VortexS3-Console/1.0',
    });
    this.persist();
  }

  public updateBucketSettings(name: string, updates: Partial<Bucket>): void {
    const idx = this.buckets.findIndex(b => b.name === name);
    if (idx !== -1) {
      this.buckets[idx] = { ...this.buckets[idx], ...updates };
      this.persist();
    }
  }

  // --- OBJECTS ---
  public getObjects(bucketName: string, prefix = ''): StorageObject[] {
    return this.objects.filter(o => {
      if (o.bucketName !== bucketName) return false;
      if (prefix && !o.key.startsWith(prefix)) return false;
      return true;
    });
  }

  public getObject(bucketName: string, key: string): StorageObject | undefined {
    const cleanKey = key.replace(/^\/+/, '');
    return this.objects.find(o => o.bucketName === bucketName && o.key === cleanKey);
  }

  public async putObject(params: {
    bucketName: string;
    key: string;
    fileOrContent: File | Blob | string;
    contentType?: string;
    customMetadata?: Record<string, string>;
    tags?: Record<string, string>;
    encryption?: 'AES256' | 'aws:kms' | 'none';
    retentionUntil?: string;
    legalHold?: boolean;
    lockMode?: 'COMPLIANCE' | 'GOVERNANCE';
  }): Promise<StorageObject> {
    const bucket = this.getBucket(params.bucketName);
    if (!bucket) throw new Error(`Bucket "${params.bucketName}" não existe.`);

    // Regra WORM: Object Lock e Legal Hold requerem bucket com Object Lock ativo
    if ((params.retentionUntil || params.legalHold) && !bucket.objectLockEnabled) {
      throw new Error('Object Lock não está habilitado neste bucket. Bloqueios WORM exigem que o bucket tenha Object Lock ativado.');
    }

    if (params.retentionUntil && new Date(params.retentionUntil).getTime() <= Date.now()) {
      throw new Error('A data de retenção WORM deve ser uma data futura.');
    }

    let sizeBytes = 0;
    let dataUrl: string | undefined = undefined;
    let calculatedEtag = '';

    if (params.fileOrContent instanceof File) {
      sizeBytes = params.fileOrContent.size;
      dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(params.fileOrContent as File);
      });
      calculatedEtag = `"${Math.random().toString(36).substring(2, 14)}${Date.now().toString(36)}"`;
    } else if (params.fileOrContent instanceof Blob) {
      sizeBytes = params.fileOrContent.size;
      calculatedEtag = `"${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}"`;
    } else {
      sizeBytes = new Blob([params.fileOrContent]).size;
      dataUrl = `data:text/plain;utf8,${encodeURIComponent(params.fileOrContent)}`;
      calculatedEtag = `"${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}"`;
    }

    const cleanKey = params.key.replace(/^\/+/, '');
    if (!cleanKey) throw new Error('A chave do objeto não pode ser vazia');

    const newObjId = `obj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const objShards = this.createErasureShards(newObjId, sizeBytes);

    let retentionDate = params.retentionUntil;
    let lockMode: 'COMPLIANCE' | 'GOVERNANCE' | undefined = params.lockMode || (params.retentionUntil ? 'COMPLIANCE' : undefined);
    if (!retentionDate && bucket.objectLockEnabled && bucket.defaultRetentionDays) {
      retentionDate = new Date(Date.now() + bucket.defaultRetentionDays * 86400000).toISOString();
      lockMode = bucket.defaultRetentionMode || 'COMPLIANCE';
    }

    const newObj: StorageObject = {
      id: newObjId,
      bucketName: params.bucketName,
      key: cleanKey,
      sizeBytes,
      etag: calculatedEtag,
      contentType: params.contentType || (params.fileOrContent instanceof File ? params.fileOrContent.type : 'application/octet-stream') || 'application/octet-stream',
      lastModified: new Date().toISOString(),
      storageClass: 'STANDARD',
      customMetadata: params.customMetadata || {},
      tags: params.tags || {},
      versionId: `v-${Date.now().toString(36)}`,
      isLatest: true,
      replicationStatus: 'replicating',
      dataUrl,
      shards: objShards,
      erasureHealthy: true,
      encryption: params.encryption || bucket.encryption || 'AES256',
      encryptionCipher: (params.encryption !== 'none' && bucket.encryption !== 'none') ? 'AES-256-GCM' : undefined,
      objectLockMode: lockMode,
      retentionUntil: retentionDate,
      legalHold: params.legalHold || false,
    };

    this.objects = this.objects.filter(o => !(o.bucketName === params.bucketName && o.key === cleanKey));
    this.objects.unshift(newObj);

    this.recalculateBucketStats(params.bucketName);
    this.logAccess({
      clientIp: '127.0.0.1',
      method: 'PUT',
      bucket: params.bucketName,
      key: cleanKey,
      httpStatus: 200,
      bytesTransferred: sizeBytes,
      durationMs: 24,
      userAgent: 'VortexS3-Console/1.0',
    });
    this.persist();

    // Notifica replicação multi-nó do cluster em tempo real
    replicationEngine.handleObjectPut(params.bucketName, cleanKey, sizeBytes);

    return newObj;
  }

  public deleteObject(bucketName: string, key: string): void {
    const cleanKey = key.replace(/^\/+/, '');
    const existing = this.objects.find(o => o.bucketName === bucketName && o.key === cleanKey);
    if (!existing) {
      // S3 delete de chave inexistente é idempotente
      return;
    }

    if (existing.legalHold) {
      throw new Error('Objeto com Legal Hold (bloqueio de exclusão WORM ativo). Remova o bloqueio antes de excluir.');
    }
    if (existing.retentionUntil && new Date(existing.retentionUntil) > new Date()) {
      throw new Error(`Objeto bloqueado por política de conformidade até ${new Date(existing.retentionUntil).toLocaleDateString()}.`);
    }

    this.objects = this.objects.filter(o => !(o.bucketName === bucketName && o.key === cleanKey));
    this.recalculateBucketStats(bucketName);
    this.logAccess({
      clientIp: '127.0.0.1',
      method: 'DELETE',
      bucket: bucketName,
      key: cleanKey,
      httpStatus: 204,
      bytesTransferred: 0,
      durationMs: 14,
      userAgent: 'VortexS3-Console/1.0',
    });
    this.persist();

    // Notifica réplicas para propagar a exclusão
    replicationEngine.handleObjectDelete(bucketName, cleanKey);
  }

  // --- RESTAURAÇÃO DE BACKUP (DISASTER RECOVERY) ---
  public restoreState(
    snapshotPayload: {
      buckets?: Array<Partial<Bucket>>;
      objects?: Array<Partial<StorageObject>>;
    },
    options: RestoreOptions
  ): { restoredBucketsCount: number; restoredObjectsCount: number; bytesRestored: number } {
    let restoredBucketsCount = 0;
    let restoredObjectsCount = 0;
    let bytesRestored = 0;

    // 1. Processa Buckets
    if (snapshotPayload.buckets && Array.isArray(snapshotPayload.buckets)) {
      snapshotPayload.buckets.forEach(bData => {
        if (!bData.name) return;
        const targetName = options.targetBucketMode === 'specific_bucket' && options.specificBucketName
          ? options.specificBucketName
          : bData.name;

        if (!this.buckets.some(b => b.name === targetName)) {
          this.buckets.push({
            id: `b-restored-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: targetName,
            createdAt: bData.createdAt || new Date().toISOString(),
            region: bData.region || 'us-east-1',
            versioningEnabled: bData.versioningEnabled ?? true,
            objectCount: 0,
            sizeBytes: 0,
            publicAccess: bData.publicAccess || 'private',
            tags: bData.tags || { restored_from: 'snapshot' },
            lifecycleRulesCount: 0,
            encryption: bData.encryption || 'AES256',
            objectLockEnabled: !!bData.objectLockEnabled,
          });
          restoredBucketsCount++;
        }
      });
    }

    // 2. Processa Objetos
    if (snapshotPayload.objects && Array.isArray(snapshotPayload.objects)) {
      snapshotPayload.objects.forEach(oData => {
        if (!oData.key) return;
        const bucketTarget = options.targetBucketMode === 'specific_bucket' && options.specificBucketName
          ? options.specificBucketName
          : (oData.bucketName || (oData as any).bucket || this.buckets[0]?.name || 'default');

        // Garante que o bucket exista
        if (!this.buckets.some(b => b.name === bucketTarget)) {
          this.buckets.push({
            id: `b-auto-${Date.now()}`,
            name: bucketTarget,
            createdAt: new Date().toISOString(),
            region: 'us-east-1',
            versioningEnabled: true,
            objectCount: 0,
            sizeBytes: 0,
            publicAccess: 'private',
            tags: { source: 'restore' },
            lifecycleRulesCount: 0,
            encryption: 'AES256',
            objectLockEnabled: false,
          });
          restoredBucketsCount++;
        }

        const existingIdx = this.objects.findIndex(o => o.bucketName === bucketTarget && o.key === oData.key);
        if (existingIdx !== -1) {
          if (!options.overwriteExisting) {
            return; // Skip existing
          }
          this.objects.splice(existingIdx, 1);
        }

        const restoredObj: StorageObject = {
          id: `obj-res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          bucketName: bucketTarget,
          key: oData.key,
          sizeBytes: oData.sizeBytes || (oData as any).size || 1024,
          etag: oData.etag || `"${Math.random().toString(36).substring(2, 14)}"`,
          contentType: oData.contentType || 'application/octet-stream',
          lastModified: oData.lastModified || new Date().toISOString(),
          storageClass: oData.storageClass || 'STANDARD',
          customMetadata: oData.customMetadata || (oData as any).metadata || {},
          tags: oData.tags || {},
          versionId: oData.versionId || `v-restore-${Date.now()}`,
          isLatest: true,
          replicationStatus: 'synced',
          dataUrl: oData.dataUrl,
          encryption: oData.encryption || 'AES256',
        };

        this.objects.unshift(restoredObj);
        restoredObjectsCount++;
        bytesRestored += restoredObj.sizeBytes;
      });
    }

    // Recalcula estatísticas de todos os buckets
    this.buckets.forEach(b => this.recalculateBucketStats(b.name));

    this.logAccess({
      clientIp: '127.0.0.1',
      method: 'POST',
      bucket: options.specificBucketName || '*',
      key: 'RESTORE_SNAPSHOT',
      httpStatus: 200,
      bytesTransferred: bytesRestored,
      durationMs: 380,
      userAgent: 'VortexS3-RestoreEngine/1.0',
    });

    this.persist();
    return { restoredBucketsCount, restoredObjectsCount, bytesRestored };
  }

  public updateObjectReplicationStatus(id: string, status: StorageObject['replicationStatus']) {
    const obj = this.objects.find(o => o.id === id);
    if (obj) {
      obj.replicationStatus = status;
      this.persist();
    }
  }

  private recalculateBucketStats(bucketName: string) {
    const bucketObjs = this.objects.filter(o => o.bucketName === bucketName);
    const totalSize = bucketObjs.reduce((acc, cur) => acc + cur.sizeBytes, 0);

    const bucket = this.buckets.find(b => b.name === bucketName);
    if (bucket) {
      bucket.objectCount = bucketObjs.length;
      bucket.sizeBytes = totalSize;
    }
  }

  // --- LIFECYCLE RULES ---
  public getLifecycleRules(bucketName?: string): LifecycleRule[] {
    if (!bucketName) return [...this.lifecycleRules];
    return this.lifecycleRules.filter(r => r.bucketName === bucketName);
  }

  public createLifecycleRule(rule: Omit<LifecycleRule, 'id'>): LifecycleRule {
    const newRule: LifecycleRule = {
      ...rule,
      id: `lc-${Date.now()}`,
    };
    this.lifecycleRules.push(newRule);
    const b = this.buckets.find(b => b.name === rule.bucketName);
    if (b) {
      b.lifecycleRulesCount = this.lifecycleRules.filter(r => r.bucketName === rule.bucketName).length;
    }
    this.persist();
    return newRule;
  }

  public deleteLifecycleRule(id: string): void {
    const rule = this.lifecycleRules.find(r => r.id === id);
    this.lifecycleRules = this.lifecycleRules.filter(r => r.id !== id);
    if (rule) {
      const b = this.buckets.find(b => b.name === rule.bucketName);
      if (b) {
        b.lifecycleRulesCount = this.lifecycleRules.filter(r => r.bucketName === rule.bucketName).length;
      }
    }
    this.persist();
  }

  // --- WEBHOOKS & NOTIFICATIONS ---
  public getWebhooks(bucketName?: string): BucketEventNotification[] {
    if (!bucketName) return [...this.webhooks];
    return this.webhooks.filter(w => w.bucketName === bucketName);
  }

  public createWebhook(wh: Omit<BucketEventNotification, 'id' | 'createdAt' | 'status'>): BucketEventNotification {
    const newWh: BucketEventNotification = {
      ...wh,
      id: `wh-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    this.webhooks.push(newWh);
    this.persist();
    return newWh;
  }

  public deleteWebhook(id: string): void {
    this.webhooks = this.webhooks.filter(w => w.id !== id);
    this.persist();
  }

  // --- PRESIGNED URLS ---
  public generatePresignedUrl(
    bucketName: string,
    key: string,
    expiresInSeconds: number | string = 3600,
    method: 'GET' | 'PUT' = 'GET'
  ): {
    url: string;
    expiresAt: string;
    curlSnippet: string;
  } {
    const duration = typeof expiresInSeconds === 'number' && !isNaN(expiresInSeconds) && expiresInSeconds > 0
      ? expiresInSeconds
      : 3600;
    const token = `v4sig-${Math.random().toString(36).substring(2, 16)}${Date.now().toString(36)}`;
    const expiresAt = new Date(Date.now() + duration * 1000).toISOString();
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:3000';
    const url = `${origin}/s3/${bucketName}/${encodeURIComponent(key)}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=${duration}&X-Amz-Signature=${token}`;
    const curlSnippet = `curl -X ${method} "${url}"`;

    this.logAccess({
      clientIp: '127.0.0.1',
      method,
      bucket: bucketName,
      key,
      httpStatus: 200,
      bytesTransferred: 0,
      durationMs: 6,
      userAgent: 'VortexS3-Presign/1.0',
    });

    return { url, expiresAt, curlSnippet };
  }

  // --- IAM ACCESS KEYS ---
  public getAccessKeys(): IAMAccessKey[] {
    return [...this.iamKeys];
  }

  public createAccessKey(params: {
    name: string;
    permissions: IAMAccessKey['permissions'];
    allowedBuckets: string[];
  }): IAMAccessKey {
    const keyId = `VXAKIA${Math.random().toString(36).substring(2, 8).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
    const secret = `vxs_${Math.random().toString(36).substring(2, 12)}${Math.random().toString(36).substring(2, 12)}${Math.random().toString(36).substring(2, 12)}`;

    const newKey: IAMAccessKey = {
      id: `iam-${Date.now()}`,
      accessKeyId: keyId,
      secretAccessKey: secret,
      name: params.name || 'Nova Chave de Acesso',
      createdAt: new Date().toISOString(),
      permissions: params.permissions,
      allowedBuckets: params.allowedBuckets.length ? params.allowedBuckets : ['*'],
      status: 'active',
    };

    this.iamKeys.push(newKey);
    this.persist();
    return newKey;
  }

  public deleteAccessKey(id: string): void {
    this.iamKeys = this.iamKeys.filter(k => k.id !== id);
    this.persist();
  }

  public toggleAccessKeyStatus(id: string): void {
    const k = this.iamKeys.find(key => key.id === id);
    if (k) {
      k.status = k.status === 'active' ? 'inactive' : 'active';
      this.persist();
    }
  }

  // --- OBJECT LOCK & WORM ---
  public toggleLegalHold(bucketName: string, key: string): boolean {
    const obj = this.objects.find(o => o.bucketName === bucketName && o.key === key);
    if (!obj) throw new Error('Objeto não encontrado');
    obj.legalHold = !obj.legalHold;
    this.persist();
    return obj.legalHold;
  }

  public setObjectRetention(bucketName: string, key: string, days: number, mode: 'GOVERNANCE' | 'COMPLIANCE' = 'COMPLIANCE'): void {
    const obj = this.objects.find(o => o.bucketName === bucketName && o.key === key);
    if (!obj) throw new Error('Objeto não encontrado');
    obj.retentionUntil = new Date(Date.now() + days * 86400000).toISOString();
    obj.objectLockMode = mode;
    this.persist();
  }

  // --- ERASURE CODING & BITROT SCRUBBER ---
  private totalCorruptedDetected = 0;
  private totalHealedCount = 0;
  private lastScrubTime: string = new Date().toISOString();

  public getObjectShards(objectIdOrKey: string): ObjectShard[] | undefined {
    const obj = this.objects.find(o => o.id === objectIdOrKey || o.key === objectIdOrKey);
    return obj?.shards;
  }

  public simulateShardBitrot(objectIdOrKey: string, count: number): number {
    const obj = this.objects.find(o => o.id === objectIdOrKey || o.key === objectIdOrKey);
    if (!obj || !obj.shards) return 0;

    let corrupted = 0;
    for (let i = 0; i < Math.min(count, obj.shards.length); i++) {
      obj.shards[i].status = 'corrupted';
      corrupted++;
    }
    obj.erasureHealthy = false;
    this.totalCorruptedDetected += corrupted;
    this.persist();
    return corrupted;
  }

  public corruptRandomShard(): { objectKey: string; shardIndex: number; shardType: string } | null {
    if (this.objects.length === 0) return null;
    const randomObj = this.objects[Math.floor(Math.random() * this.objects.length)];
    if (!randomObj.shards || randomObj.shards.length === 0) return null;

    const healthyShards = randomObj.shards.filter(s => s.status !== 'corrupted');
    if (healthyShards.length === 0) return null;

    const targetShard = healthyShards[Math.floor(Math.random() * healthyShards.length)];
    targetShard.status = 'corrupted';
    randomObj.erasureHealthy = false;
    this.totalCorruptedDetected += 1;
    this.persist();

    return {
      objectKey: randomObj.key,
      shardIndex: targetShard.shardIndex,
      shardType: targetShard.type,
    };
  }

  public async runBitrotScrub(): Promise<ScrubReport> {
    const startTime = Date.now();
    let scannedObjects = 0;
    let corruptedShards = 0;
    let healedShards = 0;
    let unrecoverableObjects = 0;

    for (const obj of this.objects) {
      scannedObjects++;
      if (!obj.shards) continue;

      const damagedShards = obj.shards.filter(s => s.status === 'corrupted' || s.status === 'missing');
      if (damagedShards.length === 0) continue;

      corruptedShards += damagedShards.length;

      // Reed-Solomon (4+2) scheme: K=2 parity shards can recover <= 2 damaged shards.
      // If damaged shards > 2, data is MATHEMATICALLY UNRECOVERABLE without replica!
      const maxTolerableDamaged = 2;
      if (damagedShards.length <= maxTolerableDamaged) {
        for (const shard of damagedShards) {
          shard.status = 'healed';
          shard.checksum = `hw64_${obj.id}_repaired_${shard.shardIndex}`;
          healedShards++;
          this.totalHealedCount++;
        }
        obj.erasureHealthy = true;
      } else {
        // UNRECOVERABLE: Shard loss exceeded parity budget
        unrecoverableObjects++;
        obj.erasureHealthy = false;
      }
    }

    this.lastScrubTime = new Date().toISOString();
    this.persist();

    return {
      id: `scrub-${Date.now()}`,
      timestamp: this.lastScrubTime,
      scannedObjects,
      corruptedShards,
      healedShards,
      unrecoverableObjects,
      durationMs: Date.now() - startTime + 85,
      status: 'completed',
    };
  }

  // --- PROMETHEUS METRICS (/metrics) ---
  public getPrometheusMetricsText(): string {
    const totalObjects = this.objects.length;
    const totalSizeBytes = this.objects.reduce((acc, o) => acc + o.sizeBytes, 0);
    const bucketsCount = this.buckets.length;
    const corrupted = this.objects.flatMap(o => o.shards || []).filter(s => s.status === 'corrupted').length;

    return `# HELP vortexs3_uptime_seconds Total seconds the storage engine has been running.
# TYPE vortexs3_uptime_seconds gauge
vortexs3_uptime_seconds 864200

# HELP vortexs3_cluster_nodes_online Number of active cluster nodes.
# TYPE vortexs3_cluster_nodes_online gauge
vortexs3_cluster_nodes_online 3

# HELP vortexs3_cluster_nodes_total Total cluster nodes configured.
# TYPE vortexs3_cluster_nodes_total gauge
vortexs3_cluster_nodes_total 3

# HELP vortexs3_buckets_total Total buckets in cluster.
# TYPE vortexs3_buckets_total gauge
vortexs3_buckets_total ${bucketsCount}

# HELP vortexs3_objects_total Total objects stored.
# TYPE vortexs3_objects_total gauge
vortexs3_objects_total ${totalObjects}

# HELP vortexs3_storage_used_bytes Total storage consumed across all buckets.
# TYPE vortexs3_storage_used_bytes gauge
vortexs3_storage_used_bytes ${totalSizeBytes}

# HELP vortexs3_erasure_data_shards Data shards per object in Reed-Solomon scheme.
# TYPE vortexs3_erasure_data_shards gauge
vortexs3_erasure_data_shards 4

# HELP vortexs3_erasure_parity_shards Parity shards per object in Reed-Solomon scheme.
# TYPE vortexs3_erasure_parity_shards gauge
vortexs3_erasure_parity_shards 2

# HELP vortexs3_erasure_corrupted_shards_current Current corrupted shards awaiting heal.
# TYPE vortexs3_erasure_corrupted_shards_current gauge
vortexs3_erasure_corrupted_shards_current ${corrupted}

# HELP vortexs3_erasure_healed_shards_total Cumulative shards healed by Reed-Solomon scrubber.
# TYPE vortexs3_erasure_healed_shards_total counter
vortexs3_erasure_healed_shards_total ${this.totalHealedCount}

# HELP vortexs3_requests_total Total S3 REST requests processed.
# TYPE vortexs3_requests_total counter
vortexs3_requests_total{method="GET",code="200"} 41280
vortexs3_requests_total{method="PUT",code="200"} 8420
vortexs3_requests_total{method="HEAD",code="200"} 12500
vortexs3_requests_total{method="DELETE",code="204"} 128
vortexs3_requests_total{method="GET",code="404"} 14

# HELP vortexs3_request_duration_seconds S3 API request latency.
# TYPE vortexs3_request_duration_seconds histogram
vortexs3_request_duration_seconds_bucket{le="0.005"} 31400
vortexs3_request_duration_seconds_bucket{le="0.010"} 48200
vortexs3_request_duration_seconds_bucket{le="0.025"} 61900
vortexs3_request_duration_seconds_bucket{le="0.050"} 62300
vortexs3_request_duration_seconds_bucket{le="+Inf"} 62328
vortexs3_request_duration_seconds_sum 398.2
vortexs3_request_duration_seconds_count 62328
`;
  }

  // --- KUBERNETES PROBES ---
  public getK8sHealthStatus(): {
    liveness: 'healthy' | 'unhealthy';
    readiness: 'ready' | 'not_ready';
    details: { clusterQuorum: boolean; activeNodes: number; diskSpaceOk: boolean };
  } {
    return {
      liveness: 'healthy',
      readiness: 'ready',
      details: {
        clusterQuorum: true,
        activeNodes: 3,
        diskSpaceOk: true,
      },
    };
  }

  // --- METRICS ---
  public getMetrics(): ClusterMetrics {
    const totalObjects = this.objects.length;
    const totalSizeBytes = this.objects.reduce((acc, o) => acc + o.sizeBytes, 0);
    const totalBuckets = this.buckets.length;
    const corruptedShards = this.objects.flatMap(o => o.shards || []).filter(s => s.status === 'corrupted').length;

    return {
      totalObjects,
      totalSizeBytes,
      totalBuckets,
      activeNodesCount: 3,
      clusterHealth: corruptedShards > 0 ? 'degraded' : 'healthy',
      writeOpsPerSec: 42.5,
      readOpsPerSec: 184.2,
      replicationLagMs: 14,
      uptimeSeconds: 864200,
      erasureDataShards: 4,
      erasureParityShards: 2,
      corruptedShardsCount: corruptedShards,
      healedShardsCount: this.totalHealedCount,
      lastScrubTimestamp: this.lastScrubTime,
      k8sLivenessHealthy: true,
      k8sReadinessReady: true,
    };
  }
}

export const storageEngine = new StorageEngine();
