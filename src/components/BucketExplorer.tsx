import React, { useState } from 'react';
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
  Clock,
  Bell,
  Shield,
  RotateCcw,
} from 'lucide-react';
import { Bucket, StorageObject } from '../types/storage';
import { storageEngine } from '../services/storageEngine';
import { replicationEngine } from '../services/replicationEngine';

interface BucketExplorerProps {
  buckets: Bucket[];
  objects: StorageObject[];
  selectedBucketName: string;
  onSelectBucket: (name: string) => void;
  onOpenUploadModal: (bucketName: string) => void;
  onOpenCreateBucketModal: () => void;
  onOpenPresignedModal: (obj: StorageObject) => void;
  onOpenObjectDetailModal: (obj: StorageObject) => void;
  onOpenLifecycleModal: (bucketName: string) => void;
  onOpenWebhookModal: (bucketName: string) => void;
  onDeleteBucket: (bucketName: string) => void;
}

export const BucketExplorer: React.FC<BucketExplorerProps> = ({
  buckets,
  objects,
  selectedBucketName,
  onSelectBucket,
  onOpenUploadModal,
  onOpenCreateBucketModal,
  onOpenPresignedModal,
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const currentBucket = buckets.find(b => b.name === selectedBucketName) || buckets[0];

  const bucketObjects = currentBucket
    ? objects.filter(o => o.bucketName === currentBucket.name)
    : [];

  const lifecycleRules = currentBucket
    ? storageEngine.getLifecycleRules(currentBucket.name)
    : [];

  const webhooks = currentBucket
    ? storageEngine.getWebhooks(currentBucket.name)
    : [];

  const filteredObjects = bucketObjects.filter(obj => {
    if (searchQuery) {
      return obj.key.toLowerCase().includes(searchQuery.toLowerCase());
    }
    if (currentPrefix) {
      return obj.key.startsWith(currentPrefix);
    }
    return true;
  });

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
      setSelectedKeys(filteredObjects.map(o => o.key));
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

  const handleDeleteSelected = () => {
    if (!currentBucket || selectedKeys.length === 0) return;
    if (confirm(`Excluir ${selectedKeys.length} objetos selecionados?`)) {
      selectedKeys.forEach(k => {
        try {
          storageEngine.deleteObject(currentBucket.name, k);
          replicationEngine.handleObjectDelete(currentBucket.name, k);
        } catch (err: any) {
          alert(`Erro: ${err.message}`);
        }
      });
      setSelectedKeys([]);
    }
  };

  const handleCreateVirtualFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBucket || !newFolderName.trim()) return;

    const folderKey = `${currentPrefix}${newFolderName.trim().replace(/\/+$/, '')}/.keep`;
    await storageEngine.putObject({
      bucketName: currentBucket.name,
      key: folderKey,
      fileOrContent: '',
      contentType: 'application/x-directory',
    });
    setIsCreatingFolder(false);
    setNewFolderName('');
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
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors flex items-center justify-between group cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-800 text-emerald-400 font-semibold'
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
      <div className="lg:col-span-3 bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
        {/* Top Action Bar */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-zinc-100 font-mono">
              {currentBucket?.name}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
              {currentBucket?.publicAccess === 'private' ? 'Privado' : 'Público'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedKeys.length > 0 && activeSubTab === 'objects' && (
              <button
                onClick={handleDeleteSelected}
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
                  onClick={() => currentBucket && onOpenUploadModal(currentBucket.name)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </button>
              </>
            )}

            {activeSubTab === 'lifecycle' && currentBucket && (
              <button
                onClick={() => onOpenLifecycleModal(currentBucket.name)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Regra</span>
              </button>
            )}

            {activeSubTab === 'webhooks' && currentBucket && (
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

        {/* Supabase style Clean Sub-Tabs */}
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

        {/* Search */}
        {activeSubTab === 'objects' && (
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar arquivos..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {currentBucket && (
              <button
                onClick={() => {
                  if (confirm(`Deletar bucket "${currentBucket.name}"?`)) {
                    onDeleteBucket(currentBucket.name);
                  }
                }}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Deletar Bucket</span>
              </button>
            )}
          </div>
        )}

        {isCreatingFolder && (
          <form onSubmit={handleCreateVirtualFolder} className="p-3 bg-zinc-950 border-b border-zinc-800 flex items-center gap-3">
            <Folder className="w-4 h-4 text-emerald-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nome da pasta (ex: fotos)"
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold rounded text-xs cursor-pointer"
            >
              Criar
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

        {/* TAB 1: Objects */}
        {activeSubTab === 'objects' && (
          <div className="flex-1 overflow-x-auto">
            {filteredObjects.length === 0 ? (
              <div className="py-16 text-center text-xs text-zinc-500">
                Nenhum arquivo encontrado neste bucket.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 text-[11px] font-mono">
                  <tr>
                    <th className="py-2.5 px-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedKeys.length === filteredObjects.length && filteredObjects.length > 0}
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
                  {filteredObjects.map(obj => {
                    const isChecked = selectedKeys.includes(obj.key);
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
                              {obj.key}
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
                              onClick={() => onOpenPresignedModal(obj)}
                              className="p-1 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                              title="Presigned URL"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onOpenObjectDetailModal(obj)}
                              className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                              title="Detalhes"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Excluir ${obj.key}?`)) {
                                  try {
                                    storageEngine.deleteObject(obj.bucketName, obj.key);
                                    replicationEngine.handleObjectDelete(obj.bucketName, obj.key);
                                  } catch (err: any) {
                                    alert(err.message);
                                  }
                                }
                              }}
                              className="p-1 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                              title="Excluir"
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
          <div className="p-4 space-y-3">
            {lifecycleRules.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                Nenhuma regra de ciclo de vida configurada.
              </div>
            ) : (
              lifecycleRules.map(r => (
                <div key={r.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="font-semibold text-zinc-200">{r.prefix || '*'}</span>
                    <span className="text-zinc-500 ml-2">Expira em {r.expirationDays}d</span>
                  </div>
                  <button
                    onClick={() => storageEngine.deleteLifecycleRule(r.id)}
                    className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: Webhooks */}
        {activeSubTab === 'webhooks' && (
          <div className="p-4 space-y-3">
            {webhooks.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                Nenhum webhook registrado.
              </div>
            ) : (
              webhooks.map(w => (
                <div key={w.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between text-xs font-mono">
                  <div className="truncate max-w-md">
                    <span className="text-emerald-400 font-semibold">{w.endpointUrl}</span>
                    <span className="text-zinc-500 block text-[11px]">{w.events.join(', ')}</span>
                  </div>
                  <button
                    onClick={() => storageEngine.deleteWebhook(w.id)}
                    className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: Security */}
        {activeSubTab === 'security' && currentBucket && (
          <div className="p-5 space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
              <div>
                <span className="text-zinc-200 font-medium block">Criptografia SSE-S3</span>
                <span className="text-zinc-500 text-[11px]">{currentBucket.encryption}</span>
              </div>
              <button
                onClick={() => storageEngine.updateBucketSettings(currentBucket.name, {
                  encryption: currentBucket.encryption === 'AES256' ? 'none' : 'AES256'
                })}
                className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
              >
                {currentBucket.encryption === 'AES256' ? 'Desativar' : 'Ativar AES256'}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
              <div>
                <span className="text-zinc-200 font-medium block">Imutabilidade WORM (Object Lock)</span>
                <span className="text-zinc-500 text-[11px]">{currentBucket.objectLockEnabled ? 'Ativo' : 'Desativado'}</span>
              </div>
              <button
                onClick={() => storageEngine.updateBucketSettings(currentBucket.name, {
                  objectLockEnabled: !currentBucket.objectLockEnabled
                })}
                className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
              >
                {currentBucket.objectLockEnabled ? 'Desativar' : 'Ativar WORM'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
