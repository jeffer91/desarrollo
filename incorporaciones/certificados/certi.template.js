/*
=========================================================
Nombre completo: certi.template.js
Ruta o ubicación: /incorporaciones/certificados/certi.template.js
Función o funciones:
- Dibujar el contenido del certificado sobre la plantilla oficial.
- Centralizar posiciones, fuentes, líneas decorativas y textos del certificado.
- Preparar cada página del PDF con fondo, nombre, promedio, carrera, cohorte, fecha y firma.
Con qué se une:
- certi.config.js
- certi.pdf.js
- certi.utils.js
=========================================================
*/

(function () {
  "use strict";

  const U = window.CertiUtils;

  function obtenerConfig() {
    return window.CertiConfig || {
      institucion: "Instituto Superior Tecnológico Quito Metropolitano",
      ciudad: "Quito",
      firmante: {
        nombre: "Dr. León Alberto Tito",
        cargo: "RECTOR"
      },
      rutas: {
        plantillaCertificado: "./assets/certi-plantilla-certificado.png"
      },
      pdf: {
        ancho: 297,
        alto: 210,
        margenX: 28
      },
      texto: {
        encabezado: "El Instituto Superior Tecnológico Quito Metropolitano otorga el\npresente reconocimiento a:",
        reconocimiento: "Por su destacada trayectoria académica y por haber alcanzado un promedio de {{PROMEDIO}} en la carrera {{CARRERA}}, cohorte {{PERIODO}}.",
        cierre: "Su esfuerzo, dedicación y compromiso con la excelencia constituyen un motivo de orgullo institucional y un referente para la comunidad educativa."
      }
    };
  }

  async function dibujarCertificado(doc, certificado, opciones) {
    const config = obtenerConfig();
    const plantilla = opciones && opciones.plantillaDataUrl;

    dibujarFondo(doc, plantilla, config);
    dibujarTexto(doc, certificado, config);
  }

  function dibujarFondo(doc, plantillaDataUrl, config) {
    const ancho = config.pdf.ancho || 297;
    const alto = config.pdf.alto || 210;

    if (plantillaDataUrl) {
      try {
        doc.addImage(plantillaDataUrl, "PNG", 0, 0, ancho, alto);
        return;
      } catch (error) {
        console.warn("No se pudo colocar la plantilla como imagen:", error);
      }
    }

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, ancho, alto, "F");

    doc.setDrawColor(13, 71, 161);
    doc.setLineWidth(1.4);
    doc.rect(10, 10, ancho - 20, alto - 20);

    doc.setDrawColor(183, 28, 28);
    doc.setLineWidth(0.7);
    doc.rect(16, 16, ancho - 32, alto - 32);
  }

  function dibujarTexto(doc, certificado, config) {
    const ancho = config.pdf.ancho || 297;
    const margenX = config.pdf.margenX || 28;
    const centroX = ancho / 2;

    const nombre = U.limpiarNombrePropio(certificado.nombre).toUpperCase();
    const carrera = String(certificado.carrera || "").toUpperCase();
    const promedio = certificado.promedio;
    const periodo = String(certificado.periodo || "").toUpperCase();
    const fecha = certificado.fecha || "";
    const ciudad = config.ciudad || "Quito";

    const anchoNombre = ancho - margenX * 2;
    const anchoEncabezado = 224;
    const anchoReconocimiento = 226;
    const anchoCierre = 224;

    const yEncabezado = 58;
    const yNombre = 79;
    const yReconocimiento = 105;
    const yCierre = 131;
    const yFecha = 154;
    const yFirma = 171;

    doc.setTextColor(25, 25, 25);
    doc.setFont("times", "normal");
    doc.setFontSize(14.2);

    escribirCentradoMultilinea(
      doc,
      config.texto.encabezado,
      centroX,
      yEncabezado,
      anchoEncabezado,
      6.3
    );

    doc.setTextColor(6, 25, 65);
    doc.setFont("times", "bold");
    doc.setFontSize(calcularTamanoNombre(nombre));

    const finNombre = escribirCentradoMultilinea(
      doc,
      nombre,
      centroX,
      yNombre,
      anchoNombre,
      9.2
    );

    const yLineaNombre = finNombre + 7;
    dibujarLineaNombre(doc, centroX, yLineaNombre);

    const textoReconocimiento = prepararTextoReconocimiento(
      config.texto.reconocimiento,
      promedio,
      carrera,
      periodo
    );

    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.6);

    const finReconocimiento = escribirCentradoMultilinea(
      doc,
      textoReconocimiento,
      centroX,
      Math.max(yReconocimiento, yLineaNombre + 13),
      anchoReconocimiento,
      5.5
    );

    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.4);

    const finCierre = escribirCentradoMultilinea(
      doc,
      config.texto.cierre,
      centroX,
      Math.max(yCierre, finReconocimiento + 15),
      anchoCierre,
      5.5
    );

    doc.setTextColor(115, 115, 115);
    doc.setFont("times", "normal");
    doc.setFontSize(11.8);
    doc.text(`${ciudad}, ${fecha}.`, ancho - margenX, Math.max(yFecha, finCierre + 16), {
    align: "right"
    });

    dibujarLineaFirma(doc, centroX, yFirma);

    doc.setTextColor(10, 10, 10);
    doc.setFont("times", "bold");
    doc.setFontSize(11.6);

    doc.text(config.firmante.nombre, centroX, yFirma + 8.4, {
      align: "center"
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.8);

    doc.text(config.firmante.cargo, centroX, yFirma + 14.4, {
      align: "center"
    });
  }

  function prepararTextoReconocimiento(texto, promedio, carrera, periodo) {
    return String(texto || "")
      .replace("{{PROMEDIO}}", promedio)
      .replace("{{CARRERA}}", carrera)
      .replace("{{PERIODO}}", periodo)
      .replace("en la carrera de ", "en la carrera ");
  }

  function dibujarLineaNombre(doc, centroX, y) {
    doc.setDrawColor(7, 29, 76);
    doc.setLineWidth(0.5);
    doc.line(centroX - 92, y, centroX + 92, y);

    doc.setDrawColor(196, 155, 57);
    doc.setLineWidth(0.18);
    doc.line(centroX - 64, y + 1.4, centroX + 64, y + 1.4);
  }

  function dibujarLineaFirma(doc, centroX, y) {
    doc.setDrawColor(65, 65, 65);
    doc.setLineWidth(0.38);
    doc.line(centroX - 39, y, centroX + 39, y);
  }

  function escribirCentradoMultilinea(doc, texto, x, y, anchoMaximo, saltoLinea) {
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

    if (!lineas.length) {
      return y;
    }

    return y + (lineas.length - 1) * saltoLinea;
  }

  function calcularTamanoNombre(nombre) {
    const largo = String(nombre || "").length;

    if (largo > 62) return 16.2;
    if (largo > 54) return 17.4;
    if (largo > 46) return 18.6;
    if (largo > 38) return 20;
    if (largo > 30) return 21.2;

    return 22.4;
  }

  window.CertiTemplate = {
    dibujarCertificado
  };
})();