import React, { useState, useRef, useEffect } from 'react';
import { X, Send, AlertCircle, Paperclip, FileText, Check, Clock } from 'lucide-react';

interface AttachedFile {
  filename: string;
  contentType: string;
  size: number;
  content: string; // base64
}

export interface ContactItem {
  name?: string;
  email: string;
}

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendSuccess: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  senderEmail?: string;
  suggestedContacts?: ContactItem[];
}

// La firma (con logotipo) la añade el servidor a todo correo enviado: ver server/signature.ts.
const DEFAULT_SIGNATURE = '';
const DRAFT_KEY = 'escapes_mail_draft';
const CONTACTS_KEY = 'escapes_mail_contacts';

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
  suggestedContacts = [],
}) => {
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody ? initialBody + DEFAULT_SIGNATURE : DEFAULT_SIGNATURE);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // Estados para autocompletado de contactos
  const [isToFocused, setIsToFocused] = useState(false);
  const [allContacts, setAllContacts] = useState<ContactItem[]>([]);

  // Estados para autoguardado de borrador
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  // Cargar contactos de localStorage + sugeridos
  useEffect(() => {
    if (!isOpen) return;
    try {
      const stored = localStorage.getItem(CONTACTS_KEY);
      const parsed: ContactItem[] = stored ? JSON.parse(stored) : [];
      const combined = [...suggestedContacts, ...parsed];
      // Deduplicar por email
      const uniqueMap = new Map<string, ContactItem>();
      combined.forEach((c) => {
        if (c.email && c.email.includes('@')) {
          uniqueMap.set(c.email.toLowerCase(), c);
        }
      });
      setAllContacts(Array.from(uniqueMap.values()));
    } catch {
      setAllContacts(suggestedContacts);
    }
  }, [isOpen, suggestedContacts]);

  // Recuperar borrador si es nuevo mensaje (no respuesta)
  useEffect(() => {
    if (!isOpen) return;
    if (initialTo || initialSubject || initialBody) {
      // Es una respuesta o nuevo correo dirigido explícito
      setTo(initialTo);
      setSubject(initialSubject);
      setBody(initialBody ? initialBody + DEFAULT_SIGNATURE : DEFAULT_SIGNATURE);
      return;
    }

    try {
      const rawDraft = localStorage.getItem(DRAFT_KEY);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (draft && (draft.to || draft.subject || (draft.body && draft.body !== DEFAULT_SIGNATURE))) {
          setTo(draft.to || '');
          setSubject(draft.subject || '');
          setBody(draft.body || DEFAULT_SIGNATURE);
          setDraftSavedAt(draft.savedAt || Date.now());
          setIsDraftRestored(true);
        }
      }
    } catch {
      // Ignorar error de parsing
    }
  }, [isOpen, initialTo, initialSubject, initialBody]);

  // Autoguardar borrador cada 2 segundos si hay cambios
  useEffect(() => {
    if (!isOpen) return;
    // Si es respuesta con initialTo no sobreescribir borrador general
    if (initialTo && initialSubject) return;

    const timer = setTimeout(() => {
      const hasContent = to.trim() || subject.trim() || (body.trim() && body.trim() !== DEFAULT_SIGNATURE.trim());
      if (hasContent) {
        const now = Date.now();
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ to: to.trim(), subject: subject.trim(), body, savedAt: now })
        );
        setDraftSavedAt(now);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [to, subject, body, isOpen, initialTo, initialSubject]);

  if (!isOpen) return null;

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setTo('');
    setSubject('');
    setBody(DEFAULT_SIGNATURE);
    setDraftSavedAt(null);
    setIsDraftRestored(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
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

  const handleApplyTemplate = (tpl: (typeof QUICK_TEMPLATES)[0]) => {
    setSubject(tpl.subject);
    setBody(`${tpl.body}${DEFAULT_SIGNATURE}`);
    setShowTemplates(false);
  };

  // Guardar contacto en localStorage al enviar
  const saveContactLocally = (email: string) => {
    try {
      const stored = localStorage.getItem(CONTACTS_KEY);
      const list: ContactItem[] = stored ? JSON.parse(stored) : [];
      if (!list.some((c) => c.email.toLowerCase() === email.toLowerCase())) {
        list.unshift({ email });
        localStorage.setItem(CONTACTS_KEY, JSON.stringify(list.slice(0, 100)));
      }
    } catch {
      // Ignorar error de storage
    }
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

      // Limpiar borrador al enviar con éxito
      localStorage.removeItem(DRAFT_KEY);
      saveContactLocally(to.trim());

      onSendSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de contactos para autocompletado
  const searchLower = to.trim().toLowerCase();
  const contactMatches = searchLower
    ? allContacts
        .filter(
          (c) =>
            c.email.toLowerCase().includes(searchLower) ||
            (c.name && c.name.toLowerCase().includes(searchLower))
        )
        .slice(0, 5)
    : [];

  const handleSelectContact = (contact: ContactItem) => {
    setTo(contact.email);
    setIsToFocused(false);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 pt-header-safe pb-nav-safe">
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

        {/* Notificación de borrador recuperado o guardado */}
        {draftSavedAt && (
          <div className="px-4 py-1.5 bg-tech-carbon/60 border-b border-tech-border/50 flex items-center justify-between text-[11px] text-tech-muted shrink-0">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-tech-yellow" />
              <span>
                {isDraftRestored ? 'Borrador recuperado' : 'Guardado automáticamente'} (
                {new Date(draftSavedAt).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                )
              </span>
            </span>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="text-red-400 hover:text-red-300 hover:underline"
            >
              Descartar borrador
            </button>
          </div>
        )}

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
            {/* Campo Destinatario con Autocompletado */}
            <div className="relative">
              <label className="block text-xs font-semibold uppercase text-tech-muted mb-1">
                Destinatario (Para):
              </label>
              <input
                ref={toInputRef}
                type="email"
                required
                value={to}
                onFocus={() => setIsToFocused(true)}
                onBlur={() => setTimeout(() => setIsToFocused(false), 200)}
                onChange={(e) => setTo(e.target.value)}
                placeholder="cliente@ejemplo.com"
                className="w-full bg-tech-carbon border border-tech-border rounded-xl px-3.5 py-2 text-sm text-tech-text focus:outline-none focus:border-tech-yellow transition-colors placeholder:text-zinc-600"
              />

              {/* Menú flotante de contactos sugeridos */}
              {isToFocused && contactMatches.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-tech-card border border-tech-border rounded-xl shadow-2xl py-1 z-40 max-h-48 overflow-y-auto animate-fadeIn">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase text-tech-muted border-b border-tech-border/40">
                    Sugerencias de contacto
                  </div>
                  {contactMatches.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectContact(c);
                      }}
                      className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-tech-card-hover transition-colors"
                    >
                      <span className="font-semibold text-white truncate">
                        {c.name ? `${c.name} (${c.email})` : c.email}
                      </span>
                      <Check className="w-3.5 h-3.5 text-tech-yellow shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              )}
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
                Cerrar
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
