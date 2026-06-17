/*
=========================================================
Nombre completo: certi.state.js
Ruta o ubicación: /incorporaciones/certificados/certi.state.js
Función o funciones:
- Mantener el estado central del módulo Certi.
- Guardar período, fecha, fuente de datos, archivo Excel, texto pegado y resultados.
- Exponer window.CertiState para que certi.app.js, certi.render.js y demás módulos puedan trabajar.
- Notificar cambios a la pantalla cuando el estado se actualiza.
Con qué se une:
- certi.app.js
- certi.render.js
- certi.source.js
- certi.logic.js
- certi.pdf.js
- certi.storage.js
=========================================================
*/

(function () {
  "use strict";

  let estado = normalizarEstado(crearEstadoInicial());
  const suscriptores = [];

  function crearEstadoInicial() {
    return {
      periodoSeleccionado: "",
      periodoTexto: "",
      fechaCertificado: "",
      fuenteDatos: "auto",

      archivoExcel: null,
      textoPegado: "",

      cargando: false,
      procesando: false,

      errores: [],
      alertas: [],

      lecturaDatos: null,
      registrosOriginales: [],
      registros: [],

      origenDatos: "",
      nombreArchivo: "",

      resultado: null,
      resumen: {
        registrosLeidos: 0,
        carrerasDetectadas: 0,
        certificadosListos: 0,
        alertas: 0
      },

      certificados: [],
      carrerasNoReconocidas: [],
      empates: [],

      emparejamientosCarrera: {},
      empatesSeleccionados: {}
    };
  }

  function obtener() {
    return clonarEstado(estado);
  }

  function reemplazar(nuevoEstado) {
    estado = normalizarEstado({
      ...crearEstadoInicial(),
      ...(nuevoEstado || {})
    });

    notificarSuscriptores();
    return obtener();
  }

  function suscribir(callback) {
    if (typeof callback !== "function") {
      return function () {};
    }

    suscriptores.push(callback);

    return function cancelarSuscripcion() {
      const indice = suscriptores.indexOf(callback);

      if (indice >= 0) {
        suscriptores.splice(indice, 1);
      }
    };
  }

  function establecerPeriodo(valor, texto) {
    return actualizar({
      periodoSeleccionado: limpiarTexto(valor),
      periodoTexto: limpiarTexto(texto || valor)
    });
  }

  function establecerFecha(fecha) {
    return actualizar({
      fechaCertificado: limpiarTexto(fecha)
    });
  }

  function establecerFuenteDatos(fuente) {
    return actualizar({
      fuenteDatos: normalizarFuente(fuente)
    });
  }

  function establecerArchivoExcel(archivo) {
    return actualizar({
      archivoExcel: archivo || null
    });
  }

  function establecerTextoPegado(texto) {
    return actualizar({
      textoPegado: String(texto == null ? "" : texto)
    });
  }

  function establecerCarga(valor) {
    const activo = Boolean(valor);

    return actualizar({
      cargando: activo,
      procesando: activo
    });
  }

  function establecerErrores(errores) {
    return actualizar({
      errores: normalizarAlertas(errores)
    });
  }

  function establecerAlertas(alertas) {
    return actualizar({
      alertas: normalizarAlertas(alertas)
    });
  }

  function establecerLecturaDatos(lectura) {
    return actualizar({
      lecturaDatos: lectura || null
    });
  }

  function establecerRegistros(registros) {
    const lista = normalizarLista(registros);

    return actualizar({
      registrosOriginales: lista,
      registros: lista
    });
  }

  function establecerRegistrosOriginales(registros) {
    return establecerRegistros(registros);
  }

  function establecerOrigenDatos(origen, nombreArchivo) {
    return actualizar({
      origenDatos: limpiarTexto(origen),
      nombreArchivo: limpiarTexto(nombreArchivo)
    });
  }

  function establecerResultado(resultado) {
    const resultadoSeguro = resultado && typeof resultado === "object"
      ? resultado
      : null;

    const datos = extraerDatosResultado(resultadoSeguro);

    return actualizar({
      resultado: resultadoSeguro,
      resumen: datos.resumen,
      certificados: datos.certificados,
      carrerasNoReconocidas: datos.carrerasNoReconocidas,
      empates: datos.empates,
      alertas: datos.alertas
    });
  }

  function establecerEmparejamientosCarrera(emparejamientos) {
    return actualizar({
      emparejamientosCarrera: normalizarObjeto(emparejamientos)
    });
  }

  function establecerEmpateSeleccionado(carreraOficial, indice) {
    const clave = limpiarTexto(carreraOficial);
    const valor = String(indice == null ? "" : indice);
    const nuevos = normalizarObjeto(estado.empatesSeleccionados);

    if (!clave) {
      return obtener();
    }

    if (valor === "") {
      delete nuevos[clave];
    } else {
      nuevos[clave] = valor;
    }

    return actualizar({
      empatesSeleccionados: nuevos
    });
  }

  function limpiarResultados() {
    return actualizar({
      errores: [],
      alertas: [],
      lecturaDatos: null,
      registrosOriginales: [],
      registros: [],
      origenDatos: "",
      nombreArchivo: "",
      resultado: null,
      resumen: crearEstadoInicial().resumen,
      certificados: [],
      carrerasNoReconocidas: [],
      empates: []
    });
  }

  function actualizar(parcial) {
    estado = normalizarEstado({
      ...estado,
      ...(parcial || {})
    });

    notificarSuscriptores();
    return obtener();
  }

  function notificarSuscriptores() {
    suscriptores.slice().forEach(function (callback) {
      try {
        callback(obtener());
      } catch (error) {
        console.error("[CertiState] Error al notificar cambio de estado:", error);
      }
    });
  }

  function normalizarEstado(datos) {
    const base = {
      ...crearEstadoInicial(),
      ...(datos || {})
    };

    base.periodoSeleccionado = limpiarTexto(base.periodoSeleccionado);
    base.periodoTexto = limpiarTexto(base.periodoTexto);
    base.fechaCertificado = limpiarTexto(base.fechaCertificado);
    base.fuenteDatos = normalizarFuente(base.fuenteDatos);

    base.archivoExcel = base.archivoExcel || null;
    base.textoPegado = String(base.textoPegado == null ? "" : base.textoPegado);

    base.cargando = Boolean(base.cargando);
    base.procesando = Boolean(base.procesando);

    base.errores = normalizarAlertas(base.errores);
    base.alertas = normalizarAlertas(base.alertas);

    base.lecturaDatos = base.lecturaDatos || null;

    base.registrosOriginales = normalizarLista(base.registrosOriginales);
    base.registros = normalizarLista(base.registros);

    if (!base.registros.length && base.registrosOriginales.length) {
      base.registros = base.registrosOriginales.slice();
    }

    base.origenDatos = limpiarTexto(base.origenDatos);
    base.nombreArchivo = limpiarTexto(base.nombreArchivo);

    base.resultado = base.resultado && typeof base.resultado === "object"
      ? base.resultado
      : null;

    base.resumen = normalizarResumen(base.resumen);
    base.certificados = normalizarLista(base.certificados);
    base.carrerasNoReconocidas = normalizarLista(base.carrerasNoReconocidas);
    base.empates = normalizarLista(base.empates);

    base.emparejamientosCarrera = normalizarObjeto(base.emparejamientosCarrera);
    base.empatesSeleccionados = normalizarObjeto(base.empatesSeleccionados);

    return base;
  }

  function clonarEstado(actual) {
    return {
      ...actual,

      errores: actual.errores.slice(),
      alertas: actual.alertas.slice(),

      registrosOriginales: actual.registrosOriginales.slice(),
      registros: actual.registros.slice(),

      resumen: {
        ...actual.resumen
      },

      certificados: actual.certificados.slice(),
      carrerasNoReconocidas: actual.carrerasNoReconocidas.slice(),
      empates: actual.empates.slice(),

      emparejamientosCarrera: {
        ...actual.emparejamientosCarrera
      },

      empatesSeleccionados: {
        ...actual.empatesSeleccionados
      }
    };
  }

  function extraerDatosResultado(resultado) {
    if (!resultado) {
      return {
        resumen: crearEstadoInicial().resumen,
        certificados: [],
        carrerasNoReconocidas: [],
        empates: [],
        alertas: []
      };
    }

    const certificados = primeraLista(resultado, [
      "certificados",
      "mejoresEgresados",
      "mejores",
      "seleccionados",
      "resultados",
      "listos"
    ]);

    const carrerasNoReconocidas = primeraLista(resultado, [
      "carrerasNoReconocidas",
      "noReconocidas",
      "carrerasPendientes",
      "pendientesEmparejamiento"
    ]);

    const empates = primeraLista(resultado, [
      "empates",
      "empatesDetectados",
      "carrerasConEmpate"
    ]);

    const alertas = normalizarAlertas(resultado.alertas);

    const resumenOriginal = resultado.resumen && typeof resultado.resumen === "object"
      ? resultado.resumen
      : {};

    const resumen = {
      ...resumenOriginal,

      registrosLeidos: primerNumeroValido(
        resumenOriginal.registrosLeidos,
        resumenOriginal.registros,
        resumenOriginal.totalRegistros,
        estado.registrosOriginales.length
      ),

      carrerasDetectadas: primerNumeroValido(
        resumenOriginal.carrerasDetectadas,
        resumenOriginal.carreras,
        resumenOriginal.totalCarreras,
        0
      ),

      certificadosListos: primerNumeroValido(
        resumenOriginal.certificadosListos,
        resumenOriginal.certificados,
        resumenOriginal.totalCertificados,
        certificados.length
      ),

      alertas: primerNumeroValido(
        resumenOriginal.alertas,
        alertas.length
      )
    };

    return {
      resumen,
      certificados,
      carrerasNoReconocidas,
      empates,
      alertas
    };
  }

  function primeraLista(objeto, campos) {
    for (let i = 0; i < campos.length; i += 1) {
      const valor = objeto[campos[i]];

      if (Array.isArray(valor)) {
        return valor.slice();
      }
    }

    return [];
  }

  function normalizarResumen(resumen) {
    const base = resumen && typeof resumen === "object" && !Array.isArray(resumen)
      ? resumen
      : {};

    return {
      registrosLeidos: primerNumeroValido(base.registrosLeidos, 0),
      carrerasDetectadas: primerNumeroValido(base.carrerasDetectadas, 0),
      certificadosListos: primerNumeroValido(base.certificadosListos, 0),
      alertas: primerNumeroValido(base.alertas, 0),
      ...base
    };
  }

  function normalizarLista(valor) {
    return Array.isArray(valor) ? valor.slice() : [];
  }

  function normalizarObjeto(valor) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
      return {};
    }

    return {
      ...valor
    };
  }

  function normalizarAlertas(valor) {
    if (!Array.isArray(valor)) {
      return [];
    }

    return valor
      .map(function (item) {
        if (typeof item === "string") {
          return {
            tipo: "info",
            titulo: "",
            mensaje: item
          };
        }

        if (!item || typeof item !== "object") {
          return null;
        }

        const alerta = {
          tipo: limpiarTexto(item.tipo) || "info",
          titulo: limpiarTexto(item.titulo),
          mensaje: limpiarTexto(item.mensaje)
        };

        if (!alerta.titulo && !alerta.mensaje) {
          return null;
        }

        return alerta;
      })
      .filter(Boolean);
  }

  function normalizarFuente(valor) {
    const fuente = limpiarTexto(valor).toLowerCase();

    if (["auto", "excel", "texto"].includes(fuente)) {
      return fuente;
    }

    return "auto";
  }

  function primerNumeroValido() {
    for (let i = 0; i < arguments.length; i += 1) {
      const valor = arguments[i];

      if (valor === undefined || valor === null || valor === "") {
        continue;
      }

      const numero = Number(valor);

      if (Number.isFinite(numero)) {
        return numero;
      }
    }

    return 0;
  }

  function limpiarTexto(valor) {
    return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim();
  }

  window.CertiState = {
    obtener,
    reemplazar,
    suscribir,

    establecerPeriodo,
    establecerFecha,
    establecerFuenteDatos,
    establecerArchivoExcel,
    establecerTextoPegado,
    establecerCarga,
    establecerErrores,
    establecerAlertas,
    establecerLecturaDatos,
    establecerRegistros,
    establecerRegistrosOriginales,
    establecerOrigenDatos,
    establecerResultado,
    establecerEmparejamientosCarrera,
    establecerEmpateSeleccionado,
    limpiarResultados
  };
})();