/*
Nombre completo: for.template.annexes.js
Ruta o ubicación: formacion/exportar/for.template.annexes.js
Función o funciones: Renderizar la sección de anexos del expediente con listados descriptivos, referencias y una página específica para los anexos cuando existan
*/

function forEscapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function forRenderNoAnnexes() {
  return `
    <section class="forPrintSection">
      <div class="forPrintSectionHead">
        <span class="forPrintSectionNumber">6</span>
        <h3 class="forPrintSectionTitle">Anexos</h3>
      </div>

      <div class="forPrintEmptyBox">
        No se registran anexos para este expediente.
      </div>
    </section>
  `;
}

function forRenderAnnexRow(item = {}) {
  return `
    <tr>
      <td>${forEscapeHtml(item.orden)}</td>
      <td>${forEscapeHtml(item.tituloVisible || item.title || "")}</td>
      <td>${forEscapeHtml(item.type || "")}</td>
      <td>${forEscapeHtml(item.origin || "")}</td>
      <td>${forEscapeHtml(item.referencia || "")}</td>
    </tr>
  `;
}

export function forRenderAnnexesTemplate(annexes = [], { headerHtml = "" } = {}) {
  const safeAnnexes = Array.isArray(annexes) ? annexes : [];

  return `
    <section class="forPrintPage">
      ${headerHtml}
      <div class="forPrintPageBody">
        ${
          safeAnnexes.length
            ? `
              <section class="forPrintSection">
                <div class="forPrintSectionHead">
                  <span class="forPrintSectionNumber">6</span>
                  <h3 class="forPrintSectionTitle">Anexos</h3>
                </div>

                <table class="forPrintTable">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Título</th>
                      <th>Tipo</th>
                      <th>Origen</th>
                      <th>Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${safeAnnexes.map(forRenderAnnexRow).join("")}
                  </tbody>
                </table>
              </section>
            `
            : forRenderNoAnnexes()
        }
      </div>
    </section>
  `;
}