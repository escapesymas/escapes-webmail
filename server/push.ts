import webpush from 'web-push';

export interface PushSubscriptionRecord {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  email: string;
  createdAt: number;
}

// Almacén en memoria de suscripciones activas
const subscriptions: PushSubscriptionRecord[] = [];

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'UUxI4O84qE8_a0rW4_a-hWcO4wZ8m5eR8s7eW1_r3vA';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:info@escapesymas.com';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn('Advertencia configurando VAPID keys en webmail:', err);
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export function saveSubscription(sub: PushSubscriptionRecord) {
  const existingIdx = subscriptions.findIndex((s) => s.endpoint === sub.endpoint);
  if (existingIdx >= 0) {
    subscriptions[existingIdx] = sub;
  } else {
    subscriptions.push(sub);
  }
}

export async function sendPushNotification(email: string, title: string, body: string, url = '/') {
  const targetSubs = subscriptions.filter((s) => s.email.toLowerCase() === email.toLowerCase());

  const payload = JSON.stringify({
    title,
    body,
    icon: '/mail-icon.svg',
    badge: '/mail-icon.svg',
    data: { url },
  });

  const promises = targetSubs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        payload
      );
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        // Suscripción caducada
        const idx = subscriptions.indexOf(sub);
        if (idx >= 0) subscriptions.splice(idx, 1);
      }
    }
  });

  await Promise.allSettled(promises);
}
