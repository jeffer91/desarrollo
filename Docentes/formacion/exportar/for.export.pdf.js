/*
Nombre completo: for.export.pdf.js
Ruta o ubicación: formacion/exportar/for.export.pdf.js
Función o funciones: Construir el HTML imprimible del expediente de formación docente y abrir una ventana de impresión para generar PDF desde el navegador
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

function forBuildTitle(documentData = {}) {
  const docente = documentData?.resumen?.docente || "Docente";
  return `Seguimiento a la Formación Docente - ${docente}`;
}

function forResolvePrintCssHref() {
  return new URL("./for.print.css", import.meta.url).href;
}

export function forBuildPrintableHtml(documentData = {}, options = {}) {
  const title = options.title || forBuildTitle(documentData);
  const cssHref = options.cssHref || forResolvePrintCssHref();

  const headerHtml = forRenderHeaderTemplate(documentData.encabezado ?? {});
  const coverHtml = forRenderCoverTemplate(documentData.portada ?? {});
  const sectionsHtml = forRenderSectionsTemplate(documentData.secciones ?? [], {
    headerHtml
  });
  const annexesHtml = forRenderAnnexesTemplate(documentData.anexos ?? [], {
    headerHtml
  });

  return `
    <!doctype html>
    <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>${forEscapeHtml(title)}</title>
      <link rel="stylesheet" href="${forEscapeHtml(cssHref)}" />
    </head>
    <body class="forPrintBody">
      ${coverHtml}
      ${sectionsHtml}
      ${annexesHtml}
    </body>
    </html>
  `;
}

export async function forExportPdf(documentData = {}, options = {}) {
  const html = forBuildPrintableHtml(documentData, options);
  const popup = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");

  if (!popup) {
    throw new Error("El navegador bloqueó la ventana de impresión para exportar PDF.");
  }

  popup.document.open();
  popup.document.write(html);
  popup.document.close();

  await new Promise(resolve => {
    popup.addEventListener("load", () => resolve(), { once: true });
    window.setTimeout(resolve, 500);
  });

  popup.focus();

  if (options.autoPrint !== false) {
    popup.print();
  }

  return {
    ok: true,
    message: "Vista imprimible generada correctamente."
  };
}