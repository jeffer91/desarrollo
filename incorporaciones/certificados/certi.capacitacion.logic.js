/*
=========================================================
Nombre completo: certi.capacitacion.logic.js
Ruta o ubicación: /incorporaciones/certificados/certi.capacitacion.logic.js
Función o funciones:
- Procesar registros de capacitación docente.
- Validar cédula, docente, curso/tema y nota.
- Preparar certificados finales para PDF único o individual.
- Mantener una fila válida del Excel como un certificado.
Con qué se une:
- certi.capacitacion.excel.js
- certi.capacitacion.template.js
- certi.capacitacion.js
- certi.firmantes.js
- certi.utils.js
=========================================================
*/

(function () {
  "use strict";

  const U = window.CertiUtils || {};
  const TIPO_CAPACITACION = "capacitacion";

  function procesar(registros) {
    const validos = [];
    const incompletos = [];

    (registros || []).forEach(function (registro, index) {
      const normalizado = normalizarRegistro(registro, index);
      const validacion = validarRegistro(normalizado);

      if (!validacion.valido) {
        incompletos.push(Object.assign({}, normalizado, {
          errores: validacion.errores,
          estadoCertificado: "incompleto"
        }));
        return;
      }

      validos.push(Object.assign({}, normalizado, {
        estadoCertificado: "listo",
        requiereAccion: false
      }));
    });

    const cursosDetectados = contarUnicos(validos.map(function (item) {
      return item.curso;
    }));

    const alertas = construirAlertas(validos, incompletos);

    return {
      registrosValidos: validos,
      mejores: ordenar(validos),
      certificados: ordenar(validos),
      incompletos,
      carrerasNoReconocidas: [],
      empates: [],
      alertas,
      resumen: {
        registrosLeidos: (registros || []).length,
        carrerasDetectadas: cursosDetectados,
        certificadosListos: validos.length,
        alertas: alertas.length,
        incompletos: incompletos.length,
        empatesPendientes: 0,
        carrerasNoReconocidas: 0
      }
    };
  }

  function normalizarRegistro(registro, index) {
    const base = registro || {};
    const nota = convertirNota(base.nota !== undefined ? base.nota : base.promedio);
    const curso = limpiarTexto(base.curso || base.tema || obtenerRaw(base.raw, "curso"));
    const docente = limpiarNombre(base.docente || base.nombre || obtenerRaw(base.raw, "docente"));

    return Object.assign({}, base, {
      tipoCertificado: TIPO_CAPACITACION,
      indice: base.indice !== undefined ? base.indice : index,
      cedula: limpiarCedula(base.cedula || obtenerRaw(base.raw, "cedula")),
      nombre: docente,
      docente,
      curso,
      tema: curso,
      nota,
      promedio: nota,
      notaOriginal: base.notaOriginal !== undefined ? base.notaOriginal : base.promedioOriginal,
      promedioOriginal: base.notaOriginal !== undefined ? base.notaOriginal : base.promedioOriginal,
      horas: convertirHoras(base.horas || obtenerRaw(base.raw, "horas")),
      fechaCurso: limpiarTexto(base.fechaCurso || obtenerRaw(base.raw, "fecha")),
      carreraOriginal: curso,
      carreraOficial: curso,
      carreraCodigo: crearNombreArchivo(curso)
    });
  }

  function validarRegistro(registro) {
    const errores = [];

    if (!registro.cedula) errores.push("No tiene cédula.");
    if (!registro.docente) errores.push("No tiene nombre de docente.");
    if (!registro.curso) errores.push("No tiene curso o tema.");
    if (registro.nota === null || registro.nota === undefined || !Number.isFinite(Number(registro.nota))) {
      errores.push("No tiene nota válida.");
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  function validarGeneracion(estado) {
    const errores = [];

    if (!estado || !estado.periodoSeleccionado) {
      errores.push("Debe seleccionar un período.");
    }

    if (!estado || !estado.fechaCertificado) {
      errores.push("Debe seleccionar la fecha del certificado.");
    }

    if (!estado || !estado.archivoExcel) {
      errores.push("Debe cargar el Excel de capacitación docente.");
    }

    const listos = estado && estado.resultado && Array.isArray(estado.resultado.mejores)
      ? estado.resultado.mejores.filter(function (item) {
        return item.estadoCertificado === "listo";
      })
      : [];

    if (!listos.length) {
      errores.push("No existen certificados de capacitación listos para generar.");
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  function prepararCertificados(estado) {
    const validacion = validarGeneracion(estado);

    if (!validacion.valido) {
      return {
        valido: false,
        errores: validacion.errores,
        certificados: []
      };
    }

    const fechaLarga = formatearFechaLarga(estado.fechaCertificado);
    const periodoTexto = estado.periodoTexto || estado.periodoSeleccionado;
    const tipoConfig = obtenerConfigTipo();
    const firmantes = obtenerFirmantes();

    const certificados = estado.resultado.mejores
      .filter(function (item) {
        return item.estadoCertificado === "listo";
      })
      .map(function (item) {
        const horas = item.horas || tipoConfig.horasDefecto || 40;

        return {
          tipoCertificado: TIPO_CAPACITACION,
          cedula: item.cedula,
          nombre: item.docente || item.nombre,
          docente: item.docente || item.nombre,
          curso: item.curso,
          tema: item.curso,
          nota: formatearNota(item.nota),
          promedio: formatearNota(item.nota),
          horas: String(horas),
          periodo: periodoTexto,
          fecha: fechaLarga,
          fechaInput: estado.fechaCertificado,
          fechaCurso: item.fechaCurso || "",
          carrera: item.curso,
          carreraCodigo: item.carreraCodigo || crearNombreArchivo(item.curso),
          origen: TIPO_CAPACITACION,
          firmantes
        };
      });

    return {
      valido: true,
      errores: [],
      certificados
    };
  }

  function construirAlertas(validos, incompletos) {
    const alertas = [];

    if (validos.length > 0) {
      alertas.push({
        tipo: "success",
        titulo: "Capacitaciones listas",
        mensaje: `${validos.length} certificado(s) de capacitación están listos para descarga.`
      });
    }

    if (incompletos.length > 0) {
      alertas.push({
        tipo: "warning",
        titulo: "Filas incompletas",
        mensaje: `${incompletos.length} fila(s) no se usarán porque falta cédula, docente, curso o nota válida.`
      });
    }

    if (!validos.length && !incompletos.length) {
      alertas.push({
        tipo: "warning",
        titulo: "Sin registros",
        mensaje: "No se encontraron docentes válidos para certificados de capacitación."
      });
    }

    return alertas;
  }

  function ordenar(lista) {
    return (lista || []).slice().sort(function (a, b) {
      const curso = String(a.curso || "").localeCompare(String(b.curso || ""), "es");
      if (curso !== 0) return curso;
      return String(a.docente || a.nombre || "").localeCompare(String(b.docente || b.nombre || ""), "es");
    });
  }

  function contarUnicos(lista) {
    const mapa = {};

    (lista || []).forEach(function (item) {
      const clave = claveTexto(item);
      if (clave) mapa[clave] = true;
    });

    return Object.keys(mapa).length;
  }

  function obtenerConfigTipo() {
    if (window.CertiTipos && typeof window.CertiTipos.obtenerConfig === "function") {
      return window.CertiTipos.obtenerConfig(TIPO_CAPACITACION);
    }

    return {
      plantilla: "./assets/certi-plantilla-capacitacion.png",
      horasDefecto: 40,
      pdfUnicoPrefijo: "Certificados_Capacitacion_Docente",
      pdfIndividualPrefijo: "Certificado_Capacitacion"
    };
  }

  function obtenerFirmantes() {
    if (window.CertiFirmantes && typeof window.CertiFirmantes.obtenerFirmantesCapacitacion === "function") {
      return window.CertiFirmantes.obtenerFirmantesCapacitacion();
    }

    return [
      {
        nombre: "Dr. Alex León",
        cargo: "VICERRECTOR"
      },
      {
        nombre: "Mgs. Jefferson Villarreal",
        cargo: "GESTOR DE PROCESOS ACADÉMICOS"
      }
    ];
  }

  function obtenerRaw(raw, campo) {
    if (!raw || typeof raw !== "object") return "";
    return raw[campo] == null ? "" : raw[campo];
  }

  function convertirNota(valor) {
    if (window.CertiCapacitacionExcel && typeof window.CertiCapacitacionExcel.convertirNota === "function") {
      return window.CertiCapacitacionExcel.convertirNota(valor);
    }

    if (valor === null || valor === undefined || String(valor).trim() === "") return null;

    const texto = String(valor).replace(",", ".").replace(/[^0-9.-]/g, "");
    const numero = Number(texto);

    if (!Number.isFinite(numero) || numero < 0 || numero > 10) return null;
    return Number(numero.toFixed(2));
  }

  function convertirHoras(valor) {
    if (window.CertiCapacitacionExcel && typeof window.CertiCapacitacionExcel.convertirHoras === "function") {
      return window.CertiCapacitacionExcel.convertirHoras(valor);
    }

    return limpiarTexto(valor);
  }

  function formatearNota(valor) {
    const numero = convertirNota(valor);
    if (numero === null) return "";
    return numero.toFixed(2);
  }

  function limpiarCedula(valor) {
    return limpiarTexto(valor).replace(/[^0-9A-Za-z-]/g, "").toUpperCase();
  }

  function limpiarNombre(valor) {
    if (U && typeof U.limpiarNombrePropio === "function") {
      return U.limpiarNombrePropio(valor);
    }

    return limpiarTexto(valor).toUpperCase();
  }

  function limpiarTexto(valor) {
    if (U && typeof U.limpiarEspacios === "function") {
      return U.limpiarEspacios(valor);
    }

    return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim();
  }

  function claveTexto(valor) {
    if (U && typeof U.claveTexto === "function") {
      return U.claveTexto(valor);
    }

    return limpiarTexto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9Ñ ]/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function crearNombreArchivo(texto) {
    if (U && typeof U.crearNombreArchivo === "function") {
      return U.crearNombreArchivo(texto);
    }

    return claveTexto(texto).replace(/[^A-Z0-9]+/g, "_").toLowerCase();
  }

  function formatearFechaLarga(fecha) {
    if (U && typeof U.formatearFechaLarga === "function") {
      return U.formatearFechaLarga(fecha);
    }

    return fecha || "";
  }

  window.CertiCapacitacionLogic = {
    procesar,
    normalizarRegistro,
    validarRegistro,
    validarGeneracion,
    prepararCertificados,
    formatearNota
  };
})();
