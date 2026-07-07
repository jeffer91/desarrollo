/*
=========================================================
Nombre completo: certi.capacitacion.template.js
Ruta o ubicación: /incorporaciones/certificados/certi.capacitacion.template.js
Función o funciones:
- Dibujar el certificado de capacitación docente en PDF.
- Usar plantilla de fondo específica para capacitación.
- Usar texto institucional formal.
- Dibujar tres firmas: Rector, Gestor de Procesos Académicos y Capacitador.
- Corregir la ubicación vertical del contenido para que no se monte sobre el logo.
Con qué se une:
- certi.capacitacion.logic.js
- certi.capacitacion.js
- certi.firmantes.js
- certi.pdf.js
=========================================================
*/

(function () {
  "use strict";

  const U = window.CertiUtils || {};

  function dibujarCertificado(doc, certificado, opciones) {
    const config = window.CertiConfig || {};
    const pdfConfig = config.pdf || {};
    const ancho = pdfConfig.ancho || 297;
    const alto = pdfConfig.alto || 210;
    const centroX = ancho / 2;
    const plantilla = opciones && opciones.plantillaDataUrl;

    dibujarFondo(doc, plantilla, ancho, alto);
    dibujarContenido(doc, certificado, config, ancho, centroX);
    dibujarFirmas(doc, obtenerFirmantes(certificado), ancho);
  }

  function dibujarFondo(doc, plantillaDataUrl, ancho, alto) {
    if (plantillaDataUrl) {
      try {
        doc.addImage(plantillaDataUrl, "PNG", 0, 0, ancho, alto);
        return;
      } catch (error) {
        console.warn("[CertiCapacitacionTemplate] No se pudo colocar la plantilla:", error);
      }
    }

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, ancho, alto, "F");

    dibujarLinea(doc, 10, 10, ancho - 10, 10, 13, 71, 161, 1.2);
    dibujarLinea(doc, 10, alto - 10, ancho - 10, alto - 10, 13, 71, 161, 1.2);
    dibujarLinea(doc, 16, 16, ancho - 16, 16, 196, 155, 57, 0.45);
    dibujarLinea(doc, 16, alto - 16, ancho - 16, alto - 16, 196, 155, 57, 0.45);
  }

  function dibujarContenido(doc, certificado, config, ancho, centroX) {
    const nombre = limpiarNombre(certificado.nombre || certificado.docente).toUpperCase();
    const curso = limpiarTexto(certificado.curso || certificado.tema).toUpperCase();
    const nota = formatearNota(certificado.nota || certificado.promedio);
    const horas = limpiarTexto(certificado.horas || "40");
    const periodo = normalizarPeriodo(certificado.periodo || "");
    const ciudad = config.ciudad || "Quito";
    const fechaFormal = formatearFechaFormal(certificado.fechaInput, certificado.fecha);

    const yIntro = 60;
    const yNombre = 76;
    const yParticipacionMin = 96;
    const yCursoMin = 111;
    const yPeriodoMin = 130;
    const yConstanciaMin = 145;
    const yFechaMin = 160;
    const yFechaMax = 165;

    doc.setTextColor(20, 20, 20);
    doc.setFont("times", "normal");
    doc.setFontSize(12.1);

    escribirCentrado(
      doc,
      "El Instituto Superior Tecnológico Quito Metropolitano certifica que:",
      centroX,
      yIntro,
      226,
      5.8
    );

    doc.setTextColor(6, 25, 65);
    doc.setFont("times", "bold");
    doc.setFontSize(calcularTamanoNombre(nombre));
    const finNombre = escribirCentrado(doc, nombre, centroX, yNombre, 238, 7.2);

    dibujarLinea(doc, centroX - 88, finNombre + 5.2, centroX + 88, finNombre + 5.2, 7, 29, 76, 0.48);
    dibujarLinea(doc, centroX - 58, finNombre + 6.9, centroX + 58, finNombre + 6.9, 196, 155, 57, 0.20);

    doc.setTextColor(20, 20, 20);
    doc.setFont("times", "normal");
    doc.setFontSize(11.8);
    const finParticipacion = escribirCentrado(
      doc,
      "participó y aprobó satisfactoriamente el programa de capacitación denominado:",
      centroX,
      Math.max(yParticipacionMin, finNombre + 16),
      232,
      5.5
    );

    doc.setTextColor(6, 25, 65);
    doc.setFont("times", "bold");
    doc.setFontSize(calcularTamanoCurso(curso));
    const finCurso = escribirCentrado(
      doc,
      curso,
      centroX,
      Math.max(yCursoMin, finParticipacion + 10.5),
      238,
      6.4
    );

    doc.setTextColor(20, 20, 20);
    doc.setFont("times", "normal");
    doc.setFontSize(11.2);

    const textoPeriodo = `desarrollado durante el período ${periodo}, con una duración total de ${horas} horas académicas, obteniendo una calificación final de ${nota}/10.`;
    const finPeriodo = escribirCentrado(
      doc,
      textoPeriodo,
      centroX,
      Math.max(yPeriodoMin, finCurso + 12),
      236,
      5.4
    );

    const textoConstancia = "El presente certificado se confiere como constancia formal del cumplimiento de los requisitos académicos establecidos por la institución.";
    const finConstancia = escribirCentrado(
      doc,
      textoConstancia,
      centroX,
      Math.max(yConstanciaMin, finPeriodo + 10.5),
      236,
      5.2
    );

    doc.setTextColor(80, 80, 80);
    doc.setFont("times", "normal");
    doc.setFontSize(10.8);
    escribirCentrado(
      doc,
      `Dado y firmado en la ciudad de ${ciudad}, a los ${fechaFormal}.`,
      centroX,
      Math.min(Math.max(yFechaMin, finConstancia + 9.5), yFechaMax),
      232,
      5.2
    );
  }

  function dibujarFirmas(doc, firmantes, ancho) {
    const y = 178;
    const posiciones = [ancho * 0.21, ancho * 0.50, ancho * 0.79];

    (firmantes || []).slice(0, 3).forEach(function (firmante, index) {
      const x = posiciones[index] || ancho / 2;
      const nombre = limpiarTexto(firmante.nombre || "");
      const cargo = limpiarTexto(firmante.cargo || "");
      const nombreVisible = debeOcultarNombrePlaceholder(nombre, cargo) ? "" : nombre;

      dibujarLinea(doc, x - 36, y, x + 36, y, 65, 65, 65, 0.40);

      doc.setTextColor(10, 10, 10);
      doc.setFont("times", "bold");
      doc.setFontSize(calcularTamanoFirma(nombreVisible));

      if (nombreVisible) {
        escribirCentrado(doc, nombreVisible, x, y + 7.6, 70, 4.1);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.3);
      escribirCentrado(doc, cargo, x, y + 15.2, 72, 3.7);
    });
  }

  function obtenerFirmantes(certificado) {
    const capacitador = limpiarNombre(certificado.capacitador || certificado.instructor || certificado.facilitador || "");

    if (window.CertiFirmantes && typeof window.CertiFirmantes.obtenerFirmantesCapacitacion === "function") {
      return window.CertiFirmantes.obtenerFirmantesCapacitacion(capacitador);
    }

    return [
      { nombre: "Dr. León Tito", cargo: "RECTOR" },
      { nombre: "Mgs. Jefferson Villarreal", cargo: "GESTOR DE PROCESOS ACADÉMICOS" },
      { nombre: capacitador || "", cargo: "CAPACITADOR" }
    ];
  }

  function escribirCentrado(doc, texto, x, y, anchoMaximo, saltoLinea) {
    const lineas = [];

    String(texto || "")
      .split("\n")
      .forEach(function (bloque) {
        const partes = doc.splitTextToSize(bloque, anchoMaximo);
        partes.forEach(function (parte) {
          lineas.push(parte);
        });
      });

    lineas.forEach(function (linea, index) {
      doc.text(linea, x, y + index * saltoLinea, {
        align: "center"
      });
    });

    return lineas.length ? y + (lineas.length - 1) * saltoLinea : y;
  }

  function dibujarLinea(doc, x1, y1, x2, y2, r, g, b, ancho) {
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(ancho);
    doc.line(x1, y1, x2, y2);
  }

  function calcularTamanoNombre(nombre) {
    const largo = String(nombre || "").length;
    if (largo > 66) return 13.8;
    if (largo > 58) return 15;
    if (largo > 50) return 16.2;
    if (largo > 42) return 17.4;
    if (largo > 34) return 18.8;
    if (largo > 28) return 20;
    return 21.2;
  }

  function calcularTamanoCurso(curso) {
    const largo = String(curso || "").length;
    if (largo > 96) return 11.4;
    if (largo > 84) return 12.2;
    if (largo > 72) return 13;
    if (largo > 58) return 13.8;
    if (largo > 44) return 14.8;
    return 15.8;
  }

  function calcularTamanoFirma(nombre) {
    const largo = String(nombre || "").length;
    if (!largo) return 8.6;
    if (largo > 42) return 7.2;
    if (largo > 34) return 7.8;
    if (largo > 28) return 8.4;
    return 9.1;
  }

  function debeOcultarNombrePlaceholder(nombre, cargo) {
    const claveNombre = claveTexto(nombre);
    const claveCargo = claveTexto(cargo);
    return claveNombre === "CAPACITADOR" && claveCargo === "CAPACITADOR";
  }

  function formatearNota(valor) {
    const texto = limpiarTexto(valor);
    if (!texto) return "";

    const numero = Number(texto.replace(",", ".").replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(numero)) return texto.replace(".", ",");

    return numero.toFixed(2).replace(".", ",");
  }

  function formatearFechaFormal(fechaInput, fechaTexto) {
    const textoLargo = limpiarTexto(fechaTexto);
    const partes = String(fechaInput || "").split("-");

    if (partes.length === 3) {
      const anio = Number(partes[0]);
      const mes = Number(partes[1]);
      const dia = Number(partes[2]);
      const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

      if (anio && mes >= 1 && mes <= 12 && dia) {
        return `${dia} días del mes de ${meses[mes - 1]} de ${anio}`;
      }
    }

    if (textoLargo) return textoLargo;
    return "___ días del mes de __________ de ______";
  }

  function normalizarPeriodo(periodo) {
    return limpiarTexto(periodo).toLowerCase().replace(/ - /g, " – ");
  }

  function limpiarNombre(valor) {
    if (U && typeof U.limpiarNombrePropio === "function") {
      return U.limpiarNombrePropio(valor);
    }

    return limpiarTexto(valor).toUpperCase();
  }

  function limpiarTexto(valor) {
    if (U && typeof U.limpiarEspacios === "function") {
      return U.limpiarEspacios(valor);
    }

    return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim();
  }

  function claveTexto(valor) {
    if (U && typeof U.claveTexto === "function") {
      return U.claveTexto(valor);
    }

    return limpiarTexto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9Ñ ]/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  window.CertiCapacitacionTemplate = {
    dibujarCertificado,
    dibujarFondo,
    dibujarContenido,
    dibujarFirmas
  };
})();
