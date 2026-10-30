import React, { useState, useRef } from 'react';
import { Mail, Star, Paperclip, RefreshCw, ChevronLeft, ChevronRight, Search, X, CheckSquare, Square, Trash2, MailOpen } from 'lucide-react';

export interface MailSummary {
  uid: number;
  seq: number;
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  date: string;
  flags: string[];
  unread: boolean;
  starred: boolean;
  hasAttachments: boolean;
}

interface MailItemProps {
  msg: MailSummary;
  isSelected: boolean;
  isChecked: boolean;
  selectionMode: boolean;
  onSelectMessage: (uid: number) => void;
  onToggleUid: (uid: number, e: React.MouseEvent) => void;
  onToggleStar: (uid: number, starred: boolean) => void;
  onSwipeDelete?: (uid: number) => void;
  onSwipeToggleRead?: (uid: number, currentlyUnread: boolean) => void;
  formatDate: (dateStr: string) => string;
}

const MailItem: React.FC<MailItemProps> = ({
  msg,
  isSelected,
  isChecked,
  selectionMode,
  onSelectMessage,
  onToggleUid,
  onToggleStar,
  onSwipeDelete,
  onSwipeToggleRead,
  formatDate,
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (selectionMode) return;
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    isHorizontalSwipeRef.current = null;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        isHorizontalSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (isHorizontalSwipeRef.current) {
      const clamped = Math.max(-110, Math.min(110, deltaX));
      setOffsetX(clamped);
    }
  };

  const handleTouchEnd = () => {
    if (isHorizontalSwipeRef.current && Math.abs(offsetX) > 65) {
      if (offsetX < -65 && onSwipeDelete) {
        onSwipeDelete(msg.uid);
      } else if (offsetX > 65 && onSwipeToggleRead) {
        onSwipeToggleRead(msg.uid, msg.unread);
      }
    }
    setOffsetX(0);
    setSwiping(false);
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isHorizontalSwipeRef.current = null;
  };

  return (
    <div className="relative overflow-hidden bg-tech-carbon select-none">
      {/* Fondo de acción al deslizar a la derecha (Leído/No leído) */}
      {offsetX > 0 && (
        <div className="absolute inset-y-0 left-0 w-full bg-tech-yellow/20 flex items-center px-4 text-tech-yellow font-semibold text-xs gap-2">
          {msg.unread ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
          <span>{msg.unread ? 'Marcar leído' : 'Marcar no leído'}</span>
        </div>
      )}

      {/* Fondo de acción al deslizar a la izquierda (Papelera) */}
      {offsetX < 0 && (
        <div className="absolute inset-y-0 right-0 w-full bg-red-600/30 flex items-center justify-end px-4 text-red-400 font-semibold text-xs gap-2">
          <span>Papelera</span>
          <Trash2 className="w-4 h-4" />
        </div>
      )}

      {/* Fila del correo */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (selectionMode) {
            onToggleUid(msg.uid, { stopPropagation: () => {} } as any);
          } else {
            onSelectMessage(msg.uid);
          }
        }}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        className={`relative z-10 p-3.5 sm:px-4 cursor-pointer flex items-start gap-3 bg-tech-carbon transition-colors ${
          isSelected
            ? 'bg-tech-yellow/10 border-l-2 border-tech-yellow'
            : msg.unread
            ? 'bg-tech-card hover:bg-tech-card-hover font-semibold text-white'
            : 'hover:bg-tech-card/60 text-tech-muted'
        }`}
      >
        {selectionMode ? (
          <button
            type="button"
            onClick={(e) => onToggleUid(msg.uid, e)}
            className="mt-0.5 text-tech-muted hover:text-tech-yellow transition-colors shrink-0"
          >
            {isChecked ? (
              <CheckSquare className="w-4 h-4 text-tech-yellow" />
            ) : (
              <Square className="w-4 h-4 text-zinc-600" />
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(msg.uid, !msg.starred);
            }}
            className="mt-0.5 text-tech-muted hover:text-tech-yellow transition-colors shrink-0"
          >
            <Star
              className={`w-4 h-4 ${
                msg.starred ? 'fill-tech-yellow text-tech-yellow' : 'text-zinc-600'
              }`}
            />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span
              className={`text-sm truncate ${
                msg.unread ? 'text-white font-bold' : 'text-zinc-300'
              }`}
            >
              {msg.fromName || msg.from}
            </span>
            <span className="text-xs text-tech-muted shrink-0">
              {formatDate(msg.date)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <h3
              className={`text-sm truncate ${
                msg.unread ? 'text-white' : 'text-tech-muted'
              }`}
            >
              {msg.subject}
            </h3>
            {msg.hasAttachments && (
              <Paperclip className="w-3.5 h-3.5 text-tech-yellow/70 shrink-0" />
            )}
          </div>
        </div>

        {msg.unread && (
          <span className="w-2 h-2 rounded-full bg-tech-yellow mt-2 shrink-0 shadow-sm shadow-tech-yellow" />
        )}
      </div>
    </div>
  );
};

interface MailboxViewProps {
  messages: MailSummary[];
  loading: boolean;
  selectedUid: number | null;
  onSelectMessage: (uid: number) => void;
  onRefresh: () => void;
  onToggleStar: (uid: number, starred: boolean) => void;
  folderName: string;
  page: number;
  total: number;
  onPageChange: (newPage: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onBatchAction?: (uids: number[], action: 'read' | 'unread' | 'delete', allMatching?: boolean) => void;
  onLoadMore?: () => void;
  onLoadAll?: () => void;
  onEmptyFolder?: (folder: string) => void;
  onSwipeDelete?: (uid: number) => void;
  onSwipeToggleRead?: (uid: number, currentlyUnread: boolean) => void;
}

type FilterMode = 'all' | 'unread' | 'attachments' | 'starred';

export const MailboxView: React.FC<MailboxViewProps> = ({
  messages,
  loading,
  selectedUid,
  onSelectMessage,
  onRefresh,
  onToggleStar,
  folderName,
  page,
  total,
  onPageChange,
  searchQuery,
  onSearchChange,
  onBatchAction,
  onLoadMore,
  onLoadAll,
  onEmptyFolder,
  onSwipeDelete,
  onSwipeToggleRead,
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [selectedUids, setSelectedUids] = useState<number[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  // Sincronizar búsqueda local
  React.useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Limpiar selección al cambiar de carpeta o búsqueda
  React.useEffect(() => {
    setSelectedUids([]);
    setSelectAllMatching(false);
  }, [folderName, searchQuery]);

  const limit = 25;
  const totalPages = Math.ceil(total / limit) || 1;

  const isTrashOrSpam = ['trash', 'papelera', 'spam', 'junk'].includes(folderName.toLowerCase());

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(localSearch);
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    onSearchChange('');
  };

  const toggleSelectAll = () => {
    if (selectedUids.length === messages.length || selectAllMatching) {
      setSelectedUids([]);
      setSelectAllMatching(false);
    } else {
      setSelectedUids(messages.map((m) => m.uid));
      setSelectAllMatching(false);
    }
  };

  const toggleSelectUid = (uid: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectAllMatching(false);
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleEmptyFolderClick = () => {
    if (!onEmptyFolder) return;
    if (
      confirm(
        `¿Estás seguro de que deseas vaciar definitivamente todos los correos de "${folderName}"? Esta acción no se puede deshacer.`
      )
    ) {
      onEmptyFolder(folderName);
    }
  };

  // Filtrado rápido cliente
  const filteredMessages = messages.filter((m) => {
    if (filterMode === 'unread') return m.unread;
    if (filterMode === 'attachments') return m.hasAttachments;
    if (filterMode === 'starred') return m.starred;
    return true;
  });

  const unreadCount = messages.filter((m) => m.unread).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-tech-carbon overflow-hidden">
      {/* Barra superior de carpeta y paginación con soporte Safe Area iOS */}
      <div className="pt-header-safe px-3 pb-3 border-b border-tech-border flex items-center justify-between bg-tech-card/80 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-white capitalize">{folderName}</h2>
          <span className="text-xs text-tech-muted px-2 py-0.5 rounded-md bg-tech-card border border-tech-border">
            {total}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Botón Vaciar Papelera / Spam */}
          {isTrashOrSpam && total > 0 && onEmptyFolder && (
            <button
              onClick={handleEmptyFolderClick}
              className="p-1.5 px-2 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 flex items-center gap-1 transition-colors"
              title={`Vaciar definitivamente ${folderName}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Vaciar</span>
            </button>
          )}

          <button
            onClick={() => {
              setSelectionMode(!selectionMode);
              setSelectedUids([]);
              setSelectAllMatching(false);
            }}
            className={`p-1.5 rounded-lg text-xs font-medium border transition-colors ${
              selectionMode
                ? 'bg-tech-yellow text-black border-tech-yellow'
                : 'text-tech-muted border-tech-border hover:text-white hover:bg-tech-card-hover'
            }`}
            title="Seleccionar correos"
          >
            {selectionMode ? 'Cancelar' : 'Seleccionar'}
          </button>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg text-tech-muted hover:text-white hover:bg-tech-card-hover transition-colors"
            title="Actualizar correos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-tech-yellow' : ''}`} />
          </button>

          {totalPages > 1 && (
            <div className="flex items-center gap-1 text-xs text-tech-muted ml-1">
              <button
                disabled={page <= 1 || loading}
                onClick={() => onPageChange(page - 1)}
                className="p-1 rounded-md disabled:opacity-30 hover:bg-tech-card-hover"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>{page}/{totalPages}</span>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => onPageChange(page + 1)}
                className="p-1 rounded-md disabled:opacity-30 hover:bg-tech-card-hover"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Barra de búsqueda */}
      <form onSubmit={handleSearchSubmit} className="p-2 border-b border-tech-border bg-tech-card/30 shrink-0">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-tech-muted absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Buscar por remitente, asunto..."
            className="w-full bg-tech-carbon border border-tech-border rounded-xl pl-9 pr-8 py-2 text-xs text-tech-text placeholder:text-zinc-500 focus:outline-none focus:border-tech-yellow transition-colors"
          />
          {localSearch && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 text-tech-muted hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </form>

      {/* Filtros rápidos (Chips de 1 toque) */}
      <div className="px-3 py-1.5 border-b border-tech-border/50 bg-tech-card/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            filterMode === 'all'
              ? 'bg-tech-yellow text-black font-semibold'
              : 'text-tech-muted hover:text-white hover:bg-tech-card'
          }`}
        >
          Todos
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('unread')}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            filterMode === 'unread'
              ? 'bg-tech-yellow text-black font-semibold'
              : 'text-tech-muted hover:text-white hover:bg-tech-card'
          }`}
        >
          <span>No leídos</span>
          {unreadCount > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                filterMode === 'unread'
                  ? 'bg-black text-tech-yellow'
                  : 'bg-tech-yellow/20 text-tech-yellow'
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('attachments')}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
            filterMode === 'attachments'
              ? 'bg-tech-yellow text-black font-semibold'
              : 'text-tech-muted hover:text-white hover:bg-tech-card'
          }`}
        >
          <Paperclip className="w-3 h-3" />
          <span>Con adjuntos</span>
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('starred')}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
            filterMode === 'starred'
              ? 'bg-tech-yellow text-black font-semibold'
              : 'text-tech-muted hover:text-white hover:bg-tech-card'
          }`}
        >
          <Star className="w-3 h-3" />
          <span>Destacados</span>
        </button>
      </div>

      {/* Barra de acciones por lote si está activo */}
      {selectionMode && (
        <div className="flex flex-col shrink-0 animate-fadeIn border-b border-tech-border bg-tech-card">
          <div className="p-2 flex items-center justify-between text-xs text-tech-text">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-tech-card-hover"
            >
              {(selectedUids.length === messages.length && messages.length > 0) || selectAllMatching ? (
                <CheckSquare className="w-4 h-4 text-tech-yellow" />
              ) : (
                <Square className="w-4 h-4 text-tech-muted" />
              )}
              <span>{selectAllMatching ? total : selectedUids.length} seleccionados</span>
            </button>

            {(selectedUids.length > 0 || selectAllMatching) && onBatchAction && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onBatchAction(selectedUids, 'read', selectAllMatching)}
                  className="p-1.5 rounded hover:bg-tech-card-hover text-tech-muted hover:text-white flex items-center gap-1"
                  title="Marcar como leídos"
                >
                  <MailOpen className="w-3.5 h-3.5 text-tech-yellow" />
                </button>
                <button
                  onClick={() => onBatchAction(selectedUids, 'delete', selectAllMatching)}
                  className="p-1.5 rounded hover:bg-tech-card-hover text-red-400 hover:text-red-300 flex items-center gap-1"
                  title="Enviar a papelera"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Banner de selección masiva estilo Gmail */}
          {selectedUids.length === messages.length && messages.length > 0 && total > messages.length && !selectAllMatching && (
            <div className="bg-tech-yellow/10 border-t border-tech-border/50 px-3 py-1.5 text-xs flex items-center justify-between text-zinc-300">
              <span className="truncate">
                Seleccionados los {messages.length} cargados.
              </span>
              <button
                type="button"
                onClick={() => setSelectAllMatching(true)}
                className="text-tech-yellow hover:underline font-semibold shrink-0 ml-2"
              >
                Seleccionar todos ({total})
              </button>
            </div>
          )}

          {selectAllMatching && (
            <div className="bg-tech-yellow/15 border-t border-tech-yellow/30 px-3 py-1.5 text-xs flex items-center justify-between text-tech-yellow font-medium">
              <span>✓ Todos los {total} correos seleccionados</span>
              <button
                type="button"
                onClick={() => {
                  setSelectAllMatching(false);
                  setSelectedUids([]);
                }}
                className="text-white hover:underline text-xs shrink-0 ml-2"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lista de mensajes con soporte de Swipe táctil en móvil */}
      <div className="flex-1 overflow-y-auto divide-y divide-tech-border/50 pb-24 md:pb-0">
        {loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-tech-muted gap-3">
            <div className="w-6 h-6 border-2 border-tech-yellow border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Buscando correos...</span>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-tech-muted gap-2">
            <Mail className="w-8 h-8 opacity-30 text-tech-yellow" />
            <span className="text-sm">
              {searchQuery
                ? 'No se encontraron resultados para la búsqueda'
                : filterMode !== 'all'
                ? 'No hay correos que coincidan con este filtro'
                : 'No hay correos en esta carpeta'}
            </span>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <MailItem
              key={msg.uid}
              msg={msg}
              isSelected={selectedUid === msg.uid}
              isChecked={selectedUids.includes(msg.uid)}
              selectionMode={selectionMode}
              onSelectMessage={onSelectMessage}
              onToggleUid={toggleSelectUid}
              onToggleStar={onToggleStar}
              onSwipeDelete={onSwipeDelete}
              onSwipeToggleRead={onSwipeToggleRead}
              formatDate={formatDate}
            />
          ))
        )}

        {/* Botones de Cargar Más y Cargar Todos */}
        {messages.length > 0 && messages.length < total && (
          <div className="p-4 flex flex-col items-center justify-center gap-2.5 bg-tech-card/20 border-t border-tech-border/30">
            <span className="text-xs text-tech-muted">
              Mostrando <strong className="text-white">{messages.length}</strong> de <strong className="text-white">{total}</strong> correos
            </span>
            <div className="flex items-center gap-2 w-full max-w-xs">
              {onLoadMore && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={onLoadMore}
                  className="flex-1 py-2 px-3 bg-tech-card border border-tech-border rounded-xl text-xs font-medium text-white hover:bg-tech-card-hover hover:border-tech-yellow/50 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Cargando...' : '+50 más'}
                </button>
              )}
              {onLoadAll && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={onLoadAll}
                  className="flex-1 py-2 px-3 bg-tech-yellow/10 border border-tech-yellow/40 rounded-xl text-xs font-semibold text-tech-yellow hover:bg-tech-yellow hover:text-black transition-colors disabled:opacity-50"
                >
                  {loading ? 'Cargando...' : `Cargar todos (${total})`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
