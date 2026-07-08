/*
=========================================================
Nombre completo: certi.template.js
Ruta o ubicación: /incorporaciones/certificados/certi.template.js
Función o funciones:
- Dibujar el contenido del certificado sobre la plantilla oficial.
- Analizar visualmente la plantilla antes de escribir.
- Usar zonas libres reales para que el texto no invada firmas, logos o bordes.
- Ajustar automáticamente tamaño, interlineado y separación cuando el texto es largo.
- Preparar cada página del PDF con fondo, nombre, promedio, carrera, cohorte, fecha y firma.
Con qué se une:
- certi.config.js
- certi.template.smart.js
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
    const layout = await obtenerLayoutVisual(plantilla, config);

    dibujarFondo(doc, plantilla, config);
    dibujarTexto(doc, certificado, config, layout);
  }

  async function obtenerLayoutVisual(plantilla, config) {
    const ancho = config.pdf.ancho || 297;
    const alto = config.pdf.alto || 210;

    if (window.CertiTemplateSmart && typeof window.CertiTemplateSmart.analizarPlantilla === "function") {
      return await window.CertiTemplateSmart.analizarPlantilla("reconocimiento", plantilla, ancho, alto);
    }

    return {
      origen: "respaldo_sin_motor",
      zonas: {
        contenido: { x: 28, y: 54, w: 241, h: 105, centroX: ancho / 2 },
        firma: { x: ancho / 2 - 62, y: 169, w: 124, h: 28, centroX: ancho / 2 }
      }
    };
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

  function dibujarTexto(doc, certificado, config, layout) {
    const Smart = window.CertiTemplateSmart;
    const ancho = config.pdf.ancho || 297;

    const nombre = limpiarNombre(certificado.nombre).toUpperCase();
    const carrera = String(certificado.carrera || "").toUpperCase();
    const promedio = certificado.promedio;
    const periodo = String(certificado.periodo || "").toUpperCase();
    const fecha = certificado.fecha || "";
    const ciudad = config.ciudad || "Quito";

    const zonaContenido = layout && layout.zonas && layout.zonas.contenido
      ? layout.zonas.contenido
      : { x: 28, y: 54, w: 241, h: 105, centroX: ancho / 2 };

    const zonaFirma = layout && layout.zonas && layout.zonas.firma
      ? layout.zonas.firma
      : { x: ancho / 2 - 62, y: 169, w: 124, h: 28, centroX: ancho / 2 };

    const textoReconocimiento = prepararTextoReconocimiento(
      config.texto.reconocimiento,
      promedio,
      carrera,
      periodo
    );

    const bloques = [
      {
        texto: config.texto.encabezado,
        font: "times",
        style: "normal",
        size: 14.2,
        minSize: 10.2,
        lineHeight: 6.1,
        minLineHeight: 4.4,
        color: [25, 25, 25],
        gapAfter: 6,
        minGapAfter: 2
      },
      {
        texto: nombre,
        font: "times",
        style: "bold",
        size: calcularTamanoNombre(nombre),
        minSize: 13.2,
        lineHeight: 8,
        minLineHeight: 5.2,
        color: [6, 25, 65],
        gapAfter: 9,
        minGapAfter: 4,
        lineAfter: {
          width: Math.min(184, zonaContenido.w * 0.76),
          offset: 4.5,
          color: [7, 29, 76],
          lineWidth: 0.5,
          secondary: {
            width: Math.min(128, zonaContenido.w * 0.53),
            offset: 5.9,
            color: [196, 155, 57],
            lineWidth: 0.18
          }
        }
      },
      {
        texto: textoReconocimiento,
        font: "helvetica",
        style: "normal",
        size: 10.6,
        minSize: 8.5,
        lineHeight: 5.2,
        minLineHeight: 3.7,
        color: [20, 20, 20],
        gapAfter: 7,
        minGapAfter: 2
      },
      {
        texto: config.texto.cierre,
        font: "helvetica",
        style: "normal",
        size: 10.4,
        minSize: 8.3,
        lineHeight: 5.2,
        minLineHeight: 3.7,
        color: [30, 30, 30],
        gapAfter: 7,
        minGapAfter: 2
      },
      {
        texto: `${ciudad}, ${fecha}.`,
        font: "times",
        style: "normal",
        size: 11.8,
        minSize: 9,
        lineHeight: 4.8,
        minLineHeight: 3.6,
        color: [115, 115, 115],
        gapAfter: 0
      }
    ];

    if (Smart && typeof Smart.prepararBloques === "function") {
      const layoutTexto = Smart.prepararBloques(doc, bloques, zonaContenido.w, zonaContenido.h);
      Smart.dibujarBloques(doc, layoutTexto.bloques, zonaContenido, { align: "center" });
    } else {
      dibujarTextoBasico(doc, bloques, zonaContenido);
    }

    dibujarFirma(doc, config, zonaFirma);
  }

  function dibujarTextoBasico(doc, bloques, zona) {
    let y = zona.y;

    bloques.forEach(function (bloque) {
      const color = bloque.color || [20, 20, 20];
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont(bloque.font || "times", bloque.style || "normal");
      doc.setFontSize(bloque.size || 10);
      const lineas = doc.splitTextToSize(bloque.texto || "", zona.w);
      lineas.forEach(function (linea, index) {
        doc.text(linea, zona.centroX, y + index * (bloque.lineHeight || 5), { align: "center" });
      });
      y += Math.max(1, lineas.length) * (bloque.lineHeight || 5) + (bloque.gapAfter || 0);
    });
  }

  function dibujarFirma(doc, config, zonaFirma) {
    const centroX = zonaFirma.centroX || (zonaFirma.x + zonaFirma.w / 2);
    const yFirma = zonaFirma.y;
    const anchoLinea = Math.min(78, zonaFirma.w * 0.62);

    doc.setDrawColor(65, 65, 65);
    doc.setLineWidth(0.38);
    doc.line(centroX - anchoLinea / 2, yFirma, centroX + anchoLinea / 2, yFirma);

    doc.setTextColor(10, 10, 10);
    doc.setFont("times", "bold");
    doc.setFontSize(11.4);

    doc.text(config.firmante.nombre, centroX, yFirma + 8.4, {
      align: "center"
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.6);

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

  function calcularTamanoNombre(nombre) {
    const largo = String(nombre || "").length;

    if (largo > 62) return 16.2;
    if (largo > 54) return 17.4;
    if (largo > 46) return 18.6;
    if (largo > 38) return 20;
    if (largo > 30) return 21.2;

    return 22.4;
  }

  function limpiarNombre(valor) {
    if (U && typeof U.limpiarNombrePropio === "function") {
      return U.limpiarNombrePropio(valor);
    }

    return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim();
  }

  window.CertiTemplate = {
    dibujarCertificado
  };
})();