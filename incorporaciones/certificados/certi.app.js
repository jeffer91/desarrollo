/*
=========================================================
Nombre completo: certi.app.js
Ruta o ubicación: /incorporaciones/sedes/certi/certi.app.js
Función o funciones:
- Iniciar el módulo Certi.
- Conectar la interfaz con Excel, lógica, renderizado, almacenamiento y PDF.
- Controlar el flujo completo: seleccionar período, fecha, cargar Excel, procesar y descargar.
Con qué se une:
- certi.html
- certi.config.js
- certi.state.js
- certi.dom.js
- certi.utils.js
- certi.catalogo.js
- certi.excel.js
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
  const Excel = window.CertiExcel;
  const Logic = window.CertiLogic;
  const Render = window.CertiRender;
  const Storage = window.CertiStorage;
  const Pdf = window.CertiPdf;

  async function iniciar() {
    const dom = Dom.obtener();

    prepararFechaInicial(dom);
    await cargarPeriodos(dom);
    restaurarDatosGuardados(dom);
    enlazarEventos(dom);

    State.suscribir(Render.renderizar);
    Render.renderizar(State.obtener());
  }

  function prepararFechaInicial(dom) {
    if (!dom.fechaCertificado) return;

    if (!dom.fechaCertificado.value) {
      dom.fechaCertificado.value = U.fechaActualInput();
      State.establecerFecha(dom.fechaCertificado.value);
    }
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

    Dom.escuchar(dom.excelInput, "change", function () {
      const archivo = dom.excelInput.files && dom.excelInput.files[0]
        ? dom.excelInput.files[0]
        : null;

      State.establecerArchivoExcel(archivo);
    });

    Dom.escuchar(dom.btnProcesar, "click", procesarExcel);

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

  async function procesarExcel() {
    const estado = State.obtener();

    if (!estado.periodoSeleccionado) {
      mostrarErrores(["Debe seleccionar un período."]);
      return;
    }

    if (!estado.fechaCertificado) {
      mostrarErrores(["Debe seleccionar la fecha del certificado."]);
      return;
    }

    if (!estado.archivoExcel) {
      mostrarErrores(["Debe cargar el Excel de mejores egresados."]);
      return;
    }

    try {
      State.establecerCarga(true);
      State.establecerErrores([]);

      const lectura = await Excel.leerArchivo(estado.archivoExcel);
      State.establecerRegistros(lectura.registros);

      const estadoActualizado = State.obtener();

      const resultado = Logic.procesar(lectura.registros, {
        emparejamientosCarrera: estadoActualizado.emparejamientosCarrera,
        empatesSeleccionados: estadoActualizado.empatesSeleccionados
      });

      State.establecerResultado(resultado);
      guardarFormularioActual();
    } catch (error) {
      mostrarErrores([error.message || "No se pudo procesar el Excel."]);
    } finally {
      State.establecerCarga(false);
    }
  }

  function reprocesarConEstadoActual() {
    const estado = State.obtener();

    if (!estado.registrosOriginales.length) return;

    const resultado = Logic.procesar(estado.registrosOriginales, {
      emparejamientosCarrera: estado.emparejamientosCarrera,
      empatesSeleccionados: estado.empatesSeleccionados
    });

    State.establecerResultado(resultado);
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

  function guardarFormularioActual() {
    const estado = State.obtener();

    Storage.guardarUltimoFormulario({
      periodoSeleccionado: estado.periodoSeleccionado,
      periodoTexto: estado.periodoTexto,
      fechaCertificado: estado.fechaCertificado
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

    const periodoActual = dom.periodo ? dom.periodo.value : "";
    const textoPeriodo = dom.periodo && dom.periodo.options[dom.periodo.selectedIndex]
      ? dom.periodo.options[dom.periodo.selectedIndex].textContent
      : periodoActual;

    const fechaActual = dom.fechaCertificado
      ? dom.fechaCertificado.value || U.fechaActualInput()
      : U.fechaActualInput();

    const emparejamientos = Storage.obtenerEmparejamientosCarrera();

    State.reemplazar({
      periodoSeleccionado: periodoActual,
      periodoTexto: textoPeriodo,
      fechaCertificado: fechaActual,
      emparejamientosCarrera: emparejamientos
    });

    guardarFormularioActual();
  }

  document.addEventListener("DOMContentLoaded", iniciar);

  window.CertiApp = {
    iniciar,
    procesarExcel,
    reprocesarConEstadoActual,
    descargarPdfUnico,
    descargarPdfIndividuales,
    limpiarPantalla
  };
})();