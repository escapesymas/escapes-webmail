import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Registrar Service Worker para PWA y Notificaciones Push
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Error registrando Service Worker:', err);
    });
  });
}

// Bloquear zoom por gestos de pellizco (pinch-to-zoom) en Safari iOS
document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });

// Bloquear zoom por doble toque rápido en iOS
let lastTouchEnd = 0;
document.addEventListener(
  'touchend',
  (e) => {
    const target = e.target as HTMLElement;
    // No bloquear si está tocando un botón interactivo o enlace
    if (target && (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('button'))) {
      return;
    }
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  },
  { passive: false }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
