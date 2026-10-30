import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { MailboxView, MailSummary } from './components/MailboxView';
import { MessageDetail, MailDetail } from './components/MessageDetail';
import { ComposeModal } from './components/ComposeModal';
import { LoginView } from './components/LoginView';

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('escapes_mail_token'));
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem('escapes_mail_user') || '');

  const [currentFolder, setCurrentFolder] = useState<string>('INBOX');
  const [messages, setMessages] = useState<MailSummary[]>([]);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [currentDetail, setCurrentDetail] = useState<MailDetail | null>(null);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState<{ to?: string; subject?: string } | undefined>();
  const [pushEnabled, setPushEnabled] = useState(false);

  // Manejar cierre de sesión si no hay token
  const handleLogout = () => {
    localStorage.removeItem('escapes_mail_token');
    localStorage.removeItem('escapes_mail_user');
    setToken(null);
    setUserEmail('');
    setMessages([]);
    setSelectedUid(null);
    setCurrentDetail(null);
  };

  // Cargar lista de correos
  const fetchMessages = async (folder = currentFolder, targetPage = page) => {
    if (!token) return;
    setLoadingList(true);

    try {
      const res = await fetch(`/api/mail/messages?folder=${encodeURIComponent(folder)}&page=${targetPage}&limit=25`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }

      const data = await res.json();
      setMessages(data.messages || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error cargando mensajes:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMessages(currentFolder, page);
    }
  }, [token, currentFolder, page]);

  // Cargar detalle de un mensaje
  const handleSelectMessage = async (uid: number) => {
    setSelectedUid(uid);
    setLoadingDetail(true);

    try {
      const res = await fetch(`/api/mail/message/${uid}?folder=${encodeURIComponent(currentFolder)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Error al cargar mensaje');
      const data = await res.json();
      setCurrentDetail(data.message);

      // Actualizar estado local a leído
      setMessages((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, unread: false } : m))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Alternar estrella (starred)
  const handleToggleStar = async (uid: number, starred: boolean) => {
    setMessages((prev) =>
      prev.map((m) => (m.uid === uid ? { ...m, starred } : m))
    );
    if (currentDetail && currentDetail.uid === uid) {
      setCurrentDetail({ ...currentDetail, starred });
    }

    try {
      await fetch('/api/mail/flag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          folder: currentFolder,
          uid,
          flag: '\\Flagged',
          add: starred,
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Eliminar mensaje
  const handleDeleteMessage = async (uid: number) => {
    if (!confirm('¿Deseas mover este correo a la papelera?')) return;

    try {
      await fetch(`/api/mail/message/${uid}?folder=${encodeURIComponent(currentFolder)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessages((prev) => prev.filter((m) => m.uid !== uid));
      setSelectedUid(null);
      setCurrentDetail(null);
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      console.error(err);
    }
  };

  // Responder
  const handleReply = (detail: MailDetail) => {
    setReplyDraft({
      to: detail.from,
      subject: detail.subject.startsWith('Re:') ? detail.subject : `Re: ${detail.subject}`,
    });
    setIsComposeOpen(true);
  };

  // Activar Notificaciones Web Push
  const handleEnablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Tu navegador no soporta notificaciones push.');
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch('/api/push/vapid-key');
      const { publicKey } = await keyRes.json();

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription }),
      });

      setPushEnabled(true);
      alert('¡Notificaciones activadas con éxito! Recibirás avisos en tu pantalla de inicio.');
    } catch (err) {
      console.error('Error al activar notificaciones:', err);
      alert('No se pudieron activar las notificaciones. Asegúrate de conceder permisos.');
    }
  };

  if (!token) {
    return (
      <LoginView
        onLoginSuccess={(email, newToken) => {
          setUserEmail(email);
          setToken(newToken);
        }}
      />
    );
  }

  const unreadCount = messages.filter((m) => m.unread).length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-tech-carbon text-tech-text">
      {/* Barra lateral escritorio */}
      <div className="hidden md:flex">
        <Sidebar
          currentFolder={currentFolder}
          onSelectFolder={(folder) => {
            setCurrentFolder(folder);
            setPage(1);
            setSelectedUid(null);
            setCurrentDetail(null);
          }}
          onOpenCompose={() => {
            setReplyDraft(undefined);
            setIsComposeOpen(true);
          }}
          onLogout={handleLogout}
          userEmail={userEmail}
          unreadCount={unreadCount}
          onEnablePush={handleEnablePush}
          pushEnabled={pushEnabled}
        />
      </div>

      {/* Contenedor Principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Vista Lista de Correos */}
        <div
          className={`w-full md:w-[400px] lg:w-[450px] shrink-0 border-r border-tech-border flex flex-col h-full ${
            selectedUid ? 'hidden md:flex' : 'flex'
          }`}
        >
          <MailboxView
            messages={messages}
            loading={loadingList}
            selectedUid={selectedUid}
            onSelectMessage={handleSelectMessage}
            onRefresh={() => fetchMessages(currentFolder, page)}
            onToggleStar={handleToggleStar}
            folderName={currentFolder}
            page={page}
            total={total}
            onPageChange={setPage}
          />
        </div>

        {/* Vista Detalle de Mensaje */}
        <div
          className={`flex-1 flex flex-col h-full overflow-hidden ${
            selectedUid ? 'flex' : 'hidden md:flex'
          }`}
        >
          <MessageDetail
            message={currentDetail}
            loading={loadingDetail}
            onBack={() => {
              setSelectedUid(null);
              setCurrentDetail(null);
            }}
            onDelete={handleDeleteMessage}
            onReply={handleReply}
            onToggleStar={handleToggleStar}
          />
        </div>
      </div>

      {/* Navegación móvil inferior */}
      <MobileNav
        currentFolder={currentFolder}
        onSelectFolder={(folder) => {
          setCurrentFolder(folder);
          setPage(1);
          setSelectedUid(null);
          setCurrentDetail(null);
        }}
        onOpenCompose={() => {
          setReplyDraft(undefined);
          setIsComposeOpen(true);
        }}
        onLogout={handleLogout}
        unreadCount={unreadCount}
      />

      {/* Modal Redactar */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSendSuccess={() => {
          if (currentFolder.toUpperCase() === 'SENT') {
            fetchMessages('Sent', 1);
          }
        }}
        initialTo={replyDraft?.to}
        initialSubject={replyDraft?.subject}
      />
    </div>
  );
}
