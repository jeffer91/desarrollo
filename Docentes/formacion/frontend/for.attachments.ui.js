/*
Nombre completo: for.attachments.ui.js
Ruta o ubicación: formacion/frontend/for.attachments.ui.js
Función o funciones: Montar la interfaz de anexos dentro del pop up, permitir agregar archivos y enlaces manuales, listar anexos actuales, eliminarlos y devolver el arreglo listo para ser guardado
*/

function forEscapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function forCreateAttachmentId() {
  return `anexo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function forFormatBytes(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function forMountAttachmentsUI(root, seedAttachments = [], { onChange = () => {} } = {}) {
  const mount = root.querySelector(`[data-role="for-attachments-mount"]`);
  if (!mount) {
    return {
      getValue: () => []
    };
  }

  let attachments = Array.isArray(seedAttachments)
    ? structuredClone(seedAttachments)
    : [];

  function forRender() {
    mount.innerHTML = `
      <div class="forAttachmentsBox">
        <div class="forModalGrid">
          <div class="forFull">
            <label>Agregar archivos</label>
            <input type="file" data-role="for-attachment-file-input" multiple />
          </div>

          <div>
            <label>Título del enlace</label>
            <input type="text" data-role="for-attachment-link-title" placeholder="Ejemplo: Anexo A" />
          </div>

          <div>
            <label>URL del enlace</label>
            <input type="url" data-role="for-attachment-link-url" placeholder="https://..." />
          </div>

          <div class="forFull">
            <button type="button" class="forBtn forBtnSecondary" data-role="for-add-link-btn">
              Agregar enlace como anexo
            </button>
          </div>
        </div>

        <div class="forAttachmentListWrap">
          ${
            attachments.length
              ? `
                <table class="forTable">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Tipo</th>
                      <th>Tamaño</th>
                      <th>Origen</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${attachments.map(item => `
                      <tr data-id="${forEscapeHtml(item.id)}">
                        <td>${forEscapeHtml(item.title)}</td>
                        <td>${forEscapeHtml(item.type)}</td>
                        <td>${forEscapeHtml(forFormatBytes(item.size))}</td>
                        <td>${forEscapeHtml(item.origin)}</td>
                        <td>
                          <button type="button" class="forMiniBtn" data-role="for-remove-attachment">Quitar</button>
                        </td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              `
              : `<div class="forEmpty">No hay anexos cargados.</div>`
          }
        </div>
      </div>
    `;

    const fileInput = mount.querySelector(`[data-role="for-attachment-file-input"]`);
    const addLinkBtn = mount.querySelector(`[data-role="for-add-link-btn"]`);

    fileInput?.addEventListener("change", event => {
      const files = Array.from(event.currentTarget.files ?? []);
      if (!files.length) return;

      const nextItems = files.map(file => ({
        id: forCreateAttachmentId(),
        title: file.name,
        type: file.type || "Archivo",
        size: file.size || 0,
        origin: "Archivo",
        fileName: file.name,
        fileObjectUrl: URL.createObjectURL(file)
      }));

      attachments = attachments.concat(nextItems);
      forRender();
      onChange(structuredClone(attachments));
    });

    addLinkBtn?.addEventListener("click", () => {
      const titleNode = mount.querySelector(`[data-role="for-attachment-link-title"]`);
      const urlNode = mount.querySelector(`[data-role="for-attachment-link-url"]`);
      const title = String(titleNode?.value ?? "").trim();
      const url = String(urlNode?.value ?? "").trim();

      if (!title || !url) return;

      attachments.unshift({
        id: forCreateAttachmentId(),
        title,
        type: "Enlace",
        size: 0,
        origin: "URL",
        url
      });

      titleNode.value = "";
      urlNode.value = "";
      forRender();
      onChange(structuredClone(attachments));
    });

    mount.querySelectorAll(`[data-role="for-remove-attachment"]`).forEach(btn => {
      btn.addEventListener("click", event => {
        const row = event.currentTarget.closest("tr");
        const id = row?.dataset?.id ?? "";
        attachments = attachments.filter(item => item.id !== id);
        forRender();
        onChange(structuredClone(attachments));
      });
    });
  }

  forRender();

  return {
    getValue() {
      return structuredClone(attachments);
    },
    setValue(nextAttachments = []) {
      attachments = Array.isArray(nextAttachments)
        ? structuredClone(nextAttachments)
        : [];
      forRender();
    }
  };
}