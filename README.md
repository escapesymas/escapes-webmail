# Escapes Webmail 📬

Webmail moderno, responsivo y adaptado como PWA (Progressive Web App) para **Escapes y Más**, diseñado para instalarse en la pantalla de inicio del móvil y recibir notificaciones push en tiempo real.

## Características

- ⚡ **PWA Instalable:** Diseñado como aplicación web progresiva para iOS y Android con icono personalizado y modo pantalla completa (`standalone`).
- 🔔 **Notificaciones Push (Web Push / VAPID):** Recibe avisos instantáneos de nuevos correos en la pantalla de bloqueo de tu móvil.
- 🎨 **Tema Tech Oscuro:** Paleta de colores oficial de Escapes y Más (`tech-yellow`, `tech-carbon`, `tech-card`).
- ✉️ **Conexión Directa con Poste.io:**
  - **IMAP:** Consulta de carpetas, correos entrantes, búsqueda, paginación y gestión de mensajes leídos/estrellas.
  - **SMTP:** Envío de correos rápidos con firma segura y respuestas automáticas.
- 📱 **Navegación Móvil:** Barra inferior ergonómica en móviles para redactar y cambiar de carpeta con el pulgar.

## Despliegue en Coolify

Desplegado en Coolify en el VPS de producción bajo el dominio:
`https://webmail.escapesymas.com`

Variables de entorno recomendadas:
- `PORT`: `3000`
- `MAIL_HOST`: `mail.escapesymas.com`
- `MAIL_IMAP_PORT`: `993`
- `MAIL_IMAP_SECURE`: `true`
- `MAIL_SMTP_PORT`: `587`
- `JWT_SECRET`: Clave secreta para tokens de sesión.
