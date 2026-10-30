import React, { useState } from 'react';
import { Inbox, Send, Trash2, FileText, AlertOctagon, LogOut, Plus, Bell, ChevronDown, UserCheck, UserPlus, Folder } from 'lucide-react';

interface Account {
  email: string;
  token: string;
}

interface SidebarProps {
  currentFolder: string;
  onSelectFolder: (folder: string) => void;
  onOpenCompose: () => void;
  onLogout: () => void;
  userEmail: string;
  unreadCount?: number;
  onEnablePush?: () => void;
  pushEnabled?: boolean;
  savedAccounts?: Account[];
  onSwitchAccount?: (account: Account) => void;
  onAddAccount?: () => void;
  foldersList?: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentFolder,
  onSelectFolder,
  onOpenCompose,
  onLogout,
  userEmail,
  unreadCount = 0,
  onEnablePush,
  pushEnabled = false,
  savedAccounts = [],
  onSwitchAccount,
  onAddAccount,
  foldersList = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Alibaba', 'GM2', 'SumUp'],
}) => {
  const [showAccounts, setShowAccounts] = useState(false);

  const getFolderIcon = (name: string) => {
    switch (name.toUpperCase()) {
      case 'INBOX':
        return Inbox;
      case 'SENT':
        return Send;
      case 'DRAFTS':
        return FileText;
      case 'TRASH':
        return Trash2;
      case 'SPAM':
      case 'JUNK':
        return AlertOctagon;
      default:
        return Folder;
    }
  };

  const getFolderLabel = (name: string) => {
    switch (name.toUpperCase()) {
      case 'INBOX':
        return 'Bandeja de entrada';
      case 'SENT':
        return 'Enviados';
      case 'DRAFTS':
        return 'Borradores';
      case 'TRASH':
        return 'Papelera';
      case 'SPAM':
      case 'JUNK':
        return 'Spam';
      default:
        return name;
    }
  };

  return (
    <aside className="w-64 bg-tech-card border-r border-tech-border flex flex-col h-full shrink-0 select-none">
      {/* Cabecera y Selector Multicuenta */}
      <div className="p-4 border-b border-tech-border relative">
        <div
          onClick={() => setShowAccounts(!showAccounts)}
          className="flex items-center justify-between p-2 rounded-xl hover:bg-tech-card-hover cursor-pointer transition-colors mb-3 group"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-tech-carbon border border-tech-yellow/30 flex items-center justify-center shrink-0">
              <Inbox className="w-4 h-4 text-tech-yellow" />
            </div>
            <div className="overflow-hidden">
              <h2 className="text-xs font-bold text-white truncate leading-tight">Escapes Mail</h2>
              <p className="text-[11px] text-tech-muted truncate group-hover:text-zinc-200 transition-colors">
                {userEmail}
              </p>
            </div>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-tech-muted transition-transform ${showAccounts ? 'rotate-180 text-tech-yellow' : ''}`} />
        </div>

        {/* Desplegable Multicuenta */}
        {showAccounts && (
          <div className="absolute top-16 left-3 right-3 bg-tech-carbon border border-tech-border rounded-xl shadow-2xl py-1.5 z-50 animate-fadeIn">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-tech-muted border-b border-tech-border/50">
              Cambiar de cuenta
            </div>

            {savedAccounts.map((acc) => (
              <button
                key={acc.email}
                onClick={() => {
                  if (onSwitchAccount && acc.email !== userEmail) {
                    onSwitchAccount(acc);
                  }
                  setShowAccounts(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                  acc.email === userEmail
                    ? 'text-tech-yellow font-semibold bg-tech-card/50'
                    : 'text-zinc-300 hover:bg-tech-card-hover hover:text-white'
                }`}
              >
                <span className="truncate">{acc.email}</span>
                {acc.email === userEmail && <UserCheck className="w-3.5 h-3.5 text-tech-yellow shrink-0" />}
              </button>
            ))}

            {onAddAccount && (
              <button
                onClick={() => {
                  onAddAccount();
                  setShowAccounts(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-tech-yellow hover:bg-tech-card-hover flex items-center gap-1.5 border-t border-tech-border/50 mt-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Iniciar otra cuenta</span>
              </button>
            )}
          </div>
        )}

        <button
          onClick={onOpenCompose}
          className="w-full bg-tech-yellow hover:bg-yellow-400 text-black font-semibold rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 transition-all shadow-sm shadow-tech-yellow/10 text-xs"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Redactar correo</span>
        </button>
      </div>

      {/* Lista de carpetas */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {foldersList.map((fName) => {
          const Icon = getFolderIcon(fName);
          const isActive = currentFolder.toUpperCase() === fName.toUpperCase();

          return (
            <button
              key={fName}
              onClick={() => onSelectFolder(fName)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-tech-yellow/10 text-tech-yellow border border-tech-yellow/20'
                  : 'text-tech-muted hover:text-tech-text hover:bg-tech-card-hover'
              }`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-tech-yellow' : 'text-tech-muted'}`} />
                <span className="truncate">{getFolderLabel(fName)}</span>
              </div>
              {fName.toUpperCase() === 'INBOX' && unreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-tech-yellow text-black font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Pie con opciones y notificaciones */}
      <div className="p-3 border-t border-tech-border space-y-2">
        {onEnablePush && (
          <button
            onClick={onEnablePush}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
              pushEnabled
                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
                : 'border-tech-border text-tech-muted hover:text-tech-text hover:bg-tech-card-hover'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {pushEnabled ? 'Notificaciones activas' : 'Activar notificaciones'}
            </span>
          </button>
        )}

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400/80 hover:text-red-400 hover:bg-red-950/20 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};
