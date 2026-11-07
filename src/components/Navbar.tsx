import React from 'react';
import { Database, Server, HardDrive, RefreshCw, Archive, KeyRound, Box, Plus, Terminal } from 'lucide-react';

export type ActiveTab = 'overview' | 'buckets' | 'replication' | 'backups' | 'logs' | 'iam' | 'dockerhub' | 'metrics' | 'docs' | 'production';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onCreateBucketClick: () => void;
  clusterHealth: 'healthy' | 'degraded' | 'critical';
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onCreateBucketClick,
  clusterHealth,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <HardDrive className="w-4 h-4" />
          </div>
          <button
            onClick={() => onTabChange('overview')}
            className="text-left group cursor-pointer focus:outline-none"
          >
            <span className="text-base font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors whitespace-nowrap">
              VortexS3 Storage
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-medium">
          <button
            onClick={() => onTabChange('overview')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-slate-800 text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Visão Geral</span>
          </button>

          <button
            onClick={() => onTabChange('buckets')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'buckets'
                ? 'bg-slate-800 text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Buckets & Objetos</span>
          </button>

          <button
            onClick={() => onTabChange('replication')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'replication'
                ? 'bg-slate-800 text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Replicação</span>
          </button>

          <button
            onClick={() => onTabChange('backups')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'backups'
                ? 'bg-slate-800 text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Backups & Restauração</span>
          </button>

          <button
            onClick={() => onTabChange('logs')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-slate-800 text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Logs S3</span>
          </button>

          <button
            onClick={() => onTabChange('iam')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'iam'
                ? 'bg-slate-800 text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Chaves IAM</span>
          </button>

          <button
            onClick={() => onTabChange('dockerhub')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'dockerhub'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold'
                : 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/20'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>Docker Hub & Código Go</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onCreateBucketClick}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar Bucket</span>
          </button>
        </div>
      </div>
    </header>
  );
};
