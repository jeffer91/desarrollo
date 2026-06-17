/*
=========================================================
Nombre completo: distribucion.table.js
Ruta o ubicación: /incorporaciones/sedes/distribucion/distribucion.table.js
Función o funciones:
- Renderizar la tabla resumen de distribución.
- Mostrar jornada, fecha, hora, carreras, total, diferencia y estado.
- Complementar la vista de tablero visual.
Con qué se une:
- distribucion.index.html
- distribucion.dom.js
- distribucion.logic.js
- distribucion.board.js
=========================================================
*/

(function () {
  "use strict";

  function render(state) {
    const elements = window.DistribucionDOM.getElements();

    if (!elements.summaryTableBody) {
      return;
    }

    if (!state.jornadas || state.jornadas.length === 0) {
      elements.summaryTableBody.innerHTML = `
        <tr>
          <td colspan="7">No existen jornadas creadas.</td>
        </tr>
      `;
      return;
    }

    const balance = window.DistribucionLogic.calculateBalance(
      state.distribucion,
      state.jornadas
    );

    elements.summaryTableBody.innerHTML = state.jornadas
      .map((jornada, index) => buildRow(jornada, index, state.distribucion, balance))
      .join("");
  }

  function buildRow(jornada, index, distribucion, balance) {
    const items = (distribucion || []).filter((item) => item.jornadaId === jornada.id);
    const total = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const balanceRow = balance.rows.find((row) => row.jornadaId === jornada.id);
    const difference = balanceRow ? balanceRow.difference : 0;
    const status = getStatus(difference, balance.level);

    return `
      <tr>
        <td>Jornada ${index + 1}</td>
        <td>${escape(window.DistribucionState.formatDate(jornada.fecha))}</td>
        <td>${escape(window.DistribucionState.formatTime(jornada.hora))}</td>
        <td>${buildCareersList(items)}</td>
        <td><strong>${total}</strong></td>
        <td>${difference > 0 ? "+" : ""}${difference}</td>
        <td><span class="${status.className}">${status.label}</span></td>
      </tr>
    `;
  }

  function buildCareersList(items) {
    if (!items.length) {
      return "Sin carreras asignadas";
    }

    return items
      .map((item) => {
        return `
          <div>
            <strong>${escape(item.carrera)}</strong>
            <small> ${escape(item.coordinador || "Sin coordinador")} | ${Number(item.total || 0)}</small>
          </div>
        `;
      })
      .join("");
  }

  function getStatus(difference, balanceLevel) {
    const abs = Math.abs(Number(difference || 0));

    if (balanceLevel === "danger" || abs > 35) {
      return {
        className: "status-danger",
        label: "Revisar"
      };
    }

    if (balanceLevel === "warning" || abs > 20) {
      return {
        className: "status-warn",
        label: "Aceptable"
      };
    }

    return {
      className: "status-ok",
      label: "Equilibrado"
    };
  }

  function escape(value) {
    return window.DistribucionDOM.escapeHtml(value);
  }

  window.DistribucionTable = {
    render
  };
})();