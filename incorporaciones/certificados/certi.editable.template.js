/* =========================================================
Nombre completo: certi.editable.template.js
Ruta o ubicación: /incorporaciones/certificados/certi.editable.template.js
Función o funciones:
- Dibujar certificados editables sobre la plantilla institucional.
- Ordenar título, introducción, beneficiario, texto principal, destacado, complemento y cierre.
- Ajustar tamaño, interlineado y espacios mediante CertiTemplateSmart.
- Distribuir automáticamente cero, una, dos o tres firmas.
Con qué se une:
- certi.editable.logic.js
- certi.template.smart.js
- certi.config.js
========================================================= */
(function () {
  "use strict";

  async function dibujarCertificado(doc, certificado, opciones) {
    const config = window.CertiConfig || {};
    const pdfConfig = config.pdf || {};
    const ancho = numero(pdfConfig.ancho, 297);
    const alto = numero(pdfConfig.alto, 210);
    const plantilla = opciones && opciones.plantillaDataUrl ? opciones.plantillaDataUrl : "";
    const layout = await obtenerLayout(plantilla, ancho, alto);

    dibujarFondo(doc, plantilla, ancho, alto);
    dibujarContenido(doc, certificado || {}, ancho, layout);
    dibujarFirmas(doc, certificado && certificado.firmantes, ancho, layout);
  }

  async function obtenerLayout(plantilla, ancho, alto) {
    if (window.CertiTemplateSmart && typeof window.CertiTemplateSmart.analizarPlantilla === "function") {
      return window.CertiTemplateSmart.analizarPlantilla("reconocimiento", plantilla, ancho, alto);
    }

    return {
      zonas: {
        contenido: { x: 28, y: 48, w: 241, h: 112, centroX: ancho / 2 },
        firma: { x: 28, y: 169, w: 241, h: 28, centroX: ancho / 2 }
      }
    };
  }

  function dibujarFondo(doc, plantilla, ancho, alto) {
    if (plantilla) {
      try {
        doc.addImage(plantilla, "PNG", 0, 0, ancho, alto);
        return;
      } catch (error) {
        console.warn("[CertiEditableTemplate] No se pudo colocar la plantilla:", error);
      }
    }

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, ancho, alto, "F");
    doc.setDrawColor(13, 71, 161);
    doc.setLineWidth(1.4);
    doc.rect(10, 10, ancho - 20, alto - 20);
    doc.setDrawColor(196, 155, 57);
    doc.setLineWidth(0.55);
    doc.rect(16, 16, ancho - 32, alto - 32);
  }

  function dibujarContenido(doc, certificado, ancho, layout) {
    const zonaBase = layout && layout.zonas && layout.zonas.contenido
      ? layout.zonas.contenido
      : { x: 28, y: 48, w: 241, h: 112, centroX: ancho / 2 };
    const zona = {
      x: numero(zonaBase.x, 28),
      y: Math.min(numero(zonaBase.y, 48), 52),
      w: numero(zonaBase.w, 241),
      h: Math.max(numero(zonaBase.h, 105), 105),
      centroX: numero(zonaBase.centroX, ancho / 2)
    };

    const nombre = limpiar(certificado.beneficiario || certificado.nombre).toUpperCase();
    const bloques = [];

    agregarBloque(bloques, certificado.titulo, {
      font: "times", style: "bold", size: 15.2, minSize: 10.4,
      lineHeight: 6.2, minLineHeight: 4.2, color: [6, 25, 65], gapAfter: 4.8, minGapAfter: 1.5
    });

    agregarBloque(bloques, certificado.introduccion, {
      font: "times", style: "normal", size: 11.2, minSize: 8.6,
      lineHeight: 4.9, minLineHeight: 3.4, color: [25, 25, 25], gapAfter: 4.5, minGapAfter: 1.2
    });

    agregarBloque(bloques, nombre, {
      font: "times", style: "bold", size: calcularTamanoNombre(nombre), minSize: 12.6,
      lineHeight: 6.7, minLineHeight: 4.5, color: [6, 25, 65], gapAfter: 8, minGapAfter: 3.2,
      lineAfter: {
        width: Math.min(184, zona.w * 0.76), offset: 4.1, color: [7, 29, 76], lineWidth: 0.45,
        secondary: { width: Math.min(124, zona.w * 0.51), offset: 5.5, color: [196, 155, 57], lineWidth: 0.18 }
      }
    });

    agregarBloque(bloques, certificado.textoPrincipal, {
      font: "helvetica", style: "normal", size: 10.6, minSize: 8,
      lineHeight: 4.8, minLineHeight: 3.25, color: [20, 20, 20], gapAfter: 4.2, minGapAfter: 1
    });

    agregarBloque(bloques, certificado.destacado, {
      font: "times", style: "bold", size: 11.8, minSize: 8.4,
      lineHeight: 5.2, minLineHeight: 3.4, color: [6, 25, 65], gapAfter: 4.2, minGapAfter: 1
    });

    agregarBloque(bloques, certificado.complemento, {
      font: "helvetica", style: "normal", size: 10.1, minSize: 7.8,
      lineHeight: 4.5, minLineHeight: 3.1, color: [25, 25, 25], gapAfter: 4, minGapAfter: 0.9
    });

    agregarBloque(bloques, certificado.cierre, {
      font: "helvetica", style: "normal", size: 10.1, minSize: 7.8,
      lineHeight: 4.5, minLineHeight: 3.1, color: [35, 35, 35], gapAfter: 4.2, minGapAfter: 0.9
    });

    const ciudad = limpiar(certificado.ciudad).replace(/[.]$/, "");
    const fecha = limpiar(certificado.fecha).replace(/[.]$/, "");
    const lugarFecha = [ciudad, fecha].filter(Boolean).join(", ");
    agregarBloque(bloques, lugarFecha ? `${lugarFecha}.` : "", {
      font: "times", style: "normal", size: 10.6, minSize: 8,
      lineHeight: 4.3, minLineHeight: 3.1, color: [100, 100, 100], gapAfter: 0, minGapAfter: 0
    });

    if (window.CertiTemplateSmart && typeof window.CertiTemplateSmart.prepararBloques === "function") {
      const preparado = window.CertiTemplateSmart.prepararBloques(doc, bloques, zona.w, zona.h);
      window.CertiTemplateSmart.dibujarBloques(doc, preparado.bloques, zona, { align: "center" });
      return;
    }

    dibujarBasico(doc, bloques, zona);
  }

  function agregarBloque(lista, texto, formato) {
    const limpio = limpiarMultilinea(texto);
    if (!limpio) return;
    lista.push(Object.assign({ texto: limpio }, formato || {}));
  }

  function dibujarBasico(doc, bloques, zona) {
    let y = zona.y;
    (bloques || []).forEach(function (bloque) {
      const color = bloque.color || [20, 20, 20];
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont(bloque.font || "times", bloque.style || "normal");
      doc.setFontSize(numero(bloque.size, 10));
      const lineas = doc.splitTextToSize(bloque.texto || "", zona.w);
      lineas.forEach(function (linea, index) {
        doc.text(String(linea || ""), zona.centroX, y + index * numero(bloque.lineHeight, 4.8), { align: "center" });
      });
      y += Math.max(1, lineas.length) * numero(bloque.lineHeight, 4.8) + numero(bloque.gapAfter, 0);
    });
  }

  function dibujarFirmas(doc, firmantesEntrada, ancho, layout) {
    const firmantes = (Array.isArray(firmantesEntrada) ? firmantesEntrada : [])
      .slice(0, 3)
      .filter(function (item) { return limpiar(item && item.nombre) || limpiar(item && item.cargo); });

    if (!firmantes.length) return;

    const zonaFirma = layout && layout.zonas && layout.zonas.firma
      ? layout.zonas.firma
      : { x: 28, y: 169, w: 241, h: 28, centroX: ancho / 2 };
    const y = numero(zonaFirma.y, 169);
    const posiciones = obtenerPosiciones(firmantes.length, ancho, zonaFirma);

    firmantes.forEach(function (firmante, index) {
      const x = posiciones[index];
      const nombre = limpiar(firmante.nombre);
      const cargo = limpiar(firmante.cargo).toUpperCase();
      const anchoLinea = firmantes.length === 1 ? 78 : 58;
      const anchoTexto = firmantes.length === 1 ? 92 : 66;

      doc.setDrawColor(65, 65, 65);
      doc.setLineWidth(0.36);
      doc.line(x - anchoLinea / 2, y, x + anchoLinea / 2, y);

      doc.setTextColor(10, 10, 10);
      doc.setFont("times", "bold");
      doc.setFontSize(nombre.length > 34 ? 8.5 : 10.2);
      escribirCentrado(doc, nombre, x, y + 6.7, anchoTexto, 3.2);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(cargo.length > 30 ? 5.7 : 6.6);
      escribirCentrado(doc, cargo, x, y + 12.3, anchoTexto, 3);
    });
  }

  function obtenerPosiciones(cantidad, ancho, zona) {
    const x = numero(zona.x, 28);
    const w = numero(zona.w, ancho - 56);
    if (cantidad === 1) return [numero(zona.centroX, ancho / 2)];
    if (cantidad === 2) return [x + w * 0.28, x + w * 0.72];
    return [x + w * 0.17, x + w * 0.5, x + w * 0.83];
  }

  function escribirCentrado(doc, texto, x, y, anchoMaximo, salto) {
    if (!texto) return;
    const lineas = doc.splitTextToSize(texto, anchoMaximo);
    lineas.slice(0, 2).forEach(function (linea, index) {
      doc.text(String(linea || ""), x, y + index * salto, { align: "center" });
    });
  }

  function calcularTamanoNombre(nombre) {
    const largo = limpiar(nombre).length;
    if (largo > 62) return 15;
    if (largo > 52) return 16.4;
    if (largo > 42) return 18;
    if (largo > 32) return 19.8;
    return 21.4;
  }

  function limpiar(valor) {
    return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim();
  }

  function limpiarMultilinea(valor) {
    return String(valor == null ? "" : valor)
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map(limpiar)
      .filter(Boolean)
      .join("\n");
  }

  function numero(valor, defecto) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : defecto;
  }

  window.CertiEditableTemplate = { dibujarCertificado };
})();
