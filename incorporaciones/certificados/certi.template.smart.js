/*
=========================================================
Nombre completo: certi.template.smart.js
Ruta o ubicación: /incorporaciones/certificados/certi.template.smart.js
Función o funciones:
- Crear un motor común para escribir sobre plantillas de certificados.
- Trabajar con zonas seguras de texto para evitar cruces con firmas, logos o bordes.
- Ajustar automáticamente tamaño de letra, interlineado y separación entre bloques.
- Reservar una zona inferior segura para que las firmas no toquen el borde dorado de la plantilla.
- Permitir que una plantilla nueva pueda definir sus propias zonas desde CertiConfig.zonasTexto.
Con qué se une:
- certi.template.js
- certi.capacitacion.template.js
- certi.config.js
- certi.utils.js
=========================================================
*/

(function () {
  "use strict";

  const ZONAS_DEFECTO = {
    reconocimiento: {
      contenido: { x: 28, y: 54, w: 241, h: 105 },
      firma: { x: 86, y: 169, w: 125, h: 28 }
    },
    capacitacion: {
      contenido: { x: 30, y: 54, w: 237, h: 96 },
      firmas: { x: 22, y: 162, w: 253, h: 34 }
    }
  };

  function obtenerZona(tipo, nombre, ancho, alto) {
    const config = window.CertiConfig || {};
    const zonasConfig = config.zonasTexto || {};
    const zonaUsuario = zonasConfig[tipo] && zonasConfig[tipo][nombre]
      ? zonasConfig[tipo][nombre]
      : null;

    const zonaBase = zonaUsuario || (ZONAS_DEFECTO[tipo] && ZONAS_DEFECTO[tipo][nombre]) || {
      x: ancho * 0.1,
      y: alto * 0.25,
      w: ancho * 0.8,
      h: alto * 0.48
    };

    return normalizarZona(zonaBase, ancho, alto);
  }

  function normalizarZona(zona, ancho, alto) {
    const z = zona || {};
    const salida = {
      x: numero(z.x, ancho * 0.1),
      y: numero(z.y, alto * 0.25),
      w: numero(z.w, ancho * 0.8),
      h: numero(z.h, alto * 0.48)
    };

    salida.x = limitar(salida.x, 0, ancho);
    salida.y = limitar(salida.y, 0, alto);
    salida.w = limitar(salida.w, 10, ancho - salida.x);
    salida.h = limitar(salida.h, 10, alto - salida.y);
    salida.centroX = salida.x + salida.w / 2;
    salida.finY = salida.y + salida.h;

    return salida;
  }

  function prepararBloques(doc, bloquesEntrada, anchoMaximo, altoMaximo) {
    let bloques = clonarBloques(bloquesEntrada);
    let layout = medirBloques(doc, bloques, anchoMaximo);

    for (let intento = 0; intento < 24 && layout.altoTotal > altoMaximo; intento += 1) {
      const exceso = layout.altoTotal / altoMaximo;
      const factorTamano = exceso > 1.18 ? 0.92 : 0.96;
      const factorLinea = exceso > 1.18 ? 0.94 : 0.97;

      bloques = bloques.map(function (bloque) {
        const minSize = numero(bloque.minSize, 7.4);
        const minLineHeight = numero(bloque.minLineHeight, 3.4);
        const minGap = numero(bloque.minGapAfter, 1.4);

        return Object.assign({}, bloque, {
          size: Math.max(minSize, numero(bloque.size, 10) * factorTamano),
          lineHeight: Math.max(minLineHeight, numero(bloque.lineHeight, 4.8) * factorLinea),
          gapAfter: Math.max(minGap, numero(bloque.gapAfter, 3) * 0.9)
        });
      });

      layout = medirBloques(doc, bloques, anchoMaximo);
    }

    return layout;
  }

  function medirBloques(doc, bloques, anchoMaximo) {
    let altoTotal = 0;

    const medidos = (bloques || []).map(function (bloque) {
      const seguro = Object.assign({}, bloque);
      aplicarFormato(doc, seguro);

      const lineas = dividirLineas(doc, seguro.texto, anchoMaximo);
      const lineHeight = numero(seguro.lineHeight, 4.8);
      const gapAfter = numero(seguro.gapAfter, 0);
      const altoBloque = Math.max(lineHeight, lineas.length * lineHeight);

      altoTotal += altoBloque + gapAfter;

      return Object.assign({}, seguro, {
        lineas,
        altoBloque,
        altoConSeparacion: altoBloque + gapAfter
      });
    });

    return {
      bloques: medidos,
      altoTotal
    };
  }

  function dibujarBloques(doc, bloques, zona, opciones) {
    const config = opciones || {};
    const alineacion = config.align || "center";
    let y = zona.y;

    (bloques || []).forEach(function (bloque) {
      const lineas = bloque.lineas || [];
      const lineHeight = numero(bloque.lineHeight, 4.8);
      const gapAfter = numero(bloque.gapAfter, 0);
      const xTexto = alineacion === "left" ? zona.x : zona.centroX;

      aplicarFormato(doc, bloque);

      lineas.forEach(function (linea, index) {
        doc.text(String(linea || ""), xTexto, y + index * lineHeight, {
          align: alineacion
        });
      });

      dibujarLineaPosterior(doc, bloque, zona, y, lineas, lineHeight);
      y += Math.max(lineHeight, lineas.length * lineHeight) + gapAfter;
    });

    return y;
  }

  function escribirCaja(doc, texto, zona, opciones) {
    const config = opciones || {};
    const layout = prepararBloques(doc, [
      {
        texto,
        font: config.font || "times",
        style: config.style || "normal",
        size: config.size || 11,
        minSize: config.minSize || 8,
        lineHeight: config.lineHeight || 4.8,
        minLineHeight: config.minLineHeight || 3.4,
        color: config.color || [20, 20, 20],
        gapAfter: 0
      }
    ], zona.w, zona.h);

    return dibujarBloques(doc, layout.bloques, zona, {
      align: config.align || "center"
    });
  }

  function dibujarLineaPosterior(doc, bloque, zona, y, lineas, lineHeight) {
    const linea = bloque.lineAfter;
    if (!linea) return;

    const ancho = numero(linea.w || linea.width, zona.w * 0.68);
    const offset = numero(linea.offset, 3.8);
    const yLinea = y + Math.max(0, lineas.length - 1) * lineHeight + offset;
    const color = Array.isArray(linea.color) ? linea.color : [7, 29, 76];
    const width = numero(linea.lineWidth, 0.4);

    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(width);
    doc.line(zona.centroX - ancho / 2, yLinea, zona.centroX + ancho / 2, yLinea);

    if (linea.secondary) {
      const segunda = linea.secondary;
      const ancho2 = numero(segunda.w || segunda.width, ancho * 0.65);
      const offset2 = numero(segunda.offset, offset + 1.3);
      const color2 = Array.isArray(segunda.color) ? segunda.color : [196, 155, 57];
      const width2 = numero(segunda.lineWidth, 0.18);

      doc.setDrawColor(color2[0], color2[1], color2[2]);
      doc.setLineWidth(width2);
      doc.line(
        zona.centroX - ancho2 / 2,
        y + Math.max(0, lineas.length - 1) * lineHeight + offset2,
        zona.centroX + ancho2 / 2,
        y + Math.max(0, lineas.length - 1) * lineHeight + offset2
      );
    }
  }

  function aplicarFormato(doc, bloque) {
    const color = Array.isArray(bloque.color) ? bloque.color : [20, 20, 20];
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont(bloque.font || "times", bloque.style || "normal");
    doc.setFontSize(numero(bloque.size, 10));
  }

  function dividirLineas(doc, texto, anchoMaximo) {
    const salida = [];

    String(texto || "")
      .split("\n")
      .forEach(function (bloque) {
        const partes = doc.splitTextToSize(bloque, anchoMaximo);
        partes.forEach(function (parte) {
          salida.push(parte);
        });
      });

    return salida.length ? salida : [""];
  }

  function clonarBloques(bloques) {
    return (bloques || []).map(function (bloque) {
      return Object.assign({}, bloque);
    });
  }

  function numero(valor, defecto) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : defecto;
  }

  function limitar(valor, min, max) {
    return Math.max(min, Math.min(max, valor));
  }

  window.CertiTemplateSmart = {
    obtenerZona,
    prepararBloques,
    medirBloques,
    dibujarBloques,
    escribirCaja
  };
})();