# Gen libro · Revisión final

## Estado general

La pantalla `Gen libro` queda organizada como módulo independiente dentro de:

`libro/Gen libro/`

Todos los archivos creados usan prefijo `lb`.

## Flujo implementado

1. Menú superior conectado con `Carga de la materia` y `Panel principal`.
2. Lectura de materias guardadas desde `libro.cargaMateria.materias`.
3. Selector de carrera y materia.
4. Validación flexible de materia.
5. Plan maestro del libro.
6. Motor IA con prioridad online y respaldo local.
7. Secciones iniciales: nombre de asignatura, presentación, prerrequisitos, evaluación diagnóstica y orientaciones.
8. Cuatro unidades con resultado de aprendizaje, contenidos, estrategias, evaluación, autoevaluación y reflexiones.
9. Reglas para figuras, tablas y diagramas solo cuando aportan.
10. Referencias APA 7 con validación de mínimo 15 referencias verificables.
11. Glosario y anexos condicionales.
12. Modelo Word con Candara 14, títulos en negrita y tabla de contenidos compatible con Word.
13. Progreso, errores y diagnóstico.
14. Revisión final automática de módulos.

## Dependencias externas de producción

Para producción completa en Electron se deben conectar estas API:

- `window.api.ai.generate`: generación IA online.
- `window.api.references.search`: búsqueda real de referencias verificables.
- `window.api.word.exportDocx`: exportación DOCX nativa.

Sin esas API, la pantalla conserva respaldos parciales:

- IA local estructural de respaldo.
- Advertencia cuando no se pueden verificar referencias reales.
- Exportación Word compatible desde navegador en formato HTML/Word.

## Resultado

La arquitectura de la pantalla queda lista para prueba funcional desde Electron, con módulos separados, flujo completo y diagnóstico interno.
