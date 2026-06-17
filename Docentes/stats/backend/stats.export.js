/*
Nombre del archivo: stats.export.js
Ruta: stats/backend/stats.export.js
Función:
- Genera una exportación HTML imprimible de la vista activa
- Respeta la separación entre resumen global y detalle de capacitación
- Evita repetición en tablas exportadas
*/
(function attachStatsExport(window) {
  "use strict";

  window.STATS = window.STATS || {};

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function asText(value) {
    return value == null ? "" : String(value).trim();
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(value) {
    var text = asText(value);
    var parts = text.split("-");
    if (parts.length !== 3) return text || "—";
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  function buildPeriodoText(periodo) {
    if (Array.isArray(periodo)) {
      return periodo.filter(function eachItem(item) {
        return asText(item) && asText(item) !== "todos";
      }).join(" | ") || "Todos";
    }

    return asText(periodo) && asText(periodo) !== "todos" ? periodo : "Todos";
  }

  function tableSection(title, subtitle, headers, rows) {
    var safeHeaders = asArray(headers);
    var safeRows = asArray(rows);

    return [
      '<section class="export-section">',
      '<h2 class="export-section-title">', escapeHtml(title || "Tabla"), "</h2>",
      subtitle ? '<p class="export-section-subtitle">' + escapeHtml(subtitle) + "</p>" : "",
      safeRows.length
        ? [
            '<table class="export-table">',
            "<thead><tr>",
            safeHeaders.map(function eachHeader(item) {
              return "<th>" + escapeHtml(item) + "</th>";
            }).join(""),
            "</tr></thead>",
            "<tbody>",
            safeRows.map(function eachRow(row) {
              return [
                "<tr>",
                asArray(row).map(function eachCell(cell) {
                  return "<td>" + escapeHtml(cell) + "</td>";
                }).join(""),
                "</tr>"
              ].join("");
            }).join(""),
            "</tbody>",
            "</table>"
          ].join("")
        : '<div class="export-empty">Sin filas para mostrar.</div>',
      "</section>"
    ].join("");
  }

  function kpisSection(items) {
    return [
      '<section class="export-section">',
      '<h2 class="export-section-title">Indicadores principales</h2>',
      '<div class="export-kpi-grid">',
      asArray(items).map(function eachItem(item) {
        return [
          '<div class="export-kpi-card">',
          '<div class="export-kpi-label">', escapeHtml(item[0]), "</div>",
          '<div class="export-kpi-value">', escapeHtml(item[1]), "</div>",
          "</div>"
        ].join("");
      }).join(""),
      "</div>",
      "</section>"
    ].join("");
  }

  function infoSection(title, rows) {
    return [
      '<section class="export-section">',
      '<h2 class="export-section-title">', escapeHtml(title || "Información general"), "</h2>",
      '<div class="export-grid-2">',
      asArray(rows).map(function eachItem(item) {
        return [
          '<div class="export-chart-card">',
          '<div class="export-kpi-label">', escapeHtml(item[0]), "</div>",
          '<div>', escapeHtml(item[1]), "</div>",
          "</div>"
        ].join("");
      }).join(""),
      "</div>",
      "</section>"
    ].join("");
  }

  function buildHtmlDocument(title, subtitle, metaLabel, metaValue, sections) {
    return [
      "<!doctype html>",
      '<html lang="es">',
      "<head>",
      '<meta charset="utf-8" />',
      '<meta name="viewport" content="width=device-width,initial-scale=1" />',
      "<title>", escapeHtml(title || "Exportación Stats"), "</title>",
      "<style>",
      "body{font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;margin:0;padding:24px;color:#0f172a;}",
      ".export-wrap{max-width:1180px;margin:0 auto;display:grid;gap:16px;}",
      ".export-hero,.export-section{background:#fff;border:1px solid #dbe3ee;border-radius:18px;padding:18px;}",
      ".export-eyebrow{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#1d4ed8;margin-bottom:6px;}",
      ".export-title{margin:0;font-size:28px;line-height:1.1;}",
      ".export-subtitle{margin:8px 0 0;color:#64748b;line-height:1.45;}",
      ".export-meta{margin-top:12px;font-size:13px;color:#334155;}",
      ".export-section-title{margin:0 0 10px;font-size:18px;}",
      ".export-section-subtitle{margin:0 0 12px;color:#64748b;line-height:1.45;}",
      ".export-kpi-grid{display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:12px;}",
      ".export-kpi-card{border:1px solid #dbe3ee;border-radius:14px;padding:14px;background:#f8fbff;}",
      ".export-kpi-label{font-size:12px;color:#64748b;font-weight:700;margin-bottom:6px;}",
      ".export-kpi-value{font-size:28px;font-weight:700;line-height:1;}",
      ".export-grid-2{display:grid;grid-template-columns:repeat(2,minmax(260px,1fr));gap:14px;}",
      ".export-chart-card{border:1px solid #dbe3ee;border-radius:14px;padding:14px;background:#fff;}",
      ".export-table{width:100%;border-collapse:collapse;}",
      ".export-table thead th{background:#f8fafc;color:#64748b;font-size:12px;text-align:left;padding:10px;border-bottom:1px solid #dbe3ee;}",
      ".export-table tbody td{font-size:13px;padding:10px;border-bottom:1px solid #eef2f7;vertical-align:top;}",
      ".export-empty{border:1px dashed #dbe3ee;border-radius:12px;padding:14px;text-align:center;color:#64748b;background:#fafcff;}",
      "@media print{body{background:#fff;padding:0}.export-wrap{max-width:none}.export-hero,.export-section{box-shadow:none;break-inside:avoid;}}",
      "@media (max-width:900px){.export-kpi-grid,.export-grid-2{grid-template-columns:1fr;}}",
      "</style>",
      "</head>",
      "<body>",
      '<div class="export-wrap">',
      '<section class="export-hero">',
      '<div class="export-eyebrow">Stats · Exportación</div>',
      '<h1 class="export-title">', escapeHtml(title), "</h1>",
      '<p class="export-subtitle">', escapeHtml(subtitle), "</p>",
      '<div class="export-meta"><strong>', escapeHtml(metaLabel), ":</strong> ", escapeHtml(metaValue), "</div>",
      "</section>",
      asArray(sections).join(""),
      "</div>",
      "</body>",
      "</html>"
    ].join("");
  }

  function buildGlobalExportHtml(state) {
    var derived = state && state.derived ? state.derived : {};
    var metrics = derived && derived.metrics ? derived.metrics : {};
    var filters = state && state.filters ? state.filters : {};
    var issues = derived && derived.filteredInconsistencias ? derived.filteredInconsistencias : [];

    var sections = [];

    sections.push(kpisSection([
      ["Docentes únicos", metrics.docentesUnicosConCapacitacion || 0],
      ["Capacitaciones visibles", metrics.capacitacionesAsignadasUnicas || 0],
      ["Asignaciones visibles", metrics.asignacionesTotales || 0],
      ["Horas visibles", metrics.horasTotales || 0],
      ["Promedio horas/asignación", metrics.promedioHorasPorAsignacion || 0],
      ["Promedio capacitaciones/docente", metrics.promedioCapacitacionesPorDocente || 0]
    ]));

    sections.push(infoSection("Filtros aplicados", [
      ["Carrera", filters.carrera || "todos"],
      ["Período", buildPeriodoText(filters.periodo)],
      ["Capacitación", filters.capacitacion || "todos"],
      ["Sexo", filters.sexo || "todos"],
      ["Texto", filters.texto || "—"]
    ]));

    sections.push(tableSection(
      "Resumen por carrera",
      "Consolidado global visible por carrera.",
      ["#", "Carrera", "Asignaciones"],
      asArray(metrics.porCarrera).map(function eachItem(item, index) {
        return [index + 1, item.label || "—", item.total || 0];
      })
    ));

    sections.push(tableSection(
      "Resumen por sexo",
      "Consolidado global visible por sexo.",
      ["#", "Sexo", "Asignaciones"],
      asArray(metrics.porSexo).map(function eachItem(item, index) {
        return [index + 1, item.label || "—", item.total || 0];
      })
    ));

    sections.push(tableSection(
      "Resumen por período",
      "Consolidado global visible por período.",
      ["#", "Período", "Asignaciones"],
      asArray(metrics.porPeriodo).map(function eachItem(item, index) {
        return [index + 1, item.label || "—", item.total || 0];
      })
    ));

    sections.push(tableSection(
      "Inconsistencias visibles",
      "Solo se exportan las inconsistencias activas en el filtro actual.",
      ["#", "Tipo", "Entidad", "Nombre relacionado", "ID", "Observación"],
      asArray(issues).map(function eachItem(item, index) {
        return [
          index + 1,
          item.tipo || "issue",
          item.entidad || "entidad",
          item.nombre || item.docenteNombre || "—",
          item.id || item.docenteId || item.capacitacionId || "—",
          item.observacion || "Registro con alerta de calidad de datos."
        ];
      })
    ));

    return buildHtmlDocument(
      "Exportación global de stats",
      "Resumen consolidado según el filtro activo.",
      "Período visible",
      buildPeriodoText(filters.periodo),
      sections
    );
  }

  function buildDetailExportHtml(state) {
    var detail = state && state.derived ? state.derived.detail : null;
    var filters = state && state.filters ? state.filters : {};
    var issues = state && state.derived ? asArray(state.derived.filteredInconsistencias) : [];

    if (!detail || !detail.capacitacion) {
      return null;
    }

    var cap = detail.capacitacion || {};
    var participantes = asArray(detail.participantes);
    var resumenCarrera = asArray(detail.resumenCarrera);
    var resumenSexo = asArray(detail.resumenSexo);
    var kpis = detail.kpis || {};

    var sections = [];

    sections.push(infoSection("Ficha técnica", [
      ["Nombre de la capacitación", cap.nombre || "—"],
      ["Período", cap.periodoLabel || buildPeriodoText(filters.periodo)],
      ["Fecha de inicio", formatDate(cap.fechaInicio)],
      ["Fecha de finalización", formatDate(cap.fechaFin)],
      ["Duración total en horas", cap.horas || 0],
      ["Entidad", cap.imparte || "—"],
      ["Modalidad", cap.modalidad || "—"],
      ["Ámbito", cap.ambito || "—"]
    ]));

    sections.push(kpisSection([
      ["Docentes participantes", kpis.docentesParticipantes || 0],
      ["Carreras involucradas", kpis.carrerasInvolucradas || 0],
      ["Horas de la capacitación", kpis.horasCapacitacion || 0],
      ["Asignaciones registradas", kpis.asignacionesRegistradas || 0],
      ["Mujeres", kpis.mujeres || 0],
      ["Hombres", kpis.hombres || 0]
    ]));

    sections.push(tableSection(
      "Participantes nominales",
      "Detalle visible de participantes de la capacitación seleccionada.",
      ["#", "Docente", "Carrera", "Sexo", "Horas", "Estado"],
      participantes.map(function eachItem(item, index) {
        return [
          index + 1,
          item.docenteNombre || "—",
          item.carreraNombre || "—",
          item.sexo || "—",
          item.horas || 0,
          item.estadoRegistro || "Válido"
        ];
      })
    ));

    sections.push(tableSection(
      "Resumen por carrera",
      "Consolidado visible por carrera en la capacitación activa.",
      ["#", "Carrera", "Participantes", "Porcentaje", "Horas"],
      resumenCarrera.map(function eachItem(item, index) {
        return [
          index + 1,
          item.label || "—",
          item.participantes || 0,
          item.porcentaje || "0%",
          item.horas || 0
        ];
      })
    ));

    sections.push(tableSection(
      "Resumen por sexo",
      "Consolidado visible por sexo en la capacitación activa.",
      ["#", "Sexo", "Participantes", "Porcentaje"],
      resumenSexo.map(function eachItem(item, index) {
        return [
          index + 1,
          item.label || "—",
          item.participantes || 0,
          item.porcentaje || "0%"
        ];
      })
    ));

    sections.push(tableSection(
      "Inconsistencias visibles",
      "Inconsistencias activas mientras se revisa esta capacitación.",
      ["#", "Tipo", "Entidad", "Nombre relacionado", "ID", "Observación"],
      issues.map(function eachItem(item, index) {
        return [
          index + 1,
          item.tipo || "issue",
          item.entidad || "entidad",
          item.nombre || item.docenteNombre || "—",
          item.id || item.docenteId || item.capacitacionId || "—",
          item.observacion || "Registro con alerta de calidad de datos."
        ];
      })
    ));

    return buildHtmlDocument(
      "Exportación de detalle de capacitación",
      cap.nombre || "Detalle activo",
      "Período visible",
      cap.periodoLabel || buildPeriodoText(filters.periodo),
      sections
    );
  }

  function openHtml(html) {
    var printWindow = window.open("", "_blank", "noopener,noreferrer");

    if (!printWindow) {
      throw new Error("No se pudo abrir la ventana de exportación.");
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }

  function exportCurrentView() {
    var Store = window.STATS.Store;
    var state = Store && typeof Store.getState === "function" ? Store.getState() : {};
    var html = buildDetailExportHtml(state) || buildGlobalExportHtml(state);
    openHtml(html);
  }

  function bindExportButton(buttonId) {
    var button = document.getElementById(buttonId);

    if (!button || button.__statsExportBound) return;
    button.__statsExportBound = true;

    button.addEventListener("click", function onExportClick() {
      try {
        exportCurrentView();
      } catch (error) {
        console.error(error);
        alert(error && error.message ? error.message : "No se pudo exportar la vista.");
      }
    });
  }

  window.STATS.Export = {
    buildGlobalExportHtml: buildGlobalExportHtml,
    buildDetailExportHtml: buildDetailExportHtml,
    exportCurrentView: exportCurrentView,
    bindExportButton: bindExportButton
  };
})(window);