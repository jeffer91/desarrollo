/*
  Nombre completo: ta-titulo-articulo-admin-navegacion.app.js
  Ruta o ubicación: /Requisitos/Titulos/src/admin/ta-titulo-articulo-admin-navegacion.app.js
  Función o funciones:
  - Convertir el menú lateral del administrador en navegación real por secciones.
  - Mostrar únicamente la sección seleccionada y ocultar las demás.
  - Mantener activo visualmente el botón del menú seleccionado.
  - Recordar la sección usando el hash de la URL sin romper Electron ni Netlify.
  Se conecta con:
  - Requisitos/Titulos/public/ta-titulo-articulo-admin.html
  - Requisitos/Titulos/electron/admin/ta-titulo-articulo-administrador.html
*/

const DEFAULT_VIEW = "inicio";

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

function byId(id) {
  return document.getElementById(id);
}

function normalizarVista(value = "") {
  const vista = clean(value).replace(/^#/, "");
  return vista || DEFAULT_VIEW;
}

function obtenerVistaInicial() {
  const hash = normalizarVista(window.location.hash);
  const existeHash = document.querySelector(`[data-ta-admin-view="${hash}"]`);
  return existeHash ? hash : DEFAULT_VIEW;
}

function actualizarTitulo(vista) {
  const panel = document.querySelector(`[data-ta-admin-view="${vista}"]`);
  const titulo = clean(panel?.dataset.taAdminTitle || panel?.querySelector("h2")?.textContent || "Administrador");
  const detalle = clean(panel?.dataset.taAdminDescription || panel?.querySelector("p")?.textContent || "Sección administrativa");

  const tituloActual = byId("ta-admin-vista-titulo");
  const detalleActual = byId("ta-admin-vista-detalle");
  if (tituloActual) tituloActual.textContent = titulo;
  if (detalleActual) detalleActual.textContent = detalle;
}

function mostrarVista(vistaSolicitada, { actualizarHash = true } = {}) {
  const vista = normalizarVista(vistaSolicitada);
  const panelActivo = document.querySelector(`[data-ta-admin-view="${vista}"]`);
  const vistaFinal = panelActivo ? vista : DEFAULT_VIEW;

  document.querySelectorAll("[data-ta-admin-view]").forEach((panel) => {
    const activa = panel.dataset.taAdminView === vistaFinal;
    panel.hidden = !activa;
    panel.classList.toggle("ta-admin-view--active", activa);
  });

  document.querySelectorAll("[data-ta-admin-tab]").forEach((link) => {
    const activa = link.dataset.taAdminTab === vistaFinal;
    link.classList.toggle("ta-admin-menu__link--active", activa);
    link.setAttribute("aria-current", activa ? "page" : "false");
  });

  actualizarTitulo(vistaFinal);

  if (actualizarHash && window.location.hash !== `#${vistaFinal}`) {
    history.replaceState(null, "", `#${vistaFinal}`);
  }
}

function registrarMenu() {
  document.querySelectorAll("[data-ta-admin-tab]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      mostrarVista(link.dataset.taAdminTab || DEFAULT_VIEW);
      byId("ta-admin-vista-titulo")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  window.addEventListener("hashchange", () => mostrarVista(obtenerVistaInicial(), { actualizarHash: false }));
}

function init() {
  registrarMenu();
  mostrarVista(obtenerVistaInicial(), { actualizarHash: false });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
