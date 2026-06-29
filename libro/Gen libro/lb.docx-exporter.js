/* =========================================================
Nombre completo: lb.docx-exporter.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.docx-exporter.js
Función o funciones:
1. Exportar el modelo del libro a Word.
2. Usar API nativa de Electron cuando exista.
3. Crear descarga compatible con Word desde navegador como respaldo.
4. Guardar información básica de exportación para la base local.
========================================================= */

(function attachLbDocxExporter(window, document) {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function escapeHtml(value) {
    return text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
  }

  function hasElectronWordApi() {
    return Boolean(window.api && window.api.word && typeof window.api.word.exportDocx === "function");
  }

  function nodeToHtml(node) {
    if (!node) return "";

    if (node.type === "toc") {
      return "<p><strong>Tabla de contenidos automática:</strong> actualizar en Word desde Referencias &gt; Actualizar tabla.</p>" +
        "<pre>" + escapeHtml((node.entries || []).map(function mapEntry(entry) {
          return (entry.level === 1 ? "" : "  ".repeat(entry.level - 1)) + entry.title;
        }).join("\n")) + "</pre>";
    }

    if (node.type === "table") {
      var header = (node.columns || []).map(function mapColumn(column) {
        return "<th>" + escapeHtml(column) + "</th>";
      }).join("");
      var rows = (node.rows || []).map(function mapRow(row) {
        return "<tr>" + row.map(function mapCell(cell) { return "<td>" + escapeHtml(cell) + "</td>"; }).join("") + "</tr>";
      }).join("");
      return "<p><strong>" + escapeHtml(node.title) + "</strong></p><table><thead><tr>" + header + "</tr></thead><tbody>" + rows + "</tbody></table>";
    }

    var tag = node.style === "heading1" ? "h1" : node.style === "heading2" ? "h2" : node.style === "heading3" ? "h3" : "p";
    return "<" + tag + ">" + escapeHtml(node.content) + "</" + tag + ">";
  }

  function buildWordHtml(model) {
    var css = [
      "body{font-family:Candara,Arial,sans-serif;font-size:14pt;line-height:1.15;}",
      "h1{font-size:16pt;font-weight:bold;page-break-before:auto;}",
      "h2{font-size:15pt;font-weight:bold;}",
      "h3{font-size:14pt;font-weight:bold;}",
      "p{text-align:justify;margin:0 0 8pt 0;}",
      "table{border-collapse:collapse;width:100%;margin:8pt 0;}",
      "th,td{border:1px solid #333;padding:5pt;font-family:Candara,Arial,sans-serif;font-size:14pt;}",
      "th{font-weight:bold;}"
    ].join("\n");

    return "<!doctype html><html><head><meta charset='utf-8'><style>" + css + "</style></head><body>" +
      (model.nodes || []).map(nodeToHtml).join("\n") +
      "</body></html>";
  }

  function downloadBlob(blob, fileName) {
    var url = window.URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  async function exportWithElectron(model) {
    return window.api.word.exportDocx({ model: model });
  }

  async function exportWithBrowserFallback(model) {
    var html = buildWordHtml(model);
    var fileName = (model.fileName || "libro-asignatura.docx").replace(/\.docx$/i, ".doc");
    var blob = new Blob([html], { type: "application/msword;charset=utf-8" });

    downloadBlob(blob, fileName);

    return {
      ok: true,
      mode: "browser_word_html_fallback",
      fileName: fileName,
      warning: "Se generó un archivo Word compatible en HTML. Para DOCX nativo se requiere window.api.word.exportDocx en Electron."
    };
  }

  async function exportDocx(model) {
    if (!model) {
      return { ok: false, error: "No existe modelo Word para exportar." };
    }

    if (hasElectronWordApi()) {
      try {
        var result = await exportWithElectron(model);
        return Object.assign({ ok: true, mode: "electron_docx" }, result || {});
      } catch (error) {
        return {
          ok: false,
          mode: "electron_docx",
          error: error && error.message ? error.message : String(error)
        };
      }
    }

    return exportWithBrowserFallback(model);
  }

  window.LibroGenLibroDocxExporter = {
    exportDocx: exportDocx,
    buildWordHtml: buildWordHtml,
    hasElectronWordApi: hasElectronWordApi
  };
})(window, document);
