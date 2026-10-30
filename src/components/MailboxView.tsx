import React from 'react';
import { Mail, Star, Paperclip, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export interface MailSummary {
  uid: number;
  seq: number;
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  date: string;
  flags: string[];
  unread: boolean;
  starred: boolean;
  hasAttachments: boolean;
}

interface MailboxViewProps {
  messages: MailSummary[];
  loading: boolean;
  selectedUid: number | null;
  onSelectMessage: (uid: number) => void;
  onRefresh: () => void;
  onToggleStar: (uid: number, starred: boolean) => void;
  folderName: string;
  page: number;
  total: number;
  onPageChange: (newPage: number) => void;
}

export const MailboxView: React.FC<MailboxViewProps> = ({
  messages,
  loading,
  selectedUid,
  onSelectMessage,
  onRefresh,
  onToggleStar,
  folderName,
  page,
  total,
  onPageChange,
}) => {
  const limit = 25;
  const totalPages = Math.ceil(total / limit) || 1;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-tech-carbon overflow-hidden">
      {/* Barra superior */}
      <div className="p-3.5 border-b border-tech-border flex items-center justify-between bg-tech-card/50 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-white capitalize">{folderName}</h2>
          <span className="text-xs text-tech-muted px-2 py-0.5 rounded-md bg-tech-card border border-tech-border">
            {total} correos
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl text-tech-muted hover:text-white hover:bg-tech-card-hover transition-colors"
            title="Actualizar correos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-tech-yellow' : ''}`} />
          </button>

          {totalPages > 1 && (
            <div className="flex items-center gap-1 text-xs text-tech-muted ml-2">
              <span>
                {page} / {totalPages}
              </span>
              <button
                disabled={page <= 1 || loading}
                onClick={() => onPageChange(page - 1)}
                className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-tech-card-hover"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => onPageChange(page + 1)}
                className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-tech-card-hover"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lista de mensajes */}
      <div className="flex-1 overflow-y-auto divide-y divide-tech-border/50">
        {loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-tech-muted gap-3">
            <div className="w-6 h-6 border-2 border-tech-yellow border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Cargando correos...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-tech-muted gap-2">
            <Mail className="w-8 h-8 opacity-30 text-tech-yellow" />
            <span className="text-sm">No hay correos en esta carpeta</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelected = selectedUid === msg.uid;

            return (
              <div
                key={msg.uid}
                onClick={() => onSelectMessage(msg.uid)}
                className={`p-3.5 sm:px-4 cursor-pointer flex items-start gap-3 transition-colors ${
                  isSelected
                    ? 'bg-tech-yellow/10 border-l-2 border-tech-yellow'
                    : msg.unread
                    ? 'bg-tech-card hover:bg-tech-card-hover font-semibold text-white'
                    : 'hover:bg-tech-card/60 text-tech-muted'
                }`}
              >
                {/* Estrella */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar(msg.uid, !msg.starred);
                  }}
                  className="mt-0.5 text-tech-muted hover:text-tech-yellow transition-colors shrink-0"
                >
                  <Star
                    className={`w-4 h-4 ${
                      msg.starred ? 'fill-tech-yellow text-tech-yellow' : 'text-zinc-600'
                    }`}
                  />
                </button>

                {/* Contenido del correo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-sm truncate ${
                        msg.unread ? 'text-white font-bold' : 'text-zinc-300'
                      }`}
                    >
                      {msg.fromName || msg.from}
                    </span>
                    <span className="text-xs text-tech-muted shrink-0">
                      {formatDate(msg.date)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-sm truncate ${
                        msg.unread ? 'text-white' : 'text-tech-muted'
                      }`}
                    >
                      {msg.subject}
                    </h3>
                    {msg.hasAttachments && (
                      <Paperclip className="w-3.5 h-3.5 text-tech-yellow/70 shrink-0" />
                    )}
                  </div>
                </div>

                {/* Indicador de no leído */}
                {msg.unread && (
                  <span className="w-2 h-2 rounded-full bg-tech-yellow mt-2 shrink-0 shadow-sm shadow-tech-yellow" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
