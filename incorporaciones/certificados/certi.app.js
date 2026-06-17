/*
=========================================================
Nombre completo: certi.app.js
Ruta o ubicación: /incorporaciones/certificados/certi.app.js
Función o funciones:
- Iniciar el módulo Certi.
- Conectar la interfaz con Excel, texto pegado, lógica, renderizado, almacenamiento y PDF.
- Controlar el flujo completo: seleccionar período, fecha, cargar fuente, procesar y descargar.
Con qué se une:
- certi.html
- certi.index.html
- certi.config.js
- certi.state.js
- certi.dom.js
- certi.utils.js
- certi.source.js
- certi.excel.js
- certi.text.js
- certi.logic.js
- certi.render.js
- certi.storage.js
- certi.periodos.js
- certi.pdf.js
=========================================================
*/

(function () {
  "use strict";

  const State = window.CertiState;
  const Dom = window.CertiDom;
  const U = window.CertiUtils;
  const Source = window.CertiSource;
  const Logic = window.CertiLogic;
  const Render = window.CertiRender;
  const Storage = window.CertiStorage;
  const Pdf = window.CertiPdf;

  async function iniciar() {
    const dom = Dom.obtener();

    prepararFechaInicial(dom);
    prepararFuenteInicial(dom);
    await cargarPeriodos(dom);
    restaurarDatosGuardados(dom);
    enlazarEventos(dom);
    actualizarVistaFuente(dom);

    State.suscribir(Render.renderizar);

    State.suscribir(function (estado) {
      actualizarVistaFuente(Dom.obtener(), estado);
    });

    Render.renderizar(State.obtener());
  }

  function prepararFechaInicial(dom) {
    if (!dom.fechaCertificado) return;

    if (!dom.fechaCertificado.value) {
      dom.fechaCertificado.value = U.fechaActualInput();
      State.establecerFecha(dom.fechaCertificado.value);
    }
  }

  function prepararFuenteInicial(dom) {
    if (dom.fuenteDatos && !dom.fuenteDatos.value) {
      dom.fuenteDatos.value = "auto";
    }

    State.establecerFuenteDatos(dom.fuenteDatos ? dom.fuenteDatos.value : "auto");
  }

  async function cargarPeriodos(dom) {
    let periodos = [];

    if (window.CertiPeriodos) {
      periodos = await window.CertiPeriodos.cargarPeriodos();
    }

    Render.renderizarPeriodos(periodos, "");
  }

  function restaurarDatosGuardados(dom) {
    const ultimo = Storage.obtenerUltimoFormulario();
    const emparejamientos = Storage.obtenerEmparejamientosCarrera();

    if (ultimo.periodoSeleccionado && dom.periodo) {
      dom.periodo.value = ultimo.periodoSeleccionado;
      State.establecerPeriodo(ultimo.periodoSeleccionado, ultimo.periodoTexto);
    }

    if (ultimo.fechaCertificado && dom.fechaCertificado) {
      dom.fechaCertificado.value = ultimo.fechaCertificado;
      State.establecerFecha(ultimo.fechaCertificado);
    }

    if (ultimo.fuenteDatos && dom.fuenteDatos) {
      dom.fuenteDatos.value = ultimo.fuenteDatos;
      State.establecerFuenteDatos(ultimo.fuenteDatos);
    }

    State.establecerEmparejamientosCarrera(emparejamientos);
  }

  function enlazarEventos(dom) {
    Dom.escuchar(dom.periodo, "change", function () {
      const option = dom.periodo.options[dom.periodo.selectedIndex];
      const valor = dom.periodo.value;
      const texto = option ? option.textContent : valor;

      State.establecerPeriodo(valor, texto);
      guardarFormularioActual();
    });

    Dom.escuchar(dom.fechaCertificado, "change", function () {
      State.establecerFecha(dom.fechaCertificado.value);
      guardarFormularioActual();
    });

    Dom.escuchar(dom.fuenteDatos, "change", function () {
      State.establecerFuenteDatos(dom.fuenteDatos.value || "auto");
      actualizarVistaFuente(dom);
      guardarFormularioActual();
    });

    Dom.escuchar(dom.excelInput, "change", function () {
      const archivo = dom.excelInput.files && dom.excelInput.files[0]
        ? dom.excelInput.files[0]
        : null;

      State.establecerArchivoExcel(archivo);
    });

    Dom.escuchar(dom.textoInput, "input", function () {
      State.establecerTextoPegado(dom.textoInput.value || "");
    });

    Dom.escuchar(dom.btnProcesar, "click", procesarDatos);

    Dom.escuchar(dom.btnLimpiar, "click", limpiarPantalla);

    Dom.escuchar(dom.btnPdfUnico, "click", descargarPdfUnico);

    Dom.escuchar(dom.btnPdfIndividuales, "click", descargarPdfIndividuales);

    Dom.escucharDelegado(
      dom.carrerasList,
      ".certi-select-carrera",
      "change",
      function (evento, select) {
        const carreraOriginal = select.dataset.carreraOriginal;
        const carreraOficial = select.value;
        const estado = State.obtener();

        const nuevos = {
          ...estado.emparejamientosCarrera,
          [carreraOriginal]: carreraOficial
        };

        if (!carreraOficial) {
          delete nuevos[carreraOriginal];
        }

        State.establecerEmparejamientosCarrera(nuevos);
        Storage.guardarEmparejamientosCarrera(nuevos);
        reprocesarConEstadoActual();
      }
    );

    Dom.escucharDelegado(
      dom.empatesList,
      ".certi-select-empate",
      "change",
      function (evento, select) {
        const carreraOficial = select.dataset.carreraOficial;
        const indice = select.value;

        State.establecerEmpateSeleccionado(carreraOficial, indice);
        reprocesarConEstadoActual();
      }
    );
  }

  async function procesarDatos() {
    const estado = State.obtener();
    const validacion = validarFormularioBase(estado);

    if (!validacion.valido) {
      mostrarErrores(validacion.errores);
      return;
    }

    try {
      State.establecerCarga(true);
      State.establecerErrores([]);
      State.establecerAlertas([]);

      const lectura = await Source.leer(estado);

      State.establecerLecturaDatos(lectura);
      State.establecerRegistros(lectura.registros);
      State.establecerOrigenDatos(lectura.origen, lectura.nombreArchivo);

      const estadoActualizado = State.obtener();

      const resultadoBase = Logic.procesar(lectura.registros, {
        emparejamientosCarrera: estadoActualizado.emparejamientosCarrera,
        empatesSeleccionados: estadoActualizado.empatesSeleccionados,
        origenDatos: lectura.origen
      });

      const resultado = fusionarAlertasLectura(resultadoBase, lectura.alertas);

      State.establecerResultado(resultado);
      guardarFormularioActual();
    } catch (error) {
      mostrarErrores([error.message || "No se pudieron procesar los datos."]);
    } finally {
      State.establecerCarga(false);
    }
  }

  function validarFormularioBase(estado) {
    const errores = [];

    if (!estado.periodoSeleccionado) {
      errores.push("Debe seleccionar un período.");
    }

    if (!estado.fechaCertificado) {
      errores.push("Debe seleccionar la fecha del certificado.");
    }

    if (!Source || typeof Source.resolverFuente !== "function") {
      errores.push("No está disponible el lector de fuentes de datos.");
    } else {
      try {
        Source.resolverFuente(estado);
      } catch (error) {
        errores.push(error.message || "Debe cargar un Excel o pegar texto válido.");
      }
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  function reprocesarConEstadoActual() {
    const estado = State.obtener();

    if (!estado.registrosOriginales.length) return;

    const resultadoBase = Logic.procesar(estado.registrosOriginales, {
      emparejamientosCarrera: estado.emparejamientosCarrera,
      empatesSeleccionados: estado.empatesSeleccionados,
      origenDatos: estado.origenDatos
    });

    const alertasLectura = estado.lecturaDatos && Array.isArray(estado.lecturaDatos.alertas)
      ? estado.lecturaDatos.alertas
      : [];

    State.establecerResultado(fusionarAlertasLectura(resultadoBase, alertasLectura));
  }

  async function descargarPdfUnico() {
    try {
      State.establecerCarga(true);
      State.establecerErrores([]);

      await Pdf.descargarPdfUnico(State.obtener());
    } catch (error) {
      mostrarErrores([error.message || "No se pudo generar el PDF único."]);
    } finally {
      State.establecerCarga(false);
    }
  }

  async function descargarPdfIndividuales() {
    try {
      State.establecerCarga(true);
      State.establecerErrores([]);

      await Pdf.descargarPdfIndividuales(State.obtener());
    } catch (error) {
      mostrarErrores([error.message || "No se pudieron generar los PDFs individuales."]);
    } finally {
      State.establecerCarga(false);
    }
  }

  function fusionarAlertasLectura(resultado, alertasLectura) {
    const base = resultado || {};
    const alertasBase = Array.isArray(base.alertas) ? base.alertas : [];
    const alertasFuente = Array.isArray(alertasLectura) ? alertasLectura : [];
    const alertas = quitarAlertasDuplicadas(alertasFuente.concat(alertasBase));

    return {
      ...base,
      alertas,
      resumen: {
        ...(base.resumen || {}),
        alertas: alertas.length
      }
    };
  }

  function quitarAlertasDuplicadas(alertas) {
    const mapa = {};

    return (alertas || []).filter(function (alerta) {
      const clave = [alerta.tipo, alerta.titulo, alerta.mensaje].join("|");

      if (mapa[clave]) return false;

      mapa[clave] = true;
      return true;
    });
  }

  function guardarFormularioActual() {
    const estado = State.obtener();

    Storage.guardarUltimoFormulario({
      periodoSeleccionado: estado.periodoSeleccionado,
      periodoTexto: estado.periodoTexto,
      fechaCertificado: estado.fechaCertificado,
      fuenteDatos: estado.fuenteDatos
    });
  }

  function mostrarErrores(mensajes) {
    State.establecerErrores(
      (mensajes || []).map(function (mensaje) {
        return {
          tipo: "danger",
          titulo: "Error",
          mensaje
        };
      })
    );
  }

  function limpiarPantalla() {
    const dom = Dom.obtener();

    if (dom.excelInput) dom.excelInput.value = "";
    if (dom.textoInput) dom.textoInput.value = "";

    const periodoActual = dom.periodo ? dom.periodo.value : "";

    const textoPeriodo = dom.periodo && dom.periodo.options[dom.periodo.selectedIndex]
      ? dom.periodo.options[dom.periodo.selectedIndex].textContent
      : periodoActual;

    const fechaActual = dom.fechaCertificado
      ? dom.fechaCertificado.value || U.fechaActualInput()
      : U.fechaActualInput();

    const fuenteActual = dom.fuenteDatos ? dom.fuenteDatos.value || "auto" : "auto";
    const emparejamientos = Storage.obtenerEmparejamientosCarrera();

    State.reemplazar({
      periodoSeleccionado: periodoActual,
      periodoTexto: textoPeriodo,
      fechaCertificado: fechaActual,
      fuenteDatos: fuenteActual,
      emparejamientosCarrera: emparejamientos
    });

    guardarFormularioActual();
    actualizarVistaFuente(dom);
  }

  function actualizarVistaFuente(dom, estadoParam) {
    const estado = estadoParam || State.obtener();
    const fuente = estado.fuenteDatos || (dom.fuenteDatos ? dom.fuenteDatos.value : "auto") || "auto";

    if (dom.fuenteDatos && dom.fuenteDatos.value !== fuente) {
      dom.fuenteDatos.value = fuente;
    }

    if (dom.bloqueExcel) {
      if (fuente === "texto") {
        Dom.ocultar(dom.bloqueExcel);
      } else {
        Dom.mostrar(dom.bloqueExcel);
      }
    }

    if (dom.bloqueTexto) {
      if (fuente === "excel") {
        Dom.ocultar(dom.bloqueTexto);
      } else {
        Dom.mostrar(dom.bloqueTexto);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", iniciar);

  window.CertiApp = {
    iniciar,
    procesarDatos,
    procesarExcel: procesarDatos,
    reprocesarConEstadoActual,
    descargarPdfUnico,
    descargarPdfIndividuales,
    limpiarPantalla
  };
})();