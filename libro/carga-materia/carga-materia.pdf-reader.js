/* =========================================================
Nombre completo: carga-materia.pdf-reader.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.pdf-reader.js
Función o funciones:
1. Leer texto de archivos PDF usados como Archivo 1.
2. Cargar PDF.js desde copia local o CDN cuando sea necesario.
3. Extraer texto por página y construir un resumen técnico.
4. Entregar una estructura compatible con el mapeador base.
========================================================= */

(function attachCargaMateriaPdfReader(window, document) {
  "use strict";

  var PDFJS_URLS = [
    "./vendor/pdf.min.js",
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs",
    "https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.min.mjs"
  ];

  var WORKER_URLS = [
    "./vendor/pdf.worker.min.js",
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs",
    "https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs"
  ];

  var loadingPromise = null;

  function getExtension(file) {
    var name = file && file.name ? String(file.name) : "";
    var parts = name.split(".");

    if (parts.length < 2) return "";

    return parts.pop().toLowerCase();
  }

  function isPdf(file) {
    return getExtension(file) === "pdf";
  }

  function readAsArrayBuffer(file) {
    return new Promise(function readPromise(resolve, reject) {
      var reader = new FileReader();

      reader.onload = function onLoad(event) {
        resolve(event.target.result);
      };

      reader.onerror = function onError() {
        reject(new Error("No se pudo leer el PDF: " + (file ? file.name : "sin nombre")));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  function loadModuleScript(src) {
    return new Promise(function promiseLoad(resolve, reject) {
      var script = document.createElement("script");

      script.type = src.indexOf(".mjs") >= 0 ? "module" : "text/javascript";
      script.src = src;
      script.async = false;
      script.onload = function onLoad() {
        resolve(true);
      };
      script.onerror = function onError() {
        reject(new Error("No se pudo cargar " + src));
      };

      document.head.appendChild(script);
    });
  }

  async function ensurePdfJs() {
    if (window.pdfjsLib) return true;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async function tryLoad() {
      var errors = [];

      for (var i = 0; i < PDFJS_URLS.length; i += 1) {
        try {
          await loadModuleScript(PDFJS_URLS[i]);

          if (window.pdfjsLib) {
            try {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URLS[Math.min(i, WORKER_URLS.length - 1)];
            } catch (_error) {
              // Si el worker no se puede configurar, PDF.js intentará su modo por defecto.
            }

            return true;
          }
        } catch (error) {
          errors.push(error.message || String(error));
        }
      }

      throw new Error(
        "PDF.js no está disponible. Revisa internet o agrega vendor/pdf.min.js. Detalle: " +
        errors.join(" | ")
      );
    })();

    return loadingPromise;
  }

  function normalizePageText(items) {
    var lastY = null;
    var parts = [];

    (items || []).forEach(function eachItem(item) {
      var value = String(item && item.str ? item.str : "").trim();
      var transform = item && item.transform ? item.transform : [];
      var y = transform.length >= 6 ? Math.round(transform[5]) : null;

      if (!value) return;

      if (lastY !== null && y !== null && Math.abs(lastY - y) > 4) {
        parts.push("\n");
      }

      parts.push(value);
      parts.push(" ");
      lastY = y;
    });

    return parts.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  async function readPdfFile(file, kind) {
    if (!file) {
      throw new Error("No se recibió archivo PDF.");
    }

    if (!isPdf(file)) {
      throw new Error("El archivo " + file.name + " no es PDF.");
    }

    await ensurePdfJs();

    var buffer = await readAsArrayBuffer(file);
    var typed = new Uint8Array(buffer);
    var pdf = await window.pdfjsLib.getDocument({ data: typed }).promise;
    var pages = [];

    for (var pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      var page = await pdf.getPage(pageNumber);
      var textContent = await page.getTextContent();
      var text = normalizePageText(textContent.items || []);

      pages.push({
        pagina: pageNumber,
        texto: text,
        caracteres: text.length
      });
    }

    var fullText = pages.map(function mapPage(page) {
      return page.texto;
    }).join("\n\n").trim();

    return {
      ok: true,
      tipo: "pdf",
      kind: kind || "base",
      archivo: {
        nombre: file.name,
        extension: getExtension(file),
        tamanoBytes: file.size || 0,
        ultimaModificacion: file.lastModified ? new Date(file.lastModified).toISOString() : null
      },
      totalPaginas: pdf.numPages,
      caracteresTexto: fullText.length,
      textoCompleto: fullText,
      paginas: pages,
      vistaPrevia: fullText.slice(0, 5000)
    };
  }

  window.LibroCargaMateriaPdfReader = {
    isPdf: isPdf,
    readPdfFile: readPdfFile,
    ensurePdfJs: ensurePdfJs
  };
})(window, document);
