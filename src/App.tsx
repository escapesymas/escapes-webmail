import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { MailboxView, MailSummary } from './components/MailboxView';
import { MessageDetail, MailDetail } from './components/MessageDetail';
import { ComposeModal } from './components/ComposeModal';
import { LoginView } from './components/LoginView';

interface SavedAccount {
  email: string;
  token: string;
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('escapes_mail_token'));
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem('escapes_mail_user') || '');

  // Cuentas guardadas para cambio rápido
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => {
    try {
      const stored = localStorage.getItem('escapes_mail_accounts');
      if (stored) return JSON.parse(stored);
      if (token && userEmail) return [{ email: userEmail, token }];
      return [];
    } catch {
      return [];
    }
  });

  const [currentFolder, setCurrentFolder] = useState<string>('INBOX');
  const [availableFolders, setAvailableFolders] = useState<string[]>(['INBOX', 'Sent', 'Drafts', 'Trash', 'Alibaba', 'GM2', 'SumUp']);
  const [messages, setMessages] = useState<MailSummary[]>([]);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [currentDetail, setCurrentDetail] = useState<MailDetail | null>(null);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState<{ to?: string; subject?: string } | undefined>();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Guardar cuentas en LocalStorage
  const updateSavedAccounts = (email: string, newToken: string) => {
    setSavedAccounts((prev) => {
      const filtered = prev.filter((a) => a.email.toLowerCase() !== email.toLowerCase());
      const updated = [{ email, token: newToken }, ...filtered];
      localStorage.setItem('escapes_mail_accounts', JSON.stringify(updated));
      return updated;
    });
  };

  // Cierre de sesión de la cuenta actual
  const handleLogout = () => {
    const remaining = savedAccounts.filter((a) => a.email.toLowerCase() !== userEmail.toLowerCase());
    setSavedAccounts(remaining);
    localStorage.setItem('escapes_mail_accounts', JSON.stringify(remaining));

    if (remaining.length > 0) {
      handleSwitchAccount(remaining[0]);
    } else {
      localStorage.removeItem('escapes_mail_token');
      localStorage.removeItem('escapes_mail_user');
      setToken(null);
      setUserEmail('');
      setMessages([]);
      setSelectedUid(null);
      setCurrentDetail(null);
    }
  };

  // Cambiar entre cuentas guardadas
  const handleSwitchAccount = (account: SavedAccount) => {
    localStorage.setItem('escapes_mail_token', account.token);
    localStorage.setItem('escapes_mail_user', account.email);
    setToken(account.token);
    setUserEmail(account.email);
    setCurrentFolder('INBOX');
    setPage(1);
    setSearchQuery('');
    setSelectedUid(null);
    setCurrentDetail(null);
  };

  // Cargar lista de carpetas
  const fetchFolders = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/mail/folders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.folders && data.folders.length > 0) {
          setAvailableFolders(data.folders.map((f: any) => f.name || f.path));
        }
      }
    } catch (err) {
      console.warn('Error cargando carpetas:', err);
    }
  };

  // Cargar lista de correos
  const fetchMessages = async (folder = currentFolder, targetPage = page, query = searchQuery) => {
    if (!token) return;
    setLoadingList(true);

    try {
      let url = `/api/mail/messages?folder=${encodeURIComponent(folder)}&page=${targetPage}&limit=25`;
      if (query.trim()) {
        url += `&search=${encodeURIComponent(query.trim())}`;
      }

      const res = await fetch(url, {
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
      fetchFolders();
      fetchMessages(currentFolder, page, searchQuery);
    }
  }, [token, currentFolder, page, searchQuery]);

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

  // Descargar adjunto
  const handleDownloadAttachment = async (index: number, filename: string) => {
    if (!currentDetail || !token) return;

    try {
      const res = await fetch(
        `/api/mail/message/${currentDetail.uid}/attachment/${index}?folder=${encodeURIComponent(currentFolder)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error('Error al descargar');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert('No se pudo descargar el archivo adjunto.');
    }
  };

  // Mover mensaje a otra carpeta
  const handleMoveToFolder = async (targetFolder: string) => {
    if (!currentDetail || !token) return;
    try {
      const res = await fetch('/api/mail/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceFolder: currentFolder,
          targetFolder,
          uid: currentDetail.uid,
        }),
      });

      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.uid !== currentDetail.uid));
        setSelectedUid(null);
        setCurrentDetail(null);
        setTotal((t) => Math.max(0, t - 1));
      }
    } catch (err) {
      alert('Error al mover el mensaje');
    }
  };

  // Acciones en lote (batch)
  const handleBatchAction = async (uids: number[], action: 'read' | 'unread' | 'delete') => {
    if (!token || uids.length === 0) return;

    if (action === 'delete' && !confirm(`¿Deseas enviar ${uids.length} correos a la papelera?`)) {
      return;
    }

    try {
      if (action === 'delete') {
        for (const uid of uids) {
          await fetch(`/api/mail/message/${uid}?folder=${encodeURIComponent(currentFolder)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        setMessages((prev) => prev.filter((m) => !uids.includes(m.uid)));
        setTotal((t) => Math.max(0, t - uids.length));
      } else {
        const flag = '\\Seen';
        const add = action === 'read';
        for (const uid of uids) {
          await fetch('/api/mail/flag', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ folder: currentFolder, uid, flag, add }),
          });
        }
        setMessages((prev) =>
          prev.map((m) => (uids.includes(m.uid) ? { ...m, unread: !add } : m))
        );
      }
    } catch (err) {
      console.error(err);
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

  // Eliminar mensaje individual
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

  // Conversión de clave VAPID pública a Uint8Array (crucial para Safari / iOS)
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // Comprobar suscripción existente al arrancar y sincronizar con servidor
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window && token) {
      navigator.serviceWorker.ready.then(async (reg) => {
        try {
          const keyRes = await fetch('/api/push/vapid-key');
          const { publicKey } = await keyRes.json();
          const convertedKey = urlBase64ToUint8Array(publicKey);

          let sub = await reg.pushManager.getSubscription();
          if (sub) {
            // Verificar si la suscripción usa la clave VAPID actual del servidor
            const currentSubKey = (sub.options as any)?.applicationServerKey
              ? arrayBufferToBase64Url((sub.options as any).applicationServerKey)
              : null;

            if (currentSubKey && currentSubKey !== publicKey) {
              console.warn('[PUSH] Clave VAPID desactualizada detectada. Desuscribiendo clave antigua...');
              await sub.unsubscribe().catch(() => {});
              sub = null;
            }
          }

          // Si el usuario ya tenía permiso concedido pero la suscripción se renovó o faltaba
          if (!sub && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedKey,
              });
            } catch (e) {
              console.warn('[PUSH] No se pudo renovar automáticamente:', e);
            }
          }

          if (sub) {
            setPushEnabled(true);
            await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ subscription: sub }),
            }).catch(() => {});
          } else {
            setPushEnabled(false);
          }
        } catch (err) {
          console.warn('[PUSH] Error verificando suscripción inicial:', err);
        }
      });
    }
  }, [token]);

  // Activar Notificaciones Web Push
  const handleEnablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Tu navegador no soporta notificaciones push.');
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

    if (isIOS && !isStandalone) {
      alert('En iPhone, para recibir notificaciones primero toca el botón Compartir → «Añadir a la pantalla de inicio» y abre el correo desde ese icono instalado.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Permiso de notificaciones denegado. Actívalo en Ajustes de tu dispositivo.');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch('/api/push/vapid-key');
      const { publicKey } = await keyRes.json();
      const convertedKey = urlBase64ToUint8Array(publicKey);

      // Desuscribir siempre cualquier suscripción previa para garantizar clave VAPID limpia
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) {
        try {
          await existingSub.unsubscribe();
        } catch {}
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
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
      showToast('✓ Notificaciones push activadas con éxito');
    } catch (err: any) {
      console.error('Error al activar notificaciones:', err);
      alert(err.message || 'Error al activar notificaciones.');
    }
  };

  // Enviar aviso de prueba
  const handleTestPush = async () => {
    if (!token) return;
    try {
      showToast('Enviando notificación de prueba...');
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.sent > 0) {
        showToast('✓ Notificación enviada. Comprueba tu pantalla.');
      } else {
        alert(data.error || 'No se pudo entregar el aviso. Toca en el botón para reactivar las notificaciones.');
      }
    } catch {
      alert('Error enviando notificación de prueba.');
    }
  };

  if (!token || isAddingAccount) {
    return (
      <LoginView
        onLoginSuccess={(email, newToken) => {
          setUserEmail(email);
          setToken(newToken);
          updateSavedAccounts(email, newToken);
          setIsAddingAccount(false);
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
          onTestPush={handleTestPush}
          pushEnabled={pushEnabled}
          savedAccounts={savedAccounts}
          onSwitchAccount={handleSwitchAccount}
          onAddAccount={() => setIsAddingAccount(true)}
          foldersList={availableFolders}
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
            onRefresh={() => fetchMessages(currentFolder, page, searchQuery)}
            onToggleStar={handleToggleStar}
            folderName={currentFolder}
            page={page}
            total={total}
            onPageChange={setPage}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setPage(1);
            }}
            onBatchAction={handleBatchAction}
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
            onDownloadAttachment={handleDownloadAttachment}
            onMoveToFolder={handleMoveToFolder}
            availableFolders={availableFolders}
          />
        </div>
      </div>

      {/* Barra de navegación móvil inferior */}
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
        foldersList={availableFolders}
        savedAccounts={savedAccounts}
        currentEmail={userEmail}
        onSwitchAccount={handleSwitchAccount}
        onAddAccount={() => setIsAddingAccount(true)}
        pushEnabled={pushEnabled}
        onEnablePush={handleEnablePush}
        onTestPush={handleTestPush}
      />

      {/* Modal Redactar Correo */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSendSuccess={() => {
          showToast('✓ Correo enviado correctamente');
          if (currentFolder.toUpperCase() === 'SENT') {
            fetchMessages('Sent', 1);
          }
        }}
        initialTo={replyDraft?.to}
        initialSubject={replyDraft?.subject}
        senderEmail={userEmail}
      />

      {/* Notificación Toast flotante */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 sm:bottom-6 sm:right-6 sm:left-auto sm:translate-x-0 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl font-semibold text-xs sm:text-sm flex items-center gap-2 border border-emerald-400/40">
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
