/* =========================================================
Nombre completo: lb.docx-styles.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.docx-styles.js
Función o funciones:
1. Definir estilos institucionales del Word del libro.
2. Mantener fuente Candara tamaño 14 como base.
3. Preparar estilos de títulos compatibles con tabla de contenidos de Word.
========================================================= */

(function attachLbDocxStyles(window) {
  "use strict";

  var BASE = {
    fontFamily: "Candara",
    fontSize: 14,
    lineSpacing: 1.15,
    paragraphSpacingAfter: 8,
    alignment: "justified"
  };

  var STYLES = {
    document: BASE,
    title: {
      fontFamily: "Candara",
      fontSize: 18,
      bold: true,
      style: "Title"
    },
    heading1: {
      fontFamily: "Candara",
      fontSize: 16,
      bold: true,
      style: "Heading1",
      outlineLevel: 0
    },
    heading2: {
      fontFamily: "Candara",
      fontSize: 15,
      bold: true,
      style: "Heading2",
      outlineLevel: 1
    },
    heading3: {
      fontFamily: "Candara",
      fontSize: 14,
      bold: true,
      style: "Heading3",
      outlineLevel: 2
    },
    normal: BASE,
    table: {
      fontFamily: "Candara",
      fontSize: 14,
      borders: true,
      headerBold: true
    },
    caption: {
      fontFamily: "Candara",
      fontSize: 12,
      italic: true,
      alignment: "center"
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getStyles() {
    return clone(STYLES);
  }

  function getBase() {
    return clone(BASE);
  }

  window.LibroGenLibroDocxStyles = {
    getStyles: getStyles,
    getBase: getBase
  };
})(window);
