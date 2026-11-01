import React, { useState } from 'react';
import { X, ShieldCheck, Globe, Lock, AlertCircle, HardDrive, Shield } from 'lucide-react';
import { storageEngine } from '../../services/storageEngine';
import { Bucket } from '../../types/storage';

interface CreateBucketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBucketCreated: (bucket: Bucket) => void;
}

export const CreateBucketModal: React.FC<CreateBucketModalProps> = ({
  isOpen,
  onClose,
  onBucketCreated,
}) => {
  const [name, setName] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [versioning, setVersioning] = useState(true);
  const [publicAccess, setPublicAccess] = useState<'private' | 'public-read' | 'public-read-write'>('private');
  const [encryption, setEncryption] = useState<'AES256' | 'none'>('AES256');
  const [objectLockEnabled, setObjectLockEnabled] = useState(false);
  const [retentionDays, setRetentionDays] = useState(30);
  const [retentionMode, setRetentionMode] = useState<'COMPLIANCE' | 'GOVERNANCE'>('COMPLIANCE');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const created = storageEngine.createBucket({
        name,
        region,
        versioningEnabled: versioning,
        publicAccess,
        encryption,
        objectLockEnabled,
      });
      if (objectLockEnabled) {
        created.defaultRetentionDays = retentionDays;
        created.defaultRetentionMode = retentionMode;
      }
      onBucketCreated(created);
      setName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar bucket');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#171717] border border-zinc-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Criar Novo Bucket S3</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Nome do Bucket
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase())}
              placeholder="ex: app-uploads-prod"
              className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Letras minúsculas, números e hífens.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Região
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="us-east-1">us-east-1 (N. Virginia)</option>
                <option value="sa-east-1">sa-east-1 (São Paulo)</option>
                <option value="eu-west-1">eu-west-1 (Ireland)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Versionamento
              </label>
              <select
                value={versioning ? 'true' : 'false'}
                onChange={(e) => setVersioning(e.target.value === 'true')}
                className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="true">Habilitado</option>
                <option value="false">Desabilitado</option>
              </select>
            </div>
          </div>

          {/* Criptografia SSE & Object Lock */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Criptografia SSE-S3
              </label>
              <select
                value={encryption}
                onChange={(e) => setEncryption(e.target.value as any)}
                className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="AES256">AES-256-GCM (Ativa)</option>
                <option value="none">Desativada</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Object Lock (WORM)
              </label>
              <select
                value={objectLockEnabled ? 'true' : 'false'}
                onChange={(e) => setObjectLockEnabled(e.target.value === 'true')}
                className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="false">Desativado</option>
                <option value="true">Habilitado (Imutável)</option>
              </select>
            </div>
          </div>

          {objectLockEnabled && (
            <div className="p-3 bg-[#121212] border border-emerald-500/30 rounded-lg space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Lock className="w-3.5 h-3.5" />
                <span>Configuração de Conformidade WORM</span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Modo de Retenção:</span>
                  <select
                    value={retentionMode}
                    onChange={(e) => setRetentionMode(e.target.value as any)}
                    className="w-full bg-[#171717] border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 mt-0.5"
                  >
                    <option value="COMPLIANCE">COMPLIANCE (Imutável)</option>
                    <option value="GOVERNANCE">GOVERNANCE</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Período Padrão (Dias):</span>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Number(e.target.value))}
                    className="w-full bg-[#171717] border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 mt-0.5"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">
              Política de Acesso
            </label>
            <div className="space-y-2">
              {[
                { id: 'private', label: 'Privado', desc: 'Apenas requisições autenticadas com chaves de acesso' },
                { id: 'public-read', label: 'Público Leitura', desc: 'Objetos podem ser lidos publicamente (GET), escritas autenticadas' },
              ].map(opt => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                    publicAccess === opt.id
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-zinc-100'
                      : 'bg-[#121212] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="access"
                    value={opt.id}
                    checked={publicAccess === opt.id}
                    onChange={() => setPublicAccess(opt.id as any)}
                    className="mt-0.5 accent-emerald-500"
                  />
                  <div>
                    <span className="font-semibold block text-zinc-200">{opt.label}</span>
                    <span className="text-[11px] text-zinc-500">{opt.desc}</span>
                  </div>
                </label>
              ))}
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
              Criar Bucket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
