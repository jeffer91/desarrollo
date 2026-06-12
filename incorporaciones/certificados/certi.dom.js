/*
=========================================================
Nombre completo: certi.dom.js
Ruta o ubicación: /incorporaciones/sedes/certi/certi.dom.js
Función o funciones:
- Centralizar las referencias a elementos HTML de la pantalla Certi.
- Evitar consultas repetidas al DOM en varios archivos.
- Proveer métodos seguros para enlazar eventos.
Con qué se une:
- certi.html
- certi.app.js
- certi.render.js
=========================================================
*/

(function () {
  "use strict";

  let cache = null;

  function porId(id) {
    return document.getElementById(id);
  }

  function obtener() {
    if (cache) return cache;

    cache = {
      menuSuperior: porId("menuSuperior"),

      periodo: porId("certiPeriodo"),
      fechaCertificado: porId("certiFechaCertificado"),
      excelInput: porId("certiExcelInput"),

      btnProcesar: porId("certiBtnProcesar"),
      btnLimpiar: porId("certiBtnLimpiar"),
      btnPdfUnico: porId("certiBtnPdfUnico"),
      btnPdfIndividuales: porId("certiBtnPdfIndividuales"),

      resumenCards: porId("certiResumenCards"),
      alertas: porId("certiAlertas"),

      carrerasPanel: porId("certiCarrerasPanel"),
      carrerasList: porId("certiCarrerasList"),

      empatesPanel: porId("certiEmpatesPanel"),
      empatesList: porId("certiEmpatesList"),

      tablaBody: porId("certiTablaBody")
    };

    return cache;
  }

  function escuchar(elemento, evento, callback) {
    if (!elemento || typeof callback !== "function") return;

    elemento.addEventListener(evento, callback);
  }

  function escucharDelegado(contenedor, selector, evento, callback) {
    if (!contenedor || typeof callback !== "function") return;

    contenedor.addEventListener(evento, function (e) {
      const objetivo = e.target.closest(selector);

      if (!objetivo || !contenedor.contains(objetivo)) return;

      callback(e, objetivo);
    });
  }

  function deshabilitar(elemento, valor) {
    if (!elemento) return;

    elemento.disabled = Boolean(valor);
  }

  function mostrar(elemento) {
    if (!elemento) return;

    elemento.classList.remove("certi-hidden");
  }

  function ocultar(elemento) {
    if (!elemento) return;

    elemento.classList.add("certi-hidden");
  }

  function establecerHtml(elemento, html) {
    if (!elemento) return;

    elemento.innerHTML = html || "";
  }

  function establecerTexto(elemento, texto) {
    if (!elemento) return;

    elemento.textContent = texto || "";
  }

  window.CertiDom = {
    obtener,
    escuchar,
    escucharDelegado,
    deshabilitar,
    mostrar,
    ocultar,
    establecerHtml,
    establecerTexto
  };
})();