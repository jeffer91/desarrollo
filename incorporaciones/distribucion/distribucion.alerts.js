/*
=========================================================
Nombre completo: distribucion.alerts.js
Ruta o ubicación: /incorporaciones/sedes/distribucion/distribucion.alerts.js
Función o funciones:
- Mostrar alertas visuales en la pantalla Distribución.
- Informar carreras sin emparejar en Coordi.
- Informar problemas de validación antes de guardar.
- Mantener mensajes visibles y claros para el usuario.
Con qué se une:
- distribucion.index.html
- distribucion.dom.js
- distribucion.validate.js
- distribucion.logic.js
=========================================================
*/

(function () {
  "use strict";

  function show(alerts) {
    const elements = window.DistribucionDOM.getElements();

    if (!elements.distAlerts) {
      return;
    }

    const safeAlerts = Array.isArray(alerts) ? alerts : [];

    if (safeAlerts.length === 0) {
      elements.distAlerts.classList.add("hidden");
      elements.distAlerts.innerHTML = "";
      return;
    }

    elements.distAlerts.innerHTML = `
      <strong>Observaciones:</strong>
      <ul>
        ${safeAlerts.map((alert) => `<li>${escape(alert.message || alert)}</li>`).join("")}
      </ul>
    `;

    elements.distAlerts.classList.remove("hidden");
  }

  function clear() {
    show([]);
  }

  function escape(value) {
    return window.DistribucionDOM.escapeHtml(value);
  }

  window.DistribucionAlerts = {
    show,
    clear
  };
})();