import React, { useState } from 'react';
import { Download, Copy, Check, Terminal, FileCode, ChevronRight } from 'lucide-react';
import { generateGoProjectFiles, downloadGoProjectAsZip } from '../services/goCodeGenerator';

export const DockerHubExporter: React.FC = () => {
  const [dockerUser, setDockerUser] = useState('delciomanico2003');
  const [imageName, setImageName] = useState('vortexs3');
  const [versionTag, setVersionTag] = useState('v1.0.0');
  const [selectedFilePath, setSelectedFilePath] = useState('Dockerfile');
  const [copiedFile, setCopiedFile] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  const files = generateGoProjectFiles({
    dockerHubUsername: dockerUser,
    imageName: imageName,
    version: versionTag,
  });

  const selectedFile = files.find(f => f.path === selectedFilePath) || files[0];

  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);
    try {
      await downloadGoProjectAsZip({
        dockerHubUsername: dockerUser,
        imageName: imageName,
        version: versionTag,
      });
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleCopyCmd = (cmd: string, key: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(key);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const dockerBuildxCommand = `docker buildx build --platform linux/amd64,linux/arm64 -t ${dockerUser}/${imageName}:${versionTag} -t ${dockerUser}/${imageName}:latest --push .`;
  const dockerRunCommand = `docker run -d --name ${imageName} -p 9000:9000 -p 9001:9001 -v /var/data/storage:/data ${dockerUser}/${imageName}:latest`;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
        <div>
          <h2 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wider">
            Docker Hub & Exportação Go
          </h2>
          <span className="text-xs text-zinc-500 font-mono">
            Binário estático Go compilado &lt; 25MB Multi-Arch
          </span>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={isDownloadingZip}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isDownloadingZip ? 'Compactando...' : 'Baixar Código Go (.zip)'}</span>
        </button>
      </div>

      {/* Target Config */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs font-mono">
        <div>
          <label className="block text-zinc-400 mb-1">Usuário Docker Hub</label>
          <input
            type="text"
            value={dockerUser}
            onChange={(e) => setDockerUser(e.target.value.trim().toLowerCase())}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-zinc-400 mb-1">Repositório</label>
          <input
            type="text"
            value={imageName}
            onChange={(e) => setImageName(e.target.value.trim().toLowerCase())}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-zinc-400 mb-1">Tag</label>
          <input
            type="text"
            value={versionTag}
            onChange={(e) => setVersionTag(e.target.value.trim())}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Command strips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-zinc-400">
            <span>Buildx & Push Multi-Arch</span>
            <button
              onClick={() => handleCopyCmd(dockerBuildxCommand, 'buildx')}
              className="text-emerald-400 hover:text-emerald-300 cursor-pointer"
            >
              {copiedCommand === 'buildx' ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <code className="block p-2 bg-zinc-950 rounded border border-zinc-800 text-[11px] text-zinc-300 break-all select-all">
            {dockerBuildxCommand}
          </code>
        </div>

        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-zinc-400">
            <span>Rodar Container</span>
            <button
              onClick={() => handleCopyCmd(dockerRunCommand, 'run')}
              className="text-emerald-400 hover:text-emerald-300 cursor-pointer"
            >
              {copiedCommand === 'run' ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <code className="block p-2 bg-zinc-950 rounded border border-zinc-800 text-[11px] text-zinc-300 break-all select-all">
            {dockerRunCommand}
          </code>
        </div>
      </div>

      {/* Code Browser */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-2 space-y-1">
          {files.map(file => {
            const isSelected = file.path === selectedFilePath;
            return (
              <button
                key={file.path}
                onClick={() => setSelectedFilePath(file.path)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-800 text-emerald-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <span className="truncate">{file.path}</span>
                <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-3 bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
          <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-zinc-300">{selectedFile.path}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(selectedFile.content);
                setCopiedFile(true);
                setTimeout(() => setCopiedFile(false), 2000);
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-mono cursor-pointer"
            >
              {copiedFile ? 'Copiado' : 'Copiar Arquivo'}
            </button>
          </div>
          <div className="p-4 bg-zinc-950 max-h-[460px] overflow-auto">
            <pre className="text-xs font-mono text-zinc-300 leading-relaxed">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
