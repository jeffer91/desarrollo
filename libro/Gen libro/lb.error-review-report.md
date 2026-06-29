# Gen libro · Revisión de errores

## Revisión realizada

Se revisó el flujo completo de `Gen libro` después de los 14 bloques:

- Carga de scripts en `lb.index.html`.
- Progreso de generación.
- Manejo de errores.
- Construcción del modelo Word.
- Integración de diagnóstico y revisión final.
- Persistencia local del libro generado.

## Correcciones aplicadas

### 1. Progreso en orden correcto

Se corrigió el orden de porcentajes para que el flujo no retroceda visualmente.

Antes, referencias podía marcar 68% después de recursos visuales en 78%.
Ahora el orden queda:

1. Unidades: 52%
2. Visuales: 68%
3. Referencias: 78%
4. Glosario y anexos: 86%
5. Word: 90%
6. Guardado local: 96%
7. Descarga/finalización: 100%

### 2. Nombre de asignatura duplicado en Word

Se corrigió `lb.docx-builder.js` para evitar que la sección `Nombre de la asignatura` aparezca dos veces.

Ahora el nombre de la asignatura se toma desde las secciones iniciales y no se vuelve a insertar manualmente.

### 3. Reintento después de error

Se corrigió `lb.error-handler.js` para que, si ocurre un error durante la generación, el botón de generación vuelva a habilitarse y el usuario pueda intentar nuevamente.

### 4. Guardado local más claro

Se ajustó el progreso para marcar explícitamente la fase de guardado local antes de finalizar la generación.

### 5. Constantes de diagnóstico

Se agregaron claves constantes para historial de progreso, último error y revisión final.

## Estado después de la revisión

La arquitectura queda lista para prueba funcional en Electron.

Quedan como dependencias externas de ejecución real:

- `window.api.ai.generate`
- `window.api.references.search`
- `window.api.word.exportDocx`

Si esas API no están conectadas, la pantalla funciona con respaldos parciales, pero para producción completa deben implementarse desde Electron.
