/*
Nombre completo: for.export.menu.js
Ruta o ubicación: formacion/frontend/for.export.menu.js
Función o funciones: Administrar un menú flotante de exportación por registro, con acciones para PDF y Word, cierre por clic externo y posicionamiento respecto al botón activador
*/

function forEscapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function forCreateExportMenu({
  rootId = "forExportMenuRoot",
  onPdf = async () => {},
  onWord = async () => {}
} = {}) {
  const root = document.getElementById(rootId);

  if (!root) {
    throw new Error("No existe el contenedor base del menú de exportación.");
  }

  let activeRecordId = null;
  let isOpen = false;

  function forRender() {
    root.innerHTML = `
      <div class="forExportMenu isHidden" data-role="for-export-menu">
        <button type="button" class="forExportMenuItem" data-action="pdf">
          Exportar PDF
        </button>
        <button type="button" class="forExportMenuItem" data-action="word">
          Exportar Word
        </button>
      </div>
    `;

    const menu = root.querySelector(`[data-role="for-export-menu"]`);

    menu?.querySelector(`[data-action="pdf"]`)?.addEventListener("click", async () => {
      if (!activeRecordId) return;
      await onPdf(activeRecordId);
      forClose();
    });

    menu?.querySelector(`[data-action="word"]`)?.addEventListener("click", async () => {
      if (!activeRecordId) return;
      await onWord(activeRecordId);
      forClose();
    });
  }

  function forGetMenuNode() {
    return root.querySelector(`[data-role="for-export-menu"]`);
  }

  function forPosition(anchorEl) {
    const menu = forGetMenuNode();
    if (!menu || !anchorEl) return;

    const rect = anchorEl.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 8;
    const left = rect.left + window.scrollX;

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }

  function forOpen({ anchorEl, recordId }) {
    activeRecordId = recordId || null;
    const menu = forGetMenuNode();

    if (!menu || !activeRecordId || !anchorEl) return;

    menu.classList.remove("isHidden");
    isOpen = true;
    forPosition(anchorEl);
  }

  function forClose() {
    const menu = forGetMenuNode();
    if (!menu) return;

    menu.classList.add("isHidden");
    activeRecordId = null;
    isOpen = false;
  }

  function forToggle({ anchorEl, recordId }) {
    if (isOpen && activeRecordId === recordId) {
      forClose();
      return;
    }
    forOpen({ anchorEl, recordId });
  }

  function forBindGlobalEvents() {
    document.addEventListener("click", event => {
      const menu = forGetMenuNode();
      if (!menu || menu.classList.contains("isHidden")) return;

      const clickedInsideMenu = menu.contains(event.target);
      const clickedTrigger = event.target.closest?.(`[data-role="for-export-trigger"]`);

      if (!clickedInsideMenu && !clickedTrigger) {
        forClose();
      }
    });

    window.addEventListener("resize", () => {
      if (isOpen) forClose();
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && isOpen) {
        forClose();
      }
    });
  }

  forRender();
  forBindGlobalEvents();

  return {
    open: forOpen,
    close: forClose,
    toggle: forToggle
  };
}