/*
=========================================================
Nombre completo: certi.capacitacion.template.js
Ruta o ubicación: /incorporaciones/certificados/certi.capacitacion.template.js
Función o funciones:
- Dibujar el certificado de capacitación docente en PDF.
- Usar plantilla de fondo específica para capacitación.
- Dibujar dos firmas: Vicerrector y Gestor de Procesos Académicos.
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
    dibujarFirmas(doc, certificado.firmantes || obtenerFirmantes(), ancho);
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
    const nota = limpiarTexto(certificado.nota || certificado.promedio);
    const horas = limpiarTexto(certificado.horas || "40");
    const fecha = limpiarTexto(certificado.fecha);
    const ciudad = config.ciudad || "Quito";

    doc.setTextColor(25, 25, 25);
    doc.setFont("times", "normal");
    doc.setFontSize(14);

    escribirCentrado(
      doc,
      "El Instituto Superior Tecnológico Quito Metropolitano certifica que:",
      centroX,
      56,
      226,
      6.2
    );

    doc.setTextColor(6, 25, 65);
    doc.setFont("times", "bold");
    doc.setFontSize(calcularTamanoNombre(nombre));

    const finNombre = escribirCentrado(doc, nombre, centroX, 76, 236, 8.8);

    dibujarLinea(doc, centroX - 92, finNombre + 6, centroX + 92, finNombre + 6, 7, 29, 76, 0.5);

    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.8);

    const textoCurso = `Participó y aprobó la capacitación: ${curso}, con una duración de ${horas} horas y calificación de ${nota}.`;
    const finCurso = escribirCentrado(doc, textoCurso, centroX, Math.max(103, finNombre + 18), 226, 5.6);

    doc.setFontSize(10.3);
    escribirCentrado(
      doc,
      "El presente certificado se emite como constancia de participación y cumplimiento académico.",
      centroX,
      Math.max(129, finCurso + 15),
      222,
      5.4
    );

    doc.setTextColor(115, 115, 115);
    doc.setFont("times", "normal");
    doc.setFontSize(11.6);
    doc.text(`${ciudad}, ${fecha}.`, ancho - 28, 151, {
      align: "right"
    });
  }

  function dibujarFirmas(doc, firmantes, ancho) {
    const y = 171;
    const posiciones = [ancho * 0.32, ancho * 0.68];

    (firmantes || obtenerFirmantes()).slice(0, 2).forEach(function (firmante, index) {
      const x = posiciones[index] || ancho / 2;

      dibujarLinea(doc, x - 39, y, x + 39, y, 65, 65, 65, 0.38);

      doc.setTextColor(10, 10, 10);
      doc.setFont("times", "bold");
      doc.setFontSize(11.2);
      doc.text(firmante.nombre, x, y + 8.4, {
        align: "center"
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.3);
      doc.text(firmante.cargo, x, y + 14.2, {
        align: "center"
      });
    });
  }

  function obtenerFirmantes() {
    if (window.CertiFirmantes && typeof window.CertiFirmantes.obtenerFirmantesCapacitacion === "function") {
      return window.CertiFirmantes.obtenerFirmantesCapacitacion();
    }

    return [
      {
        nombre: "Dr. Alex León",
        cargo: "VICERRECTOR"
      },
      {
        nombre: "Mgs. Jefferson Villarreal",
        cargo: "GESTOR DE PROCESOS ACADÉMICOS"
      }
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
    if (largo > 62) return 16;
    if (largo > 54) return 17.2;
    if (largo > 46) return 18.4;
    if (largo > 38) return 19.6;
    if (largo > 30) return 20.8;
    return 22;
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
