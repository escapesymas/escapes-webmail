import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export interface MailboxFolder {
  path: string;
  name: string;
  unread: number;
  total: number;
}

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
  snippet?: string;
}

export interface MailDetail extends MailSummary {
  html?: string;
  text?: string;
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
    partId?: string;
  }>;
}

export function createImapClient(user: string, pass: string): ImapFlow {
  const host = process.env.MAIL_HOST || 'mail.escapesymas.com';
  const port = parseInt(process.env.MAIL_IMAP_PORT || '993', 10);
  const secure = process.env.MAIL_IMAP_SECURE !== 'false';

  return new ImapFlow({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    logger: false,
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export async function verifyCredentials(user: string, pass: string): Promise<boolean> {
  const client = createImapClient(user, pass);
  try {
    await client.connect();
    await client.logout();
    return true;
  } catch (err) {
    return false;
  }
}

export async function getFolders(user: string, pass: string): Promise<MailboxFolder[]> {
  const client = createImapClient(user, pass);
  await client.connect();
  const folders: MailboxFolder[] = [];

  try {
    const list = await client.list();
    for (const item of list) {
      let unread = 0;
      let total = 0;
      try {
        const status = await client.status(item.path, { unseen: true, messages: true });
        unread = status.unseen || 0;
        total = status.messages || 0;
      } catch (e) {
        // Ignorar si no se puede leer el status
      }

      folders.push({
        path: item.path,
        name: item.name,
        unread,
        total,
      });
    }
  } finally {
    await client.logout();
  }

  return folders;
}

export async function listMessages(
  user: string,
  pass: string,
  folder = 'INBOX',
  page = 1,
  limit = 25,
  search?: string
): Promise<{ messages: MailSummary[]; total: number }> {
  const client = createImapClient(user, pass);
  await client.connect();
  const messages: MailSummary[] = [];
  let total = 0;

  try {
    const lock = await client.getMailboxLock(folder);
    try {
      if (search && search.trim()) {
        const query = search.trim();
        // Búsqueda en IMAP por remitente, asunto o cuerpo
        const searchRes = await client.search(
          { or: [{ from: query }, { to: query }, { subject: query }, { body: query }] },
          { uid: true }
        );

        const uids: number[] = Array.isArray(searchRes) ? searchRes : [];
        total = uids.length;
        if (total === 0) {
          return { messages: [], total: 0 };
        }

        // Ordenar UIDs descendente (más nuevos primero)
        uids.sort((a, b) => b - a);

        const startIndex = (page - 1) * limit;
        const pageUids = uids.slice(startIndex, startIndex + limit);

        if (pageUids.length > 0) {
          for await (const msg of client.fetch(pageUids.join(','), {
            uid: true,
            envelope: true,
            flags: true,
            bodyStructure: true,
          }, { uid: true })) {
            const fromAddr = msg.envelope?.from?.[0];
            const toAddr = msg.envelope?.to?.[0];
            const flags: string[] = Array.from(msg.flags || []).map((f) => String(f));

            messages.push({
              uid: msg.uid,
              seq: msg.seq,
              from: fromAddr?.address || 'Desconocido',
              fromName: fromAddr?.name,
              to: toAddr?.address || '',
              subject: msg.envelope?.subject || '(Sin asunto)',
              date: msg.envelope?.date ? msg.envelope.date.toISOString() : new Date().toISOString(),
              flags,
              unread: !flags.includes('\\Seen'),
              starred: flags.includes('\\Flagged'),
              hasAttachments: Boolean(
                msg.bodyStructure?.childNodes?.some((node) => node.disposition === 'attachment')
              ),
            });
          }
          // Mantener orden descendente
          messages.sort((a, b) => b.uid - a.uid);
        }
      } else {
        total = client.mailbox ? client.mailbox.exists : 0;
        if (total === 0) {
          return { messages: [], total: 0 };
        }

        const end = Math.max(1, total - (page - 1) * limit);
        const start = Math.max(1, end - limit + 1);

        if (start <= end) {
          for await (const msg of client.fetch(`${start}:${end}`, {
            uid: true,
            envelope: true,
            flags: true,
            bodyStructure: true,
          })) {
            const fromAddr = msg.envelope?.from?.[0];
            const toAddr = msg.envelope?.to?.[0];
            const flags: string[] = Array.from(msg.flags || []).map((f) => String(f));

            messages.push({
              uid: msg.uid,
              seq: msg.seq,
              from: fromAddr?.address || 'Desconocido',
              fromName: fromAddr?.name,
              to: toAddr?.address || '',
              subject: msg.envelope?.subject || '(Sin asunto)',
              date: msg.envelope?.date ? msg.envelope.date.toISOString() : new Date().toISOString(),
              flags,
              unread: !flags.includes('\\Seen'),
              starred: flags.includes('\\Flagged'),
              hasAttachments: Boolean(
                msg.bodyStructure?.childNodes?.some((node) => node.disposition === 'attachment')
              ),
            });
          }
          // Ordenar los más recientes primero
          messages.reverse();
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return { messages, total };
}

export async function getMessage(
  user: string,
  pass: string,
  folder: string,
  uid: number
): Promise<MailDetail | null> {
  const client = createImapClient(user, pass);
  await client.connect();

  try {
    const lock = await client.getMailboxLock(folder);
    try {
      const msg = await client.download(String(uid), undefined, { uid: true });
      if (!msg || !msg.content) return null;

      const parsed = await simpleParser(msg.content);

      // Marcar como visto automáticamente
      await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });

      const fromAddr = parsed.from?.value?.[0];

      return {
        uid,
        seq: 0,
        from: fromAddr?.address || 'Desconocido',
        fromName: fromAddr?.name,
        to: Array.isArray(parsed.to) ? parsed.to.map((t) => t.text).join(', ') : parsed.to?.text || '',
        subject: parsed.subject || '(Sin asunto)',
        date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
        flags: ['\\Seen'],
        unread: false,
        starred: false,
        hasAttachments: Boolean(parsed.attachments && parsed.attachments.length > 0),
        html: parsed.html || (typeof parsed.textAsHtml === 'string' ? parsed.textAsHtml : undefined),
        text: parsed.text || undefined,
        attachments: (parsed.attachments || []).map((att) => ({
          filename: att.filename || 'adjunto',
          contentType: att.contentType,
          size: att.size,
        })),
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

export async function getAttachment(
  user: string,
  pass: string,
  folder: string,
  uid: number,
  index: number
): Promise<{ filename: string; contentType: string; content: Buffer } | null> {
  const client = createImapClient(user, pass);
  await client.connect();

  try {
    const lock = await client.getMailboxLock(folder);
    try {
      const msg = await client.download(String(uid), undefined, { uid: true });
      if (!msg || !msg.content) return null;

      const parsed = await simpleParser(msg.content);
      const att = parsed.attachments?.[index];
      if (!att) return null;

      return {
        filename: att.filename || `adjunto-${index}`,
        contentType: att.contentType || 'application/octet-stream',
        content: att.content,
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

export async function moveMessage(
  user: string,
  pass: string,
  sourceFolder: string,
  targetFolder: string,
  uid: number
): Promise<boolean> {
  const client = createImapClient(user, pass);
  await client.connect();

  try {
    const lock = await client.getMailboxLock(sourceFolder);
    try {
      await client.messageMove(String(uid), targetFolder, { uid: true });
      return true;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

export async function toggleMessageFlag(
  user: string,
  pass: string,
  folder: string,
  uid: number,
  flag: '\\Seen' | '\\Flagged',
  add: boolean
): Promise<boolean> {
  const client = createImapClient(user, pass);
  await client.connect();

  try {
    const lock = await client.getMailboxLock(folder);
    try {
      if (add) {
        await client.messageFlagsAdd(String(uid), [flag], { uid: true });
      } else {
        await client.messageFlagsRemove(String(uid), [flag], { uid: true });
      }
      return true;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

export async function deleteMessage(
  user: string,
  pass: string,
  folder: string,
  uid: number
): Promise<boolean> {
  const client = createImapClient(user, pass);
  await client.connect();

  try {
    const lock = await client.getMailboxLock(folder);
    try {
      if (folder.toUpperCase() === 'TRASH') {
        await client.messageDelete(String(uid), { uid: true });
      } else {
        await client.messageMove(String(uid), 'Trash', { uid: true });
      }
      return true;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}
