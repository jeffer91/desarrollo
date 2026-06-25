/*
Nombre del archivo: mat.tabla.render.js
Ubicación: /Curriculo/materias/frontend/tabla/mat.tabla.render.js
Función:
- Renderizar datos del bloque actual
- Mostrar listas por nivel o listas simples
- Agregar acciones por item
*/

(function (window) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  MAT.tabla = MAT.tabla || {};
  MAT.tabla.render = MAT.tabla.render || {};

  function esc(value) {
    return MAT.ui && typeof MAT.ui.escapeHtml === "function" ? MAT.ui.escapeHtml(value) : String(value || "");
  }

  function toArray(value) { return Array.isArray(value) ? value : []; }

  function button(action, group, index, label) {
    return '<button type="button" class="mat-btn" style="padding:6px 8px;font-size:11px;" data-mat-table-action="' + esc(action) + '" data-group="' + esc(group) + '" data-index="' + esc(String(index)) + '">' + esc(label) + '</button>';
  }

  function renderItem(item, group, index) {
    return '<div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #eef2f7;">'
      + '<div style="font-size:13px;line-height:1.4;">' + esc(item) + '</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
      + button("move-up", group, index, "↑")
      + button("move-down", group, index, "↓")
      + button("remove", group, index, "Quitar")
      + '</div></div>';
  }

  function renderGroup(title, groupKey, items) {
    var list = toArray(items);
    var html = '<div style="border:1px solid #e2e8f0;border-radius:10px;background:#fff;padding:10px;">';
    html += '<div style="font-weight:700;font-size:13px;margin-bottom:8px;">' + esc(title) + ' · ' + esc(String(list.length)) + '</div>';
    if (!list.length) html += '<div style="color:#64748b;font-size:12px;">Sin registros.</div>';
    else list.forEach(function (item, index) { html += renderItem(item, groupKey, index); });
    html += '</div>';
    return html;
  }

  MAT.tabla.render.empty = function (message) {
    var body = MAT.tabla.getBody();
    MAT.tabla.setTitle("Datos actuales");
    MAT.tabla.setMeta("No hay datos para mostrar todavía.");
    if (body) body.innerHTML = '<div style="color:#64748b;">' + esc(message || "Aún no hay datos para mostrar.") + '</div>';
  };

  MAT.tabla.render.loading = function (message) {
    var body = MAT.tabla.getBody();
    MAT.tabla.setTitle("Datos actuales");
    MAT.tabla.setMeta("Cargando...");
    if (body) body.innerHTML = '<div style="color:#64748b;">' + esc(message || "Cargando...") + '</div>';
  };

  MAT.tabla.render.noSelection = function () {
    MAT.tabla.render.empty("Selecciona una carrera y un tipo de carga.");
  };

  MAT.tabla.render.fromPreview = function (preview, careerType, options) {
    var body = MAT.tabla.getBody();
    var kind = String((preview && preview.kind) || "").trim();
    var summary = (preview && preview.summary) || {};
    var html = "";
    var sourceLabel = (options && options.source) ? String(options.source) : "editor";
    var title = (options && options.title) ? String(options.title) : "Datos del bloque actual";

    if (!body) return;
    MAT.tabla.setTitle(title);
    MAT.tabla.setMeta("Origen: " + sourceLabel + " · Tipo: " + (kind || "sin tipo"));

    if (!kind) {
      body.innerHTML = '<div style="color:#64748b;">No hay una vista previa activa.</div>';
      return;
    }

    if (kind === "materias-carrera" || kind === "transversales") {
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">';
      html += renderGroup("Nivel 1", "nivel1", summary.nivel1);
      html += renderGroup("Nivel 2", "nivel2", summary.nivel2);
      html += renderGroup("Nivel 3", "nivel3", summary.nivel3);
      html += renderGroup("Nivel 4", "nivel4", summary.nivel4);
      html += renderGroup("Sin nivel", "sinNivel", summary.sinNivel);
      html += '</div>';
      body.innerHTML = html;
      return;
    }

    if (kind === "nucleos" || kind === "ejes") {
      html += '<div style="display:grid;gap:8px;">';
      html += '<div style="font-size:12px;color:#64748b;">';
      html += kind === "ejes"
        ? 'Ejes esperados para esta carrera: ' + esc(String(MAT.carreras.getEjesEsperados(careerType || "")))
        : 'Núcleos esperados: ' + esc(String((MAT.config && MAT.config.limits && MAT.config.limits.nucleos && MAT.config.limits.nucleos.exactTotal) || 4));
      html += '</div>';
      html += renderGroup(kind === "nucleos" ? "Núcleos" : "Ejes", "items", summary.items);
      html += '</div>';
      body.innerHTML = html;
      return;
    }

    body.innerHTML = '<div style="color:#64748b;">Tipo no soportado en la tabla.</div>';
  };
})(window);
