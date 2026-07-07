/*
=========================================================
Nombre completo: certi.capacitacion.template.js
Ruta o ubicación: /incorporaciones/certificados/certi.capacitacion.template.js
Función o funciones:
- Dibujar el certificado de capacitación docente en PDF.
- Usar plantilla de fondo específica para capacitación.
- Usar texto institucional formal.
- Dibujar tres firmas: Rector, Gestor de Procesos Académicos y Capacitador.
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

    doc.setTextColor(20, 20, 20);
    doc.setFont("times", "normal");
    doc.setFontSize(11.8);

    escribirCentrado(
      doc,
      "El Instituto Superior Tecnológico Quito Metropolitano, en uso de sus atribuciones institucionales, certifica que:",
      centroX,
      42,
      235,
      5.6
    );

    doc.setTextColor(6, 25, 65);
    doc.setFont("times", "bold");
    doc.setFontSize(calcularTamanoNombre(nombre));
    const finNombre = escribirCentrado(doc, nombre, centroX, 60, 238, 7.6);

    dibujarLinea(doc, centroX - 92, finNombre + 5, centroX + 92, finNombre + 5, 7, 29, 76, 0.45);

    doc.setTextColor(20, 20, 20);
    doc.setFont("times", "normal");
    doc.setFontSize(11.5);
    escribirCentrado(
      doc,
      "participó y aprobó satisfactoriamente el programa de capacitación denominado:",
      centroX,
      Math.max(78, finNombre + 16),
      230,
      5.4
    );

    doc.setTextColor(6, 25, 65);
    doc.setFont("times", "bold");
    doc.setFontSize(calcularTamanoCurso(curso));
    const finCurso = escribirCentrado(doc, curso, centroX, Math.max(91, finNombre + 29), 238, 6.8);

    doc.setTextColor(20, 20, 20);
    doc.setFont("times", "normal");
    doc.setFontSize(10.8);

    const textoPeriodo = `desarrollado durante el período ${periodo}, con una duración total de ${horas} horas académicas, obteniendo una calificación final de ${nota}/10.`;
    const finPeriodo = escribirCentrado(doc, textoPeriodo, centroX, Math.max(111, finCurso + 12), 232, 5.4);

    const textoConstancia = "El presente certificado se confiere como constancia formal del cumplimiento de los requisitos académicos establecidos por la institución, así como de la aprobación del proceso formativo correspondiente.";
    const finConstancia = escribirCentrado(doc, textoConstancia, centroX, Math.max(127, finPeriodo + 12), 232, 5.2);

    doc.setTextColor(80, 80, 80);
    doc.setFont("times", "normal");
    doc.setFontSize(10.6);
    escribirCentrado(
      doc,
      `Dado y firmado en la ciudad de ${ciudad}, a los ${fechaFormal}.`,
      centroX,
      Math.max(146, finConstancia + 11),
      232,
      5.2
    );
  }

  function dibujarFirmas(doc, firmantes, ancho) {
    const y = 173;
    const posiciones = [ancho * 0.21, ancho * 0.50, ancho * 0.79];

    (firmantes || []).slice(0, 3).forEach(function (firmante, index) {
      const x = posiciones[index] || ancho / 2;
      const nombre = limpiarTexto(firmante.nombre || "");
      const cargo = limpiarTexto(firmante.cargo || "");

      dibujarLinea(doc, x - 34, y, x + 34, y, 65, 65, 65, 0.38);

      doc.setTextColor(10, 10, 10);
      doc.setFont("times", "bold");
      doc.setFontSize(calcularTamanoFirma(nombre));
      escribirCentrado(doc, nombre, x, y + 7.8, 66, 4.2);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.1);
      escribirCentrado(doc, cargo, x, y + 15.3, 70, 3.7);
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
      { nombre: capacitador || "CAPACITADOR", cargo: "CAPACITADOR" }
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
    if (largo > 62) return 14.5;
    if (largo > 54) return 15.7;
    if (largo > 46) return 16.8;
    if (largo > 38) return 18;
    if (largo > 30) return 19.2;
    return 20.8;
  }

  function calcularTamanoCurso(curso) {
    const largo = String(curso || "").length;
    if (largo > 86) return 12.2;
    if (largo > 72) return 13.2;
    if (largo > 58) return 14.2;
    if (largo > 44) return 15.2;
    return 16.2;
  }

  function calcularTamanoFirma(nombre) {
    const largo = String(nombre || "").length;
    if (largo > 38) return 7.5;
    if (largo > 30) return 8.2;
    return 9;
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

  window.CertiCapacitacionTemplate = {
    dibujarCertificado,
    dibujarFondo,
    dibujarContenido,
    dibujarFirmas
  };
})();
