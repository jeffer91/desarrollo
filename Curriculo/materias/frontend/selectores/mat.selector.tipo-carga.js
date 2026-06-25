/*
Nombre del archivo: mat.selector.tipo-carga.js
Ubicación: /Curriculo/materias/frontend/selectores/mat.selector.tipo-carga.js
Función:
- Manejar selector de tipo de carga
- Renderizar opciones desde configuración
- Mantener selección recordada
*/

(function (window, document) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  MAT.selectores = MAT.selectores || {};

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  MAT.selectores.tipoCarga = {
    getEl: function () {
      var selector = MAT.config && MAT.config.selectors && MAT.config.selectors.loadTypeSelect;
      return selector ? document.querySelector(selector) : null;
    },

    render: function () {
      var el = this.getEl();
      var items = (MAT.config && Array.isArray(MAT.config.loadTypes)) ? MAT.config.loadTypes : [];
      var selected = MAT.state && MAT.state.data ? clean(MAT.state.data.selectedLoadType) : "";
      var html = '<option value="">Selecciona un tipo de carga</option>';

      if (!el) return;

      items.forEach(function (item) {
        var value = clean(item && item.value);
        var label = clean(item && item.label) || value;
        if (!value) return;
        html += '<option value="' + esc(value) + '"';
        if (value === selected) html += " selected";
        html += ">" + esc(label) + "</option>";
      });

      el.innerHTML = html;
    },

    setValue: function (value) {
      var el = this.getEl();
      if (el) el.value = clean(value);
    },

    getValue: function () {
      var el = this.getEl();
      return el ? clean(el.value) : "";
    },

    getSelectedText: function () {
      var el = this.getEl();
      if (!el || !el.options || el.selectedIndex < 0) return "";
      return clean(el.options[el.selectedIndex].text);
    },

    syncFromState: function () {
      this.render();
      this.setValue((MAT.state && MAT.state.data && MAT.state.data.selectedLoadType) || "");
    },

    escape: esc
  };
})(window, document);
