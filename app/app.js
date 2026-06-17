/*
=========================================================
Nombre del archivo: app.js
Ruta o ubicación: /desarrollo/app/app.js
Función o funciones:
- Inicializa el panel principal tipo launcher
- Permite buscar y filtrar módulos
- Abre directamente la ruta HTML real del módulo
- Elimina el botón innecesario de “Seleccionar”
- Elimina el badge repetido de grupo en las tarjetas
- Mantiene la selección visual solo al hacer clic en la tarjeta o al cargar el primer módulo
=========================================================
*/
(function attachLauncherApp(window, document) {
  "use strict";

  window.DESARROLLO = window.DESARROLLO || {};

  function byId(id) {
    return document.getElementById(id);
  }

  function safeText(value, fallback) {
    var text = value == null ? "" : String(value).trim();
    return text || (fallback || "");
  }

  function start() {
    var AppRoot = window.DESARROLLO || {};
    var Registry = AppRoot.Registry;
    var Env = AppRoot.Env;

    if (!Registry || typeof Registry.all !== "function") {
      throw new Error("No se encontró DESARROLLO.Registry.");
    }

    var elements = {
      envBadge: byId("env-badge"),
      envCopy: byId("env-copy"),
      search: byId("module-search"),
      moduleCount: byId("module-count"),
      cardsMeta: byId("cards-meta"),
      selectedModuleName: byId("selected-module-name"),
      selectedTitle: byId("selected-title"),
      selectedDescription: byId("selected-description"),
      selectedGroup: byId("selected-group"),
      selectedPath: byId("selected-path"),
      openSelectedBtn: byId("open-selected-btn"),
      openSelectedSecondaryBtn: byId("open-selected-secondary-btn"),
      moduleGrid: byId("module-grid")
    };

    var currentSearch = "";
    var selectedId = "";
    var allModules = Registry.all();

    renderEnv();

    if (allModules.length) {
      selectModule(allModules[0].id);
    } else {
      clearSelection();
    }

    renderCards(Registry.search(""));

    elements.search.addEventListener("input", function onSearch() {
      currentSearch = elements.search.value || "";
      var filtered = Registry.search(currentSearch);

      if (selectedId && !Registry.isVisible(selectedId, currentSearch)) {
        clearSelection();
      } else if (!selectedId && filtered.length) {
        selectModule(filtered[0].id);
      }

      renderCards(filtered);
    });

    elements.openSelectedBtn.addEventListener("click", function onOpenPrimary() {
      openSelectedModule();
    });

    elements.openSelectedSecondaryBtn.addEventListener("click", function onOpenSecondary() {
      openSelectedModule();
    });

    function renderEnv() {
      var envInfo = Env && typeof Env.detect === "function"
        ? Env.detect()
        : {
            label: "Web",
            description: "Modo navegador activo."
          };

      if (elements.envBadge) {
        elements.envBadge.textContent = safeText(envInfo.label, "Desconocido");
      }

      if (elements.envCopy) {
        elements.envCopy.textContent = safeText(
          envInfo.description,
          "Entorno no detectado."
        );
      }
    }

    function renderCards(modules) {
      elements.moduleGrid.innerHTML = "";
      elements.moduleCount.textContent = String(modules.length);
      elements.cardsMeta.textContent = modules.length + " resultados";

      if (!modules.length) {
        var empty = document.createElement("div");
        empty.className = "empty-grid";
        empty.innerHTML =
          "<strong>No se encontraron módulos.</strong><span>Prueba con otro término de búsqueda.</span>";
        elements.moduleGrid.appendChild(empty);
        return;
      }

      modules.forEach(function eachModule(moduleItem) {
        var article = document.createElement("article");
        article.className = "module-card" + (moduleItem.id === selectedId ? " is-selected" : "");
        article.setAttribute("data-module-id", moduleItem.id);
        article.setAttribute("tabindex", "0");

        var title = document.createElement("h4");
        title.className = "module-card-title";
        title.textContent = moduleItem.title;

        var desc = document.createElement("p");
        desc.className = "module-card-description";
        desc.textContent = moduleItem.description;

        var path = document.createElement("p");
        path.className = "module-card-path";
        path.textContent = moduleItem.path;

        var actions = document.createElement("div");
        actions.className = "module-card-actions";

        var openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.className = "mini-btn mini-btn-primary";
        openBtn.textContent = "Abrir";

        openBtn.addEventListener("click", function onOpen(event) {
          event.stopPropagation();
          openModule(moduleItem);
        });

        article.addEventListener("click", function onCardClick() {
          selectModule(moduleItem.id);
          renderCards(Registry.search(currentSearch));
        });

        article.addEventListener("keydown", function onCardKeydown(event) {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectModule(moduleItem.id);
            renderCards(Registry.search(currentSearch));
          }
        });

        actions.appendChild(openBtn);

        article.appendChild(title);
        article.appendChild(desc);
        article.appendChild(path);
        article.appendChild(actions);

        elements.moduleGrid.appendChild(article);
      });
    }

    function selectModule(moduleId) {
      var moduleItem = Registry.getById(moduleId);

      if (!moduleItem) {
        clearSelection();
        return;
      }

      selectedId = moduleItem.id;

      elements.selectedModuleName.textContent = moduleItem.title;
      elements.selectedTitle.textContent = moduleItem.title;
      elements.selectedDescription.textContent = moduleItem.description;
      elements.selectedGroup.textContent = moduleItem.group;
      elements.selectedPath.textContent = moduleItem.path;
      elements.openSelectedBtn.disabled = false;
      elements.openSelectedSecondaryBtn.disabled = false;
    }

    function clearSelection() {
      selectedId = "";
      elements.selectedModuleName.textContent = "Ninguno";
      elements.selectedTitle.textContent = "Ningún módulo seleccionado";
      elements.selectedDescription.textContent =
        "Haz clic en una tarjeta para abrir el módulo que quieres usar.";
      elements.selectedGroup.textContent = "Sin grupo";
      elements.selectedPath.textContent = "Sin ruta";
      elements.openSelectedBtn.disabled = true;
      elements.openSelectedSecondaryBtn.disabled = true;
    }

    function openSelectedModule() {
      if (!selectedId) return;

      var moduleItem = Registry.getById(selectedId);
      if (!moduleItem) return;

      openModule(moduleItem);
    }

function openModule(moduleItem) {
  var targetPath = safeText(moduleItem && moduleItem.path, "");

  if (!targetPath) {
    window.alert("El módulo seleccionado no tiene una ruta válida.");
    return;
  }

  // Corrección técnica: resolver la ruta relativa contra la URL actual
  // evita que Electron intente abrir una ruta local ambigua.
  var targetUrl = new URL(targetPath, window.location.href).href;

  // Corrección técnica: navegar usando la URL absoluta ya resuelta
  // evita la pantalla en blanco por carga inválida del recurso local.
  window.location.assign(targetUrl);
}
  }

  document.addEventListener("DOMContentLoaded", start);
})(window, document);