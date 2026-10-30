// Service Worker para Escapes Mail PWA
const SW_VERSION = 'v1.0.6';
const CACHE_NAME = `escapes-mail-${SW_VERSION}`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Manejo de Notificaciones Web Push (VAPID)
self.addEventListener('push', (event) => {
  let data = {
    title: 'Nuevo correo en Escapes y Más',
    body: 'Has recibido un nuevo mensaje.',
    icon: '/icon-192.png',
    badge: '/apple-touch-icon.png',
    data: { url: '/' }
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/apple-touch-icon.png',
        data: payload.data || data.data
      };
    }
  } catch (err) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [150, 75, 150],
    data: data.data,
    tag: 'escapes-mail-new',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
