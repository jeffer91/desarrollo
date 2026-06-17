/*
=========================================================
Nombre completo: falt.app.js
Ruta o ubicación: /incorporaciones/falt/falt.app.js

Función o funciones:
1. Iniciar el módulo Faltantes.
2. Cargar períodos disponibles.
3. Cargar estudiantes del período seleccionado como base de búsqueda.
4. Abrir pop-up para pegar cédulas y nombres mezclados.
5. Procesar búsqueda flexible solo dentro del período seleccionado.
6. Confirmar encontrados y coincidencias elegidas para pasarlos a la tabla.
7. Mantener seleccionados guardados hasta presionar Limpiar selección.
8. Enviar mensajes por WhatsApp o Telegram.
9. Copiar mensajes individuales o visibles.
10. Marcar estudiantes como enviados y quitar estudiantes de la tabla.

Con qué se conecta:
- falt.config.js
- falt.state.js
- falt.utils.js
- falt.data.js
- falt.filters.js
- falt.search.js
- falt.message.js
- falt.history.js
- falt.whatsapp.js
- falt.telegram.js
- falt.table.js
- falt.diagnostico.js
=========================================================
*/

(function (window, document) {
  "use strict";

  var Config = window.FaltConfig || {};
  var State = window.FaltState;
  var Data = window.FaltData;
  var Filters = window.FaltFilters;
  var Search = window.FaltSearch;
  var Message = window.FaltMessage;
  var Table = window.FaltTable;
  var History = window.FaltHistory || {};
  var Whatsapp = window.FaltWhatsapp || {};
  var Telegram = window.FaltTelegram || {};
  var U = window.FaltUtils || {};

  var dom = {};

  function $(id) {
    return document.getElementById(id);
  }

  function asText(value) {
    if (U.asText) return U.asText(value);
    return String(value == null ? "" : value).trim();
  }

  function escapeHtml(value) {
    return asText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function requireModules() {
    var missing = [];

    [
      ["FaltState", State],
      ["FaltData", Data],
      ["FaltFilters", Filters],
      ["FaltSearch", Search],
      ["FaltMessage", Message],
      ["FaltTable", Table]
    ].forEach(function (item) {
      if (!item[1]) missing.push(item[0]);
    });

    if (missing.length) {
      throw new Error("Faltan módulos obligatorios: " + missing.join(", "));
    }
  }

  function collectDom() {
    dom = {
      status: $("falt-status"),
      loader: $("falt-loader"),
      periodo: $("falt-periodo-select"),
      searchInput: $("falt-search-input"),
      estado: $("falt-estado-select"),
      canal: $("falt-canal-select"),
      btnBuscar: $("falt-btn-buscar-estudiantes"),
      btnLimpiarSeleccion: $("falt-btn-limpiar-seleccion"),
      btnRecargar: $("falt-btn-recargar"),
      btnCopiarTodos: $("falt-btn-copiar-todos"),
      tableBody: $("falt-table-body"),
      modal: $("falt-modal-busqueda"),
      modalInput: $("falt-modal-input"),
      modalClose: $("falt-modal-close"),
      modalProcesar: $("falt-modal-procesar"),
      modalConfirmar: $("falt-modal-confirmar"),
      modalLimpiar: $("falt-modal-limpiar"),
      modalSummary: $("falt-modal-summary"),
      modalResults: $("falt-modal-results")
    };

    var required = [
      "periodo",
      "searchInput",
      "estado",
      "canal",
      "btnBuscar",
      "btnLimpiarSeleccion",
      "btnRecargar",
      "btnCopiarTodos",
      "tableBody",
      "modal",
      "modalInput",
      "modalClose",
      "modalProcesar",
      "modalConfirmar",
      "modalLimpiar",
      "modalSummary",
      "modalResults"
    ];

    required.forEach(function (key) {
      if (!dom[key]) {
        throw new Error("No existe el elemento requerido: " + key);
      }
    });
  }

  function setStatus(message, loading) {
    if (dom.status) dom.status.textContent = message || "Listo";

    if (dom.loader) {
      dom.loader.hidden = !loading;
    }
  }

  function getSelectedPeriodoText() {
    if (!dom.periodo) return "";

    var option = dom.periodo.options[dom.periodo.selectedIndex];

    return option ? option.textContent : dom.periodo.value;
  }

  function renderPeriodos(periodos) {
    var list = Array.isArray(periodos) ? periodos : [];

    dom.periodo.innerHTML =
      '<option value="">Selecciona un período</option>' +
      list.map(function (item) {
        var value = item.id || item.value || item.label || item.text || item.nombre;
        var label = item.label || item.text || item.nombre || value;

        return '<option value="' + escapeHtml(value) + '">' + escapeHtml(label) + "</option>";
      }).join("");
  }

  async function cargarPeriodos() {
    setStatus("Cargando períodos...", true);

    try {
      var periodos = await Data.listarPeriodos();
      State.setPeriodos(periodos);
      renderPeriodos(periodos);

      setStatus("Períodos cargados.", false);
    } catch (error) {
      State.setError(error.message || "No se pudieron cargar los períodos.");
      setStatus("Error al cargar períodos.", false);
      console.error(error);
    }
  }

  async function cargarPeriodoSeleccionado() {
    var periodoId = asText(dom.periodo.value);
    var periodoTexto = getSelectedPeriodoText();

    if (!periodoId) {
      State.setPeriodo("", "");
      State.setEstudiantesPeriodo([]);
      aplicarFiltrosYRenderizar();
      return;
    }

    setStatus("Cargando estudiantes del período...", true);
    State.setCargando(true);
    State.setPeriodo(periodoId, periodoTexto);

    try {
      var rows = await Data.cargarEstudiantesPorPeriodo(periodoId, periodoTexto);
      State.setEstudiantesPeriodo(rows);
      aplicarFiltrosYRenderizar();
      setStatus("Base del período cargada.", false);
    } catch (error) {
      State.setError(error.message || "No se pudieron cargar estudiantes del período.");
      setStatus("Error al cargar estudiantes.", false);
      console.error(error);
    } finally {
      State.setCargando(false);
    }
  }

  function aplicarFiltrosYRenderizar() {
    var state = State.obtener();

    var visibles = Filters.aplicar(state.seleccionados, state.filtros, {
      periodoId: state.periodoId
    });

    State.setVisibles(visibles);

    var resumen = Filters.resumen(state.seleccionados, visibles, state.periodoId);

    Table.renderResumen(resumen, state.periodoTexto);
    Table.renderTabla(visibles, {
      periodoId: state.periodoId,
      periodoTexto: state.periodoTexto
    });

    var previewRow = visibles.length ? visibles[0] : null;

    Table.renderPreview(previewRow, {
      periodoTexto: state.periodoTexto
    });
  }

  function actualizarFiltrosDesdeDom() {
    State.setFiltros({
      texto: dom.searchInput.value || "",
      estado: dom.estado.value || "todos",
      canal: dom.canal.value || "todos"
    });

    aplicarFiltrosYRenderizar();
  }

  function abrirModalBusqueda() {
    var state = State.obtener();

    if (!state.periodoId) {
      alert("Primero selecciona un período.");
      return;
    }

    dom.modal.classList.remove("is-hidden");
    dom.modal.setAttribute("aria-hidden", "false");

    State.abrirModal();

    window.setTimeout(function () {
      dom.modalInput.focus();
    }, 50);
  }

  function cerrarModalBusqueda() {
    dom.modal.classList.add("is-hidden");
    dom.modal.setAttribute("aria-hidden", "true");

    State.cerrarModal();
  }

  function clearModalResults() {
    dom.modalSummary.textContent = "Esperando datos para procesar.";
    dom.modalResults.innerHTML = "";
  }

  function renderFoundSection(title, items, type) {
    if (!items.length) return "";

    return [
      '<section class="falt-result-section falt-result-' + escapeHtml(type) + '">',
      "<h3>" + escapeHtml(title) + "</h3>",
      '<div class="falt-result-list">',
      items.map(function (item) {
        var row = item.selected || item;
        var nombre = Message.getNombre ? Message.getNombre(row) : "";
        var cedula = Message.getCedula ? Message.getCedula(row) : "";
        var carrera = Message.getCarrera ? Message.getCarrera(row) : "";

        return [
          '<div class="falt-result-item">',
          '<div class="falt-result-main">',
          "<div>",
          "<strong>" + escapeHtml(nombre) + "</strong>",
          "<span>" + escapeHtml(cedula) + " · " + escapeHtml(carrera) + "</span>",
          "</div>",
          '<span class="falt-badge falt-badge-success">Encontrado</span>',
          "</div>",
          "</div>"
        ].join("");
      }).join(""),
      "</div>",
      "</section>"
    ].join("");
  }

  function renderMultipleSection(items) {
    if (!items.length) return "";

    return [
      '<section class="falt-result-section">',
      "<h3>Coincidencias para elegir</h3>",
      '<div class="falt-result-list">',
      items.map(function (group, groupIndex) {
        return [
          '<div class="falt-result-item">',
          '<div class="falt-result-main">',
          "<div>",
          "<strong>Búsqueda: " + escapeHtml(group.query) + "</strong>",
          "<span>Selecciona el estudiante correcto.</span>",
          "</div>",
          '<span class="falt-badge falt-badge-warning">Revisar</span>',
          "</div>",
          '<div class="falt-options">',
          group.matches.map(function (match, matchIndex) {
            var row = match.selected;
            var nombre = Message.getNombre ? Message.getNombre(row) : "";
            var cedula = Message.getCedula ? Message.getCedula(row) : "";
            var carrera = Message.getCarrera ? Message.getCarrera(row) : "";
            var radioName = "falt_match_" + groupIndex;

            return [
              '<label class="falt-option">',
              '<input type="radio" name="' + escapeHtml(radioName) + '" data-falt-multiple-group="' + groupIndex + '" data-falt-multiple-match="' + matchIndex + '">',
              "<span>",
              "<strong>" + escapeHtml(nombre) + "</strong>",
              "<span>" + escapeHtml(cedula) + " · " + escapeHtml(carrera) + " · Coincidencia " + escapeHtml(match.score || "") + "%</span>",
              "</span>",
              "</label>"
            ].join("");
          }).join(""),
          "</div>",
          "</div>"
        ].join("");
      }).join(""),
      "</div>",
      "</section>"
    ].join("");
  }

  function renderNotFoundSection(items) {
    if (!items.length) return "";

    return [
      '<section class="falt-result-section">',
      "<h3>No encontrados</h3>",
      '<div class="falt-result-list">',
      items.map(function (item) {
        return [
          '<div class="falt-result-item">',
          '<div class="falt-result-main">',
          "<div>",
          '<strong class="falt-no-found">' + escapeHtml(item.query) + "</strong>",
          "<span>No se encontró coincidencia dentro del período seleccionado.</span>",
          "</div>",
          '<span class="falt-badge falt-badge-danger">No encontrado</span>',
          "</div>",
          "</div>"
        ].join("");
      }).join(""),
      "</div>",
      "</section>"
    ].join("");
  }

  function procesarBusqueda() {
    var state = State.obtener();
    var rawText = dom.modalInput.value || "";

    if (!state.periodoId) {
      alert("Primero selecciona un período.");
      return;
    }

    if (!rawText.trim()) {
      alert("Pega al menos una cédula o nombre.");
      return;
    }

    var results = Search.procesar(rawText, state.estudiantesPeriodo, {
      periodoId: state.periodoId,
      periodoTexto: state.periodoTexto,
      motivoGeneral:
        Config.motivoGeneral ||
        "Pendiente de completar registro, pago, comprobante o encuesta de incorporación."
    });

    State.setResultadosBusqueda(results);

    dom.modalSummary.textContent =
      "Procesadas: " + results.totalConsultas +
      ". Encontradas directas: " + results.encontrados.length +
      ". Por revisar: " + results.multiples.length +
      ". No encontradas: " + results.noEncontrados.length + ".";

    dom.modalResults.innerHTML = [
      renderFoundSection("Encontrados directos", results.encontrados, "found"),
      renderMultipleSection(results.multiples),
      renderNotFoundSection(results.noEncontrados)
    ].join("") || '<div class="falt-search-summary">No se generaron resultados.</div>';
  }

  function recogerSeleccionadosDelModal() {
    var state = State.obtener();
    var results = state.resultadosBusqueda || {};
    var selected = [];

    (results.encontrados || []).forEach(function (item) {
      if (item.selected) selected.push(item.selected);
    });

    (results.multiples || []).forEach(function (group, groupIndex) {
      var checked = dom.modalResults.querySelector(
        'input[data-falt-multiple-group="' + groupIndex + '"]:checked'
      );

      if (!checked) return;

      var matchIndex = Number(checked.getAttribute("data-falt-multiple-match"));
      var match = group.matches && group.matches[matchIndex];

      if (match && match.selected) {
        selected.push(match.selected);
      }
    });

    if (Search.deduplicarSeleccionados) {
      selected = Search.deduplicarSeleccionados(selected);
    }

    return selected;
  }

  function confirmarBusqueda() {
    var selected = recogerSeleccionadosDelModal();

    if (!selected.length) {
      alert("No hay estudiantes encontrados o seleccionados para agregar.");
      return;
    }

    State.agregarSeleccionados(selected);
    aplicarFiltrosYRenderizar();
    cerrarModalBusqueda();

    dom.modalInput.value = "";
    clearModalResults();

    setStatus("Estudiantes agregados a la tabla.", false);
  }

  function limpiarSeleccion() {
    var ok = window.confirm(
      "¿Seguro que deseas limpiar todos los estudiantes seleccionados de Faltantes?"
    );

    if (!ok) return;

    State.limpiarSeleccionados();
    aplicarFiltrosYRenderizar();
    setStatus("Selección limpiada.", false);
  }

  async function copiarTexto(text) {
    var value = asText(text);

    if (!value) return false;

    if (U.copyText) {
      return U.copyText(value);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    var textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);

    return true;
  }

  function findVisibleById(id) {
    var state = State.obtener();
    return Table.findRowById(state.visibles, id);
  }

  function generarMensaje(row) {
    var state = State.obtener();

    return Message.generar(row, {
      periodoTexto: state.periodoTexto
    });
  }

  function marcarEnviado(row, canal) {
    var state = State.obtener();
    var cedula = Message.getCedula ? Message.getCedula(row) : "";

    if (
      History &&
      typeof History.marcarEnviado === "function"
    ) {
      History.marcarEnviado(state.periodoId, cedula, {
        canal: canal || "manual",
        mensaje: generarMensaje(row),
        fecha: new Date().toISOString()
      });
    }

    aplicarFiltrosYRenderizar();
  }

  function manejarAccionTabla(action, id) {
    var row = findVisibleById(id);

    if (!row) {
      alert("No se encontró el estudiante seleccionado.");
      return;
    }

    var mensaje = generarMensaje(row);

    if (action === "whatsapp") {
      if (Whatsapp && typeof Whatsapp.enviar === "function") {
        Whatsapp.enviar(row, mensaje);
      } else if (Whatsapp && typeof Whatsapp.abrir === "function") {
        Whatsapp.abrir(row, mensaje);
      } else {
        alert("No está disponible el módulo de WhatsApp.");
      }

      marcarEnviado(row, "whatsapp");
      return;
    }

    if (action === "telegram") {
      if (Telegram && typeof Telegram.enviar === "function") {
        Telegram.enviar(row, mensaje);
      } else if (Telegram && typeof Telegram.abrir === "function") {
        Telegram.abrir(row, mensaje);
      } else {
        copiarTexto(mensaje);
        alert("Mensaje copiado. Abre Telegram manualmente.");
      }

      marcarEnviado(row, "telegram");
      return;
    }

    if (action === "copiar") {
      copiarTexto(mensaje).then(function () {
        setStatus("Mensaje copiado.", false);
      });
      return;
    }

    if (action === "enviado") {
      marcarEnviado(row, "manual");
      setStatus("Marcado como enviado.", false);
      return;
    }

    if (action === "quitar") {
      State.quitarSeleccionado(id);
      aplicarFiltrosYRenderizar();
      setStatus("Estudiante retirado de la tabla.", false);
    }
  }

  function copiarMensajesVisibles() {
    var state = State.obtener();

    if (!state.visibles.length) {
      alert("No hay estudiantes visibles para copiar.");
      return;
    }

    var text = Message.generarTodos(state.visibles, {
      periodoTexto: state.periodoTexto
    });

    copiarTexto(text).then(function () {
      setStatus("Mensajes visibles copiados.", false);
    });
  }

  function bindEvents() {
    dom.periodo.addEventListener("change", cargarPeriodoSeleccionado);

    dom.searchInput.addEventListener("input", actualizarFiltrosDesdeDom);
    dom.estado.addEventListener("change", actualizarFiltrosDesdeDom);
    dom.canal.addEventListener("change", actualizarFiltrosDesdeDom);

    dom.btnBuscar.addEventListener("click", abrirModalBusqueda);
    dom.btnLimpiarSeleccion.addEventListener("click", limpiarSeleccion);
    dom.btnRecargar.addEventListener("click", cargarPeriodoSeleccionado);
    dom.btnCopiarTodos.addEventListener("click", copiarMensajesVisibles);

    dom.modalClose.addEventListener("click", cerrarModalBusqueda);
    dom.modal.addEventListener("click", function (event) {
      if (event.target && event.target.getAttribute("data-falt-close-modal") === "true") {
        cerrarModalBusqueda();
      }
    });

    dom.modalProcesar.addEventListener("click", procesarBusqueda);
    dom.modalConfirmar.addEventListener("click", confirmarBusqueda);
    dom.modalLimpiar.addEventListener("click", function () {
      dom.modalInput.value = "";
      clearModalResults();
      dom.modalInput.focus();
    });

    dom.modalInput.addEventListener("keydown", function (event) {
      if (event.ctrlKey && event.key === "Enter") {
        procesarBusqueda();
      }
    });

    dom.tableBody.addEventListener("click", function (event) {
      var button = event.target.closest("[data-falt-action]");

      if (!button) return;

      manejarAccionTabla(
        button.getAttribute("data-falt-action"),
        button.getAttribute("data-falt-id")
      );
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !dom.modal.classList.contains("is-hidden")) {
        cerrarModalBusqueda();
      }
    });
  }

  function renderInicial() {
    aplicarFiltrosYRenderizar();
    clearModalResults();
  }

  async function iniciar() {
    try {
      requireModules();
      collectDom();
      bindEvents();
      renderInicial();
      await cargarPeriodos();
    } catch (error) {
      console.error("[FaltApp] No se pudo iniciar:", error);
      setStatus("Error de inicio.", false);
      alert("No se pudo iniciar Faltantes: " + (error.message || error));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }

  window.FaltApp = {
    iniciar: iniciar,
    cargarPeriodos: cargarPeriodos,
    cargarPeriodoSeleccionado: cargarPeriodoSeleccionado,
    abrirModalBusqueda: abrirModalBusqueda,
    cerrarModalBusqueda: cerrarModalBusqueda,
    procesarBusqueda: procesarBusqueda,
    confirmarBusqueda: confirmarBusqueda,
    aplicarFiltrosYRenderizar: aplicarFiltrosYRenderizar
  };
})(window, document);