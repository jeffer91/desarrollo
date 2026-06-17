/*
Nombre completo: for.export.word.js
Ruta o ubicación: formacion/exportar/for.export.word.js
Función o funciones: Generar un archivo Word descargable a partir del expediente de formación docente usando HTML compatible con Word y estilos de impresión embebidos
*/

import { forRenderCoverTemplate } from "./for.template.cover.js";
import { forRenderHeaderTemplate } from "./for.template.header.js";
import { forRenderSectionsTemplate } from "./for.template.sections.js";
import { forRenderAnnexesTemplate } from "./for.template.annexes.js";

function forEscapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function forReadPrintCssText() {
  const cssUrl = new URL("./for.print.css", import.meta.url).href;

  try {
    const response = await fetch(cssUrl);
    if (!response.ok) throw new Error("No se pudo leer el CSS de impresión.");
    return await response.text();
  } catch {
    return `
      body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#111;}
      .forPrintPage{page-break-after:always;padding:24px;}
      .forPrintTitle{font-size:18pt;font-weight:700;margin-bottom:12px;}
      .forPrintTable{width:100%;border-collapse:collapse;}
      .forPrintTable td,.forPrintTable th{border:1px solid #bbb;padding:8px;vertical-align:top;}
    `;
  }
}

function forBuildWordFilename(documentData = {}) {
  const docente = String(documentData?.resumen?.docente ?? "docente")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\wáéíóúÁÉÍÓÚñÑ-]/g, "");
  return `seguimiento_formacion_${docente || "docente"}.doc`;
}

export async function forBuildWordHtml(documentData = {}, options = {}) {
  const cssText = await forReadPrintCssText();
  const headerHtml = forRenderHeaderTemplate(documentData.encabezado ?? {});
  const coverHtml = forRenderCoverTemplate(documentData.portada ?? {});
  const sectionsHtml = forRenderSectionsTemplate(documentData.secciones ?? [], {
    headerHtml
  });
  const annexesHtml = forRenderAnnexesTemplate(documentData.anexos ?? [], {
    headerHtml
  });

  const title = options.title || "Seguimiento a la Formación Docente";

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>${forEscapeHtml(title)}</title>
        <style>
          ${cssText}
        </style>
      </head>
      <body class="forPrintBody">
        ${coverHtml}
        ${sectionsHtml}
        ${annexesHtml}
      </body>
    </html>
  `;
}

export async function forExportWord(documentData = {}, options = {}) {
  const html = await forBuildWordHtml(documentData, options);
  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = options.filename || forBuildWordFilename(documentData);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1500);

  return {
    ok: true,
    message: "Documento Word generado correctamente."
  };
}