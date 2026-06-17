/*
=========================================================
Nombre completo: certi.seguridad.fix.js
Ruta o ubicación: /incorporaciones/certificados/certi.seguridad.fix.js
Función o funciones:
- Parche final para rescatar la carrera Seguridad y Prevención de Riesgos Laborales.
- Leer el Excel completo nuevamente solo para detectar Seguridad.
- Detectar Seguridad aunque venga en celdas combinadas, encabezados, columnas no estándar o filas agrupadas.
- Inyectar el mejor egresado de Seguridad en el resultado final antes de generar PDF.
- No cambia diseño, PDF, plantilla ni carreras que ya funcionan.
Con qué se une:
- certi.catalogo.js
- certi.excel.js
- certi.logic.js
- certi.app.js
=========================================================
*/

(function () {
  "use strict";

  const VERSION = "2026-06-05-fix-seguridad-definitivo";
  const CARRERA_SEGURIDAD = "TECNOLOGÍA SUPERIOR EN SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES";
  const CODIGO_SEGURIDAD = "TS-RIE";

  iniciarParche();

  function iniciarParche() {
    parchearCatalogo();
    parchearExcel();
    parchearLogic();

    console.info("[CertiSeguridadFix] Activo:", VERSION);
  }

  function parchearCatalogo() {
    if (!window.CertiCatalogo || typeof window.CertiCatalogo.normalizar !== "function") {
      return;
    }

    if (window.CertiCatalogo.__seguridadFixAplicado) {
      return;
    }

    const normalizarOriginal = window.CertiCatalogo.normalizar.bind(window.CertiCatalogo);

    window.CertiCatalogo.normalizar = function (nombreExcel, emparejamientosManual) {
      const resultado = normalizarOriginal(nombreExcel, emparejamientosManual);

      if (resultado && resultado.reconocida) {
        return resultado;
      }

      if (esSeguridadRiesgos(nombreExcel)) {
        return crearCarreraSeguridad(nombreExcel, "catalogo_fix");
      }

      return resultado;
    };

    window.CertiCatalogo.__seguridadFixAplicado = true;
  }

  function parchearExcel() {
    if (!window.CertiExcel || typeof window.CertiExcel.leerArchivo !== "function") {
      return;
    }

    if (window.CertiExcel.__seguridadFixAplicado) {
      return;
    }

    const leerArchivoOriginal = window.CertiExcel.leerArchivo.bind(window.CertiExcel);

    window.CertiExcel.leerArchivo = async function (file) {
      const lectura = await leerArchivoOriginal(file);

      try {
        const rescatados = await leerRegistrosSeguridadDesdeArchivo(file);
        const registrosOriginales = Array.isArray(lectura.registros) ? lectura.registros : [];
        const registrosFinales = fusionarRegistros(registrosOriginales, rescatados);

        lectura.registros = registrosFinales;
        lectura.totalFilas = Math.max(Number(lectura.totalFilas || 0), registrosFinales.length);

        if (rescatados.length > 0) {
          console.info("[CertiSeguridadFix] Registros de Seguridad rescatados:", rescatados);
        }
      } catch (error) {
        console.warn("[CertiSeguridadFix] No se pudo aplicar rescate desde Excel:", error);
      }

      return lectura;
    };

    window.CertiExcel.__seguridadFixAplicado = true;
  }

  function parchearLogic() {
    if (!window.CertiLogic || typeof window.CertiLogic.procesar !== "function") {
      return;
    }

    if (window.CertiLogic.__seguridadFixAplicado) {
      return;
    }

    const procesarOriginal = window.CertiLogic.procesar.bind(window.CertiLogic);

    window.CertiLogic.procesar = function (registros, opciones) {
      const resultado = procesarOriginal(registros, opciones);
      return asegurarSeguridadEnResultado(resultado, registros);
    };

    window.CertiLogic.__seguridadFixAplicado = true;
  }

  function leerRegistrosSeguridadDesdeArchivo(file) {
    return new Promise(function (resolve) {
      if (!file || !window.XLSX) {
        resolve([]);
        return;
      }

      const lector = new FileReader();

      lector.onload = function (evento) {
        try {
          const datos = new Uint8Array(evento.target.result);
          const libro = XLSX.read(datos, {
            type: "array",
            cellDates: false,
            cellNF: false,
            cellText: false
          });

          resolve(extraerRegistrosSeguridadDesdeLibro(libro));
        } catch (error) {
          console.warn("[CertiSeguridadFix] Error leyendo Excel completo:", error);
          resolve([]);
        }
      };

      lector.onerror = function () {
        resolve([]);
      };

      lector.readAsArrayBuffer(file);
    });
  }

  function extraerRegistrosSeguridadDesdeLibro(libro) {
    const registros = [];

    if (!libro || !Array.isArray(libro.SheetNames)) {
      return [];
    }

    libro.SheetNames.forEach(function (nombreHoja) {
      const hojaOriginal = libro.Sheets[nombreHoja];

      if (!hojaOriginal) {
        return;
      }

      const hoja = completarCeldasCombinadas(hojaOriginal);

      const filas = XLSX.utils.sheet_to_json(hoja, {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false
      });

      registros.push(...extraerSeguridadDesdeFilas(filas, nombreHoja));
    });

    return quitarDuplicados(registros).map(function (registro, index) {
      return {
        ...registro,
        indice: registro.indice == null ? index : registro.indice
      };
    });
  }

  function completarCeldasCombinadas(hoja) {
    const copia = Object.assign({}, hoja);

    if (!hoja || !Array.isArray(hoja["!merges"])) {
      return copia;
    }

    hoja["!merges"].forEach(function (rango) {
      const origenRef = XLSX.utils.encode_cell({
        r: rango.s.r,
        c: rango.s.c
      });

      const origen = hoja[origenRef];

      if (!origen) {
        return;
      }

      for (let r = rango.s.r; r <= rango.e.r; r += 1) {
        for (let c = rango.s.c; c <= rango.e.c; c += 1) {
          const destinoRef = XLSX.utils.encode_cell({ r, c });

          if (!copia[destinoRef]) {
            copia[destinoRef] = Object.assign({}, origen);
          }
        }
      }
    });

    return copia;
  }

  function extraerSeguridadDesdeFilas(filas, nombreHoja) {
    const registros = [];

    if (!Array.isArray(filas) || filas.length === 0) {
      return registros;
    }

    const encabezado = detectarEncabezado(filas);
    let zonaSeguridad = false;
    let ultimaCarrera = "";

    filas.forEach(function (fila, indexFila) {
      const celdas = normalizarFila(fila);
      const textoFila = celdas.join(" ");

      if (!textoFila) {
        return;
      }

      const carreraPorColumna =
        encabezado && indexFila > encabezado.indice && encabezado.carrera >= 0
          ? limpiarTexto(celdas[encabezado.carrera])
          : "";

      if (!esVacio(carreraPorColumna)) {
        ultimaCarrera = carreraPorColumna;
      }

      const textoCarrera = [carreraPorColumna, ultimaCarrera, textoFila].join(" ");

      if (esSeguridadRiesgos(textoCarrera)) {
        zonaSeguridad = true;
        ultimaCarrera = CARRERA_SEGURIDAD;
      } else if (zonaSeguridad && pareceCarreraNoSeguridad(textoFila)) {
        zonaSeguridad = false;
      }

      const nombre =
        encabezado && indexFila > encabezado.indice && encabezado.nombre >= 0
          ? normalizarNombre(celdas[encabezado.nombre])
          : extraerNombreProbable(celdas);

      const promedio =
        encabezado && indexFila > encabezado.indice && encabezado.promedio >= 0
          ? convertirPromedio(celdas[encabezado.promedio])
          : extraerPromedioProbable(celdas);

      if (!zonaSeguridad && !esSeguridadRiesgos(textoFila)) {
        return;
      }

      if (esVacio(nombre) || promedio === null) {
        return;
      }

      registros.push({
        indice: indexFila,
        filaExcel: indexFila + 1,
        hojaExcel: nombreHoja || "",
        carreraOriginal: CARRERA_SEGURIDAD,
        nombre,
        promedioOriginal: String(promedio),
        promedio,
        fechaIncorporacion: "",
        raw: crearRawDesdeFila(celdas, indexFila, nombreHoja),
        origenFix: "seguridad_excel_rescatado"
      });
    });

    return registros;
  }

  function detectarEncabezado(filas) {
    const limite = Math.min(filas.length, 30);

    for (let i = 0; i < limite; i += 1) {
      const celdas = normalizarFila(filas[i]);

      const carrera = buscarIndiceColumna(celdas, [
        "CARRERA",
        "NOMBRE CARRERA",
        "NOMBRE DE CARRERA",
        "PROGRAMA",
        "PROGRAMA ACADEMICO",
        "PROGRAMA ACADÉMICO",
        "OFERTA",
        "TITULO",
        "TÍTULO"
      ]);

      const nombre = buscarIndiceColumna(celdas, [
        "NOMBRE",
        "NOMBRES",
        "ESTUDIANTE",
        "NOMBRE ESTUDIANTE",
        "NOMBRE DEL ESTUDIANTE",
        "APELLIDOS Y NOMBRES",
        "NOMBRE COMPLETO",
        "MEJOR EGRESADO",
        "EGRESADO"
      ]);

      const promedio = buscarIndiceColumna(celdas, [
        "PROMEDIO",
        "NOTA",
        "CALIFICACION",
        "CALIFICACIÓN",
        "PROMEDIO FINAL",
        "PROMEDIO GENERAL",
        "PUNTAJE"
      ]);

      if (nombre >= 0 && promedio >= 0) {
        return {
          indice: i,
          carrera,
          nombre,
          promedio
        };
      }
    }

    return null;
  }

  function buscarIndiceColumna(celdas, candidatos) {
    for (let i = 0; i < celdas.length; i += 1) {
      const claveCelda = claveTexto(celdas[i]);

      if (!claveCelda) {
        continue;
      }

      const encontrada = candidatos.some(function (candidato) {
        const claveCandidato = claveTexto(candidato);

        return (
          claveCelda === claveCandidato ||
          claveCelda.includes(claveCandidato) ||
          claveCandidato.includes(claveCelda)
        );
      });

      if (encontrada) {
        return i;
      }
    }

    return -1;
  }

  function asegurarSeguridadEnResultado(resultado, registros) {
    if (!resultado || !Array.isArray(resultado.mejores)) {
      return resultado;
    }

    const yaExiste = resultado.mejores.some(function (item) {
      return esSeguridadRiesgos([item.carreraOficial, item.carreraOriginal].join(" "));
    });

    if (yaExiste) {
      return resultado;
    }

    const candidato = obtenerMejorSeguridad(registros);

    if (!candidato) {
      return resultado;
    }

    const itemSeguridad = {
      ...candidato,
      carreraOriginal: candidato.carreraOriginal || CARRERA_SEGURIDAD,
      carreraOficial: CARRERA_SEGURIDAD,
      carreraCodigo: CODIGO_SEGURIDAD,
      carreraReconocida: true,
      carreraOrigen: "seguridad_fix",
      estadoCertificado: "listo",
      requiereAccion: false
    };

    resultado.mejores.push(itemSeguridad);
    resultado.mejores = ordenarMejores(resultado.mejores);

    if (!Array.isArray(resultado.registrosValidos)) {
      resultado.registrosValidos = [];
    }

    resultado.registrosValidos.push(itemSeguridad);

    if (Array.isArray(resultado.carrerasNoReconocidas)) {
      resultado.carrerasNoReconocidas = resultado.carrerasNoReconocidas.filter(function (item) {
        return !esSeguridadRiesgos(item.carreraOriginal);
      });
    }

    actualizarResumenYAlertas(resultado);

    console.info("[CertiSeguridadFix] Seguridad agregada al resultado final:", itemSeguridad);

    return resultado;
  }

  function obtenerMejorSeguridad(registros) {
    const candidatos = (registros || [])
      .map(function (registro) {
        return normalizarCandidatoSeguridad(registro);
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return Number(b.promedio) - Number(a.promedio);
      });

    return candidatos[0] || null;
  }

  function normalizarCandidatoSeguridad(registro) {
    const texto = textoCompletoRegistro(registro);

    if (!esSeguridadRiesgos(texto)) {
      return null;
    }

    const nombre =
      normalizarNombre(registro && registro.nombre) ||
      extraerNombreProbable(obtenerTextosRegistro(registro));

    const promedio =
      convertirPromedio(registro && registro.promedio) ??
      convertirPromedio(registro && registro.promedioOriginal) ??
      extraerPromedioProbable(obtenerTextosRegistro(registro));

    if (esVacio(nombre) || promedio === null) {
      return null;
    }

    return {
      ...(registro || {}),
      nombre,
      promedio,
      promedioOriginal: registro && registro.promedioOriginal ? registro.promedioOriginal : String(promedio),
      carreraOriginal: CARRERA_SEGURIDAD
    };
  }

  function actualizarResumenYAlertas(resultado) {
    const noReconocidas = Array.isArray(resultado.carrerasNoReconocidas)
      ? resultado.carrerasNoReconocidas
      : [];

    const empates = Array.isArray(resultado.empates) ? resultado.empates : [];

    const empatesPendientes = empates.filter(function (item) {
      return !item.resuelto;
    }).length;

    const certificadosListos = resultado.mejores.filter(function (item) {
      return item.estadoCertificado === "listo";
    }).length;

    const carreras = new Set();

    resultado.mejores.forEach(function (item) {
      if (!esVacio(item.carreraOficial)) {
        carreras.add(claveTexto(item.carreraOficial));
      }
    });

    noReconocidas.forEach(function (item) {
      if (!esVacio(item.carreraOriginal)) {
        carreras.add(claveTexto(item.carreraOriginal));
      }
    });

    resultado.resumen = {
      ...(resultado.resumen || {}),
      carrerasDetectadas: carreras.size,
      certificadosListos,
      alertas: 0,
      empatesPendientes,
      carrerasNoReconocidas: noReconocidas.length
    };

    const alertasBase = (resultado.alertas || []).filter(function (alerta) {
      return alerta.titulo !== "Datos listos" && alerta.titulo !== "Carreras no reconocidas";
    });

    if (noReconocidas.length > 0) {
      alertasBase.push({
        tipo: "danger",
        titulo: "Carreras no reconocidas",
        mensaje: `${noReconocidas.length} carrera(s) deben emparejarse con el catálogo oficial.`
      });
    }

    if (resultado.mejores.length > 0 && noReconocidas.length === 0 && empatesPendientes === 0) {
      alertasBase.push({
        tipo: "success",
        titulo: "Datos listos",
        mensaje: "Los certificados están listos para descarga."
      });
    }

    resultado.alertas = alertasBase;
    resultado.resumen.alertas = alertasBase.length;
  }

  function crearCarreraSeguridad(original, origen) {
    return {
      reconocida: true,
      original: limpiarTexto(original),
      oficial: CARRERA_SEGURIDAD,
      codigo: CODIGO_SEGURIDAD,
      requiereEmparejamiento: false,
      origen: origen || "seguridad_fix"
    };
  }

  function fusionarRegistros(originales, nuevos) {
    const mapa = {};
    const final = [];

    originales.concat(nuevos || []).forEach(function (registro) {
      if (!registro) {
        return;
      }

      const clave = [
        claveTexto(registro.carreraOriginal),
        claveTexto(registro.nombre),
        String(convertirPromedio(registro.promedio))
      ].join("|");

      if (mapa[clave]) {
        return;
      }

      mapa[clave] = true;
      final.push(registro);
    });

    return final.map(function (registro, index) {
      return {
        ...registro,
        indice: index
      };
    });
  }

  function quitarDuplicados(registros) {
    const mapa = {};
    const final = [];

    (registros || []).forEach(function (registro) {
      const clave = [
        claveTexto(registro.carreraOriginal),
        claveTexto(registro.nombre),
        String(convertirPromedio(registro.promedio))
      ].join("|");

      if (mapa[clave]) {
        return;
      }

      mapa[clave] = true;
      final.push(registro);
    });

    return final;
  }

  function ordenarMejores(mejores) {
    return [...(mejores || [])].sort(function (a, b) {
      return String(a.carreraOficial || "").localeCompare(String(b.carreraOficial || ""), "es");
    });
  }

  function normalizarFila(fila) {
    if (!Array.isArray(fila)) {
      return [];
    }

    return fila.map(function (valor) {
      return limpiarTexto(valor);
    });
  }

  function crearRawDesdeFila(celdas, indexFila, nombreHoja) {
    const raw = {
      __filaExcel: indexFila + 1,
      __hojaExcel: nombreHoja || ""
    };

    celdas.forEach(function (valor, index) {
      raw[`columna_${index + 1}`] = valor;
    });

    return raw;
  }

  function extraerNombreProbable(valores) {
    const candidatos = (valores || [])
      .map(function (valor) {
        return normalizarNombre(valor);
      })
      .filter(function (valor) {
        return pareceNombre(valor);
      })
      .sort(function (a, b) {
        return puntuarNombre(b) - puntuarNombre(a);
      });

    return candidatos[0] || "";
  }

  function pareceNombre(valor) {
    const texto = limpiarTexto(valor);
    const clave = claveTexto(texto);

    if (esVacio(texto)) {
      return false;
    }

    if (texto.length < 8 || texto.length > 90) {
      return false;
    }

    if (convertirPromedio(texto) !== null) {
      return false;
    }

    if (esSeguridadRiesgos(texto) || pareceCarrera(texto)) {
      return false;
    }

    if (
      clave.includes("NOMBRE") ||
      clave.includes("CARRERA") ||
      clave.includes("PROMEDIO") ||
      clave.includes("FECHA") ||
      clave.includes("PERIODO") ||
      clave.includes("COHORTE") ||
      clave.includes("EGRESADO") ||
      clave.includes("ESTUDIANTE")
    ) {
      return false;
    }

    const palabras = texto.split(/\s+/).filter(Boolean);

    if (palabras.length < 2 || palabras.length > 7) {
      return false;
    }

    const letras = texto.replace(/[^A-ZÁÉÍÓÚÑa-záéíóúñ]/g, "").length;
    const totalSinEspacios = texto.replace(/\s+/g, "").length;

    return totalSinEspacios > 0 && letras / totalSinEspacios >= 0.75;
  }

  function puntuarNombre(valor) {
    const texto = limpiarTexto(valor);
    const palabras = texto.split(/\s+/).filter(Boolean).length;
    const mayusculas = texto === texto.toLocaleUpperCase("es-EC") ? 5 : 0;

    return palabras * 10 + mayusculas + Math.min(texto.length, 40);
  }

  function extraerPromedioProbable(valores) {
    const numeros = [];

    (valores || []).forEach(function (valor) {
      const numero = convertirPromedio(valor);

      if (numero !== null && numero >= 0 && numero <= 10) {
        numeros.push(numero);
      }
    });

    const altos = numeros.filter(function (numero) {
      return numero >= 5 && numero <= 10;
    });

    if (altos.length > 0) {
      return altos[0];
    }

    return numeros.length > 0 ? numeros[0] : null;
  }

  function obtenerTextosRegistro(registro) {
    const textos = [];

    recolectarTextos(registro, textos, 0);

    return textos;
  }

  function textoCompletoRegistro(registro) {
    return obtenerTextosRegistro(registro).join(" ");
  }

  function recolectarTextos(valor, salida, profundidad) {
    if (profundidad > 3 || valor == null) {
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

  function pareceCarreraNoSeguridad(valor) {
    return pareceCarrera(valor) && !esSeguridadRiesgos(valor);
  }

  function pareceCarrera(valor) {
    const clave = claveTexto(valor);

    if (!clave || clave.length < 5) {
      return false;
    }

    const palabrasCarrera = [
      "TECNOLOGIA",
      "TECNOLOGÍA",
      "TECNICO",
      "TÉCNICO",
      "SUPERIOR",
      "ENFERMERIA",
      "ADMINISTRACION",
      "CONTABILIDAD",
      "SOFTWARE",
      "EDUCACION",
      "ESTETICA",
      "TALENTO",
      "MARKETING",
      "REDES",
      "TELECOMUNICACIONES",
      "MECANICA",
      "ALIMENTOS",
      "PEDAGOGIA",
      "RIESGOS",
      "SEGURIDAD"
    ];

    return palabrasCarrera.some(function (palabra) {
      return clave.includes(claveTexto(palabra));
    });
  }

  function esSeguridadRiesgos(valor) {
    const clave = claveTexto(valor);
    const compacta = clave.replace(/[^A-Z0-9]/g, "");

    if (!clave) {
      return false;
    }

    const tieneRiesgo =
      clave.includes("RIESGO") ||
      clave.includes("RIESGOS") ||
      compacta.includes("RIESG");

    const tienePrevencion =
      clave.includes("PREVENCION") ||
      clave.includes("PREVENCIÓN") ||
      compacta.includes("PREV");

    const tieneSeguridad =
      clave.includes("SEGURIDAD") ||
      compacta.includes("SEGURIDAD") ||
      compacta.includes("SEGY") ||
      compacta.includes("SEGPREV") ||
      /\bSEG\b/.test(clave);

    const tieneLaboral =
      clave.includes("LABORAL") ||
      clave.includes("LABORALES") ||
      compacta.includes("LAB");

    if (clave.includes("SEGURIDAD Y PREVENCION DE RIESGOS LABORALES")) {
      return true;
    }

    if (clave.includes("SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES")) {
      return true;
    }

    if (clave.includes("RIESGOS LABORALES") && (tieneSeguridad || tienePrevencion)) {
      return true;
    }

    if (tieneSeguridad && tieneRiesgo) {
      return true;
    }

    if (tienePrevencion && tieneRiesgo && tieneLaboral) {
      return true;
    }

    return false;
  }

  function normalizarNombre(valor) {
    const texto = limpiarTexto(valor);

    if (esVacio(texto)) {
      return "";
    }

    if (
      window.CertiUtils &&
      typeof window.CertiUtils.limpiarNombrePropio === "function"
    ) {
      return window.CertiUtils.limpiarNombrePropio(texto);
    }

    return texto.toLocaleUpperCase("es-EC");
  }

  function limpiarTexto(valor) {
    if (
      window.CertiUtils &&
      typeof window.CertiUtils.limpiarEspacios === "function"
    ) {
      return window.CertiUtils.limpiarEspacios(valor);
    }

    return String(valor == null ? "" : valor)
      .replace(/\s+/g, " ")
      .trim();
  }

  function claveTexto(valor) {
    if (
      window.CertiUtils &&
      typeof window.CertiUtils.claveTexto === "function"
    ) {
      return window.CertiUtils.claveTexto(valor);
    }

    return limpiarTexto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleUpperCase("es-EC");
  }

  function esVacio(valor) {
    if (
      window.CertiUtils &&
      typeof window.CertiUtils.esVacio === "function"
    ) {
      return window.CertiUtils.esVacio(valor);
    }

    return limpiarTexto(valor) === "";
  }

  function convertirPromedio(valor) {
    if (valor === null || valor === undefined || valor === "") {
      return null;
    }

    if (typeof valor === "number") {
      return Number.isFinite(valor) && valor >= 0 && valor <= 10 ? valor : null;
    }

    const textoOriginal = limpiarTexto(valor);

    if (!textoOriginal) {
      return null;
    }

    const coincidencias = textoOriginal.match(/\d+(?:[.,]\d+)?/g);

    if (!coincidencias || coincidencias.length === 0) {
      return null;
    }

    for (let i = 0; i < coincidencias.length; i += 1) {
      const numero = Number(coincidencias[i].replace(",", "."));

      if (Number.isFinite(numero) && numero >= 0 && numero <= 10) {
        return numero;
      }
    }

    return null;
  }
})();