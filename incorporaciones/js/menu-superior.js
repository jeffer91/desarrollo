/*
=========================================================
Nombre completo: menu-superior.js
Ruta o ubicación: /incorporaciones/js/menu-superior.js
Función o funciones:
1. Crear el menú superior reutilizable de Incorporaciones.
2. Permitir navegación entre Inicio, Administrador, Estadísticas y Mensajes.
3. Marcar visualmente la pantalla activa.
4. Soportar rutas desde la raíz y desde carpetas internas.
=========================================================
*/

(function () {
  "use strict";

  function obtenerBaseRuta(contenedor) {
    if (!contenedor) {
      return "";
    }

    return contenedor.getAttribute("data-base") || "";
  }

  function obtenerPantallaActiva(contenedor) {
    if (!contenedor) {
      return "";
    }

    return contenedor.getAttribute("data-active") || "";
  }

  function crearLink(texto, href, clave, activo) {
    const claseActiva = clave === activo ? " activo" : "";

    return `
      <a class="menu-superior-link${claseActiva}" href="${href}">
        ${texto}
      </a>
    `;
  }

  function renderizarMenuSuperior() {
    const contenedor = document.getElementById("menuSuperior");

    if (!contenedor) {
      return;
    }

    const base = obtenerBaseRuta(contenedor);
    const activo = obtenerPantallaActiva(contenedor);

    contenedor.innerHTML = `
      <nav class="menu-superior">
        <div class="menu-superior-inner">
          <div class="menu-superior-brand">
            <strong>UTET</strong>
            <span>Incorporaciones ITSQMET</span>
          </div>

          <div class="menu-superior-links">
            ${crearLink("Inicio", `${base}index.html`, "inicio", activo)}
            ${crearLink("Administrador", `${base}admin.html`, "admin", activo)}
            ${crearLink("Estadísticas", `${base}estadisticas/index.html`, "estadisticas", activo)}
            ${crearLink("Mensajes", `${base}mensaje/mjs-index.html`, "mensaje", activo)}
          </div>
        </div>
      </nav>
    `;
  }

  document.addEventListener("DOMContentLoaded", renderizarMenuSuperior);
})();
