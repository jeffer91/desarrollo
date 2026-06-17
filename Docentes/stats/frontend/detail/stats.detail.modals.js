/*
Nombre del archivo: stats.detail.modals.js
Ruta: stats/frontend/detail/stats.detail.modals.js
Función:
- Abre modales de detalle para participante, agrupaciones e inconsistencias
- Reutiliza el modal base del módulo stats
- Construye tablas nominales sin repetir registros
*/
(function attachStatsDetailModals(window) {
  "use strict";

  window.STATS = window.STATS || {};

  function getHelpers() {
    return window.STATS.DetailHelpers || {};
  }

  function asArray(value) {
    var Helpers = getHelpers();
    return Helpers.asArray ? Helpers.asArray(value) : (Array.isArray(value) ? value : []);
  }

  function asText(value) {
    var Helpers = getHelpers();
    return Helpers.asText ? Helpers.asText(value) : (value == null ? "" : String(value).trim());
  }

  function asNumber(value) {
    var Helpers = getHelpers();
    return Helpers.asNumber ? Helpers.asNumber(value) : (Number(value) || 0);
  }

  function getFilteredAsignaciones(state) {
    var Helpers = getHelpers();
    return Helpers.getFilteredAsignaciones ? Helpers.getFilteredAsignaciones(state) : [];
  }

  function getFilteredInconsistencias(state) {
    var Helpers = getHelpers();
    return Helpers.getFilteredInconsistencias ? Helpers.getFilteredInconsistencias(state) : [];
  }

  function getDetail(state) {
    var Helpers = getHelpers();
    return Helpers.getDetail ? Helpers.getDetail(state) : null;
  }

  function openAssignmentsModal(title, subtitle, rows, headers) {
    var Modal = window.STATS.Modal;
    var Tables = window.STATS.Tables;

    if (!Modal || !Tables) return;

    Modal.open({
      title: title || "Detalle",
      subtitle: subtitle || "",
      size: "lg",
      contentHtml: Tables.buildTableCard(
        title || "Detalle",
        subtitle || "",
        headers || [],
        rows || []
      )
    });
  }

  function openParticipantModal(state, participantName) {
    var Modal = window.STATS.Modal;
    var Tables = window.STATS.Tables;
    var detail = getDetail(state);
    var rows;
    var infoItems;
    var participantRows;

    if (!Modal || !Tables) return;

    rows = getFilteredAsignaciones(state).filter(function eachItem(item) {
      return asText(item && item.docenteNombre) === asText(participantName);
    });

    if (!rows.length) return;

    participantRows = rows.map(function eachItem(item, index) {
      return [
        index + 1,
        item.capacitacionNombre || "—",
        item.carreraNombre || "—",
        item.sexo || "—",
        item.horas || 0,
        item.periodoLabel || "—"
      ];
    });

    infoItems = [
      ["Docente", participantName || "—"],
      ["Asignaciones visibles", rows.length],
      ["Horas visibles", rows.reduce(function reducer(acc, item) { return acc + asNumber(item && item.horas); }, 0)],
      ["Capacitaciones únicas", (function countCaps() {
        var seen = {};
        var total = 0;
        rows.forEach(function eachItem(item) {
          var key = asText(item && item.capacitacionId);
          if (!key || seen[key]) return;
          seen[key] = true;
          total += 1;
        });
        return total;
      })()],
      ["Contexto", detail && detail.capacitacion ? "Detalle de capacitación" : "Resumen global"]
    ];

    Modal.open({
      title: "Detalle de participante",
      subtitle: participantName || "Docente",
      size: "lg",
      contentHtml: [
        Modal.buildInfoList(infoItems),
        Tables.buildTableCard(
          "Asignaciones visibles del participante",
          "Consolidado del participante según el filtro activo.",
          ["#", "Capacitación", "Carrera", "Sexo", "Horas", "Período"],
          participantRows
        )
      ].join("")
    });
  }

  function openFieldModal(state, kind, value, scope) {
    var Helpers = getHelpers();
    var detail = getDetail(state);
    var rows = [];
    var title = "Detalle";
    var subtitle = value || "Sin valor";

    if (kind === "capacitacion") {
      rows = getFilteredAsignaciones(state).filter(function eachItem(item) {
        return asText(item && item.capacitacionNombre) === asText(value);
      });
      title = "Asignaciones por capacitación";
    } else if (scope === "detail" && detail) {
      if (kind === "carrera") {
        rows = asArray(detail.participantes).filter(function eachItem(item) {
          return asText(item && item.carreraNombre) === asText(value);
        });
        title = "Participantes por carrera";
      } else if (kind === "sexo") {
        rows = asArray(detail.participantes).filter(function eachItem(item) {
          return asText(item && item.sexo) === asText(value);
        });
        title = "Participantes por sexo";
      }
    } else {
      rows = getFilteredAsignaciones(state).filter(function eachItem(item) {
        if (kind === "carrera") {
          return asText(item && item.carreraNombre) === asText(value);
        }
        if (kind === "sexo") {
          return asText(item && item.sexo) === asText(value);
        }
        if (kind === "periodo") {
          return asText(item && item.periodoLabel) === asText(value);
        }
        return false;
      });

      if (kind === "carrera") title = "Asignaciones por carrera";
      if (kind === "sexo") title = "Asignaciones por sexo";
      if (kind === "periodo") title = "Asignaciones por período";
    }

    openAssignmentsModal(
      title || "Detalle",
      subtitle,
      rows.map(function eachItem(item, index) {
        return [
          index + 1,
          item.docenteNombre || "—",
          item.carreraNombre || "—",
          item.capacitacionNombre || "—",
          item.sexo || "—",
          item.horas || 0,
          item.periodoLabel || "—"
        ];
      }),
      ["#", "Docente", "Carrera", "Capacitación", "Sexo", "Horas", "Período"]
    );
  }

  function openIssueModal(state, index) {
    var Modal = window.STATS.Modal;
    var item = getFilteredInconsistencias(state)[index];

    if (!Modal || !item) return;

    Modal.open({
      title: "Detalle de inconsistencia",
      subtitle: item.tipo || "Issue",
      size: "md",
      contentHtml: Modal.buildInfoList([
        ["Tipo", item.tipo || "—"],
        ["Entidad", item.entidad || "—"],
        ["Nombre relacionado", item.nombre || item.docenteNombre || "—"],
        ["ID", item.id || item.docenteId || item.capacitacionId || "—"],
        ["Observación", item.observacion || "Registro con observación."]
      ])
    });
  }

  window.STATS.DetailModals = {
    openAssignmentsModal: openAssignmentsModal,
    openParticipantModal: openParticipantModal,
    openFieldModal: openFieldModal,
    openIssueModal: openIssueModal
  };
})(window);