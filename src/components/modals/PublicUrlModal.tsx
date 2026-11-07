import React, { useState } from 'react';
import {
  X,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Unlock,
  Terminal,
  Code2,
  FileText,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { StorageObject, Bucket } from '../../types/storage';
import { storageEngine } from '../../services/storageEngine';

interface PublicUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  object: StorageObject | null;
  onBucketAccessChanged?: () => void;
}

export const PublicUrlModal: React.FC<PublicUrlModalProps> = ({
  isOpen,
  onClose,
  object,
  onBucketAccessChanged,
}) => {
  const [copiedDirect, setCopiedDirect] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [activeSnippetTab, setActiveSnippetTab] = useState<'curl' | 'html' | 'js' | 'aws'>('curl');

  if (!isOpen || !object) return null;

  const bucket = storageEngine.getBucket(object.bucketName) || storageEngine.findPublicBucket(object.bucketName);
  const isBucketPublic = bucket ? (bucket.publicAccess === 'public-read' || bucket.publicAccess === 'public-read-write') : false;

  const { directUrl, shareUrl, curlSnippet } = storageEngine.getPublicUrl(object.bucketName, object.key);

  const handleCopyDirect = () => {
    navigator.clipboard.writeText(directUrl);
    setCopiedDirect(true);
    setTimeout(() => setCopiedDirect(false), 2000);
  };

  const handleCopyShare = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleToggleAccess = () => {
    storageEngine.toggleBucketPublicAccess(object.bucketName);
    if (onBucketAccessChanged) {
      onBucketAccessChanged();
    }
  };

  const isImage = object.contentType?.startsWith('image/');

  const snippets = {
    curl: curlSnippet,
    html: isImage
      ? `<img src="${directUrl}" alt="${object.key.split('/').pop()}" />`
      : `<a href="${directUrl}" download="${object.key.split('/').pop()}">Baixar ${object.key.split('/').pop()}</a>`,
    js: `// Acesso público direto via Fetch API
const response = await fetch("${directUrl}");
const blob = await response.blob();`,
    aws: `# Download sem necessidade de credenciais AWS (acesso anônimo)
aws s3 cp "s3://${object.bucketName}/${object.key}" ./ --no-sign-request`,
  };

  const handleCopySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleOpenViewer = () => {
    window.open(shareUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#171717] border border-zinc-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100">URL Pública do Arquivo</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Object identity */}
          <div>
            <span className="text-[11px] font-medium text-zinc-400 block mb-1">Caminho S3</span>
            <div className="bg-[#121212] border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-300 break-all flex items-center justify-between">
              <span className="text-emerald-400 truncate">s3://{object.bucketName}/{object.key}</span>
              <span className="text-zinc-500 text-[10px] shrink-0 ml-2">{object.contentType}</span>
            </div>
          </div>

          {/* Access Status Banner */}
          <div className={`p-3 rounded-lg border text-xs ${
            isBucketPublic
              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
              : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                {isBucketPublic ? (
                  <Globe className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold text-xs">
                    {isBucketPublic
                      ? 'Bucket Público (Acesso Livre Habilitado)'
                      : 'Bucket Privado (Acesso Anônimo Bloqueado)'}
                  </p>
                  <p className="text-[11px] mt-0.5 text-zinc-300">
                    {isBucketPublic
                      ? 'Qualquer pessoa com o link pode acessar e baixar este arquivo diretamente no navegador sem autenticação.'
                      : 'Visitantes anônimos receberão erro HTTP 403 AccessDenied, a menos que o bucket seja tornado público.'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleToggleAccess}
                className={`shrink-0 px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isBucketPublic
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                    : 'bg-emerald-400 hover:bg-emerald-300 text-zinc-950 shadow-sm'
                }`}
              >
                {isBucketPublic ? (
                  <>
                    <Lock className="w-3 h-3" />
                    <span>Tornar Privado</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3 h-3" />
                    <span>Liberar Acesso Público</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Main Direct Public URL */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label className="font-medium text-zinc-300">URL Pública Direta (S3 Endpoint)</label>
              <span className="text-[10px] text-zinc-500 font-mono">GET /s3/{object.bucketName}/*</span>
            </div>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={directUrl}
                className="w-full bg-[#121212] border border-zinc-800 rounded-lg pl-3 pr-24 py-2 text-xs font-mono text-zinc-200 focus:outline-none"
              />
              <div className="absolute right-1 top-1 bottom-1 flex items-center gap-1">
                <button
                  onClick={handleCopyDirect}
                  className="px-2.5 py-1 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold rounded text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="Copiar URL direta"
                >
                  {copiedDirect ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDirect ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Universal Share / Viewer Link */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label className="font-medium text-zinc-300">Link de Compartilhamento Direto</label>
              <button
                onClick={handleOpenViewer}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-medium"
              >
                <span>Abrir em Nova Aba</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-[#121212] border border-zinc-800 rounded-lg pl-3 pr-20 py-2 text-xs font-mono text-zinc-300 focus:outline-none"
              />
              <button
                onClick={handleCopyShare}
                className="absolute right-1 top-1 bottom-1 px-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded text-xs flex items-center gap-1 transition-colors cursor-pointer border border-zinc-700"
              >
                {copiedShare ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedShare ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Integration Snippets Tabs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-zinc-400">Como Consumir / Integrar</span>
            </div>

            <div className="bg-[#121212] border border-zinc-800 rounded-lg overflow-hidden">
              <div className="flex border-b border-zinc-800 text-[11px] font-mono bg-zinc-950/60">
                {(['curl', 'html', 'js', 'aws'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveSnippetTab(tab)}
                    className={`px-3 py-1.5 border-b-2 font-medium transition-colors cursor-pointer uppercase ${
                      activeSnippetTab === tab
                        ? 'border-emerald-400 text-emerald-400 bg-zinc-900/40'
                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-3 relative">
                <pre className="text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all pr-8">
                  {snippets[activeSnippetTab]}
                </pre>
                <button
                  onClick={() => handleCopySnippet(snippets[activeSnippetTab])}
                  className="absolute top-2.5 right-2.5 p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors cursor-pointer"
                  title="Copiar código"
                >
                  {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleOpenViewer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Testar Visualizador Público</span>
            </button>

            <button
              type="button"
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
