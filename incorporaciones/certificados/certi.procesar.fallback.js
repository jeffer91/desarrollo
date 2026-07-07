/*
=========================================================
Nombre completo: certi.procesar.fallback.js
Ruta o ubicación: /incorporaciones/certificados/certi.procesar.fallback.js
Función o funciones:
- Enlazar directamente el botón Procesar datos como respaldo final.
- Procesar capacitación docente aunque certi.app.js no haya enlazado el evento principal.
- Sincronizar período, fecha, fuente y archivo directamente desde el DOM.
- Actualizar el estado central para habilitar PDF único e individuales.
- Pintar directamente resumen, tabla, alertas y botones cuando el render principal no actualiza la vista.
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
      pintarResultadoDirecto(resultadoFinal, estadoDom, lectura);
      guardarFormulario(estadoDom);

      const resumen = resultadoFinal.resumen || {};
      const listos = resumen.certificadosListos || obtenerCertificadosResultado(resultadoFinal).length || 0;
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
    const resumenBase = base.resumen || {};
    const certificados = obtenerCertificadosResultado(base);

    return {
      ...base,
      alertas,
      resumen: {
        ...resumenBase,
        registrosLeidos: Number(resumenBase.registrosLeidos || 0),
        carrerasDetectadas: Number(resumenBase.carrerasDetectadas || 0),
        certificadosListos: Number(resumenBase.certificadosListos || certificados.length || 0),
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

  function pintarResultadoDirecto(resultado, estadoDom, lectura) {
    pintarResumenDirecto(resultado, lectura);
    pintarAlertasDirecto(resultado);
    pintarTablaDirecta(resultado, estadoDom);
    actualizarBotonesDescarga(resultado);
  }

  function pintarResumenDirecto(resultado, lectura) {
    const contenedor = document.getElementById("certiResumenCards");
    if (!contenedor) return;

    const resumen = resultado && resultado.resumen ? resultado.resumen : {};
    const certificados = obtenerCertificadosResultado(resultado);
    const registrosLeidos = resumen.registrosLeidos || (lectura && lectura.registros ? lectura.registros.length : 0);
    const carrerasDetectadas = resumen.carrerasDetectadas || contarCursos(certificados);
    const certificadosListos = resumen.certificadosListos || certificados.length;
    const alertas = resumen.alertas || (resultado && Array.isArray(resultado.alertas) ? resultado.alertas.length : 0);

    contenedor.innerHTML = `
      <article class="certi-summary-card">
        <span>Registros leídos</span>
        <strong>${escaparHtml(registrosLeidos)}</strong>
      </article>

      <article class="certi-summary-card">
        <span>${certificados.some(function (item) { return item.tipoCertificado === TIPO_CAPACITACION; }) ? "Cursos detectados" : "Carreras detectadas"}</span>
        <strong>${escaparHtml(carrerasDetectadas)}</strong>
      </article>

      <article class="certi-summary-card">
        <span>Certificados listos</span>
        <strong>${escaparHtml(certificadosListos)}</strong>
      </article>

      <article class="certi-summary-card">
        <span>Alertas</span>
        <strong>${escaparHtml(alertas)}</strong>
      </article>
    `;
  }

  function pintarAlertasDirecto(resultado) {
    const contenedor = document.getElementById("certiAlertas");
    if (!contenedor) return;

    const alertas = resultado && Array.isArray(resultado.alertas) ? resultado.alertas : [];

    if (!alertas.length) {
      contenedor.innerHTML = "";
      return;
    }

    contenedor.innerHTML = alertas.map(function (alerta) {
      const tipo = normalizarTipoAlerta(alerta.tipo);
      return `
        <div class="certi-alert certi-alert-${tipo}">
          <strong>${escaparHtml(alerta.titulo || "Aviso")}</strong>
          ${escaparHtml(alerta.mensaje || "")}
        </div>
      `;
    }).join("");
  }

  function pintarTablaDirecta(resultado, estadoDom) {
    const tbody = document.getElementById("certiTablaBody");
    const thead = document.querySelector(".certi-table thead tr");
    if (!tbody || !thead) return;

    const certificados = obtenerCertificadosResultado(resultado);
    const esCapacitacion = estadoDom.tipoCertificado === TIPO_CAPACITACION || certificados.some(function (item) {
      return item.tipoCertificado === TIPO_CAPACITACION || item.docente || item.curso;
    });

    if (esCapacitacion) {
      thead.innerHTML = `
        <th>Cargo / Cédula</th>
        <th>Docente</th>
        <th>Curso / Tema</th>
        <th>Nota</th>
        <th>Estado</th>
      `;

      if (!certificados.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="certi-empty">No existen certificados listos.</td></tr>`;
        return;
      }

      tbody.innerHTML = certificados.map(function (item) {
        const identificacion = item.cargo || item.cedula || "—";
        const docente = item.docente || item.nombre || "";
        const curso = item.curso || item.tema || "";
        const nota = formatearNotaVisual(item.nota || item.promedio);

        return `
          <tr>
            <td>${escaparHtml(identificacion)}</td>
            <td>${escaparHtml(docente)}</td>
            <td>${escaparHtml(curso)}</td>
            <td>${escaparHtml(nota)}</td>
            <td><span class="certi-status certi-status-ok">Listo</span></td>
          </tr>
        `;
      }).join("");

      return;
    }

    thead.innerHTML = `
      <th>Carrera oficial</th>
      <th>Mejor egresado</th>
      <th>Promedio</th>
      <th>Estado</th>
    `;

    if (!certificados.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="certi-empty">No existen certificados listos.</td></tr>`;
      return;
    }

    tbody.innerHTML = certificados.map(function (item) {
      return `
        <tr>
          <td>${escaparHtml(item.carreraOficial || item.carrera || "")}</td>
          <td>${escaparHtml(item.nombre || item.estudiante || "")}</td>
          <td>${escaparHtml(item.promedio || item.nota || "")}</td>
          <td><span class="certi-status certi-status-ok">Listo</span></td>
        </tr>
      `;
    }).join("");
  }

  function actualizarBotonesDescarga(resultado) {
    const certificados = obtenerCertificadosResultado(resultado);
    const habilitar = certificados.length > 0;
    const btnUnico = document.getElementById("certiBtnPdfUnico");
    const btnIndividuales = document.getElementById("certiBtnPdfIndividuales");

    if (btnUnico) btnUnico.disabled = !habilitar;
    if (btnIndividuales) btnIndividuales.disabled = !habilitar;
  }

  function obtenerCertificadosResultado(resultado) {
    if (!resultado || typeof resultado !== "object") return [];

    if (Array.isArray(resultado.certificados) && resultado.certificados.length) {
      return resultado.certificados.slice();
    }

    if (Array.isArray(resultado.mejores) && resultado.mejores.length) {
      return resultado.mejores.slice();
    }

    if (Array.isArray(resultado.registrosValidos) && resultado.registrosValidos.length) {
      return resultado.registrosValidos.slice();
    }

    return [];
  }

  function contarCursos(certificados) {
    const mapa = {};

    (certificados || []).forEach(function (item) {
      const clave = String(item.curso || item.tema || item.carrera || item.carreraOficial || "").trim().toUpperCase();
      if (clave) mapa[clave] = true;
    });

    return Object.keys(mapa).length;
  }

  function formatearNotaVisual(valor) {
    if (valor === null || valor === undefined || valor === "") return "";
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return String(valor);
    return numero.toFixed(2);
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

  function normalizarTipoAlerta(tipo) {
    const valor = String(tipo || "info").toLowerCase().trim();
    if (valor === "danger" || valor === "error") return "danger";
    if (valor === "success") return "success";
    if (valor === "warning" || valor === "warn") return "warning";
    return "info";
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
    enlazarBotonFallback,
    pintarResultadoDirecto
  };
})();
