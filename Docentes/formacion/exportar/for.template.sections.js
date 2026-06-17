/*
Nombre completo: for.template.sections.js
Ruta o ubicación: formacion/exportar/for.template.sections.js
Función o funciones: Renderizar las secciones principales del expediente de formación docente mediante tablas de contenido con título, etiquetas y valores organizados para impresión
*/

function forEscapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function forRenderSectionRows(rows = []) {
  return rows.map(row => `
    <tr>
      <th class="forPrintTableKey">${forEscapeHtml(row.key)}</th>
      <td class="forPrintTableValue">${forEscapeHtml(row.value)}</td>
    </tr>
  `).join("");
}

function forRenderSection(section = {}) {
  return `
    <section class="forPrintSection">
      <div class="forPrintSectionHead">
        <span class="forPrintSectionNumber">${forEscapeHtml(section.numero)}</span>
        <h3 class="forPrintSectionTitle">${forEscapeHtml(section.titulo)}</h3>
      </div>

      <table class="forPrintTable">
        <tbody>
          ${forRenderSectionRows(section.rows ?? [])}
        </tbody>
      </table>
    </section>
  `;
}

export function forRenderSectionsTemplate(sections = [], { headerHtml = "" } = {}) {
  const safeSections = Array.isArray(sections) ? sections : [];

  return `
    <section class="forPrintPage">
      ${headerHtml}
      <div class="forPrintPageBody">
        ${safeSections.map(forRenderSection).join("")}
      </div>
    </section>
  `;
}