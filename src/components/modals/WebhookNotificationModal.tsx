import React, { useState } from 'react';
import { X, Bell } from 'lucide-react';
import { storageEngine } from '../../services/storageEngine';
import { BucketEventNotification } from '../../types/storage';

interface WebhookNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bucketName: string;
  onWebhookCreated: (wh: BucketEventNotification) => void;
}

export const WebhookNotificationModal: React.FC<WebhookNotificationModalProps> = ({
  isOpen,
  onClose,
  bucketName,
  onWebhookCreated,
}) => {
  const [endpointUrl, setEndpointUrl] = useState('');
  const [createdEvent, setCreatedEvent] = useState(true);
  const [removedEvent, setRemovedEvent] = useState(true);
  const [restoreEvent, setRestoreEvent] = useState(false);
  const [prefixFilter, setPrefixFilter] = useState('');
  const [suffixFilter, setSuffixFilter] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const events: BucketEventNotification['events'] = [];
    if (createdEvent) events.push('s3:ObjectCreated:*');
    if (removedEvent) events.push('s3:ObjectRemoved:*');
    if (restoreEvent) events.push('s3:ObjectRestore:*');

    if (events.length === 0) {
      alert('Selecione ao menos um tipo de evento');
      return;
    }

    const created = storageEngine.createWebhook({
      bucketName,
      endpointUrl: endpointUrl.trim(),
      events,
      prefixFilter: prefixFilter.trim() || undefined,
      suffixFilter: suffixFilter.trim() || undefined,
    });

    onWebhookCreated(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#171717] border border-zinc-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Configurar Webhook S3</h3>
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
            <label className="block text-xs font-medium text-zinc-400 mb-1">Bucket</label>
            <div className="bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 font-semibold">
              {bucketName}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              URL do Webhook (HTTP POST)
            </label>
            <input
              type="url"
              required
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="https://api.meusite.com/s3/eventos"
              className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">
              Eventos Monitorados
            </label>
            <div className="space-y-2 text-xs font-mono">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createdEvent}
                  onChange={(e) => setCreatedEvent(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 accent-emerald-500"
                />
                <span className="text-zinc-200">s3:ObjectCreated:* (Uploads / PUT)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removedEvent}
                  onChange={(e) => setRemovedEvent(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 accent-emerald-500"
                />
                <span className="text-zinc-200">s3:ObjectRemoved:* (Exclusões)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restoreEvent}
                  onChange={(e) => setRestoreEvent(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 accent-emerald-500"
                />
                <span className="text-zinc-200">s3:ObjectRestore:* (Restaurações)</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Filtro Prefixo (Opcional)
              </label>
              <input
                type="text"
                value={prefixFilter}
                onChange={(e) => setPrefixFilter(e.target.value)}
                placeholder="ex: fotos/"
                className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Filtro Sufixo (Opcional)
              </label>
              <input
                type="text"
                value={suffixFilter}
                onChange={(e) => setSuffixFilter(e.target.value)}
                placeholder="ex: .jpg ou .pdf"
                className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
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
              Salvar Webhook
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
