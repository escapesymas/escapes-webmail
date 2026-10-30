import fs from 'fs';
import path from 'path';
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

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const SUBS_FILE = path.join(DATA_DIR, 'subscriptions.json');

function loadSubscriptions(): PushSubscriptionRecord[] {
  try {
    if (fs.existsSync(SUBS_FILE)) {
      const raw = fs.readFileSync(SUBS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Advertencia cargando suscripciones push desde disco:', err);
  }
  return [];
}

function persistSubscriptions(subs: PushSubscriptionRecord[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Advertencia guardando suscripciones push en disco:', err);
  }
}

// Almacén de suscripciones activas
const subscriptions: PushSubscriptionRecord[] = loadSubscriptions();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BLwPrhtaKSOg1opTzFI8erHC8kKksUfVoI7IdUHF9240M8D-vVs4ClfjRa1w-WPrMyzg1BLzNmSZHlPnsOu6nFI';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'GRBdcL4m7pQRvDkQbwkILTFalnVn8wTupTzNTxj3XL8';
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
  persistSubscriptions(subscriptions);
  console.log(`[PUSH] Suscripción registrada para ${sub.email}. Total activas: ${subscriptions.length}`);
}

export async function sendPushNotification(email: string, title: string, body: string, url = '/') {
  const cleanEmail = email.toLowerCase().trim();
  const targetSubs = subscriptions.filter((s) => s.email.toLowerCase().trim() === cleanEmail);

  if (targetSubs.length === 0) {
    console.log(`[PUSH] Sin suscripciones activas para ${cleanEmail}`);
    return { sent: 0, error: 'No hay dispositivos suscritos. Pulsa «Activar avisos» para registrar este dispositivo.' };
  }

  // Notificación compatible con iOS (PNG en lugar de SVG)
  const payload = JSON.stringify({
    title,
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url },
  });

  let removedAny = false;
  let sentCount = 0;
  let lastError: string | null = null;

  const promises = targetSubs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        payload,
        {
          TTL: 86400,
          urgency: 'high',
        }
      );
      sentCount++;
    } catch (err: any) {
      console.warn(`[PUSH] Error enviando a ${sub.endpoint.slice(0, 35)}...:`, err.statusCode || '', err.body || err.message);
      lastError = err.body || err.message;
      if (err.statusCode === 400 || err.statusCode === 404 || err.statusCode === 410) {
        // Suscripción caducada o con clave anterior desactualizada
        const idx = subscriptions.indexOf(sub);
        if (idx >= 0) {
          subscriptions.splice(idx, 1);
          removedAny = true;
        }
      }
    }
  });

  await Promise.allSettled(promises);
  if (removedAny) {
    persistSubscriptions(subscriptions);
  }

  console.log(`[PUSH] Notificación enviada a ${sentCount} dispositivo(s) de ${cleanEmail}`);
  return {
    sent: sentCount,
    error: sentCount > 0 ? null : (lastError || 'No se pudo entregar la notificación en el dispositivo')
  };
}
