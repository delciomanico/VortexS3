import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthScreen } from './components/AuthScreen';
import { ActiveTab } from './components/Navbar';

import { DashboardOverview } from './components/DashboardOverview';
import { BucketExplorer } from './components/BucketExplorer';
import { ReplicationCluster } from './components/ReplicationCluster';
import { BackupManager } from './components/BackupManager';
import { AccessKeysManager } from './components/AccessKeysManager';
import { AccessLogsView } from './components/AccessLogsView';
import { DockerHubExporter } from './components/DockerHubExporter';
import { PrometheusMetricsView } from './components/PrometheusMetricsView';
import { SystemDocsView } from './components/SystemDocsView';

import { CreateBucketModal } from './components/modals/CreateBucketModal';
import { UploadObjectModal } from './components/modals/UploadObjectModal';
import { PresignedUrlModal } from './components/modals/PresignedUrlModal';
import { ObjectDetailModal } from './components/modals/ObjectDetailModal';
import { CreateAccessKeyModal } from './components/modals/CreateAccessKeyModal';
import { CreateBackupPolicyModal } from './components/modals/CreateBackupPolicyModal';
import { RestoreBackupModal } from './components/modals/RestoreBackupModal';
import { LifecycleRuleModal } from './components/modals/LifecycleRuleModal';
import { WebhookNotificationModal } from './components/modals/WebhookNotificationModal';

import { storageEngine } from './services/storageEngine';
import { replicationEngine } from './services/replicationEngine';
import { backupEngine } from './services/backupEngine';
import { authService, AdminUser } from './services/authService';

import {
  Bucket,
  StorageObject,
  ClusterNode,
  ReplicationEvent,
  BackupJob,
  BackupArchive,
  IAMAccessKey,
  ClusterMetrics,
  AccessLogEntry,
} from './types/storage';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(authService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [objects, setObjects] = useState<StorageObject[]>([]);
  const [nodes, setNodes] = useState<ClusterNode[]>([]);
  const [replEvents, setReplEvents] = useState<ReplicationEvent[]>([]);
  const [backupJobs, setBackupJobs] = useState<BackupJob[]>([]);
  const [backupArchives, setBackupArchives] = useState<BackupArchive[]>([]);
  const [iamKeys, setIamKeys] = useState<IAMAccessKey[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);
  const [metrics, setMetrics] = useState<ClusterMetrics>(storageEngine.getMetrics());

  const [selectedBucketName, setSelectedBucketName] = useState<string>('');

  // Modals state
  const [isCreateBucketOpen, setIsCreateBucketOpen] = useState(false);
  const [isUploadObjectOpen, setIsUploadObjectOpen] = useState(false);
  const [targetUploadBucket, setTargetUploadBucket] = useState('');
  const [isPresignedOpen, setIsPresignedOpen] = useState(false);
  const [presignedTargetObj, setPresignedTargetObj] = useState<StorageObject | null>(null);
  const [isObjectDetailOpen, setIsObjectDetailOpen] = useState(false);
  const [detailTargetObj, setDetailTargetObj] = useState<StorageObject | null>(null);
  const [isCreateKeyOpen, setIsCreateKeyOpen] = useState(false);
  const [isCreatePolicyOpen, setIsCreatePolicyOpen] = useState(false);

  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreTargetArchive, setRestoreTargetArchive] = useState<BackupArchive | null>(null);
  const [isLifecycleModalOpen, setIsLifecycleModalOpen] = useState(false);
  const [lifecycleTargetBucket, setLifecycleTargetBucket] = useState('');
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [webhookTargetBucket, setWebhookTargetBucket] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const refreshAll = () => {
    const b = storageEngine.getBuckets();
    setBuckets(b);
    if (!selectedBucketName && b.length > 0) {
      setSelectedBucketName(b[0].name);
    }
    const allObjs = b.flatMap(bucket => storageEngine.getObjects(bucket.name));
    setObjects(allObjs);
    setIamKeys(storageEngine.getAccessKeys());
    setAccessLogs(storageEngine.getAccessLogs());
    setMetrics(storageEngine.getMetrics());

    setNodes(replicationEngine.getNodes());
    setReplEvents(replicationEngine.getEvents());

    setBackupJobs(backupEngine.getJobs());
    setBackupArchives(backupEngine.getArchives());
  };

  useEffect(() => {
    refreshAll();
    const unsubAuth = authService.subscribe(() => {
      setCurrentUser(authService.getCurrentUser());
    });
    const unsubStorage = storageEngine.subscribe(refreshAll);
    const unsubReplication = replicationEngine.subscribe(refreshAll);
    const unsubBackup = backupEngine.subscribe(refreshAll);

    return () => {
      unsubAuth();
      unsubStorage();
      unsubReplication();
      unsubBackup();
    };
  }, [selectedBucketName]);

  const handleOpenUpload = (bucketName: string) => {
    setTargetUploadBucket(bucketName);
    setIsUploadObjectOpen(true);
  };

  const handleOpenPresigned = (obj: StorageObject) => {
    setPresignedTargetObj(obj);
    setIsPresignedOpen(true);
  };

  const handleOpenDetail = (obj: StorageObject) => {
    setDetailTargetObj(obj);
    setIsObjectDetailOpen(true);
  };

  const handleOpenRestore = (archive: BackupArchive | null) => {
    setRestoreTargetArchive(archive);
    setIsRestoreModalOpen(true);
  };

  const handleOpenLifecycle = (bucketName: string) => {
    setLifecycleTargetBucket(bucketName);
    setIsLifecycleModalOpen(true);
  };

  const handleOpenWebhook = (bucketName: string) => {
    setWebhookTargetBucket(bucketName);
    setIsWebhookModalOpen(true);
  };

  const handleDeleteBucket = (name: string) => {
    storageEngine.deleteBucket(name);
    const remaining = storageEngine.getBuckets();
    if (remaining.length > 0) {
      setSelectedBucketName(remaining[0].name);
    } else {
      setSelectedBucketName('');
    }
    refreshAll();
    showToast(`Bucket "${name}" excluído.`);
  };

  const handleRestoreCompleted = (summary: { restoredBucketsCount: number; restoredObjectsCount: number; bytesRestored: number }) => {
    refreshAll();
    showToast(`Restauração concluída! ${summary.restoredObjectsCount} objetos e ${summary.restoredBucketsCount} buckets recuperados.`);
  };

  // If not logged in, render AuthScreen (Login/Signup)
  if (!currentUser) {
    return <AuthScreen onSuccess={(user) => { setCurrentUser(user); refreshAll(); }} />;
  }

  return (
    <div className="flex h-screen bg-[#121212] text-zinc-100 overflow-hidden font-sans">
      {/* Supabase style Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentUser={currentUser}
        onLogout={() => {
          authService.logout();
          setCurrentUser(null);
        }}
        clusterHealth={metrics.clusterHealth}
        bucketsCount={buckets.length}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Supabase style Minimal Header */}
        <Header
          activeTab={activeTab}
          onCreateBucketClick={() => setIsCreateBucketOpen(true)}
          selectedBucketName={selectedBucketName}
        />

        {/* Content Viewport */}
        <main className="flex-1 p-6 overflow-y-auto bg-[#171717]">
          {activeTab === 'overview' && (
            <DashboardOverview
              metrics={metrics}
              buckets={buckets}
              objects={objects}
              nodes={nodes}
              onNavigate={setActiveTab}
              onCreateBucket={() => setIsCreateBucketOpen(true)}
              onTriggerBackup={() => backupEngine.executeBackupNow()}
            />
          )}

          {activeTab === 'buckets' && (
            <BucketExplorer
              buckets={buckets}
              objects={objects}
              selectedBucketName={selectedBucketName}
              onSelectBucket={setSelectedBucketName}
              onOpenUploadModal={handleOpenUpload}
              onOpenCreateBucketModal={() => setIsCreateBucketOpen(true)}
              onOpenPresignedModal={handleOpenPresigned}
              onOpenObjectDetailModal={handleOpenDetail}
              onOpenLifecycleModal={handleOpenLifecycle}
              onOpenWebhookModal={handleOpenWebhook}
              onDeleteBucket={handleDeleteBucket}
            />
          )}

          {activeTab === 'replication' && (
            <ReplicationCluster
              nodes={nodes}
              events={replEvents}
            />
          )}

          {activeTab === 'backups' && (
            <BackupManager
              jobs={backupJobs}
              archives={backupArchives}
              buckets={buckets}
              onOpenCreatePolicyModal={() => setIsCreatePolicyOpen(true)}
              onOpenRestoreModal={handleOpenRestore}
            />
          )}

          {activeTab === 'logs' && (
            <AccessLogsView
              logs={accessLogs}
            />
          )}

          {activeTab === 'iam' && (
            <AccessKeysManager
              keys={iamKeys}
              buckets={buckets}
              onOpenCreateKeyModal={() => setIsCreateKeyOpen(true)}
            />
          )}

          {activeTab === 'metrics' && (
            <PrometheusMetricsView metrics={metrics} />
          )}

          {activeTab === 'dockerhub' && (
            <DockerHubExporter />
          )}

          {activeTab === 'docs' && (
            <SystemDocsView />
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-zinc-900 border border-zinc-800 text-zinc-100 px-3.5 py-2.5 rounded-lg shadow-xl text-xs flex items-center gap-2 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <CreateBucketModal
        isOpen={isCreateBucketOpen}
        onClose={() => setIsCreateBucketOpen(false)}
        onBucketCreated={(b) => {
          setSelectedBucketName(b.name);
          refreshAll();
          showToast(`Bucket "${b.name}" criado.`);
        }}
      />

      <UploadObjectModal
        isOpen={isUploadObjectOpen}
        onClose={() => setIsUploadObjectOpen(false)}
        bucketName={targetUploadBucket || selectedBucketName || 'production-media'}
        onObjectUploaded={(obj) => {
          refreshAll();
          showToast(`Objeto "${obj.key}" enviado.`);
        }}
      />

      <PresignedUrlModal
        isOpen={isPresignedOpen}
        onClose={() => {
          setIsPresignedOpen(false);
          setPresignedTargetObj(null);
        }}
        object={presignedTargetObj}
      />

      <ObjectDetailModal
        isOpen={isObjectDetailOpen}
        onClose={() => {
          setIsObjectDetailOpen(false);
          setDetailTargetObj(null);
        }}
        object={detailTargetObj}
        onPresignedUrlClick={handleOpenPresigned}
      />

      <CreateAccessKeyModal
        isOpen={isCreateKeyOpen}
        onClose={() => setIsCreateKeyOpen(false)}
        buckets={buckets}
        onKeyCreated={() => {
          refreshAll();
          showToast('Chave de API gerada.');
        }}
      />

      <CreateBackupPolicyModal
        isOpen={isCreatePolicyOpen}
        onClose={() => setIsCreatePolicyOpen(false)}
        buckets={buckets}
        onJobCreated={() => {
          refreshAll();
          showToast('Política de backup criada.');
        }}
      />

      <RestoreBackupModal
        isOpen={isRestoreModalOpen}
        onClose={() => {
          setIsRestoreModalOpen(false);
          setRestoreTargetArchive(null);
        }}
        selectedArchive={restoreTargetArchive}
        buckets={buckets}
        onRestoreCompleted={handleRestoreCompleted}
      />

      <LifecycleRuleModal
        isOpen={isLifecycleModalOpen}
        onClose={() => setIsLifecycleModalOpen(false)}
        bucketName={lifecycleTargetBucket || selectedBucketName || 'production-media'}
        onRuleCreated={() => {
          refreshAll();
          showToast('Regra de ciclo de vida ativada.');
        }}
      />

      <WebhookNotificationModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
        bucketName={webhookTargetBucket || selectedBucketName || 'production-media'}
        onWebhookCreated={() => {
          refreshAll();
          showToast('Webhook configurado.');
        }}
      />
    </div>
  );
}
