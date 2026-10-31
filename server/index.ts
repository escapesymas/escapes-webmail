import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import {
  verifyCredentials,
  getFolders,
  listMessages,
  getMessage,
  getAttachment,
  moveMessage,
  toggleMessageFlag,
  deleteMessage,
  batchProcessMessages,
  emptyFolder,
} from './imap.js';
import { sendEmail } from './smtp.js';
import { getVapidPublicKey, saveSubscription, sendPushNotification } from './push.js';
import { formatSenderNotification, formatSubjectNotification } from './mime.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'escapes-webmail-jwt-secret-key-2026';

app.use(cors());
// Permitir adjuntos grandes en envíos
app.use(express.json({ limit: '25mb' }));

// Middleware de autenticación por Token
interface AuthUser {
  email: string;
  pass: string;
}

function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || (req.query.token as string);

  if (!token) {
    return res.status(401).json({ error: 'Sesión no iniciada' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Sesión caducada o inválida' });
    req.user = user as AuthUser;
    next();
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'escapes-webmail', time: new Date().toISOString() });
});

// Login con credenciales de correo
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  try {
    const valid = await verifyCredentials(email, password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales de correo incorrectas' });
    }

    const token = jwt.sign({ email, pass: password }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, email });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al conectar con el servidor de correo' });
  }
});

// Listar carpetas
app.get('/api/mail/folders', authenticateToken, async (req: any, res) => {
  try {
    const folders = await getFolders(req.user.email, req.user.pass);
    res.json({ folders });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener carpetas' });
  }
});

// Listar correos de una carpeta (con soporte de búsqueda y filtro por campo)
app.get('/api/mail/messages', authenticateToken, async (req: any, res) => {
  const folder = (req.query.folder as string) || 'INBOX';
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 25;
  const search = req.query.search ? String(req.query.search) : undefined;
  const searchField = (req.query.searchField as any) || 'all';

  try {
    const result = await listMessages(req.user.email, req.user.pass, folder, page, limit, search, searchField);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al listar mensajes' });
  }
});

// Detalle de un correo
app.get('/api/mail/message/:uid', authenticateToken, async (req: any, res) => {
  const folder = (req.query.folder as string) || 'INBOX';
  const uid = parseInt(req.params.uid, 10);

  if (isNaN(uid)) {
    return res.status(400).json({ error: 'UID inválido' });
  }

  try {
    const message = await getMessage(req.user.email, req.user.pass, folder, uid);
    if (!message) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }
    res.json({ message });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener mensaje' });
  }
});

// Descargar archivo adjunto
app.get('/api/mail/message/:uid/attachment/:index', authenticateToken, async (req: any, res) => {
  const folder = (req.query.folder as string) || 'INBOX';
  const uid = parseInt(req.params.uid, 10);
  const index = parseInt(req.params.index, 10);

  if (isNaN(uid) || isNaN(index)) {
    return res.status(400).json({ error: 'Parámetros inválidos' });
  }

  try {
    const att = await getAttachment(req.user.email, req.user.pass, folder, uid, index);
    if (!att) {
      return res.status(404).json({ error: 'Adjunto no encontrado' });
    }

    res.setHeader('Content-Type', att.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(att.filename)}"`);
    res.send(att.content);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error descargando archivo' });
  }
});

// Mover correo a otra carpeta
app.post('/api/mail/move', authenticateToken, async (req: any, res) => {
  const { sourceFolder, targetFolder, uid } = req.body;

  if (!sourceFolder || !targetFolder || !uid) {
    return res.status(400).json({ error: 'Parámetros incompletos' });
  }

  try {
    const success = await moveMessage(req.user.email, req.user.pass, sourceFolder, targetFolder, parseInt(uid, 10));
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al mover mensaje' });
  }
});

// Enviar correo (con soporte de adjuntos)
app.post('/api/mail/send', authenticateToken, async (req: any, res) => {
  const { to, subject, text, html, replyTo, attachments } = req.body;

  if (!to || !subject) {
    return res.status(400).json({ error: 'Destinatario y asunto requeridos' });
  }

  try {
    const result = await sendEmail({
      user: req.user.email,
      pass: req.user.pass,
      to,
      subject,
      text,
      html,
      replyTo,
      attachments,
    });

    if (result.success) {
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al enviar correo' });
  }
});

// Marcar como leído / starred
app.post('/api/mail/flag', authenticateToken, async (req: any, res) => {
  const { folder, uid, flag, add } = req.body;

  if (!folder || !uid || !flag) {
    return res.status(400).json({ error: 'Parámetros incompletos' });
  }

  try {
    const success = await toggleMessageFlag(req.user.email, req.user.pass, folder, uid, flag, add);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error actualizando estado' });
  }
});

// Eliminar mensaje
app.delete('/api/mail/message/:uid', authenticateToken, async (req: any, res) => {
  const folder = (req.query.folder as string) || 'INBOX';
  const uid = parseInt(req.params.uid, 10);

  try {
    const success = await deleteMessage(req.user.email, req.user.pass, folder, uid);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error eliminando mensaje' });
  }
});

// Acciones masivas en lote (marcar leídos, no leídos, eliminar o toda la carpeta/búsqueda)
app.post('/api/mail/batch', authenticateToken, async (req: any, res) => {
  const { folder, action, uids, allMatching, search, searchField } = req.body;

  if (!folder || !action) {
    return res.status(400).json({ error: 'Carpeta y acción requeridas' });
  }

  try {
    const result = await batchProcessMessages(req.user.email, req.user.pass, folder, {
      action,
      uids,
      allMatching: Boolean(allMatching),
      search,
      searchField,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al procesar lote de correos' });
  }
});

// Vaciar carpeta permanentemente (Papelera, Spam)
app.post('/api/mail/empty-folder', authenticateToken, async (req: any, res) => {
  const { folder } = req.body;
  if (!folder) {
    return res.status(400).json({ error: 'Carpeta requerida' });
  }

  try {
    const result = await emptyFolder(req.user.email, req.user.pass, folder);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al vaciar la carpeta' });
  }
});

// Web Push: Clave pública VAPID
app.get('/api/push/vapid-key', (req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

// Web Push: Guardar suscripción
app.post('/api/push/subscribe', authenticateToken, (req: any, res) => {
  const { subscription } = req.body;
  if (!subscription) {
    return res.status(400).json({ error: 'Suscripción requerida' });
  }

  saveSubscription({
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    email: req.user.email,
    createdAt: Date.now(),
  });
  res.json({ success: true });
});

const INTERNAL_PUSH_SECRET = process.env.INTERNAL_PUSH_SECRET || 'escapes-push-secret-2026';

// Webhook para avisos de correo entrante desde Poste.io (Haraka)
app.post('/api/push/incoming-notify', async (req, res) => {
  const { secret, to, from, subject } = req.body;
  if (secret !== INTERNAL_PUSH_SECRET) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  if (!to) {
    return res.status(400).json({ error: 'Destinatario requerido' });
  }

  const cleanTo = String(to).replace(/[<>]/g, '').trim().toLowerCase();
  const title = formatSenderNotification(from);
  const body = formatSubjectNotification(subject);

  console.log(`[PUSH] Notificando correo entrante para ${cleanTo}: "${title}" - "${body}"`);

  const result = await sendPushNotification(
    cleanTo,
    title,
    body,
    '/'
  );

  res.json({ success: result.sent > 0, sent: result.sent, error: result.error });
});

// Enviar notificación de prueba a la cuenta actual
app.post('/api/push/test', authenticateToken, async (req: any, res) => {
  const result = await sendPushNotification(
    req.user.email,
    '🔔 Prueba de notificación',
    'Las notificaciones push en tu dispositivo funcionan correctamente.',
    '/'
  );

  res.json({ success: result.sent > 0, sent: result.sent, error: result.error });
});

// Servir frontend compilado en producción
const clientDist = path.join(__dirname, '../client');
app.use(express.static(clientDist));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[ESCAPES-WEBMAIL] Servidor corriendo en puerto ${PORT}`);
});
