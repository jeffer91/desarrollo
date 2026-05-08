/* =========================================================
Nombre completo: titulacion-anexos-ui.js
Ruta: /Titulacion/frontend/js/documentos/titulacion-anexos-ui.js
Función o funciones:
- Manejar carga visual de anexos e imágenes de Titulación.
- Permitir subir varios archivos por período.
- Mostrar vista previa de imágenes.
- Recuperar anexos guardados en Supabase por período y modalidad.
- Exponer anexos para que el PDF los inserte automáticamente.
========================================================= */

(function (window, document) {
  "use strict";

  var State = {
    context: {
      periodId: "",
      periodLabel: "",
      modalidad: ""
    },
    items: [],
    pendingUploads: new Set(),
    loadingKey: ""
  };

  function getConfig() {
    return window.TITULACION_CONFIG || {};
  }

  function getUtils() {
    return window.TITULACION_UTILS || {};
  }

  function getBus() {
    return window.TITULACION_BUS || null;
  }

  function $(id) {
    return document.getElementById(id);
  }

  function esc(value) {
    var utils = getUtils();

    if (typeof utils.escapeHtml === "function") {
      return utils.escapeHtml(value);
    }

    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function uid(prefix) {
    var utils = getUtils();

    if (typeof utils.uid === "function") {
      return utils.uid(prefix);
    }

    return String(prefix || "anexo") + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  }

  function asText(value) {
    var utils = getUtils();

    if (typeof utils.asText === "function") {
      return utils.asText(value);
    }

    return String(value === null || value === undefined ? "" : value).trim();
  }

  function getSelectors() {
    var cfg = getConfig();

    if (cfg.selectors && cfg.selectors.anexos) {
      return cfg.selectors.anexos;
    }

    return {
      drop: "titulacion-anexos-drop",
      input: "titulacion-anexos-input",
      list: "titulacion-anexos-list",
      status: "titulacion-anexos-status",
      refresh: "titulacion-anexos-refresh",
      clear: "titulacion-anexos-clear"
    };
  }

  function setStatus(message, isError) {
    var selectors = getSelectors();
    var box = $(selectors.status);

    if (!box) return;

    box.textContent = asText(message);
    box.style.color = isError ? "#dc2626" : "";
  }

  function makeContextKey(context) {
    var ctx = context || {};

    return [
      asText(ctx.periodId),
      asText(ctx.periodLabel),
      asText(ctx.modalidad)
    ].join("|");
  }

  function setContext(context) {
    var previousKey = makeContextKey(State.context);
    var ctx = context || {};

    State.context = {
      periodId: asText(ctx.periodId),
      periodLabel: asText(ctx.periodLabel || ctx.periodo),
      modalidad: asText(ctx.modalidad || ctx.tipoDocumento || "general")
    };

    var nextKey = makeContextKey(State.context);

    if (previousKey !== nextKey) {
      State.items = [];
      render();
      loadOnlineAnexos();
    }
  }

  function getContext() {
    return Object.assign({}, State.context);
  }

  function getSupabaseAnexos() {
    return window.SupabaseAnexos || null;
  }

  function hasSupabaseUpload() {
    var api = getSupabaseAnexos();

    return !!(
      api &&
      typeof api.uploadAnexo === "function"
    );
  }

  function hasSupabaseList() {
    var api = getSupabaseAnexos();

    return !!(
      api &&
      typeof api.listAnexos === "function"
    );
  }

  function isImageFile(file) {
    return !!(
      file &&
      file.type &&
      String(file.type).toLowerCase().indexOf("image/") === 0
    );
  }

  function isPdfFile(file) {
    return !!(
      file &&
      String(file.type || "").toLowerCase() === "application/pdf"
    );
  }

  function isAllowedFile(file) {
    return isImageFile(file) || isPdfFile(file);
  }

  function isImageItem(item) {
    var type = String(item && item.type || "").toLowerCase();
    var name = String(item && item.name || "").toLowerCase();

    return (
      type.indexOf("image/") === 0 ||
      /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(name)
    );
  }

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();

      reader.onload = function () {
        resolve(String(reader.result || ""));
      };

      reader.onerror = reject;

      reader.readAsDataURL(file);
    });
  }

  function getTypeFromElement(element) {
    var type = element && element.getAttribute
      ? element.getAttribute("data-anexo-type")
      : "";

    return asText(type || "evidencias") || "evidencias";
  }

  function updateItemById(id, patch) {
    var item = State.items.find(function (current) {
      return current && current.id === id;
    });

    if (!item) return;

    Object.assign(item, patch || {});
    render();
  }

  function trackUpload(promise) {
    State.pendingUploads.add(promise);

    promise.finally(function () {
      State.pendingUploads.delete(promise);
    });

    return promise;
  }

  async function uploadItem(item, file) {
    if (!item || !item.id) return;

    if (!hasSupabaseUpload()) {
      updateItemById(item.id, {
        uploadStatus: "local",
        uploadError: "Supabase no disponible."
      });

      return;
    }

    try {
      updateItemById(item.id, {
        uploadStatus: "subiendo",
        uploadError: ""
      });

      var result = await window.SupabaseAnexos.uploadAnexo(
        file,
        item.source || "evidencias",
        getContext()
      );

      if (!result || !result.ok) {
        updateItemById(item.id, {
          uploadStatus: "error",
          uploadError: result && result.error ? result.error : "No se pudo subir el anexo."
        });

        return;
      }

      updateItemById(item.id, {
        uploadStatus: "subido",
        uploadError: "",
        bucket: result.bucket || "",
        path: result.path || "",
        fullPath: result.fullPath || "",
        publicUrl: result.publicUrl || "",
        readableUrl: result.readableUrl || "",
        uploadedAt: result.uploadedAt || new Date().toISOString(),
        online: true
      });

      emitChange();
    } catch (error) {
      updateItemById(item.id, {
        uploadStatus: "error",
        uploadError: error && error.message ? error.message : String(error)
      });
    }
  }

  async function addFiles(files, type) {
    var list = Array.from(files || []).filter(isAllowedFile);
    var source = asText(type || "evidencias") || "evidencias";

    if (!list.length) {
      setStatus("No se recibieron archivos válidos. Solo se aceptan imágenes o PDF.", true);
      return;
    }

    for (var i = 0; i < list.length; i += 1) {
      var file = list[i];

      try {
        var dataUrl = isImageFile(file) ? await fileToDataUrl(file) : "";

        var item = {
          id: uid(source),
          source: source,
          name: String(file.name || "archivo"),
          type: String(file.type || "application/octet-stream"),
          size: Number(file.size || 0),
          dataUrl: dataUrl,
          uploadStatus: hasSupabaseUpload() ? "pendiente" : "local",
          uploadError: "",
          bucket: "",
          path: "",
          fullPath: "",
          publicUrl: "",
          readableUrl: "",
          uploadedAt: "",
          online: false
        };

        State.items.push(item);
        render();

        trackUpload(uploadItem(item, file));
      } catch (error) {
        console.warn("[TitulacionAnexosUI] No se pudo leer archivo:", file && file.name, error);
      }
    }

    setStatus("Anexos agregados.");
    emitChange();
  }

  function mergeOnlineItems(incoming) {
    var list = Array.isArray(incoming) ? incoming : [];

    list.forEach(function (item) {
      var path = asText(item && item.path);

      if (!path) return;

      var exists = State.items.some(function (current) {
        return asText(current && current.path) === path;
      });

      if (exists) return;

      State.items.push(Object.assign({}, item, {
        online: true,
        uploadStatus: item.uploadStatus || "subido",
        uploadError: item.uploadError || ""
      }));
    });
  }

  async function loadOnlineAnexos() {
    if (!hasSupabaseList()) {
      setStatus("Supabase no está disponible para cargar anexos guardados.", true);
      return;
    }

    var context = getContext();
    var key = makeContextKey(context);

    if (!context.periodId && !context.periodLabel) {
      return;
    }

    State.loadingKey = key;
    setStatus("Cargando anexos del período...");

    try {
      var result = await window.SupabaseAnexos.listAnexos(context);

      if (State.loadingKey !== key) {
        return;
      }

      if (!result || !result.ok) {
        setStatus(result && result.error ? result.error : "No se pudieron cargar anexos.", true);
        return;
      }

      State.items = [];
      mergeOnlineItems(result.items);
      render();
      setStatus("Anexos del período cargados.");
      emitChange();
    } catch (error) {
      setStatus(error && error.message ? error.message : String(error), true);
    }
  }

  async function deleteOnlineIfPossible(item) {
    if (!item || !item.path) return;

    if (
      window.SupabaseAnexos &&
      typeof window.SupabaseAnexos.deleteAnexo === "function"
    ) {
      try {
        await window.SupabaseAnexos.deleteAnexo(item);
      } catch (error) {
        console.warn("[TitulacionAnexosUI] No se pudo eliminar anexo online:", error);
      }
    }
  }

  function removeAt(index) {
    if (index < 0 || index >= State.items.length) return;

    var item = State.items[index];

    State.items.splice(index, 1);
    render();
    deleteOnlineIfPossible(item);
    emitChange();
  }

  function clearAll() {
    var copy = State.items.slice();

    State.items = [];
    render();

    copy.forEach(deleteOnlineIfPossible);
    emitChange();
  }

  function statusLabel(item) {
    var status = asText(item && item.uploadStatus);

    if (status === "subido") return "Subido a Supabase";
    if (status === "subiendo") return "Subiendo a Supabase...";
    if (status === "error") return "Error al subir";
    if (status === "local") return "Solo temporal";
    if (status === "pendiente") return "Pendiente de subida";

    return "Temporal";
  }

  function statusStyle(item) {
    var status = asText(item && item.uploadStatus);

    if (status === "subido") return "color:#16a34a;";
    if (status === "subiendo") return "color:#2563eb;";
    if (status === "error") return "color:#dc2626;";
    if (status === "local") return "color:#92400e;";

    return "opacity:.8;";
  }

  function ensureViewer() {
    if ($("titulacion-imgviewer")) return;

    var modal = document.createElement("div");
    modal.id = "titulacion-imgviewer";
    modal.style.cssText = [
      "position:fixed",
      "inset:0",
      "background:rgba(0,0,0,.65)",
      "display:none",
      "align-items:center",
      "justify-content:center",
      "z-index:99999",
      "padding:20px"
    ].join(";");

    modal.innerHTML = [
      '<div style="width:min(980px,96vw);max-height:92vh;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 18px 60px rgba(0,0,0,.35);display:flex;flex-direction:column;">',
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid #e2e8f0;">',
      '<div id="titulacion-imgviewer-title" style="font-weight:800;font-size:14px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>',
      '<button id="titulacion-imgviewer-close" type="button" style="border:1px solid #e2e8f0;background:#f8fafc;border-radius:10px;padding:8px 10px;cursor:pointer;font-weight:800;">Cerrar</button>',
      "</div>",
      '<div style="padding:12px;background:#f8fafc;display:flex;align-items:center;justify-content:center;">',
      '<img id="titulacion-imgviewer-img" alt="" style="max-width:100%;max-height:78vh;object-fit:contain;border-radius:10px;background:#fff;border:1px solid #e2e8f0;" />',
      "</div>",
      "</div>"
    ].join("");

    document.body.appendChild(modal);

    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        closeViewer();
      }
    });

    var closeButton = $("titulacion-imgviewer-close");

    if (closeButton) {
      closeButton.addEventListener("click", closeViewer);
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeViewer();
      }
    });
  }

  function openViewer(dataUrl, title) {
    ensureViewer();

    var modal = $("titulacion-imgviewer");
    var img = $("titulacion-imgviewer-img");
    var titleEl = $("titulacion-imgviewer-title");

    if (!modal || !img) return;

    img.src = String(dataUrl || "");

    if (titleEl) {
      titleEl.textContent = String(title || "Vista previa");
    }

    modal.style.display = "flex";
  }

  function closeViewer() {
    var modal = $("titulacion-imgviewer");
    var img = $("titulacion-imgviewer-img");

    if (!modal) return;

    modal.style.display = "none";

    if (img) {
      img.src = "";
    }
  }

  function render() {
    var selectors = getSelectors();
    var box = $(selectors.list);

    if (!box) return;

    if (!State.items.length) {
      box.innerHTML = '<div style="opacity:.75;">Sin anexos registrados.</div>';
      return;
    }

    box.innerHTML = State.items.map(function (item, index) {
      var dataUrl = String(item.dataUrl || item.readableUrl || item.publicUrl || "");
      var isImg = !!dataUrl && isImageItem(item);

      return [
        '<div class="titulacion-anexo-item" style="display:flex;gap:10px;align-items:center;padding:8px;border:1px solid rgba(15,23,42,.12);border-radius:10px;margin-top:8px;background:#fff;">',
        isImg
          ? '<img src="' + esc(dataUrl) + '" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px;background:#f1f5f9;" />'
          : '<div style="width:64px;height:64px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:11px;color:#0f172a;">PDF</div>',
        '<div style="flex:1;min-width:0;">',
        '<div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(item.name) + "</div>",
        '<div style="opacity:.8;font-size:12px;">' + esc(item.source || "evidencia") + " · " + esc(item.type) + "</div>",
        '<div style="font-size:11px;' + statusStyle(item) + '">' + esc(statusLabel(item)) + "</div>",
        item.path
          ? '<div title="' + esc(item.path) + '" style="opacity:.7;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(item.path) + "</div>"
          : "",
        item.uploadError
          ? '<div title="' + esc(item.uploadError) + '" style="font-size:10px;color:#dc2626;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(item.uploadError) + "</div>"
          : "",
        "</div>",
        isImg
          ? '<button type="button" data-view="' + index + '" style="padding:8px 10px;border:1px solid #cbd5e1;background:#f8fafc;border-radius:8px;cursor:pointer;">Ver</button>'
          : "",
        '<button type="button" data-remove="' + index + '" style="padding:8px 10px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;">Quitar</button>',
        "</div>"
      ].join("");
    }).join("");

    Array.prototype.slice.call(box.querySelectorAll("[data-view]")).forEach(function (button) {
      button.addEventListener("click", function () {
        var index = Number(button.getAttribute("data-view"));
        var item = State.items[index];
        var dataUrl = item ? String(item.dataUrl || item.readableUrl || item.publicUrl || "") : "";

        if (item && dataUrl) {
          openViewer(dataUrl, item.name || "Imagen");
        }
      });
    });

    Array.prototype.slice.call(box.querySelectorAll("[data-remove]")).forEach(function (button) {
      button.addEventListener("click", function () {
        var index = Number(button.getAttribute("data-remove"));
        removeAt(index);
      });
    });
  }

  function bindEvents() {
    var selectors = getSelectors();
    var drop = $(selectors.drop);
    var input = $(selectors.input);
    var refresh = $(selectors.refresh);
    var clear = $(selectors.clear);

    if (input) {
      input.multiple = true;
      input.setAttribute("multiple", "multiple");

      input.addEventListener("change", function () {
        if (input.files && input.files.length) {
          addFiles(input.files, getTypeFromElement(input));
        }

        input.value = "";
      });
    }

    if (drop) {
      drop.addEventListener("dragover", function (event) {
        event.preventDefault();
        drop.style.outline = "2px dashed rgba(37,99,235,.45)";
        drop.style.outlineOffset = "6px";
      });

      drop.addEventListener("dragleave", function () {
        drop.style.outline = "";
        drop.style.outlineOffset = "";
      });

      drop.addEventListener("drop", function (event) {
        event.preventDefault();
        drop.style.outline = "";
        drop.style.outlineOffset = "";

        var dt = event.dataTransfer;

        if (dt && dt.files && dt.files.length) {
          addFiles(dt.files, getTypeFromElement(drop));
        }
      });
    }

    if (refresh) {
      refresh.addEventListener("click", loadOnlineAnexos);
    }

    if (clear) {
      clear.addEventListener("click", clearAll);
    }
  }

  function emitChange() {
    var bus = getBus();

    if (bus && typeof bus.emit === "function") {
      bus.emit("titulacion:anexos:change", {
        context: getContext(),
        items: getItems()
      });
    }
  }

  function getItems() {
    return State.items.map(function (item) {
      return Object.assign({}, item);
    });
  }

  function getItemsByType(type) {
    var source = asText(type);

    return getItems().filter(function (item) {
      return asText(item.source) === source;
    });
  }

  function getUploadSummary() {
    var summary = {
      total: State.items.length,
      subidos: 0,
      subiendo: 0,
      errores: 0,
      locales: 0,
      pendientes: 0
    };

    State.items.forEach(function (item) {
      var status = asText(item.uploadStatus);

      if (status === "subido") summary.subidos += 1;
      else if (status === "subiendo") summary.subiendo += 1;
      else if (status === "error") summary.errores += 1;
      else if (status === "local") summary.locales += 1;
      else summary.pendientes += 1;
    });

    return summary;
  }

  function hasPendingUploads() {
    return State.pendingUploads.size > 0;
  }

  async function waitForUploads() {
    var pending = Array.from(State.pendingUploads);

    if (!pending.length) {
      return [];
    }

    return Promise.allSettled(pending);
  }

  function init() {
    ensureViewer();
    bindEvents();
    render();
  }

  window.TITULACION_ANEXOS_UI = {
    init: init,
    setContext: setContext,
    getContext: getContext,
    addFiles: addFiles,
    loadOnlineAnexos: loadOnlineAnexos,
    getItems: getItems,
    getItemsByType: getItemsByType,
    getUploadSummary: getUploadSummary,
    hasPendingUploads: hasPendingUploads,
    waitForUploads: waitForUploads,
    clearAll: clearAll,
    render: render
  };

  document.addEventListener("DOMContentLoaded", init);
})(window, document);