import React, { useState } from 'react';
import {
  ArrowLeft,
  Trash2,
  Reply,
  Paperclip,
  Star,
  MailOpen,
  Download,
  FolderInput,
  ShieldAlert,
  Eye,
  X,
  ExternalLink,
  Copy,
  Check,
  Key,
} from 'lucide-react';

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
  currentFolder?: string;
  token?: string | null;
}

function isCommonFalsePositive(str: string): boolean {
  const upper = str.toUpperCase();
  if (/^202[0-9]$/.test(upper)) return true;
  if (/^(TRUE|FALSE|NULL|HTML|HTTP|HTTPS|TIKTOK|GOOGLE|GITHUB|STRIPE|AMAZON|ACCESS|CENTER|ONLINE|PORTAL|VERIFY)$/.test(upper)) return true;
  return false;
}

export function extractOtpCode(subject = '', text = '', html = ''): string | null {
  const cleanSubject = subject || '';
  const plainHtml = (html || '').replace(/<[^>]+>/g, ' ');
  const combined = `${cleanSubject}\n${text || ''}\n${plainHtml}`;

  // Verificar si el correo es de autenticación, verificación o seguridad
  const isAuthContext = /c[oó]digo|code|verific|auth|pin\b|otp\b|seguridad|security|login|acceso|confirmaci[oó]n|password|contrase[ñn]a/i.test(
    `${cleanSubject} ${text.slice(0, 500)}`
  );
  if (!isAuthContext) return null;

  // 1. Patrón explícito cercano a palabras clave: "código: 123456", "code is F6PB2F"
  const explicitRegexes = [
    /(?:c[oó]digo(?:\s+de\s+verificaci[oó]n|\s+de\s+seguridad|\s+de\s+acceso)?|verification\s+code|security\s+code|access\s+code|login\s+code|c[oó]digo|code|pin|otp)\s*(?:es|is|:|=|:)?\s*[:\s#]*([A-Z0-9]{4,8})\b/i,
  ];

  for (const rx of explicitRegexes) {
    const m = combined.match(rx);
    if (m && m[1]) {
      const c = m[1].trim();
      if (!isCommonFalsePositive(c)) return c;
    }
  }

  // 2. Líneas aisladas que contengan solo un código de 4 a 8 caracteres (como en TikTok F6PB2F)
  const lines = (text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^[A-Z0-9]{4,8}$/i.test(line)) {
      if (!isCommonFalsePositive(line)) return line.toUpperCase();
    }
    const splitNum = line.match(/^([0-9]{3}[-\s][0-9]{3})$/);
    if (splitNum) return splitNum[1].replace(/\s+/, '-');
  }

  // 3. Buscar 6 dígitos numéricos típicos en el asunto o inicio del texto
  const digitsMatch = `${cleanSubject}\n${(text || '').slice(0, 800)}`.match(/\b([0-9]{6})\b/);
  if (digitsMatch && !isCommonFalsePositive(digitsMatch[1])) {
    return digitsMatch[1];
  }

  return null;
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
  currentFolder = 'INBOX',
  token,
}) => {
  const [showImages, setShowImages] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<{
    index: number;
    filename: string;
    contentType: string;
    url: string;
    isPdf: boolean;
    isImage: boolean;
  } | null>(null);

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

  const formatDisplayDate = (dStr: string) => {
    try {
      const d = new Date(dStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      if (isToday) {
        return `Hoy, ${timeStr}`;
      }
      const isThisYear = d.getFullYear() === now.getFullYear();
      const datePart = d.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: isThisYear ? undefined : 'numeric',
      });
      return `${datePart}, ${timeStr}`;
    } catch {
      return dStr;
    }
  };

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

  const isImageFile = (filename: string, ct = '') =>
    ct.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(filename);

  const isPdfFile = (filename: string, ct = '') =>
    ct === 'application/pdf' || /\.pdf$/i.test(filename);

  const handlePreviewAttachment = (index: number, filename: string, contentType: string) => {
    const isImage = isImageFile(filename, contentType);
    const isPdf = isPdfFile(filename, contentType);

    if (!isImage && !isPdf) {
      onDownloadAttachment(index, filename);
      return;
    }

    const url = `/api/mail/message/${message.uid}/attachment/${index}?folder=${encodeURIComponent(
      currentFolder
    )}&token=${encodeURIComponent(token || '')}`;

    setPreviewAttachment({
      index,
      filename,
      contentType,
      url,
      isPdf,
      isImage,
    });
  };

  // Detectar si el html contiene imágenes externas que podrían ser rastreadores
  const hasExternalImages = Boolean(message.html && message.html.includes('<img'));

  // Detección automática de códigos de verificación OTP
  const otpCode = React.useMemo(() => {
    if (!message) return null;
    return extractOtpCode(message.subject, message.text || '', message.html || '');
  }, [message]);

  const handleCopyOtp = async () => {
    if (!otpCode) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(otpCode);
      } else {
        throw new Error('Clipboard API no disponible');
      }
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = otpCode;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2500);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-tech-card overflow-hidden w-full max-w-full min-w-0 relative">
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

        <div className="flex items-center gap-1.5">
          {/* Mover a carpeta */}
          {onMoveToFolder && (
            <div className="relative">
              <button
                onClick={() => setShowMoveMenu(!showMoveMenu)}
                className="p-2 rounded-xl text-tech-muted hover:text-white hover:bg-tech-card-hover transition-colors"
                title="Mover a otra carpeta"
              >
                <FolderInput className="w-4 h-4" />
              </button>

              {showMoveMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-tech-card border border-tech-border rounded-xl shadow-xl py-1 z-30 animate-fadeIn">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-tech-muted border-b border-tech-border/50">
                    Mover a carpeta
                  </div>
                  {availableFolders.map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        onMoveToFolder(f);
                        setShowMoveMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-tech-text hover:bg-tech-card-hover hover:text-tech-yellow capitalize transition-colors"
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
            className="p-2 rounded-xl text-tech-muted hover:text-white hover:bg-tech-card-hover transition-colors flex items-center gap-1.5"
            title="Responder"
          >
            <Reply className="w-4 h-4" />
            <span className="text-xs hidden sm:inline">Responder</span>
          </button>

          <button
            onClick={() => {
              if (confirm('¿Deseas enviar este correo a la papelera?')) {
                onDelete(message.uid);
              }
            }}
            className="p-2 rounded-xl text-tech-muted hover:text-red-400 hover:bg-tech-card-hover transition-colors"
            title="Enviar a papelera"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contenido del correo */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 space-y-4 pb-24 md:pb-6 w-full max-w-full min-w-0">
        {/* Cabecera del correo */}
        <div className="w-full min-w-0">
          <h1 className="text-base sm:text-xl font-bold text-white mb-2.5 break-words">
            {message.subject || '(Sin asunto)'}
          </h1>

          <div className="pb-3 border-b border-tech-border/50 text-xs w-full min-w-0 space-y-1.5">
            <div className="flex items-start justify-between gap-2 w-full min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-tech-yellow/10 border border-tech-yellow/30 flex items-center justify-center text-tech-yellow font-bold text-xs shrink-0">
                  {(message.fromName || message.from).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white truncate text-sm">
                    {message.fromName || message.from}
                  </div>
                  <div className="text-tech-muted truncate text-[11px]">
                    De: {message.from}
                  </div>
                </div>
              </div>

              {/* Fecha visible siempre a la derecha de forma compacta */}
              <div
                className="text-tech-muted text-[11px] shrink-0 text-right font-medium"
                title={formatFullDate(message.date)}
              >
                {formatDisplayDate(message.date)}
              </div>
            </div>

            {/* Destinatario en su propia línea inferior alineada */}
            <div className="text-zinc-400 text-[11px] truncate pl-[42px]">
              <span className="text-zinc-500">Para: </span>
              {message.to}
            </div>
          </div>
        </div>

        {/* Banner de Código de Verificación OTP con botón de copia rápida */}
        {otpCode && (
          <div className="p-3 sm:p-3.5 rounded-2xl bg-tech-yellow/10 border border-tech-yellow/40 flex items-center justify-between gap-3 text-xs animate-fadeIn shadow-lg shadow-tech-yellow/5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-tech-yellow/20 flex items-center justify-center shrink-0">
                <Key className="w-4 h-4 text-tech-yellow" />
              </div>
              <div className="min-w-0">
                <div className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                  Código de verificación
                </div>
                <div className="text-white font-mono font-bold text-base sm:text-lg tracking-widest truncate select-all">
                  {otpCode}
                </div>
              </div>
            </div>
            <button
              onClick={handleCopyOtp}
              className="px-3.5 py-2 rounded-xl bg-tech-yellow text-black font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-yellow-400 active:scale-95 transition-all shrink-0"
              title="Copiar código al portapapeles"
            >
              {copiedOtp ? (
                <>
                  <Check className="w-4 h-4 text-black stroke-[3]" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-black" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Aviso de imágenes externas compacto */}
        {hasExternalImages && !showImages && (
          <div className="py-2 px-3 rounded-xl bg-tech-carbon border border-tech-border flex items-center justify-between gap-2 text-xs text-tech-muted">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldAlert className="w-4 h-4 text-tech-yellow shrink-0" />
              <span className="truncate">Imágenes externas bloqueadas</span>
            </div>
            <button
              onClick={() => setShowImages(true)}
              className="px-2.5 py-1 rounded-lg bg-tech-card hover:bg-tech-card-hover text-tech-yellow font-semibold shrink-0 border border-tech-border transition-colors text-[11px]"
            >
              Cargar imágenes
            </button>
          </div>
        )}

        {/* Archivos adjuntos con visor integrado */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-tech-muted flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-tech-yellow" />
              <span>Archivos adjuntos ({message.attachments.length})</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {message.attachments.map((att, idx) => {
                const isImg = isImageFile(att.filename, att.contentType);
                const isPdf = isPdfFile(att.filename, att.contentType);
                const canPreview = isImg || isPdf;

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-tech-carbon border border-tech-border hover:border-tech-yellow/50 text-xs text-zinc-200 flex items-center justify-between gap-3 transition-all hover:shadow-md group"
                  >
                    <div
                      onClick={() => handlePreviewAttachment(idx, att.filename, att.contentType)}
                      className="flex items-center gap-2.5 overflow-hidden flex-1 cursor-pointer"
                    >
                      <Paperclip className="w-4 h-4 text-tech-yellow shrink-0" />
                      <div className="overflow-hidden">
                        <span className="font-semibold block truncate group-hover:text-tech-yellow transition-colors">
                          {att.filename}
                        </span>
                        <span className="text-[10px] text-tech-muted">
                          {Math.round(att.size / 1024)} KB {canPreview ? (isPdf ? '• PDF' : '• Imagen') : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {canPreview && (
                        <button
                          onClick={() => handlePreviewAttachment(idx, att.filename, att.contentType)}
                          className="p-1.5 rounded-lg bg-tech-card text-tech-muted hover:text-tech-yellow transition-colors"
                          title="Previsualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onDownloadAttachment(idx, att.filename)}
                        className="p-1.5 rounded-lg bg-tech-card text-tech-muted hover:text-tech-yellow transition-colors"
                        title="Descargar archivo"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cuerpo del correo con Tarjeta de Lectura blanca para HTML */}
        <div className="pt-2 w-full min-w-0">
          {message.html ? (
            <div className="w-full min-w-0 bg-white text-zinc-900 rounded-2xl p-4 sm:p-6 shadow-xl border border-zinc-200/30 overflow-hidden">
              <div className="w-full min-w-0 overflow-x-auto email-content">
                <div
                  className={`prose max-w-none text-zinc-900 text-sm leading-relaxed ${
                    !showImages ? '[&_img]:hidden' : ''
                  } break-words`}
                  dangerouslySetInnerHTML={{ __html: message.html }}
                />
              </div>
            </div>
          ) : (
            <div className="w-full min-w-0 bg-tech-carbon rounded-2xl p-4 sm:p-6 border border-tech-border/50">
              <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-200 leading-relaxed break-words w-full overflow-x-auto">
                {message.text}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Modal Visor Integrado de Adjuntos (PDF e Imágenes) */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col p-2 sm:p-6 animate-fadeIn">
          {/* Cabecera del visor */}
          <div className="flex items-center justify-between bg-tech-card/90 px-4 py-3 rounded-t-2xl border border-tech-border text-white shrink-0">
            <div className="flex items-center gap-2 overflow-hidden mr-3">
              <Paperclip className="w-4 h-4 text-tech-yellow shrink-0" />
              <span className="text-xs sm:text-sm font-semibold truncate">
                {previewAttachment.filename}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={previewAttachment.url}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-tech-carbon border border-tech-border text-tech-muted hover:text-white"
                title="Abrir en pestaña nueva"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={() => onDownloadAttachment(previewAttachment.index, previewAttachment.filename)}
                className="p-1.5 rounded-lg bg-tech-carbon border border-tech-border text-tech-muted hover:text-tech-yellow"
                title="Descargar"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewAttachment(null)}
                className="p-1.5 rounded-lg bg-tech-carbon border border-tech-border text-tech-muted hover:text-white"
                title="Cerrar visor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Área de visualización */}
          <div className="flex-1 bg-tech-carbon/90 border-x border-b border-tech-border rounded-b-2xl overflow-hidden flex items-center justify-center p-2">
            {previewAttachment.isImage ? (
              <img
                src={previewAttachment.url}
                alt={previewAttachment.filename}
                className="max-h-[82vh] max-w-full object-contain rounded-lg shadow-2xl"
              />
            ) : previewAttachment.isPdf ? (
              <iframe
                src={previewAttachment.url}
                title={previewAttachment.filename}
                className="w-full h-full rounded-lg border-0 bg-white"
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
