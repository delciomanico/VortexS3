import React, { useState } from 'react';
import { X, KeyRound, Copy, Check, Download, AlertTriangle } from 'lucide-react';
import { storageEngine } from '../../services/storageEngine';
import { IAMAccessKey, Bucket } from '../../types/storage';

interface CreateAccessKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  buckets: Bucket[];
  onKeyCreated: (key: IAMAccessKey) => void;
}

export const CreateAccessKeyModal: React.FC<CreateAccessKeyModalProps> = ({
  isOpen,
  onClose,
  buckets,
  onKeyCreated,
}) => {
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<IAMAccessKey['permissions']>('read-write');
  const [selectedBucket, setSelectedBucket] = useState<string>('*');
  const [generatedKey, setGeneratedKey] = useState<IAMAccessKey | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const created = storageEngine.createAccessKey({
      name: name || 'Credencial de Aplicação',
      permissions,
      allowedBuckets: selectedBucket === '*' ? ['*'] : [selectedBucket],
    });
    setGeneratedKey(created);
    onKeyCreated(created);
  };

  const handleDownloadEnv = () => {
    if (!generatedKey) return;
    const envContent = `# VortexS3 AWS S3 Credentials\nAWS_ACCESS_KEY_ID=${generatedKey.accessKeyId}\nAWS_SECRET_ACCESS_KEY=${generatedKey.secretAccessKey}\nAWS_ENDPOINT_URL=http://localhost:9000\nAWS_REGION=us-east-1\nS3_USE_PATH_STYLE_ENDPOINT=true\n`;
    const blob = new Blob([envContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vortexs3-${generatedKey.accessKeyId}.env`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#171717] border border-zinc-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Criar Chave de Acesso S3</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!generatedKey ? (
          <form onSubmit={handleGenerate} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Nome de Identificação
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Backend App / Backup Worker"
                className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Permissões
                </label>
                <select
                  value={permissions}
                  onChange={(e) => setPermissions(e.target.value as any)}
                  className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="read-write">Leitura & Escrita</option>
                  <option value="read-only">Somente Leitura</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Escopo de Buckets
                </label>
                <select
                  value={selectedBucket}
                  onChange={(e) => setSelectedBucket(e.target.value)}
                  className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="*">Todos (*)</option>
                  {buckets.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
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
                Gerar Chave
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Copie a Secret Key agora</span>
                <span className="text-[11px] text-amber-300/80">
                  Por segurança, ela não será exibida novamente após fechar esta janela.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Access Key ID</label>
              <div className="flex items-center justify-between bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2">
                <span className="font-mono text-xs text-zinc-100 select-all">{generatedKey.accessKeyId}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedKey.accessKeyId);
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  className="text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Secret Access Key</label>
              <div className="flex items-center justify-between bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2">
                <span className="font-mono text-xs text-emerald-400 select-all">{generatedKey.secretAccessKey}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedKey.secretAccessKey);
                    setCopiedSecret(true);
                    setTimeout(() => setCopiedSecret(false), 2000);
                  }}
                  className="text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer"
                >
                  {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={handleDownloadEnv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar .env</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
