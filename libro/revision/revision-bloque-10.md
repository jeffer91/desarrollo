# Revisión general del módulo Libro - Bloque 10

Fecha: 2026-06-28

## Objetivo

Revisar que el flujo completo del módulo Libro esté conectado correctamente y que no existan errores evidentes de rutas, scripts, carga, validación, guardado y generación.

## Alcance revisado

- `libro/index.html`
- `libro/carga-materia/carga-materia.index.html`
- `libro/carga-materia/carga-materia.main.js`
- `libro/carga-materia/carga-materia.pdf-reader.js`
- `libro/carga-materia/carga-materia.storage.js`
- `libro/generador-libro/generador-libro.index.html`
- `libro/generador-libro/generador-libro.main.js`
- `electron/preload.js`
- `electron/main.js`

## Resultado de revisión

Estado general: **correcto con una corrección aplicada**.

## Corrección aplicada

Se corrigió la carga de PDF.js en:

```txt
libro/carga-materia/carga-materia.pdf-reader.js
```

Motivo:

La versión anterior intentaba cargar PDF.js con archivos `.mjs`. En navegador/Electron esos módulos no garantizan que exista `window.pdfjsLib`, por lo que la lectura de PDF podía fallar aunque hubiera internet.

Corrección:

Se cambió a la versión clásica de PDF.js:

```txt
https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js
https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js
```

Y sus workers clásicos:

```txt
https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js
https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js
```

## Checklist técnico

| Revisión | Estado |
|---|---|
| Entrada principal `libro/index.html` | OK |
| Tarjeta Carga inteligente de materia | OK |
| Tarjeta Generador de libro | OK |
| Ruta a carga de materia | OK |
| Ruta a generador de libro | OK |
| Orden de scripts en carga de materia | OK |
| Lector Excel | OK |
| Lector PDF | Corregido |
| Mapeador Archivo 1 | OK |
| Mapeador Archivo 2 | OK |
| Mapeador Archivo 3 | OK |
| Unión inteligente | OK |
| Builder de materia consolidada | OK |
| Validador | OK |
| Vista previa | OK |
| Guardado JSON | OK |
| Schema de materia consolidada | OK |
| Generador de libro | OK |
| Exportación TXT | OK |
| Exportación JSON | OK |
| API Electron `files.saveText` | OK |
| API Electron `files.saveJson` | OK |

## Flujo esperado

1. Abrir `Libro` desde el panel principal.
2. Entrar a `Carga inteligente de materia`.
3. Escribir carrera y materia.
4. Subir Archivo 1, Archivo 2 y Archivo 3.
5. Presionar `Validar materia`.
6. Revisar la vista previa.
7. Presionar `Guardar resultado`.
8. Volver a `Libro`.
9. Entrar a `Generador de libro`.
10. Presionar `Actualizar lista`.
11. Cargar la materia guardada o cargar JSON externo.
12. Presionar `Generar libro`.
13. Exportar TXT o JSON.

## Observaciones

- Si se ejecuta en navegador normal, el guardado directo puede no estar disponible. En ese caso se descarga el JSON y se guarda respaldo en `localStorage`.
- Si se ejecuta en Electron, el guardado usa `window.api.files.saveJson` y `window.api.files.saveText`.
- Si no hay internet y no existe una copia local de SheetJS o PDF.js en `vendor`, la lectura de Excel/PDF puede fallar. Esta es una dependencia externa prevista para una mejora futura.

## Conclusión

El módulo Libro ya tiene el flujo base completo:

```txt
Carga → Lectura → Interpretación → Unión → Validación → Guardado → Generación
```

Después de la corrección de PDF.js, no se detectan errores evidentes de conexión entre archivos o rutas principales.
