/*
=========================================================
Nombre completo: certi.menu.js
Ruta o ubicación: /incorporaciones/sedes/certi/certi.menu.js
Función o funciones:
- Marcar la opción Certi como activa dentro del menú de Incorporaciones.
- Crear un menú mínimo de respaldo si el menú superior general no se carga.
- Mantener la pantalla Certi funcional aunque falle el menú principal.
Con qué se une:
- certi.html
- ../js/menu-superior.js
- ../css/menu.css
=========================================================
*/

(function () {
  "use strict";

  function iniciarMenuCerti() {
    marcarActivo();
    crearMenuRespaldoSiHaceFalta();
  }

  function marcarActivo() {
    const enlaces = document.querySelectorAll("a, button");

    enlaces.forEach(function (enlace) {
      const texto = String(enlace.textContent || "").trim().toLowerCase();
      const href = String(enlace.getAttribute("href") || "").toLowerCase();

      if (texto === "certi" || href.includes("/certi/") || href.includes("certi.html")) {
        enlace.classList.add("activo");
        enlace.classList.add("active");
        enlace.setAttribute("aria-current", "page");
      }
    });
  }

  function crearMenuRespaldoSiHaceFalta() {
    const contenedor = document.getElementById("menuSuperior");

    if (!contenedor) return;

    const tieneContenido = String(contenedor.innerHTML || "").trim().length > 0;

    if (tieneContenido) return;

    contenedor.innerHTML = `
      <nav class="certi-menu-respaldo">
        <a href="../index.html">Inicio</a>
        <a href="../admin.html">Administración</a>
        <a href="./certi.html" class="active activo">Certi</a>
      </nav>
    `;
  }

  document.addEventListener("DOMContentLoaded", iniciarMenuCerti);

  window.CertiMenu = {
    iniciarMenuCerti,
    marcarActivo,
    crearMenuRespaldoSiHaceFalta
  };
})();