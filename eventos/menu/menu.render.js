/* =========================================================
Nombre del archivo: menu.render.js
Ubicación: /menu/menu.render.js
Función o funciones:
- Renderiza el menú superior dentro de #menuHost
- Marca el item activo
- Emite eventos de navegación usando MenuRouter
- Permite volver al dashboard principal desde la marca
========================================================= */
(function(){
  "use strict";

  function esc(x){
    return String(x ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getCfg(){
    return window.MenuConfig || { items: [], brandTitle: "Eventos", brandHint: "", homeRoute: "menu/menu.index.html" };
  }

  function render(){
    const host = document.getElementById("menuHost");
    if (!host) return;

    const cfg = getCfg();
    const R = window.MenuRouter;
    const items = Array.isArray(cfg.items) ? cfg.items : [];

    const activeItem = items.find(it => {
      return R && typeof R.isActive === "function" ? R.isActive(it.routeFromRoot) : false;
    }) || null;

    const linksHTML = items.map(it => {
      const active = (R && typeof R.isActive === "function")
        ? R.isActive(it.routeFromRoot)
        : false;

      return `
        <button
          class="menuItem ${active ? "active" : ""}"
          type="button"
          data-route="${esc(it.routeFromRoot)}"
          aria-current="${active ? "page" : "false"}"
          title="${esc(it.desc || it.title || "")}"
        >
          ${esc(it.title)}
        </button>
      `;
    }).join("");

    host.innerHTML = `
      <div class="menuBar" role="navigation" aria-label="Menú principal">
        <div class="menuLeft">
          <button
            class="menuBrandBtn"
            type="button"
            data-home="${esc(cfg.homeRoute || "menu/menu.index.html")}"
            title="Ir al menú principal"
          >
            <span class="menuDot"></span>
            <span class="menuBrandText">
              <span class="menuTitle">${esc(cfg.brandTitle || "Eventos")}</span>
              <span class="menuBrandHint">${esc(cfg.brandHint || "")}</span>
            </span>
          </button>
        </div>

        <div class="menuCenter">
          ${linksHTML}
        </div>

        <div class="menuRight">
          <span class="menuHint">${esc(activeItem ? activeItem.title : "Menú principal")}</span>
        </div>
      </div>
    `;
  }

  function wire(){
    const host = document.getElementById("menuHost");
    if (!host) return;
    if (host.dataset.wired === "1") return;

    host.dataset.wired = "1";

    host.addEventListener("click", (e) => {
      const btnRoute = e.target?.closest?.("button[data-route]");
      const btnHome = e.target?.closest?.("button[data-home]");
      const R = window.MenuRouter;

      if (btnRoute){
        const route = btnRoute.dataset.route || "";
        if (R && typeof R.go === "function") R.go(route);
        return;
      }

      if (btnHome){
        const route = btnHome.dataset.home || "";
        if (R && typeof R.go === "function") R.go(route);
      }
    });
  }

  window.MenuRender = { render, wire };
})();