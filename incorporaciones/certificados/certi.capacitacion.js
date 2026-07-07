/*
=========================================================
Nombre completo: certi.capacitacion.js
Ruta o ubicación: /incorporaciones/certificados/certi.capacitacion.js
Función o funciones:
- Integrar el tipo certificado de capacitación docente dentro de Certi.
- Conectar el selector de tipo de certificado con el estado de la app.
- Enrutar lectura, lógica, render, plantilla y PDF según el tipo seleccionado.
- Mantener intacto el flujo actual de reconocimiento a mejores egresados.
- Mostrar Cargo / Cédula según el Excel cargado.
Con qué se une:
- certi.tipos.js
- certi.firmantes.js
- certi.capacitacion.excel.js
- certi.capacitacion.logic.js
- certi.capacitacion.template.js
- certi.state.js
- certi.source.js
- certi.logic.js
- certi.render.js
- certi.template.js
- certi.pdf.js
=========================================================
*/

(function () {
  "use strict";

  const TIPO_CAPACITACION = "capacitacion";
  const TIPO_RECONOCIMIENTO = "reconocimiento";

  iniciarExtension();

  function iniciarExtension() {
    parchearState();
    parchearSource();
    parchearLogic();
    parchearTemplate();
    parchearPdf();
    parchearRender();

    document.addEventListener("DOMContentLoaded", function () {
      inicializarSelector();
      actualizarInterfazPorTipo();
    });
  }

  function parchearState() {
    const State = window.CertiState;
    if (!State || State.__capacitacionAplicado) return;

    const obtenerOriginal = State.obtener.bind(State);

    State.obtener = function () {
      const estado = obtenerOriginal();
      const tipo = obtenerTipoActual();

      estado.tipoCertificado = tipo;
      estado.tipoCertificadoTexto = obtenerNombreTipo(tipo);

      return estado;
    };

    State.establecerTipoCertificado = function (tipo) {
      establecerTipoActual(tipo, { guardar: true });
      return State.obtener();
    };

    State.__capacitacionAplicado = true;
  }

  function parchearSource() {
    const Source = window.CertiSource;
    if (!Source || Source.__capacitacionAplicado) return;

    const leerOriginal = Source.leer.bind(Source);
    const resolverOriginal = Source.resolverFuente.bind(Source);
    const describirOriginal = typeof Source.describirFuente === "function"
      ? Source.describirFuente.bind(Source)
      : null;

    Source.resolverFuente = function (estado) {
      if (esCapacitacion(estado)) {
        if (!estado || !estado.archivoExcel) {
          throw new Error("Debe cargar el Excel de capacitación docente.");
        }

        return TIPO_CAPACITACION;
      }

      return resolverOriginal(estado);
    };

    Source.leer = async function (estado) {
      if (esCapacitacion(estado)) {
        if (!window.CertiCapacitacionExcel || typeof window.CertiCapacitacionExcel.leerArchivo !== "function") {
          throw new Error("No está disponible el lector de Excel de capacitación docente.");
        }

        return window.CertiCapacitacionExcel.leerArchivo(estado.archivoExcel);
      }

      return leerOriginal(estado);
    };

    Source.describirFuente = function (estado) {
      if (esCapacitacion(estado)) {
        return "Excel de capacitación docente";
      }

      return describirOriginal ? describirOriginal(estado) : "Datos";
    };

    Source.__capacitacionAplicado = true;
  }

  function parchearLogic() {
    const Logic = window.CertiLogic;
    if (!Logic || Logic.__capacitacionAplicado) return;

    const procesarOriginal = Logic.procesar.bind(Logic);
    const validarOriginal = Logic.validarGeneracion.bind(Logic);
    const prepararOriginal = Logic.prepararCertificados.bind(Logic);

    Logic.procesar = function (registros, opciones) {
      if (esCapacitacionPorDatos(registros, opciones)) {
        return window.CertiCapacitacionLogic.procesar(registros);
      }

      return procesarOriginal(registros, opciones);
    };

    Logic.validarGeneracion = function (estado) {
      if (esCapacitacion(estado)) {
        return window.CertiCapacitacionLogic.validarGeneracion(estado);
      }

      return validarOriginal(estado);
    };

    Logic.prepararCertificados = function (estado) {
      if (esCapacitacion(estado)) {
        return window.CertiCapacitacionLogic.prepararCertificados(estado);
      }

      return prepararOriginal(estado);
    };

    Logic.__capacitacionAplicado = true;
  }

  function parchearTemplate() {
    const Template = window.CertiTemplate;
    if (!Template || Template.__capacitacionAplicado) return;

    const dibujarOriginal = Template.dibujarCertificado.bind(Template);

    Template.dibujarCertificado = async function (doc, certificado, opciones) {
      if (certificado && certificado.tipoCertificado === TIPO_CAPACITACION) {
        window.CertiCapacitacionTemplate.dibujarCertificado(doc, certificado, opciones || {});
        return;
      }

      return dibujarOriginal(doc, certificado, opciones);
    };

    Template.__capacitacionAplicado = true;
  }

  function parchearPdf() {
    const Pdf = window.CertiPdf;
    if (!Pdf || Pdf.__capacitacionAplicado) return;

    const descargarUnicoOriginal = Pdf.descargarPdfUnico.bind(Pdf);
    const descargarIndividualesOriginal = Pdf.descargarPdfIndividuales.bind(Pdf);

    Pdf.descargarPdfUnico = async function (estado) {
      if (!esCapacitacion(estado)) {
        return descargarUnicoOriginal(estado);
      }

      return ejecutarConConfigTipo(TIPO_CAPACITACION, function () {
        return descargarUnicoOriginal(estado);
      });
    };

    Pdf.descargarPdfIndividuales = async function (estado) {
      if (!esCapacitacion(estado)) {
        return descargarIndividualesOriginal(estado);
      }

      return ejecutarConConfigTipo(TIPO_CAPACITACION, function () {
        return descargarIndividualesOriginal(estado);
      });
    };

    Pdf.__capacitacionAplicado = true;
  }

  function parchearRender() {
    const Render = window.CertiRender;
    if (!Render || Render.__capacitacionAplicado) return;

    const renderizarOriginal = Render.renderizar.bind(Render);

    Render.renderizar = function (estado) {
      const tipo = obtenerTipoActual();
      const estadoSeguro = Object.assign({}, estado || {}, {
        tipoCertificado: tipo,
        tipoCertificadoTexto: obtenerNombreTipo(tipo)
      });

      renderizarOriginal(estadoSeguro);

      if (tipo === TIPO_CAPACITACION) {
        renderizarCapacitacion(estadoSeguro);
      } else {
        restaurarTablaReconocimiento();
      }

      actualizarInterfazPorTipo();
    };

    Render.__capacitacionAplicado = true;
  }

  function inicializarSelector() {
    const Tipos = window.CertiTipos;

    if (Tipos && typeof Tipos.inicializarSelector === "function") {
      Tipos.inicializarSelector(function (tipo) {
        manejarCambioTipo(tipo);
      });
    }

    const tipo = obtenerTipoActual();
    establecerTipoActual(tipo, { guardar: false });
  }

  function manejarCambioTipo(tipo) {
    establecerTipoActual(tipo, { guardar: true });

    if (window.CertiState && typeof window.CertiState.limpiarResultados === "function") {
      window.CertiState.limpiarResultados();
    }

    if (tipo === TIPO_CAPACITACION) {
      forzarFuenteExcel();
    }

    actualizarInterfazPorTipo();
  }

  function actualizarInterfazPorTipo() {
    const tipo = obtenerTipoActual();
    const esCap = tipo === TIPO_CAPACITACION;
    const configTipo = obtenerConfigTipo(tipo);

    const descripcion = document.querySelector(".certi-hero p:not(.certi-eyebrow)");
    const badge = document.querySelector(".certi-hero-badge strong");
    const subtituloConfig = document.querySelector(".certi-panel-title p");
    const bloqueTexto = document.getElementById("certiBloqueTexto");
    const fuente = document.getElementById("certiFuenteDatos");
    const labelExcel = document.querySelector(".certi-file-field span");
    const ayudaTexto = document.getElementById("certiTextoAyuda");

    if (descripcion) {
      descripcion.textContent = configTipo.descripcion || "Generación automática de certificados institucionales por tipo.";
    }

    if (badge) {
      badge.textContent = esCap ? "Capacitación" : "Excel + Texto";
    }

    if (subtituloConfig) {
      subtituloConfig.textContent = esCap
        ? "Seleccione el período, fecha oficial y cargue el Excel de capacitación docente."
        : "Seleccione el período, fecha oficial y cargue los datos de mejores egresados.";
    }

    if (labelExcel) {
      labelExcel.textContent = esCap ? "Excel de capacitación docente" : "Excel de mejores egresados";
    }

    if (fuente) {
      fuente.disabled = esCap;
      if (esCap) fuente.value = "excel";
    }

    if (bloqueTexto) {
      bloqueTexto.style.display = esCap ? "none" : "";
    }

    if (ayudaTexto && !esCap) {
      ayudaTexto.style.display = "";
    }
  }

  function renderizarCapacitacion(estado) {
    renderizarResumenCapacitacion(estado);
    renderizarTablaCapacitacion(estado);
    ocultarPanelesNoUsados();
  }

  function renderizarResumenCapacitacion(estado) {
    const contenedor = document.getElementById("certiResumenCards");
    if (!contenedor) return;

    const resumen = estado.resultado && estado.resultado.resumen
      ? estado.resultado.resumen
      : {
        registrosLeidos: 0,
        carrerasDetectadas: 0,
        certificadosListos: 0,
        alertas: 0
      };

    contenedor.innerHTML = `
      <article class="certi-summary-card">
        <span>Docentes leídos</span>
        <strong>${resumen.registrosLeidos || 0}</strong>
      </article>

      <article class="certi-summary-card">
        <span>Cursos detectados</span>
        <strong>${resumen.carrerasDetectadas || 0}</strong>
      </article>

      <article class="certi-summary-card">
        <span>Certificados listos</span>
        <strong>${resumen.certificadosListos || 0}</strong>
      </article>

      <article class="certi-summary-card">
        <span>Alertas</span>
        <strong>${resumen.alertas || 0}</strong>
      </article>
    `;
  }

  function renderizarTablaCapacitacion(estado) {
    const tablaBody = document.getElementById("certiTablaBody");
    const thead = document.querySelector(".certi-table thead tr");

    if (thead) {
      thead.innerHTML = `
        <th>Cargo / Cédula</th>
        <th>Docente</th>
        <th>Curso / Tema</th>
        <th>Nota</th>
        <th>Estado</th>
      `;
    }

    if (!tablaBody) return;

    const registros = estado.resultado && Array.isArray(estado.resultado.mejores)
      ? estado.resultado.mejores
      : [];

    if (!registros.length) {
      tablaBody.innerHTML = `
        <tr>
          <td colspan="5" class="certi-empty">
            Cargue y procese el Excel de capacitación para ver los certificados.
          </td>
        </tr>
      `;
      return;
    }

    tablaBody.innerHTML = registros.map(function (item) {
      const listo = item.estadoCertificado === "listo";
      const nota = window.CertiCapacitacionLogic && typeof window.CertiCapacitacionLogic.formatearNota === "function"
        ? window.CertiCapacitacionLogic.formatearNota(item.nota)
        : String(item.nota || "");
      const identificacion = item.cargo || item.cedula || "—";

      return `
        <tr>
          <td>${escaparHtml(identificacion)}</td>
          <td>${escaparHtml(item.docente || item.nombre)}</td>
          <td>${escaparHtml(item.curso)}</td>
          <td>${escaparHtml(nota)}</td>
          <td>
            <span class="certi-status ${listo ? "certi-status-ok" : "certi-status-warning"}">
              ${listo ? "Listo" : "Incompleto"}
            </span>
          </td>
        </tr>
      `;
    }).join("");
  }

  function restaurarTablaReconocimiento() {
    const thead = document.querySelector(".certi-table thead tr");
    if (!thead) return;

    thead.innerHTML = `
      <th>Carrera oficial</th>
      <th>Mejor egresado</th>
      <th>Promedio</th>
      <th>Estado</th>
    `;
  }

  function ocultarPanelesNoUsados() {
    const carrerasPanel = document.getElementById("certiCarrerasPanel");
    const empatesPanel = document.getElementById("certiEmpatesPanel");

    if (carrerasPanel) carrerasPanel.classList.add("certi-hidden");
    if (empatesPanel) empatesPanel.classList.add("certi-hidden");
  }

  function ejecutarConConfigTipo(tipo, callback) {
    const config = window.CertiConfig || {};
    config.rutas = config.rutas || {};
    config.archivos = config.archivos || {};

    const configTipo = obtenerConfigTipo(tipo);
    const rutaOriginal = config.rutas.plantillaCertificado;
    const prefijoUnicoOriginal = config.archivos.pdfUnicoPrefijo;
    const prefijoIndividualOriginal = config.archivos.pdfIndividualPrefijo;

    config.rutas.plantillaCertificado = configTipo.plantilla;
    config.archivos.pdfUnicoPrefijo = configTipo.pdfUnicoPrefijo;
    config.archivos.pdfIndividualPrefijo = configTipo.pdfIndividualPrefijo;

    return Promise.resolve()
      .then(callback)
      .finally(function () {
        config.rutas.plantillaCertificado = rutaOriginal;
        config.archivos.pdfUnicoPrefijo = prefijoUnicoOriginal;
        config.archivos.pdfIndividualPrefijo = prefijoIndividualOriginal;
      });
  }

  function obtenerTipoActual() {
    if (window.CertiTipos && typeof window.CertiTipos.obtenerActual === "function") {
      return window.CertiTipos.obtenerActual();
    }

    const selector = document.getElementById("certiTipoCertificado");
    return selector && selector.value === TIPO_CAPACITACION ? TIPO_CAPACITACION : TIPO_RECONOCIMIENTO;
  }

  function establecerTipoActual(tipo, opciones) {
    if (window.CertiTipos && typeof window.CertiTipos.establecer === "function") {
      return window.CertiTipos.establecer(tipo, opciones || {});
    }

    return tipo === TIPO_CAPACITACION ? TIPO_CAPACITACION : TIPO_RECONOCIMIENTO;
  }

  function obtenerConfigTipo(tipo) {
    if (window.CertiTipos && typeof window.CertiTipos.obtenerConfig === "function") {
      return window.CertiTipos.obtenerConfig(tipo);
    }

    if (tipo === TIPO_CAPACITACION) {
      return {
        plantilla: "./assets/certi-plantilla-capacitacion.png",
        pdfUnicoPrefijo: "Certificados_Capacitacion_Docente",
        pdfIndividualPrefijo: "Certificado_Capacitacion",
        descripcion: "Generación automática de certificados de capacitación para docentes desde Excel."
      };
    }

    return {
      plantilla: "./assets/certi-plantilla-certificado.png",
      pdfUnicoPrefijo: "Certificados_Mejores_Egresados",
      pdfIndividualPrefijo: "Certificado",
      descripcion: "Generación automática de certificados de reconocimiento para mejores egresados por carrera."
    };
  }

  function obtenerNombreTipo(tipo) {
    if (window.CertiTipos && typeof window.CertiTipos.obtenerNombre === "function") {
      return window.CertiTipos.obtenerNombre(tipo);
    }

    return tipo === TIPO_CAPACITACION ? "Certificado de capacitación docente" : "Reconocimiento a mejores egresados";
  }

  function esCapacitacion(estado) {
    const tipo = estado && estado.tipoCertificado ? estado.tipoCertificado : obtenerTipoActual();
    return tipo === TIPO_CAPACITACION;
  }

  function esCapacitacionPorDatos(registros, opciones) {
    if (opciones && opciones.origenDatos === TIPO_CAPACITACION) return true;

    return (registros || []).some(function (registro) {
      return registro && registro.tipoCertificado === TIPO_CAPACITACION;
    });
  }

  function forzarFuenteExcel() {
    const fuente = document.getElementById("certiFuenteDatos");

    if (fuente && fuente.value !== "excel") {
      fuente.value = "excel";

      if (window.CertiState && typeof window.CertiState.establecerFuenteDatos === "function") {
        window.CertiState.establecerFuenteDatos("excel");
      }
    }
  }

  function escaparHtml(valor) {
    if (window.CertiUtils && typeof window.CertiUtils.escaparHtml === "function") {
      return window.CertiUtils.escaparHtml(valor);
    }

    return String(valor == null ? "" : valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  window.CertiCapacitacion = {
    tipo: TIPO_CAPACITACION,
    iniciarExtension,
    actualizarInterfazPorTipo,
    renderizarCapacitacion,
    obtenerTipoActual,
    establecerTipoActual
  };
})();
