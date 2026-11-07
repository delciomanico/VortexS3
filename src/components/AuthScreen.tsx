import React, { useState } from 'react';
import { HardDrive, Lock, Mail, User, ArrowRight, Shield, CheckCircle2, Sparkles } from 'lucide-react';
import { authService, AdminUser } from '../services/authService';

interface AuthScreenProps {
  onSuccess: (user: AdminUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup' && confirmPassword && password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const user = authService.login(email, password);
        onSuccess(user);
      } else {
        const user = authService.signup(name, email, password);
        onSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || 'Erro durante a autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setMode('login');
    setEmail('admin@vortexs3.io');
    setPassword('vortex123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col justify-center items-center p-4 selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Background radial gradient subtle effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl mb-3 text-emerald-400">
            <HardDrive className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            VortexS3 Console
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Armazenamento de objetos distribuído compatível com AWS S3
          </p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/95 border border-zinc-800 rounded-xl p-6 shadow-2xl backdrop-blur-sm">
          {/* Tabs */}
          <div className="flex border-b border-zinc-800 mb-5">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 pb-2.5 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${
                mode === 'login'
                  ? 'border-emerald-500 text-zinc-100'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 pb-2.5 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${
                mode === 'signup'
                  ? 'border-emerald-500 text-zinc-100'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {error && (
            <div className="mb-4 p-2.5 rounded-lg bg-red-950/40 border border-red-800/50 text-[11px] text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Nome do Administrador
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome ou time"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@empresa.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-medium text-zinc-400">
                  Senha
                </label>
                {mode === 'signup' && (
                  <span className="text-[10px] text-zinc-500">mínimo 6 caracteres</span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 active:scale-[0.99] transition-all rounded-lg cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>{mode === 'login' ? 'Entrar no Painel' : 'Criar Conta e Iniciar Cluster'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Toggle Mode Link */}
          <div className="mt-4 pt-3 border-t border-zinc-800 text-center">
            {mode === 'login' ? (
              <p className="text-xs text-zinc-400">
                Não possui conta?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); }}
                  className="text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                >
                  Cadastre-se gratuitamente
                </button>
              </p>
            ) : (
              <p className="text-xs text-zinc-400">
                Já possui conta?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                >
                  Fazer login
                </button>
              </p>
            )}
          </div>

          {/* Demo account hint */}
          <div className="mt-4 p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span className="text-zinc-300 font-medium block">Ambiente Demo de Exemplo:</span>
              <span className="text-zinc-500 font-mono text-[10px]">admin@vortexs3.io · vortex123</span>
            </div>
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium whitespace-nowrap px-2 py-1 bg-zinc-900 border border-zinc-800 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Preencher Demo
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-[11px] text-zinc-500 font-mono">
          VortexS3 Cluster Engine v1.0.0 · Autenticação Segura
        </div>
      </div>
    </div>
  );
};
