/* =========================================================
Nombre completo: certi.editable.mode.js
Ruta o ubicación: /incorporaciones/certificados/certi.editable.mode.js
Función o funciones:
- Mantener visibles únicamente las entradas correspondientes al tipo seleccionado.
- Restaurar correctamente Excel y texto al salir del modo editable.
- Ejecutarse al final para resolver cambios realizados por controladores anteriores.
Con qué se une:
- certi.index.html
- certi.capacitacion.js
- certi.editable.js
========================================================= */
(function () {
  "use strict";

  function iniciar() {
    const tipo = document.getElementById("certiTipoCertificado");
    const fuente = document.getElementById("certiFuenteDatos");

    if (tipo && !tipo.dataset.certiEditableMode) {
      tipo.dataset.certiEditableMode = "1";
      tipo.addEventListener("change", function () {
        setTimeout(sincronizar, 0);
      });
    }

    if (fuente && !fuente.dataset.certiEditableMode) {
      fuente.dataset.certiEditableMode = "1";
      fuente.addEventListener("change", function () {
        setTimeout(sincronizar, 0);
      });
    }

    sincronizar();
    setTimeout(sincronizar, 0);
  }

  function sincronizar() {
    const tipo = document.getElementById("certiTipoCertificado");
    const fuente = document.getElementById("certiFuenteDatos");
    const bloqueExcel = document.getElementById("certiBloqueExcel");
    const bloqueTexto = document.getElementById("certiBloqueTexto");
    const panelEditable = document.getElementById("certiEditablePanel");
    const campoFuente = document.getElementById("certiFuenteField");
    const valorTipo = tipo ? tipo.value : "reconocimiento";
    const valorFuente = fuente ? fuente.value : "auto";

    if (valorTipo === "editable") {
      if (bloqueExcel) bloqueExcel.style.display = "none";
      if (bloqueTexto) bloqueTexto.style.display = "none";
      if (panelEditable) panelEditable.classList.remove("certi-hidden");
      if (campoFuente) campoFuente.style.display = "none";
      return;
    }

    if (panelEditable) panelEditable.classList.add("certi-hidden");
    if (campoFuente) campoFuente.style.display = "";

    if (valorTipo === "capacitacion") {
      if (bloqueExcel) bloqueExcel.style.display = "";
      if (bloqueTexto) bloqueTexto.style.display = "none";
      return;
    }

    if (bloqueExcel) bloqueExcel.style.display = valorFuente === "texto" ? "none" : "";
    if (bloqueTexto) bloqueTexto.style.display = valorFuente === "excel" ? "none" : "";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }

  window.CertiEditableMode = { sincronizar };
})();
