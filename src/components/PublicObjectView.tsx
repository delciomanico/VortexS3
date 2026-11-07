import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Download,
  Copy,
  Check,
  ArrowLeft,
  FileText,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Globe,
  Terminal,
  ExternalLink,
  Lock,
  Layers,
  Server,
  Code2,
} from 'lucide-react';
import { storageEngine } from '../services/storageEngine';
import { StorageObject, Bucket } from '../types/storage';

interface PublicObjectViewProps {
  bucketName: string;
  objectKey: string;
  hasPresignedSignature?: boolean;
  onGoToAdmin: () => void;
}

export const PublicObjectView: React.FC<PublicObjectViewProps> = ({
  bucketName,
  objectKey,
  hasPresignedSignature = false,
  onGoToAdmin,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [showHeaders, setShowHeaders] = useState(false);

  const cleanKey = decodeURIComponent(objectKey).replace(/^\/+/, '');
  const result = storageEngine.findPublicObject(bucketName, cleanKey);
  const bucket = result?.bucket || storageEngine.findPublicBucket(bucketName);
  const object = result?.object;

  const isPublicBucket = bucket ? (bucket.publicAccess === 'public-read' || bucket.publicAccess === 'public-read-write') : false;
  const isAuthorized = isPublicBucket || hasPresignedSignature;

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const directUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/s3/${bucketName}/${cleanKey}`
    : `/s3/${bucketName}/${cleanKey}`;
  const curlCommand = `curl -O "${directUrl}"`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleDownload = () => {
    if (object) {
      storageEngine.downloadStorageObject(object);
    }
  };

  // 1. If object not found (404 NoSuchKey)
  if (!object) {
    return (
      <div className="min-h-screen bg-[#121212] text-zinc-100 flex flex-col items-center justify-center p-6 font-mono">
        <div className="max-w-md w-full bg-[#171717] border border-zinc-800 rounded-xl p-8 shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">404 NoSuchKey</h1>
            <p className="text-xs text-zinc-400 mt-2 font-sans">
              O objeto especificado não existe ou foi removido do bucket.
            </p>
          </div>

          <div className="bg-[#121212] border border-zinc-800 rounded p-3 text-left text-xs text-zinc-400 space-y-1">
            <div><span className="text-zinc-600">Bucket:</span> <span className="text-zinc-300">{bucketName}</span></div>
            <div><span className="text-zinc-600">Key:</span> <span className="text-zinc-300">{cleanKey}</span></div>
            <div><span className="text-zinc-600">RequestId:</span> <span className="text-zinc-500 font-mono">tx-{Date.now().toString(36)}</span></div>
          </div>

          <button
            onClick={onGoToAdmin}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Painel Administrativo</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. If object exists but bucket is private and no presigned token (403 AccessDenied)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#121212] text-zinc-100 flex flex-col items-center justify-center p-6 font-mono">
        <div className="max-w-lg w-full bg-[#171717] border border-red-800/40 rounded-xl p-8 shadow-2xl text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
              HTTP 403 Forbidden
            </span>
            <h1 className="text-xl font-bold text-zinc-100 mt-2">AccessDenied (Acesso Negado)</h1>
            <p className="text-xs text-zinc-400 mt-2 font-sans">
              O bucket <strong className="text-zinc-200">{bucketName}</strong> está configurado com permissão privada.
              Requisições anônimas diretas a este objeto são bloqueadas pelas políticas de segurança S3.
            </p>
          </div>

          <div className="bg-[#121212] border border-zinc-800 rounded-lg p-3.5 text-left text-xs space-y-2">
            <div className="flex justify-between text-zinc-400">
              <span className="text-zinc-500">Resource:</span>
              <span className="font-mono text-zinc-300 truncate max-w-xs">s3://{bucketName}/{cleanKey}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span className="text-zinc-500">Bucket Policy:</span>
              <span className="text-amber-400 font-medium">private (Restrito)</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span className="text-zinc-500">Signature:</span>
              <span className="text-zinc-500">Missing SigV4 Authorization Token</span>
            </div>
          </div>

          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-left text-xs text-zinc-400 font-sans space-y-1">
            <p className="font-semibold text-zinc-200">Como obter acesso:</p>
            <ul className="list-disc list-inside text-[11px] space-y-1 text-zinc-400">
              <li>O proprietário do bucket pode alterar o acesso para <strong>public-read</strong> no console.</li>
              <li>Ou gerar uma <strong>URL Pré-assinada (Presigned URL)</strong> com token SigV4 temporário.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              onClick={onGoToAdmin}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Entrar no Console do Bucket</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authorized (200 OK) - Render Full Public Object Viewer
  const isImage = object.contentType?.startsWith('image/');
  const isText = object.contentType?.startsWith('text/') || object.contentType?.includes('json') || object.contentType?.includes('javascript');
  const isSvg = object.contentType === 'image/svg+xml';

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800 bg-[#171717] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-zinc-100">VortexS3</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PUBLIC OBJECT
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              s3://{object.bucketName}/{object.key}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onGoToAdmin}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Console Admin</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {/* Object Hero Banner */}
        <div className="bg-[#171717] border border-zinc-800 rounded-xl p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  HTTP 200 OK
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  {object.contentType}
                </span>
              </div>
              <h1 className="text-xl font-bold text-zinc-100 font-mono break-all">
                {object.key.split('/').pop()}
              </h1>
              <p className="text-xs text-zinc-400 font-mono">
                Bucket: <strong className="text-zinc-200">{object.bucketName}</strong> • Tamanho: <strong className="text-zinc-200">{formatSize(object.sizeBytes)}</strong> • Classe: <strong className="text-zinc-200">{object.storageClass}</strong>
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors cursor-pointer"
                title="Copiar link público"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Link Copiado!' : 'Copiar URL'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Arquivo</span>
              </button>
            </div>
          </div>

          {/* Inline Preview Container */}
          <div className="pt-6">
            <div className="text-xs font-medium text-zinc-400 mb-2 flex items-center justify-between">
              <span>Pré-visualização do Objeto</span>
              <span className="text-[11px] text-zinc-500 font-mono">ETag: {object.etag}</span>
            </div>

            <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden min-h-[220px] flex items-center justify-center p-4">
              {isImage && object.dataUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={object.dataUrl}
                    alt={object.key}
                    className="max-h-[420px] max-w-full rounded-lg object-contain shadow-md"
                  />
                  <span className="text-[11px] font-mono text-zinc-500">
                    Visualização renderizada inline
                  </span>
                </div>
              ) : isSvg && object.dataUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={object.dataUrl}
                    alt={object.key}
                    className="max-h-[300px] max-w-full"
                  />
                  <span className="text-[11px] font-mono text-zinc-500">
                    Vetor SVG renderizado
                  </span>
                </div>
              ) : isText && object.dataUrl ? (
                <pre className="text-xs font-mono text-zinc-300 w-full overflow-x-auto p-4 bg-zinc-950/80 rounded-lg">
                  {decodeURIComponent(object.dataUrl.replace('data:text/plain;utf8,', ''))}
                </pre>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-emerald-400 mx-auto">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">{object.key.split('/').pop()}</p>
                    <p className="text-xs text-zinc-500 font-mono mt-1">
                      {object.contentType} • {formatSize(object.sizeBytes)}
                    </p>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download Direto</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Technical Details & S3 Headers Card */}
        <div className="bg-[#171717] border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                S3 HTTP Response Headers (RFC 7230)
              </h3>
            </div>
            <button
              onClick={() => setShowHeaders(!showHeaders)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-mono cursor-pointer"
            >
              {showHeaders ? 'Ocultar Cabeçalhos' : 'Ver Todos Cabeçalhos'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 bg-[#121212] border border-zinc-800/80 rounded-lg">
              <span className="text-zinc-500 block text-[10px] uppercase font-sans">Content-Type</span>
              <span className="text-zinc-200 font-semibold">{object.contentType}</span>
            </div>
            <div className="p-3 bg-[#121212] border border-zinc-800/80 rounded-lg">
              <span className="text-zinc-500 block text-[10px] uppercase font-sans">Content-Length</span>
              <span className="text-zinc-200 font-semibold">{object.sizeBytes} bytes</span>
            </div>
            <div className="p-3 bg-[#121212] border border-zinc-800/80 rounded-lg">
              <span className="text-zinc-500 block text-[10px] uppercase font-sans">ETag</span>
              <span className="text-emerald-400 font-semibold select-all">{object.etag}</span>
            </div>
            <div className="p-3 bg-[#121212] border border-zinc-800/80 rounded-lg">
              <span className="text-zinc-500 block text-[10px] uppercase font-sans">Last-Modified</span>
              <span className="text-zinc-200">{new Date(object.lastModified).toUTCString()}</span>
            </div>
          </div>

          {showHeaders && (
            <div className="bg-[#121212] border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-400 space-y-1 select-all">
              <div>HTTP/1.1 200 OK</div>
              <div>Date: {new Date().toUTCString()}</div>
              <div>Server: VortexS3-Engine/2.4 (Distributed Cluster)</div>
              <div>Accept-Ranges: bytes</div>
              <div>Content-Type: {object.contentType}</div>
              <div>Content-Length: {object.sizeBytes}</div>
              <div>ETag: {object.etag}</div>
              <div>Last-Modified: {new Date(object.lastModified).toUTCString()}</div>
              <div>x-amz-storage-class: {object.storageClass}</div>
              <div>x-amz-server-side-encryption: {object.encryption || 'none'}</div>
              <div>x-amz-version-id: {object.versionId || 'null'}</div>
              <div>x-amz-request-id: tx-{Date.now().toString(36)}</div>
              <div>Access-Control-Allow-Origin: *</div>
            </div>
          )}

          {/* cURL Snippet */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5 font-mono">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                <span>Comando cURL de Terminal</span>
              </div>
              <button
                onClick={handleCopyCurl}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                {copiedCurl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCurl ? 'Copiado!' : 'Copiar cURL'}</span>
              </button>
            </div>
            <div className="bg-[#121212] border border-zinc-800 rounded-lg p-2.5 font-mono text-xs text-emerald-400 truncate select-all">
              {curlCommand}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
