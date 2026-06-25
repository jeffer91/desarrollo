/*
Nombre del archivo: mat.tabla.js
Ubicación: /Curriculo/materias/frontend/tabla/mat.tabla.js
Función:
- Crear contenedor visual de tabla/resumen del bloque actual
- Agregar toolbar para recargar, tomar editor y limpiar bloque
- Exponer accesos base al cuerpo del bloque visual
*/

(function (window, document) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  MAT.tabla = MAT.tabla || {};

  MAT.tabla.ids = {
    card: "mat-current-table-card",
    title: "mat-current-table-title",
    meta: "mat-current-table-meta",
    body: "mat-current-table-body"
  };

  MAT.tabla.ensure = function () {
    var app = document.querySelector(".mat-app");
    var existing = document.getElementById(MAT.tabla.ids.card);
    var section;
    var html = "";

    if (existing) return existing;
    if (!app) return null;

    section = document.createElement("section");
    section.className = "mat-card";
    section.id = MAT.tabla.ids.card;

    html += '<div style="display:grid;gap:10px;">';
    html += '  <div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;">';
    html += '    <div>';
    html += '      <h2 id="' + MAT.tabla.ids.title + '" style="margin:0;font-size:16px;">Datos actuales</h2>';
    html += '      <div id="' + MAT.tabla.ids.meta + '" style="margin-top:4px;color:#64748b;font-size:12px;">Selecciona una carrera y un tipo de carga.</div>';
    html += "    </div>";
    html += '    <div style="display:flex;flex-wrap:wrap;gap:8px;">';
    html += '      <button type="button" class="mat-btn" data-mat-table-toolbar="reload-db">Recargar desde base</button>';
    html += '      <button type="button" class="mat-btn" data-mat-table-toolbar="take-editor">Tomar del editor</button>';
    html += '      <button type="button" class="mat-btn" data-mat-table-toolbar="clear-block">Limpiar bloque</button>';
    html += "    </div>";
    html += "  </div>";
    html += '  <div id="' + MAT.tabla.ids.body + '" style="border:1px solid #e9edf5;border-radius:12px;background:#fcfdff;padding:12px;min-height:90px;">';
    html += '    <div style="color:#64748b;">Aún no hay datos para mostrar.</div>';
    html += "  </div>";
    html += "</div>";

    section.innerHTML = html;
    app.appendChild(section);
    return section;
  };

  MAT.tabla.getBody = function () {
    MAT.tabla.ensure();
    return document.getElementById(MAT.tabla.ids.body);
  };

  MAT.tabla.setTitle = function (text) {
    var el;
    MAT.tabla.ensure();
    el = document.getElementById(MAT.tabla.ids.title);
    if (el) el.textContent = String(text || "Datos actuales");
  };

  MAT.tabla.setMeta = function (text) {
    var el;
    MAT.tabla.ensure();
    el = document.getElementById(MAT.tabla.ids.meta);
    if (el) el.textContent = String(text || "");
  };
})(window, document);
