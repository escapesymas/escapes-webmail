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
  toggleMessageFlag,
  deleteMessage,
} from './imap.js';
import { sendEmail } from './smtp.js';
import { getVapidPublicKey, saveSubscription, sendPushNotification } from './push.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'escapes-webmail-jwt-secret-key-2026';

app.use(cors());
app.use(express.json());

// Middleware de autenticación por Token
interface AuthUser {
  email: string;
  pass: string;
}

function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

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

// Listar correos de una carpeta
app.get('/api/mail/messages', authenticateToken, async (req: any, res) => {
  const folder = (req.query.folder as string) || 'INBOX';
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 25;

  try {
    const result = await listMessages(req.user.email, req.user.pass, folder, page, limit);
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

// Enviar correo
app.post('/api/mail/send', authenticateToken, async (req: any, res) => {
  const { to, subject, text, html, replyTo } = req.body;

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

// Web Push: Clave pública VAPID
app.get('/api/push/vapid-key', (req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

// Web Push: Registrar suscripción
app.post('/api/push/subscribe', authenticateToken, (req: any, res) => {
  const subscription = req.body.subscription;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Suscripción inválida' });
  }

  saveSubscription({
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    email: req.user.email,
    createdAt: Date.now(),
  });

  res.json({ success: true });
});

// Webhook para nuevos correos entrantes (llamado por Poste.io o Sieve)
app.post('/api/mail/webhook/incoming', async (req, res) => {
  const { to, from, subject, preview } = req.body;

  if (to) {
    await sendPushNotification(
      to,
      `Nuevo correo de ${from || 'remitente'}`,
      subject || preview || 'Has recibido un nuevo correo.',
      '/'
    );
  }

  res.json({ received: true });
});

// Servir frontend compilado en producción
const clientDist = path.join(__dirname, '../client');
app.use(express.static(clientDist));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[Escapes Mail] Servidor escuchando en http://localhost:${PORT}`);
});
