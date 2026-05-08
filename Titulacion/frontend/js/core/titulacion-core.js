/* =========================================================
Nombre completo: titulacion-core.js
Ruta: /Titulacion/frontend/js/core/titulacion-core.js
Función o funciones:
- Inicializar la aplicación principal de Titulación.
- Importar datos desde Excel/CSV.
- Clasificar período y modalidad.
- Generar documentos completos de titulación.
- Corregir el envío de contexto a capítulos regulares y PVC.
- Renderizar vista previa, guardar en repositorio local y exportar PDF.
========================================================= */

(function (window, document) {
  "use strict";

  var State = {
    initialized: false,
    rows: [],
    documentData: null,
    plans: [],
    selectedPlanKey: ""
  };

  function U() {
    return window.TITULACION_UTILS || {};
  }

  function Repo() {
    return window.TITULACION_LOCAL_REPO || {};
  }

  function PeriodoModalidad() {
    return window.TITULACION_PERIODO_MODALIDAD || {};
  }

  function Importer() {
    return window.TITULACION_IMPORT_EXCEL || {};
  }

  function Portada() {
    return window.TITULACION_PORTADA || {};
  }

  function ResumenTecnico() {
    return window.TITULACION_RESUMEN_TECNICO || {};
  }

  function Indice() {
    return window.TITULACION_INDICE || {};
  }

  function Anexos() {
    return window.TITULACION_ANEXOS || {};
  }

  function Pdf() {
    return window.TITULACION_EXPORT_PDF || {};
  }

  function $(id) {
    return document.getElementById(id);
  }

  function asText(value) {
    if (U().asText) return U().asText(value);
    return String(value === null || value === undefined ? "" : value).trim();
  }

  function esc(value) {
    if (U().escapeHtml) return U().escapeHtml(value);
    return asText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function setStatus(message, isError) {
    var el = $("document-status");
    if (!el) return;

    el.textContent = asText(message);
    el.classList.toggle("is-error", !!isError);
  }

  function getInputValue(id) {
    var el = $(id);
    return el ? asText(el.value) : "";
  }

  function getSelectedPlan() {
    if (!State.plans.length) return null;

    var key = State.selectedPlanKey || State.plans[0].key;

    return State.plans.find(function (plan) {
      return plan.key === key;
    }) || State.plans[0];
  }

  function createContextFromPlan(plan) {
    var p = plan || {};
    var periodo = p.periodo || {};
    var tipo = p.tipoDocumento === "pvc" || p.modalidad === "pvc" ? "pvc" : "regular";

    return {
      periodo: periodo.label || "",
      periodoLabel: periodo.label || "",
      periodId: periodo.id || "",
      tipoPeriodo: tipo,
      tipo: tipo,
      esPVC: tipo === "pvc",
      esRegular: tipo !== "pvc",
      modalidad: p.modalidad || "",
      modalidadLabel: p.modalidadLabel || "",
      tipoDocumento: p.tipoDocumento || tipo
    };
  }

  function createChapterArgs(plan) {
    var contexto = createContextFromPlan(plan);

    return {
      rows: Array.isArray(plan && plan.rows) ? plan.rows : [],
      contexto: contexto,
      periodo: contexto.periodoLabel,
      periodoLabel: contexto.periodoLabel,
      periodId: contexto.periodId,
      modalidad: contexto.modalidad,
      modalidadLabel: contexto.modalidadLabel,
      tipoPeriodo: contexto.tipoPeriodo,
      tipo: contexto.tipo,
      esPVC: contexto.esPVC,
      esRegular: contexto.esRegular
    };
  }

  function callChapter(moduleName, args) {
    var mod = window[moduleName];

    if (!mod || typeof mod.createSection !== "function") {
      return null;
    }

    try {
      return mod.createSection(args || {});
    } catch (error) {
      console.error("[TITULACION_CORE] Error en " + moduleName + ":", error);
      return {
        id: "error-" + moduleName.toLowerCase(),
        titulo: "Error en sección",
        tipo: "error",
        visible: true,
        contenido: [
          "No se pudo construir la sección " + moduleName + ".",
          error && error.message ? error.message : String(error)
        ]
      };
    }
  }

  function addSection(sections, section) {
    if (!section) return;
    sections.push(section);
  }

  function buildSections(plan) {
    var args = createChapterArgs(plan);
    var sections = [];

    if (Portada().createSection) {
      addSection(sections, Portada().createSection({
        periodo: args.periodoLabel,
        periodoLabel: args.periodoLabel,
        modalidad: args.modalidad,
        modalidadLabel: args.modalidadLabel,
        tipoPeriodo: args.tipoPeriodo,
        tipo: args.tipo
      }));
    }

    if (ResumenTecnico().createSection) {
      addSection(sections, ResumenTecnico().createSection(args));
    }

    [
      "TITULACION_CAPITULO_MARCO_LEGAL",
      "TITULACION_CAPITULO_REGLAMENTO_COMPLEXIVO",
      "TITULACION_CAPITULO_INFOGRAFIA",
      "TITULACION_CAPITULO_METODOLOGIA_NUCLEOS",
      "TITULACION_CAPITULO_CONTENIDO_NUCLEOS",
      "TITULACION_CAPITULO_RESULTADOS",
      "TITULACION_CAPITULO_INFORME_COHORTE",
      "TITULACION_CAPITULO_ANALISIS_COMPARATIVO",
      "TITULACION_CAPITULO_ANALISIS_ESTRATEGICO",
      "TITULACION_CAPITULO_CONCLUSIONES",
      "TITULACION_CAPITULO_RECOMENDACIONES"
    ].forEach(function (moduleName) {
      addSection(sections, callChapter(moduleName, args));
    });

    if (args.esPVC) {
      [
        "TITULACION_PVC_ARTICULO_ACADEMICO",
        "TITULACION_PVC_RESULTADOS",
        "TITULACION_PVC_CONCLUSIONES"
      ].forEach(function (moduleName) {
        addSection(sections, callChapter(moduleName, args));
      });
    }

    if (Anexos().buildAnexosSection) {
      addSection(sections, Anexos().buildAnexosSection());
    }

    return sections;
  }

  function buildDocument(plan) {
    var args = createChapterArgs(plan);
    var title = "Informe Final Del Proceso De Titulación";

    var documentData = {
      titulo: title,
      subtitulo: args.periodoLabel + " - " + args.modalidadLabel,
      meta: {
        periodo: args.periodoLabel,
        periodoLabel: args.periodoLabel,
        periodId: args.periodId,
        modalidad: args.modalidad,
        modalidadLabel: args.modalidadLabel,
        tipoPeriodo: args.tipoPeriodo,
        tipo: args.tipo,
        esPVC: args.esPVC
      },
      secciones: buildSections(plan),
      anexos: Anexos().getCurrentAnexos ? Anexos().getCurrentAnexos() : [],
      updatedAt: new Date().toISOString()
    };

    if (Indice().insertIndex) {
      documentData = Indice().insertIndex(documentData);
    }

    return documentData;
  }

  function renderPlanButtons() {
    var target = $("plans-list");
    if (!target) return;

    if (!State.plans.length) {
      target.innerHTML = '<div class="muted">No hay documentos para generar.</div>';
      return;
    }

    target.innerHTML = State.plans.map(function (plan) {
      var active = plan.key === State.selectedPlanKey ? " is-active" : "";

      return [
        '<button type="button" class="plan-button', active, '" data-plan-key="', esc(plan.key), '">',
        esc(plan.modalidadLabel || plan.key),
        '<span>', String((plan.rows || []).length), ' registro(s)</span>',
        '</button>'
      ].join("");
    }).join("");

    Array.prototype.slice.call(target.querySelectorAll("[data-plan-key]")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        State.selectedPlanKey = btn.getAttribute("data-plan-key");
        generateSelectedDocument();
      });
    });
  }

  function renderDocumentPreview() {
    var target = $("titulacion-documento");
    if (!target) return;

    var doc = State.documentData;

    if (!doc) {
      target.innerHTML = '<div class="document-empty">Todavía no se ha generado un documento.</div>';
      return;
    }

    var html = [
      '<article class="preview-doc">',
      '<h1>', esc(doc.titulo), '</h1>',
      '<p class="doc-subtitle">', esc(doc.subtitulo), '</p>'
    ];

    (doc.secciones || []).forEach(function (section) {
      html.push('<section class="preview-section">');
      html.push('<h2>' + esc(section.titulo) + '</h2>');

      if (section.tipo === "infografia" && section.data && section.data.html) {
        html.push(section.data.html);
      } else {
        (section.contenido || []).forEach(function (p) {
          html.push('<p>' + esc(p) + '</p>');
        });
      }

      html.push("</section>");
    });

    html.push("</article>");
    target.innerHTML = html.join("");
  }

  function refreshAnexosContext() {
    var plan = getSelectedPlan();
    if (!plan) return;

    var args = createChapterArgs(plan);

    if (
      window.TITULACION_ANEXOS_UI &&
      typeof window.TITULACION_ANEXOS_UI.setContext === "function"
    ) {
      window.TITULACION_ANEXOS_UI.setContext({
        periodId: args.periodId,
        periodLabel: args.periodoLabel,
        modalidad: args.modalidad
      });
    }
  }

  function generatePlans() {
    var periodo = getInputValue("periodo-input");

    if (!periodo) {
      setStatus("Ingresa el período antes de generar.", true);
      return;
    }

    if (!PeriodoModalidad().createDocumentPlan) {
      setStatus("No está disponible TITULACION_PERIODO_MODALIDAD.", true);
      return;
    }

    var result = PeriodoModalidad().createDocumentPlan({
      periodo: periodo,
      rows: State.rows
    });

    State.plans = (result.plans || []).filter(function (plan) {
      return plan.generar;
    });

    State.selectedPlanKey = State.plans[0] ? State.plans[0].key : "";

    if (Repo().savePeriodo) {
      Repo().savePeriodo(result.periodo);
    }

    renderPlanButtons();
    generateSelectedDocument();
  }

  function generateSelectedDocument() {
    var plan = getSelectedPlan();

    if (!plan) {
      State.documentData = null;
      renderDocumentPreview();
      setStatus("No hay plan de generación disponible.", true);
      return;
    }

    State.documentData = buildDocument(plan);

    if (Repo().saveDocument) {
      Repo().saveDocument(State.documentData);
    }

    refreshAnexosContext();
    renderPlanButtons();
    renderDocumentPreview();
    setStatus("Documento generado: " + (plan.modalidadLabel || plan.key) + ".");
  }

  async function handleImportFile(file) {
    if (!file) return;

    if (!Importer().parseFile) {
      setStatus("No está disponible el importador de Excel.", true);
      return;
    }

    setStatus("Importando archivo...");

    var result = await Importer().parseFile(file);

    if (!result.ok) {
      setStatus(result.error || "No se pudo importar el archivo.", true);
      return;
    }

    State.rows = result.rows || [];

    if (Repo().saveRows) {
      Repo().saveRows(State.rows);
    }

    setStatus("Archivo importado: " + State.rows.length + " registro(s).");
    generatePlans();
  }

  async function exportPdf() {
    if (!State.documentData) {
      setStatus("Primero genera un documento.", true);
      return;
    }

    try {
      setStatus("Generando PDF...");

      if (Pdf().download) {
        await Pdf().download(State.documentData);
      } else if (Pdf().exportOrPrint) {
        await Pdf().exportOrPrint();
      } else {
        window.print();
      }

      setStatus("PDF generado correctamente.");
    } catch (error) {
      setStatus(error && error.message ? error.message : String(error), true);
    }
  }

  function bindEvents() {
    var importInput = $("excel-input");
    var generateBtn = $("btn-generar-documento");
    var exportBtn = $("btn-exportar");
    var resetBtn = $("btn-limpiar-documento");

    if (importInput) {
      importInput.addEventListener("change", function () {
        if (importInput.files && importInput.files[0]) {
          handleImportFile(importInput.files[0]);
        }

        importInput.value = "";
      });
    }

    if (generateBtn) {
      generateBtn.addEventListener("click", generatePlans);
    }

    if (exportBtn) {
      exportBtn.addEventListener("click", exportPdf);
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        State.rows = [];
        State.plans = [];
        State.documentData = null;
        State.selectedPlanKey = "";

        if (Repo().clearAll) {
          Repo().clearAll();
        }

        renderPlanButtons();
        renderDocumentPreview();
        setStatus("Datos limpiados.");
      });
    }
  }

  function restore() {
    if (Repo().getRows) {
      State.rows = Repo().getRows();
    }

    if (Repo().getDocument) {
      State.documentData = Repo().getDocument();
    }

    renderDocumentPreview();
  }

  function init() {
    if (State.initialized) return;

    State.initialized = true;
    bindEvents();
    restore();
    renderPlanButtons();
    setStatus("Aplicación lista.");
  }

  window.TITULACION_CORE = {
    init: init,
    getState: function () {
      return State;
    },
    generatePlans: generatePlans,
    generateSelectedDocument: generateSelectedDocument,
    buildDocument: buildDocument,
    exportPdf: exportPdf
  };
})(window, document);