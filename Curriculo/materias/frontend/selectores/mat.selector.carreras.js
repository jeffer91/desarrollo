/*
Nombre del archivo: mat.selector.carreras.js
Ubicación: /Curriculo/materias/frontend/selectores/mat.selector.carreras.js
Función:
- Manejar selector de carreras
- Renderizar opciones ordenadas
- Mantener selección recordada
- Mostrar estado y tipo en texto auxiliar
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

  MAT.selectores.carreras = {
    getEl: function () {
      var selector = MAT.config && MAT.config.selectors && MAT.config.selectors.careerSelect;
      return selector ? document.querySelector(selector) : null;
    },

    render: function (list) {
      var el = this.getEl();
      var items = Array.isArray(list) ? list.slice() : [];
      var selected = MAT.state && MAT.state.data ? clean(MAT.state.data.selectedCareerId) : "";
      var html = '<option value="">Selecciona una carrera</option>';

      if (!el) return;

      items.sort(function (a, b) {
        return clean(a && a.nombre).localeCompare(clean(b && b.nombre), "es", {
          numeric: true,
          sensitivity: "base"
        });
      });

      items.forEach(function (item) {
        var id = clean(item && item.id);
        var label = clean(item && item.nombre) || id;
        var tipo = clean(item && item.tipo);
        var estado = clean(item && item.estado) || "activa";
        if (!id) return;
        html += '<option value="' + esc(id) + '" data-tipo="' + esc(tipo) + '" data-estado="' + esc(estado) + '"';
        if (id === selected) html += " selected";
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
      this.render((MAT.state && MAT.state.data && MAT.state.data.careers) || []);
      this.setValue((MAT.state && MAT.state.data && MAT.state.data.selectedCareerId) || "");
    },

    escape: esc
  };
})(window, document);
