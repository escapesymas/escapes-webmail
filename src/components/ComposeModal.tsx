import React, { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendSuccess: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSendSuccess,
  initialTo = '',
  initialSubject = '',
  initialBody = '',
}) => {
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const token = localStorage.getItem('escapes_mail_token');
    try {
      const res = await fetch('/api/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          text: body,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar mensaje');
      }

      onSendSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-tech-card border border-tech-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Cabecera modal */}
        <div className="p-4 border-b border-tech-border flex items-center justify-between bg-tech-card">
          <h3 className="font-bold text-white text-base">Nuevo mensaje</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-tech-muted hover:text-white hover:bg-tech-card-hover"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-red-950/40 border border-red-800/50 flex items-start gap-2.5 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSend} className="flex-1 flex flex-col p-4 space-y-3 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-tech-muted mb-1">Para:</label>
            <input
              type="email"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="cliente@ejemplo.com"
              className="w-full bg-tech-carbon border border-tech-border rounded-xl px-3.5 py-2.5 text-sm text-tech-text focus:outline-none focus:border-tech-yellow placeholder:text-zinc-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-tech-muted mb-1">Asunto:</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto del correo"
              className="w-full bg-tech-carbon border border-tech-border rounded-xl px-3.5 py-2.5 text-sm text-tech-text focus:outline-none focus:border-tech-yellow placeholder:text-zinc-600"
            />
          </div>

          <div className="flex-1 flex flex-col min-h-[180px]">
            <label className="block text-xs font-semibold text-tech-muted mb-1">Mensaje:</label>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              className="flex-1 w-full bg-tech-carbon border border-tech-border rounded-xl p-3.5 text-sm text-tech-text focus:outline-none focus:border-tech-yellow placeholder:text-zinc-600 resize-none font-sans"
            />
          </div>

          <div className="pt-3 border-t border-tech-border flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-tech-border text-tech-muted hover:text-white text-xs font-semibold"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="bg-tech-yellow hover:bg-yellow-400 disabled:opacity-50 text-black font-semibold rounded-xl py-2.5 px-5 text-xs flex items-center gap-2 shadow-sm shadow-tech-yellow/10"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar correo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
