/* =========================================================
Nombre completo: titulacion-pdf-export-assets.js
Ruta: /Titulacion/frontend/js/exportacion/pdf-export/titulacion-pdf-export-assets.js
Función o funciones:
- Gestionar recursos visuales para PDF.
- Obtener logo institucional desde imagen HTML o dataUrl.
- Validar imágenes en base64.
- Crear marcador visual cuando no exista logo.
========================================================= */

(function (window, document) {
  "use strict";

  function U() {
    return window.TITULACION_PDF_EXPORT_UTILS || {};
  }

  function asText(value) {
    return U().asText ? U().asText(value) : String(value || "").trim();
  }

  function isDataUrl(value) {
    return /^data:image\/(png|jpg|jpeg|webp);base64,/i.test(asText(value));
  }

  function imageElementToDataUrl(img) {
    try {
      if (!img || !img.complete || !img.naturalWidth) {
        return "";
      }

      var canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      return canvas.toDataURL("image/png");
    } catch (error) {
      return "";
    }
  }

  function getLogoFromSelector(selector) {
    var sel = asText(selector || "#logo-institucional");

    var img = document.querySelector(sel);

    if (!img) {
      img = document.querySelector("img[data-titulacion-logo]");
    }

    if (!img) {
      img = document.querySelector("img.logo");
    }

    if (!img) {
      return "";
    }

    if (isDataUrl(img.getAttribute("src"))) {
      return img.getAttribute("src");
    }

    return imageElementToDataUrl(img);
  }

  function getLogoDataUrl(options) {
    var opts = options || {};

    if (isDataUrl(opts.logoDataUrl)) {
      return opts.logoDataUrl;
    }

    return getLogoFromSelector(opts.logoSelector);
  }

  function createLogoBlock(logoDataUrl) {
    if (isDataUrl(logoDataUrl)) {
      return {
        image: logoDataUrl,
        fit: [92, 54],
        alignment: "center",
        margin: [2, 2, 2, 2]
      };
    }

    return {
      text: "LOGO",
      alignment: "center",
      bold: true,
      fontSize: 9,
      color: "#6b7280",
      margin: [2, 18, 2, 2]
    };
  }

  function isImageAnexo(anexo) {
    var item = anexo || {};
    var type = asText(item.type).toLowerCase();
    var name = asText(item.name).toLowerCase();
    var dataUrl = asText(item.dataUrl || item.readableUrl || item.publicUrl);

    return (
      dataUrl &&
      (
        type.indexOf("image/") === 0 ||
        /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(name) ||
        isDataUrl(dataUrl)
      )
    );
  }

  function getImageSource(anexo) {
    var item = anexo || {};
    return asText(item.dataUrl || item.readableUrl || item.publicUrl);
  }

  window.TITULACION_PDF_EXPORT_ASSETS = {
    isDataUrl: isDataUrl,
    imageElementToDataUrl: imageElementToDataUrl,
    getLogoFromSelector: getLogoFromSelector,
    getLogoDataUrl: getLogoDataUrl,
    createLogoBlock: createLogoBlock,
    isImageAnexo: isImageAnexo,
    getImageSource: getImageSource
  };
})(window, document);