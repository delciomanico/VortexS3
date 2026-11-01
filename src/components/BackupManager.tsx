import React, { useState } from 'react';
import {
  Archive,
  Download,
  Trash2,
  CheckCircle2,
  Plus,
  Play,
  RotateCcw,
  ShieldCheck,
  FileArchive,
  Copy,
  Check,
  Upload,
} from 'lucide-react';
import { BackupJob, BackupArchive, Bucket } from '../types/storage';
import { backupEngine } from '../services/backupEngine';

interface BackupManagerProps {
  jobs: BackupJob[];
  archives: BackupArchive[];
  buckets: Bucket[];
  onOpenCreatePolicyModal: () => void;
  onOpenRestoreModal: (archive: BackupArchive | null) => void;
}

export const BackupManager: React.FC<BackupManagerProps> = ({
  jobs,
  archives,
  buckets,
  onOpenCreatePolicyModal,
  onOpenRestoreModal,
}) => {
  const [isRunningBackup, setIsRunningBackup] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedChecksum, setCopiedChecksum] = useState<string | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const handleRunImmediateBackup = async () => {
    setIsRunningBackup(true);
    setSuccessMessage(null);
    try {
      const created = await backupEngine.executeBackupNow();
      setSuccessMessage(`Snapshot "${created.id}" gerado com sucesso.`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsRunningBackup(false);
    }
  };

  const handleCopyChecksum = (cs: string) => {
    navigator.clipboard.writeText(cs);
    setCopiedChecksum(cs);
    setTimeout(() => setCopiedChecksum(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Archive className="w-4 h-4 text-emerald-400" />
            <span>Backups & Recuperação</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Snapshots criptografados, rotinas cron e restauração pontual contra desastres (Disaster Recovery).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenRestoreModal(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Snapshot</span>
          </button>

          <button
            onClick={onOpenCreatePolicyModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Política</span>
          </button>

          <button
            onClick={handleRunImmediateBackup}
            disabled={isRunningBackup}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer font-semibold shadow-sm"
          >
            {isRunningBackup ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-zinc-900/40 border-t-zinc-900 rounded-full animate-spin" />
                <span>Gerando...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Backup Agora</span>
              </>
            )}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Policies section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
            Políticas de Agendamento ({jobs.length})
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {jobs.map(job => (
            <div
              key={job.id}
              className="p-3.5 bg-[#171717] border border-zinc-800/80 rounded-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-zinc-200">{job.name}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                    {job.type}
                  </span>
                </div>

                <div className="mt-2.5 space-y-1 text-xs text-zinc-400 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Cron:</span>
                    <span className="text-zinc-200">{job.scheduleCron}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Buckets:</span>
                    <span className="text-zinc-200 truncate max-w-[200px]">{job.targetBuckets.join(', ')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Retenção:</span>
                    <span className="text-zinc-200">{job.retentionDays} dias ({job.compression})</span>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 mt-2.5 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500 font-mono">
                  Próxima: {new Date(job.nextRunTime).toLocaleDateString()}
                </span>
                <button
                  onClick={() => backupEngine.deleteJob(job.id)}
                  className="text-zinc-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                  title="Excluir política"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Snapshots Table */}
      <div className="border border-zinc-800 rounded-lg overflow-hidden bg-[#171717]">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileArchive className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-200">Snapshots Armazenados</span>
          </div>
          <span className="text-xs font-mono text-zinc-500">{archives.length} itens</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#141414] text-zinc-400 border-b border-zinc-800 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-4">Identificador</th>
                <th className="py-2.5 px-4">Origem</th>
                <th className="py-2.5 px-4 text-right">Objetos</th>
                <th className="py-2.5 px-4 text-right">Tamanho</th>
                <th className="py-2.5 px-4">Integridade SHA256</th>
                <th className="py-2.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {archives.map(arc => (
                <tr key={arc.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-2.5 px-4 text-zinc-200 font-semibold">
                    <div className="flex items-center gap-2">
                      <Archive className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{arc.id}</span>
                    </div>
                  </td>

                  <td className="py-2.5 px-4 text-zinc-300 font-sans text-xs">
                    <div>{arc.jobName}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">{new Date(arc.timestamp).toLocaleDateString()}</div>
                  </td>

                  <td className="py-2.5 px-4 text-right text-zinc-300 tabular-nums">
                    {arc.objectCount}
                  </td>

                  <td className="py-2.5 px-4 text-right text-zinc-300 tabular-nums">
                    {formatSize(arc.sizeBytes)}
                  </td>

                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-1.5 max-w-[200px]">
                      <span className="text-[11px] text-zinc-400 truncate select-all">{arc.checksum}</span>
                      <button
                        onClick={() => handleCopyChecksum(arc.checksum)}
                        className="text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
                        title="Copiar checksum"
                      >
                        {copiedChecksum === arc.checksum ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>

                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenRestoreModal(arc)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded transition-colors cursor-pointer"
                        title="Restaurar dados deste snapshot"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restaurar</span>
                      </button>

                      <button
                        onClick={() => backupEngine.downloadArchiveFile(arc)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors cursor-pointer"
                        title="Baixar arquivo de snapshot"
                      >
                        <Download className="w-3 h-3" />
                        <span>Baixar</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Excluir snapshot ${arc.id}?`)) {
                            backupEngine.deleteArchive(arc.id);
                          }
                        }}
                        className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                        title="Excluir snapshot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
