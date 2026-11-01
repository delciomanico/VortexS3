import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileText,
  Shield,
  Lock,
  Layers,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { StorageObject } from '../../types/storage';
import { storageEngine } from '../../services/storageEngine';

interface ObjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  object: StorageObject | null;
  onPresignedUrlClick: (obj: StorageObject) => void;
}

export const ObjectDetailModal: React.FC<ObjectDetailModalProps> = ({
  isOpen,
  onClose,
  object,
  onPresignedUrlClick,
}) => {
  const [copiedUri, setCopiedUri] = useState(false);
  const [copiedEtag, setCopiedEtag] = useState(false);
  const [legalHoldState, setLegalHoldState] = useState<boolean>(object?.legalHold || false);

  if (!isOpen || !object) return null;

  const s3Uri = `s3://${object.bucketName}/${object.key}`;

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const handleCopyUri = () => {
    navigator.clipboard.writeText(s3Uri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  const handleCopyEtag = () => {
    navigator.clipboard.writeText(object.etag.replace(/"/g, ''));
    setCopiedEtag(true);
    setTimeout(() => setCopiedEtag(false), 2000);
  };

  const handleToggleLegalHold = () => {
    const updated = storageEngine.toggleLegalHold(object.bucketName, object.key);
    setLegalHoldState(updated);
  };

  const handleDownload = () => {
    if (object.dataUrl) {
      const a = document.createElement('a');
      a.href = object.dataUrl;
      a.download = object.key.split('/').pop() || 'objeto';
      a.click();
    } else {
      const content = `[VortexS3 Object Payload]\nBucket: ${object.bucketName}\nKey: ${object.key}\nETag: ${object.etag}\nSize: ${object.sizeBytes} bytes\nEncryption: ${object.encryption || 'AES256'}`;
      const blob = new Blob([content], { type: object.contentType || 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = object.key.split('/').pop() || 'objeto';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const isImage = object.contentType.startsWith('image/');
  const shards = object.shards || storageEngine.createErasureShards(object.id, object.sizeBytes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#171717] border border-zinc-800 rounded-xl max-w-xl w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Metadados & Núcleo Técnico do Objeto</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* S3 URI */}
          <div>
            <span className="text-[11px] font-medium text-zinc-400 block mb-1">Caminho S3 (URI)</span>
            <div className="flex items-center justify-between gap-2 bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2">
              <span className="text-xs font-mono text-emerald-400 truncate select-all">{s3Uri}</span>
              <button
                onClick={handleCopyUri}
                className="text-zinc-400 hover:text-zinc-200 shrink-0 p-1 cursor-pointer"
                title="Copiar URI"
              >
                {copiedUri ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Security & WORM Status Bar */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 bg-[#121212] border border-zinc-800 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase font-sans">Criptografia SSE-S3</span>
                <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1.5 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{object.encryptionCipher || 'AES-256-GCM'}</span>
                </span>
              </div>
              <span className="text-[10px] text-zinc-500">Envelope Ativo</span>
            </div>

            <div className="p-2.5 bg-[#121212] border border-zinc-800 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase font-sans">Object Lock (WORM)</span>
                <span className={`font-semibold text-xs flex items-center gap-1.5 mt-0.5 ${
                  legalHoldState || object.retentionUntil ? 'text-amber-400' : 'text-zinc-400'
                }`}>
                  <Lock className="w-3.5 h-3.5" />
                  <span>{legalHoldState ? 'Legal Hold Ativo' : object.retentionUntil ? 'Retenção Ativa' : 'Desprotegido'}</span>
                </span>
              </div>

              <button
                onClick={handleToggleLegalHold}
                className={`px-2 py-0.5 text-[10px] rounded border transition-colors cursor-pointer ${
                  legalHoldState
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
                title="Alterna bloqueio jurídico contra exclusão"
              >
                {legalHoldState ? 'Remover Hold' : 'Aplicar Hold'}
              </button>
            </div>
          </div>

          {/* Erasure Coding 4+2 Shards Grid */}
          <div className="p-3 bg-[#121212] border border-zinc-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Fragmentação Erasure Coding (Reed-Solomon 4+2)</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-500">6 Shards Distribuídos</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-[11px] font-mono">
              {shards.map(s => {
                const isCorrupt = s.status === 'corrupted';
                const isHealed = s.status === 'healed';

                return (
                  <div
                    key={s.shardIndex}
                    className={`p-2 rounded border flex flex-col justify-between ${
                      isCorrupt
                        ? 'bg-red-950/20 border-red-800/60 text-red-300'
                        : isHealed
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-[#171717] border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{s.type === 'data' ? `D${s.shardIndex}` : `P${s.shardIndex - 4}`}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isCorrupt ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'
                      }`} />
                    </div>
                    <span className="text-[9px] text-zinc-500 truncate mt-1">{s.nodeName.split('-')[1]}</span>
                    <span className="text-[9px] mt-0.5 font-bold uppercase truncate">
                      {isCorrupt ? 'Danificado' : isHealed ? 'Curado' : 'Íntegro'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Image Preview */}
          {isImage && object.dataUrl && (
            <div className="bg-[#121212] border border-zinc-800 rounded-lg p-2.5 flex items-center justify-center max-h-44 overflow-hidden">
              <img
                src={object.dataUrl}
                alt={object.key}
                referrerPolicy="no-referrer"
                className="max-h-36 max-w-full object-contain rounded"
              />
            </div>
          )}

          {/* Key Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-[#121212] border border-zinc-800 rounded-lg p-3">
              <span className="text-zinc-500 block text-[10px] uppercase font-sans">Tamanho</span>
              <span className="text-zinc-200 font-medium block mt-1 tabular-nums">
                {formatSize(object.sizeBytes)}
              </span>
            </div>

            <div className="bg-[#121212] border border-zinc-800 rounded-lg p-3">
              <span className="text-zinc-500 block text-[10px] uppercase font-sans">Content-Type</span>
              <span className="text-zinc-200 font-medium block mt-1 truncate">
                {object.contentType}
              </span>
            </div>

            <div className="bg-[#121212] border border-zinc-800 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[10px] uppercase font-sans">ETag (MD5)</span>
                <button onClick={handleCopyEtag} className="text-zinc-500 hover:text-zinc-300 cursor-pointer">
                  {copiedEtag ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <span className="text-zinc-200 font-medium block mt-1 truncate">
                {object.etag}
              </span>
            </div>

            <div className="bg-[#121212] border border-zinc-800 rounded-lg p-3">
              <span className="text-zinc-500 block text-[10px] uppercase font-sans">Data de Modificação</span>
              <span className="text-zinc-200 font-medium block mt-1 text-[11px]">
                {new Date(object.lastModified).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
            <button
              onClick={() => {
                onClose();
                onPresignedUrlClick(object);
              }}
              className="px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer"
            >
              Presigned URL
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                Fechar
              </button>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
