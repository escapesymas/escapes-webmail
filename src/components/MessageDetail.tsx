import React from 'react';
import { ArrowLeft, Trash2, Reply, Paperclip, Star, MailOpen, User } from 'lucide-react';

export interface MailDetail {
  uid: number;
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  date: string;
  html?: string;
  text?: string;
  starred: boolean;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
  }>;
}

interface MessageDetailProps {
  message: MailDetail | null;
  loading: boolean;
  onBack: () => void;
  onDelete: (uid: number) => void;
  onReply: (message: MailDetail) => void;
  onToggleStar: (uid: number, starred: boolean) => void;
}

export const MessageDetail: React.FC<MessageDetailProps> = ({
  message,
  loading,
  onBack,
  onDelete,
  onReply,
  onToggleStar,
}) => {
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-tech-card">
        <div className="w-8 h-8 border-2 border-tech-yellow border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-tech-muted mt-3">Cargando mensaje...</span>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center h-full bg-tech-card text-tech-muted">
        <MailOpen className="w-12 h-12 opacity-20 text-tech-yellow mb-2" />
        <span>Selecciona un correo para leer</span>
      </div>
    );
  }

  const formatFullDate = (dStr: string) => {
    try {
      return new Date(dStr).toLocaleString('es-ES', {
        dateStyle: 'full',
        timeStyle: 'short',
      });
    } catch {
      return dStr;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-tech-card overflow-hidden">
      {/* Barra de herramientas */}
      <div className="p-3 border-b border-tech-border flex items-center justify-between bg-tech-card/80 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="md:hidden p-2 rounded-xl text-tech-muted hover:text-white hover:bg-tech-card-hover"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => onToggleStar(message.uid, !message.starred)}
            className="p-2 rounded-xl text-tech-muted hover:text-tech-yellow hover:bg-tech-card-hover transition-colors"
            title="Destacar"
          >
            <Star
              className={`w-5 h-5 ${
                message.starred ? 'fill-tech-yellow text-tech-yellow' : 'text-zinc-500'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onReply(message)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tech-yellow text-black font-semibold text-xs hover:bg-yellow-400 transition-colors"
          >
            <Reply className="w-4 h-4" />
            <span>Responder</span>
          </button>

          <button
            onClick={() => onDelete(message.uid)}
            className="p-2 rounded-xl text-red-400 hover:bg-red-950/40 transition-colors"
            title="Eliminar mensaje"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contenido del correo */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Asunto */}
        <h1 className="text-xl sm:text-2xl font-bold text-white break-words">
          {message.subject}
        </h1>

        {/* Remitente e información */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-tech-carbon border border-tech-border">
          <div className="w-10 h-10 rounded-full bg-tech-card border border-tech-border flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-tech-yellow" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="font-semibold text-white truncate">
                {message.fromName ? `${message.fromName} <${message.from}>` : message.from}
              </span>
              <span className="text-xs text-tech-muted">
                {formatFullDate(message.date)}
              </span>
            </div>
            <p className="text-xs text-tech-muted mt-0.5 truncate">Para: {message.to}</p>
          </div>
        </div>

        {/* Adjuntos si hay */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-tech-muted flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              <span>Archivos adjuntos ({message.attachments.length})</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {message.attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 rounded-lg bg-tech-carbon border border-tech-border text-xs text-zinc-300 flex items-center gap-2"
                >
                  <Paperclip className="w-3.5 h-3.5 text-tech-yellow" />
                  <span className="font-medium truncate max-w-[200px]">{att.filename}</span>
                  <span className="text-[10px] text-tech-muted">
                    ({Math.round(att.size / 1024)} KB)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cuerpo del correo */}
        <div className="pt-4 border-t border-tech-border/50">
          {message.html ? (
            <div
              className="prose prose-invert max-w-none text-zinc-200 text-sm leading-relaxed overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: message.html }}
            />
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-200 leading-relaxed">
              {message.text}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
