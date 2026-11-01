import React, { useState } from 'react';
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  Terminal,
} from 'lucide-react';
import { IAMAccessKey, Bucket } from '../types/storage';
import { storageEngine } from '../services/storageEngine';

interface AccessKeysManagerProps {
  keys: IAMAccessKey[];
  buckets: Bucket[];
  onOpenCreateKeyModal: () => void;
}

export const AccessKeysManager: React.FC<AccessKeysManagerProps> = ({
  keys,
  buckets,
  onOpenCreateKeyModal,
}) => {
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [activeTabSnippet, setActiveTabSnippet] = useState<'awscli' | 'boto3' | 'nodejs'>('awscli');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const sampleKey = keys[0] || {
    accessKeyId: 'VXAKIA799PRODROOT',
    secretAccessKey: 'vxs_wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  };

  const snippets = {
    awscli: `# Configurar AWS CLI:
aws configure set aws_access_key_id ${sampleKey.accessKeyId}
aws configure set aws_secret_access_key ${sampleKey.secretAccessKey}

# Listar buckets:
aws --endpoint-url http://localhost:9000 s3 ls`,

    boto3: `import boto3

s3 = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='${sampleKey.accessKeyId}',
    aws_secret_access_key='${sampleKey.secretAccessKey}',
    region_name='us-east-1'
)

# Listar buckets:
print(s3.list_buckets())`,

    nodejs: `import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: '${sampleKey.accessKeyId}',
    secretAccessKey: '${sampleKey.secretAccessKey}',
  },
  forcePathStyle: true,
});

const res = await s3.send(new ListBucketsCommand({}));
console.log(res.Buckets);`,
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div>
          <h2 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wider">
            Credenciais de API S3
          </h2>
          <span className="text-xs text-zinc-500">Autenticação AWS Signature Version 4</span>
        </div>

        <button
          onClick={onOpenCreateKeyModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Criar Chave</span>
        </button>
      </div>

      {/* Keys Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 text-[11px] font-mono">
            <tr>
              <th className="py-2.5 px-4">Nome</th>
              <th className="py-2.5 px-4">Access Key ID</th>
              <th className="py-2.5 px-4">Permissão</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-mono">
            {keys.map(k => (
              <tr key={k.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="py-3 px-4 text-zinc-200 font-medium font-sans">{k.name}</td>
                <td className="py-3 px-4 text-emerald-400 select-all">
                  <div className="flex items-center gap-1.5">
                    <span>{k.accessKeyId}</span>
                    <button
                      onClick={() => handleCopy(k.accessKeyId, k.id)}
                      className="text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
                    >
                      {copiedKeyId === k.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </td>
                <td className="py-3 px-4 text-zinc-400">{k.permissions}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                    k.status === 'active' ? 'text-emerald-400' : 'text-zinc-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${k.status === 'active' ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                    <span>{k.status === 'active' ? 'Ativa' : 'Inativa'}</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => {
                      if (confirm(`Revogar chave ${k.name}?`)) storageEngine.deleteAccessKey(k.id);
                    }}
                    className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Code Snippet Box */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
          <span className="text-xs font-bold text-zinc-300 font-mono">Exemplo de Conexão</span>
          <div className="flex items-center gap-1 p-0.5 bg-zinc-950 rounded-lg">
            {(['awscli', 'boto3', 'nodejs'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTabSnippet(tab)}
                className={`px-2.5 py-0.5 text-xs rounded font-medium transition-colors cursor-pointer ${
                  activeTabSnippet === tab ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab === 'awscli' ? 'AWS CLI' : tab === 'boto3' ? 'Python' : 'Node.js'}
              </button>
            ))}
          </div>
        </div>

        <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-300 overflow-x-auto">
          <code>{snippets[activeTabSnippet]}</code>
        </pre>
      </div>
    </div>
  );
};
