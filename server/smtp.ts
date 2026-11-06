import nodemailer from 'nodemailer';
import { SIGNATURE_ATTACHMENTS, withSignature } from './signature.js';

export interface SendMailOptions {
  user: string;
  pass: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
    contentType?: string;
  }>;
}

export async function sendEmail(options: SendMailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const host = process.env.MAIL_HOST || 'mail.escapesymas.com';
  const port = parseInt(process.env.MAIL_SMTP_PORT || '587', 10);
  const secure = port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    name: 'escapesymas.com',
    auth: {
      user: options.user,
      pass: options.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const { text, html } = withSignature(options.text, options.html);

  try {
    const mailOptions: any = {
      from: `"Escapes y Más" <${options.user}>`,
      to: options.to,
      subject: options.subject,
      text,
      html,
      replyTo: options.replyTo,
      // El logotipo de la firma va incrustado (cid), junto a los adjuntos que añada quien escribe.
      attachments: [
        ...SIGNATURE_ATTACHMENTS,
        ...(options.attachments || []).map((att) => ({
          filename: att.filename,
          content: Buffer.from(att.content, 'base64'),
          contentType: att.contentType,
        })),
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al enviar correo' };
  }
}
