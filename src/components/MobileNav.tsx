import React from 'react';
import { Inbox, Send, Plus, Bell, LogOut } from 'lucide-react';

interface MobileNavProps {
  currentFolder: string;
  onSelectFolder: (folder: string) => void;
  onOpenCompose: () => void;
  onLogout: () => void;
  unreadCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentFolder,
  onSelectFolder,
  onOpenCompose,
  onLogout,
  unreadCount = 0,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-tech-card border-t border-tech-border px-3 py-2 flex items-center justify-around z-40 pb-safe">
      <button
        onClick={() => onSelectFolder('INBOX')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium relative ${
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
        onClick={() => onSelectFolder('Sent')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium ${
          currentFolder.toUpperCase() === 'SENT' ? 'text-tech-yellow' : 'text-tech-muted'
        }`}
      >
        <Send className="w-5 h-5" />
        <span>Enviados</span>
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
        onClick={() => onSelectFolder('Trash')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium ${
          currentFolder.toUpperCase() === 'TRASH' ? 'text-tech-yellow' : 'text-tech-muted'
        }`}
      >
        <Inbox className="w-5 h-5 rotate-180" />
        <span>Papelera</span>
      </button>

      <button
        onClick={onLogout}
        className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium text-red-400"
      >
        <LogOut className="w-5 h-5" />
        <span>Salir</span>
      </button>
    </nav>
  );
};
