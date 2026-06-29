# Pruebas finales de IA y sugerencias

## Objetivo

Validar que el módulo de títulos funcione con tres niveles de generación:

1. Gemini como motor principal.
2. Groq como motor alternativo de prueba administrativa.
3. Motor local inteligente como respaldo obligatorio.

El estudiante no debe quedar bloqueado si Gemini falla.

## Archivos principales

- `src/services/ta-titulo-articulo-motor-local.service.js`
- `src/services/ta-titulo-articulo-gemini-client.service.js`
- `src/admin/ta-titulo-articulo-admin-navegacion.app.js`
- `src/admin/ta-titulo-articulo-admin-ia.app.js`
- `netlify/functions/ta-titulo-articulo-api-ia.js`
- `scripts/ta-titulo-articulo-ia-check.mjs`

## Comandos recomendados

Desde la carpeta `Requisitos/Titulos`:

```bash
npm install
npm run check:ia
npm run check:all
```

Para probar estudiante en Electron:

```bash
npm run electron:estudiante
```

Para probar administrador en Electron:

```bash
npm run electron:admin
```

Para probar funciones Netlify local:

```bash
npm run dev:netlify
```

Luego abrir:

```text
/admin#ia
```

## Variables necesarias para Netlify

Obligatorias para el panel IA seguro:

```text
TA_TITULO_ARTICULO_ADMIN_TOKEN
```

Obligatoria para probar Gemini real:

```text
GEMINI_API_KEY
```

Opcional para cambiar modelo Gemini:

```text
GEMINI_MODEL
```

Opcional para probar Groq:

```text
GROQ_API_KEY
GROQ_MODEL
```

## Prueba del botón inteligente del estudiante

1. Abrir la pantalla estudiante.
2. Buscar un estudiante válido por cédula.
3. Completar los campos de una propuesta:
   - tema general
   - lugar o contexto
   - problema o necesidad
   - grupo de estudio
   - año o período
   - objetivo
   - resultado esperado
4. Presionar `Generar sugerencias de título`.
5. Confirmar que aparezcan dos sugerencias diferentes.

Resultado esperado si Gemini responde:

```text
Sugerencias generadas por Gemini.
```

Resultado esperado si Gemini falla:

```text
No se pudo conectar con Gemini. Se generaron sugerencias con el motor inteligente de respaldo.
```

## Prueba del administrador IA

1. Abrir `/admin#ia`.
2. Presionar `Ver estado IA`.
3. Ingresar el token administrativo cuando lo pida.
4. Revisar:
   - token admin configurado
   - claves no expuestas en frontend
   - Gemini configurado o no configurado
   - Groq configurado o no configurado
   - motor local disponible
5. Presionar `Probar motor local`.
6. Presionar `Probar Gemini` si `GEMINI_API_KEY` está configurada.
7. Presionar `Probar Groq` si `GROQ_API_KEY` está configurada.

## Criterio de aprobación

El bloque se considera correcto si:

- `npm run check:ia` termina sin errores.
- El administrador muestra la vista `IA y conexiones`.
- Las pruebas IA piden token administrativo.
- El navegador no muestra claves de Gemini ni Groq.
- El motor local genera dos sugerencias sin internet.
- El estudiante puede generar sugerencias aunque Gemini no esté disponible.

## Orden final antes de publicar

```text
1. npm run check:ia
2. npm run check:all
3. npm run electron:estudiante
4. npm run electron:admin
5. npm run dev:netlify
6. Probar /admin#ia
7. Probar /estudiante
8. Publicar en Netlify solo después de confirmar todo
```
