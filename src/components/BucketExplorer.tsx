import React, { useState, useMemo } from 'react';
import {
  HardDrive,
  Folder,
  FileText,
  Upload,
  Plus,
  Trash2,
  Download,
  Link2,
  Search,
  Eye,
  FileArchive,
  FileCode,
  Image as ImageIcon,
  Check,
  Copy,
  FolderPlus,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  X,
  Shield,
  Lock,
  Clock,
  Bell,
  Globe,
  Unlock,
} from 'lucide-react';
import { Bucket, StorageObject } from '../types/storage';
import { storageEngine } from '../services/storageEngine';
import { replicationEngine } from '../services/replicationEngine';
import { backupEngine } from '../services/backupEngine';

interface BucketExplorerProps {
  buckets: Bucket[];
  objects: StorageObject[];
  selectedBucketName: string;
  onSelectBucket: (name: string) => void;
  onOpenUploadModal: (bucketName: string, prefix?: string) => void;
  onOpenCreateBucketModal: () => void;
  onOpenPresignedModal: (obj: StorageObject) => void;
  onOpenPublicUrlModal: (obj: StorageObject) => void;
  onOpenObjectDetailModal: (obj: StorageObject) => void;
  onOpenLifecycleModal: (bucketName: string) => void;
  onOpenWebhookModal: (bucketName: string) => void;
  onDeleteBucket: (name: string) => void;
}

interface ConfirmModalState {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export const BucketExplorer: React.FC<BucketExplorerProps> = ({
  buckets,
  objects,
  selectedBucketName,
  onSelectBucket,
  onOpenUploadModal,
  onOpenCreateBucketModal,
  onOpenPresignedModal,
  onOpenPublicUrlModal,
  onOpenObjectDetailModal,
  onOpenLifecycleModal,
  onOpenWebhookModal,
  onDeleteBucket,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'objects' | 'lifecycle' | 'webhooks' | 'security'>('objects');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const currentBucket = buckets.find(b => b.name === selectedBucketName) || buckets[0];

  const bucketObjects = useMemo(() => {
    return currentBucket ? objects.filter(o => o.bucketName === currentBucket.name) : [];
  }, [currentBucket, objects]);

  const lifecycleRules = useMemo(() => {
    return currentBucket ? storageEngine.getLifecycleRules(currentBucket.name) : [];
  }, [currentBucket]);

  const webhooks = useMemo(() => {
    return currentBucket ? storageEngine.getWebhooks(currentBucket.name) : [];
  }, [currentBucket]);

  // Compute Folders (CommonPrefixes) and Files at currentPrefix
  const { currentFolders, currentFiles } = useMemo(() => {
    if (!currentBucket) return { currentFolders: [], currentFiles: [] };

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matched = bucketObjects.filter(o => o.key.toLowerCase().includes(q));
      return { currentFolders: [], currentFiles: matched };
    }

    const folderMap = new Map<string, { count: number; sizeBytes: number }>();
    const files: StorageObject[] = [];

    bucketObjects.forEach(obj => {
      if (!obj.key.startsWith(currentPrefix)) return;

      const rest = obj.key.substring(currentPrefix.length);
      const slashIndex = rest.indexOf('/');

      if (slashIndex !== -1) {
        // Belongs to a subfolder
        const folderName = rest.substring(0, slashIndex + 1);
        const existing = folderMap.get(folderName) || { count: 0, sizeBytes: 0 };
        folderMap.set(folderName, {
          count: existing.count + 1,
          sizeBytes: existing.sizeBytes + obj.sizeBytes,
        });
      } else {
        // Direct file at this prefix (ignore virtual marker .keep from file list)
        if (rest !== '.keep') {
          files.push(obj);
        }
      }
    });

    const folders = Array.from(folderMap.entries()).map(([name, data]) => ({
      name,
      fullPrefix: `${currentPrefix}${name}`,
      count: data.count,
      sizeBytes: data.sizeBytes,
    }));

    return { currentFolders: folders, currentFiles: files };
  }, [bucketObjects, currentPrefix, searchQuery, currentBucket]);

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-emerald-400" />;
    if (contentType.includes('json') || contentType.includes('javascript') || contentType.includes('yaml')) {
      return <FileCode className="w-4 h-4 text-blue-400" />;
    }
    if (contentType.includes('gzip') || contentType.includes('tar') || contentType.includes('zip')) {
      return <FileArchive className="w-4 h-4 text-amber-400" />;
    }
    return <FileText className="w-4 h-4 text-zinc-400" />;
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedKeys(currentFiles.map(o => o.key));
    } else {
      setSelectedKeys([]);
    }
  };

  const handleToggleSelect = (key: string) => {
    if (selectedKeys.includes(key)) {
      setSelectedKeys(selectedKeys.filter(k => k !== key));
    } else {
      setSelectedKeys([...selectedKeys, key]);
    }
  };

  const requestDeleteSelected = () => {
    if (!currentBucket || selectedKeys.length === 0) return;
    setConfirmModal({
      title: 'Excluir Objetos Selecionados',
      message: `Tem certeza que deseja excluir permanentemente os ${selectedKeys.length} objetos selecionados do bucket "${currentBucket.name}"?`,
      confirmLabel: `Excluir (${selectedKeys.length})`,
      onConfirm: () => {
        setActionError(null);
        selectedKeys.forEach(k => {
          try {
            storageEngine.deleteObject(currentBucket.name, k);
            replicationEngine.handleObjectDelete(currentBucket.name, k);
          } catch (err: any) {
            setActionError(err.message || 'Erro ao excluir objeto');
          }
        });
        setSelectedKeys([]);
        setConfirmModal(null);
      },
    });
  };

  const requestDeleteObject = (obj: StorageObject) => {
    setConfirmModal({
      title: 'Excluir Objeto',
      message: `Tem certeza que deseja excluir o objeto "${obj.key}"? Esta operação é irreversível.`,
      confirmLabel: 'Excluir Objeto',
      onConfirm: () => {
        try {
          storageEngine.deleteObject(obj.bucketName, obj.key);
          replicationEngine.handleObjectDelete(obj.bucketName, obj.key);
          setConfirmModal(null);
          setActionError(null);
        } catch (err: any) {
          setActionError(err.message || 'Erro ao excluir objeto');
          setConfirmModal(null);
        }
      },
    });
  };

  const requestDeleteFolder = (folderPrefix: string, folderName: string) => {
    if (!currentBucket) return;
    setConfirmModal({
      title: 'Excluir Pasta e Conteúdo',
      message: `Tem certeza que deseja excluir a pasta "${folderName}" e todos os objetos contidos nela?`,
      confirmLabel: 'Excluir Pasta',
      onConfirm: () => {
        try {
          storageEngine.deletePrefix(currentBucket.name, folderPrefix);
          setConfirmModal(null);
          setActionError(null);
        } catch (err: any) {
          setActionError(err.message || 'Erro ao excluir pasta');
          setConfirmModal(null);
        }
      },
    });
  };

  const requestDeleteBucket = () => {
    if (!currentBucket) return;
    setConfirmModal({
      title: 'Excluir Bucket',
      message: `Tem certeza que deseja excluir o bucket "${currentBucket.name}"? Todos os arquivos e configurações serão permanentemente removidos.`,
      confirmLabel: 'Excluir Bucket',
      onConfirm: () => {
        onDeleteBucket(currentBucket.name);
        setConfirmModal(null);
      },
    });
  };

  const handleCreateVirtualFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBucket || !newFolderName.trim()) return;

    const cleanFolder = newFolderName.trim().replace(/^\/+|\/+$/g, '');
    const folderKey = `${currentPrefix}${cleanFolder}/.keep`;

    try {
      await storageEngine.putObject({
        bucketName: currentBucket.name,
        key: folderKey,
        fileOrContent: '',
        contentType: 'application/x-directory',
      });
      setIsCreatingFolder(false);
      setNewFolderName('');
      setActionError(null);
    } catch (err: any) {
      setActionError(err.message || 'Erro ao criar pasta');
    }
  };

  // Breadcrumb segments
  const breadcrumbSegments = useMemo(() => {
    if (!currentPrefix) return [];
    const parts = currentPrefix.split('/').filter(Boolean);
    return parts.map((part, index) => {
      const full = parts.slice(0, index + 1).join('/') + '/';
      return { label: part, path: full };
    });
  }, [currentPrefix]);

  const handleNavigateUp = () => {
    if (!currentPrefix) return;
    const parts = currentPrefix.split('/').filter(Boolean);
    if (parts.length <= 1) {
      setCurrentPrefix('');
    } else {
      parts.pop();
      setCurrentPrefix(parts.join('/') + '/');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Buckets Inner Sidebar (Supabase Storage Style) */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex flex-col">
        <div className="flex items-center justify-between pb-3 px-2 border-b border-zinc-800">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
            Buckets ({buckets.length})
          </span>
          <button
            onClick={onOpenCreateBucketModal}
            className="p-1 rounded text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Criar Bucket"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-2 space-y-1">
          {buckets.map(b => {
            const isSelected = currentBucket && b.name === currentBucket.name;
            return (
              <button
                key={b.id}
                onClick={() => {
                  onSelectBucket(b.name);
                  setCurrentPrefix('');
                  setSelectedKeys([]);
                  setSearchQuery('');
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors flex items-center justify-between group cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-800 text-emerald-400 font-semibold border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <HardDrive className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-zinc-500'}`} />
                  <span className="truncate">{b.name}</span>
                </div>
                <span className="text-[10px] text-zinc-500 tabular-nums shrink-0">
                  {b.objectCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Files Area */}
      <div className="lg:col-span-3 bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden flex flex-col min-h-[460px]">
        {!currentBucket ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center text-zinc-400 mb-3 shadow-md">
              <HardDrive className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">
              Nenhum Bucket Criado
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mb-5 leading-relaxed">
              Seu cluster de armazenamento S3 está ativo e limpo. Crie seu primeiro bucket para começar a armazenar e versionar objetos com codificação de apagamento Reed-Solomon.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={onOpenCreateBucketModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Primeiro Bucket</span>
              </button>
              <button
                onClick={() => {
                  storageEngine.loadDemoData();
                  replicationEngine.loadDemoNodes();
                  backupEngine.loadDemoBackups();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors cursor-pointer"
              >
                <span>Carregar Dados de Exemplo</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Top Action Bar */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-zinc-100 font-mono">
                  {currentBucket.name}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    storageEngine.toggleBucketPublicAccess(currentBucket.name);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded transition-colors cursor-pointer border ${
                    currentBucket.publicAccess === 'private'
                      ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-emerald-400 hover:border-emerald-500/40'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  }`}
                  title={
                    currentBucket.publicAccess === 'private'
                      ? 'Bucket Privado. Clique para liberar acesso público a todos os arquivos.'
                      : 'Bucket Público. Qualquer um pode acessar arquivos diretamente. Clique para tornar privado.'
                  }
                >
                  {currentBucket.publicAccess === 'private' ? (
                    <>
                      <Lock className="w-3 h-3 text-zinc-400" />
                      <span>Privado (tornar público)</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3 h-3 text-emerald-400" />
                      <span>Público (public-read)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedKeys.length > 0 && activeSubTab === 'objects' && (
                  <button
                    onClick={requestDeleteSelected}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-950/40 hover:bg-red-900/40 border border-red-800/50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir ({selectedKeys.length})</span>
                  </button>
                )}

                {activeSubTab === 'objects' && (
                  <>
                    <button
                      onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Nova Pasta</span>
                    </button>

                    <button
                      onClick={() => onOpenUploadModal(currentBucket.name, currentPrefix)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                    </button>
                  </>
                )}

                {activeSubTab === 'lifecycle' && (
                  <button
                    onClick={() => onOpenLifecycleModal(currentBucket.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nova Regra</span>
                  </button>
                )}

                {activeSubTab === 'webhooks' && (
                  <button
                    onClick={() => onOpenWebhookModal(currentBucket.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo Webhook</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sub-Tabs */}
            <div className="px-4 border-b border-zinc-800 flex items-center gap-6 text-xs">
              <button
                onClick={() => setActiveSubTab('objects')}
                className={`py-2.5 border-b-2 font-medium transition-colors cursor-pointer ${
                  activeSubTab === 'objects'
                    ? 'border-emerald-500 text-zinc-100 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Objetos ({bucketObjects.length})
              </button>
              <button
                onClick={() => setActiveSubTab('lifecycle')}
                className={`py-2.5 border-b-2 font-medium transition-colors cursor-pointer ${
                  activeSubTab === 'lifecycle'
                    ? 'border-emerald-500 text-zinc-100 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Ciclo de Vida ({lifecycleRules.length})
              </button>
              <button
                onClick={() => setActiveSubTab('webhooks')}
                className={`py-2.5 border-b-2 font-medium transition-colors cursor-pointer ${
                  activeSubTab === 'webhooks'
                    ? 'border-emerald-500 text-zinc-100 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Webhooks ({webhooks.length})
              </button>
              <button
                onClick={() => setActiveSubTab('security')}
                className={`py-2.5 border-b-2 font-medium transition-colors cursor-pointer ${
                  activeSubTab === 'security'
                    ? 'border-emerald-500 text-zinc-100 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Criptografia & WORM
              </button>
            </div>

            {/* Action Error Banner */}
            {actionError && (
              <div className="m-3 p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{actionError}</span>
                </div>
                <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-200 p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Breadcrumbs & Search Bar */}
            {activeSubTab === 'objects' && (
              <div className="p-3 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/40">
                {/* S3 Breadcrumb Path Navigation */}
                <div className="flex items-center gap-1.5 text-xs font-mono overflow-x-auto py-0.5">
                  {currentPrefix && (
                    <button
                      onClick={handleNavigateUp}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition-colors mr-1 cursor-pointer"
                      title="Voltar ao nível anterior"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Voltar</span>
                    </button>
                  )}

                  <button
                    onClick={() => setCurrentPrefix('')}
                    className={`hover:text-emerald-400 transition-colors cursor-pointer ${
                      !currentPrefix ? 'text-zinc-100 font-bold' : 'text-zinc-400'
                    }`}
                  >
                    {currentBucket.name}
                  </button>
                  <span className="text-zinc-600">/</span>

                  {breadcrumbSegments.map((seg, idx) => {
                    const isLast = idx === breadcrumbSegments.length - 1;
                    return (
                      <React.Fragment key={seg.path}>
                        <button
                          onClick={() => setCurrentPrefix(seg.path)}
                          className={`hover:text-emerald-400 transition-colors cursor-pointer ${
                            isLast ? 'text-emerald-400 font-bold' : 'text-zinc-400'
                          }`}
                        >
                          {seg.label}
                        </button>
                        <span className="text-zinc-600">/</span>
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Search & Bucket Delete */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 sm:w-56">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar arquivos..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <button
                    onClick={requestDeleteBucket}
                    className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    title="Excluir bucket"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Deletar Bucket</span>
                  </button>
                </div>
              </div>
            )}

            {/* Folder Creation Input */}
            {isCreatingFolder && (
              <form onSubmit={handleCreateVirtualFolder} className="p-3 bg-zinc-950 border-b border-zinc-800 flex items-center gap-3">
                <Folder className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-mono text-zinc-400">{currentPrefix}</span>
                <input
                  type="text"
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nome da pasta (ex: documentos)"
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold rounded text-xs cursor-pointer"
                >
                  Criar Pasta
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 px-2 cursor-pointer"
                >
                  Cancelar
                </button>
              </form>
            )}

            {/* TAB 1: Objects & Folders */}
            {activeSubTab === 'objects' && (
              <div className="flex-1 overflow-x-auto">
                {currentFolders.length === 0 && currentFiles.length === 0 ? (
                  <div className="py-16 text-center text-xs text-zinc-500">
                    {currentPrefix ? (
                      <div>
                        <p>Esta pasta está vazia.</p>
                        <button
                          onClick={() => onOpenUploadModal(currentBucket.name, currentPrefix)}
                          className="mt-2 text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                        >
                          + Enviar arquivo para esta pasta
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p>Nenhum arquivo ou pasta encontrado neste bucket.</p>
                        <button
                          onClick={() => onOpenUploadModal(currentBucket.name, currentPrefix)}
                          className="mt-2 text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                        >
                          + Fazer primeiro upload
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 text-[11px] font-mono">
                      <tr>
                        <th className="py-2.5 px-3 w-8">
                          <input
                            type="checkbox"
                            checked={selectedKeys.length === currentFiles.length && currentFiles.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
                          />
                        </th>
                        <th className="py-2.5 px-3 font-semibold">Nome</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Tamanho</th>
                        <th className="py-2.5 px-3 font-semibold">Tipo</th>
                        <th className="py-2.5 px-3 font-semibold">Data</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {/* Render Virtual Folders */}
                      {currentFolders.map(folder => (
                        <tr
                          key={`folder-${folder.fullPrefix}`}
                          className="hover:bg-zinc-800/40 transition-colors group"
                        >
                          <td className="py-2 px-3">
                            <span className="w-3.5 h-3.5 block" />
                          </td>
                          <td className="py-2 px-3">
                            <button
                              onClick={() => {
                                setCurrentPrefix(folder.fullPrefix);
                                setSelectedKeys([]);
                              }}
                              className="flex items-center gap-2 text-zinc-200 hover:text-emerald-400 font-medium transition-colors cursor-pointer text-left w-full"
                            >
                              <Folder className="w-4 h-4 text-emerald-400/90 shrink-0" />
                              <span className="truncate">{folder.name}</span>
                              <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                            </button>
                          </td>
                          <td className="py-2 px-3 text-right text-zinc-500 text-[11px] tabular-nums">
                            {formatSize(folder.sizeBytes)}
                          </td>
                          <td className="py-2 px-3 text-zinc-500 text-[11px]">
                            Pasta ({folder.count} {folder.count === 1 ? 'item' : 'itens'})
                          </td>
                          <td className="py-2 px-3 text-zinc-500 text-[11px]">
                            -
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => requestDeleteFolder(folder.fullPrefix, folder.name)}
                                className="p-1 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                                title="Excluir pasta e conteúdo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {/* Render Files */}
                      {currentFiles.map(obj => {
                        const isChecked = selectedKeys.includes(obj.key);
                        const displayName = currentPrefix && obj.key.startsWith(currentPrefix)
                          ? obj.key.substring(currentPrefix.length)
                          : obj.key;

                        return (
                          <tr
                            key={obj.id}
                            className={`hover:bg-zinc-800/40 transition-colors ${isChecked ? 'bg-zinc-800/20' : ''}`}
                          >
                            <td className="py-2 px-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSelect(obj.key)}
                                className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
                              />
                            </td>

                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                {getFileIcon(obj.contentType)}
                                <button
                                  onClick={() => onOpenObjectDetailModal(obj)}
                                  className="text-zinc-200 hover:text-emerald-400 font-medium truncate max-w-xs transition-colors cursor-pointer text-left"
                                  title={obj.key}
                                >
                                  {displayName}
                                </button>
                                {obj.legalHold && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0" title="Legal Hold WORM Ativo">
                                    HOLD
                                  </span>
                                )}
                                {obj.encryption && obj.encryption !== 'none' && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                    SSE
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-2 px-3 text-right text-zinc-400 tabular-nums">
                              {formatSize(obj.sizeBytes)}
                            </td>

                            <td className="py-2 px-3 text-zinc-500 text-[11px] truncate max-w-[120px]">
                              {obj.contentType}
                            </td>

                            <td className="py-2 px-3 text-zinc-500 text-[11px] tabular-nums">
                              {new Date(obj.lastModified).toLocaleDateString()}
                            </td>

                            <td className="py-2 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => onOpenPublicUrlModal(obj)}
                                  className="p-1 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                                  title="URL Pública / Compartilhar Link"
                                >
                                  <Globe className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onOpenPresignedModal(obj)}
                                  className="p-1 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                                  title="Gerar URL Pré-assinada (SigV4)"
                                >
                                  <Link2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => storageEngine.downloadStorageObject(obj)}
                                  className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                                  title="Baixar Arquivo"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onOpenObjectDetailModal(obj)}
                                  className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                                  title="Ver Detalhes e Shards"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => requestDeleteObject(obj)}
                                  className="p-1 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                                  title="Excluir arquivo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* TAB 2: Lifecycle */}
            {activeSubTab === 'lifecycle' && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">Políticas de Retenção & Expiração</h4>
                    <p className="text-[11px] text-zinc-500">Transição automática de classes de armazenamento ou expiração de objetos</p>
                  </div>
                </div>

                {lifecycleRules.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500">
                    Nenhuma regra de ciclo de vida configurada para este bucket.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/80">
                    {lifecycleRules.map(rule => (
                      <div key={rule.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-zinc-200 font-semibold">{rule.prefix || '(Todo o Bucket)'}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400">
                              {rule.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                            {rule.expirationDays && `Expira após ${rule.expirationDays} dias`}
                            {rule.transitionDays && ` · Transição para ${rule.transitionStorageClass} após ${rule.transitionDays} dias`}
                          </div>
                        </div>
                        <button
                          onClick={() => storageEngine.deleteLifecycleRule(rule.id)}
                          className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Webhooks */}
            {activeSubTab === 'webhooks' && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">Notificações HTTP / Webhooks</h4>
                    <p className="text-[11px] text-zinc-500">Notifica servidores externos quando ocorrem eventos no bucket</p>
                  </div>
                </div>

                {webhooks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500">
                    Nenhum webhook registrado neste bucket.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/80">
                    {webhooks.map(wh => (
                      <div key={wh.id} className="py-3 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-mono text-zinc-200 font-semibold">{wh.endpointUrl}</span>
                          <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                            Eventos: {wh.events.join(', ')}
                          </div>
                        </div>
                        <button
                          onClick={() => storageEngine.deleteWebhook(wh.id)}
                          className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Security & Encryption */}
            {activeSubTab === 'security' && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <div>
                    <span className="text-zinc-200 font-medium block text-xs">Criptografia SSE Padrão</span>
                    <span className="text-zinc-500 text-[11px]">
                      {currentBucket.encryption === 'AES256' ? 'AES-256-GCM ativo' : 'Sem criptografia'}
                    </span>
                  </div>
                  <button
                    onClick={() => storageEngine.updateBucketSettings(currentBucket.name, {
                      encryption: currentBucket.encryption === 'AES256' ? 'none' : 'AES256'
                    })}
                    className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs cursor-pointer"
                  >
                    {currentBucket.encryption === 'AES256' ? 'Desativar' : 'Ativar AES256'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <div>
                    <span className="text-zinc-200 font-medium block text-xs">Imutabilidade WORM (Object Lock)</span>
                    <span className="text-zinc-500 text-[11px]">
                      {currentBucket.objectLockEnabled ? 'Ativo (Compliance/Governance)' : 'Desativado'}
                    </span>
                  </div>
                  <button
                    onClick={() => storageEngine.updateBucketSettings(currentBucket.name, {
                      objectLockEnabled: !currentBucket.objectLockEnabled
                    })}
                    className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs cursor-pointer"
                  >
                    {currentBucket.objectLockEnabled ? 'Desativar' : 'Ativar WORM'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reusable In-App Confirmation Modal (Replaces window.confirm) */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#171717] border border-zinc-800 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">{confirmModal.title}</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{confirmModal.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors cursor-pointer shadow-sm"
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
