/*
=========================================================
Nombre completo: certi.logic.js
Ruta o ubicación: /incorporaciones/certificados/certi.logic.js
Función o funciones:
- Procesar registros de Excel o texto pegado de mejores egresados.
- Elegir automáticamente el mayor promedio por carrera.
- No depender del catálogo externo para aceptar o rechazar carreras.
- Usar la fuente cargada como base para carreras, nombres y promedios.
- Preparar los datos finales para generación de certificados.
Con qué se une:
- certi.excel.js
- certi.text.js
- certi.source.js
- certi.utils.js
- certi.render.js
- certi.pdf.js
- certi.app.js
=========================================================
*/

(function () {
  "use strict";

  const U = window.CertiUtils || {};

  function procesar(registros, opciones) {
    const config = opciones || {};
    const empatesSeleccionados = config.empatesSeleccionados || {};

    const registrosValidos = [];
    const incompletos = [];

    (registros || []).forEach(function (registro, index) {
      const normalizado = normalizarRegistro(registro, index);
      const validacion = validarRegistroBase(normalizado);

      if (!validacion.valido) {
        incompletos.push({
          ...normalizado,
          errores: validacion.errores
        });

        return;
      }

      registrosValidos.push(normalizado);
    });

    const grupos = agruparPor(registrosValidos, function (registro) {
      return registro.carreraOficial;
    });

    const mejores = [];
    const empates = [];

    Object.keys(grupos).forEach(function (carreraOficial) {
      const grupo = grupos[carreraOficial];

      const ordenados = grupo.slice().sort(function (a, b) {
        return Number(b.promedio) - Number(a.promedio);
      });

      const mejor = ordenados[0];

      if (!mejor) {
        return;
      }

      const maximo = redondearPromedio(mejor.promedio);

      const candidatosMaximos = ordenados.filter(function (registro) {
        return redondearPromedio(registro.promedio) === maximo;
      });

      if (candidatosMaximos.length > 1) {
        const indiceSeleccionado = empatesSeleccionados[carreraOficial];

        const elegido = candidatosMaximos.find(function (item) {
          return Number(item.indice) === Number(indiceSeleccionado);
        });

        empates.push({
          carreraOficial,
          candidatos: candidatosMaximos,
          resuelto: Boolean(elegido),
          elegido: elegido || null
        });

        mejores.push({
          ...(elegido || candidatosMaximos[0]),
          estadoCertificado: elegido ? "listo" : "empate_pendiente",
          requiereAccion: !elegido
        });

        return;
      }

      mejores.push({
        ...mejor,
        estadoCertificado: "listo",
        requiereAccion: false
      });
    });

    const alertas = construirAlertas({
      registros,
      mejores,
      incompletos,
      empates
    });

    return {
      registrosValidos,
      mejores: ordenarMejores(mejores),
      incompletos,
      carrerasNoReconocidas: [],
      empates,
      alertas,
      resumen: {
        registrosLeidos: (registros || []).length,
        carrerasDetectadas: Object.keys(grupos).length,
        certificadosListos: mejores.filter(function (item) {
          return item.estadoCertificado === "listo";
        }).length,
        alertas: alertas.length,
        incompletos: incompletos.length,
        empatesPendientes: empates.filter(function (item) {
          return !item.resuelto;
        }).length,
        carrerasNoReconocidas: 0
      }
    };
  }

  function normalizarRegistro(registro, index) {
    const base = registro || {};
    const carreraOriginal = obtenerCarreraDesdeRegistro(base);
    const nombre = limpiarNombre(base.nombre || obtenerValorRaw(base.raw, ["nombre", "estudiante", "egresado"]));
    const promedio = convertirPromedio(base.promedio);
    const carreraOficial = normalizarCarreraInstitucional(carreraOriginal);

    return {
      ...base,
      indice: base.indice !== undefined ? base.indice : index,
      carreraOriginal,
      carreraOficial,
      carreraCodigo: crearCodigoCarrera(carreraOficial),
      carreraReconocida: true,
      carreraOrigen: base.fuente === "texto" ? "texto_directo" : "excel_directo",
      nombre,
      promedio,
      promedioOriginal: base.promedioOriginal !== undefined ? base.promedioOriginal : promedio,
      requiereAccion: false
    };
  }

  function obtenerCarreraDesdeRegistro(registro) {
    const directa = limpiarTexto(registro.carreraOriginal);
    const textos = obtenerTextosRegistro(registro);
    const textoCompleto = textos.join(" ");

    if (contieneSeguridadRiesgos(textoCompleto)) {
      return "SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES";
    }

    if (contieneSeguridadCiudadana(textoCompleto)) {
      return "SEGURIDAD CIUDADANA Y ORDEN PÚBLICO";
    }

    if (!esVacio(directa)) {
      return directa;
    }

    return extraerCarreraProbable(textos);
  }

  function extraerCarreraProbable(textos) {
    const candidatos = (textos || [])
      .map(limpiarTexto)
      .filter(function (texto) {
        return pareceCarrera(texto);
      })
      .sort(function (a, b) {
        return puntuarCarrera(b) - puntuarCarrera(a);
      });

    return candidatos[0] || "";
  }

  function normalizarCarreraInstitucional(nombre) {
    const original = limpiarTexto(nombre);
    const clave = claveTexto(original);

    if (!clave) {
      return "";
    }

    if (clave.includes("SEGURIDAD") && (clave.includes("RIESGO") || clave.includes("PREVENCION") || clave.includes("LABORAL"))) {
      return "TECNOLOGÍA SUPERIOR EN SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES";
    }

    if (clave.includes("SEGURIDAD") && clave.includes("CIUDADANA")) {
      return "TECNOLOGÍA SUPERIOR EN SEGURIDAD CIUDADANA Y ORDEN PÚBLICO";
    }

    if (clave.includes("ENFERMERIA")) {
      return "TÉCNICA SUPERIOR EN ENFERMERÍA";
    }

    if (clave.includes("ADMINISTRACION") && clave.includes("EMPRESAS") && clave.includes("INTELIGENCIA")) {
      return "TECNOLOGÍA SUPERIOR UNIVERSITARIA EN ADMINISTRACIÓN DE EMPRESAS E INTELIGENCIA DE NEGOCIOS";
    }

    if (clave.includes("ADMINISTRACION") && clave.includes("TALENTO")) {
      return "TECNOLOGÍA SUPERIOR UNIVERSITARIA EN ADMINISTRACIÓN DE TALENTO HUMANO";
    }

    if (clave.includes("ADMINISTRACION")) {
      return "TECNOLOGÍA SUPERIOR EN ADMINISTRACIÓN";
    }

    if (clave.includes("CONTABILIDAD") && clave.includes("TRIBUTACION")) {
      return "TECNOLOGÍA SUPERIOR UNIVERSITARIA EN CONTABILIDAD Y TRIBUTACIÓN";
    }

    if (clave.includes("CONTABILIDAD")) {
      return "TECNOLOGÍA SUPERIOR EN CONTABILIDAD";
    }

    if (clave.includes("DESARROLLO") && clave.includes("SOFTWARE")) {
      return "TECNOLOGÍA SUPERIOR EN DESARROLLO DE SOFTWARE";
    }

    if (clave.includes("EDUCACION") && clave.includes("BASICA")) {
      return "TECNOLOGÍA SUPERIOR EN EDUCACIÓN BÁSICA";
    }

    if (clave.includes("EDUCACION") && clave.includes("INICIAL")) {
      return "TECNOLOGÍA SUPERIOR EN EDUCACIÓN INICIAL";
    }

    if (clave.includes("ESTETICA") && clave.includes("INTEGRAL")) {
      return "TECNOLOGÍA SUPERIOR EN ESTÉTICA INTEGRAL";
    }

    if (clave.includes("GESTION") && clave.includes("TALENTO")) {
      return "TECNOLOGÍA SUPERIOR EN GESTIÓN DEL TALENTO HUMANO";
    }

    if (clave.includes("MARKETING") && clave.includes("COMERCIO")) {
      return "TECNOLOGÍA SUPERIOR EN MARKETING DIGITAL Y COMERCIO ELECTRÓNICO";
    }

    if (clave.includes("MARKETING")) {
      return "TECNOLOGÍA SUPERIOR UNIVERSITARIA EN MARKETING DIGITAL";
    }

    if (clave.includes("REDES") && clave.includes("TELECOMUNICACIONES")) {
      return "TECNOLOGÍA SUPERIOR EN REDES Y TELECOMUNICACIONES";
    }

    if (clave.includes("MECANICA") && clave.includes("AUTOMOTRIZ")) {
      return "TECNOLOGÍA SUPERIOR EN MECÁNICA AUTOMOTRIZ";
    }

    if (clave.includes("PROCESAMIENTO") && clave.includes("ALIMENTOS")) {
      return "TECNOLOGÍA SUPERIOR EN PROCESAMIENTO DE ALIMENTOS";
    }

    if (clave.includes("PEDAGOGIA")) {
      return "TECNOLOGÍA SUPERIOR UNIVERSITARIA EN PEDAGOGÍA";
    }

    const base = quitarPrefijoCarrera(original);

    if (claveTexto(base).startsWith("TECNOLOGIA") || claveTexto(base).startsWith("TECNICA")) {
      return base.toLocaleUpperCase("es-EC");
    }

    return `TECNOLOGÍA SUPERIOR EN ${base.toLocaleUpperCase("es-EC")}`;
  }

  function validarRegistroBase(registro) {
    const errores = [];

    if (esVacio(registro.carreraOriginal) || esVacio(registro.carreraOficial)) {
      errores.push("No tiene carrera.");
    }

    if (esVacio(registro.nombre)) {
      errores.push("No tiene nombre.");
    }

    if (registro.promedio === null || registro.promedio === undefined || !Number.isFinite(Number(registro.promedio))) {
      errores.push("No tiene promedio válido.");
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  function construirAlertas(datos) {
    const alertas = [];

    if (!datos.registros || datos.registros.length === 0) {
      alertas.push({
        tipo: "warning",
        titulo: "Sin registros",
        mensaje: "La fuente cargada no contiene registros válidos para procesar."
      });
    }

    if (datos.incompletos.length > 0) {
      alertas.push({
        tipo: "warning",
        titulo: "Registros incompletos",
        mensaje: `${datos.incompletos.length} registro(s) no se usarán porque falta nombre, carrera o promedio válido.`
      });
    }

    const empatesPendientes = datos.empates.filter(function (empate) {
      return !empate.resuelto;
    }).length;

    if (empatesPendientes > 0) {
      alertas.push({
        tipo: "warning",
        titulo: "Empates pendientes",
        mensaje: `${empatesPendientes} carrera(s) tienen empate en el promedio más alto. Debe seleccionar manualmente.`
      });
    }

    if (datos.mejores.length > 0 && empatesPendientes === 0) {
      alertas.push({
        tipo: "success",
        titulo: "Datos listos",
        mensaje: "Los certificados están listos para descarga."
      });
    }

    return alertas;
  }

  function validarGeneracion(estado) {
    const errores = [];

    if (esVacio(estado.periodoSeleccionado)) {
      errores.push("Debe seleccionar un período.");
    }

    if (esVacio(estado.fechaCertificado)) {
      errores.push("Debe seleccionar la fecha del certificado.");
    }

    if (!estado.archivoExcel && !String(estado.textoPegado || "").trim()) {
      errores.push("Debe cargar un Excel o pegar texto con datos válidos.");
    }

    if (!estado.resultado || !estado.resultado.mejores || estado.resultado.mejores.length === 0) {
      errores.push("No existen certificados listos para generar.");
    }

    if (
      estado.resultado &&
      estado.resultado.empates &&
      estado.resultado.empates.some(function (item) {
        return !item.resuelto;
      })
    ) {
      errores.push("Debe resolver todos los empates.");
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

    const certificados = estado.resultado.mejores
      .filter(function (item) {
        return item.estadoCertificado === "listo";
      })
      .map(function (item) {
        return {
          nombre: item.nombre,
          carrera: item.carreraOficial,
          promedio: formatearPromedio(item.promedio),
          periodo: periodoTexto,
          fecha: fechaLarga,
          fechaInput: estado.fechaCertificado,
          carreraCodigo: item.carreraCodigo,
          origen: item.carreraOrigen
        };
      });

    return {
      valido: true,
      errores: [],
      certificados
    };
  }

  function ordenarMejores(mejores) {
    return [...(mejores || [])].sort(function (a, b) {
      return String(a.carreraOficial || "").localeCompare(String(b.carreraOficial || ""), "es");
    });
  }

  function agruparPor(lista, obtenerClave) {
    return (lista || []).reduce(function (acc, item) {
      const clave = obtenerClave(item);

      if (!clave) {
        return acc;
      }

      if (!acc[clave]) {
        acc[clave] = [];
      }

      acc[clave].push(item);
      return acc;
    }, {});
  }

  function obtenerTextosRegistro(registro) {
    const salida = [];
    recolectarTextos(registro, salida, 0);

    return salida.filter(function (texto) {
      return !esVacio(texto);
    });
  }

  function recolectarTextos(valor, salida, profundidad) {
    if (profundidad > 4 || valor === null || valor === undefined) {
      return;
    }

    if (typeof valor === "string" || typeof valor === "number") {
      salida.push(limpiarTexto(valor));
      return;
    }

    if (Array.isArray(valor)) {
      valor.forEach(function (item) {
        recolectarTextos(item, salida, profundidad + 1);
      });

      return;
    }

    if (typeof valor === "object") {
      Object.keys(valor).forEach(function (key) {
        salida.push(limpiarTexto(key));
        recolectarTextos(valor[key], salida, profundidad + 1);
      });
    }
  }

  function obtenerValorRaw(raw, candidatos) {
    if (!raw || typeof raw !== "object") {
      return "";
    }

    const keys = Object.keys(raw);

    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const claveKey = claveTexto(key);

      const coincide = candidatos.some(function (candidato) {
        return claveKey.includes(claveTexto(candidato));
      });

      if (coincide && !esVacio(raw[key])) {
        return raw[key];
      }
    }

    return "";
  }

  function pareceCarrera(valor) {
    const clave = claveTexto(valor);

    if (!clave || clave.length < 5) {
      return false;
    }

    if (convertirPromedio(valor) !== null) {
      return false;
    }

    const palabras = [
      "TECNOLOGIA",
      "TECNICA",
      "SUPERIOR",
      "ENFERMERIA",
      "ADMINISTRACION",
      "CONTABILIDAD",
      "SOFTWARE",
      "EDUCACION",
      "ESTETICA",
      "MECANICA",
      "REDES",
      "TELECOMUNICACIONES",
      "ALIMENTOS",
      "SEGURIDAD",
      "RIESGOS",
      "TALENTO",
      "MARKETING",
      "PEDAGOGIA"
    ];

    return palabras.some(function (palabra) {
      return clave.includes(palabra);
    });
  }

  function puntuarCarrera(valor) {
    const clave = claveTexto(valor);
    let puntos = 0;

    if (clave.includes("TECNOLOGIA")) puntos += 4;
    if (clave.includes("TECNICA")) puntos += 4;
    if (clave.includes("SUPERIOR")) puntos += 3;
    if (clave.includes("ENFERMERIA")) puntos += 5;
    if (clave.includes("SEGURIDAD")) puntos += 5;
    if (clave.includes("RIESGO")) puntos += 5;
    if (clave.includes("CIUDADANA")) puntos += 5;
    if (clave.includes("SOFTWARE")) puntos += 5;
    if (clave.includes("ADMINISTRACION")) puntos += 5;
    if (clave.includes("CONTABILIDAD")) puntos += 5;
    if (clave.includes("EDUCACION")) puntos += 5;
    if (clave.length > 20) puntos += 2;

    return puntos;
  }

  function contieneSeguridadRiesgos(texto) {
    const clave = claveTexto(texto);

    return (
      clave.includes("SEGURIDAD") &&
      (
        clave.includes("RIESGO") ||
        clave.includes("RIESGOS") ||
        clave.includes("PREVENCION") ||
        clave.includes("PREVENCION DE RIESGOS") ||
        clave.includes("RIESGOS LABORALES")
      )
    );
  }

  function contieneSeguridadCiudadana(texto) {
    const clave = claveTexto(texto);

    return (
      clave.includes("SEGURIDAD") &&
      clave.includes("CIUDADANA") &&
      !contieneSeguridadRiesgos(texto)
    );
  }

  function quitarPrefijoCarrera(nombre) {
    return limpiarTexto(nombre)
      .replace(/^TECNOLOG[IÍ]A\s+SUPERIOR\s+UNIVERSITARIA\s+(EN\s+)?/i, "")
      .replace(/^TECNOLOG[IÍ]A\s+SUPERIOR\s+(EN\s+)?/i, "")
      .replace(/^T[EÉ]CNICA\s+SUPERIOR\s+(EN\s+)?/i, "")
      .replace(/^SUPERIOR\s+(EN\s+)?/i, "")
      .trim();
  }

  function crearCodigoCarrera(nombre) {
    const base = claveTexto(nombre)
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 28);

    return base || "CARRERA";
  }

  function redondearPromedio(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
      return null;
    }

    return Math.round(numero * 1000) / 1000;
  }

  function limpiarTexto(valor) {
    if (U && typeof U.limpiarEspacios === "function") {
      return U.limpiarEspacios(valor);
    }

    return String(valor == null ? "" : valor)
      .replace(/\s+/g, " ")
      .trim();
  }

  function limpiarNombre(valor) {
    if (U && typeof U.limpiarNombrePropio === "function") {
      return U.limpiarNombrePropio(valor);
    }

    return limpiarTexto(valor).toLocaleUpperCase("es-EC");
  }

  function convertirPromedio(valor) {
    if (U && typeof U.convertirPromedio === "function") {
      return U.convertirPromedio(valor);
    }

    if (valor === null || valor === undefined || valor === "") return null;

    const texto = String(valor)
      .replace(",", ".")
      .replace(/[^0-9.-]/g, "");

    if (!texto) return null;

    const numero = Number(texto);

    return Number.isFinite(numero) ? numero : null;
  }

  function formatearPromedio(valor) {
    if (U && typeof U.formatearPromedio === "function") {
      return U.formatearPromedio(valor);
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero)) return "";

    return numero.toFixed(3);
  }

  function formatearFechaLarga(fecha) {
    if (U && typeof U.formatearFechaLarga === "function") {
      return U.formatearFechaLarga(fecha);
    }

    return fecha || "";
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

  function esVacio(valor) {
    if (U && typeof U.esVacio === "function") {
      return U.esVacio(valor);
    }

    return valor === null || valor === undefined || String(valor).trim() === "";
  }

  window.CertiLogic = {
    procesar,
    validarGeneracion,
    prepararCertificados,
    normalizarCarreraInstitucional
  };
})();