import React from 'react';
import { Plus, ChevronRight, HardDrive, RefreshCw } from 'lucide-react';
import { ActiveTab } from './Navbar';

interface HeaderProps {
  activeTab: ActiveTab;
  onCreateBucketClick: () => void;
  selectedBucketName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onCreateBucketClick,
  selectedBucketName,
}) => {
  const getTabLabel = (tab: ActiveTab) => {
    switch (tab) {
      case 'overview': return 'Visão Geral';
      case 'buckets': return selectedBucketName ? `Armazenamento / ${selectedBucketName}` : 'Armazenamento';
      case 'replication': return 'Replicação & Alta Disponibilidade';
      case 'backups': return 'Backups & Restauração';
      case 'logs': return 'Logs de Acesso S3';
      case 'iam': return 'Credenciais API & Chaves IAM';
      case 'metrics': return 'Métricas Prometheus & Kubernetes';
      case 'dockerhub': return 'Docker Hub & Código Go';
      default: return '';
    }
  };

  return (
    <header className="h-14 bg-[#121212] border-b border-zinc-800 px-6 flex items-center justify-between shrink-0">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-zinc-500 font-mono">cluster</span>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
        <span className="text-zinc-200 font-medium font-mono">
          {getTabLabel(activeTab)}
        </span>
      </div>

      {/* Action Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCreateBucketClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors rounded-lg shadow-sm cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Bucket</span>
        </button>
      </div>
    </header>
  );
};
