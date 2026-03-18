/* =========================================================
Nombre del archivo: menu.router.js
Ubicación: /menu/menu.router.js
Función o funciones:
- Navegación robusta para Live Server, file:// y Electron
- Construye la URL final desde la raíz detectada
- Soporta rutas configuradas en MenuConfig
========================================================= */
(function(){
  "use strict";

  function normalizeRoute(route){
    return String(route || "")
      .replace(/^\/+/, "")
      .trim();
  }

  function getKnownRoutes(){
    const cfg = window.MenuConfig || {};
    const items = Array.isArray(cfg.items) ? cfg.items : [];
    const routes = items
      .map(it => normalizeRoute(it.routeFromRoot))
      .filter(Boolean);

    const home = normalizeRoute(cfg.homeRoute || "menu/menu.index.html");
    if (home) routes.push(home);

    return Array.from(new Set(routes));
  }

  function detectRootBaseUrl(){
    try{
      const u = new URL(window.location.href);
      const path = u.pathname || "";
      const lowerPath = path.toLowerCase();

      const knownRoutes = getKnownRoutes()
        .map(x => "/" + x.toLowerCase());

      let idx = -1;
      let matchedLen = 0;

      for (const route of knownRoutes){
        const i = lowerPath.lastIndexOf(route);
        if (i !== -1 && i >= idx){
          idx = i;
          matchedLen = route.length;
        }
      }

      let rootPath = "";

      if (idx !== -1){
        rootPath = path.slice(0, idx + 1);
      }else{
        rootPath = path.replace(/[^/]*$/, "");
      }

      const base = `${u.protocol}//${u.host}${rootPath}`;
      return base.endsWith("/") ? base : (base + "/");
    }catch(err){
      console.warn("[menu.router] detectRootBaseUrl fallback:", err);
      return "./";
    }
  }

  function buildUrlFromRoot(routeFromRoot){
    const route = normalizeRoute(routeFromRoot);
    const base = detectRootBaseUrl();

    try{
      return new URL(route, base).href;
    }catch(err){
      console.warn("[menu.router] buildUrlFromRoot fallback:", err);
      return base + route;
    }
  }

  const MEM_KEY = "menu:lastRoute";

  function memSet(route){
    try{
      localStorage.setItem(MEM_KEY, normalizeRoute(route));
    }catch(_){}
  }

  function memGet(){
    try{
      return normalizeRoute(localStorage.getItem(MEM_KEY) || "");
    }catch(_){
      return "";
    }
  }

  function go(routeFromRoot){
    const route = normalizeRoute(routeFromRoot);
    if (!route) return;

    memSet(route);
    window.location.href = buildUrlFromRoot(route);
  }

  function isActive(routeFromRoot){
    try{
      const target = normalizeRoute(routeFromRoot).toLowerCase();
      if (!target) return false;

      const u = new URL(window.location.href);
      const current = (u.pathname || "").toLowerCase();

      const homeRoute = normalizeRoute(
        (window.MenuConfig && window.MenuConfig.homeRoute) || "menu/menu.index.html"
      ).toLowerCase();

      const isHome =
        current.endsWith("/" + homeRoute) ||
        current.endsWith(homeRoute);

      const last = memGet().toLowerCase();

      if (isHome && last){
        return last === target;
      }

      return current.endsWith("/" + target) || current.endsWith(target);
    }catch(_){
      return false;
    }
  }

  window.MenuRouter = {
    detectRootBaseUrl,
    buildUrlFromRoot,
    go,
    isActive
  };
})();