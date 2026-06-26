# Títulos

Sistema institucional para carga, revisión y validación de títulos de artículos académicos.

Ruta dentro del repositorio:

```text
Requisitos/Titulos
```

## Orden correcto de prueba local

Antes de subir a Netlify, probar en este orden:

```bash
cd Requisitos/Titulos
npm install
npm run check:all
```

Si `check:all` pasa, probar cada modo.

## 1. Live Server desde carpeta desarrollo

Abrir Visual Studio Code en la carpeta raíz del repositorio:

```text
desarrollo
```

Luego abrir con Live Server:

```text
Requisitos/Titulos/public/ta-titulo-articulo-estudiante.html
Requisitos/Titulos/public/ta-titulo-articulo-coordinador.html
```

Estas pantallas usan Firebase directo en modo local.

## 2. Doble click

También se pueden abrir directamente los HTML:

```text
Requisitos/Titulos/public/ta-titulo-articulo-estudiante.html
Requisitos/Titulos/public/ta-titulo-articulo-coordinador.html
```

Importante: Firebase directo usa CDN mediante import map, por lo que necesita internet.

## 3. Vite

Estudiante:

```bash
npm run dev
```

Coordinador:

```bash
npm run dev:coordinador
```

Rutas:

```text
http://127.0.0.1:5173/public/ta-titulo-articulo-estudiante.html
http://127.0.0.1:5173/public/ta-titulo-articulo-coordinador.html
```

## 4. Administrador en Electron

```bash
npm run electron
```

Modo diagnóstico con consola:

```bash
npm run electron:dev
```

En la parte superior del administrador debe aparecer:

```text
Runtime: Electron
Origen de datos: firebase-direct
Proyecto Firebase: utet-4387a
SDK Firebase: 10.14.1
```

## 5. Build local para prueba sin Netlify

```bash
npm run build:local
```

Esto genera:

```text
Requisitos/Titulos/dist-local
```

Entradas:

```text
dist-local/public/ta-titulo-articulo-estudiante.html
dist-local/public/ta-titulo-articulo-coordinador.html
dist-local/electron/admin/ta-titulo-articulo-administrador.html
```

## 6. Netlify, último paso

Netlify se prueba después de que todo funcione localmente.

```bash
npm run dev:netlify
```

Variables obligatorias en Netlify:

```text
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
TA_TITULO_ARTICULO_ADMIN_TOKEN
TELEGRAM_BOT_TOKEN
```

Variables opcionales para frontend si se quiere reemplazar la configuración pública local:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

## Comandos principales

```bash
npm run check
npm run check:local
npm run check:all
npm run build:local
npm run dev
npm run dev:coordinador
npm run electron
npm run electron:dev
npm run dev:netlify
```

## Nota sobre Firestore

Si las pantallas abren correctamente, pero no pueden leer o guardar, el problema ya no es de arranque local. En ese caso se deben revisar reglas/permisos de Firestore y nombres de colecciones.
