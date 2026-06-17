/* =========================================================
Nombre del archivo: menu.shell.app.js
Ruta - Ubicación: /menu/menu.shell.app.js
Función o funciones:
- Boot del menú superior fijo
- Render de navegación desde MENU_ROUTES
- Carga de pantallas dentro de iframe
- Sincroniza estado con location.hash para back y forward

FIX:
- Evita import estático, que no funciona con doble click en file:// por CORS.
- Carga dinámica de menu.routes.js cuando hay servidor.
- Usa fallback de rutas cuando está en file:// para que el menú igual funcione.

✅ ACTUALIZACIÓN:
- El fallback file:// queda idéntico a menu.routes.js.
- Se agrega la opción "Formación".
========================================================= */

// FIX: antes era import estático. En file:// esto rompe por seguridad del navegador.
// import { MENU_ROUTES } from "./menu.routes.js";

let MENU_ROUTES = [];

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------------------------------------------------------
// FIX: carga rutas con import() solo cuando es posible.
// - En http/https: intenta importar ./menu.routes.js
// - En file://: usa fallback mínimo para que el menú funcione
// ---------------------------------------------------------
async function loadMenuRoutes() {
  const isFile = location.protocol === "file:";

  if (!isFile) {
    try {
      const mod = await import("./menu.routes.js");
      const list = Array.isArray(mod?.MENU_ROUTES) ? mod.MENU_ROUTES : [];
      if (list.length) return list;
    } catch (_) {
      // Si falla el import, caemos al fallback para no dejar la UI muerta.
    }
  }

  // FIX: fallback para doble click en file://
  // Debe ser idéntico a menu.routes.js
  return [
    {
      id: "regDocentes",
      label: "Registro docentes",
      href: "../registro.manage/regman.index.html",
      default: true
    },
    {
      id: "regCapacitacion",
      label: "Registro capacitación",
      href: "../cap.manage/cap.manage.index.html"
    },
    {
      id: "asigDocente",
      label: "Asignación docente",
      href: "../cap.assign/cap.assign.index.html"
    },
    {
      id: "formacion",
      label: "Formación",
      href: "../formacion/frontend/for.index.html"
    },
    {
      id: "ctrDocs",
      label: "Documentos",
      href: "../control/ctr.docs/frontend/ctr.index.html"
    },
    {
      id: "estadisticas",
      label: "Estadísticas",
      href: "../stats/frontend/stats.index.html"
    }
  ];
}

function getDefaultRoute() {
  const list = Array.isArray(MENU_ROUTES) ? MENU_ROUTES : [];
  return list.find((route) => route.default) || list[0] || null;
}

function getRouteById(id) {
  const key = String(id || "").trim();
  return (MENU_ROUTES || []).find((route) => route.id === key) || null;
}

function readHashRouteId() {
  // hash esperado:
  // #regDocentes
  // #regCapacitacion
  // #asigDocente
  // #formacion
  // #ctrDocs
  // #estadisticas
  const hash = String(window.location.hash || "").replace("#", "").trim();
  return hash || "";
}

function setHint(text) {
  const el = $("menuHint");
  if (!el) return;
  el.textContent = text || "";
}

function setActive(routeId) {
  const nav = $("menuNav");
  if (!nav) return;

  const btns = nav.querySelectorAll("a.navbtn[data-id]");
  btns.forEach((btn) => {
    const id = btn.getAttribute("data-id") || "";
    btn.dataset.active = id === routeId ? "true" : "false";
  });
}

function loadInFrame(route) {
  const frame = $("menuFrame");
  if (!frame || !route) return;

  frame.src = route.href;
  setActive(route.id);
  setHint(`Abierto: ${route.label}`);
}

function renderNav() {
  const nav = $("menuNav");
  if (!nav) return;

  const html = [];

  for (const route of MENU_ROUTES || []) {
    const id = escapeHtml(route.id);
    const label = escapeHtml(route.label);
    const pill = escapeHtml(route.pill || "");

    html.push(`
      <a class="navbtn" href="#${id}" data-id="${id}" data-active="false">
        <span>${label}</span>
        ${pill ? `<span class="pill">${pill}</span>` : ""}
      </a>
    `);
  }

  nav.innerHTML = html.join("");

  // Delegación click para evitar comportamiento raro del navegador
  nav.onclick = (ev) => {
    const anchor = ev.target?.closest
      ? ev.target.closest("a.navbtn[data-id]")
      : null;

    if (!anchor) return;

    ev.preventDefault();

    const id = anchor.getAttribute("data-id") || "";
    if (!id) return;

    const nextHash = `#${id}`;

    // Si el hash ya es el mismo, hashchange no dispara
    // Forzamos carga manual para que el botón siga respondiendo
    if ((window.location.hash || "") === nextHash) {
      resolveAndLoad();
    } else {
      window.location.hash = nextHash;
    }
  };
}

function resolveAndLoad() {
  const id = readHashRouteId();
  const route = getRouteById(id) || getDefaultRoute();

  if (!route) {
    setHint("No hay rutas configuradas.");
    return;
  }

  loadInFrame(route);
}

// FIX: ahora es async porque primero carga MENU_ROUTES
export async function bootMenuShell() {
  MENU_ROUTES = await loadMenuRoutes();

  renderNav();
  resolveAndLoad();

  window.addEventListener("hashchange", () => {
    resolveAndLoad();
  });

  const initialRoute = getRouteById(readHashRouteId()) || getDefaultRoute();
  if (initialRoute) {
    setHint(`Listo. Inicio: ${initialRoute.label}`);
  }
}

/* FIX:
Este archivo se carga por <script type="module" src="...">.
Si no llamamos el boot aquí, el menú y el iframe quedan en blanco.
*/
bootMenuShell();