/*
  Nombre completo: ta-titulo-articulo-admin-navegacion.app.js
  Ruta o ubicación: /Requisitos/Titulos/src/admin/ta-titulo-articulo-admin-navegacion.app.js
  Función o funciones:
  - Convertir el menú lateral del administrador en navegación real por secciones.
  - Mostrar únicamente la sección seleccionada y ocultar las demás.
  - Mantener activo visualmente el botón del menú seleccionado.
  - Recordar la sección usando el hash de la URL sin romper Electron ni Netlify.
  - Inyectar la vista IA y conexiones si un HTML antiguo todavía no la tiene.
  Se conecta con:
  - Requisitos/Titulos/public/ta-titulo-articulo-admin.html
  - Requisitos/Titulos/electron/admin/ta-titulo-articulo-administrador.html
  - Requisitos/Titulos/src/admin/ta-titulo-articulo-admin-ia.app.js
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

function insertarMenuIA() {
  if (document.querySelector('[data-ta-admin-tab="ia"]')) return;
  const menu = document.querySelector(".ta-admin-menu");
  const diagnostico = document.querySelector('[data-ta-admin-tab="diagnostico"]');
  if (!menu) return;

  const link = document.createElement("a");
  link.className = "ta-admin-menu__link";
  link.href = "#ia";
  link.dataset.taAdminTab = "ia";
  link.textContent = "IA y conexiones";
  if (diagnostico) menu.insertBefore(link, diagnostico);
  else menu.appendChild(link);
}

function insertarVistaIA() {
  if (document.querySelector('[data-ta-admin-view="ia"]')) return;
  const content = document.querySelector(".ta-admin-content");
  const diagnostico = document.querySelector('[data-ta-admin-view="diagnostico"]');
  if (!content) return;

  const section = document.createElement("section");
  section.className = "ta-admin-view";
  section.dataset.taAdminView = "ia";
  section.dataset.taAdminTitle = "IA y conexiones";
  section.dataset.taAdminDescription = "Pruebas seguras de Gemini, Groq y motor local de respaldo.";
  section.innerHTML = `
    <section class="ta-admin-grid ta-admin-grid--main ta-admin-section">
      <article class="ta-card ta-card--compact" id="ta-admin-ia-seguridad-card">
        <div class="ta-section-heading"><div><h2>Estado general de IA</h2><p>Las claves no se muestran ni se guardan en el navegador. Solo se consulta si existen en Netlify.</p></div></div>
        <dl class="ta-data-grid">
          <div><dt>Token admin</dt><dd id="ta-admin-ia-token">---</dd></div>
          <div><dt>Claves en frontend</dt><dd id="ta-admin-ia-frontend">---</dd></div>
          <div><dt>Gemini</dt><dd id="ta-admin-ia-gemini-estado">---</dd></div>
          <div><dt>Groq</dt><dd id="ta-admin-ia-groq-estado">---</dd></div>
          <div><dt>Motor local</dt><dd id="ta-admin-ia-local-estado">---</dd></div>
        </dl>
        <div class="ta-actions">
          <button class="ta-button ta-button--primary" type="button" id="ta-admin-ia-estado-btn">Ver estado IA</button>
          <button class="ta-button ta-button--secondary" type="button" id="ta-admin-ia-limpiar-token-btn">Limpiar token local</button>
        </div>
      </article>
      <article class="ta-card ta-card--compact" id="ta-admin-ia-pruebas-card">
        <div class="ta-section-heading"><div><h2>Pruebas de motores</h2><p>Ejecute pruebas sin revelar claves. Si Gemini o Groq fallan, el motor local debe quedar disponible.</p></div></div>
        <div class="ta-actions">
          <button class="ta-button ta-button--primary" type="button" id="ta-admin-ia-gemini-btn">Probar Gemini</button>
          <button class="ta-button ta-button--secondary" type="button" id="ta-admin-ia-groq-btn">Probar Groq</button>
          <button class="ta-button ta-button--secondary" type="button" id="ta-admin-ia-local-btn">Probar motor local</button>
        </div>
        <p class="ta-message" id="ta-admin-ia-mensaje" hidden></p>
        <div class="ta-empty-state" id="ta-admin-ia-resultado">Sin prueba ejecutada.</div>
      </article>
    </section>`;

  if (diagnostico) content.insertBefore(section, diagnostico);
  else content.appendChild(section);
}

async function cargarModuloIA() {
  try {
    await import("./ta-titulo-articulo-admin-ia.app.js");
  } catch (error) {
    console.error("[Títulos admin navegación] No se pudo cargar módulo IA", error);
  }
}

function prepararVistasExtra() {
  insertarMenuIA();
  insertarVistaIA();
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
  prepararVistasExtra();
  registrarMenu();
  mostrarVista(obtenerVistaInicial(), { actualizarHash: false });
  cargarModuloIA();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
