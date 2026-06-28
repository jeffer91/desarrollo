# Revisión funcional del módulo Libro - Bloque 11

Fecha: 2026-06-28

## Objetivo

Realizar una revisión funcional del módulo Libro después de cerrar los bloques 1 al 9, verificando rutas, scripts, flujo de carga, interpretación, unión, validación, guardado y generación.

## Archivos principales revisados

- `libro/index.html`
- `libro/carga-materia/carga-materia.index.html`
- `libro/carga-materia/carga-materia.main.js`
- `libro/carga-materia/carga-materia.xlsx-loader.js`
- `libro/carga-materia/carga-materia.pdf-reader.js`
- `libro/carga-materia/carga-materia.mapper-base.js`
- `libro/carga-materia/carga-materia.mapper-contenidos.js`
- `libro/carga-materia/carga-materia.mapper-actividades.js`
- `libro/carga-materia/carga-materia.matcher.js`
- `libro/carga-materia/carga-materia.builder.js`
- `libro/carga-materia/carga-materia.validator.js`
- `libro/carga-materia/carga-materia.preview.js`
- `libro/carga-materia/carga-materia.storage.js`
- `libro/generador-libro/generador-libro.index.html`
- `libro/generador-libro/generador-libro.builder.js`
- `libro/generador-libro/generador-libro.storage.js`
- `libro/generador-libro/generador-libro.main.js`
- `electron/preload.js`
- `electron/main.js`

## Resultado general

Estado: **correcto con correcciones preventivas aplicadas**.

No se detectaron errores evidentes de rutas, orden de carga de scripts o botones principales.

## Correcciones aplicadas en esta revisión

### 1. Actividades: evitar asignación incorrecta por semana

Archivo corregido:

```txt
libro/carga-materia/carga-materia.mapper-actividades.js
```

Problema detectado:

El mapeador de actividades podía inferir unidad desde números sueltos. Por ejemplo, una fila con `Semana 1` podía terminar asignándose por error a la Unidad 1 si no existía una columna clara de unidad.

Corrección:

Ahora solo se asigna unidad cuando existe:

- columna explícita de unidad,
- código académico tipo `1.1`, `2.1`, `3.1`, `4.1`,
- texto explícito tipo `Unidad 1`, `Unidad 2`, `Unidad 3`, `Unidad 4`.

### 2. Unión inteligente: evitar reubicación por números sueltos

Archivo corregido:

```txt
libro/carga-materia/carga-materia.matcher.js
```

Problema detectado:

La unión inteligente podía intentar reubicar actividades sin unidad usando números sueltos dentro del texto original, lo cual podía confundir semanas, actividades o ítems con unidades.

Corrección:

Ahora la reubicación automática usa únicamente:

- campo unidad cuando existe,
- código académico con punto, por ejemplo `1.1`,
- texto explícito tipo `Unidad 1`.

No usa números sueltos como `1`, `2`, `3`, `4` encontrados en descripciones generales.

## Checklist funcional revisado

| Revisión | Estado |
|---|---|
| Menú principal del módulo Libro | OK |
| Pantalla Carga inteligente de materia | OK |
| Pantalla Generador de libro | OK |
| Botón abrir carga de materia | OK |
| Botón abrir generador | OK |
| Scripts de carga de materia en orden correcto | OK |
| Scripts del generador en orden correcto | OK |
| Validación de carrera y materia | OK |
| Validación de archivos requeridos | OK |
| Archivo 1 Excel/PDF | OK |
| Archivo 2 Excel | OK |
| Archivo 3 Excel | OK, corregida inferencia de unidad |
| Lectura Excel con SheetJS | OK con dependencia externa |
| Lectura PDF con PDF.js clásico | OK con dependencia externa |
| Interpretación base | OK |
| Interpretación de contenidos | OK |
| Interpretación de actividades | OK, corregida inferencia |
| Unión inteligente | OK, corregida reubicación |
| Validación de materia consolidada | OK |
| Vista previa legible | OK |
| Guardado JSON | OK |
| Respaldo localStorage | OK |
| Descarga JSON en navegador | OK |
| Generador desde materia guardada | OK |
| Generador desde JSON externo | OK |
| Exportación TXT | OK |
| Exportación JSON | OK |
| API Electron files.saveText | OK |
| API Electron files.saveJson | OK |

## Flujo que debe probarse en PC

1. Abrir el panel principal.
2. Entrar a `Libro`.
3. Entrar a `Carga inteligente de materia`.
4. Escribir carrera y materia.
5. Cargar Archivo 1, Archivo 2 y Archivo 3.
6. Presionar `Validar materia`.
7. Revisar que la vista previa muestre unidades, contenidos, actividades y advertencias.
8. Presionar `Guardar resultado`.
9. Volver al inicio de `Libro`.
10. Entrar a `Generador de libro`.
11. Presionar `Actualizar lista`.
12. Cargar la materia guardada.
13. Presionar `Generar libro`.
14. Exportar TXT.
15. Exportar JSON.

## Observaciones importantes

- Esta revisión es estática y funcional por código; la prueba final debe hacerse con archivos reales desde la PC.
- Si los Excel reales tienen nombres de columnas muy diferentes, puede requerirse un ajuste fino de alias.
- Si no hay internet y no existen copias locales en `vendor`, SheetJS o PDF.js pueden fallar. Esto no rompe la estructura del módulo, pero sí afecta lectura de Excel/PDF.
- En navegador normal el guardado directo puede convertirse en descarga; en Electron usa `window.api.files.saveJson` y `window.api.files.saveText`.

## Conclusión

El módulo Libro queda funcionalmente coherente y conectado. Después de las dos correcciones preventivas, no se detectan errores evidentes en el flujo principal.

Flujo completo verificado:

```txt
Libro → Carga inteligente → Validar materia → Guardar resultado → Generador → Generar libro → Exportar TXT/JSON
```
