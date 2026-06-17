/*
Nombre completo: excel-reader.js
Ruta o ubicación: /incorporaciones-app/js/excel-reader.js

Función o funciones:
1. Leer archivos Excel con SheetJS.
2. Convertir la primera hoja del Excel en registros JSON.
3. Detectar columnas equivalentes aunque tengan nombres diferentes.
4. Preparar los campos necesarios para guardar estudiantes en Firebase.
5. Mantener los campos originales del Excel para no perder información.
6. No depender del período del Excel; el período seleccionado en admin.html manda.
*/

function normalizarNombreColumna(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/_/g, "")
    .replace(/-/g, "");
}

function obtenerValorPorPosiblesColumnas(fila, posiblesColumnas) {
  const columnasFila = Object.keys(fila);

  for (const posible of posiblesColumnas) {
    const posibleNormalizado = normalizarNombreColumna(posible);

    const columnaEncontrada = columnasFila.find(function (columnaReal) {
      return normalizarNombreColumna(columnaReal) === posibleNormalizado;
    });

    if (columnaEncontrada && fila[columnaEncontrada] !== undefined) {
      return fila[columnaEncontrada];
    }
  }

  return "";
}

function obtenerTextoFila(fila, columnas) {
  return String(obtenerValorPorPosiblesColumnas(fila, columnas) || "").trim();
}

function obtenerCumplimientoFila(fila, columnas) {
  const valor = obtenerTextoFila(fila, columnas);
  return valor ? valor.toUpperCase().trim() : "";
}

function normalizarCedulaExcel(valor) {
  const cedula = limpiarCedula(valor);

  if (cedula.length === 9) {
    // Corrección: restaura el 0 inicial perdido por Excel HTML antiguo.
    // Evita crear otro estudiante duplicado con cédula de 9 dígitos.
    // Permite que el nuevo Excel actualice el registro real de 10 dígitos.
    return `0${cedula}`;
  }

  return cedula;
}

function mapearFilaEstudiante(fila) {
  const numeroIdentificacion = normalizarCedulaExcel(
    obtenerValorPorPosiblesColumnas(fila, [
      "numeroIdentificacion",
      "Número Identificación",
      "Numero Identificacion",
      "identificacion",
      "identificación",
      "cedula",
      "cédula",
      "Cedula",
      "Cédula",
      "documento",
      "Documento"
    ])
  );

  const nombres = obtenerTextoFila(fila, [
    "Nombres",
    "Nombre",
    "Estudiante",
    "Apellidos y Nombres",
    "ApellidosNombres",
    "Alumno",
    "NombreCompleto",
    "Nombre Completo"
  ]);

  const nombreCarrera = obtenerTextoFila(fila, [
    "NombreCarrera",
    "Nombre Carrera",
    "Carrera",
    "nombre_carrera",
    "Programa",
    "Nombre Programa"
  ]);

  const codigoCarrera = obtenerTextoFila(fila, [
    "CodigoCarrera",
    "Código Carrera",
    "Codigo Carrera",
    "codigo_carrera",
    "CódigoCarrera"
  ]);

  const periodoOriginalExcel = obtenerTextoFila(fila, [
    "periodoId",
    "PeriodoId",
    "Período",
    "Periodo",
    "periodo"
  ]);

  return {
    ...fila,

    cedula: numeroIdentificacion,
    numeroIdentificacion: numeroIdentificacion,
    Nombres: nombres,
    NombreCarrera: nombreCarrera,
    CodigoCarrera: codigoCarrera,

    /*
    Importante:
    El período real se asigna en admin.js según el período seleccionado.
    Este campo se conserva solo como evidencia de lo que venía en el Excel.
    */
    periodoId: "",
    periodoOriginalExcel: periodoOriginalExcel,

    modalidadDetectada: obtenerModalidadDesdeCarrera(nombreCarrera),

    Academico: obtenerCumplimientoFila(fila, [
      "Academico",
      "Académico"
    ]),

    Documentacion: obtenerCumplimientoFila(fila, [
      "Documentacion",
      "Documentación"
    ]),

    // Corrección: acepta nombres alternativos de la columna Financiero en el Excel.
    // Evita guardar el campo vacío si el encabezado no viene exactamente como "Financiero".
    // Esto permite que "CUMPLE" se lea correctamente y el estudiante quede habilitado.
    Financiero: obtenerCumplimientoFila(fila, [
      "Financiero",
      "Estado Financiero",
      "Cumplimiento Financiero",
      "Requisito Financiero",
      "Departamento Financiero",
      "Validacion Financiera",
      "Validación Financiera"
    ]),

    Titulacion: obtenerCumplimientoFila(fila, [
      "Titulacion",
      "Titulación"
    ]),

    Ingles: obtenerCumplimientoFila(fila, [
      "Ingles",
      "Inglés"
    ]),

    ActualizaciónDatos: obtenerCumplimientoFila(fila, [
      "ActualizaciónDatos",
      "ActualizacionDatos",
      "Actualización Datos",
      "Actualizacion Datos"
    ]),

    PrácticasVinculacion: obtenerCumplimientoFila(fila, [
      "PrácticasVinculacion",
      "PracticasVinculacion",
      "Prácticas Vinculación",
      "Practicas Vinculacion",
      "Prácticas",
      "Practicas",
      "Vinculación",
      "Vinculacion"
    ]),

    Vinculacion: obtenerCumplimientoFila(fila, [
      "Vinculacion",
      "Vinculación"
    ]),

    SeguimientoGraduados: obtenerCumplimientoFila(fila, [
      "SeguimientoGraduados",
      "Seguimiento Graduados",
      "Seguimiento Egresados",
      "SeguimientoEgresados"
    ]),

    AprobacionTitulacion: obtenerCumplimientoFila(fila, [
      "AprobacionTitulacion",
      "AprobaciónTitulación",
      "Aprobacion Titulacion",
      "Aprobación Titulación"
    ]),

    AprobacionComplexivoProyecto: obtenerCumplimientoFila(fila, [
      "AprobacionComplexivoProyecto",
      "AprobaciónComplexivoProyecto",
      "Aprobacion Complexivo Proyecto",
      "Aprobación Complexivo Proyecto",
      "AprobacionComplexivo",
      "AprobaciónComplexivo"
    ]),

    Celular: obtenerTextoFila(fila, [
      "Celular",
      "Telefono",
      "Teléfono",
      "TelefonoCelular",
      "Teléfono Celular"
    ]),

    CorreoInstitucional: obtenerTextoFila(fila, [
      "CorreoInstitucional",
      "Correo Institucional",
      "EmailInstitucional",
      "Email Institucional"
    ]),

    CorreoPersonal: obtenerTextoFila(fila, [
      "CorreoPersonal",
      "Correo Personal",
      "EmailPersonal",
      "Email Personal"
    ]),

    Sede: obtenerTextoFila(fila, [
      "Sede"
    ]),

    HorarioComplexivo: obtenerTextoFila(fila, [
      "HorarioComplexivo",
      "Horario Complexivo",
      "Horario"
    ])
  };
}

function leerExcelComoEstudiantes(file) {
  return new Promise(function (resolve, reject) {
    if (!file) {
      reject(new Error("Debe seleccionar un archivo Excel."));
      return;
    }

    const extensionValida =
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls");

    if (!extensionValida) {
      reject(new Error("El archivo debe ser Excel: .xlsx o .xls."));
      return;
    }

    const reader = new FileReader();

    reader.onload = function (event) {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const primeraHoja = workbook.SheetNames[0];

        if (!primeraHoja) {
          reject(new Error("El archivo Excel no contiene hojas."));
          return;
        }

        const worksheet = workbook.Sheets[primeraHoja];

        const filas = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
          raw: false
        });

        const estudiantes = filas
          .map(mapearFilaEstudiante)
          .filter(function (estudiante) {
            return estudiante.numeroIdentificacion;
          });

        resolve({
          hoja: primeraHoja,
          totalFilas: filas.length,
          totalEstudiantesValidos: estudiantes.length,
          estudiantes: estudiantes
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = function () {
      reject(new Error("No se pudo leer el archivo Excel."));
    };

    reader.readAsArrayBuffer(file);
  });
}