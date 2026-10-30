import React from 'react';
import { Inbox, Send, Trash2, FileText, AlertOctagon, LogOut, Plus, Bell } from 'lucide-react';

interface SidebarProps {
  currentFolder: string;
  onSelectFolder: (folder: string) => void;
  onOpenCompose: () => void;
  onLogout: () => void;
  userEmail: string;
  unreadCount?: number;
  onEnablePush?: () => void;
  pushEnabled?: boolean;
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
}) => {
  const folders = [
    { id: 'INBOX', name: 'Bandeja de entrada', icon: Inbox, count: unreadCount },
    { id: 'Sent', name: 'Enviados', icon: Send },
    { id: 'Drafts', name: 'Borradores', icon: FileText },
    { id: 'Spam', name: 'Spam / No deseado', icon: AlertOctagon },
    { id: 'Trash', name: 'Papelera', icon: Trash2 },
  ];

  return (
    <aside className="w-64 bg-tech-card border-r border-tech-border flex flex-col h-full shrink-0 select-none">
      {/* Cabecera */}
      <div className="p-4 border-b border-tech-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-tech-carbon border border-tech-yellow/30 flex items-center justify-center">
            <Inbox className="w-5 h-5 text-tech-yellow" />
          </div>
          <div className="overflow-hidden">
            <h2 className="text-sm font-bold text-white truncate leading-tight">Escapes Mail</h2>
            <p className="text-xs text-tech-muted truncate">{userEmail}</p>
          </div>
        </div>

        <button
          onClick={onOpenCompose}
          className="w-full bg-tech-yellow hover:bg-yellow-400 text-black font-semibold rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 transition-all shadow-sm shadow-tech-yellow/10"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Redactar</span>
        </button>
      </div>

      {/* Lista de carpetas */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {folders.map((f) => {
          const Icon = f.icon;
          const isActive = currentFolder.toUpperCase() === f.id.toUpperCase();

          return (
            <button
              key={f.id}
              onClick={() => onSelectFolder(f.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-tech-yellow/10 text-tech-yellow border border-tech-yellow/20'
                  : 'text-tech-muted hover:text-tech-text hover:bg-tech-card-hover'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-tech-yellow' : 'text-tech-muted'}`} />
                <span>{f.name}</span>
              </div>
              {f.count !== undefined && f.count > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-tech-yellow text-black font-bold">
                  {f.count}
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
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
              pushEnabled
                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
                : 'border-tech-border text-tech-muted hover:text-tech-text hover:bg-tech-card-hover'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {pushEnabled ? 'Notificaciones activas' : 'Activar notificaciones móvil'}
            </span>
          </button>
        )}

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-950/30 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};
