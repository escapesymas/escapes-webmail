import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (email: string, token: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      localStorage.setItem('escapes_mail_token', data.token);
      localStorage.setItem('escapes_mail_user', data.email);
      onLoginSuccess(data.email, data.token);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-tech-carbon text-tech-text">
      <div className="w-full max-w-md bg-tech-card border border-tech-border rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-tech-carbon border border-tech-yellow/30 flex items-center justify-center mb-4 shadow-lg shadow-tech-yellow/5">
            <Mail className="w-8 h-8 text-tech-yellow" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Escapes Mail</h1>
          <p className="text-sm text-tech-muted mt-1">Buzón profesional de Escapes y Más</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/50 flex items-start gap-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-tech-muted mb-2">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-tech-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@escapesymas.com"
                className="w-full bg-tech-carbon border border-tech-border rounded-xl pl-11 pr-4 py-3 text-sm text-tech-text focus:outline-none focus:border-tech-yellow transition-colors placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-tech-muted mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-tech-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-tech-carbon border border-tech-border rounded-xl pl-11 pr-4 py-3 text-sm text-tech-text focus:outline-none focus:border-tech-yellow transition-colors placeholder:text-zinc-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-tech-yellow hover:bg-yellow-400 disabled:opacity-50 text-black font-semibold rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-all shadow-md shadow-tech-yellow/10"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Entrar al correo</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-tech-border/60 text-center">
          <p className="text-xs text-tech-muted">
            Instala esta app en tu pantalla de inicio para recibir notificaciones en tiempo real.
          </p>
        </div>
      </div>
    </div>
  );
};
