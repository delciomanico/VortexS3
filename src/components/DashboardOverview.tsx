import React from 'react';
import {
  HardDrive,
  Database,
  TrendingUp,
  Box,
  Activity,
  ArrowUpRight,
  Archive,
  RefreshCw,
} from 'lucide-react';
import { Bucket, StorageObject, ClusterNode, ClusterMetrics } from '../types/storage';
import { ActiveTab } from './Navbar';

interface DashboardOverviewProps {
  metrics: ClusterMetrics;
  buckets: Bucket[];
  objects: StorageObject[];
  nodes: ClusterNode[];
  onNavigate: (tab: ActiveTab) => void;
  onCreateBucket: () => void;
  onTriggerBackup: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  metrics,
  buckets,
  objects,
  nodes,
  onNavigate,
  onCreateBucket,
  onTriggerBackup,
}) => {
  const onlineNodes = nodes.filter(n => n.status === 'online').length;
  const totalNodes = nodes.length;

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Size */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Uso de Armazenamento</span>
            <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-zinc-100 tabular-nums">
            {formatSize(metrics.totalSizeBytes)}
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 font-mono">
            {metrics.totalBuckets} buckets · {metrics.totalObjects} objetos
          </div>
        </div>

        {/* Cluster Health */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Saúde do Cluster</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-emerald-400 tabular-nums">
            {onlineNodes}/{totalNodes} Nós Online
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 font-mono">
            {metrics.replicationLagMs}ms latência média
          </div>
        </div>

        {/* Ops / Throughput */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Operações S3</span>
            <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-zinc-100 tabular-nums">
            {(metrics.readOpsPerSec + metrics.writeOpsPerSec).toFixed(0)} req/s
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 font-mono">
            {metrics.readOpsPerSec} GET · {metrics.writeOpsPerSec} PUT
          </div>
        </div>

        {/* Docker Hub Image */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Imagem Docker</span>
            <Box className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-zinc-100 tabular-nums">
            &lt; 25 MB
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 font-mono">
            Multi-Arch (amd64 / arm64)
          </div>
        </div>
      </div>

      {/* Two Column Layout: Buckets and Nodes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Buckets list */}
        <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">
              Buckets Ativos
            </h3>
            <button
              onClick={() => onNavigate('buckets')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Gerenciar</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-zinc-800/60">
            {buckets.map(b => (
              <div
                key={b.id}
                onClick={() => onNavigate('buckets')}
                className="py-2.5 px-2 flex items-center justify-between hover:bg-zinc-800/40 rounded-lg transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-zinc-500" />
                  <div>
                    <span className="text-xs font-mono font-medium text-zinc-200 block">
                      {b.name}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {b.region} · {b.publicAccess === 'private' ? 'Privado' : 'Público'}
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono text-xs text-zinc-400">
                  <div className="text-zinc-200">{formatSize(b.sizeBytes)}</div>
                  <div className="text-[11px] text-zinc-500">{b.objectCount} itens</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nodes Mini */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">
              Topologia de Nós
            </h3>
            <button
              onClick={() => onNavigate('replication')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Nós</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {nodes.map(n => (
              <div
                key={n.id}
                className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-lg flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      n.status === 'online' ? 'bg-emerald-400' : 'bg-red-400'
                    }`} />
                    <span className="font-medium text-zinc-200">{n.name.split(' ')[0]}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                    {n.role === 'leader' ? 'Líder Primário' : 'Réplica Automática'}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-zinc-400 tabular-nums">
                  {n.status === 'online' ? `${n.latencyMs} ms` : 'Offline'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
