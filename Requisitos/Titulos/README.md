# Títulos

Sistema institucional para carga, revisión y validación de títulos de artículos académicos.

Ruta dentro del repositorio:

```text
Requisitos/Titulos
```

## Orden correcto de prueba

Antes de subir a Netlify, probar en este orden:

```bash
cd Requisitos/Titulos
npm install
npm run check:all
```

`check:all` ejecuta revisión general, revisión local, revisión Netlify, revisión de esquema limpio y revisión de conexión/comunicación. Si pasa, probar cada modo.

## 1. Live Server desde carpeta desarrollo

Abrir Visual Studio Code en la carpeta raíz del repositorio:

```text
desarrollo
```

Luego abrir con Live Server:

```text
Requisitos/Titulos/public/ta-titulo-articulo-estudiante.html
Requisitos/Titulos/public/ta-titulo-articulo-coordinador.html
Requisitos/Titulos/public/ta-titulo-articulo-admin.html
```

Estas pantallas usan Firebase directo.

## 2. Doble click

También se pueden abrir directamente los HTML:

```text
Requisitos/Titulos/public/ta-titulo-articulo-estudiante.html
Requisitos/Titulos/public/ta-titulo-articulo-coordinador.html
Requisitos/Titulos/public/ta-titulo-articulo-admin.html
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

Administrador:

```bash
npm run dev:admin
```

Rutas:

```text
http://127.0.0.1:5173/public/ta-titulo-articulo-estudiante.html
http://127.0.0.1:5173/public/ta-titulo-articulo-coordinador.html
http://127.0.0.1:5173/public/ta-titulo-articulo-admin.html
```

## 4. Electron

Administrador:

```bash
npm run electron:admin
```

Estudiante:

```bash
npm run electron:estudiante
```

Coordinador:

```bash
npm run electron:coordinador
```

Modo diagnóstico con consola:

```bash
npm run electron:dev
npm run electron:dev:estudiante
npm run electron:dev:coordinador
```

En diagnóstico debe aparecer:

```text
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
dist-local/public/ta-titulo-articulo-admin.html
dist-local/electron/admin/ta-titulo-articulo-administrador.html
```

## 6. Netlify, último paso

Netlify se prueba después de que todo funcione localmente.

### Prueba Netlify local

```bash
npm run check:netlify
npm run build:netlify
npm run dev:netlify
```

### Configuración en Netlify

En Netlify, configurar el sitio así:

```text
Base directory: Requisitos/Titulos
Build command: npm run build:netlify
Publish directory: dist
Functions directory: netlify/functions
```

Rutas públicas esperadas:

```text
/
/estudiante
/coordinador
/admin
```

Las pantallas de estudiante, coordinador y administrador usan Firebase directo para leer y escribir datos del proceso. Netlify Functions se mantiene para servicios privados como Gemini.

### Variables obligatorias en Netlify

```text
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
TA_TITULO_ARTICULO_ADMIN_TOKEN
TELEGRAM_BOT_TOKEN
GEMINI_API_KEY
```

En `FIREBASE_ADMIN_PRIVATE_KEY`, si se pega en una sola línea, conservar los saltos como `\n`.

### Variables opcionales para frontend y Gemini

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
GEMINI_MODEL
```

## Revisión de conexión

Para validar rutas, comunicación interna y conexiones entre pantallas, ejecutar:

```bash
npm run check:connection
```

Este comando verifica:

```text
HTML conectado con sus apps
Apps conectadas con API client
API client conectado con runtime y Firebase directo
Electron conectado con estudiante, coordinador y administrador
Netlify Functions conectadas
Gemini con endpoint y respaldo local
Panel administrador lateral visible
```

## Comandos principales

```bash
npm run check
npm run check:local
npm run check:netlify
npm run check:schema
npm run check:connection
npm run check:all
npm run build:local
npm run build:netlify
npm run dev
npm run dev:coordinador
npm run dev:admin
npm run electron:admin
npm run electron:estudiante
npm run electron:coordinador
npm run electron:dev
npm run dev:netlify
```

## Nota sobre Firestore

Si las pantallas abren correctamente, pero no pueden leer o guardar, el problema ya no es de arranque local. En ese caso se deben revisar reglas/permisos de Firestore y nombres de colecciones.
