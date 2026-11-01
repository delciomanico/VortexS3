import { BackupJob, BackupArchive, RestoreOptions } from '../types/storage';
import { storageEngine } from './storageEngine';
import { replicationEngine } from './replicationEngine';

const BACKUP_STORAGE_KEYS = {
  JOBS: 'vortexs3_backup_jobs_v1',
  ARCHIVES: 'vortexs3_backup_archives_v1',
};

const INITIAL_JOBS: BackupJob[] = [
  {
    id: 'job-1',
    name: 'Snapshot Diário Geral de Todos os Buckets',
    type: 'full_snapshot',
    targetBuckets: ['*'],
    scheduleCron: '0 3 * * *',
    retentionDays: 30,
    lastRunTime: '2026-10-29T03:00:00Z',
    nextRunTime: '2026-10-30T03:00:00Z',
    status: 'idle',
    autoExportRemote: true,
    compression: 'zstd',
  },
  {
    id: 'job-2',
    name: 'Backup Contínuo do Bucket de Produção',
    type: 'incremental_diff',
    targetBuckets: ['production-media'],
    scheduleCron: '*/30 * * * *',
    retentionDays: 7,
    lastRunTime: '2026-10-29T16:30:00Z',
    nextRunTime: '2026-10-29T17:00:00Z',
    status: 'idle',
    autoExportRemote: false,
    compression: 'gzip',
  },
];

const INITIAL_ARCHIVES: BackupArchive[] = [
  {
    id: 'arc-20261029-0300',
    jobId: 'job-1',
    jobName: 'Snapshot Diário Geral de Todos os Buckets',
    timestamp: '2026-10-29T03:00:00Z',
    sizeBytes: 258350000,
    objectCount: 9,
    checksum: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    archiveType: 'full_snapshot (zstd)',
    status: 'verified',
    bucketsList: ['production-media', 'database-backups', 'docker-artifacts'],
  },
  {
    id: 'arc-20261028-0300',
    jobId: 'job-1',
    jobName: 'Snapshot Diário Geral de Todos os Buckets',
    timestamp: '2026-10-28T03:00:00Z',
    sizeBytes: 215400000,
    objectCount: 8,
    checksum: 'sha256:8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    archiveType: 'full_snapshot (zstd)',
    status: 'verified',
    bucketsList: ['production-media', 'database-backups'],
  },
];

class BackupEngine {
  private jobs: BackupJob[] = [];
  private archives: BackupArchive[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const storedJobs = localStorage.getItem(BACKUP_STORAGE_KEYS.JOBS);
      const storedArchives = localStorage.getItem(BACKUP_STORAGE_KEYS.ARCHIVES);
      this.jobs = storedJobs ? JSON.parse(storedJobs) : INITIAL_JOBS;
      this.archives = storedArchives ? JSON.parse(storedArchives) : INITIAL_ARCHIVES;
    } catch {
      this.jobs = INITIAL_JOBS;
      this.archives = INITIAL_ARCHIVES;
    }
  }

  private persist() {
    try {
      localStorage.setItem(BACKUP_STORAGE_KEYS.JOBS, JSON.stringify(this.jobs));
      localStorage.setItem(BACKUP_STORAGE_KEYS.ARCHIVES, JSON.stringify(this.archives));
    } catch (e) {
      console.warn('Could not persist backup state', e);
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

  public getJobs(): BackupJob[] {
    return [...this.jobs];
  }

  public getArchives(): BackupArchive[] {
    return [...this.archives];
  }

  public createJob(params: Omit<BackupJob, 'id' | 'lastRunTime' | 'nextRunTime' | 'status'>): BackupJob {
    const newJob: BackupJob = {
      ...params,
      id: `job-${Date.now()}`,
      status: 'idle',
      nextRunTime: new Date(Date.now() + 3600000 * 24).toISOString(),
    };
    this.jobs.push(newJob);
    this.persist();
    return newJob;
  }

  public deleteJob(id: string): void {
    this.jobs = this.jobs.filter(j => j.id !== id);
    this.persist();
  }

  public async executeBackupNow(jobId?: string): Promise<BackupArchive> {
    const job = this.jobs.find(j => j.id === jobId) || this.jobs[0];
    if (job) {
      job.status = 'running';
      this.persist();
    }

    const allBuckets = storageEngine.getBuckets();
    const relevantBuckets = job && !job.targetBuckets.includes('*')
      ? allBuckets.filter(b => job.targetBuckets.includes(b.name))
      : allBuckets;

    const allObjects = relevantBuckets.flatMap(b => storageEngine.getObjects(b.name));
    const totalBytes = allObjects.reduce((acc, o) => acc + o.sizeBytes, 0);

    await new Promise(r => setTimeout(r, 1200));

    const snapshotPayload = {
      vortexs3_version: '1.0.0',
      created_at: new Date().toISOString(),
      buckets: relevantBuckets,
      objects: allObjects.map(o => ({
        bucket: o.bucketName,
        key: o.key,
        size: o.sizeBytes,
        etag: o.etag,
        contentType: o.contentType,
        metadata: o.customMetadata,
        dataUrl: o.dataUrl,
        encryption: o.encryption,
      })),
    };

    const payloadStr = JSON.stringify(snapshotPayload, null, 2);
    const checksum = `sha256:${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    const newArchive: BackupArchive = {
      id: `arc-${Date.now()}`,
      jobId: job ? job.id : 'manual',
      jobName: job ? job.name : 'Snapshot Manual Imediato',
      timestamp: new Date().toISOString(),
      sizeBytes: Math.max(totalBytes, 24500),
      objectCount: allObjects.length,
      checksum,
      archiveType: job ? `${job.type} (${job.compression})` : 'full_snapshot (gzip)',
      downloadData: `data:application/json;charset=utf-8,${encodeURIComponent(payloadStr)}`,
      status: 'verified',
      bucketsList: relevantBuckets.map(b => b.name),
    };

    this.archives.unshift(newArchive);
    if (job) {
      job.status = 'idle';
      job.lastRunTime = newArchive.timestamp;
    }
    this.persist();
    return newArchive;
  }

  public deleteArchive(id: string): void {
    this.archives = this.archives.filter(a => a.id !== id);
    this.persist();
  }

  public downloadArchiveFile(archive: BackupArchive): void {
    if (!archive.downloadData) {
      const synthetic = {
        vortexs3_version: '1.0.0',
        created_at: archive.timestamp,
        checksum: archive.checksum,
        buckets: (archive.bucketsList || ['production-media', 'database-backups']).map(b => ({
          name: b,
          region: 'us-east-1',
          versioningEnabled: true,
        })),
        objects: storageEngine.getObjects('production-media').map(o => ({
          bucket: o.bucketName,
          key: o.key,
          size: o.sizeBytes,
          etag: o.etag,
          contentType: o.contentType,
        })),
      };
      const blob = new Blob([JSON.stringify(synthetic, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vortexs3-backup-${archive.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const a = document.createElement('a');
    a.href = archive.downloadData;
    a.download = `vortexs3-backup-${archive.id}.json`;
    a.click();
  }

  // --- RESTAURAÇÃO DE BACKUP (DISASTER RECOVERY) ---
  public async restoreFromArchive(
    archive: BackupArchive,
    options: RestoreOptions
  ): Promise<{ restoredBucketsCount: number; restoredObjectsCount: number; bytesRestored: number }> {
    let payloadData: any;

    if (archive.downloadData && archive.downloadData.startsWith('data:application/json')) {
      const rawJson = decodeURIComponent(archive.downloadData.split(',')[1]);
      payloadData = JSON.parse(rawJson);
    } else {
      // Reconstitui dados simulados a partir dos buckets gravados
      payloadData = {
        buckets: (archive.bucketsList || ['production-media', 'database-backups']).map(b => ({
          name: b,
          region: 'us-east-1',
          versioningEnabled: true,
          publicAccess: 'private',
        })),
        objects: [
          {
            bucketName: 'production-media',
            key: 'branding/logo-vortexs3.svg',
            sizeBytes: 24500,
            etag: '"9f840814fd16478e88b5462cf734a799"',
            contentType: 'image/svg+xml',
            lastModified: archive.timestamp,
          },
          {
            bucketName: 'database-backups',
            key: 'postgres-restored-point-in-time.sql.gz',
            sizeBytes: 112500000,
            etag: '"a1b2c3d4e5f60718293a4b5c6d7e8f90"',
            contentType: 'application/gzip',
            lastModified: archive.timestamp,
          },
        ],
      };
    }

    // Simula tempo de descompressão e verificação de integridade
    await new Promise(r => setTimeout(r, 1400));

    const result = storageEngine.restoreState(payloadData, options);

    // Notifica motor de replicação para sincronizar os dados restaurados com nós réplicas
    replicationEngine.triggerManualSyncAll();

    return result;
  }

  public async restoreFromFile(
    file: File,
    options: RestoreOptions
  ): Promise<{ restoredBucketsCount: number; restoredObjectsCount: number; bytesRestored: number }> {
    const text = await file.text();
    let payloadData: any;

    try {
      payloadData = JSON.parse(text);
    } catch {
      throw new Error('Arquivo de snapshot inválido. Certifique-se de que é um backup válido gerado pelo VortexS3.');
    }

    if (!payloadData.buckets && !payloadData.objects) {
      throw new Error('O arquivo selecionado não contém estrutura reconhecível de buckets ou objetos VortexS3.');
    }

    await new Promise(r => setTimeout(r, 1500));

    const result = storageEngine.restoreState(payloadData, options);
    replicationEngine.triggerManualSyncAll();
    return result;
  }

  public async inspectSnapshotFile(file: File): Promise<{
    version: string;
    createdAt: string;
    bucketsCount: number;
    objectsCount: number;
    totalSizeBytes: number;
    bucketsNames: string[];
  }> {
    const text = await file.text();
    const data = JSON.parse(text);

    const buckets = data.buckets || [];
    const objects = data.objects || [];
    const totalSizeBytes = objects.reduce((acc: number, o: any) => acc + (o.size || o.sizeBytes || 0), 0);

    return {
      version: data.vortexs3_version || '1.0.0',
      createdAt: data.created_at || new Date().toISOString(),
      bucketsCount: buckets.length,
      objectsCount: objects.length,
      totalSizeBytes,
      bucketsNames: buckets.map((b: any) => b.name || 'unnamed'),
    };
  }

  public async verifyArchive(archiveId: string): Promise<{ valid: boolean; errors: string[] }> {
    const archive = this.archives.find(a => a.id === archiveId);
    if (!archive) {
      return { valid: false, errors: ['Archive not found'] };
    }
    const errors: string[] = [];
    if (!archive.checksum || !archive.checksum.startsWith('sha256:')) {
      errors.push('Invalid checksum format (must be SHA-256)');
    }
    if (archive.sizeBytes < 0) {
      errors.push('Corrupted archive size header');
    }
    if (archive.status === 'corrupted') {
      errors.push('Archive is marked as corrupted');
    }
    return { valid: errors.length === 0, errors };
  }
}

export const backupEngine = new BackupEngine();
