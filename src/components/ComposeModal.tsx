import React, { useState, useRef } from 'react';
import { X, Send, AlertCircle, Paperclip, FileText, Trash } from 'lucide-react';

interface AttachedFile {
  filename: string;
  contentType: string;
  size: number;
  content: string; // base64
}

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendSuccess: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  senderEmail?: string;
}

const DEFAULT_SIGNATURE = `\n\n--\nEscapes y Más\nhttps://escapesymas.com`;

const QUICK_TEMPLATES = [
  {
    title: 'Confirmación de recepción',
    subject: 'Hemos recibido tu solicitud - Escapes y Más',
    body: 'Hola,\n\nHemos recibido tu mensaje y estamos revisando tu consulta. Nos pondremos en contacto contigo a la mayor brevedad posible.\n\nUn cordial saludo,',
  },
  {
    title: 'Instrucciones de devolución',
    subject: 'Instrucciones para tramitar tu devolución / garantía',
    body: 'Hola,\n\nPara tramitar la garantía o devolución de la pieza, por favor adjúntanos:\n1. Foto clara del estado de la pieza y del embalaje original.\n2. Número de pedido o factura de compra.\n\nQuedamos a la espera para gestionar la recogida.\n\nUn saludo,',
  },
  {
    title: 'Información de envío',
    subject: 'Actualización sobre el envío de tu pedido',
    body: 'Hola,\n\nTe informamos de que tu pedido ha sido preparado y enviado a través de nuestra agencia de transporte.\n\nMuchas gracias por tu confianza en Escapes y Más.',
  },
];

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSendSuccess,
  initialTo = '',
  initialSubject = '',
  initialBody = '',
  senderEmail = '',
}) => {
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody ? initialBody + DEFAULT_SIGNATURE : DEFAULT_SIGNATURE);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // Limite 10MB por archivo
      if (file.size > 10 * 1024 * 1024) {
        alert(`El archivo ${file.name} supera el límite de 10 MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Content = result.split(',')[1];
        setAttachments((prev) => [
          ...prev,
          {
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
            content: base64Content,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleApplyTemplate = (tpl: typeof QUICK_TEMPLATES[0]) => {
    setSubject(tpl.subject);
    setBody(`${tpl.body}${DEFAULT_SIGNATURE}`);
    setShowTemplates(false);
  };

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
          attachments: attachments.map((a) => ({
            filename: a.filename,
            contentType: a.contentType,
            content: a.content,
          })),
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-tech-card border border-tech-border rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        {/* Cabecera */}
        <div className="p-3.5 sm:p-4 border-b border-tech-border flex items-center justify-between bg-tech-card shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Nuevo Correo</h3>
            {senderEmail && (
              <span className="text-xs text-tech-muted px-2 py-0.5 rounded-md bg-tech-carbon border border-tech-border">
                De: {senderEmail}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Botón plantillas */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="px-2.5 py-1 rounded-lg bg-tech-carbon border border-tech-border text-xs text-tech-muted hover:text-tech-yellow flex items-center gap-1 transition-colors"
                title="Plantillas rápidas"
              >
                <FileText className="w-3.5 h-3.5 text-tech-yellow" />
                <span className="hidden sm:inline">Plantillas</span>
              </button>

              {showTemplates && (
                <div className="absolute right-0 mt-2 w-64 bg-tech-carbon border border-tech-border rounded-xl shadow-2xl py-1 z-50 animate-fadeIn">
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase text-tech-muted border-b border-tech-border/50">
                    Insertar plantilla
                  </div>
                  {QUICK_TEMPLATES.map((t, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleApplyTemplate(t)}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-tech-card-hover hover:text-white transition-colors"
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-tech-muted hover:text-white hover:bg-tech-card-hover transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="m-3 p-3 rounded-xl bg-red-950/40 border border-red-800/50 flex items-center gap-2 text-red-200 text-xs shrink-0">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSend} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-semibold uppercase text-tech-muted mb-1">
                Destinatario (Para):
              </label>
              <input
                type="email"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="cliente@ejemplo.com"
                className="w-full bg-tech-carbon border border-tech-border rounded-xl px-3.5 py-2 text-sm text-tech-text focus:outline-none focus:border-tech-yellow transition-colors placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-tech-muted mb-1">
                Asunto:
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Asunto del correo"
                className="w-full bg-tech-carbon border border-tech-border rounded-xl px-3.5 py-2 text-sm text-tech-text focus:outline-none focus:border-tech-yellow transition-colors placeholder:text-zinc-600"
              />
            </div>

            {/* Lista de adjuntos si hay */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="px-2.5 py-1.5 rounded-lg bg-tech-carbon border border-tech-border text-xs text-tech-text flex items-center gap-2"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-tech-yellow shrink-0" />
                    <span className="truncate max-w-[150px] font-medium">{att.filename}</span>
                    <span className="text-[10px] text-tech-muted">({Math.round(att.size / 1024)} KB)</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="text-tech-muted hover:text-red-400 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 flex flex-col">
              <label className="block text-xs font-semibold uppercase text-tech-muted mb-1">
                Mensaje:
              </label>
              <textarea
                required
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                className="w-full bg-tech-carbon border border-tech-border rounded-xl p-3 text-sm text-tech-text focus:outline-none focus:border-tech-yellow transition-colors resize-none placeholder:text-zinc-600 leading-relaxed font-sans"
              />
            </div>
          </div>

          {/* Pie de acciones */}
          <div className="p-3 sm:p-4 border-t border-tech-border bg-tech-card flex items-center justify-between shrink-0">
            <div>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                id="compose-file-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-tech-carbon border border-tech-border hover:border-tech-yellow/50 text-xs font-medium text-tech-muted hover:text-white flex items-center gap-2 transition-colors"
              >
                <Paperclip className="w-4 h-4 text-tech-yellow" />
                <span>Adjuntar archivo</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-tech-muted hover:text-white hover:bg-tech-card-hover transition-colors"
              >
                Descartar
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-tech-yellow hover:bg-yellow-400 disabled:opacity-50 text-black text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-tech-yellow/10"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Enviar</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
