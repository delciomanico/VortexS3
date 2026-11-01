import React, { useState } from 'react';
import { Terminal, Filter, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Search } from 'lucide-react';
import { AccessLogEntry } from '../types/storage';
import { storageEngine } from '../services/storageEngine';

interface AccessLogsViewProps {
  logs: AccessLogEntry[];
}

export const AccessLogsView: React.FC<AccessLogsViewProps> = ({ logs }) => {
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const filteredLogs = logs.filter(log => {
    if (filterMethod !== 'all' && log.method !== filterMethod) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.clientIp.toLowerCase().includes(q) ||
        log.bucket.toLowerCase().includes(q) ||
        log.key.toLowerCase().includes(q) ||
        log.userAgent.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-4 h-4 text-blue-400" />
            <h2 className="text-base font-bold text-white">Auditoria e Logs de Acesso da API S3</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Rastreamento em tempo real de todas as requisições HTTP recebidas (IP cliente, método, código de status HTTP, latência e bytes transferidos).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono text-emerald-400">Escutando :9000</span>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por IP, bucket, arquivo ou user-agent..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg">
            {['all', 'GET', 'PUT', 'DELETE', 'POST'].map(m => (
              <button
                key={m}
                onClick={() => setFilterMethod(m)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterMethod === m
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'all' ? 'Todos' : m}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold font-mono">
              <tr>
                <th className="py-2.5 px-4">Método</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Recurso (Bucket/Chave)</th>
                <th className="py-2.5 px-4">IP Cliente</th>
                <th className="py-2.5 px-4 text-right">Transferido</th>
                <th className="py-2.5 px-4 text-right">Latência</th>
                <th className="py-2.5 px-4">User-Agent</th>
                <th className="py-2.5 px-4 text-right">Horário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.method === 'GET'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                        : log.method === 'PUT'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                        : log.method === 'DELETE'
                        ? 'bg-red-950 text-red-300 border border-red-800/60'
                        : 'bg-purple-950 text-purple-300 border border-purple-800/60'
                    }`}>
                      {log.method}
                    </span>
                  </td>

                  <td className="py-2.5 px-4">
                    <span className={`font-semibold ${
                      log.httpStatus < 300
                        ? 'text-emerald-400'
                        : log.httpStatus < 500
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}>
                      {log.httpStatus}
                    </span>
                  </td>

                  <td className="py-2.5 px-4 text-slate-200 truncate max-w-xs font-medium">
                    {log.bucket}{log.key ? `/${log.key}` : ''}
                  </td>

                  <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                    {log.clientIp}
                  </td>

                  <td className="py-2.5 px-4 text-right text-slate-300 tabular-nums">
                    {formatSize(log.bytesTransferred)}
                  </td>

                  <td className="py-2.5 px-4 text-right text-slate-300 tabular-nums">
                    {log.durationMs} ms
                  </td>

                  <td className="py-2.5 px-4 text-slate-500 text-[11px] truncate max-w-[150px]">
                    {log.userAgent}
                  </td>

                  <td className="py-2.5 px-4 text-right text-slate-500 text-[11px] tabular-nums">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
