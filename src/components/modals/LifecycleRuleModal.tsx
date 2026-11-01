import React, { useState } from 'react';
import { X, Clock } from 'lucide-react';
import { storageEngine } from '../../services/storageEngine';
import { LifecycleRule } from '../../types/storage';

interface LifecycleRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  bucketName: string;
  onRuleCreated: (rule: LifecycleRule) => void;
}

export const LifecycleRuleModal: React.FC<LifecycleRuleModalProps> = ({
  isOpen,
  onClose,
  bucketName,
  onRuleCreated,
}) => {
  const [prefix, setPrefix] = useState('');
  const [expirationDays, setExpirationDays] = useState(30);
  const [enableTransition, setEnableTransition] = useState(false);
  const [transitionDays, setTransitionDays] = useState(90);
  const [transitionClass, setTransitionClass] = useState<'GLACIER' | 'INTELLIGENT_TIERING'>('GLACIER');
  const [abortMultipartDays, setAbortMultipartDays] = useState(7);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = storageEngine.createLifecycleRule({
      bucketName,
      prefix: prefix.trim(),
      status: 'Enabled',
      expirationDays,
      transitionDays: enableTransition ? transitionDays : undefined,
      transitionStorageClass: enableTransition ? transitionClass : undefined,
      abortIncompleteMultipartDays: abortMultipartDays || undefined,
    });
    onRuleCreated(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#171717] border border-zinc-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Regra de Ciclo de Vida (Lifecycle)</h3>
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
            <label className="block text-xs font-medium text-zinc-400 mb-1">Bucket Alvo</label>
            <div className="bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 font-semibold">
              {bucketName}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Prefixo / Pasta (Opcional)
            </label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="ex: logs/ ou uploads/temp/"
              className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Expirar Objetos (Dias)
              </label>
              <input
                type="number"
                min="1"
                max="3650"
                value={expirationDays}
                onChange={(e) => setExpirationDays(Number(e.target.value))}
                className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 tabular-nums font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Limpar Multipart (Dias)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={abortMultipartDays}
                onChange={(e) => setAbortMultipartDays(Number(e.target.value))}
                className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 tabular-nums font-mono"
              />
            </div>
          </div>

          {/* Transição para Cold Storage */}
          <div className="pt-2 border-t border-zinc-800 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableTransition}
                onChange={(e) => setEnableTransition(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 accent-emerald-500"
              />
              <span className="text-xs font-medium text-zinc-200">
                Ativar transição para Cold Tier (Glacier)
              </span>
            </label>

            {enableTransition && (
              <div className="grid grid-cols-2 gap-2.5 pl-5">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Dias para transição:</label>
                  <input
                    type="number"
                    min="1"
                    max={expirationDays - 1}
                    value={transitionDays}
                    onChange={(e) => setTransitionDays(Number(e.target.value))}
                    className="w-full bg-[#121212] border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 tabular-nums font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Classe:</label>
                  <select
                    value={transitionClass}
                    onChange={(e) => setTransitionClass(e.target.value as any)}
                    className="w-full bg-[#121212] border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="GLACIER">GLACIER</option>
                    <option value="INTELLIGENT_TIERING">INTELLIGENT_TIERING</option>
                  </select>
                </div>
              </div>
            )}
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
              Salvar Regra
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
