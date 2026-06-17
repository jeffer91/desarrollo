/*
=========================================================
Nombre completo: certi.pdf.js
Ruta o ubicación: /incorporaciones/sedes/certi/certi.pdf.js
Función o funciones:
- Generar PDF único con todos los certificados.
- Generar PDFs individuales por cada mejor egresado.
- Usar la plantilla oficial como fondo del certificado.
- Descargar directamente los archivos, sin vista previa.
Con qué se une:
- certi.config.js
- certi.template.js
- certi.logic.js
- certi.storage.js
- certi.utils.js
- certi.app.js
=========================================================
*/

(function () {
  "use strict";

  const U = window.CertiUtils;

  function obtenerConfig() {
    return window.CertiConfig || {
      pdf: {
        orientacion: "landscape",
        unidad: "mm",
        formato: "a4"
      },
      rutas: {
        plantillaCertificado: "./assets/certi-plantilla-certificado.png"
      },
      archivos: {
        pdfUnicoPrefijo: "Certificados_Mejores_Egresados",
        pdfIndividualPrefijo: "Certificado"
      }
    };
  }

  async function descargarPdfUnico(estado) {
    const preparado = window.CertiLogic.prepararCertificados(estado);

    if (!preparado.valido) {
      throw new Error(preparado.errores.join("\n"));
    }

    const config = obtenerConfig();
    const jsPDF = obtenerJsPdf();
    const doc = new jsPDF({
      orientation: config.pdf.orientacion || "landscape",
      unit: config.pdf.unidad || "mm",
      format: config.pdf.formato || "a4"
    });

    const plantillaDataUrl = await cargarPlantilla(config.rutas.plantillaCertificado);

    for (let i = 0; i < preparado.certificados.length; i++) {
      if (i > 0) doc.addPage();

      await window.CertiTemplate.dibujarCertificado(doc, preparado.certificados[i], {
        plantillaDataUrl
      });
    }

    const nombreArchivo = crearNombrePdfUnico(estado);
    doc.save(nombreArchivo);

    registrarHistorial(estado, preparado.certificados.length, "pdf_unico", nombreArchivo);
  }

  async function descargarPdfIndividuales(estado) {
    const preparado = window.CertiLogic.prepararCertificados(estado);

    if (!preparado.valido) {
      throw new Error(preparado.errores.join("\n"));
    }

    const config = obtenerConfig();
    const jsPDF = obtenerJsPdf();
    const plantillaDataUrl = await cargarPlantilla(config.rutas.plantillaCertificado);

    for (let i = 0; i < preparado.certificados.length; i++) {
      const certificado = preparado.certificados[i];

      const doc = new jsPDF({
        orientation: config.pdf.orientacion || "landscape",
        unit: config.pdf.unidad || "mm",
        format: config.pdf.formato || "a4"
      });

      await window.CertiTemplate.dibujarCertificado(doc, certificado, {
        plantillaDataUrl
      });

      const nombreArchivo = crearNombrePdfIndividual(certificado, estado);
      doc.save(nombreArchivo);

      await esperar(220);
    }

    registrarHistorial(
      estado,
      preparado.certificados.length,
      "pdfs_individuales",
      "descarga_individual"
    );
  }

  function obtenerJsPdf() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("No se encontró la librería jsPDF.");
    }

    return window.jspdf.jsPDF;
  }

  async function cargarPlantilla(ruta) {
    if (!ruta) return "";

    try {
      return await imagenADataUrl(ruta);
    } catch (error) {
      console.warn("No se pudo cargar la plantilla del certificado:", error);
      return "";
    }
  }

  function imagenADataUrl(ruta) {
    return new Promise(function (resolve, reject) {
      const imagen = new Image();

      imagen.onload = function () {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = imagen.naturalWidth || imagen.width;
          canvas.height = imagen.naturalHeight || imagen.height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(imagen, 0, 0);

          resolve(canvas.toDataURL("image/png"));
        } catch (error) {
          reject(error);
        }
      };

      imagen.onerror = function () {
        reject(new Error("No se pudo cargar la imagen de plantilla."));
      };

      imagen.src = ruta;
    });
  }

  function crearNombrePdfUnico(estado) {
    const config = obtenerConfig();
    const periodo = U.crearNombreArchivo(estado.periodoTexto || estado.periodoSeleccionado);
    const fecha = U.formatearFechaArchivo(estado.fechaCertificado);

    return `${config.archivos.pdfUnicoPrefijo}_${periodo}_${fecha}.pdf`;
  }

  function crearNombrePdfIndividual(certificado, estado) {
    const config = obtenerConfig();
    const periodo = U.crearNombreArchivo(estado.periodoTexto || estado.periodoSeleccionado);
    const carrera = U.crearNombreArchivo(certificado.carrera);
    const nombre = U.crearNombreArchivo(certificado.nombre);

    return `${config.archivos.pdfIndividualPrefijo}_${periodo}_${carrera}_${nombre}.pdf`;
  }

  function registrarHistorial(estado, total, tipoDescarga, archivo) {
    if (!window.CertiStorage) return;

    window.CertiStorage.agregarHistorial({
      periodo: estado.periodoTexto || estado.periodoSeleccionado,
      fechaCertificado: estado.fechaCertificado,
      totalCertificados: total,
      tipoDescarga,
      archivo
    });
  }

  function esperar(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  window.CertiPdf = {
    descargarPdfUnico,
    descargarPdfIndividuales
  };
})();