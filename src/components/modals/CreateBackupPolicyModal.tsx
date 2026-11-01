import React, { useState } from 'react';
import { X, Archive, Calendar } from 'lucide-react';
import { backupEngine } from '../../services/backupEngine';
import { BackupJob, Bucket } from '../../types/storage';

interface CreateBackupPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  buckets: Bucket[];
  onJobCreated: (job: BackupJob) => void;
}

export const CreateBackupPolicyModal: React.FC<CreateBackupPolicyModalProps> = ({
  isOpen,
  onClose,
  buckets,
  onJobCreated,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<BackupJob['type']>('full_snapshot');
  const [selectedBucket, setSelectedBucket] = useState<string>('*');
  const [scheduleCron, setScheduleCron] = useState<string>('0 3 * * *');
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [compression, setCompression] = useState<BackupJob['compression']>('zstd');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = backupEngine.createJob({
      name: name || 'Política de Backup Automático',
      type,
      targetBuckets: selectedBucket === '*' ? ['*'] : [selectedBucket],
      scheduleCron,
      retentionDays,
      autoExportRemote: true,
      compression,
    });
    onJobCreated(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#171717] border border-zinc-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Criar Política de Backup</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Nome da Política
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Snapshot Diário Produção"
              className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Tipo de Backup
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="full_snapshot">Snapshot Completo</option>
                <option value="incremental_diff">Incremental</option>
                <option value="metadata_only">Apenas Metadados</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Buckets Alvo
              </label>
              <select
                value={selectedBucket}
                onChange={(e) => setSelectedBucket(e.target.value)}
                className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="*">Todos os Buckets (*)</option>
                {buckets.map(b => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Frequência (Cron)
              </label>
              <select
                value={scheduleCron}
                onChange={(e) => setScheduleCron(e.target.value)}
                className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="0 3 * * *">Diário às 03:00</option>
                <option value="*/30 * * * *">A cada 30 minutos</option>
                <option value="0 */6 * * *">A cada 6 horas</option>
                <option value="0 0 * * 0">Semanal (Domingo)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Retenção (Dias)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 tabular-nums font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Compressão
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer text-xs ${
                compression === 'zstd' ? 'bg-emerald-500/10 border-emerald-500/40 text-zinc-100' : 'bg-[#121212] border-zinc-800 text-zinc-400'
              }`}>
                <input
                  type="radio"
                  name="comp"
                  checked={compression === 'zstd'}
                  onChange={() => setCompression('zstd')}
                  className="hidden"
                />
                <span className="font-medium">Zstandard (zstd)</span>
                <span className="text-[10px] text-zinc-500 font-mono">Mais Rápido</span>
              </label>
              <label className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer text-xs ${
                compression === 'gzip' ? 'bg-emerald-500/10 border-emerald-500/40 text-zinc-100' : 'bg-[#121212] border-zinc-800 text-zinc-400'
              }`}>
                <input
                  type="radio"
                  name="comp"
                  checked={compression === 'gzip'}
                  onChange={() => setCompression('gzip')}
                  className="hidden"
                />
                <span className="font-medium">Gzip (.tar.gz)</span>
                <span className="text-[10px] text-zinc-500 font-mono">Padrão</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
            >
              Criar Política
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
