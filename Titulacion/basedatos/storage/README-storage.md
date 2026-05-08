# Nombre completo: README-storage.md

Ruta: `Titulacion/basedatos/storage/README-storage.md`

## Función

Esta carpeta se reserva para almacenamiento local generado por la aplicación.

Puede utilizarse para:

- Archivos exportados.
- Copias locales.
- Datos temporales.
- Respaldos generados en modo Electron.

## Importante

El frontend no debe depender de esta carpeta para iniciar.

La aplicación debe seguir funcionando en:

- Doble click.
- Live Server.
- Electron.

En navegador normal, el almacenamiento principal debe ser `localStorage`.

En Electron, esta carpeta puede usarse con servicios del backend mediante `preload.js`.