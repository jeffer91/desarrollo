/*
=========================================================
Nombre completo: certi.template.center.fix.js
Ruta o ubicación: /incorporaciones/certificados/certi.template.center.fix.js
Función o funciones:
- Ajustar el motor visual para que el contenido no quede pegado arriba de la zona libre.
- Centrar verticalmente los bloques dentro del espacio disponible detectado en la plantilla.
- Mantener el dibujo de líneas decorativas debajo del nombre.
- Respetar el ajuste automático de tamaño e interlineado ya calculado por certi.template.smart.js.
Con qué se une:
- certi.template.smart.js
- certi.template.js
- certi.capacitacion.template.js
=========================================================
*/

(function () {
  "use strict";

  if (!window.CertiTemplateSmart || !window.CertiTemplateSmart.dibujarBloques) {
    return;
  }

  const Smart = window.CertiTemplateSmart;
  const dibujarOriginal = Smart.dibujarBloques;

  Smart.dibujarBloques = function dibujarBloquesCentrados(doc, bloques, zona, opciones) {
    const config = opciones || {};

    if (config.verticalAlign === "top") {
      return dibujarOriginal.call(Smart, doc, bloques, zona, opciones);
    }

    const lista = Array.isArray(bloques) ? bloques : [];
    const alineacion = config.align || "center";
    const altoBloques = calcularAltoTotal(lista);
    const margenSuperior = Math.max(0, (numero(zona.h, 0) - altoBloques) / 2);
    let y = numero(zona.y, 0) + margenSuperior;

    lista.forEach(function (bloque) {
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
  };

  function calcularAltoTotal(bloques) {
    if (!bloques.length) return 0;

    return bloques.reduce(function (total, bloque, index) {
      const lineas = bloque.lineas || [];
      const lineHeight = numero(bloque.lineHeight, 4.8);
      const gapAfter = index === bloques.length - 1 ? 0 : numero(bloque.gapAfter, 0);
      return total + Math.max(lineHeight, lineas.length * lineHeight) + gapAfter;
    }, 0);
  }

  function aplicarFormato(doc, bloque) {
    const color = Array.isArray(bloque.color) ? bloque.color : [20, 20, 20];
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont(bloque.font || "times", bloque.style || "normal");
    doc.setFontSize(numero(bloque.size, 10));
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
      const secundaria = linea.secondary;
      const ancho2 = numero(secundaria.w || secundaria.width, ancho * 0.65);
      const offset2 = numero(secundaria.offset, offset + 1.3);
      const color2 = Array.isArray(secundaria.color) ? secundaria.color : [196, 155, 57];
      const width2 = numero(secundaria.lineWidth, 0.18);
      const yLinea2 = y + Math.max(0, lineas.length - 1) * lineHeight + offset2;

      doc.setDrawColor(color2[0], color2[1], color2[2]);
      doc.setLineWidth(width2);
      doc.line(zona.centroX - ancho2 / 2, yLinea2, zona.centroX + ancho2 / 2, yLinea2);
    }
  }

  function numero(valor, defecto) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : defecto;
  }
})();