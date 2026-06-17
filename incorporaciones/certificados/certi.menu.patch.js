/*
=========================================================
Nombre completo: certi.menu.patch.js
Ruta o ubicación: /incorporaciones/sedes/certi/certi.menu.patch.js

Función o funciones:
- Agregar la opción Certi al menú superior de Incorporaciones si todavía no existe.
- Evitar modificar de forma agresiva el archivo global menu-superior.js.
- Permitir que Certi aparezca como acceso directo dentro del menú principal.
- Mantener el módulo independiente.

Con qué se une:
- certi.index.html
- certi.menu.js
- ../js/menu-superior.js

Uso recomendado:
- Cargar este archivo después de ../js/menu-superior.js.
- Si el menú global ya permite registrar módulos, este archivo intenta usarlo.
- Si no existe registro global, inserta el enlace manualmente.
=========================================================
*/

(function () {
  "use strict";

  const CERTI_MENU_ITEM = {
    id: "certi",
    texto: "Certi",
    label: "Certi",
    titulo: "Certi",
    href: "./certi/certi.index.html",
    url: "./certi/certi.index.html",
    ruta: "./certi/certi.index.html",
    orden: 90
  };

  function iniciarPatchMenuCerti() {
    intentarRegistrarEnMenuGlobal();
    insertarEnlaceSiNoExiste();
    marcarActivoSiCorresponde();
  }

  function intentarRegistrarEnMenuGlobal() {
    try {
      if (
        window.MenuSuperior &&
        typeof window.MenuSuperior.registrarItem === "function"
      ) {
        window.MenuSuperior.registrarItem(CERTI_MENU_ITEM);
        return true;
      }

      if (
        window.MenuSuperior &&
        typeof window.MenuSuperior.addItem === "function"
      ) {
        window.MenuSuperior.addItem(CERTI_MENU_ITEM);
        return true;
      }

      if (
        window.IncorporacionesMenu &&
        typeof window.IncorporacionesMenu.registrar === "function"
      ) {
        window.IncorporacionesMenu.registrar(CERTI_MENU_ITEM);
        return true;
      }

      if (
        window.menuSuperior &&
        typeof window.menuSuperior.registrar === "function"
      ) {
        window.menuSuperior.registrar(CERTI_MENU_ITEM);
        return true;
      }
    } catch (error) {
      console.warn("No se pudo registrar Certi en el menú global:", error);
    }

    return false;
  }

  function insertarEnlaceSiNoExiste() {
    const contenedor =
      document.getElementById("menuSuperior") ||
      document.querySelector(".menu-superior") ||
      document.querySelector("nav");

    if (!contenedor) return;

    const yaExiste = Array.from(contenedor.querySelectorAll("a")).some(function (a) {
      const texto = String(a.textContent || "").trim().toLowerCase();
      const href = String(a.getAttribute("href") || "").toLowerCase();

      return texto === "certi" || href.includes("certi");
    });

    if (yaExiste) return;

    const enlace = document.createElement("a");
    enlace.href = "./certi/certi.index.html";
    enlace.textContent = "Certi";
    enlace.className = "menu-link certi-menu-link";
    enlace.dataset.modulo = "certi";

    contenedor.appendChild(enlace);
  }

  function marcarActivoSiCorresponde() {
    const rutaActual = String(window.location.pathname || "").toLowerCase();

    if (!rutaActual.includes("/certi/")) return;

    const enlaces = document.querySelectorAll("a");

    enlaces.forEach(function (enlace) {
      const texto = String(enlace.textContent || "").trim().toLowerCase();
      const href = String(enlace.getAttribute("href") || "").toLowerCase();

      if (texto === "certi" || href.includes("certi")) {
        enlace.classList.add("active");
        enlace.classList.add("activo");
        enlace.setAttribute("aria-current", "page");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", iniciarPatchMenuCerti);

  window.CertiMenuPatch = {
    iniciarPatchMenuCerti,
    intentarRegistrarEnMenuGlobal,
    insertarEnlaceSiNoExiste,
    marcarActivoSiCorresponde
  };
})();