import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Terminal,
  Copy,
  Check,
  Globe,
  HardDrive,
  ShieldCheck,
  AlertCircle,
  Network,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { replicationEngine } from '../../services/replicationEngine';
import { ClusterNode, NodeRole } from '../../types/storage';

interface ConnectNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNodeAdded?: (node: ClusterNode) => void;
}

export const ConnectNodeModal: React.FC<ConnectNodeModalProps> = ({
  isOpen,
  onClose,
  onNodeAdded,
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'token_cli'>('manual');

  // Form states for manual registration
  const [nodeName, setNodeName] = useState('');
  const [serverHost, setServerHost] = useState('');
  const [serverPort, setServerPort] = useState('9000');
  const [useTls, setUseTls] = useState(false);
  const [role, setRole] = useState<'follower' | 'observer'>('follower');
  const [diskTotalGB, setDiskTotalGB] = useState(1000); // 1 TB default
  const [serverLocation, setServerLocation] = useState('Datacenter Secundário');
  const [region, setRegion] = useState('sa-east-1');
  const [joinTokenInput, setJoinTokenInput] = useState('');

  // Auto-generated cluster token
  const [clusterCredentials, setClusterCredentials] = useState<{
    token: string;
    expiresAt: string;
    joinCommand: string;
    dockerCommand: string;
    clusterEndpoint: string;
  } | null>(null);

  const [copiedDocker, setCopiedDocker] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const creds = replicationEngine.generateClusterJoinToken();
      setClusterCredentials(creds);
      setJoinTokenInput(creds.token);
      setNodeName(`vortex-node-${Date.now().toString().slice(-4)}`);
      setServerHost('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyDocker = () => {
    if (clusterCredentials?.dockerCommand) {
      navigator.clipboard.writeText(clusterCredentials.dockerCommand);
      setCopiedDocker(true);
      setTimeout(() => setCopiedDocker(false), 2000);
    }
  };

  const handleCopyCli = () => {
    if (clusterCredentials?.joinCommand) {
      navigator.clipboard.writeText(clusterCredentials.joinCommand);
      setCopiedCli(true);
      setTimeout(() => setCopiedCli(false), 2000);
    }
  };

  const handleCopyToken = () => {
    if (clusterCredentials?.token) {
      navigator.clipboard.writeText(clusterCredentials.token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!serverHost.trim()) {
      setError('Informe o endereço IP ou domínio do servidor remoto.');
      return;
    }

    const protocol = useTls ? 'https://' : 'http://';
    const cleanHost = serverHost.trim().replace(/^https?:\/\//, '');
    const endpoint = `${protocol}${cleanHost}:${serverPort.trim()}`;

    setIsTestingConnection(true);

    try {
      // Simula teste de handshake com o servidor remoto
      await new Promise(r => setTimeout(r, 700));

      const created = replicationEngine.addNode({
        name: nodeName.trim() || `vortex-remote-${Date.now().toString().slice(-4)}`,
        endpoint,
        ipAddress: cleanHost.split(':')[0],
        role,
        diskTotalGB: Number(diskTotalGB) || 500,
        serverLocation: serverLocation.trim(),
        region,
        tlsEnabled: useTls,
        joinToken: joinTokenInput,
      });

      if (onNodeAdded) onNodeAdded(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Falha ao conectar nó remoto.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#171717] border border-zinc-800 rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                Conectar Nó de Outro Servidor ao Cluster
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Alta disponibilidade geográfica, replicação ativa e distribuição Reed-Solomon
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 bg-[#121212] px-5 pt-2 gap-4 shrink-0">
          <button
            onClick={() => setActiveTab('manual')}
            className={`pb-2.5 text-xs font-medium cursor-pointer transition-colors relative flex items-center gap-2 ${
              activeTab === 'manual'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Conectar Servidor Remoto (IP / Domínio)</span>
          </button>

          <button
            onClick={() => setActiveTab('token_cli')}
            className={`pb-2.5 text-xs font-medium cursor-pointer transition-colors relative flex items-center gap-2 ${
              activeTab === 'token_cli'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Comando Docker / CLI para Novo Servidor</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'manual' ? (
            <form onSubmit={handleAddNode} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Nome Identificador do Nó <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nodeName}
                    onChange={(e) => setNodeName(e.target.value)}
                    placeholder="ex: vortex-lon-node4"
                    className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Nome descritivo exibido na topologia do cluster.
                  </span>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Local Físico / Provedor
                  </label>
                  <input
                    type="text"
                    value={serverLocation}
                    onChange={(e) => setServerLocation(e.target.value)}
                    placeholder="ex: Hetzner Nuremberg DC3 ou On-Premise"
                    className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Permite organizar nós por datacenter para tolerância a falhas.
                  </span>
                </div>
              </div>

              {/* Server Host & Port */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-zinc-300 font-medium mb-1">
                    IP Público / FQDN do Servidor Remoto <span className="text-red-400">*</span>
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-2.5 rounded-l-lg border border-r-0 border-zinc-800 bg-zinc-900 text-zinc-400 text-xs font-mono">
                      {useTls ? 'https://' : 'http://'}
                    </span>
                    <input
                      type="text"
                      required
                      value={serverHost}
                      onChange={(e) => setServerHost(e.target.value)}
                      placeholder="198.51.100.42 ou s3-node4.empresa.com"
                      className="w-full bg-[#121212] border border-zinc-800 rounded-r-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Porta S3 / Cluster
                  </label>
                  <input
                    type="number"
                    value={serverPort}
                    onChange={(e) => setServerPort(e.target.value)}
                    placeholder="9000"
                    className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Roles, Disks & Region */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Papel no Cluster
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'follower' | 'observer')}
                    className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 text-xs"
                  >
                    <option value="follower">Follower (Réplica Ativa + Shards)</option>
                    <option value="observer">Observer (Audit & Read-Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Espaço em Disco (GB)
                  </label>
                  <input
                    type="number"
                    min={50}
                    step={50}
                    value={diskTotalGB}
                    onChange={(e) => setDiskTotalGB(Number(e.target.value))}
                    className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Região Geográfica
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 text-xs"
                  >
                    <option value="sa-east-1">sa-east-1 (São Paulo)</option>
                    <option value="us-east-1">us-east-1 (N. Virginia)</option>
                    <option value="us-west-2">us-west-2 (Oregon)</option>
                    <option value="eu-central-1">eu-central-1 (Frankfurt)</option>
                    <option value="eu-west-1">eu-west-1 (Irlanda)</option>
                    <option value="on-premise">On-Premise (Local DC)</option>
                  </select>
                </div>
              </div>

              {/* TLS Checkbox */}
              <div className="p-3 bg-[#121212] border border-zinc-800/80 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-zinc-200 font-medium block">Criptografia em Trânsito (TLS / mTLS)</span>
                    <span className="text-[10px] text-zinc-500 block">
                      Exige certificados válidos para comunicação criptografada entre os servidores.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={useTls}
                  onChange={(e) => setUseTls(e.target.checked)}
                  className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500 h-4 w-4 bg-zinc-900"
                />
              </div>

              {/* Cluster Token */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Token de Autenticação do Cluster (mTLS Handshake)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={joinTokenInput}
                    onChange={(e) => setJoinTokenInput(e.target.value)}
                    className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-3 py-2 text-zinc-300 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copiar</span>
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isTestingConnection}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  {isTestingConnection ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Efetuando Handshake...</span>
                    </>
                  ) : (
                    <>
                      <Server className="w-3.5 h-3.5" />
                      <span>Conectar Nó ao Cluster</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Passo a passo para conectar uma nova máquina ou VPS:</span>
                </div>
                <p className="text-[11px] text-emerald-400/80">
                  Execute o comando abaixo no terminal do servidor que você deseja adicionar (AWS EC2, Hetzner, DigitalOcean ou Servidor Físico). O nó irá se registrar automaticamente neste painel.
                </p>
              </div>

              {/* Docker Option */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    Opção 1: Via Docker Container (Recomendado para VPS / Linux)
                  </span>
                  <button
                    onClick={handleCopyDocker}
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    {copiedDocker ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedDocker ? 'Copiado!' : 'Copiar comando'}</span>
                  </button>
                </div>

                <div className="bg-[#121212] border border-zinc-800 rounded-lg p-3 font-mono text-[11px] text-zinc-300 overflow-x-auto leading-relaxed">
                  <pre>{clusterCredentials?.dockerCommand || 'Carregando comando...'}</pre>
                </div>
              </div>

              {/* CLI Binary Option */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                    Opção 2: Via Binário Go Nativo (Linux Systemd / Baremetal)
                  </span>
                  <button
                    onClick={handleCopyCli}
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    {copiedCli ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCli ? 'Copiado!' : 'Copiar comando'}</span>
                  </button>
                </div>

                <div className="bg-[#121212] border border-zinc-800 rounded-lg p-3 font-mono text-[11px] text-zinc-300 overflow-x-auto leading-relaxed">
                  <pre>{clusterCredentials?.joinCommand || 'Carregando...'}</pre>
                </div>
              </div>

              {/* Parameters info */}
              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                <div className="bg-[#121212] p-2.5 rounded-lg border border-zinc-800">
                  <span className="text-zinc-500 uppercase text-[10px] block">Cluster Leader Endpoint</span>
                  <span className="text-zinc-300 font-mono mt-0.5 block truncate">
                    {clusterCredentials?.clusterEndpoint}
                  </span>
                </div>

                <div className="bg-[#121212] p-2.5 rounded-lg border border-zinc-800">
                  <span className="text-zinc-500 uppercase text-[10px] block">Validade do Token</span>
                  <span className="text-emerald-400 font-mono mt-0.5 block">24 horas (Renovável)</span>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
                >
                  Entendi & Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
