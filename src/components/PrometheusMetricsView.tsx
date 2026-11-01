import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Copy,
  Check,
  Server,
  Layers,
  ShieldCheck,
  Terminal,
  ExternalLink,
  Cpu,
  HardDrive,
} from 'lucide-react';
import { storageEngine } from '../services/storageEngine';
import { ClusterMetrics } from '../types/storage';

interface PrometheusMetricsViewProps {
  metrics: ClusterMetrics;
}

export const PrometheusMetricsView: React.FC<PrometheusMetricsViewProps> = ({ metrics }) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const prometheusText = storageEngine.getPrometheusMetricsText();
  const k8sStatus = storageEngine.getK8sHealthStatus();

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const prometheusConfigExample = `# Prometheus scrape_configs para VortexS3
scrape_configs:
  - job_name: 'vortexs3-cluster'
    scrape_interval: 10s
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:9000']
        labels:
          cluster: 'vortex-prod-01'
          region: 'us-east-1'
`;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
        <div>
          <h2 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Métricas Prometheus & Kubernetes Probes</span>
          </h2>
          <span className="text-xs text-zinc-500 font-mono">
            Endpoints nativos OpenMetrics (/metrics) e sondas de prontidão liveness/readiness
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopy(prometheusConfigExample, 'promConfig')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            {copiedText === 'promConfig' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedText === 'promConfig' ? 'Copiado!' : 'Configuração Prometheus'}</span>
          </button>

          <button
            onClick={() => handleCopy(prometheusText, 'promMetrics')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
          >
            {copiedText === 'promMetrics' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedText === 'promMetrics' ? 'Métricas Copiadas' : 'Copiar /metrics'}</span>
          </button>
        </div>
      </div>

      {/* Kubernetes Probes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 bg-[#171717] border border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-zinc-400 font-medium font-sans">Liveness Probe</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              HTTP 200 OK
            </span>
          </div>
          <div className="font-mono text-sm text-zinc-100 font-semibold mb-1">
            GET /healthz
          </div>
          <p className="text-[11px] text-zinc-500 font-sans">
            Garante reinicialização automática do pod pelo kubelet caso o processo trave.
          </p>
        </div>

        <div className="p-4 bg-[#171717] border border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-zinc-400 font-medium font-sans">Readiness Probe</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              READY
            </span>
          </div>
          <div className="font-mono text-sm text-zinc-100 font-semibold mb-1">
            GET /readyz
          </div>
          <p className="text-[11px] text-zinc-500 font-sans">
            Valida quorum de replicação e espaço livre antes de direcionar tráfego S3.
          </p>
        </div>

        <div className="p-4 bg-[#171717] border border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-zinc-400 font-medium font-sans">Compatibilidade MinIO</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
              Ativo
            </span>
          </div>
          <div className="font-mono text-sm text-zinc-100 font-semibold mb-1 truncate">
            /minio/health/live
          </div>
          <p className="text-[11px] text-zinc-500 font-sans">
            Compatível com helm charts e operadores Kubernetes do ecossistema MinIO.
          </p>
        </div>
      </div>

      {/* Realtime Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-[#171717] border border-zinc-800 rounded-xl">
          <span className="text-[11px] text-zinc-500 font-sans block">Latência P99 S3</span>
          <span className="text-lg font-mono font-bold text-emerald-400 mt-0.5 block tabular-nums">
            {metrics.replicationLagMs} ms
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">TTFB &lt; 25ms SLA</span>
        </div>

        <div className="p-3.5 bg-[#171717] border border-zinc-800 rounded-xl">
          <span className="text-[11px] text-zinc-500 font-sans block">Taxa de Escrita</span>
          <span className="text-lg font-mono font-bold text-zinc-100 mt-0.5 block tabular-nums">
            {metrics.writeOpsPerSec} ops/s
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">PUT / MULTIPART</span>
        </div>

        <div className="p-3.5 bg-[#171717] border border-zinc-800 rounded-xl">
          <span className="text-[11px] text-zinc-500 font-sans block">Taxa de Leitura</span>
          <span className="text-lg font-mono font-bold text-zinc-100 mt-0.5 block tabular-nums">
            {metrics.readOpsPerSec} ops/s
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">GET / HEAD S3</span>
        </div>

        <div className="p-3.5 bg-[#171717] border border-zinc-800 rounded-xl">
          <span className="text-[11px] text-zinc-500 font-sans block">Esquema Reed-Solomon</span>
          <span className="text-lg font-mono font-bold text-emerald-400 mt-0.5 block">
            {metrics.erasureDataShards}+{metrics.erasureParityShards}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">4 dados + 2 paridade</span>
        </div>
      </div>

      {/* Raw Prometheus Output Terminal (Supabase Dark) */}
      <div className="bg-[#171717] border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-zinc-200 font-mono">
              Saída do Endpoint GET /metrics (OpenMetrics Format)
            </span>
          </div>

          <span className="text-[10px] font-mono text-zinc-500">
            Content-Type: text/plain; version=0.0.4
          </span>
        </div>

        <div className="p-4 bg-[#101010] overflow-x-auto max-h-96 text-xs font-mono text-zinc-300 leading-relaxed select-all">
          <pre>{prometheusText}</pre>
        </div>
      </div>
    </div>
  );
};
