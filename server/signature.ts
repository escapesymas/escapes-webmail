import { LOGO_PNG_BASE64 } from './signature-logo.js';

/** Firma de Escapes y Más: se añade sola al final de todo correo enviado desde el webmail. */
export const LOGO_CID = 'logo-escapesymas@escapesymas.com';

const NAME = 'Adrián';
const EMAIL = 'info@escapesymas.com';
const WEB = 'escapesymas.com';

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export const SIGNATURE_HTML = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:${FONT};color:#0f172a">
  <tr><td style="font-size:17px;line-height:22px;font-weight:700;color:#0f172a">${NAME}</td></tr>
  <tr><td style="padding:8px 0 12px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="56" height="3" bgcolor="#eab308" style="width:56px;height:3px;line-height:3px;font-size:0;background:#eab308">&nbsp;</td></tr></table></td></tr>
  <tr><td><a href="https://${WEB}" style="text-decoration:none"><img src="cid:${LOGO_CID}" width="150" alt="Escapes y Más" style="display:block;width:150px;height:auto;border:0"></a></td></tr>
  <tr><td style="padding-top:10px;font-size:13px;line-height:19px;color:#0f172a">
    <a href="mailto:${EMAIL}" style="color:#0f172a;text-decoration:none">${EMAIL}</a><span style="color:#94a3b8">&nbsp;&nbsp;|&nbsp;&nbsp;</span><a href="https://${WEB}" style="color:#0f172a;text-decoration:none">${WEB}</a>
  </td></tr>
</table>`;

/** Misma firma para quien lee el correo en texto plano (el «-- » con espacio es el separador estándar). */
export const SIGNATURE_TEXT = `-- \n${NAME}\n${EMAIL} | ${WEB}`;

/** El logotipo va dentro del propio correo: Outlook y otros lectores bloquean las imágenes de fuera. */
export const SIGNATURE_ATTACHMENTS = [
  {
    filename: 'escapesymas.png',
    content: Buffer.from(LOGO_PNG_BASE64, 'base64'),
    contentType: 'image/png',
    cid: LOGO_CID,
    contentDisposition: 'inline' as const,
  },
];

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Las versiones anteriores de la ventana de redactar escribían una firma de texto: se quita para que no salga dos veces. */
const OLD_TEXT_SIGNATURE = /\s*--\s*\n\s*Escapes y Más\s*\n\s*https:\/\/escapesymas\.com\s*$/;

/** Cuerpo del correo (texto y HTML) con la firma al final. Si solo llega texto, se convierte a HTML. */
export function withSignature(text?: string, html?: string): { text?: string; html: string } {
  const plain = (text ?? '').replace(OLD_TEXT_SIGNATURE, '').replace(/\s+$/, '');
  const body = html ?? `<div style="font-family:${FONT};font-size:14px;line-height:1.55">${escapeHtml(plain).replace(/\r?\n/g, '<br>')}</div>`;
  return {
    text: text === undefined ? undefined : `${plain}\n\n${SIGNATURE_TEXT}`,
    html: `${body}<br><br>${SIGNATURE_HTML}`,
  };
}
