import React, { useState } from 'react';
import { ArrowLeft, Trash2, Reply, Paperclip, Star, MailOpen, Download, FolderInput, ShieldAlert } from 'lucide-react';

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
  onDownloadAttachment: (index: number, filename: string) => void;
  onMoveToFolder?: (targetFolder: string) => void;
  availableFolders?: string[];
}

export const MessageDetail: React.FC<MessageDetailProps> = ({
  message,
  loading,
  onBack,
  onDelete,
  onReply,
  onToggleStar,
  onDownloadAttachment,
  onMoveToFolder,
  availableFolders = ['INBOX', 'Alibaba', 'GM2', 'SumUp', 'Spam', 'Trash'],
}) => {
  const [showImages, setShowImages] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);

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

  // Detectar si el html contiene imágenes externas que podrían ser rastreadores
  const hasExternalImages = Boolean(message.html && message.html.includes('<img'));

  return (
    <div className="flex-1 flex flex-col h-full bg-tech-card overflow-hidden">
      {/* Barra de herramientas con soporte Safe Area iOS */}
      <div className="pt-header-safe px-3 pb-3 border-b border-tech-border flex items-center justify-between bg-tech-card/80 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="md:hidden p-2 rounded-xl text-tech-muted hover:text-white hover:bg-tech-card-hover"
            aria-label="Volver a la lista"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => onToggleStar(message.uid, !message.starred)}
            className="p-2 rounded-xl text-tech-muted hover:text-tech-yellow hover:bg-tech-card-hover transition-colors"
            title="Destacar correo"
          >
            <Star
              className={`w-5 h-5 ${
                message.starred ? 'fill-tech-yellow text-tech-yellow' : 'text-zinc-600'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-2 relative">
          {/* Mover a carpeta */}
          {onMoveToFolder && (
            <div className="relative">
              <button
                onClick={() => setShowMoveMenu(!showMoveMenu)}
                className="p-2 rounded-xl text-tech-muted hover:text-white hover:bg-tech-card-hover transition-colors flex items-center gap-1.5 text-xs font-medium"
                title="Mover a otra carpeta"
              >
                <FolderInput className="w-4 h-4 text-tech-yellow" />
                <span className="hidden sm:inline">Mover</span>
              </button>

              {showMoveMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-tech-carbon border border-tech-border rounded-xl shadow-2xl py-1.5 z-50 animate-fadeIn">
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase text-tech-muted border-b border-tech-border/50">
                    Mover mensaje a:
                  </div>
                  {availableFolders.map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        onMoveToFolder(f);
                        setShowMoveMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-tech-text hover:bg-tech-card-hover hover:text-tech-yellow transition-colors capitalize"
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => onReply(message)}
            className="px-3 py-1.5 rounded-xl bg-tech-carbon border border-tech-border hover:border-tech-yellow/50 text-tech-text hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Responder"
          >
            <Reply className="w-4 h-4 text-tech-yellow" />
            <span>Responder</span>
          </button>

          <button
            onClick={() => onDelete(message.uid)}
            className="p-2 rounded-xl text-tech-muted hover:text-red-400 hover:bg-red-950/20 transition-colors"
            title="Enviar a la papelera"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-28 md:pb-6">
        {/* Cabecera del mensaje */}
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white mb-3 leading-snug">
            {message.subject}
          </h1>

          <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-tech-carbon/60 border border-tech-border/60">
            <div className="overflow-hidden">
              <span className="text-sm font-semibold text-white block truncate">
                {message.fromName ? `${message.fromName} <${message.from}>` : message.from}
              </span>
              <span className="text-xs text-tech-muted block truncate mt-0.5">
                Para: {message.to}
              </span>
            </div>

            <span className="text-xs text-tech-muted shrink-0 mt-0.5">
              {formatFullDate(message.date)}
            </span>
          </div>
        </div>

        {/* Aviso de imágenes externas */}
        {hasExternalImages && !showImages && (
          <div className="p-3 rounded-xl bg-tech-carbon border border-tech-border flex items-center justify-between gap-3 text-xs text-tech-muted">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-tech-yellow shrink-0" />
              <span>Por privacidad, las imágenes remotas no se muestran automáticamente.</span>
            </div>
            <button
              onClick={() => setShowImages(true)}
              className="px-2.5 py-1 rounded-lg bg-tech-card hover:bg-tech-card-hover text-tech-yellow font-semibold shrink-0 border border-tech-border transition-colors"
            >
              Cargar imágenes
            </button>
          </div>
        )}

        {/* Archivos adjuntos */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-tech-muted flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-tech-yellow" />
              <span>Archivos adjuntos ({message.attachments.length})</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {message.attachments.map((att, idx) => (
                <div
                  key={idx}
                  onClick={() => onDownloadAttachment(idx, att.filename)}
                  className="p-3 rounded-xl bg-tech-carbon border border-tech-border hover:border-tech-yellow/50 text-xs text-zinc-200 flex items-center justify-between gap-3 cursor-pointer transition-all hover:shadow-md group"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <Paperclip className="w-4 h-4 text-tech-yellow shrink-0" />
                    <div className="overflow-hidden">
                      <span className="font-semibold block truncate group-hover:text-tech-yellow transition-colors">
                        {att.filename}
                      </span>
                      <span className="text-[10px] text-tech-muted">
                        {Math.round(att.size / 1024)} KB
                      </span>
                    </div>
                  </div>

                  <button
                    className="p-1.5 rounded-lg bg-tech-card text-tech-muted group-hover:text-tech-yellow transition-colors shrink-0"
                    title="Descargar archivo"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cuerpo del correo */}
        <div className="pt-4 border-t border-tech-border/50">
          {message.html ? (
            <div
              className={`prose prose-invert max-w-none text-zinc-200 text-sm leading-relaxed overflow-x-auto ${
                !showImages ? '[&_img]:hidden' : ''
              }`}
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
