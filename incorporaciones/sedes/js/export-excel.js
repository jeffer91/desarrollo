/*
Nombre completo: export-excel.js
Ruta o ubicación: /incorporaciones-app/js/export-excel.js

Función o funciones:
1. Exportar estudiantes a Excel usando SheetJS.
2. Incluir información académica principal.
3. Incluir período.
4. Incluir estado de habilitación.
5. Incluir sede de incorporación desde la colección incorporaciones.
6. Incluir si respondió o no respondió.
7. Incluir fecha de registro y última actualización.
8. Incluir requisitos pendientes.
*/

function formatearFechaArchivo() {
  const fecha = new Date();

  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  const hour = String(fecha.getHours()).padStart(2, "0");
  const minute = String(fecha.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}_${hour}-${minute}`;
}

function prepararFilaExportacion(estudiante) {
  const habilitado = estudianteEstaHabilitado(estudiante);
  const respondio = estudiante.respondioIncorporacion === true;
  const cedula = obtenerCedulaEstudiante(estudiante);
  const incorporacion = estudiante.incorporacion || estudiante.sedeIncorporacion || "";
  const pendientes = obtenerRequisitosPendientesTexto(estudiante);

  return {
    Cedula: cedula,
    Nombres: estudiante.Nombres || "",
    Carrera: estudiante.NombreCarrera || "",
    CodigoCarrera: estudiante.CodigoCarrera || "",
    Periodo: estudiante.periodoId || "",

    Habilitado: habilitado ? "SI" : "NO",
    Respondio: respondio ? "SI" : "NO",
    Incorporacion: incorporacion || "SIN SEDE",
    FechaRegistroIncorporacion: estudiante.fechaRegistroIncorporacion || "",
    UltimaActualizacionIncorporacion:
      estudiante.ultimaActualizacionIncorporacion || "",

    RequisitosPendientes: pendientes,

    Academico: estudiante.Academico || "",
    Documentacion: estudiante.Documentacion || "",
    Financiero: estudiante.Financiero || "",
    Ingles: estudiante.Ingles || "",
    ActualizacionDatos: estudiante["ActualizaciónDatos"] || "",
    PracticasVinculacion: estudiante["PrácticasVinculacion"] || "",
    AprobacionTitulacion: estudiante.AprobacionTitulacion || "",
    AprobacionComplexivoProyecto:
      estudiante.AprobacionComplexivoProyecto || "",

    Celular: estudiante.Celular || "",
    CorreoInstitucional: estudiante.CorreoInstitucional || "",
    CorreoPersonal: estudiante.CorreoPersonal || "",
    SedeOriginal: estudiante.Sede || "",
    HorarioComplexivo: estudiante.HorarioComplexivo || "",
    ModalidadDetectada: estudiante.modalidadDetectada || "",
    DocumentoFirebase: estudiante.docId || estudiante.id || "",
    DocumentoIncorporacion: estudiante.incorporacionDocId || ""
  };
}

function ajustarAnchoColumnas(worksheet, filas) {
  if (!filas || filas.length === 0) {
    return;
  }

  const columnas = Object.keys(filas[0]);

  worksheet["!cols"] = columnas.map(function (columna) {
    let max = columna.length;

    filas.forEach(function (fila) {
      const valor = String(fila[columna] || "");
      if (valor.length > max) {
        max = valor.length;
      }
    });

    return {
      wch: Math.min(Math.max(max + 2, 12), 45)
    };
  });
}

function exportarEstudiantesAExcel(estudiantes, nombreArchivoBase) {
  if (typeof XLSX === "undefined") {
    throw new Error("No se encontró la librería XLSX para exportar Excel.");
  }

  if (!Array.isArray(estudiantes) || estudiantes.length === 0) {
    throw new Error("No hay estudiantes para exportar.");
  }

  const filas = estudiantes.map(prepararFilaExportacion);

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(filas);

  ajustarAnchoColumnas(worksheet, filas);

  XLSX.utils.book_append_sheet(workbook, worksheet, "Incorporaciones");

  const fecha = formatearFechaArchivo();
  const nombreSeguro = limpiarIdFirestore(nombreArchivoBase || "reporte");
  const nombreArchivo = `${nombreSeguro}_${fecha}.xlsx`;

  XLSX.writeFile(workbook, nombreArchivo);

  return nombreArchivo;
}