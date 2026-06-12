/*
=========================================================
Nombre completo: certi.state.js
Ruta o ubicación: /incorporaciones/sedes/certi/certi.state.js
Función o funciones:
- Mantener el estado central temporal del módulo Certi.
- Guardar período, fecha, archivo Excel, registros, resultados, alertas y bloqueos.
- Notificar cambios de estado a los módulos de renderizado.
Con qué se une:
- certi.app.js
- certi.render.js
- certi.logic.js
- certi.storage.js
=========================================================
*/

(function () {
  "use strict";

  const estadoInicial = {
    cargando: false,
    periodoSeleccionado: "",
    periodoTexto: "",
    fechaCertificado: "",
    archivoExcel: null,
    nombreArchivoExcel: "",
    registrosOriginales: [],
    resultado: null,
    emparejamientosCarrera: {},
    empatesSeleccionados: {},
    historial: [],
    alertas: [],
    errores: []
  };

  let estado = crearCopia(estadoInicial);
  const suscriptores = new Set();

function crearCopia(valor) {
 if (valor instanceof File || valor instanceof Blob) {
 return valor;
 }

 if (Array.isArray(valor)) {
 return valor.map(crearCopia);
 }

 if (valor && typeof valor === "object") {
 const copia = {};
 Object.keys(valor).forEach(function (clave) {
 copia[clave] = crearCopia(valor[clave]);
 });
 return copia;
 }

 return valor;
}

  function obtener() {
    return crearCopia(estado);
  }

  function reemplazar(nuevoEstado) {
    estado = {
      ...crearCopia(estadoInicial),
      ...crearCopia(nuevoEstado || {})
    };

    notificar();
  }

  function actualizar(parcial) {
    estado = {
      ...estado,
      ...(parcial || {})
    };

    notificar();
  }

  function limpiar() {
    estado = crearCopia(estadoInicial);
    notificar();
  }

  function establecerCarga(valor) {
    estado.cargando = Boolean(valor);
    notificar();
  }

  function establecerPeriodo(periodoSeleccionado, periodoTexto) {
    estado.periodoSeleccionado = periodoSeleccionado || "";
    estado.periodoTexto = periodoTexto || periodoSeleccionado || "";
    notificar();
  }

  function establecerFecha(fechaCertificado) {
    estado.fechaCertificado = fechaCertificado || "";
    notificar();
  }

  function establecerArchivoExcel(archivo) {
    estado.archivoExcel = archivo || null;
    estado.nombreArchivoExcel = archivo ? archivo.name : "";
    notificar();
  }

  function establecerRegistros(registros) {
    estado.registrosOriginales = Array.isArray(registros) ? registros : [];
    notificar();
  }

  function establecerResultado(resultado) {
    estado.resultado = resultado || null;
    notificar();
  }

  function establecerEmparejamientosCarrera(emparejamientos) {
    estado.emparejamientosCarrera = {
      ...(emparejamientos || {})
    };

    notificar();
  }

  function establecerEmpateSeleccionado(carreraOficial, indiceRegistro) {
    if (!carreraOficial) return;

    estado.empatesSeleccionados = {
      ...estado.empatesSeleccionados,
      [carreraOficial]: Number(indiceRegistro)
    };

    notificar();
  }

  function establecerAlertas(alertas) {
    estado.alertas = Array.isArray(alertas) ? alertas : [];
    notificar();
  }

  function establecerErrores(errores) {
    estado.errores = Array.isArray(errores) ? errores : [];
    notificar();
  }

  function suscribir(fn) {
    if (typeof fn !== "function") return function () {};

    suscriptores.add(fn);

    return function cancelarSuscripcion() {
      suscriptores.delete(fn);
    };
  }

  function notificar() {
    const copia = obtener();

    suscriptores.forEach(function (fn) {
      try {
        fn(copia);
      } catch (error) {
        console.error("Error en suscriptor de CertiState:", error);
      }
    });
  }

  window.CertiState = {
    obtener,
    reemplazar,
    actualizar,
    limpiar,
    establecerCarga,
    establecerPeriodo,
    establecerFecha,
    establecerArchivoExcel,
    establecerRegistros,
    establecerResultado,
    establecerEmparejamientosCarrera,
    establecerEmpateSeleccionado,
    establecerAlertas,
    establecerErrores,
    suscribir
  };
})();