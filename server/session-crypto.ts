import crypto from 'node:crypto';

/**
 * La contraseña del buzón viaja dentro del token de sesión, cifrada: quien vea el token (historial, Referer,
 * logs del proxy) no obtiene la contraseña sin la clave del servidor. AES-256-GCM con una clave derivada de
 * JWT_SECRET (HKDF con su propia etiqueta, para no usar la misma clave que firma los tokens).
 */
export function createPassCipher(secret: string) {
  const key = Buffer.from(crypto.hkdfSync('sha256', secret, '', 'escapes-webmail-pass-v1', 32));

  return {
    encrypt(pass: string): string {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const enc = Buffer.concat([cipher.update(pass, 'utf8'), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64url');
    },

    /** null si el texto no es nuestro (token antiguo, manipulado o de otra clave). */
    decrypt(blob: string): string | null {
      try {
        const buf = Buffer.from(blob, 'base64url');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12));
        decipher.setAuthTag(buf.subarray(12, 28));
        return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
      } catch {
        return null;
      }
    },
  };
}
