/*
Nombre completo: for.template.header.js
Ruta o ubicación: formacion/exportar/for.template.header.js
Función o funciones: Renderizar el encabezado institucional repetible del expediente con logo, unidad, título, nombre del docente, código de formato y fecha de generación
*/

function forEscapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function forRenderHeaderTemplate(header = {}) {
  const logoHtml = header.logoUrl
    ? `<img class="forPrintHeaderLogo" src="${forEscapeHtml(header.logoUrl)}" alt="Logo institucional" />`
    : `<div class="forPrintHeaderLogoPlaceholder">ITSQMET</div>`;

  return `
    <header class="forPrintHeader">
      <div class="forPrintHeaderTop">
        <div class="forPrintHeaderBrand">
          ${logoHtml}
          <div>
            <p class="forPrintHeaderUnit">${forEscapeHtml(header.unidad || "Unidad de Gestión de Procesos Académicos")}</p>
            <h2 class="forPrintHeaderTitle">${forEscapeHtml(header.titulo || "Seguimiento a la Formación Docente")}</h2>
          </div>
        </div>

        <div class="forPrintHeaderMeta">
          <div><strong>Docente:</strong> ${forEscapeHtml(header.docente)}</div>
          <div><strong>Código:</strong> ${forEscapeHtml(header.codigoFormato)}</div>
          <div><strong>Fecha:</strong> ${forEscapeHtml(header.fechaGeneracion)}</div>
        </div>
      </div>
    </header>
  `;
}