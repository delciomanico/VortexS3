import React, { useState, useRef } from 'react';
import {
  X,
  RotateCcw,
  Archive,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  ShieldCheck,
} from 'lucide-react';
import { BackupArchive, Bucket, RestoreOptions } from '../../types/storage';
import { backupEngine } from '../../services/backupEngine';

interface RestoreBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedArchive: BackupArchive | null;
  buckets: Bucket[];
  onRestoreCompleted: (summary: { restoredBucketsCount: number; restoredObjectsCount: number; bytesRestored: number }) => void;
}

export const RestoreBackupModal: React.FC<RestoreBackupModalProps> = ({
  isOpen,
  onClose,
  selectedArchive,
  buckets,
  onRestoreCompleted,
}) => {
  const [sourceMode, setSourceMode] = useState<'archive' | 'file'>(selectedArchive ? 'archive' : 'file');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<{
    version: string;
    createdAt: string;
    bucketsCount: number;
    objectsCount: number;
    totalSizeBytes: number;
    bucketsNames: string[];
  } | null>(null);

  const [targetBucketMode, setTargetBucketMode] = useState<'original' | 'specific_bucket'>('original');
  const [specificBucketName, setSpecificBucketName] = useState<string>(buckets[0]?.name || '');
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [validateChecksum, setValidateChecksum] = useState(true);

  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setError(null);
      try {
        const preview = await backupEngine.inspectSnapshotFile(file);
        setFilePreview(preview);
      } catch (err: any) {
        setError(`Erro ao analisar arquivo: ${err.message}`);
        setFilePreview(null);
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const handleExecuteRestore = async () => {
    setError(null);
    setIsRestoring(true);

    const options: RestoreOptions = {
      targetBucketMode,
      specificBucketName: targetBucketMode === 'specific_bucket' ? specificBucketName : undefined,
      overwriteExisting,
      validateChecksum,
    };

    try {
      setRestoreProgress('1/3: Descompactando e checando SHA256...');
      await new Promise(r => setTimeout(r, 450));

      setRestoreProgress('2/3: Restaurando metadados e gravando objetos...');
      let result;
      if (sourceMode === 'archive' && selectedArchive) {
        result = await backupEngine.restoreFromArchive(selectedArchive, options);
      } else if (uploadedFile) {
        result = await backupEngine.restoreFromFile(uploadedFile, options);
      } else {
        throw new Error('Selecione um snapshot ou importe um arquivo de backup.');
      }

      setRestoreProgress('3/3: Sincronizando nós réplicas do cluster...');
      await new Promise(r => setTimeout(r, 400));

      onRestoreCompleted(result);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao restaurar backup');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#171717] border border-zinc-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Restaurar Snapshot S3</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isRestoring}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Source Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#121212] border border-zinc-800 rounded-lg">
            <button
              type="button"
              onClick={() => setSourceMode('archive')}
              disabled={!selectedArchive}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                sourceMode === 'archive'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Snapshot do Cluster</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceMode('file')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                sourceMode === 'file'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Arquivo (.json/.tar.gz)</span>
            </button>
          </div>

          {/* Mode 1: Cluster Archive Info */}
          {sourceMode === 'archive' && selectedArchive && (
            <div className="bg-[#121212] border border-zinc-800 rounded-lg p-3.5 text-xs space-y-2 font-mono">
              <div className="flex items-center justify-between">
                <span className="font-sans font-medium text-zinc-200">{selectedArchive.jobName}</span>
                <span className="text-emerald-400 font-semibold">{selectedArchive.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-zinc-400 text-[11px] pt-1">
                <div>Itens: <span className="text-zinc-200">{selectedArchive.objectCount}</span></div>
                <div>Tamanho: <span className="text-zinc-200">{formatSize(selectedArchive.sizeBytes)}</span></div>
              </div>
              <div className="text-[10px] text-zinc-500 truncate pt-1 border-t border-zinc-800/80">
                SHA256: {selectedArchive.checksum}
              </div>
            </div>
          )}

          {/* Mode 2: Upload File */}
          {sourceMode === 'file' && (
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-zinc-700 hover:border-emerald-500/80 rounded-lg p-4 text-center cursor-pointer transition-colors bg-[#121212]"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,.tar.gz,.tar"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileArchive className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                <span className="text-xs font-medium text-zinc-200 block">
                  {uploadedFile ? uploadedFile.name : 'Clique para selecionar arquivo de backup'}
                </span>
                <span className="text-[11px] text-zinc-500 mt-0.5 block">
                  Suporta arquivos .json e .tar.gz gerados pelo VortexS3
                </span>
              </div>

              {filePreview && (
                <div className="mt-2.5 bg-[#121212] border border-zinc-800 rounded-lg p-3 text-xs space-y-1 font-mono">
                  <div className="text-emerald-400 flex items-center gap-1.5 text-[11px] font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Backup válido reconhecido</span>
                  </div>
                  <div className="text-zinc-300 text-[11px]">
                    {filePreview.bucketsCount} buckets · {filePreview.objectsCount} objetos ({formatSize(filePreview.totalSizeBytes)})
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Destination */}
          <div className="pt-2 border-t border-zinc-800 space-y-2.5">
            <label className="block text-xs font-medium text-zinc-300">
              Destino dos Dados
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className={`p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                targetBucketMode === 'original'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-zinc-100 font-semibold'
                  : 'bg-[#121212] border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}>
                <input
                  type="radio"
                  name="targetMode"
                  checked={targetBucketMode === 'original'}
                  onChange={() => setTargetBucketMode('original')}
                  className="hidden"
                />
                <span>Buckets Originais</span>
                <span className="text-[10px] text-zinc-500 block font-normal mt-0.5">Recria estrutura exata</span>
              </label>

              <label className={`p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                targetBucketMode === 'specific_bucket'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-zinc-100 font-semibold'
                  : 'bg-[#121212] border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}>
                <input
                  type="radio"
                  name="targetMode"
                  checked={targetBucketMode === 'specific_bucket'}
                  onChange={() => setTargetBucketMode('specific_bucket')}
                  className="hidden"
                />
                <span>Bucket Específico</span>
                <span className="text-[10px] text-zinc-500 block font-normal mt-0.5">Aloca em um bucket</span>
              </label>
            </div>

            {targetBucketMode === 'specific_bucket' && (
              <select
                value={specificBucketName}
                onChange={(e) => setSpecificBucketName(e.target.value)}
                className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono mt-1"
              >
                {buckets.map(b => (
                  <option key={b.name} value={b.name}>{b.name} ({b.objectCount} itens)</option>
                ))}
              </select>
            )}
          </div>

          {/* Options */}
          <div className="pt-2 border-t border-zinc-800 space-y-1.5 text-xs text-zinc-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 accent-emerald-500"
              />
              <span>Sobrescrever arquivos já existentes no destino</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={validateChecksum}
                onChange={(e) => setValidateChecksum(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 accent-emerald-500"
              />
              <span>Validar integridade SHA256 antes da restauração</span>
            </label>
          </div>

          {/* Progress */}
          {isRestoring && (
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <div className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                <span>Restaurando...</span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">{restoreProgress}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isRestoring}
              className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExecuteRestore}
              disabled={isRestoring || (sourceMode === 'file' && !uploadedFile)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Agora</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
