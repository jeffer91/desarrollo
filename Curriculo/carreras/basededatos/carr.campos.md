# Campos del documento de carreras

## Colección

`carreras`

## Regla de documento

Cada carrera se guarda con un `id` generado desde el nombre:

```txt
Administración de Empresas → administracion_de_empresas
```

El mismo `id` se usa en:

- Base local central de Currículo.
- Cola de sincronización.
- Documento remoto en Firebase.

---

## Campos principales

### id

Identificador único del documento.

Ejemplo:

```json
"administracion_de_empresas"
```

---

### nombre

Nombre visible de la carrera.

Ejemplo:

```json
"Administración de Empresas"
```

---

### nombreNormalizado

Nombre preparado para búsquedas y comparación.

Ejemplo:

```json
"administracion de empresas"
```

---

### tipo

Tipo académico de la carrera.

Valores permitidos:

- `Tecnologia Superior`
- `Tecnologia Universitaria`
- `Tecnica Superior`

---

### estado

Estado actual de la carrera.

Valores permitidos:

- `activa`
- `inactiva`

Valor recomendado al crear:

```json
"activa"
```

---

## Campos académicos base

### nucleos

Arreglo de 4 posiciones para registrar los núcleos de la carrera.

Estructura:

```json
["", "", "", ""]
```

---

### materiasNivel1, materiasNivel2, materiasNivel3, materiasNivel4

Arreglos para materias propias de cada nivel.

Ejemplo:

```json
["Matemática", "Comunicación"]
```

---

### materiasTransversal1, materiasTransversal2, materiasTransversal3, materiasTransversal4

Arreglos para materias transversales de cada nivel.

Ejemplo:

```json
["Inglés", "Ética"]
```

---

## Campos de fechas

### createdAt

Fecha generada por Firebase cuando el documento se sube a la nube.

### updatedAt

Fecha actualizada por Firebase cuando el documento se modifica en la nube.

### createdAtLocal

Fecha local ISO cuando el documento se creó en la app.

### updatedAtLocal

Fecha local ISO cuando el documento se actualizó en la app.

---

## Regla funcional

La carrera se guarda primero en la base local central de Currículo.  
Si existe sincronización disponible, queda pendiente para subir a Firebase.  
Si la base local no está disponible, el módulo usa Firebase como respaldo directo.
