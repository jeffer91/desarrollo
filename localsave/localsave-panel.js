(function (window, document) {
  "use strict";

  const SHIM_STORAGE_KEY = "firebase-local-shim.v1";

  const state = {
    collections: [],
    selectedCollection: "",
    selectedDocId: "",
    fileSnapshot: null,
    fileQueue: [],
    fileStatus: null,
    shimState: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function safeCall(fn, fallback) {
    try {
      return fn();
    } catch (err) {
      return fallback;
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function pretty(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (err) {
      return String(value);
    }
  }

  function asText(value, fallback) {
    const v = String(value == null ? "" : value).trim();
    return v || String(fallback || "");
  }

  function normalizeLower(value) {
    return asText(value, "").toLowerCase();
  }

  function setText(id, value) {
    const el = byId(id);
    if (el) el.textContent = String(value == null ? "" : value);
  }

  function setHtml(id, value) {
    const el = byId(id);
    if (el) el.innerHTML = String(value == null ? "" : value);
  }

  function getLocalSaveStatus() {
    return safeCall(function () {
      return window.LocalSaveStatus && typeof window.LocalSaveStatus.getStatus === "function"
        ? window.LocalSaveStatus.getStatus()
        : null;
    }, null);
  }

  function getLocalSaveSnapshot() {
    return safeCall(function () {
      return window.LocalSaveSnapshot && typeof window.LocalSaveSnapshot.read === "function"
        ? window.LocalSaveSnapshot.read()
        : null;
    }, null);
  }

  function getLocalSaveQueue() {
    return safeCall(function () {
      return window.LocalSaveQueue && typeof window.LocalSaveQueue.read === "function"
        ? window.LocalSaveQueue.read()
        : [];
    }, []);
  }

  function getShimState() {
    try {
      const raw = window.localStorage.getItem(SHIM_STORAGE_KEY);
      if (!raw) {
        return {
          version: 1,
          updatedAt: null,
          scopes: {}
        };
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return {
          version: 1,
          updatedAt: null,
          scopes: {}
        };
      }
      if (!parsed.scopes || typeof parsed.scopes !== "object") {
        parsed.scopes = {};
      }
      return parsed;
    } catch (err) {
      return {
        version: 1,
        updatedAt: null,
        scopes: {}
      };
    }
  }

  function resolveCollectionTitle(scope) {
    return safeCall(function () {
      if (window.LocalSaveConfig && typeof window.LocalSaveConfig.resolveCollection === "function") {
        return window.LocalSaveConfig.resolveCollection(scope) || scope;
      }
      return scope;
    }, scope);
  }

  function getPossibleValue(obj, names) {
    if (!obj || typeof obj !== "object") return "";
    const keys = Object.keys(obj);
    for (let i = 0; i < names.length; i += 1) {
      const wanted = normalizeLower(names[i]);
      for (let j = 0; j < keys.length; j += 1) {
        if (normalizeLower(keys[j]) === wanted) {
          const value = obj[keys[j]];
          if (value != null && String(value).trim()) {
            return String(value).trim();
          }
        }
      }
    }
    return "";
  }

  function resolveDocId(row, fallbackId) {
    const direct = getPossibleValue(row, [
      "_docId",
      "id",
      "cedula",
      "numeroidentificacion",
      "numeroIdentificacion",
      "codigo",
      "uid",
      "periodoId",
      "periodId",
      "ultimoPeriodoId"
    ]);
    return direct || asText(fallbackId, "");
  }

  function normalizePanelDoc(raw, fallbackId, scope, source) {
    const row = raw && typeof raw === "object" ? clone(raw) : {};
    const docId = resolveDocId(row, fallbackId);
    if (!row._docId) row._docId = docId;
    if (!row.__scope) row.__scope = scope;
    return {
      id: docId,
      scope: scope,
      source: source,
      updatedAt: getPossibleValue(row, ["__updatedAt", "updatedAt", "actualizadoEn", "fechaActualizacion"]),
      row: row
    };
  }

  function buildFileScopeMap(snapshot) {
    const out = {};
    const snap = snapshot && typeof snapshot === "object" ? snapshot : { scopes: {} };
    const scopes = snap.scopes && typeof snap.scopes === "object" ? snap.scopes : {};
    const scopeNames = Object.keys(scopes);

    for (let i = 0; i < scopeNames.length; i += 1) {
      const scope = scopeNames[i];
      const bucket = scopes[scope] && typeof scopes[scope] === "object" ? scopes[scope] : {};
      const items = bucket.items && typeof bucket.items === "object" ? bucket.items : {};
      const docIds = Object.keys(items);
      const docsById = {};

      for (let j = 0; j < docIds.length; j += 1) {
        const docId = docIds[j];
        docsById[docId] = normalizePanelDoc(items[docId], docId, scope, "files");
      }

      out[scope] = {
        name: scope,
        title: resolveCollectionTitle(scope),
        updatedAt: asText(bucket.updatedAt, getPossibleValue(snap.meta || {}, ["updatedAt"])),
        docsById: docsById,
        source: "files"
      };
    }

    return out;
  }

  function buildShimScopeMap(shimState) {
    const out = {};
    const shim = shimState && typeof shimState === "object" ? shimState : { scopes: {} };
    const scopes = shim.scopes && typeof shim.scopes === "object" ? shim.scopes : {};
    const scopeNames = Object.keys(scopes);

    for (let i = 0; i < scopeNames.length; i += 1) {
      const scope = scopeNames[i];
      const bucket = scopes[scope] && typeof scopes[scope] === "object" ? scopes[scope] : {};
      const docIds = Object.keys(bucket);
      const docsById = {};

      for (let j = 0; j < docIds.length; j += 1) {
        const docId = docIds[j];
        docsById[docId] = normalizePanelDoc(bucket[docId], docId, scope, "localStorage");
      }

      out[scope] = {
        name: scope,
        title: resolveCollectionTitle(scope),
        updatedAt: asText(shim.updatedAt, ""),
        docsById: docsById,
        source: "localStorage"
      };
    }

    return out;
  }

  function mergeScopeMaps(fileMap, shimMap) {
    const namesSet = new Set(
      Object.keys(fileMap || {}).concat(Object.keys(shimMap || {}))
    );

    const merged = [];

    namesSet.forEach(function (scope) {
      const a = fileMap[scope] || null;
      const b = shimMap[scope] || null;
      const docsById = {};

      if (b && b.docsById) {
        Object.keys(b.docsById).forEach(function (docId) {
          docsById[docId] = clone(b.docsById[docId]);
        });
      }

      if (a && a.docsById) {
        Object.keys(a.docsById).forEach(function (docId) {
          docsById[docId] = clone(a.docsById[docId]);
        });
      }

      merged.push({
        name: scope,
        title: resolveCollectionTitle(scope),
        updatedAt: (a && a.updatedAt) || (b && b.updatedAt) || "",
        source: a && b ? "files+localStorage" : a ? "files" : "localStorage",
        docsById: docsById,
        total: Object.keys(docsById).length,
        fileCount: a ? Object.keys(a.docsById).length : 0,
        shimCount: b ? Object.keys(b.docsById).length : 0
      });
    });

    merged.sort(function (left, right) {
      if (right.total !== left.total) return right.total - left.total;
      return left.name.localeCompare(right.name, "es");
    });

    return merged;
  }

  function getSelectedCollectionObject() {
    return state.collections.find(function (item) {
      return item.name === state.selectedCollection;
    }) || null;
  }

  function getCollectionDocs(collectionObj) {
    if (!collectionObj || !collectionObj.docsById) return [];
    return Object.keys(collectionObj.docsById).map(function (id) {
      return collectionObj.docsById[id];
    }).sort(function (left, right) {
      const a = getDocTitle(left.row, left.id);
      const b = getDocTitle(right.row, right.id);
      return a.localeCompare(b, "es");
    });
  }

  function getDocTitle(row, fallbackId) {
    return (
      getPossibleValue(row, [
        "Nombres",
        "nombres",
        "nombre",
        "name",
        "titulo",
        "title",
        "descripcion",
        "asunto",
        "correo",
        "email"
      ]) ||
      asText(fallbackId, "Sin id")
    );
  }

  function getDocSubtitle(row) {
    return (
      getPossibleValue(row, [
        "NombreCarrera",
        "nombreCarrera",
        "carrera",
        "periodoId",
        "periodId",
        "correo",
        "email",
        "estado",
        "Estado",
        "tipo"
      ]) || "Sin descripción"
    );
  }

  function getQueueEntriesForDoc(scope, docId) {
    return (Array.isArray(state.fileQueue) ? state.fileQueue : []).filter(function (item) {
      const sameScope = asText(item && item.scope, "") === asText(scope, "");
      const isReplace = asText(item && item.action, "") === "replaceScope";
      const sameDoc = asText(item && item.recordId, "") === asText(docId, "");
      return sameScope && (sameDoc || isReplace);
    });
  }

  function getDocPendingState(scope, docId) {
    const entries = getQueueEntriesForDoc(scope, docId);

    if (!entries.length) {
      return { text: "listo", kind: "ok" };
    }

    const hasDelete = entries.some(function (item) {
      return asText(item && item.action, "") === "delete" &&
        asText(item && item.recordId, "") === asText(docId, "");
    });

    if (hasDelete) {
      return { text: "delete pendiente", kind: "bad" };
    }

    const hasReplace = entries.some(function (item) {
      return asText(item && item.action, "") === "replaceScope";
    });

    if (hasReplace) {
      return { text: "replace pendiente", kind: "warn" };
    }

    return { text: "pendiente", kind: "warn" };
  }

  function getSourceSummary() {
    const hasFiles = state.collections.some(function (item) {
      return item.source.indexOf("files") >= 0;
    });
    const hasShim = state.collections.some(function (item) {
      return item.source.indexOf("localStorage") >= 0;
    });

    if (hasFiles && hasShim) return "archivos + localStorage";
    if (hasFiles) return "archivos LocalSave";
    if (hasShim) return "localStorage";
    return "sin datos";
  }

  function ensureSelection() {
    if (!state.collections.length) {
      state.selectedCollection = "";
      state.selectedDocId = "";
      return;
    }

    const hasCollection = state.collections.some(function (item) {
      return item.name === state.selectedCollection;
    });

    if (!hasCollection) {
      state.selectedCollection = state.collections[0].name;
    }

    const collectionObj = getSelectedCollectionObject();
    const docs = getCollectionDocs(collectionObj);

    if (!docs.length) {
      state.selectedDocId = "";
      return;
    }

    const hasDoc = docs.some(function (doc) {
      return doc.id === state.selectedDocId;
    });

    if (!hasDoc) {
      state.selectedDocId = docs[0].id;
    }
  }

  function truncateText(value, maxLen) {
    const txt = asText(value, "");
    const size = Number(maxLen || 120);
    if (txt.length <= size) return txt;
    return txt.slice(0, size - 1) + "…";
  }

  function fieldTypeOf(value) {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array[" + value.length + "]";
    return typeof value;
  }

  function formatFieldValue(value) {
    if (value === null) return "null";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return pretty(value);
  }

  function flattenFields(obj) {
    const out = [];

    function walk(value, path, depth) {
      if (depth > 8) {
        out.push({
          path: path || "(root)",
          value: "[profundidad máxima]",
          type: "object"
        });
        return;
      }

      if (Array.isArray(value)) {
        out.push({
          path: path || "(root)",
          value: pretty(value),
          type: "array[" + value.length + "]"
        });
        return;
      }

      if (value && typeof value === "object") {
        const keys = Object.keys(value);
        if (!keys.length) {
          out.push({
            path: path || "(root)",
            value: "{}",
            type: "object"
          });
          return;
        }
        for (let i = 0; i < keys.length; i += 1) {
          const key = keys[i];
          walk(value[key], path ? (path + "." + key) : key, depth + 1);
        }
        return;
      }

      out.push({
        path: path || "(root)",
        value: formatFieldValue(value),
        type: fieldTypeOf(value)
      });
    }

    walk(obj, "", 0);
    return out;
  }

  function renderSummary() {
    const totalCollections = state.collections.length;
    const totalDocuments = state.collections.reduce(function (acc, item) {
      return acc + Number(item.total || 0);
    }, 0);
    const pendingCount = Number(
      (state.fileStatus && state.fileStatus.pendingCount) ||
      (Array.isArray(state.fileQueue) ? state.fileQueue.length : 0) ||
      0
    );

    const lastSync = state.fileStatus && state.fileStatus.lastSync
      ? (state.fileStatus.lastSync.finishedAt || state.fileStatus.lastSync.startedAt || "Nunca")
      : "Nunca";

    const supported = !!(state.fileStatus && state.fileStatus.supported);
    const ready = !!(state.fileStatus && state.fileStatus.ready);
    const snapshotUpdatedAt = state.fileStatus && state.fileStatus.snapshotUpdatedAt
      ? state.fileStatus.snapshotUpdatedAt
      : "—";

    setText("kpiCollections", totalCollections);
    setText("kpiDocuments", totalDocuments);
    setText("kpiPending", pendingCount);
    setText("kpiLastSync", lastSync);

    setText("pillSource", "Fuente: " + getSourceSummary());
    setText("pillFs", "Filesystem: " + (supported ? "sí" : "no"));
    setText("pillReady", "Ready: " + (ready ? "sí" : "no"));
    setText("pillSnapshot", "Snapshot: " + snapshotUpdatedAt);

    const footerDot = byId("footerDot");
    const footerText = byId("footerStatusText");
    const footerPath = byId("footerPathText");

    if (footerDot) {
      footerDot.classList.remove("is-warn", "is-bad");
      if (!supported && getSourceSummary() === "localStorage") {
        footerDot.classList.add("is-warn");
      } else if (!supported && !ready && getSourceSummary() === "sin datos") {
        footerDot.classList.add("is-bad");
      } else if (pendingCount > 0) {
        footerDot.classList.add("is-warn");
      }
    }

    if (footerText) {
      if (pendingCount > 0) {
        footerText.textContent = "Hay cambios pendientes por sincronizar.";
      } else if (getSourceSummary() === "localStorage") {
        footerText.textContent = "Mostrando datos desde localStorage.";
      } else if (getSourceSummary() === "archivos LocalSave" || getSourceSummary() === "archivos + localStorage") {
        footerText.textContent = "Mostrando datos desde archivos LocalSave.";
      } else {
        footerText.textContent = "No hay datos disponibles todavía.";
      }
    }

    if (footerPath) {
      const paths = state.fileStatus && state.fileStatus.paths ? state.fileStatus.paths : null;
      footerPath.textContent = paths
        ? "Modo LocalSave activo"
        : "Sin rutas activas en este entorno";
    }
  }

  function renderCollections() {
    const listEl = byId("collectionsList");
    const emptyEl = byId("collectionsEmpty");
    const filter = normalizeLower(byId("inputCollectionSearch") ? byId("inputCollectionSearch").value : "");

    const visible = state.collections.filter(function (item) {
      if (!filter) return true;
      const hay = [
        item.name,
        item.title,
        item.source,
        String(item.total)
      ].join(" ").toLowerCase();
      return hay.indexOf(filter) >= 0;
    });

    if (!listEl) return;

    if (!visible.length) {
      listEl.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    if (emptyEl) emptyEl.hidden = true;

    listEl.innerHTML = visible.map(function (item) {
      const isActive = item.name === state.selectedCollection;
      const sourceText = item.source === "files+localStorage"
        ? "archivos + localStorage"
        : item.source === "files"
          ? "archivos"
          : "localStorage";

      return (
        '<li class="ls-list__item ' + (isActive ? 'is-active' : '') + '">' +
          '<button type="button" class="ls-list__button" data-scope="' + escapeHtml(item.name) + '">' +
            '<span class="ls-list__main">' +
              '<span class="ls-list__title">' + escapeHtml(item.name) + '</span>' +
              '<span class="ls-list__meta">Firebase: ' + escapeHtml(item.title) + ' · ' + escapeHtml(String(item.total)) + ' documentos</span>' +
              '<span class="ls-list__tags">' +
                '<span class="ls-badge">' + escapeHtml(sourceText) + '</span>' +
                '<span class="ls-badge ls-badge--ok">files: ' + escapeHtml(String(item.fileCount || 0)) + '</span>' +
                '<span class="ls-badge ls-badge--warn">ls: ' + escapeHtml(String(item.shimCount || 0)) + '</span>' +
              '</span>' +
            '</span>' +
          '</button>' +
        '</li>'
      );
    }).join("");

    listEl.querySelectorAll("[data-scope]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.selectedCollection = asText(btn.getAttribute("data-scope"), "");
        state.selectedDocId = "";
        ensureSelection();
        renderDocuments();
        renderDetails();
      });
    });
  }

  function renderDocuments() {
    const collectionObj = getSelectedCollectionObject();
    const docs = getCollectionDocs(collectionObj);
    const filter = normalizeLower(byId("inputDocumentSearch") ? byId("inputDocumentSearch").value : "");
    const listEl = byId("documentsList");
    const emptyEl = byId("documentsEmpty");

    setText("selectedCollectionLabel", collectionObj ? collectionObj.name : "—");

    if (!listEl) return;

    const visible = docs.filter(function (doc) {
      if (!filter) return true;
      const hay = [
        doc.id,
        getDocTitle(doc.row, doc.id),
        getDocSubtitle(doc.row),
        doc.source
      ].join(" ").toLowerCase();
      return hay.indexOf(filter) >= 0;
    });

    if (!visible.length) {
      listEl.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    if (emptyEl) emptyEl.hidden = true;

    listEl.innerHTML = visible.map(function (doc) {
      const isActive = doc.id === state.selectedDocId;
      const pending = getDocPendingState(doc.scope, doc.id);
      const title = getDocTitle(doc.row, doc.id);
      const subtitle = getDocSubtitle(doc.row);
      const sourceText = doc.source === "files" ? "archivo" : "localStorage";

      return (
        '<li class="ls-list__item ' + (isActive ? 'is-active' : '') + '">' +
          '<button type="button" class="ls-list__button" data-doc-id="' + escapeHtml(doc.id) + '">' +
            '<span class="ls-list__main">' +
              '<span class="ls-list__title">' + escapeHtml(truncateText(title, 90)) + '</span>' +
              '<span class="ls-list__meta">id: ' + escapeHtml(doc.id) + '</span>' +
              '<span class="ls-list__meta">' + escapeHtml(truncateText(subtitle, 90)) + '</span>' +
              '<span class="ls-list__tags">' +
                '<span class="ls-badge">' + escapeHtml(sourceText) + '</span>' +
                '<span class="ls-badge ' +
                  (pending.kind === "ok" ? "ls-badge--ok" : pending.kind === "bad" ? "ls-badge--bad" : "ls-badge--warn") +
                '">' + escapeHtml(pending.text) + '</span>' +
              '</span>' +
            '</span>' +
          '</button>' +
        '</li>'
      );
    }).join("");

    listEl.querySelectorAll("[data-doc-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.selectedDocId = asText(btn.getAttribute("data-doc-id"), "");
        renderDocuments();
        renderDetails();
      });
    });
  }

  function renderDetails() {
    const collectionObj = getSelectedCollectionObject();
    const docs = getCollectionDocs(collectionObj);
    const selected = docs.find(function (doc) {
      return doc.id === state.selectedDocId;
    }) || null;

    setText("selectedDocumentLabel", selected ? selected.id : "—");
    setText("docCollectionName", collectionObj ? collectionObj.name : "—");
    setText("docIdValue", selected ? selected.id : "—");
    setText("docSourceValue", selected ? selected.source : "—");

    const fieldsBody = byId("fieldsTableBody");
    const fieldsEmpty = byId("fieldsEmpty");

    if (!selected || !fieldsBody) {
      if (fieldsBody) fieldsBody.innerHTML = "";
      if (fieldsEmpty) fieldsEmpty.hidden = false;
      setText("docStatusValue", "—");
      setText("jsonPreview", "{}");
      setText("queuePreview", "[]");
      return;
    }

    const pending = getDocPendingState(selected.scope, selected.id);
    const rows = flattenFields(selected.row);
    const queueEntries = getQueueEntriesForDoc(selected.scope, selected.id);

    setText("docStatusValue", pending.text);
    setText("jsonPreview", pretty(selected.row));
    setText("queuePreview", pretty(queueEntries));

    if (!rows.length) {
      fieldsBody.innerHTML = "";
      if (fieldsEmpty) fieldsEmpty.hidden = false;
      return;
    }

    if (fieldsEmpty) fieldsEmpty.hidden = true;

    fieldsBody.innerHTML = rows.map(function (item) {
      return (
        "<tr>" +
          "<td>" + escapeHtml(item.path) + "</td>" +
          "<td>" + escapeHtml(truncateText(item.value, 180)) + "</td>" +
          "<td>" + escapeHtml(item.type) + "</td>" +
        "</tr>"
      );
    }).join("");
  }

  function refreshAll() {
    state.fileStatus = getLocalSaveStatus();
    state.fileSnapshot = getLocalSaveSnapshot();
    state.fileQueue = getLocalSaveQueue();
    state.shimState = getShimState();

    const fileMap = buildFileScopeMap(state.fileSnapshot);
    const shimMap = buildShimScopeMap(state.shimState);
    state.collections = mergeScopeMaps(fileMap, shimMap);

    ensureSelection();
    renderSummary();
    renderCollections();
    renderDocuments();
    renderDetails();
  }

  async function runSyncNow() {
    try {
      if (!window.LocalSave || typeof window.LocalSave.syncNow !== "function") {
        alert("LocalSave.syncNow no está disponible.");
        return;
      }

      byId("btnSyncNow").disabled = true;
      const result = await window.LocalSave.syncNow();
      refreshAll();

      if (result && result.ok) {
        alert("Sincronización ejecutada correctamente.");
      } else {
        alert("No se pudo sincronizar. Revisa la consola o la configuración de Firebase.");
      }
    } catch (err) {
      alert("Error al sincronizar: " + (err && err.message ? err.message : String(err)));
    } finally {
      if (byId("btnSyncNow")) byId("btnSyncNow").disabled = false;
    }
  }

  function runClearQueue() {
    try {
      if (!window.LocalSave || typeof window.LocalSave.clearQueue !== "function") {
        alert("LocalSave.clearQueue no está disponible.");
        return;
      }

      const ok = window.confirm("¿Seguro que quieres limpiar la cola pendiente?");
      if (!ok) return;

      const result = window.LocalSave.clearQueue();
      refreshAll();

      if (result && result.ok !== false) {
        alert("Cola limpiada correctamente.");
      } else {
        alert("No se pudo limpiar la cola.");
      }
    } catch (err) {
      alert("Error al limpiar cola: " + (err && err.message ? err.message : String(err)));
    }
  }

  function bindEvents() {
    const btnRefresh = byId("btnRefresh");
    const btnSyncNow = byId("btnSyncNow");
    const btnClearQueue = byId("btnClearQueue");
    const inputCollectionSearch = byId("inputCollectionSearch");
    const inputDocumentSearch = byId("inputDocumentSearch");

    if (btnRefresh) {
      btnRefresh.addEventListener("click", refreshAll);
    }

    if (btnSyncNow) {
      btnSyncNow.addEventListener("click", runSyncNow);
    }

    if (btnClearQueue) {
      btnClearQueue.addEventListener("click", runClearQueue);
    }

    if (inputCollectionSearch) {
      inputCollectionSearch.addEventListener("input", renderCollections);
    }

    if (inputDocumentSearch) {
      inputDocumentSearch.addEventListener("input", renderDocuments);
    }

    window.addEventListener("storage", function (ev) {
      if (!ev) return;
      if (ev.key === SHIM_STORAGE_KEY) {
        refreshAll();
      }
    });
  }

  function boot() {
    bindEvents();
    refreshAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})(window, document);