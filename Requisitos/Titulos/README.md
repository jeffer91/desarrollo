# Titulos

Sistema institucional para carga, revisión y validación de títulos de artículos académicos.

Ruta dentro del repositorio: `Requisitos/Titulos`.

## Prueba rápida desde Visual Studio Code

```bash
cd Requisitos/Titulos
npm install
npm run check
npm run dev
```

La pantalla web de estudiante se abre en:

```text
http://127.0.0.1:5173/public/ta-titulo-articulo-estudiante.html
```

La pantalla web de coordinador se abre en:

```text
http://127.0.0.1:5173/public/ta-titulo-articulo-coordinador.html
```

## Administrador en Electron

```bash
cd Requisitos/Titulos
npm run electron
```

Cuando se abra el administrador en Electron, si la pantalla está en modo local, pedirá la URL base de Netlify Functions. Ejemplo:

```text
https://mi-sitio.netlify.app/.netlify/functions
```

Después pedirá el token administrativo configurado en `TA_TITULO_ARTICULO_ADMIN_TOKEN`.

## Variables obligatorias en Netlify

```text
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
TA_TITULO_ARTICULO_ADMIN_TOKEN
TELEGRAM_BOT_TOKEN
```

Para el frontend público, si se usa Firebase cliente en el futuro:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```
