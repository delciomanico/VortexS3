import React from 'react';
import {
  HardDrive,
  Database,
  RefreshCw,
  Archive,
  Terminal,
  KeyRound,
  Box,
  LogOut,
  ChevronDown,
  Layers,
  Shield,
  Activity,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { ActiveTab } from './Navbar';
import { AdminUser } from '../services/authService';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  currentUser: AdminUser | null;
  onLogout: () => void;
  clusterHealth: 'healthy' | 'degraded' | 'critical';
  bucketsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  onLogout,
  clusterHealth,
  bucketsCount,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    { id: 'overview', label: 'Visão Geral', icon: <Database className="w-4 h-4" /> },
    { id: 'buckets', label: 'Armazenamento', icon: <HardDrive className="w-4 h-4" />, badge: bucketsCount },
    { id: 'replication', label: 'Replicação', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'backups', label: 'Backups & Restore', icon: <Archive className="w-4 h-4" /> },
    { id: 'metrics', label: 'Métricas & K8s', icon: <Activity className="w-4 h-4" /> },
    { id: 'logs', label: 'Logs de Acesso', icon: <Terminal className="w-4 h-4" /> },
    { id: 'iam', label: 'Credenciais API', icon: <KeyRound className="w-4 h-4" /> },
    { id: 'dockerhub', label: 'Docker Hub & Go', icon: <Box className="w-4 h-4" /> },
    { id: 'docs', label: 'Documentação', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-60 bg-[#121212] border-r border-zinc-800 flex flex-col shrink-0 select-none">
      {/* Brand & Project Selector (Supabase Style) */}
      <div className="h-14 px-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
            <HardDrive className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-zinc-100 tracking-tight block truncate">
              VortexS3 Cluster
            </span>
            <span className="text-[10px] text-zinc-500 font-mono block truncate">
              prod-cluster-01
            </span>
          </div>
        </div>

        <span className={`w-2 h-2 rounded-full ${
          clusterHealth === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'
        }`} title={`Cluster: ${clusterHealth}`} />
      </div>

      {/* Navigation Section */}
      <div className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        <div className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 font-mono">
          Gerenciamento
        </div>

        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer group ${
                isActive
                  ? 'bg-zinc-800/80 text-emerald-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`${isActive ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 tabular-nums">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cluster Status Quick Pill */}
      <div className="p-3 mx-2 mb-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
        <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
          <span className="text-zinc-500">API S3</span>
          <span className="text-emerald-400 font-medium">:9000</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-zinc-500">Replicação</span>
          <span className="text-zinc-300">3 Nós Ativos</span>
        </div>
      </div>

      {/* User & Logout Footer */}
      <div className="p-3 border-t border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold flex items-center justify-center text-xs shrink-0 border border-emerald-500/30">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-zinc-200 block truncate">
              {currentUser?.name || 'Administrador'}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono block truncate">
              {currentUser?.email || 'admin@vortexs3.io'}
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="text-zinc-500 hover:text-red-400 p-1.5 rounded hover:bg-zinc-800/60 transition-colors cursor-pointer"
          title="Encerrar Sessão"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
