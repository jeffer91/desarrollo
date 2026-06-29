/*
  Nombre completo: ta-titulo-articulo-sugerencias-ui.app.js
  Ruta o ubicación: /Requisitos/Titulos/src/estudiante/ta-titulo-articulo-sugerencias-ui.app.js
  Función o funciones:
  - Mejorar visualmente las 3 sugerencias generadas por el motor interno.
  - Etiquetar cada sugerencia según el momento del proceso investigativo.
  - Mantener una presentación clara: inicio, desarrollo/proceso y final/resultados.
  - No modifica Firebase ni el guardado de títulos; solo mejora la interfaz.
  Se conecta con:
  - Requisitos/Titulos/public/ta-titulo-articulo-estudiante.html
  - Requisitos/Titulos/src/estudiante/ta-titulo-articulo-estudiante.app.js
  - Requisitos/Titulos/src/services/ta-titulo-articulo-motor-local.service.js
*/

const ETAPAS_SUGERENCIAS = Object.freeze([
  {
    nombre: "Sugerencia 1",
    momento: "Inicio",
    enfoque: "Diagnóstico, análisis o caracterización del problema"
  },
  {
    nombre: "Sugerencia 2",
    momento: "Desarrollo / proceso",
    enfoque: "Propuesta, estrategia, plan de mejora o fortalecimiento"
  },
  {
    nombre: "Sugerencia 3",
    momento: "Final / resultados",
    enfoque: "Evaluación de resultados, validación o impacto cuando aplique"
  }
]);

function crearTexto(texto, className = "") {
  const span = document.createElement("span");
  span.textContent = texto;
  if (className) span.className = className;
  return span;
}

function crearEtiqueta(etapa) {
  const wrapper = document.createElement("div");
  wrapper.className = "ta-sugerencia-etapa";

  const badge = crearTexto(etapa.nombre, "ta-sugerencia-etapa__badge");
  const content = document.createElement("div");
  content.className = "ta-sugerencia-etapa__content";

  const momento = crearTexto(etapa.momento, "ta-sugerencia-etapa__momento");
  const enfoque = crearTexto(etapa.enfoque, "ta-sugerencia-etapa__enfoque");

  content.append(momento, enfoque);
  wrapper.append(badge, content);
  return wrapper;
}

function decorarContenedor(container) {
  if (!container) return;
  const cards = Array.from(container.querySelectorAll(".ta-state-box:not(.ta-state-box--error)"));

  cards.slice(0, 3).forEach((card, index) => {
    if (card.querySelector(".ta-sugerencia-etapa")) return;
    const etapa = ETAPAS_SUGERENCIAS[index];
    if (!etapa) return;
    card.prepend(crearEtiqueta(etapa));
  });
}

function decorarSugerencias() {
  document.querySelectorAll("[data-ta-sugerencias]").forEach(decorarContenedor);
}

function actualizarBotones() {
  document.querySelectorAll("[data-ta-generar-sugerencias]").forEach((button) => {
    button.textContent = "Generar 3 sugerencias inteligentes";
    button.setAttribute("aria-label", "Generar tres sugerencias inteligentes de título académico");
  });
}

function inyectarEstilos() {
  if (document.getElementById("ta-sugerencias-ui-styles")) return;

  const style = document.createElement("style");
  style.id = "ta-sugerencias-ui-styles";
  style.textContent = `
    .ta-sugerencia-etapa {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: start;
      gap: 10px;
      margin-bottom: 2px;
    }

    .ta-sugerencia-etapa__badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 28px;
      padding: 5px 9px;
      border-radius: 999px;
      background: var(--ta-color-azul-marino);
      color: var(--ta-color-blanco);
      font-size: 0.72rem;
      font-weight: 900;
      white-space: nowrap;
      box-shadow: 0 8px 16px rgba(7, 21, 39, 0.16);
    }

    .ta-sugerencia-etapa__content {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    .ta-sugerencia-etapa__momento {
      color: var(--ta-color-azul-marino);
      font-size: 0.88rem;
      font-weight: 950;
      letter-spacing: -0.01em;
    }

    .ta-sugerencia-etapa__enfoque {
      color: var(--ta-color-texto-suave);
      font-size: 0.78rem;
      font-weight: 750;
      line-height: 1.3;
    }
  `;
  document.head.appendChild(style);
}

function init() {
  inyectarEstilos();
  actualizarBotones();
  decorarSugerencias();

  const observer = new MutationObserver(() => {
    actualizarBotones();
    decorarSugerencias();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
