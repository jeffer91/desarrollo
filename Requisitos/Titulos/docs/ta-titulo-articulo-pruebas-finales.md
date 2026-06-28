# Pruebas finales del módulo Títulos

Ruta del módulo:

```text
Requisitos/Titulos
```

## Revisión inicial

```bash
cd Requisitos/Titulos
npm install
npm run check:all
```

## Estudiante

```bash
npm run dev
```

Validar que el estudiante pueda consultar cédula, completar las tres etapas, generar sugerencias, elegir o escribir títulos, marcar preferido y enviar a revisión.

## Coordinador

```bash
npm run dev:coordinador
```

Validar que el coordinador pueda cargar sus estudiantes, ver los tres títulos, identificar el preferido, aprobar, aprobar con correcciones o devolver con observación.

## Administrador

```bash
npm run dev:admin
```

Validar que el administrador vea período activo, estadísticas, coordinadores, carreras, estudiantes, títulos enviados, estados, intentos y resultados de revisión.

## Electron

```bash
npm run electron:admin
npm run electron:estudiante
npm run electron:coordinador
```

Validar que las tres pantallas abran correctamente y trabajen con Firebase directo.

## Netlify local

```bash
npm run check:netlify
npm run build:netlify
npm run dev:netlify
```

Rutas esperadas:

```text
/estudiante
/coordinador
/admin
```

## Flujo completo

1. Administrador activa período y revisa coordinadores.
2. Estudiante consulta cédula.
3. Estudiante completa título 1, título 2 y título 3.
4. Estudiante marca título preferido.
5. Estudiante envía a revisión.
6. Coordinador revisa y guarda decisión.
7. Administrador verifica estado final.
