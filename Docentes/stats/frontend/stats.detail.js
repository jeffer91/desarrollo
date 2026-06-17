/*
Nombre del archivo: stats.detail.js
Ruta: stats/frontend/stats.detail.js
Función:
- Coordina ficha técnica, KPIs, gráficos, tablas e inconsistencias
- Mantiene estado de vista para gráficos y tablas
- Centraliza eventos de interacción, acordeones y modales
*/
(function attachStatsDetail(window) {
  "use strict";

  window.STATS = window.STATS || {};

  var chartsView = "bars";
  var tablesViewByBlock = {};
  var tablesOpenByBlock = {};

  function getTableView(blockId) {
    return tablesViewByBlock[blockId || "default"] || "table";
  }

  function setTableView(blockId, view) {
    tablesViewByBlock[blockId || "default"] = view || "table";
  }

  function isTableBlockOpen(blockId) {
    return !!tablesOpenByBlock[blockId || "default"];
  }

  function setTableBlockOpen(blockId, isOpen) {
    tablesOpenByBlock[blockId || "default"] = !!isOpen;
  }

  function renderHeader(state) {
    if (window.STATS.DetailHeader && typeof window.STATS.DetailHeader.render === "function") {
      window.STATS.DetailHeader.render(state);
    }
  }

  function renderKpis(state) {
    if (window.STATS.DetailKpis && typeof window.STATS.DetailKpis.render === "function") {
      window.STATS.DetailKpis.render(state);
    }
  }

  function renderCharts(state) {
    if (window.STATS.DetailCharts && typeof window.STATS.DetailCharts.render === "function") {
      window.STATS.DetailCharts.render(state, {
        view: chartsView,
        bindSectionEvents: bindSectionEvents
      });
    }
  }

  function renderTables(state) {
    if (window.STATS.DetailTables && typeof window.STATS.DetailTables.render === "function") {
      window.STATS.DetailTables.render(state, {
        getTableView: getTableView,
        isTableBlockOpen: isTableBlockOpen,
        bindSectionEvents: bindSectionEvents
      });
    }
  }

  function renderIssues(state) {
    if (window.STATS.DetailIssues && typeof window.STATS.DetailIssues.render === "function") {
      window.STATS.DetailIssues.render(state);
    }
  }

  function bindTableBlockToggles(host) {
    var blocks;

    if (!host || !host.querySelectorAll) return;

    blocks = host.querySelectorAll("[data-stats-table-block='1']");
    Array.prototype.forEach.call(blocks, function eachBlock(block) {
      if (!block || block.__statsToggleBound) return;
      block.__statsToggleBound = true;
      block.addEventListener("toggle", function onToggle() {
        var blockId = block.getAttribute("data-stats-table-block-id") || "default";
        setTableBlockOpen(blockId, block.open);
      });
    });
  }

  function bindSectionEvents(host, state) {
    if (!host) return;

    host.onclick = function onDetailSectionClick(event) {
      var target = event.target;
      var chartsButton;
      var tablesButton;
      var tableId;

      if (!target || !target.closest) return;

      chartsButton = target.closest("[data-stats-charts-view]");
      if (chartsButton) {
        chartsView = chartsButton.getAttribute("data-stats-charts-view") || "bars";
        renderCharts(state);
        return;
      }

      tablesButton = target.closest("[data-stats-tables-view]");
      if (tablesButton) {
        tableId = tablesButton.getAttribute("data-stats-table-id") || "default";
        setTableView(tableId, tablesButton.getAttribute("data-stats-tables-view") || "table");
        setTableBlockOpen(tableId, true);
        renderTables(state);
        return;
      }
    };

    host.ondblclick = function onDetailSectionDoubleClick(event) {
      var target = event.target;
      var DetailModals = window.STATS.DetailModals;
      var opener;
      var kind;
      var value;
      var scope;

      if (!target || !target.closest || !DetailModals) return;

      opener = target.closest("[data-stats-open='1']");
      if (!opener) return;

      kind = opener.getAttribute("data-kind") || "";
      value = opener.getAttribute("data-value") || "";
      scope = opener.getAttribute("data-scope") || "global";

      if (kind === "participante") {
        DetailModals.openParticipantModal(state, value);
        return;
      }

      if (kind === "carrera" || kind === "sexo" || kind === "capacitacion" || kind === "periodo") {
        DetailModals.openFieldModal(state, kind, value, scope);
      }
    };

    bindTableBlockToggles(host);
  }

  function render(state) {
    renderHeader(state);
    renderKpis(state);
    renderCharts(state);
    renderTables(state);
    renderIssues(state);
  }

  window.STATS.Detail = {
    render: render,
    renderHeader: renderHeader,
    renderKpis: renderKpis,
    renderCharts: renderCharts,
    renderTables: renderTables,
    renderIssues: renderIssues
  };
})(window);