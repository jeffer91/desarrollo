# Revisión de errores y conexiones - Carga de la materia

Fecha: 2026-06-28

## Objetivo

Revisar que el módulo Libro quede centrado en la pantalla `Carga de la materia`, sin generador visible, sin textos innecesarios, sin JSON visible y con conexiones internas coherentes para procesar y guardar la materia.

## Archivos revisados

- `app/app.registry.js`
- `libro/index.html`
- `libro/generador-libro/generador-libro.index.html`
- `libro/carga-materia/carga-materia.index.html`
- `libro/carga-materia/carga-materia.css`
- `libro/carga-materia/carga-materia.user-messages.css`
- `libro/carga-materia/carga-materia.main.js`
- `libro/carga-materia/carga-materia.user-messages.js`
- `libro/carga-materia/carga-materia.guardado-seguro.js`
- `libro/carga-materia/carga-materia.excel-reader.js`
- `libro/carga-materia/carga-materia.pdf-reader.js`
- `libro/carga-materia/carga-materia.mapper-base.js`
- `libro/carga-materia/carga-materia.mapper-contenidos.js`
- `libro/carga-materia/carga-materia.mapper-actividades.js`
- `libro/carga-materia/carga-materia.matcher.js`
- `libro/carga-materia/carga-materia.builder.js`
- `libro/carga-materia/carga-materia.validator.js`
- `libro/carga-materia/carga-materia.storage.js`

## Resultado general

Estado: **correcto con correcciones aplicadas**.

El flujo queda centrado en:

```txt
Libro → Carga de la materia → Procesar materia → Guardar
```

## Correcciones aplicadas en esta revisión

### 1. Registro principal del módulo Libro

Archivo corregido:

```txt
app/app.registry.js
```

Se cambió la descripción del módulo para que no diga “carga inteligente” ni mencione generación de libros en esta fase. Ahora queda centrado en `Carga de la materia`.

### 2. Mensaje de documento principal

Archivo corregido:

```txt
libro/carga-materia/carga-materia.user-messages.js
```

Problema detectado:

El mensaje visual podía considerar cualquier información base como documento principal completo, incluso si era solo un Excel. Eso podía confundir al usuario porque el botón podía seguir desactivado mientras el mensaje decía que estaba listo.

Corrección:

Ahora solo se considera documento principal cuando Información base tiene:

- texto pegado,
- PDF,
- TXT.

Si Información base es Excel, contenidos y actividades siguen necesitando su propia fuente.

### 3. Guardado seguro

Archivo agregado:

```txt
libro/carga-materia/carga-materia.guardado-seguro.js
```

Función:

Bloquea el botón `Guardar` cuando el estado sea inseguro:

- Sin procesar,
- Procesando,
- Guardando,
- Incompleto,
- Error,
- Sin guardar.

Este archivo no habilita el botón por su cuenta; solo impide guardar cuando no corresponde.

### 4. Conexión del guardado seguro

Archivo corregido:

```txt
libro/carga-materia/carga-materia.index.html
```

Se conectó el nuevo script después de `carga-materia.user-messages.js` para que revise el estado final de la pantalla.

## Checklist funcional

| Punto revisado | Estado |
|---|---|
| Entrada del módulo Libro abre Carga de la materia | OK |
| Generador oculto temporalmente | OK |
| Menú superior simple | OK |
| Título correcto: Carga de la materia | OK |
| Sin textos largos innecesarios | OK |
| Sin revisión rápida visible | OK |
| Sin JSON visible | OK |
| Carrera y materia visibles | OK |
| Información base acepta Excel, PDF, TXT y texto | OK |
| Contenidos acepta Excel, PDF, TXT y texto | OK |
| Actividades acepta Excel, PDF, TXT y texto | OK |
| Documento principal completo desde PDF/TXT/texto | OK |
| Excel base no se confunde como documento completo | OK |
| Mensajes simples al usuario | OK |
| Guardado sin rutas técnicas visibles | OK |
| Botón Guardar bloqueado ante error/incompleto | OK |
| Archivos internos del generador conservados | OK |

## Pruebas recomendadas

1. Entrar desde el panel principal al módulo Libro.
2. Confirmar que abre directamente `Carga de la materia`.
3. Escribir carrera y materia.
4. Probar con tres Excel separados.
5. Probar con Información base en PDF y las otras secciones vacías.
6. Probar con Información base en TXT y las otras secciones vacías.
7. Probar con texto pegado en las tres secciones.
8. Probar con Información base en Excel únicamente y verificar que todavía pida contenidos y actividades.
9. Procesar materia.
10. Verificar mensaje simple de éxito o alerta.
11. Guardar.
12. Verificar mensaje: `Materia guardada correctamente.`

## Conclusión

La pantalla queda preparada para uso real de carga de materia. Las conexiones principales fueron revisadas y se corrigieron los puntos que podían generar confusión o permitir acciones fuera de orden.

No queda ningún bloque pendiente de esta corrección visual y funcional inicial.
