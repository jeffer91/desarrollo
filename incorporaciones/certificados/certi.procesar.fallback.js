/*
=========================================================
Nombre completo: certi.procesar.fallback.js
Ruta o ubicación: /incorporaciones/certificados/certi.procesar.fallback.js
Función o funciones:
- Enlazar directamente el botón Procesar datos como respaldo final.
- Procesar capacitación docente aunque certi.app.js no haya enlazado el evento principal.
- Sincronizar período, fecha, fuente y archivo directamente desde el DOM.
- Actualizar el estado central para habilitar PDF único e individuales.
Con qué se une:
- certi.index.html
- certi.state.js
- certi.source.js
- certi.logic.js
- certi.render.js
- certi.capacitacion.excel.js
- certi.capacitacion.logic.js
=========================================================
*/

(function () {
  "use strict";

  const TIPO_CAPACITACION = "capacitacion";

  iniciarCuandoEsteListo();

  function iniciarCuandoEsteListo() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", enlazarBotonFallback);
      return;
    }

    enlazarBotonFallback();
  }

  function enlazarBotonFallback() {
    const boton = document.getElementById("certiBtnProcesar");
    if (!boton || boton.dataset.certiFallbackProcesar === "1") return;

    boton.dataset.certiFallbackProcesar = "1";

    boton.addEventListener("click", function (evento) {
      evento.preventDefault();
      evento.stopImmediatePropagation();
      procesarDirecto();
    }, true);
  }

  async function procesarDirecto() {
    const boton = document.getElementById("certiBtnProcesar");

    try {
      bloquearBoton(true);
      limpiarErroresVisuales();
      mostrarEstado("Procesando datos del Excel. Espere un momento...", "info");

      const estadoDom = obtenerEstadoDesdeDom();
      const errores = validarEstadoDom(estadoDom);

      if (errores.length) {
        throw new Error(errores[0]);
      }

      sincronizarState(estadoDom);

      const lectura = await leerFuente(estadoDom);
      const resultado = procesarLectura(lectura, estadoDom);
      const resultadoFinal = fusionarAlertasLectura(resultado, lectura.alertas);

      actualizarStateConResultado(lectura, resultadoFinal, estadoDom);
      renderizarPantalla();
      guardarFormulario(estadoDom);

      const resumen = resultadoFinal.resumen || {};
      const listos = resumen.certificadosListos || 0;
      const leidos = resumen.registrosLeidos || lectura.registros.length || 0;

      mostrarEstado(
        `Procesamiento terminado: ${listos} certificado(s) listo(s) de ${leidos} registro(s) leído(s).`,
        listos > 0 ? "success" : "warning"
      );

      enfocarResumen();
    } catch (error) {
      const mensaje = error && error.message ? error.message : "No se pudieron procesar los datos.";
      mostrarEstado(mensaje, "error");
      mostrarErrorEnPanel(mensaje);
      enfocarResumen();
    } finally {
      bloquearBoton(false);
      if (boton) boton.blur();
    }
  }

  function obtenerEstadoDesdeDom() {
    const tipoSelect = document.getElementById("certiTipoCertificado");
    const periodoSelect = document.getElementById("certiPeriodo");
    const fechaInput = document.getElementById("certiFechaCertificado");
    const fuenteSelect = document.getElementById("certiFuenteDatos");
    const excelInput = document.getElementById("certiExcelInput");
    const textoInput = document.getElementById("certiTextoInput");

    const periodoOption = periodoSelect && periodoSelect.options[periodoSelect.selectedIndex]
      ? periodoSelect.options[periodoSelect.selectedIndex]
      : null;

    const tipoCertificado = tipoSelect && tipoSelect.value
      ? tipoSelect.value
      : TIPO_CAPACITACION;

    const fuenteDatos = tipoCertificado === TIPO_CAPACITACION
      ? "excel"
      : (fuenteSelect && fuenteSelect.value ? fuenteSelect.value : "auto");

    return {
      tipoCertificado,
      periodoSeleccionado: periodoSelect ? periodoSelect.value || "" : "",
      periodoTexto: periodoOption ? periodoOption.textContent || periodoOption.value || "" : "",
      fechaCertificado: fechaInput ? fechaInput.value || "" : "",
      fuenteDatos,
      archivoExcel: excelInput && excelInput.files && excelInput.files[0] ? excelInput.files[0] : null,
      textoPegado: textoInput ? textoInput.value || "" : ""
    };
  }

  function validarEstadoDom(estado) {
    const errores = [];

    if (!estado.periodoSeleccionado) {
      errores.push("Debe seleccionar un período.");
    }

    if (!estado.fechaCertificado) {
      errores.push("Debe seleccionar la fecha del certificado.");
    }

    if (estado.tipoCertificado === TIPO_CAPACITACION && !estado.archivoExcel) {
      errores.push("Debe cargar el Excel de capacitación docente.");
    }

    if (estado.tipoCertificado !== TIPO_CAPACITACION) {
      const tieneExcel = Boolean(estado.archivoExcel);
      const tieneTexto = Boolean(String(estado.textoPegado || "").trim());

      if (estado.fuenteDatos === "excel" && !tieneExcel) {
        errores.push("Debe cargar el Excel de mejores egresados.");
      } else if (estado.fuenteDatos === "texto" && !tieneTexto) {
        errores.push("Debe pegar el texto de mejores egresados.");
      } else if (estado.fuenteDatos === "auto" && !tieneExcel && !tieneTexto) {
        errores.push("Debe cargar un Excel o pegar texto válido.");
      }
    }

    return errores;
  }

  function sincronizarState(estado) {
    if (!window.CertiState) return;

    if (typeof window.CertiState.establecerPeriodo === "function") {
      window.CertiState.establecerPeriodo(estado.periodoSeleccionado, estado.periodoTexto);
    }

    if (typeof window.CertiState.establecerFecha === "function") {
      window.CertiState.establecerFecha(estado.fechaCertificado);
    }

    if (typeof window.CertiState.establecerFuenteDatos === "function") {
      window.CertiState.establecerFuenteDatos(estado.fuenteDatos);
    }

    if (typeof window.CertiState.establecerArchivoExcel === "function") {
      window.CertiState.establecerArchivoExcel(estado.archivoExcel);
    }

    if (typeof window.CertiState.establecerTextoPegado === "function") {
      window.CertiState.establecerTextoPegado(estado.textoPegado);
    }
  }

  async function leerFuente(estado) {
    if (estado.tipoCertificado === TIPO_CAPACITACION) {
      if (!window.CertiCapacitacionExcel || typeof window.CertiCapacitacionExcel.leerArchivo !== "function") {
        throw new Error("No está disponible el lector de Excel de capacitación docente.");
      }

      return window.CertiCapacitacionExcel.leerArchivo(estado.archivoExcel);
    }

    if (!window.CertiSource || typeof window.CertiSource.leer !== "function") {
      throw new Error("No está disponible el lector de fuentes de datos.");
    }

    const estadoBase = window.CertiState && typeof window.CertiState.obtener === "function"
      ? window.CertiState.obtener()
      : estado;

    return window.CertiSource.leer(estadoBase);
  }

  function procesarLectura(lectura, estado) {
    if (estado.tipoCertificado === TIPO_CAPACITACION) {
      if (!window.CertiCapacitacionLogic || typeof window.CertiCapacitacionLogic.procesar !== "function") {
        throw new Error("No está disponible la lógica de capacitación docente.");
      }

      return window.CertiCapacitacionLogic.procesar(lectura.registros || []);
    }

    if (!window.CertiLogic || typeof window.CertiLogic.procesar !== "function") {
      throw new Error("No está disponible la lógica de certificados.");
    }

    const estadoBase = window.CertiState && typeof window.CertiState.obtener === "function"
      ? window.CertiState.obtener()
      : {};

    return window.CertiLogic.procesar(lectura.registros || [], {
      emparejamientosCarrera: estadoBase.emparejamientosCarrera || {},
      empatesSeleccionados: estadoBase.empatesSeleccionados || {},
      origenDatos: lectura.origen
    });
  }

  function actualizarStateConResultado(lectura, resultado, estadoDom) {
    if (!window.CertiState) return;

    if (typeof window.CertiState.establecerLecturaDatos === "function") {
      window.CertiState.establecerLecturaDatos(lectura);
    }

    if (typeof window.CertiState.establecerRegistros === "function") {
      window.CertiState.establecerRegistros(lectura.registros || []);
    }

    if (typeof window.CertiState.establecerOrigenDatos === "function") {
      window.CertiState.establecerOrigenDatos(lectura.origen || estadoDom.tipoCertificado, lectura.nombreArchivo || "");
    }

    if (typeof window.CertiState.establecerResultado === "function") {
      window.CertiState.establecerResultado(resultado);
    }
  }

  function fusionarAlertasLectura(resultado, alertasLectura) {
    const base = resultado || {};
    const alertasBase = Array.isArray(base.alertas) ? base.alertas : [];
    const alertasFuente = Array.isArray(alertasLectura) ? alertasLectura : [];
    const alertas = alertasFuente.concat(alertasBase);

    return {
      ...base,
      alertas,
      resumen: {
        ...(base.resumen || {}),
        alertas: alertas.length
      }
    };
  }

  function renderizarPantalla() {
    if (
      window.CertiRender &&
      typeof window.CertiRender.renderizar === "function" &&
      window.CertiState &&
      typeof window.CertiState.obtener === "function"
    ) {
      window.CertiRender.renderizar(window.CertiState.obtener());
    }
  }

  function guardarFormulario(estado) {
    if (!window.CertiStorage || typeof window.CertiStorage.guardarUltimoFormulario !== "function") return;

    window.CertiStorage.guardarUltimoFormulario({
      periodoSeleccionado: estado.periodoSeleccionado,
      periodoTexto: estado.periodoTexto,
      fechaCertificado: estado.fechaCertificado,
      fuenteDatos: estado.fuenteDatos
    });
  }

  function limpiarErroresVisuales() {
    if (window.CertiState && typeof window.CertiState.establecerErrores === "function") {
      window.CertiState.establecerErrores([]);
    }
  }

  function mostrarErrorEnPanel(mensaje) {
    if (window.CertiState && typeof window.CertiState.establecerErrores === "function") {
      window.CertiState.establecerErrores([
        {
          tipo: "danger",
          titulo: "Error",
          mensaje
        }
      ]);
      renderizarPantalla();
      return;
    }

    const alertas = document.getElementById("certiAlertas");
    if (alertas) {
      alertas.innerHTML = `
        <div class="certi-alert certi-alert-danger">
          <strong>Error</strong>
          ${escaparHtml(mensaje)}
        </div>
      `;
    }
  }

  function mostrarEstado(mensaje, tipo) {
    const estado = asegurarCajaEstado();
    if (!estado) return;

    estado.textContent = mensaje;
    estado.className = `certi-process-status certi-process-status-${tipo || "info"}`;
  }

  function asegurarCajaEstado() {
    let estado = document.getElementById("certiProcesarEstado");
    if (estado) return estado;

    const acciones = document.querySelector(".certi-actions");
    if (!acciones) return null;

    estado = document.createElement("div");
    estado.id = "certiProcesarEstado";
    estado.className = "certi-process-status certi-process-status-hidden";
    acciones.appendChild(estado);
    return estado;
  }

  function bloquearBoton(bloquear) {
    const boton = document.getElementById("certiBtnProcesar");
    if (!boton) return;

    boton.disabled = Boolean(bloquear);
    boton.textContent = bloquear ? "Procesando..." : "Procesar datos";
  }

  function enfocarResumen() {
    const destino = document.getElementById("certiResumenCards") || document.getElementById("certiAlertas");
    if (!destino || typeof destino.scrollIntoView !== "function") return;

    setTimeout(function () {
      destino.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  function escaparHtml(valor) {
    return String(valor == null ? "" : valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  window.CertiProcesarFallback = {
    procesarDirecto,
    enlazarBotonFallback
  };
})();
