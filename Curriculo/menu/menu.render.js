/* =========================================================
Nombre completo: menu.render.js
Ruta o ubicación: /Curriculo/menu/menu.render.js
Función o funciones:
- Renderizar botones del menú Currículo
- Marcar módulo activo con clases y atributos accesibles
- Mostrar hint/estado del menú
- Construir contenido interno de la pantalla Inicio
========================================================= */
(function attachCurriculoMenuRender(window, document) {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeId(value) {
    if (window.CurriculoMenuRouter && typeof window.CurriculoMenuRouter.normalizeId === "function") {
      return window.CurriculoMenuRouter.normalizeId(value);
    }

    return String(value || "").trim().toLowerCase();
  }

  function renderNav(items, activeId) {
    var nav = byId("menuNav");
    var active = normalizeId(activeId);
    var html;

    if (!nav) return;

    html = (Array.isArray(items) ? items : []).map(function mapItem(item) {
      var id = normalizeId(item.id);
      var isActive = id === active;
      var isDisabled = item.disabled === true;
      var cls = isActive ? "nav-btn nav-btn-active" : "nav-btn";
      var label = item.shortTitle || item.title || item.id;
      var icon = item.icon ? "<span class=\"nav-btn-icon\" aria-hidden=\"true\">" + escapeHtml(item.icon) + "</span>" : "";

      return [
        "<button",
        " type=\"button\"",
        " class=\"" + cls + "\"",
        " data-menu-id=\"" + escapeHtml(id) + "\"",
        " data-active=\"" + (isActive ? "true" : "false") + "\"",
        " aria-current=\"" + (isActive ? "page" : "false") + "\"",
        " title=\"" + escapeHtml(item.hint || item.title || item.id) + "\"",
        isDisabled ? " disabled" : "",
        ">",
        icon,
        "<span>" + escapeHtml(label) + "</span>",
        "</button>"
      ].join("");
    }).join("");

    nav.innerHTML = html;
  }

  function setHint(message, type) {
    var hint = byId("menuHint");
    var value = String(message || "Listo.");

    if (!hint) return;

    hint.textContent = value;
    hint.dataset.type = type || "normal";
  }

  function buildHomeHtml(config) {
    var cfg = config || {};
    var items = Array.isArray(cfg.items) ? cfg.items.filter(function (item) {
      return item && item.id && item.id !== "inicio";
    }) : [];

    return [
      "<!doctype html>",
      "<html lang=\"es\">",
      "<head>",
      "<meta charset=\"UTF-8\" />",
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />",
      "<style>",
      "body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:#f8fafc;color:#0f172a;}",
      ".home{min-height:100vh;padding:28px;box-sizing:border-box;}",
      ".hero{background:#fff;border:1px solid #dbe4f0;border-radius:22px;padding:24px;box-shadow:0 16px 34px rgba(15,23,42,.08);}",
      ".eyebrow{margin:0 0 8px;color:#2563eb;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;}",
      "h1{margin:0;font-size:30px;line-height:1.1;}",
      ".lead{margin:10px 0 0;color:#64748b;max-width:800px;line-height:1.5;font-size:15px;}",
      ".grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:18px;}",
      ".card{background:#fff;border:1px solid #dbe4f0;border-radius:18px;padding:18px;box-shadow:0 10px 24px rgba(15,23,42,.06);}",
      ".icon{width:40px;height:40px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:#2563eb;color:#fff;font-weight:900;margin-bottom:12px;}",
      ".card h2{margin:0 0 8px;font-size:17px;}",
      ".card p{margin:0;color:#64748b;font-size:13px;line-height:1.45;}",
      ".note{margin-top:18px;border:1px dashed #c6d2e3;border-radius:16px;background:#fff;padding:14px;color:#475569;font-size:13px;}",
      "@media(max-width:700px){.home{padding:16px}h1{font-size:24px}}",
      "</style>",
      "</head>",
      "<body>",
      "<main class=\"home\">",
      "<section class=\"hero\">",
      "<p class=\"eyebrow\">" + escapeHtml(cfg.appTitle || "Currículo") + "</p>",
      "<h1>Menú principal de Currículo</h1>",
      "<p class=\"lead\">Seleccione un módulo en la barra superior. Base local funciona como centro de control para guardar, revisar cambios, ver errores, respaldar y preparar la sincronización de Currículo.</p>",
      "</section>",
      "<section class=\"grid\" aria-label=\"Módulos disponibles\">",
      items.map(function (item) {
        return [
          "<article class=\"card\">",
          "<div class=\"icon\">" + escapeHtml(item.icon || item.shortTitle || item.title || "•") + "</div>",
          "<h2>" + escapeHtml(item.title || item.id) + "</h2>",
          "<p>" + escapeHtml(item.description || item.hint || "Módulo disponible.") + "</p>",
          "</article>"
        ].join("");
      }).join(""),
      "</section>",
      "<div class=\"note\">La Base local se carga una vez al día al abrir Currículo. Los estados técnicos se registran en consola para no saturar la pantalla.</div>",
      "</main>",
      "</body>",
      "</html>"
    ].join("");
  }

  window.CurriculoMenuRender = {
    renderNav: renderNav,
    setHint: setHint,
    buildHomeHtml: buildHomeHtml,
    escapeHtml: escapeHtml
  };
})(window, document);
