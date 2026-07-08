/*
=========================================================
Nombre completo: certi.capacitacion.template.js
Ruta o ubicación: /incorporaciones/certificados/certi.capacitacion.template.js
Función o funciones:
- Dibujar el certificado de capacitación docente en PDF.
- Usar plantilla de fondo específica para capacitación.
- Escribir dentro de zonas seguras y ajustar texto automáticamente.
- Usar texto institucional formal.
- Dibujar tres firmas: Rector, Gestor de Procesos Académicos y Capacitador.
- Evitar que el texto se cruce con firmas, logos o bordes de la plantilla.
Con qué se une:
- certi.template.smart.js
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
    const plantilla = opciones && opciones.plantillaDataUrl;

    dibujarFondo(doc, plantilla, ancho, alto);
    dibujarContenido(doc, certificado, config, ancho, alto);
    dibujarFirmas(doc, obtenerFirmantes(certificado), ancho, alto);
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

  function dibujarContenido(doc, certificado, config, ancho, alto) {
    const Smart = window.CertiTemplateSmart;
    const nombre = limpiarNombre(certificado.nombre || certificado.docente).toUpperCase();
    const curso = limpiarTexto(certificado.curso || certificado.tema).toUpperCase();
    const nota = formatearNota(certificado.nota || certificado.promedio);
    const horas = limpiarTexto(certificado.horas || "40");
    const periodo = normalizarPeriodo(certificado.periodo || "");
    const ciudad = config.ciudad || "Quito";
    const fechaFormal = formatearFechaFormal(certificado.fechaInput, certificado.fecha);

    const zonaContenido = Smart && typeof Smart.obtenerZona === "function"
      ? Smart.obtenerZona("capacitacion", "contenido", ancho, alto)
      : { x: 30, y: 54, w: 237, h: 104, centroX: ancho / 2 };

    const textoPeriodo =
      `desarrollado durante el período ${periodo}, con una duración total de ${horas} horas académicas, ` +
      `obteniendo una calificación final de ${nota}/10.`;

    const textoConstancia =
      "El presente certificado se confiere como constancia formal del cumplimiento de los requisitos académicos establecidos por la institución.";

    const bloques = [
      {
        texto: "El Instituto Superior Tecnológico Quito Metropolitano certifica que:",
        font: "times",
        style: "normal",
        size: 11.6,
        minSize: 9.1,
        lineHeight: 5,
        minLineHeight: 3.8,
        color: [20, 20, 20],
        gapAfter: 4.6,
        minGapAfter: 1.4
      },
      {
        texto: nombre,
        font: "times",
        style: "bold",
        size: calcularTamanoNombre(nombre),
        minSize: 12.6,
        lineHeight: 6.4,
        minLineHeight: 4.7,
        color: [6, 25, 65],
        gapAfter: 8.5,
        minGapAfter: 4,
        lineAfter: {
          width: 176,
          offset: 4.1,
          color: [7, 29, 76],
          lineWidth: 0.45,
          secondary: {
            width: 116,
            offset: 5.5,
            color: [196, 155, 57],
            lineWidth: 0.18
          }
        }
      },
      {
        texto: "participó y aprobó satisfactoriamente el programa de capacitación denominado:",
        font: "times",
        style: "normal",
        size: 10.9,
        minSize: 8.6,
        lineHeight: 4.8,
        minLineHeight: 3.5,
        color: [20, 20, 20],
        gapAfter: 4.6,
        minGapAfter: 1.4
      },
      {
        texto: curso,
        font: "times",
        style: "bold",
        size: calcularTamanoCurso(curso),
        minSize: 8.6,
        lineHeight: 5.4,
        minLineHeight: 3.5,
        color: [6, 25, 65],
        gapAfter: 4.8,
        minGapAfter: 1.2
      },
      {
        texto: textoPeriodo,
        font: "times",
        style: "normal",
        size: 10.2,
        minSize: 8.2,
        lineHeight: 4.6,
        minLineHeight: 3.4,
        color: [20, 20, 20],
        gapAfter: 4.2,
        minGapAfter: 1.2
      },
      {
        texto: textoConstancia,
        font: "times",
        style: "normal",
        size: 10.1,
        minSize: 8,
        lineHeight: 4.5,
        minLineHeight: 3.3,
        color: [20, 20, 20],
        gapAfter: 4.2,
        minGapAfter: 1.1
      },
      {
        texto: `Dado y firmado en la ciudad de ${ciudad}, a los ${fechaFormal}.`,
        font: "times",
        style: "normal",
        size: 10.1,
        minSize: 8,
        lineHeight: 4.3,
        minLineHeight: 3.2,
        color: [80, 80, 80],
        gapAfter: 0
      }
    ];

    if (Smart && typeof Smart.prepararBloques === "function") {
      const layout = Smart.prepararBloques(doc, bloques, zonaContenido.w, zonaContenido.h);
      Smart.dibujarBloques(doc, layout.bloques, zonaContenido, { align: "center" });
      return;
    }

    dibujarContenidoBasico(doc, bloques, zonaContenido);
  }

  function dibujarContenidoBasico(doc, bloques, zona) {
    let y = zona.y;

    bloques.forEach(function (bloque) {
      const color = bloque.color || [20, 20, 20];
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont(bloque.font || "times", bloque.style || "normal");
      doc.setFontSize(bloque.size || 10);

      const lineas = doc.splitTextToSize(bloque.texto || "", zona.w);
      lineas.forEach(function (linea, index) {
        doc.text(linea, zona.centroX, y + index * (bloque.lineHeight || 4.8), { align: "center" });
      });

      y += Math.max(1, lineas.length) * (bloque.lineHeight || 4.8) + (bloque.gapAfter || 0);
    });
  }

  function dibujarFirmas(doc, firmantes, ancho, alto) {
    const Smart = window.CertiTemplateSmart;
    const zonaFirmas = Smart && typeof Smart.obtenerZona === "function"
      ? Smart.obtenerZona("capacitacion", "firmas", ancho, alto)
      : { x: 14, y: 175, w: ancho - 28, h: 27 };

    const y = zonaFirmas.y;
    const posiciones = [zonaFirmas.x + zonaFirmas.w * 0.16, zonaFirmas.x + zonaFirmas.w * 0.50, zonaFirmas.x + zonaFirmas.w * 0.84];

    (firmantes || []).slice(0, 3).forEach(function (firmante, index) {
      const x = posiciones[index] || ancho / 2;
      const nombre = limpiarTexto(firmante.nombre || "");
      const cargo = limpiarTexto(firmante.cargo || "");
      const nombreVisible = debeOcultarNombrePlaceholder(nombre, cargo) ? "" : nombre;

      dibujarLinea(doc, x - 34, y, x + 34, y, 65, 65, 65, 0.38);

      doc.setTextColor(10, 10, 10);
      doc.setFont("times", "bold");
      doc.setFontSize(calcularTamanoFirma(nombreVisible));

      if (nombreVisible) {
        escribirCentrado(doc, nombreVisible, x, y + 7, 68, 3.6);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.6);
      escribirCentrado(doc, cargo, x, y + 13.5, 70, 3.4);
    });
  }

  function obtenerFirmantes(certificado) {
    const capacitador = limpiarNombre(
      certificado.capacitador || certificado.instructor || certificado.facilitador || ""
    );

    if (capacitador && window.CertiFirmantes && typeof window.CertiFirmantes.obtenerFirmantesCapacitacion === "function") {
      return window.CertiFirmantes.obtenerFirmantesCapacitacion(capacitador);
    }

    if (capacitador) {
      return [
        { nombre: "Dr. León Tito", cargo: "RECTOR" },
        { nombre: "Mgs. Jefferson Villarreal", cargo: "GESTOR DE PROCESOS ACADÉMICOS" },
        { nombre: capacitador, cargo: "CAPACITADOR" }
      ];
    }

    if (certificado.firmantes && Array.isArray(certificado.firmantes) && certificado.firmantes.length) {
      return certificado.firmantes;
    }

    if (window.CertiFirmantes && typeof window.CertiFirmantes.obtenerFirmantesCapacitacion === "function") {
      return window.CertiFirmantes.obtenerFirmantesCapacitacion("");
    }

    return [
      { nombre: "Dr. León Tito", cargo: "RECTOR" },
      { nombre: "Mgs. Jefferson Villarreal", cargo: "GESTOR DE PROCESOS ACADÉMICOS" },
      { nombre: "", cargo: "CAPACITADOR" }
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
    if (largo > 66) return 13.2;
    if (largo > 58) return 14.3;
    if (largo > 50) return 15.4;
    if (largo > 42) return 16.6;
    if (largo > 34) return 17.8;
    if (largo > 28) return 19;
    return 20.2;
  }

  function calcularTamanoCurso(curso) {
    const largo = String(curso || "").length;
    if (largo > 110) return 9.8;
    if (largo > 96) return 10.8;
    if (largo > 84) return 11.5;
    if (largo > 72) return 12.3;
    if (largo > 58) return 13.1;
    if (largo > 44) return 14;
    return 15;
  }

  function calcularTamanoFirma(nombre) {
    const largo = String(nombre || "").length;
    if (!largo) return 8;
    if (largo > 42) return 6.8;
    if (largo > 34) return 7.2;
    if (largo > 28) return 7.8;
    return 8.4;
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