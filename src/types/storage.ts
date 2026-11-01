export type NodeRole = 'leader' | 'follower' | 'observer';
export type NodeStatus = 'online' | 'syncing' | 'offline';
export type ReplicationStatus = 'synced' | 'pending' | 'replicating' | 'failed';

export interface ObjectShard {
  shardIndex: number;
  nodeId: string;
  nodeName: string;
  type: 'data' | 'parity';
  status: 'healthy' | 'corrupted' | 'healed' | 'missing';
  checksum: string;
  sizeBytes: number;
}

export interface ErasureConfig {
  dataShards: number; // e.g. 4
  parityShards: number; // e.g. 2
  algorithm: string; // 'Reed-Solomon-AVX512'
  parityRatio: string; // '4+2 (tolera perda de 2 nós)'
}

export interface StorageObject {
  id: string;
  bucketName: string;
  key: string;
  sizeBytes: number;
  etag: string;
  contentType: string;
  lastModified: string;
  storageClass: 'STANDARD' | 'INTELLIGENT_TIERING' | 'GLACIER';
  customMetadata: Record<string, string>;
  tags: Record<string, string>;
  versionId: string;
  isLatest: boolean;
  replicationStatus: ReplicationStatus;
  dataUrl?: string; // For previews & browser downloads

  // Erasure Coding Shards
  shards?: ObjectShard[];
  erasureHealthy?: boolean;

  // Step 3: Criptografia SSE & Object Lock
  encryption?: 'AES256' | 'aws:kms' | 'none';
  encryptionCipher?: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  objectLockMode?: 'GOVERNANCE' | 'COMPLIANCE';
  retentionUntil?: string; // ISO Date
  legalHold?: boolean;
}

export interface ScrubReport {
  id: string;
  timestamp: string;
  scannedObjects: number;
  corruptedShards: number;
  healedShards: number;
  unrecoverableObjects?: number;
  durationMs: number;
  status: 'completed' | 'in_progress';
}

export interface LifecycleRule {
  id: string;
  bucketName: string;
  prefix: string;
  status: 'Enabled' | 'Disabled';
  expirationDays: number;
  transitionDays?: number;
  transitionStorageClass?: 'GLACIER' | 'INTELLIGENT_TIERING';
  abortIncompleteMultipartDays?: number;
}

export interface BucketEventNotification {
  id: string;
  bucketName: string;
  endpointUrl: string;
  events: ('s3:ObjectCreated:*' | 's3:ObjectRemoved:*' | 's3:ObjectRestore:*')[];
  prefixFilter?: string;
  suffixFilter?: string;
  createdAt: string;
  status: 'active' | 'failing';
  lastDeliveredAt?: string;
}

export interface Bucket {
  id: string;
  name: string;
  createdAt: string;
  region: string;
  versioningEnabled: boolean;
  objectCount: number;
  sizeBytes: number;
  publicAccess: 'private' | 'public-read' | 'public-read-write';
  tags: Record<string, string>;
  lifecycleRulesCount: number;

  // Step 3: Criptografia Padrão & Object Lock
  encryption: 'AES256' | 'none';
  encryptionCipher?: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  objectLockEnabled: boolean;
  defaultRetentionDays?: number;
  defaultRetentionMode?: 'GOVERNANCE' | 'COMPLIANCE';
}

export interface ClusterNode {
  id: string;
  name: string;
  endpoint: string;
  role: NodeRole;
  status: NodeStatus;
  latencyMs: number;
  diskTotalBytes: number;
  diskUsedBytes: number;
  replicatedObjectsCount: number;
  lastHeartbeat: string;
  replicationQueueLength: number;
  ipAddress: string;

  // Remote server connection details
  serverLocation?: string; // e.g. "Datacenter SP-01", "AWS eu-central-1", "On-Premise Baremetal"
  region?: string;
  tlsEnabled?: boolean;
  joinToken?: string;

  // Erasure Shard Distribution
  storedShardsCount?: number;
  corruptedShardsDetected?: number;
}

export interface ReplicationEvent {
  id: string;
  timestamp: string;
  action: 'PUT' | 'DELETE' | 'SYNC_CATCHUP' | 'ERASURE_HEAL' | 'BITROT_DETECT' | 'NODE_JOIN' | 'NODE_DRAIN' | 'NODE_REMOVE';
  bucket: string;
  objectKey: string;
  sourceNodeId: string;
  targetNodeId: string;
  status: 'success' | 'in_progress' | 'failed';
  durationMs: number;
  bytes: number;
}

export interface BackupJob {
  id: string;
  name: string;
  type: 'full_snapshot' | 'incremental_diff' | 'metadata_only';
  targetBuckets: string[]; // ['*'] for all
  scheduleCron: string;
  retentionDays: number;
  lastRunTime?: string;
  nextRunTime: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  autoExportRemote: boolean;
  compression: 'gzip' | 'zstd';
}

export interface BackupArchive {
  id: string;
  jobId: string;
  jobName: string;
  timestamp: string;
  sizeBytes: number;
  objectCount: number;
  checksum: string;
  archiveType: string;
  downloadData?: string;
  status: 'verified' | 'corrupted';
  bucketsList?: string[];
}

export interface RestoreOptions {
  targetBucketMode: 'original' | 'specific_bucket';
  specificBucketName?: string;
  overwriteExisting: boolean;
  validateChecksum: boolean;
}

export interface IAMAccessKey {
  id: string;
  accessKeyId: string;
  secretAccessKey: string;
  name: string;
  createdAt: string;
  permissions: 'admin' | 'read-write' | 'read-only';
  allowedBuckets: string[]; // empty or ['*'] means all
  status: 'active' | 'inactive';
  lastUsedAt?: string;
}

export interface AccessLogEntry {
  id: string;
  timestamp: string;
  clientIp: string;
  method: 'GET' | 'PUT' | 'DELETE' | 'HEAD' | 'POST';
  bucket: string;
  key: string;
  httpStatus: number;
  bytesTransferred: number;
  durationMs: number;
  userAgent: string;
}

export interface ClusterMetrics {
  totalObjects: number;
  totalSizeBytes: number;
  totalBuckets: number;
  activeNodesCount: number;
  clusterHealth: 'healthy' | 'degraded' | 'critical';
  writeOpsPerSec: number;
  readOpsPerSec: number;
  replicationLagMs: number;
  uptimeSeconds: number;

  // Step 1: Erasure & Bitrot Metrics
  erasureDataShards: number;
  erasureParityShards: number;
  corruptedShardsCount: number;
  healedShardsCount: number;
  lastScrubTimestamp?: string;

  // Step 2: Prometheus / K8s probes
  k8sLivenessHealthy: boolean;
  k8sReadinessReady: boolean;
}
