/*
Nombre completo: estadisticas-export.js
Ruta o ubicación: /incorporaciones-app/estadisticas/estadisticas-export.js

Función o funciones:
1. Exportar estadísticas a Excel usando SheetJS.
2. Crear archivos con una o varias hojas.
3. Exportar resumen, por carrera, pendientes, Quito, Manta o todo.
*/

function statsFormatearFechaArchivo() {
  const fecha = new Date();

  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  const hour = String(fecha.getHours()).padStart(2, "0");
  const minute = String(fecha.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}_${hour}-${minute}`;
}

function statsLimpiarNombreArchivo(valor) {
  return String(valor || "estadisticas")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function statsAjustarAnchoColumnas(worksheet, filas) {
  if (!filas || filas.length === 0) {
    return;
  }

  const columnas = Object.keys(filas[0]);

  worksheet["!cols"] = columnas.map(function (columna) {
    let ancho = columna.length;

    filas.forEach(function (fila) {
      const valor = fila[columna] === null || fila[columna] === undefined
        ? ""
        : String(fila[columna]);

      ancho = Math.max(ancho, valor.length);
    });

    return {
      wch: Math.min(Math.max(ancho + 2, 12), 45)
    };
  });
}

function statsAgregarHoja(workbook, nombreHoja, filas) {
  const filasSeguras = Array.isArray(filas) && filas.length > 0
    ? filas
    : [{ Mensaje: "Sin datos para mostrar" }];

  const worksheet = XLSX.utils.json_to_sheet(filasSeguras);

  statsAjustarAnchoColumnas(worksheet, filasSeguras);

  const nombreSeguro = String(nombreHoja || "Hoja")
    .replace(/[\\/?*[\]:]/g, " ")
    .substring(0, 31);

  XLSX.utils.book_append_sheet(workbook, worksheet, nombreSeguro);
}

function exportarHojaEstadisticas(nombreArchivoBase, nombreHoja, filas) {
  if (typeof XLSX === "undefined") {
    throw new Error("No se encontró la librería XLSX. Revise que SheetJS esté cargado.");
  }

  const workbook = XLSX.utils.book_new();

  statsAgregarHoja(workbook, nombreHoja, filas);

  const fecha = statsFormatearFechaArchivo();
  const nombre = `${statsLimpiarNombreArchivo(nombreArchivoBase)}_${fecha}.xlsx`;

  XLSX.writeFile(workbook, nombre);

  return nombre;
}

function exportarLibroEstadisticas(nombreArchivoBase, hojas) {
  if (typeof XLSX === "undefined") {
    throw new Error("No se encontró la librería XLSX. Revise que SheetJS esté cargado.");
  }

  const workbook = XLSX.utils.book_new();

  Object.keys(hojas || {}).forEach(function (nombreHoja) {
    statsAgregarHoja(workbook, nombreHoja, hojas[nombreHoja]);
  });

  const fecha = statsFormatearFechaArchivo();
  const nombre = `${statsLimpiarNombreArchivo(nombreArchivoBase)}_${fecha}.xlsx`;

  XLSX.writeFile(workbook, nombre);

  return nombre;
}

function exportarTodoEstadisticas(paquete) {
  if (!paquete) {
    throw new Error("No existe información para exportar.");
  }

  return exportarLibroEstadisticas(paquete.nombreArchivo || "estadisticas_incorporaciones", {
    Resumen: paquete.resumen || [],
    PorCarrera: paquete.porCarrera || [],
    PorModalidad: paquete.porModalidad || [],
    PorSedeInstitucional: paquete.porSedeInstitucional || [],
    CruceCarreraSede: paquete.cruceCarreraSede || [],
    CruceModalidadSede: paquete.cruceModalidadSede || [],
    CruceSedeInstitucional: paquete.cruceSedeInstitucional || [],
    RankingPendientes: paquete.rankingPendientes || [],
    Pendientes: paquete.pendientes || [],
    Quito: paquete.quito || [],
    Manta: paquete.manta || [],
    BaseConsolidada: paquete.baseConsolidada || []
  });
}