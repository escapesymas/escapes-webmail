/**
 * Decodificador de cabeceras MIME RFC 2047 para notificaciones push y webmail.
 * Soporta Base64 (B) y Quoted-Printable (Q) con codificación UTF-8 y Latin1.
 */

export function decodeMimeWords(str: string): string {
  if (!str) return '';

  // Según RFC 2047, los espacios o saltos de línea entre palabras codificadas contiguas deben eliminarse
  const cleaned = str.replace(/(=\?[^?]+\?[bBqQ]\?[^?]*\?=)\s+(?==\?[^?]+\?[bBqQ]\?[^?]*\?=)/g, '$1');

  return cleaned.replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_, charset, encoding, text) => {
    try {
      const enc = encoding.toUpperCase();
      const cs = charset.toLowerCase();
      const isLatin1 = cs.includes('8859-1') || cs.includes('latin1') || cs.includes('windows-1252');

      if (enc === 'B') {
        const buf = Buffer.from(text, 'base64');
        return buf.toString(isLatin1 ? 'latin1' : 'utf-8');
      } else if (enc === 'Q') {
        // En Q-encoding de RFC 2047, '_' representa espacio (0x20)
        const qpReplaced = text.replace(/_/g, ' ');
        const bytes: number[] = [];
        for (let i = 0; i < qpReplaced.length; i++) {
          if (qpReplaced[i] === '=' && i + 2 < qpReplaced.length) {
            const hex = qpReplaced.substring(i + 1, i + 3);
            if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
              bytes.push(parseInt(hex, 16));
              i += 2;
              continue;
            }
          }
          bytes.push(qpReplaced.charCodeAt(i));
        }
        const buf = Buffer.from(bytes);
        return buf.toString(isLatin1 ? 'latin1' : 'utf-8');
      }
    } catch {
      return text;
    }
    return text;
  });
}

/**
 * Limpia y formatea el remitente (header "From") para el título de la notificación push.
 * Si contiene nombre para mostrar, devuelve el nombre limpio sin comillas.
 * Si solo viene la dirección de correo, devuelve la dirección.
 */
export function formatSenderNotification(fromStr: string): string {
  if (!fromStr) return 'Nuevo correo';
  const decoded = decodeMimeWords(fromStr).trim();

  // Buscar formato: "Nombre" <email> o Nombre <email>
  const match = decoded.match(/^(?:"?([^"<]+)"?\s*)?<([^>]+)>$/);
  if (match) {
    const name = (match[1] || '').trim().replace(/^"|"$/g, '');
    const email = (match[2] || '').trim();
    if (name) {
      return name;
    }
    return email;
  }

  // Quitar comillas circundantes si las hay
  return decoded.replace(/^"|"$/g, '').trim() || 'Nuevo correo';
}

/**
 * Limpia y formatea el asunto (header "Subject") para el cuerpo de la notificación push.
 */
export function formatSubjectNotification(subjectStr: string): string {
  if (!subjectStr) return '(Sin asunto)';
  const decoded = decodeMimeWords(subjectStr).trim();
  // Limpiar saltos de línea y múltiples espacios consecutivos
  return decoded.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim() || '(Sin asunto)';
}
