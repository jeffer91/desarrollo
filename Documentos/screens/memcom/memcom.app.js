/* =========================================================
Nombre completo: memcom.app.js
Ruta: /screens/memcom/memcom.app.js
Función o funciones:
- Controlar la interfaz del módulo Memorando de Cronograma.
- Cargar los períodos de titulación disponibles.
- Coordinar la carga de 1, 2, 3 o 4 tablas desde memcom.tables.js.
- Reservar un código mensual de memorando antes de generar el PDF.
- Enviar al PDF el código completo en formato MEM-ITSQMET-UTET-YYYY-MM-XX.
- Calcular el año y mes del memorando desde la fecha de fin del período menos 3 meses.
- Liberar la reserva si ocurre un error al generar el PDF.
- Descargar el PDF con nombre institucional ordenado.
========================================================= */

(function (window, document) {
  "use strict";

  window.MEMCOM = window.MEMCOM || {};

  function $(id) {
    return document.getElementById(id);
  }

  var elPeriodo = $("mc-periodo");
  var elTipo = $("mc-tipo");
  var elStatus = $("mc-status");
  var btnPdf = $("mc-btn-pdf");
  var btnPreview = $("mc-btn-preview");
  var btnVolver = $("mc-btn-volver");
  var btnRefrescar = $("mc-btn-refrescar");

  var state = {
    periodos: [],
    periodoSeleccionado: "",
    periodoIdSeleccionado: "",
    tablas: []
  };

  function setStatus(message, type) {
    if (!elStatus) {
      return;
    }

    elStatus.textContent = message || "";
    elStatus.classList.remove("is-ok", "is-error", "is-info");

    if (type === "ok") {
      elStatus.classList.add("is-ok");
    } else if (type === "err") {
      elStatus.classList.add("is-error");
    } else {
      elStatus.classList.add("is-info");
    }
  }

  function saveState() {
    try {
      var dataToSave = {
        tipo: elTipo ? elTipo.value : "",
        periodoVal: elPeriodo ? elPeriodo.value : ""
      };

      localStorage.setItem("MEMCOM_STATE", JSON.stringify(dataToSave));

      if (window.MEMCOM.tables && typeof window.MEMCOM.tables.saveState === "function") {
        window.MEMCOM.tables.saveState();
      }
    } catch (error) {
      console.error("[MEMCOM_APP] Error guardando estado:", error);
    }
  }

  function restoreState() {
    try {
      var saved = localStorage.getItem("MEMCOM_STATE");

      if (!saved) {
        return "";
      }

      var data = JSON.parse(saved);

      if (data.tipo && elTipo) {
        elTipo.value = data.tipo;
      }

      return data.periodoVal || "";
    } catch (error) {
      console.error("[MEMCOM_APP] Error restaurando estado:", error);
      return "";
    }
  }

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ");
  }

  function limpiarArchivo(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .substring(0, 120);
  }

  function simpleHash(value) {
    var str = String(value || "");
    var hash = 0;
    var i;
    var chr;

    if (str.length === 0) {
      return "0";
    }

    for (i = 0; i < str.length; i++) {
      chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }

    return String(Math.abs(hash));
  }

  function getPeriodoLabelFromOption(option) {
    if (!option) {
      return "";
    }

    return option.textContent || option.innerText || option.value || "";
  }

  function getSelectedPeriodoInfo() {
    if (!elPeriodo || !elPeriodo.value) {
      return {
        id: "",
        label: ""
      };
    }

    var option = elPeriodo.options[elPeriodo.selectedIndex];

    return {
      id: elPeriodo.value || "",
      label: normalizeText(getPeriodoLabelFromOption(option))
    };
  }

  function getSequenceManager() {
    if (!window.MEMCOM || !window.MEMCOM.sequence) {
      throw new Error("No está cargado memcom.sequence.js.");
    }

    return window.MEMCOM.sequence;
  }

  function getTableManager() {
    if (!window.MEMCOM || !window.MEMCOM.tables) {
      throw new Error("No está cargado memcom.tables.js.");
    }

    return window.MEMCOM.tables;
  }

  function getMemoDateInfo(metadata) {
    try {
      var sequence = getSequenceManager();
      var memoDate = sequence.resolveMemoDate(metadata);
      var parts = sequence.getDateParts(memoDate);

      return {
        date: memoDate,
        parts: parts,
        fechaHumana: sequence.getFechaHumana(memoDate)
      };
    } catch (error) {
      return null;
    }
  }

  function getNextMemoText() {
    try {
      var sequence = getSequenceManager();
      var metadata = buildMemoMetadata();
      var next = sequence.getNextInfo(metadata);
      var memoDateInfo = getMemoDateInfo(metadata);
      var extra = "";

      if (memoDateInfo && memoDateInfo.parts && metadata.periodo) {
        extra = " | Mes aplicado: " + memoDateInfo.parts.codigoMes;
      }

      return "Próximo memorando: " + next.codigoCompleto + extra;
    } catch (error) {
      return "Próximo memorando: se asignará al generar";
    }
  }

  function extractPeriodoId(item) {
    return String(
      item.id ||
      item.periodoId ||
      item.periodoid ||
      item.value ||
      item.codigo ||
      item.periodo ||
      item.label ||
      ""
    ).trim();
  }

  function extractPeriodoLabel(item) {
    return String(
      item.label ||
      item.periodoLabel ||
      item.nombre ||
      item.name ||
      item.periodo ||
      item.id ||
      item.periodoId ||
      ""
    ).trim();
  }

  function fillPeriodos(periodos) {
    if (!elPeriodo) {
      return;
    }

    elPeriodo.innerHTML = "";

    var emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "Seleccione un período";
    elPeriodo.appendChild(emptyOption);

    if (!Array.isArray(periodos) || periodos.length === 0) {
      var option = document.createElement("option");
      option.value = "";
      option.textContent = "No existen períodos disponibles";
      elPeriodo.appendChild(option);
      return;
    }

    periodos.forEach(function (periodo) {
      var id = extractPeriodoId(periodo);
      var label = extractPeriodoLabel(periodo);

      if (!id && !label) {
        return;
      }

      var option = document.createElement("option");
      option.value = id || label;
      option.textContent = label || id;
      elPeriodo.appendChild(option);
    });
  }

  function tryReadTables(showError) {
    try {
      var tables = getTableManager().getTables();
      state.tablas = tables;
      return true;
    } catch (error) {
      state.tablas = [];

      if (showError) {
        setStatus(error.message || "No se pudieron procesar las tablas.", "err");
      }

      return false;
    }
  }

  function renderTablePreview() {
    var ok = tryReadTables(true);

    if (!ok) {
      getTableManager().clearPreview();

      if (btnPdf) {
        btnPdf.disabled = true;
      }

      return false;
    }

    getTableManager().renderPreview(state.tablas);
    checkPdfButton();

    return true;
  }

  function checkPdfButton() {
    var periodoInfo = getSelectedPeriodoInfo();

    state.periodoSeleccionado = periodoInfo.label;
    state.periodoIdSeleccionado = periodoInfo.id;

    saveState();
    tryReadTables(false);

    if (btnPdf) {
      btnPdf.disabled = !(state.periodoSeleccionado && state.tablas.length > 0);
    }
  }

  function buildMemoMetadata() {
    var tipo = elTipo ? elTipo.value : "EXAMEN COMPLEXIVO";
    var periodoInfo = getSelectedPeriodoInfo();
    var tablasString = JSON.stringify(state.tablas || []);

    return {
      tipo: tipo,
      periodo: periodoInfo.label,
      periodoLabel: periodoInfo.label,
      periodoId: periodoInfo.id,
      cronogramaHash: simpleHash(tablasString),
      reglaFechaMemo: "FIN_PERIODO_MENOS_3_MESES"
    };
  }

  function buildPayload(sequenceInfo) {
    var metadata = buildMemoMetadata();

    return {
      periodo: metadata.periodo,
      periodoId: metadata.periodoId,
      tablas: state.tablas,
      cronograma: state.tablas.length > 0
        ? [state.tablas[0].columnas].concat(state.tablas[0].filas)
        : [],
      tipo: metadata.tipo,
      memo: sequenceInfo,
      memoCorrelativoMensual: sequenceInfo.correlativo,
      memoCodigoMes: sequenceInfo.codigoMes,
      memoCodigoCompleto: sequenceInfo.codigoCompleto,
      fechaDocumento: sequenceInfo.fechaHumana,
      fechaDocumentoIso: sequenceInfo.fechaIso,
      reglaFechaMemo: metadata.reglaFechaMemo
    };
  }

  function downloadPdf(pdfBytes, filename) {
    var blob = new Blob([pdfBytes], {
      type: "application/pdf"
    });

    var link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(function () {
      URL.revokeObjectURL(link.href);
    }, 1000);
  }

  async function onGeneratePdf() {
    var processed = renderTablePreview();

    if (!processed || !state.periodoSeleccionado || state.tablas.length === 0) {
      return;
    }

    var sequenceInfo = null;

    try {
      if (!window.MEMCOM || !window.MEMCOM.pdf || !window.MEMCOM.pdf.generatePdfBytes) {
        throw new Error("No está cargado memcom.pdf.js.");
      }

      if (btnPdf) {
        btnPdf.innerHTML = "Generando...";
        btnPdf.disabled = true;
      }

      setStatus("Reservando número de memorando.", "info");

      var sequence = getSequenceManager();
      var metadata = buildMemoMetadata();
      var memoDateInfo = getMemoDateInfo(metadata);

      if (!memoDateInfo || !memoDateInfo.parts) {
        throw new Error("No se pudo calcular la fecha del memorando desde el período seleccionado.");
      }

      sequenceInfo = await sequence.reserve(metadata);

      setStatus(
        "Generando PDF " + sequenceInfo.codigoCompleto +
        " con mes aplicado " + sequenceInfo.codigoMes + ".",
        "info"
      );

      var payload = buildPayload(sequenceInfo);
      var pdfBytes = await window.MEMCOM.pdf.generatePdfBytes(payload);

      var filename = [
        "MEMO",
        limpiarArchivo(sequenceInfo.codigoCompleto),
        limpiarArchivo(payload.tipo),
        limpiarArchivo(payload.periodo)
      ].join("_") + ".pdf";

      downloadPdf(pdfBytes, filename);

      if (sequenceInfo.reused) {
        setStatus("Memo descargado con código ya reservado: " + sequenceInfo.codigoCompleto + ".", "ok");
      } else {
        setStatus("Memo descargado correctamente: " + sequenceInfo.codigoCompleto + ".", "ok");
      }
    } catch (error) {
      console.error("[MEMCOM_APP] Error generando memo:", error);

      if (sequenceInfo && sequenceInfo.token) {
        try {
          await window.MEMCOM.sequence.release(sequenceInfo.token);
        } catch (releaseError) {
          console.error("[MEMCOM_APP] No se pudo liberar la reserva:", releaseError);
        }
      }

      setStatus("Error: " + (error.message || "No se pudo generar el memo."), "err");
    } finally {
      if (btnPdf) {
        btnPdf.innerHTML = '<span class="icon">⬇</span> Generar Memo PDF';
        checkPdfButton();
      }
    }
  }

  function initTables() {
    getTableManager().init({
      countSelectId: "mc-num-tablas",
      containerId: "mc-tables-container",
      previewContainerId: "mc-table-preview",
      previewListId: "mc-table-preview-list",
      onChange: function () {
        checkPdfButton();
      }
    });
  }

  async function load() {
    try {
      setStatus("Cargando períodos.", "info");

      if (!window.MEMCOM || !window.MEMCOM.data || !window.MEMCOM.data.getAll) {
        throw new Error("No está cargado memcom.data-remote.js.");
      }

      initTables();

      var savedPeriodo = restoreState();
      var data = await window.MEMCOM.data.getAll();

      state.periodos = Array.isArray(data.periodos) ? data.periodos : [];

      fillPeriodos(state.periodos);

      if (savedPeriodo && elPeriodo) {
        elPeriodo.value = savedPeriodo;
      }

      checkPdfButton();

      setStatus("Listo. " + getNextMemoText(), "ok");
    } catch (error) {
      console.error("[MEMCOM_APP] Error cargando datos:", error);
      setStatus("Error al cargar datos: " + error.message, "err");
    }
  }

  if (elPeriodo) {
    elPeriodo.addEventListener("change", function () {
      checkPdfButton();
      setStatus("Período actualizado. " + getNextMemoText(), "ok");
    });
  }

  if (elTipo) {
    elTipo.addEventListener("change", function () {
      saveState();
      setStatus("Tipo actualizado. " + getNextMemoText(), "ok");
    });
  }

  if (btnPreview) {
    btnPreview.addEventListener("click", function () {
      var ok = renderTablePreview();

      if (!ok) {
        return;
      }

      setStatus(
        "Tablas procesadas. Se generará un solo memorando con " +
        state.tablas.length +
        " tabla(s). " +
        getNextMemoText(),
        "ok"
      );
    });
  }

  if (btnRefrescar) {
    btnRefrescar.addEventListener("click", load);
  }

  if (btnPdf) {
    btnPdf.addEventListener("click", onGeneratePdf);
  }

  if (btnVolver) {
    btnVolver.addEventListener("click", function () {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "../screen-lista/list.ui.html";
      }
    });
  }

  load();
})(window, document);