/* =========================================================
Nombre completo: certi.editable.mode.js
Ruta o ubicación: /incorporaciones/certificados/certi.editable.mode.js
Función o funciones:
- Mantener visibles únicamente las entradas correspondientes al tipo seleccionado.
- Restaurar correctamente Excel y texto al salir del modo editable.
- Reaplicar el modo después de cada actualización del estado central.
- Mejorar la lectura cuando hay líneas en blanco después de etiquetas.
- Interpretar texto libre escrito línea por línea aunque no tenga párrafos separados.
- Ejecutarse al final para resolver cambios realizados por controladores anteriores.
Con qué se une:
- certi.index.html
- certi.state.js
- certi.capacitacion.js
- certi.editable.logic.js
- certi.editable.js
========================================================= */
(function () {
  "use strict";

  function iniciar() {
    const tipo = document.getElementById("certiTipoCertificado");
    const fuente = document.getElementById("certiFuenteDatos");

    mejorarLogicaEditable();

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

    if (
      window.CertiState &&
      typeof window.CertiState.suscribir === "function" &&
      !window.__certiEditableModeSuscrito
    ) {
      window.__certiEditableModeSuscrito = true;
      window.CertiState.suscribir(function () {
        sincronizar();
      });
    }

    sincronizar();
    setTimeout(sincronizar, 0);
  }

  function mejorarLogicaEditable() {
    const Logic = window.CertiEditableLogic;
    if (!Logic || typeof Logic.parsearTexto !== "function" || Logic.__modoMejorado) return;

    const parsearOriginal = Logic.parsearTexto.bind(Logic);

    Logic.parsearTexto = function parsearTextoMejorado(texto, opciones) {
      let normalizado = String(texto == null ? "" : texto).replace(/\r\n?/g, "\n");

      normalizado = normalizado.replace(
        /^(\s*(?:T[IÍ]TULO|ENCABEZADO|INTRODUCCI[OÓ]N|NOMBRE|BENEFICIARIOS?|PARTICIPANTES?|TEXTO|CONTENIDO|TEXTO PRINCIPAL|DESTACADO|EVENTO|TEMA|CURSO|DETALLE|COMPLEMENTO|CIERRE|CIUDAD|LUGAR|FECHA|FIRMANTE(?:\s*[123])?|CARGO(?:\s*[123])?)\s*:[^\n]*)\n(?:\s*\n)+/gmi,
        "$1\n"
      );

      if (!/\n\s*\n/.test(normalizado) && !/^[^:\n]{2,45}\s*:/m.test(normalizado)) {
        const lineas = normalizado.split("\n").map(function (linea) {
          return linea.trim();
        }).filter(Boolean);

        if (lineas.length >= 4) {
          normalizado = lineas.join("\n\n");
        }
      }

      return parsearOriginal(normalizado, opciones);
    };

    Logic.__modoMejorado = true;
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

  window.CertiEditableMode = { sincronizar, mejorarLogicaEditable };
})();
