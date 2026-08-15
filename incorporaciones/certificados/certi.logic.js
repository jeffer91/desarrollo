/*
=========================================================
Nombre completo: certi.logic.js
Ruta o ubicación: /incorporaciones/certificados/certi.logic.js
Función o funciones:
- Procesar registros de Excel o texto pegado de mejores egresados.
- Elegir automáticamente el mayor promedio por carrera.
- Respetar el nivel oficial de la carrera cuando la fuente indica Tecnología Superior o Tecnología Superior Universitaria.
- Eliminar la modalidad ONLINE / EN LÍNEA de la denominación usada en certificados.
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
      const ordenados = grupos[carreraOficial].slice().sort(function (a, b) {
        return Number(b.promedio) - Number(a.promedio);
      });

      const mejor = ordenados[0];
      if (!mejor) return;

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
    const carreraOriginal = limpiarCarreraModalidad(obtenerCarreraDesdeRegistro(base));
    const nombre = limpiarNombre(
      base.nombre || obtenerValorRaw(base.raw, ["nombre", "estudiante", "egresado"])
    );
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
    const directa = limpiarCarreraModalidad(
      registro.carreraOriginal ||
      registro.carrera ||
      obtenerValorRaw(registro.raw, ["carrera", "programa", "oferta", "titulo", "título"])
    );

    // Si la fuente trae una denominación explícita, se respeta antes de usar heurísticas.
    // Esto evita convertir una carrera UNIVERSITARIA en una carrera SUPERIOR.
    if (!esVacio(directa)) {
      return directa;
    }

    const textos = obtenerTextosRegistro(registro);
    const textoCompleto = textos.join(" ");

    if (contieneSeguridadRiesgos(textoCompleto)) {
      return "SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES";
    }

    if (contieneSeguridadCiudadana(textoCompleto)) {
      return "SEGURIDAD CIUDADANA Y ORDEN PÚBLICO";
    }

    return extraerCarreraProbable(textos);
  }

  function extraerCarreraProbable(textos) {
    const candidatos = (textos || [])
      .map(limpiarCarreraModalidad)
      .filter(function (texto) {
        return pareceCarrera(texto);
      })
      .sort(function (a, b) {
        return puntuarCarrera(b) - puntuarCarrera(a);
      });

    return candidatos[0] || "";
  }

  function normalizarCarreraInstitucional(nombre) {
    const original = limpiarCarreraModalidad(nombre);
    const clave = claveTexto(original);

    if (!clave) return "";

    const nivel = detectarNivelCarrera(original);

    if (clave.includes("SEGURIDAD") && (clave.includes("RIESGO") || clave.includes("PREVENCION") || clave.includes("LABORAL"))) {
      return construirCarrera("SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES", nivel, "superior");
    }

    if (clave.includes("SEGURIDAD") && clave.includes("CIUDADANA")) {
      return construirCarrera("SEGURIDAD CIUDADANA Y ORDEN PÚBLICO", nivel, "superior");
    }

    if (clave.includes("ENFERMERIA")) {
      return "TÉCNICA SUPERIOR EN ENFERMERÍA";
    }

    if (clave.includes("ADMINISTRACION") && clave.includes("EMPRESAS") && clave.includes("INTELIGENCIA")) {
      return construirCarrera("ADMINISTRACIÓN DE EMPRESAS E INTELIGENCIA DE NEGOCIOS", nivel, "universitaria");
    }

    if (clave.includes("ADMINISTRACION") && clave.includes("TALENTO")) {
      return construirCarrera("ADMINISTRACIÓN DE TALENTO HUMANO", nivel, "universitaria");
    }

    if (clave.includes("ADMINISTRACION")) {
      return construirCarrera("ADMINISTRACIÓN", nivel, "superior");
    }

    if (clave.includes("CONTABILIDAD") && clave.includes("TRIBUTACION")) {
      return construirCarrera("CONTABILIDAD Y TRIBUTACIÓN", nivel, "universitaria");
    }

    if (clave.includes("CONTABILIDAD")) {
      return construirCarrera("CONTABILIDAD", nivel, "superior");
    }

    if (clave.includes("DESARROLLO") && clave.includes("SOFTWARE")) {
      return construirCarrera("DESARROLLO DE SOFTWARE", nivel, "superior");
    }

    if (clave.includes("EDUCACION") && clave.includes("BASICA")) {
      return construirCarrera("EDUCACIÓN BÁSICA", nivel, "superior");
    }

    if (clave.includes("EDUCACION") && clave.includes("INICIAL")) {
      return construirCarrera("EDUCACIÓN INICIAL", nivel, "superior");
    }

    if (clave.includes("ESTETICA") && clave.includes("INTEGRAL")) {
      return construirCarrera("ESTÉTICA INTEGRAL", nivel, "superior");
    }

    if (clave.includes("GESTION") && clave.includes("TALENTO")) {
      return construirCarrera("GESTIÓN DEL TALENTO HUMANO", nivel, "superior");
    }

    if (clave.includes("MARKETING") && clave.includes("COMERCIO")) {
      return construirCarrera("MARKETING DIGITAL Y COMERCIO ELECTRÓNICO", nivel, "superior");
    }

    if (clave.includes("MARKETING")) {
      return construirCarrera("MARKETING DIGITAL", nivel, "universitaria");
    }

    if (clave.includes("REDES") && clave.includes("TELECOMUNICACIONES")) {
      return construirCarrera("REDES Y TELECOMUNICACIONES", nivel, "superior");
    }

    if (clave.includes("MECANICA") && clave.includes("AUTOMOTRIZ")) {
      return construirCarrera("MECÁNICA AUTOMOTRIZ", nivel, "superior");
    }

    if (clave.includes("PROCESAMIENTO") && clave.includes("ALIMENTOS")) {
      return construirCarrera("PROCESAMIENTO DE ALIMENTOS", nivel, "superior");
    }

    if (clave.includes("PEDAGOGIA")) {
      return construirCarrera("PEDAGOGÍA", nivel, "universitaria");
    }

    const base = quitarPrefijoCarrera(original);
    return construirCarrera(base.toLocaleUpperCase("es-EC"), nivel, "superior");
  }

  function detectarNivelCarrera(nombre) {
    const clave = claveTexto(nombre);

    if (
      clave.includes("TECNOLOGIA SUPERIOR UNIVERSITARIA") ||
      clave.includes("TECNOLOGIA UNIVERSITARIA") ||
      /(?:^|\s)TSU(?:\s|$)/.test(clave)
    ) {
      return "universitaria";
    }

    if (clave.includes("TECNICA SUPERIOR")) {
      return "tecnica";
    }

    if (clave.includes("TECNOLOGIA SUPERIOR")) {
      return "superior";
    }

    return "";
  }

  function construirCarrera(programa, nivelDetectado, nivelPredeterminado) {
    const programaLimpio = limpiarTexto(programa)
      .replace(/^EN\s+/i, "")
      .toLocaleUpperCase("es-EC");

    const nivel = nivelDetectado || nivelPredeterminado || "superior";

    if (nivel === "universitaria") {
      return `TECNOLOGÍA SUPERIOR UNIVERSITARIA EN ${programaLimpio}`;
    }

    if (nivel === "tecnica") {
      return `TÉCNICA SUPERIOR EN ${programaLimpio}`;
    }

    return `TECNOLOGÍA SUPERIOR EN ${programaLimpio}`;
  }

  function limpiarCarreraModalidad(valor) {
    return limpiarTexto(valor)
      .replace(/\(\s*(?:ONLINE|ON\s*LINE|EN\s+L[ÍI]NEA)\s*\)/gi, " ")
      .replace(/\bONLINE\b/gi, " ")
      .replace(/\bON\s*LINE\b/gi, " ")
      .replace(/\bEN\s+L[ÍI]NEA\b/gi, " ")
      .replace(/\s+/g, " ")
      .replace(/[\s\-–—|/,:;]+$/g, "")
      .trim();
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
          carrera: limpiarCarreraModalidad(item.carreraOficial),
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
      if (!clave) return acc;
      if (!acc[clave]) acc[clave] = [];
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
    if (profundidad > 4 || valor === null || valor === undefined) return;

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
    if (!raw || typeof raw !== "object") return "";

    const keys = Object.keys(raw);

    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const claveKey = claveTexto(key);
      const coincide = candidatos.some(function (candidato) {
        return claveKey.includes(claveTexto(candidato));
      });

      if (coincide && !esVacio(raw[key])) return raw[key];
    }

    return "";
  }

  function pareceCarrera(valor) {
    const clave = claveTexto(valor);
    if (!clave || clave.length < 5) return false;
    if (convertirPromedio(valor) !== null) return false;

    const palabras = [
      "TECNOLOGIA", "TECNICA", "SUPERIOR", "UNIVERSITARIA", "ENFERMERIA",
      "ADMINISTRACION", "CONTABILIDAD", "SOFTWARE", "EDUCACION", "ESTETICA",
      "MECANICA", "REDES", "TELECOMUNICACIONES", "ALIMENTOS", "SEGURIDAD",
      "RIESGOS", "TALENTO", "MARKETING", "PEDAGOGIA"
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
    if (clave.includes("UNIVERSITARIA")) puntos += 4;
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
    return clave.includes("SEGURIDAD") && (
      clave.includes("RIESGO") ||
      clave.includes("RIESGOS") ||
      clave.includes("PREVENCION") ||
      clave.includes("RIESGOS LABORALES")
    );
  }

  function contieneSeguridadCiudadana(texto) {
    const clave = claveTexto(texto);
    return clave.includes("SEGURIDAD") && clave.includes("CIUDADANA") && !contieneSeguridadRiesgos(texto);
  }

  function quitarPrefijoCarrera(nombre) {
    return limpiarCarreraModalidad(nombre)
      .replace(/^TECNOLOG[IÍ]A\s+SUPERIOR\s+UNIVERSITARIA\s+(EN\s+)?/i, "")
      .replace(/^TECNOLOG[IÍ]A\s+UNIVERSITARIA\s+(EN\s+)?/i, "")
      .replace(/^TECNOLOG[IÍ]A\s+SUPERIOR\s+(EN\s+)?/i, "")
      .replace(/^T[EÉ]CNICA\s+SUPERIOR\s+(EN\s+)?/i, "")
      .replace(/^TSU\s+(EN\s+)?/i, "")
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
    if (!Number.isFinite(numero)) return null;
    return Math.round(numero * 1000) / 1000;
  }

  function limpiarTexto(valor) {
    if (U && typeof U.limpiarEspacios === "function") {
      return U.limpiarEspacios(valor);
    }

    return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim();
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
