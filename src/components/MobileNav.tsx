import React, { useState } from 'react';
import { Inbox, Send, Plus, Folder, Users, LogOut, ChevronUp, UserCheck, Bell } from 'lucide-react';

interface Account {
  email: string;
  token: string;
}

interface MobileNavProps {
  currentFolder: string;
  onSelectFolder: (folder: string) => void;
  onOpenCompose: () => void;
  onLogout: () => void;
  unreadCount?: number;
  foldersList?: string[];
  savedAccounts?: Account[];
  currentEmail?: string;
  onSwitchAccount?: (account: Account) => void;
  onAddAccount?: () => void;
  pushEnabled?: boolean;
  onEnablePush?: () => void;
  onTestPush?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentFolder,
  onSelectFolder,
  onOpenCompose,
  onLogout,
  unreadCount = 0,
  foldersList = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Alibaba', 'GM2', 'SumUp'],
  savedAccounts = [],
  currentEmail = '',
  onSwitchAccount,
  onAddAccount,
  pushEnabled = false,
  onEnablePush,
  onTestPush,
}) => {
  const [showFoldersSheet, setShowFoldersSheet] = useState(false);
  const [showAccountsSheet, setShowAccountsSheet] = useState(false);

  return (
    <>
      {/* Menú flotante de Carpetas */}
      {showFoldersSheet && (
        <div className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div className="bg-tech-card border-t border-tech-border rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto space-y-2 animate-fadeIn pb-safe">
            <div className="flex items-center justify-between pb-2 border-b border-tech-border">
              <h3 className="text-sm font-bold text-white">Carpetas</h3>
              <button
                onClick={() => setShowFoldersSheet(false)}
                className="text-xs text-tech-yellow font-semibold"
              >
                Cerrar
              </button>
            </div>
            {foldersList.map((f) => (
              <button
                key={f}
                onClick={() => {
                  onSelectFolder(f);
                  setShowFoldersSheet(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium capitalize flex items-center justify-between transition-colors ${
                  currentFolder.toUpperCase() === f.toUpperCase()
                    ? 'bg-tech-yellow/10 text-tech-yellow border border-tech-yellow/20'
                    : 'text-zinc-300 hover:bg-tech-card-hover'
                }`}
              >
                <span>{f}</span>
                {f.toUpperCase() === 'INBOX' && unreadCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-tech-yellow text-black font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menú flotante de Cuentas */}
      {showAccountsSheet && (
        <div className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div className="bg-tech-card border-t border-tech-border rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto space-y-3 animate-fadeIn pb-safe">
            <div className="flex items-center justify-between pb-2 border-b border-tech-border">
              <h3 className="text-sm font-bold text-white">Tus Cuentas</h3>
              <button
                onClick={() => setShowAccountsSheet(false)}
                className="text-xs text-tech-yellow font-semibold"
              >
                Cerrar
              </button>
            </div>

            {savedAccounts.map((acc) => (
              <button
                key={acc.email}
                onClick={() => {
                  if (onSwitchAccount && acc.email !== currentEmail) {
                    onSwitchAccount(acc);
                  }
                  setShowAccountsSheet(false);
                }}
                className={`w-full text-left px-3.5 py-3 rounded-xl text-xs flex items-center justify-between transition-colors border ${
                  acc.email === currentEmail
                    ? 'border-tech-yellow bg-tech-yellow/10 text-tech-yellow font-bold'
                    : 'border-tech-border text-zinc-300 hover:bg-tech-card-hover'
                }`}
              >
                <span className="truncate">{acc.email}</span>
                {acc.email === currentEmail && <UserCheck className="w-4 h-4 text-tech-yellow shrink-0" />}
              </button>
            ))}

            {onEnablePush && (
              <div className="pt-2 border-t border-tech-border flex items-center gap-2">
                <button
                  onClick={onEnablePush}
                  className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                    pushEnabled
                      ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
                      : 'border-tech-yellow text-tech-yellow bg-tech-yellow/10'
                  }`}
                >
                  <Bell className="w-4 h-4 shrink-0" />
                  <span>{pushEnabled ? 'Notificaciones activas' : 'Activar avisos en el móvil'}</span>
                </button>
                {pushEnabled && onTestPush && (
                  <button
                    onClick={onTestPush}
                    className="py-2.5 px-3 rounded-xl border border-tech-border text-zinc-300 text-xs font-semibold hover:bg-tech-card-hover"
                  >
                    Probar
                  </button>
                )}
              </div>
            )}

            {onAddAccount && (
              <button
                onClick={() => {
                  onAddAccount();
                  setShowAccountsSheet(false);
                }}
                className="w-full text-center py-2.5 rounded-xl border border-tech-yellow/50 text-tech-yellow text-xs font-semibold hover:bg-tech-yellow/10 transition-colors"
              >
                + Añadir otra cuenta
              </button>
            )}

            <button
              onClick={() => {
                setShowAccountsSheet(false);
                onLogout();
              }}
              className="w-full text-center py-2 text-xs text-red-400 font-medium"
            >
              Cerrar sesión actual
            </button>
          </div>
        </div>
      )}

      {/* Barra de navegación inferior móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-tech-card border-t border-tech-border px-3 pt-2 pb-nav-safe flex items-center justify-around z-40">
        <button
          onClick={() => onSelectFolder('INBOX')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[11px] font-medium relative ${
            currentFolder.toUpperCase() === 'INBOX' ? 'text-tech-yellow' : 'text-tech-muted'
          }`}
        >
          <div className="relative">
            <Inbox className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 bg-tech-yellow text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span>Entrada</span>
        </button>

        <button
          onClick={() => setShowFoldersSheet(true)}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[11px] font-medium ${
            currentFolder.toUpperCase() !== 'INBOX' && currentFolder.toUpperCase() !== 'SENT'
              ? 'text-tech-yellow'
              : 'text-tech-muted'
          }`}
        >
          <Folder className="w-5 h-5" />
          <span>Carpetas</span>
        </button>

        {/* Botón flotante central de Redactar */}
        <button
          onClick={onOpenCompose}
          className="w-12 h-12 -mt-5 rounded-full bg-tech-yellow text-black flex items-center justify-center shadow-lg shadow-tech-yellow/20 active:scale-95 transition-transform"
          aria-label="Redactar nuevo correo"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        <button
          onClick={() => onSelectFolder('Sent')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[11px] font-medium ${
            currentFolder.toUpperCase() === 'SENT' ? 'text-tech-yellow' : 'text-tech-muted'
          }`}
        >
          <Send className="w-5 h-5" />
          <span>Enviados</span>
        </button>

        <button
          onClick={() => setShowAccountsSheet(true)}
          className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[11px] font-medium text-tech-muted hover:text-white"
        >
          <Users className="w-5 h-5" />
          <span>Cuentas</span>
        </button>
      </nav>
    </>
  );
};
