/*
Nombre completo: ctl.render.global.js
Ruta o ubicación: /control/ctl.render.global.js
Función o funciones:
- Renderizar las tarjetas del resumen global
- Mostrar totales y porcentajes principales del módulo
*/

function ctlMetricCard(title, value, helper) {
  return `
    <article class="ctl-metric-card">
      <h3>${title}</h3>
      <p>${value}</p>
      <span>${helper}</span>
    </article>
  `;
}

function ctlRenderGlobalSummary(stats) {
  const node = document.getElementById("ctlGlobalCards");
  if (!node) return;

  node.innerHTML = [
    ctlMetricCard("Total carreras", stats.totalCarreras, "Carreras visibles"),
    ctlMetricCard("Total materias", stats.totalMaterias, "Materias visibles"),
    ctlMetricCard("PEA", `${stats.conPea} · ${stats.peaPct}%`, "Con PEA cargado"),
    ctlMetricCard("Fichas", `${stats.conFicha} · ${stats.fichaPct}%`, "Con ficha generada"),
    ctlMetricCard("Actas", `${stats.conActa} · ${stats.actaPct}%`, "Con acta generada"),
    ctlMetricCard("Completos", `${stats.completos} · ${stats.completoPct}%`, "PEA + ficha + acta")
  ].join("");
}

export {
  ctlRenderGlobalSummary
};