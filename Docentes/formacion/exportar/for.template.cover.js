/*
Nombre completo: for.template.cover.js
Ruta o ubicación: formacion/exportar/for.template.cover.js
Función o funciones: Renderizar la portada del expediente de seguimiento a la formación docente con datos institucionales, nombre del docente, fecha y bloque de firmas
*/

function forEscapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function forRenderCoverTemplate(cover = {}) {
  return `
    <section class="forPrintPage forPrintCover">
      <div class="forPrintCoverInner">
        <p class="forPrintUnit">Unidad de Gestión de Procesos Académicos</p>
        <h1 class="forPrintTitle">Seguimiento a la Formación Docente</h1>

        <div class="forPrintCoverCard">
          <div class="forPrintMetaRow">
            <span class="forPrintMetaLabel">Docente</span>
            <span class="forPrintMetaValue">${forEscapeHtml(cover.docente)}</span>
          </div>

          <div class="forPrintMetaRow">
            <span class="forPrintMetaLabel">Fecha de generación</span>
            <span class="forPrintMetaValue">${forEscapeHtml(cover.fechaGeneracion)}</span>
          </div>
        </div>

        <div class="forPrintSignGrid">
          <div class="forPrintSignBox">
            <div class="forPrintSignLine"></div>
            <p class="forPrintSignName">${forEscapeHtml(cover.elaboradoPor)}</p>
            <p class="forPrintSignRole">${forEscapeHtml(cover.elaboradoCargo)}</p>
            <p class="forPrintSignHint">Elaborado por</p>
          </div>

          <div class="forPrintSignBox">
            <div class="forPrintSignLine"></div>
            <p class="forPrintSignName">${forEscapeHtml(cover.aprobadoPor)}</p>
            <p class="forPrintSignRole">${forEscapeHtml(cover.aprobadoCargo)}</p>
            <p class="forPrintSignHint">Revisado y aprobado por</p>
          </div>
        </div>
      </div>
    </section>
  `;
}