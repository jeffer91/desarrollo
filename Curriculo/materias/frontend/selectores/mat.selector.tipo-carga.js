/*
Nombre del archivo: mat.selector.tipo-carga.js
Ubicación: /Curriculo/materias/frontend/selectores/mat.selector.tipo-carga.js
Función:
- Manejar el tipo de materias desde menú lateral
- Mantener el selector oculto para compatibilidad interna
- Marcar visualmente el tipo activo
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

  function getItems() {
    return (MAT.config && Array.isArray(MAT.config.loadTypes)) ? MAT.config.loadTypes : [];
  }

  function getDefaultValue() {
    var configured = clean(MAT.config && MAT.config.defaultLoadType);
    var items = getItems();
    return configured || clean(items[0] && items[0].value);
  }

  function dispatchNativeChange(el) {
    var event;
    if (!el) return;
    try {
      event = new Event("change", { bubbles: true });
    } catch (error) {
      event = document.createEvent("Event");
      event.initEvent("change", true, true);
    }
    el.dispatchEvent(event);
  }

  MAT.selectores.tipoCarga = {
    getEl: function () {
      var selector = MAT.config && MAT.config.selectors && MAT.config.selectors.loadTypeSelect;
      return selector ? document.querySelector(selector) : null;
    },

    getMenuEl: function () {
      var selector = MAT.config && MAT.config.selectors && MAT.config.selectors.loadTypeMenu;
      return selector ? document.querySelector(selector) : null;
    },

    render: function () {
      var el = this.getEl();
      var menu = this.getMenuEl();
      var items = getItems();
      var selected = MAT.state && MAT.state.data ? clean(MAT.state.data.selectedLoadType) : "";
      var html = "";
      var menuHtml = "";

      if (!selected) selected = getDefaultValue();

      if (el) {
        html = '<option value="">Tipo de materias</option>';
        items.forEach(function (item) {
          var value = clean(item && item.value);
          var label = clean(item && item.label) || value;
          if (!value) return;
          html += '<option value="' + esc(value) + '"';
          if (value === selected) html += " selected";
          html += ">" + esc(label) + "</option>";
        });
        el.innerHTML = html;
      }

      if (menu) {
        items.forEach(function (item) {
          var value = clean(item && item.value);
          var label = clean(item && item.label) || value;
          var active = value === selected;
          if (!value) return;
          menuHtml += '<button type="button" class="mat-side-btn' + (active ? ' is-active' : '') + '" data-mat-load-type="' + esc(value) + '" aria-pressed="' + (active ? 'true' : 'false') + '">' + esc(label) + '</button>';
        });
        menu.innerHTML = menuHtml;

        if (!menu.__matTypeMenuBound) {
          menu.addEventListener("click", function (event) {
            var button = event.target && event.target.closest ? event.target.closest("[data-mat-load-type]") : null;
            var value;
            if (!button) return;
            value = clean(button.getAttribute("data-mat-load-type"));
            MAT.selectores.tipoCarga.setValue(value);
            dispatchNativeChange(MAT.selectores.tipoCarga.getEl());
          });
          menu.__matTypeMenuBound = true;
        }
      }
    },

    setValue: function (value) {
      var el = this.getEl();
      var menu = this.getMenuEl();
      var normalized = clean(value) || getDefaultValue();
      var buttons;
      var i;
      var buttonValue;
      var active;

      if (el) el.value = normalized;

      if (menu) {
        buttons = menu.querySelectorAll("[data-mat-load-type]");
        for (i = 0; i < buttons.length; i += 1) {
          buttonValue = clean(buttons[i].getAttribute("data-mat-load-type"));
          active = buttonValue === normalized;
          buttons[i].classList.toggle("is-active", active);
          buttons[i].setAttribute("aria-pressed", active ? "true" : "false");
        }
      }
    },

    getValue: function () {
      var el = this.getEl();
      return el ? clean(el.value) : getDefaultValue();
    },

    getSelectedText: function () {
      var el = this.getEl();
      if (!el || !el.options || el.selectedIndex < 0) return "";
      return clean(el.options[el.selectedIndex].text);
    },

    syncFromState: function () {
      this.render();
      this.setValue((MAT.state && MAT.state.data && MAT.state.data.selectedLoadType) || getDefaultValue());
    },

    getDefaultValue: getDefaultValue,
    escape: esc
  };
})(window, document);
