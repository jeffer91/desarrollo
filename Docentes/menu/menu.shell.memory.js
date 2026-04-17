/* =========================================================
Nombre del archivo: menu.shell.memory.js
Ruta - Ubicación: /menu/menu.shell.memory.js
Función:
- "Memoria" por pestaña: conserva un iframe por ruta (sin recargar al cambiar)
- Permite refrescar SOLO la pestaña activa (iframe activo)
Nota técnica:
- Script NO module para funcionar también en file:// (doble click)
========================================================= */
(function(){
  const cache = new Map(); // routeId -> iframe
  let activeId = "";

  function init(){
    // Tomamos el iframe existente como "plantilla" inicial (no cambiamos HTML de más)
    const base = document.getElementById("menuFrame");
    if (base){
      base.dataset.routeId = ""; // aún sin asignar
      base.style.display = "block";
    }
  }

  function getFrameForRoute(route){
    const id = String(route && route.id || "").trim();
    if (!id) return null;

    // Si ya existe en cache, devolverlo
    if (cache.has(id)) return cache.get(id);

    // Reutilizar el iframe base si aún no está asignado a ninguna ruta
    const base = document.getElementById("menuFrame");
    if (base && !base.dataset.routeId){
      base.dataset.routeId = id;
      base.src = route.href; // primera carga
      cache.set(id, base);
      return base;
    }

    // Crear uno nuevo para esta ruta (memoria real por pestaña)
    const wrap = document.querySelector(".frame-wrap");
    if (!wrap) return null;

    const fr = document.createElement("iframe");
    fr.className = "frame";
    fr.title = "Contenido";
    fr.referrerPolicy = "no-referrer";
    fr.dataset.routeId = id;

    // IMPORTANTE: se asigna src solo una vez (para no recargar al cambiar)
    fr.src = route.href;

    // Por defecto oculto, se mostrará al activar
    fr.style.display = "none";

    wrap.appendChild(fr);
    cache.set(id, fr);
    return fr;
  }

  function showRoute(route){
    const id = String(route && route.id || "").trim();
    if (!id) return;

    const fr = getFrameForRoute(route);
    if (!fr) return;

    // Oculta todos, muestra solo el activo
    for (const [, iframe] of cache){
      iframe.style.display = "none";
    }
    fr.style.display = "block";
    activeId = id;
  }

  function refreshActive(){
    if (!activeId) return;
    const fr = cache.get(activeId);
    if (!fr) return;

    try{
      // ✅ Recarga real sin cambiar de ruta
      fr.contentWindow.location.reload();
    } catch(e){
      // Fallback si el navegador bloquea el reload por alguna política
      fr.src = fr.src;
    }
  }

  // API global mínima (sin cambiar arquitectura)
  window.MenuMemory = {
    init,
    showRoute,
    refreshActive
  };
})();
