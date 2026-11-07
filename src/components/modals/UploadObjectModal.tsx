import React, { useState, useRef } from 'react';
import { X, UploadCloud, AlertCircle, FileText, Plus, Trash2 } from 'lucide-react';
import { storageEngine } from '../../services/storageEngine';
import { replicationEngine } from '../../services/replicationEngine';
import { StorageObject } from '../../types/storage';

interface UploadObjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  bucketName: string;
  initialPrefix?: string;
  onObjectUploaded: (obj: StorageObject) => void;
}

export const UploadObjectModal: React.FC<UploadObjectModalProps> = ({
  isOpen,
  onClose,
  bucketName,
  initialPrefix = '',
  onObjectUploaded,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [prefix, setPrefix] = useState(initialPrefix);
  const [customKey, setCustomKey] = useState('');
  const [metadataItems, setMetadataItems] = useState<{ key: string; val: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!customKey) {
        setCustomKey(file.name);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!customKey) {
        setCustomKey(file.name);
      }
    }
  };

  const addMetadataField = () => {
    setMetadataItems([...metadataItems, { key: '', val: '' }]);
  };

  const removeMetadataField = (index: number) => {
    setMetadataItems(metadataItems.filter((_, i) => i !== index));
  };

  const updateMetadataField = (index: number, field: 'key' | 'val', value: string) => {
    const updated = [...metadataItems];
    updated[index][field] = value;
    setMetadataItems(updated);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Selecione um arquivo para upload.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const finalKey = prefix ? `${prefix.replace(/\/+$/, '')}/${customKey || selectedFile.name}` : (customKey || selectedFile.name);

      const metadata: Record<string, string> = {};
      metadataItems.forEach(item => {
        if (item.key.trim() && item.val.trim()) {
          const k = item.key.startsWith('x-amz-meta-') ? item.key : `x-amz-meta-${item.key}`;
          metadata[k] = item.val;
        }
      });

      const obj = await storageEngine.putObject({
        bucketName,
        key: finalKey,
        fileOrContent: selectedFile,
        contentType: selectedFile.type,
        customMetadata: metadata,
      });

      // Dispara replicação no cluster
      replicationEngine.handleObjectPut(bucketName, finalKey, obj.sizeBytes);
      storageEngine.updateObjectReplicationStatus(obj.id, 'synced');

      onObjectUploaded(obj);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha no upload do arquivo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#171717] border border-zinc-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Upload de Objeto</h3>
            <p className="text-[11px] text-zinc-500 font-mono">Bucket: {bucketName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleUpload} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Box */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-zinc-700 hover:border-emerald-500/80 rounded-lg p-5 text-center cursor-pointer transition-colors bg-[#121212]"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex flex-col items-center">
                <FileText className="w-7 h-7 text-emerald-400 mb-1.5" />
                <span className="text-xs font-semibold text-zinc-200 font-mono break-all max-w-xs">{selectedFile.name}</span>
                <span className="text-[11px] text-zinc-500 mt-0.5 tabular-nums">
                  {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type || 'binário'}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <UploadCloud className="w-7 h-7 text-zinc-400 mb-1.5" />
                <span className="text-xs font-medium text-zinc-300">Arraste seu arquivo ou clique para escolher</span>
                <span className="text-[11px] text-zinc-500 mt-0.5">Qualquer formato ou extensão binária</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Prefixo (Pasta)
              </label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="ex: assets/v1/"
                className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Chave (Nome)
              </label>
              <input
                type="text"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder={selectedFile ? selectedFile.name : 'arquivo.ext'}
                className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Metadados Customizados */}
          <div className="pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-300">Metadados Customizados</span>
              <button
                type="button"
                onClick={addMetadataField}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-medium"
              >
                <Plus className="w-3 h-3" />
                Adicionar Tag
              </button>
            </div>
            {metadataItems.length > 0 && (
              <div className="space-y-2 max-h-28 overflow-y-auto">
                {metadataItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="chave"
                      value={item.key}
                      onChange={(e) => updateMetadataField(idx, 'key', e.target.value)}
                      className="flex-1 bg-[#121212] border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="valor"
                      value={item.val}
                      onChange={(e) => updateMetadataField(idx, 'val', e.target.value)}
                      className="flex-1 bg-[#121212] border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeMetadataField(idx)}
                      className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {isUploading ? (
                <>
                  <div className="w-3 h-3 border-2 border-zinc-900/40 border-t-zinc-900 rounded-full animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <span>Enviar Objeto</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
