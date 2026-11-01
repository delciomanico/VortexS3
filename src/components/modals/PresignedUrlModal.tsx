import React, { useState } from 'react';
import { X, Link2, Copy, Check, Terminal } from 'lucide-react';
import { storageEngine } from '../../services/storageEngine';
import { StorageObject } from '../../types/storage';

interface PresignedUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  object: StorageObject | null;
}

export const PresignedUrlModal: React.FC<PresignedUrlModalProps> = ({
  isOpen,
  onClose,
  object,
}) => {
  const [duration, setDuration] = useState<number>(3600);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  if (!isOpen || !object) return null;

  const { url, expiresAt, curlSnippet } = storageEngine.generatePresignedUrl(
    object.bucketName,
    object.key,
    duration
  );

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlSnippet);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#171717] border border-zinc-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100">URL Pré-Assinada (S3 Presigned)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Objeto</label>
            <div className="bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 break-all">
              s3://{object.bucketName}/{object.key}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-zinc-300">Validade</span>
              <span className="text-zinc-500 font-mono text-[11px]">Expira: {new Date(expiresAt).toLocaleTimeString()}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '15 min', val: 900 },
                { label: '1 hora', val: 3600 },
                { label: '24 horas', val: 86400 },
                { label: '7 dias', val: 604800 },
              ].map(item => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setDuration(item.val)}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    duration === item.val
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-semibold'
                      : 'bg-[#121212] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generated URL Box */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">URL Temporária SigV4</label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={url}
                className="w-full bg-[#121212] border border-zinc-800 rounded-lg pl-3 pr-20 py-2 text-xs font-mono text-zinc-300 focus:outline-none"
              />
              <button
                onClick={handleCopyUrl}
                className="absolute right-1 top-1 bottom-1 px-3 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold rounded text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* cURL snippet */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-zinc-400" />
              <span>Comando cURL de Download</span>
            </label>
            <div className="bg-[#121212] border border-zinc-800 rounded-lg p-2.5 flex items-center justify-between gap-3">
              <code className="text-[11px] font-mono text-emerald-400 truncate select-all">{curlSnippet}</code>
              <button
                onClick={handleCopyCurl}
                className="text-zinc-400 hover:text-zinc-200 p-1 shrink-0 cursor-pointer"
                title="Copiar comando cURL"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-zinc-800">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
