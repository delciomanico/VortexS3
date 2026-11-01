import React, { useState } from 'react';
import {
  Server,
  Power,
  RotateCw,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Wrench,
  Check,
  Bug,
  Plus,
  Trash2,
  Globe,
  Lock,
  HardDrive,
  Network,
} from 'lucide-react';
import { ClusterNode, ReplicationEvent, ScrubReport } from '../types/storage';
import { replicationEngine } from '../services/replicationEngine';
import { storageEngine } from '../services/storageEngine';
import { ConnectNodeModal } from './modals/ConnectNodeModal';

interface ReplicationClusterProps {
  nodes: ClusterNode[];
  events: ReplicationEvent[];
}

export const ReplicationCluster: React.FC<ReplicationClusterProps> = ({
  nodes,
  events,
}) => {
  const [filterAction, setFilterAction] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubMessage, setScrubMessage] = useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [nodeActionError, setNodeActionError] = useState<string | null>(null);

  const metrics = storageEngine.getMetrics();

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    replicationEngine.triggerManualSyncAll();
    setTimeout(() => setIsSyncing(false), 1500);
  };

  const handleSimulateBitrot = () => {
    const corrupted = storageEngine.corruptRandomShard();
    if (corrupted) {
      setScrubMessage(`⚠️ Bitrot simulado: O shard #${corrupted.shardIndex} (${corrupted.shardType}) do objeto "${corrupted.objectKey}" sofreu corrupção física!`);
    } else {
      setScrubMessage('Nenhum shard disponível para corrupção.');
    }
  };

  const handleRunScrubber = async () => {
    setIsScrubbing(true);
    setScrubMessage(null);
    try {
      const report: ScrubReport = await storageEngine.runBitrotScrub();
      if (report.unrecoverableObjects && report.unrecoverableObjects > 0) {
        setScrubMessage(`⚠️ ALERTA CRÍTICO: ${report.unrecoverableObjects} objeto(s) sofreram dano superior ao limite de tolerância (K=2 paridades). É necessária restauração a partir de snapshot.`);
      } else if (report.corruptedShards > 0) {
        setScrubMessage(`✅ Bitrot Scrubber concluído: ${report.healedShards} shards corrompidos foram reconstruídos com sucesso via Reed-Solomon (0 dados perdidos).`);
      } else {
        setScrubMessage(`✅ Varredura concluída: Todos os ${report.scannedObjects} objetos e seus blocos Reed-Solomon estão 100% íntegros.`);
      }
    } finally {
      setIsScrubbing(false);
    }
  };

  const filteredEvents = filterAction === 'all'
    ? events
    : events.filter(e => e.action === filterAction);

  const handleRemoveNode = (nodeId: string, nodeName: string) => {
    setNodeActionError(null);
    if (!window.confirm(`Tem certeza que deseja desconectar e desprovisionar o nó "${nodeName}" deste cluster?`)) {
      return;
    }
    try {
      replicationEngine.removeNode(nodeId);
    } catch (err: any) {
      setNodeActionError(err?.message || 'Erro ao desconectar nó.');
    }
  };

  const totalClusterDiskBytes = nodes.reduce((acc, n) => acc + (n.diskTotalBytes || 0), 0);
  const totalUsedDiskBytes = nodes.reduce((acc, n) => acc + (n.diskUsedBytes || 0), 0);
  const onlineNodesCount = nodes.filter(n => n.status === 'online').length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
        <div>
          <h2 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wider flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Nós do Cluster S3 & Topologia Multi-Servidor</span>
          </h2>
          <span className="text-xs text-zinc-500 font-mono">
            Conexão entre diferentes servidores físicos, VPS cloud, quorum Raft e Reed-Solomon (4+2)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-sm shadow-emerald-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Conectar Nó Remoto</span>
          </button>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer border border-zinc-700"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Verificar Sincronização'}</span>
          </button>
        </div>
      </div>

      {nodeActionError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300 flex items-center justify-between">
          <span>{nodeActionError}</span>
          <button onClick={() => setNodeActionError(null)} className="text-red-400 hover:text-red-200">
            &times;
          </button>
        </div>
      )}

      {/* Multi-Server Topology Summary Banner */}
      <div className="bg-[#171717] border border-zinc-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 bg-[#121212] rounded-lg border border-zinc-800/80">
          <span className="text-zinc-500 text-[10px] uppercase block font-sans">Servidores no Cluster</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-zinc-100 font-bold font-mono text-sm">{nodes.length} nós</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              {onlineNodesCount} online
            </span>
          </div>
        </div>

        <div className="p-2.5 bg-[#121212] rounded-lg border border-zinc-800/80">
          <span className="text-zinc-500 text-[10px] uppercase block font-sans">Quorum Raft / Consenso</span>
          <span className="text-emerald-400 font-bold font-mono text-xs mt-1 block">
            {onlineNodesCount >= Math.floor(nodes.length / 2) + 1 ? 'Líder Ativo (Quorum OK)' : 'Degradado (Sem Quorum)'}
          </span>
        </div>

        <div className="p-2.5 bg-[#121212] rounded-lg border border-zinc-800/80">
          <span className="text-zinc-500 text-[10px] uppercase block font-sans">Capacidade Agregada</span>
          <span className="text-zinc-200 font-bold font-mono text-xs mt-1 block">
            {formatSize(totalUsedDiskBytes)} / {formatSize(totalClusterDiskBytes)}
          </span>
        </div>

        <div className="p-2.5 bg-[#121212] rounded-lg border border-zinc-800/80">
          <span className="text-zinc-500 text-[10px] uppercase block font-sans">Distribuição Geográfica</span>
          <span className="text-zinc-300 font-mono text-xs mt-1 block truncate">
            {Array.from(new Set(nodes.map(n => n.region || 'local'))).length} regiões ativas
          </span>
        </div>
      </div>

      {/* Erasure Coding & Bitrot Scrubber Section */}
      <div className="p-4 bg-[#171717] border border-zinc-800 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-zinc-100 font-mono uppercase tracking-wider">
                  Erasure Coding & Bitrot Auto-Cura (Reed-Solomon 4+2)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-zinc-800 text-emerald-400">
                  Tolerância: 2 Nós
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                Fragmenta cada objeto em 4 blocos de dados e 2 de paridade distribuídos entre os nós. Se um disco ou nó degradar, o cluster reconstrói os bytes matematicamente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSimulateBitrot}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors cursor-pointer"
              title="Simula dano físico aleatório em um bloco"
            >
              <Bug className="w-3.5 h-3.5 text-amber-400" />
              <span>Simular Bitrot</span>
            </button>

            <button
              onClick={handleRunScrubber}
              disabled={isScrubbing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              <Wrench className={`w-3.5 h-3.5 ${isScrubbing ? 'animate-spin' : ''}`} />
              <span>{isScrubbing ? 'Escaneando...' : 'Executar Bitrot Scrubber'}</span>
            </button>
          </div>
        </div>

        {scrubMessage && (
          <div className={`p-2.5 rounded-lg text-xs font-mono border ${
            scrubMessage.startsWith('⚠️')
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            {scrubMessage}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
          <div className="bg-[#121212] p-2.5 rounded-lg border border-zinc-800">
            <span className="text-zinc-500 text-[10px] uppercase block font-sans">Esquema EC</span>
            <span className="text-zinc-200 font-bold mt-0.5 block">4 Dados + 2 Paridade</span>
          </div>

          <div className="bg-[#121212] p-2.5 rounded-lg border border-zinc-800">
            <span className="text-zinc-500 text-[10px] uppercase block font-sans">Overhead de Armazenamento</span>
            <span className="text-emerald-400 font-bold mt-0.5 block">+50% (vs +200% em cópia)</span>
          </div>

          <div className="bg-[#121212] p-2.5 rounded-lg border border-zinc-800">
            <span className="text-zinc-500 text-[10px] uppercase block font-sans">Bitrot Detectado</span>
            <span className={`font-bold mt-0.5 block tabular-nums ${metrics.corruptedShardsCount > 0 ? 'text-amber-400' : 'text-zinc-200'}`}>
              {metrics.corruptedShardsCount} shards
            </span>
          </div>

          <div className="bg-[#121212] p-2.5 rounded-lg border border-zinc-800">
            <span className="text-zinc-500 text-[10px] uppercase block font-sans">Auto-Curados (Reed-Solomon)</span>
            <span className="text-emerald-400 font-bold mt-0.5 block tabular-nums">
              {metrics.healedShardsCount} shards
            </span>
          </div>
        </div>
      </div>

      {/* Cluster Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {nodes.map(node => {
          const isLeader = node.role === 'leader';
          const isOffline = node.status === 'offline';
          const isSyncingNode = node.status === 'syncing';

          return (
            <div
              key={node.id}
              className={`bg-zinc-900/60 border rounded-xl p-4 flex flex-col justify-between transition-all ${
                isOffline
                  ? 'border-red-900/40 bg-red-950/10'
                  : isSyncingNode
                  ? 'border-amber-500/40 bg-amber-950/10'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Server className={`w-4 h-4 ${isOffline ? 'text-red-400' : 'text-emerald-400'}`} />
                    <div>
                      <div className="text-xs font-bold text-zinc-200 font-mono flex items-center gap-1.5">
                        <span>{node.name.split(' ')[0]}</span>
                        {isLeader && (
                          <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.2 rounded font-sans font-semibold">
                            LÍDER
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">{node.ipAddress}</div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                    isOffline
                      ? 'bg-red-950 text-red-400 border border-red-800/50'
                      : isSyncingNode
                      ? 'bg-amber-950 text-amber-300 border border-amber-800/50 animate-pulse'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                  }`}>
                    {node.status.toUpperCase()}
                  </span>
                </div>

                {/* Server Location & Infrastructure Badges */}
                <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 font-sans flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5 text-zinc-400" />
                    <span>{node.serverLocation || 'Datacenter Local'}</span>
                  </span>

                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                    {node.region || 'sa-east-1'}
                  </span>

                  {node.tlsEnabled && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" />
                      <span>mTLS</span>
                    </span>
                  )}
                </div>

                <div className="py-3 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-zinc-400">
                    <span>Função Raft:</span>
                    <span className="text-zinc-200">{isLeader ? 'Líder do Quorum' : 'Réplica Follower'}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Endpoint S3:</span>
                    <span className="text-emerald-400 truncate max-w-[170px]" title={node.endpoint}>
                      {node.endpoint.replace(/^https?:\/\//, '')}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Latência Ping:</span>
                    <span className="text-zinc-200">{isOffline ? '---' : `${node.latencyMs} ms`}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Fila Catch-up:</span>
                    <span className={node.replicationQueueLength > 0 ? 'text-amber-400 font-semibold' : 'text-zinc-400'}>
                      {node.replicationQueueLength} pendentes
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400 font-mono truncate max-w-[130px]" title={`${formatSize(node.diskUsedBytes)} / ${formatSize(node.diskTotalBytes)}`}>
                  {formatSize(node.diskUsedBytes)} / {formatSize(node.diskTotalBytes)}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => replicationEngine.toggleNodeStatus(node.id)}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-mono rounded border transition-colors cursor-pointer ${
                      isOffline
                        ? 'border-emerald-700/60 text-emerald-400 hover:bg-emerald-950/40'
                        : 'border-zinc-700 text-zinc-400 hover:text-amber-400 hover:border-amber-800/50'
                    }`}
                    title={isOffline ? 'Iniciar nó' : 'Simular falha / desligar nó'}
                  >
                    <Power className="w-3 h-3" />
                    <span>{isOffline ? 'Ligar' : 'Simular Queda'}</span>
                  </button>

                  {!isLeader && (
                    <button
                      onClick={() => handleRemoveNode(node.id, node.name)}
                      className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded transition-colors cursor-pointer"
                      title="Desconectar e remover este servidor do cluster"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Replication Events Stream */}
      <div className="bg-[#171717] border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-zinc-200 font-mono uppercase tracking-wider">
              Fluxo de Eventos do Cluster & Scrubber
            </h3>
            <span className="text-[11px] text-zinc-500 font-sans">
              Transmissões P2P, sincronizações entre servidores e curas de blocos Reed-Solomon
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            {['all', 'PUT', 'DELETE', 'SYNC_CATCHUP', 'NODE_JOIN', 'NODE_REMOVE'].map(a => (
              <button
                key={a}
                onClick={() => setFilterAction(a)}
                className={`px-2.5 py-0.5 text-xs rounded font-medium transition-colors cursor-pointer ${
                  filterAction === a ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {a === 'all' ? 'Todos' : a}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121212] text-zinc-400 border-b border-zinc-800 text-[11px] font-mono">
              <tr>
                <th className="py-2.5 px-4">Ação</th>
                <th className="py-2.5 px-4">Chave / Descrição</th>
                <th className="py-2.5 px-4">Rota Servidores</th>
                <th className="py-2.5 px-4 text-right">Latência</th>
                <th className="py-2.5 px-4 text-right">Tamanho</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Horário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {filteredEvents.slice(0, 15).map(ev => (
                <tr key={ev.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-2 px-4">
                    <span className="font-semibold text-zinc-200">{ev.action}</span>
                  </td>
                  <td className="py-2 px-4 text-zinc-300 truncate max-w-xs">{ev.objectKey}</td>
                  <td className="py-2 px-4 text-zinc-500 text-[11px]">{ev.sourceNodeId} → {ev.targetNodeId}</td>
                  <td className="py-2 px-4 text-right text-zinc-400 tabular-nums">{ev.durationMs}ms</td>
                  <td className="py-2 px-4 text-right text-zinc-400 tabular-nums">{formatSize(ev.bytes)}</td>
                  <td className="py-2 px-4">
                    <span className={ev.status === 'success' ? 'text-emerald-400' : 'text-red-400'}>
                      {ev.status === 'success' ? 'Sucesso' : 'Pendente'}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right text-zinc-500 tabular-nums">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for connecting nodes from other servers */}
      <ConnectNodeModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />
    </div>
  );
};
