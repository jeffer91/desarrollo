/*
=========================================================
Nombre completo: certi.source.js
Ruta o ubicación: /incorporaciones/certificados/certi.source.js
Función o funciones:
- Centralizar la lectura de datos para Certi.
- Decidir si se procesa Excel, texto pegado o modo automático.
- Entregar a certi.app.js una lectura uniforme con registros y alertas.
Con qué se une:
- certi.excel.js
- certi.text.js
- certi.app.js
- certi.state.js
=========================================================
*/

(function () {
  "use strict";

  function obtenerFuenteSolicitada(estado) {
    const fuente = String(estado && estado.fuenteDatos ? estado.fuenteDatos : "auto")
      .toLowerCase()
      .trim();

    if (["excel", "texto", "auto"].includes(fuente)) {
      return fuente;
    }

    return "auto";
  }

  function tieneExcel(estado) {
    return Boolean(estado && estado.archivoExcel);
  }

  function tieneTexto(estado) {
    return Boolean(estado && String(estado.textoPegado || "").trim());
  }

  function resolverFuente(estado) {
    const fuente = obtenerFuenteSolicitada(estado);
    const excel = tieneExcel(estado);
    const texto = tieneTexto(estado);

    if (fuente === "excel") {
      if (!excel) {
        throw new Error("Debe cargar el Excel de mejores egresados.");
      }

      return "excel";
    }

    if (fuente === "texto") {
      if (!texto) {
        throw new Error("Debe pegar texto con carrera, estudiante y promedio.");
      }

      return "texto";
    }

    if (excel) return "excel";
    if (texto) return "texto";

    throw new Error("Debe cargar un Excel o pegar texto con datos válidos.");
  }

  async function leer(estado) {
    const fuente = resolverFuente(estado);

    if (fuente === "excel") {
      return leerExcel(estado);
    }

    return leerTexto(estado);
  }

  async function leerExcel(estado) {
    if (!window.CertiExcel || typeof window.CertiExcel.leerArchivo !== "function") {
      throw new Error("No está disponible el lector de Excel.");
    }

    if (!window.XLSX) {
      throw new Error("No se encontró la librería XLSX para leer Excel.");
    }

    const lectura = await window.CertiExcel.leerArchivo(estado.archivoExcel);

    return normalizarLectura({
      ...lectura,
      origen: "excel",
      fuente: "excel",
      nombreArchivo: lectura.nombreArchivo || estado.nombreArchivoExcel || "Excel cargado",
      alertas: [
        {
          tipo: "info",
          titulo: "Fuente de datos",
          mensaje: `Excel: ${lectura.nombreArchivo || estado.nombreArchivoExcel || "archivo cargado"}`
        }
      ].concat(lectura.alertas || [])
    });
  }

  async function leerTexto(estado) {
    if (!window.CertiText || typeof window.CertiText.leerTexto !== "function") {
      throw new Error("No está disponible el lector inteligente de texto.");
    }

    const lectura = window.CertiText.leerTexto(estado.textoPegado || "");

    return normalizarLectura({
      ...lectura,
      origen: "texto",
      fuente: "texto",
      nombreArchivo: "Texto pegado",
      alertas: [
        {
          tipo: "info",
          titulo: "Fuente de datos",
          mensaje: "Texto pegado interpretado automáticamente."
        }
      ].concat(lectura.alertas || [])
    });
  }

  function normalizarLectura(lectura) {
    const data = lectura || {};

    return {
      nombreArchivo: data.nombreArchivo || "Datos cargados",
      hoja: data.hoja || data.fuente || "Datos",
      hojasLeidas: Array.isArray(data.hojasLeidas) ? data.hojasLeidas : [],
      totalFilas: Number(data.totalFilas || 0),
      registros: Array.isArray(data.registros) ? data.registros : [],
      alertas: Array.isArray(data.alertas) ? data.alertas : [],
      origen: data.origen || data.fuente || "datos",
      fuente: data.fuente || data.origen || "datos"
    };
  }

  function describirFuente(estado) {
    const fuente = obtenerFuenteSolicitada(estado);

    if (fuente === "excel") return "Excel";
    if (fuente === "texto") return "Texto pegado";
    return "Automático";
  }

  window.CertiSource = {
    leer,
    resolverFuente,
    describirFuente,
    tieneExcel,
    tieneTexto
  };
})();