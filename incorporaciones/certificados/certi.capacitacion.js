/*
=========================================================
Nombre completo: certi.capacitacion.js
Ruta o ubicación: /incorporaciones/certificados/certi.capacitacion.js
Función o funciones:
- Agregar el tipo de certificado de capacitación docente al módulo Certi.
- Leer Excel de capacitación con cédula, docente, curso/tema, nota, horas y fecha.
- Procesar una fila válida del Excel como un certificado individual.
- Dibujar certificados de capacitación con dos firmas: Vicerrector y Gestor de Procesos Académicos.
- Mantener intacto el flujo existente de reconocimiento a mejores egresados.
Con qué se une:
- certi.index.html
- certi.config.js
- certi.state.js
- certi.source.js
- certi.logic.js
- certi.render.js
- certi.template.js
- certi.pdf.js
=========================================================
*/

(function () {
  "use strict";

  const TIPO_RECONOCIMIENTO = "reconocimiento";
  const TIPO_CAPACITACION = "capacitacion";
  const STORAGE_TIPO = "certi.tipoCertificado";
  const PLANTILLA_CAPACITACION = "./assets/certi-plantilla-capacitacion.png";

  const U = window.CertiUtils || {};

  const firmantesCapacitacion = [
    {
      nombre: "Dr. Alex León",
      cargo: "VICERRECTOR"
    },
    {
      nombre: "Mgs. Jefferson Villarreal",
      cargo: "GESTOR DE PROCESOS ACADÉMICOS"
    }
  ];

  const candidatosColumnas = {
    cedula: [
      "CEDULA",
      "CÉDULA",
      "N. CEDULA",
      "N° CEDULA",
      "NRO CEDULA",
      "NUMERO CEDULA",
      "IDENTIFICACION",
      "IDENTIFICACIÓN",
      "DOCUMENTO",
      "DNI"
    ],
    docente: [
      "DOCENTE",
      "NOMBRE DOCENTE",
      "NOMBRE DEL DOCENTE",
      "PARTICIPANTE",
      "NOMBRE PARTICIPANTE",
      "NOMBRE",
      "NOMBRES",
      "NOMBRE COMPLETO",
      "APELLIDOS Y NOMBRES"
    ],
    curso: [
      "CURSO",
      "TEMA",
      "NOMBRE DEL CURSO",
      "NOMBRE CURSO",
      "CAPACITACION",
      "CAPACITACIÓN",
      "TEMA DE CAPACITACION",
      "TEMA DE CAPACITACIÓN",
      "EVENTO",
      "MODULO",
      "MÓDULO"
    ],
    nota: [
      "NOTA",
      "NOTA FINAL",
      "CALIFICACION",
      "CALIFICACIÓN",
      "CALIFICACION FINAL",
      "CALIFICACIÓN FINAL",
      "PUNTAJE",
      "PROMEDIO"
    ],
    horas: [
      "HORAS",
      "HORA",
      "DURACION",
      "DURACIÓN",
      "INTENSIDAD",
      "CARGA HORARIA",
      "NUMERO DE HORAS",
      "NÚMERO DE HORAS"
    ],
    fecha: [
      "FECHA",
      "FECHA CURSO",
      "FECHA DEL CURSO",
      "FECHA CAPACITACION",
      "FECHA CAPACITACIÓN",
      "FECHA EMISION",
      "FECHA EMISIÓN"
    ]
  };

  iniciarExtension();

  function iniciarExtension() {
    extenderConfig();
    parchearState();
    parchearSource();
    parchearLogic();
    parchearTemplate();
    parchearPdf();
    parchearRender();

    document.addEventListener("DOMContentLoaded", function () {
      prepararSelectorTipo();
      actualizarInterfazPorTipo();
    });
  }

  function extenderConfig() {
    const config = window.CertiConfig;
    if (!config) return;

    config.tiposCertificado = config.tiposCertificado || {};

    config.tiposCertificado.reconocimiento = config.tiposCertificado.reconocimiento || {
      id: TIPO_RECONOCIMIENTO,
      nombre: "Reconocimiento a mejores egresados",
      plantilla: config.rutas && config.rutas.plantillaCertificado
        ? config.rutas.plantillaCertificado
        : "./assets/certi-plantilla-certificado.png"
    };

    config.tiposCertificado.capacitacion = {
      id: TIPO_CAPACITACION,
      nombre: "Certificado de capacitación docente",
      plantilla: PLANTILLA_CAPACITACION,
      horasDefecto: 40,
      firmantes: firmantesCapacitacion.slice(),
      archivos: {
        pdfUnicoPrefijo: "Certificados_Capacitacion_Docente",
        pdfIndividualPrefijo: "Certificado_Capacitacion"
      }
    };
  }

  function parchearState() {
    const State = window.CertiState;
    if (!State || State.__capacitacionAplicado) return;

    const obtenerOriginal = State.obtener.bind(State);

    State.obtener = function () {
      const estado = obtenerOriginal();
      estado.tipoCertificado = obtenerTipoActual();
      estado.tipoCertificadoTexto = obtenerNombreTipo(estado.tipoCertificado);
      return estado;
    };

    State.establecerTipoCertificado = function (tipo) {
      establecerTipo(tipo, true);
      return State.obtener();
    };

    State.__capacitacionAplicado = true;
  }

  function parchearSource() {
    const Source = window.CertiSource;
    if (!Source || Source.__capacitacionAplicado) return;

    const leerOriginal = Source.leer.bind(Source);
    const resolverOriginal = Source.resolverFuente.bind(Source);
    const describirOriginal = typeof Source.describirFuente === "function"
      ? Source.describirFuente.bind(Source)
      : null;

    Source.resolverFuente = function (estado) {
      if (esCapacitacion(estado)) {
        if (!estado || !estado.archivoExcel) {
          throw new Error("Debe cargar el Excel de capacitación docente.");
        }

        return TIPO_CAPACITACION;
      }

      return resolverOriginal(estado);
    };

    Source.leer = async function (estado) {
      if (esCapacitacion(estado)) {
        return leerArchivoCapacitacion(estado.archivoExcel);
      }

      return leerOriginal(estado);
    };

    Source.describirFuente = function (estado) {
      if (esCapacitacion(estado)) {
        return "Excel de capacitación docente";
      }

      return describirOriginal ? describirOriginal(estado) : "Datos";
    };

    Source.__capacitacionAplicado = true;
  }

  function parchearLogic() {
    const Logic = window.CertiLogic;
    if (!Logic || Logic.__capacitacionAplicado) return;

    const procesarOriginal = Logic.procesar.bind(Logic);
    const validarOriginal = Logic.validarGeneracion.bind(Logic);
    const prepararOriginal = Logic.prepararCertificados.bind(Logic);

    Logic.procesar = function (registros, opciones) {
      if (esCapacitacionPorOpciones(registros, opciones)) {
        return procesarCapacitacion(registros);
      }

      return procesarOriginal(registros, opciones);
    };

    Logic.validarGeneracion = function (estado) {
      if (esCapacitacion(estado)) {
        return validarGeneracionCapacitacion(estado);
      }

      return validarOriginal(estado);
    };

    Logic.prepararCertificados = function (estado) {
      if (esCapacitacion(estado)) {
        return prepararCertificadosCapacitacion(estado);
      }

      return prepararOriginal(estado);
    };

    Logic.__capacitacionAplicado = true;
  }

  function parchearTemplate() {
    const Template = window.CertiTemplate;
    if (!Template || Template.__capacitacionAplicado) return;

    const dibujarOriginal = Template.dibujarCertificado.bind(Template);

    Template.dibujarCertificado = async function (doc, certificado, opciones) {
      if (certificado && certificado.tipoCertificado === TIPO_CAPACITACION) {
        dibujarCertificadoCapacitacion(doc, certificado, opciones || {});
        return;
      }

      return dibujarOriginal(doc, certificado, opciones);
    };

    Template.__capacitacionAplicado = true;
  }

  function parchearPdf() {
    const Pdf = window.CertiPdf;
    if (!Pdf || Pdf.__capacitacionAplicado) return;

    const descargarUnicoOriginal = Pdf.descargarPdfUnico.bind(Pdf);
    const descargarIndividualesOriginal = Pdf.descargarPdfIndividuales.bind(Pdf);

    Pdf.descargarPdfUnico = async function (estado) {
      if (!esCapacitacion(estado)) {
        return descargarUnicoOriginal(estado);
      }

      return ejecutarConConfigCapacitacion(function () {
        return descargarUnicoOriginal(estado);
      });
    };

    Pdf.descargarPdfIndividuales = async function (estado) {
      if (!esCapacitacion(estado)) {
        return descargarIndividualesOriginal(estado);
      }

      return ejecutarConConfigCapacitacion(function () {
        return descargarIndividualesOriginal(estado);
      });
    };

    Pdf.__capacitacionAplicado = true;
  }

  function parchearRender() {
    const Render = window.CertiRender;
    if (!Render || Render.__capacitacionAplicado) return;

    const renderizarOriginal = Render.renderizar.bind(Render);

    Render.renderizar = function (estado) {
      const tipo = obtenerTipoActual();
      const estadoSeguro = Object.assign({}, estado || {}, {
        tipoCertificado: tipo,
        tipoCertificadoTexto: obtenerNombreTipo(tipo)
      });

      renderizarOriginal(estadoSeguro);

      if (tipo === TIPO_CAPACITACION) {
        renderizarCapacitacion(estadoSeguro);
      } else {
        restaurarTablaReconocimiento();
      }

      actualizarInterfazPorTipo();
    };

    Render.__capacitacionAplicado = true;
  }

  function prepararSelectorTipo() {
    const selector = document.getElementById("certiTipoCertificado");
    if (!selector) return;

    selector.value = obtenerTipoActual();

    selector.addEventListener("change", function () {
      establecerTipo(selector.value, true);

      if (window.CertiState && typeof window.CertiState.limpiarResultados === "function") {
        window.CertiState.limpiarResultados();
      }

      actualizarInterfazPorTipo();
    });
  }

  function establecerTipo(tipo, guardar) {
    const normalizado = normalizarTipo(tipo);
    window.__certiTipoCertificadoActual = normalizado;

    if (guardar !== false) {
      try {
        localStorage.setItem(STORAGE_TIPO, normalizado);
      } catch (error) {
        console.warn("[CertiCapacitacion] No se pudo guardar tipo de certificado:", error);
      }
    }

    const selector = document.getElementById("certiTipoCertificado");
    if (selector && selector.value !== normalizado) {
      selector.value = normalizado;
    }

    if (normalizado === TIPO_CAPACITACION) {
      forzarFuenteExcel();
    }

    aplicarPlantillaVisual(normalizado);
  }

  function obtenerTipoActual() {
    const selector = document.getElementById("certiTipoCertificado");

    if (selector && selector.value) {
      return normalizarTipo(selector.value);
    }

    if (window.__certiTipoCertificadoActual) {
      return normalizarTipo(window.__certiTipoCertificadoActual);
    }

    try {
      const guardado = localStorage.getItem(STORAGE_TIPO);
      if (guardado) return normalizarTipo(guardado);
    } catch (error) {
      console.warn("[CertiCapacitacion] No se pudo leer tipo guardado:", error);
    }

    return TIPO_RECONOCIMIENTO;
  }

  function normalizarTipo(tipo) {
    const valor = String(tipo || "").toLowerCase().trim();
    return valor === TIPO_CAPACITACION ? TIPO_CAPACITACION : TIPO_RECONOCIMIENTO;
  }

  function obtenerNombreTipo(tipo) {
    return normalizarTipo(tipo) === TIPO_CAPACITACION
      ? "Certificado de capacitación docente"
      : "Reconocimiento a mejores egresados";
  }

  function esCapacitacion(estado) {
    const tipo = estado && estado.tipoCertificado
      ? estado.tipoCertificado
      : obtenerTipoActual();

    return normalizarTipo(tipo) === TIPO_CAPACITACION;
  }

  function esCapacitacionPorOpciones(registros, opciones) {
    if (opciones && opciones.origenDatos === TIPO_CAPACITACION) return true;

    return (registros || []).some(function (registro) {
      return registro && registro.tipoCertificado === TIPO_CAPACITACION;
    });
  }

  function forzarFuenteExcel() {
    const fuente = document.getElementById("certiFuenteDatos");

    if (fuente && fuente.value !== "excel") {
      fuente.value = "excel";

      if (window.CertiState && typeof window.CertiState.establecerFuenteDatos === "function") {
        window.CertiState.establecerFuenteDatos("excel");
      }
    }
  }

  function actualizarInterfazPorTipo() {
    const tipo = obtenerTipoActual();
    const esCap = tipo === TIPO_CAPACITACION;

    const titulo = document.querySelector(".certi-hero h1");
    const descripcion = document.querySelector(".certi-hero p:not(.certi-eyebrow)");
    const badge = document.querySelector(".certi-hero-badge strong");
    const subtituloConfig = document.querySelector(".certi-panel-title p");
    const bloqueTexto = document.getElementById("certiBloqueTexto");
    const fuente = document.getElementById("certiFuenteDatos");
    const labelExcel = document.querySelector("label[for='certiExcelInput'] span, .certi-file-field span");

    if (titulo) titulo.textContent = "Certi";

    if (descripcion) {
      descripcion.textContent = esCap
        ? "Generación automática de certificados de capacitación para docentes desde Excel."
        : "Generación automática de certificados de reconocimiento para mejores egresados por carrera.";
    }

    if (badge) {
      badge.textContent = esCap ? "Capacitación" : "Excel + Texto";
    }

    if (subtituloConfig) {
      subtituloConfig.textContent = esCap
        ? "Seleccione el período, fecha oficial y cargue el Excel de capacitación docente."
        : "Seleccione el período, defina la fecha oficial y cargue los datos desde Excel o texto pegado.";
    }

    if (labelExcel) {
      labelExcel.textContent = esCap ? "Excel de capacitación docente" : "Excel de mejores egresados";
    }

    if (fuente) {
      fuente.disabled = esCap;
      if (esCap) fuente.value = "excel";
    }

    if (bloqueTexto) {
      bloqueTexto.style.display = esCap ? "none" : "";
    }

    aplicarPlantillaVisual(tipo);
  }

  function aplicarPlantillaVisual(tipo) {
    const config = window.CertiConfig;
    if (!config || !config.rutas) return;

    if (normalizarTipo(tipo) === TIPO_CAPACITACION) {
      config.rutas.plantillaCapacitacion = PLANTILLA_CAPACITACION;
    }
  }

  async function leerArchivoCapacitacion(file) {
    if (!file) {
      throw new Error("Debe cargar el Excel de capacitación docente.");
    }

    if (!window.XLSX) {
      throw new Error("No se encontró la librería XLSX para leer Excel.");
    }

    const lectura = await leerLibroExcel(file);
    const procesada = leerHojasCapacitacion(lectura.libro);

    return {
      nombreArchivo: file.name,
      hoja: procesada.hojasLeidas.join(", ") || "Excel de capacitación",
      hojasLeidas: procesada.hojasLeidas,
      totalFilas: procesada.totalFilas,
      registros: procesada.registros,
      alertas: construirAlertasLecturaCapacitacion(procesada, file.name),
      origen: TIPO_CAPACITACION,
      fuente: "excel"
    };
  }

  function leerLibroExcel(file) {
    return new Promise(function (resolve, reject) {
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

          if (!libro.SheetNames || !libro.SheetNames.length) {
            throw new Error("El Excel no contiene hojas.");
          }

          resolve({ libro });
        } catch (error) {
          reject(error);
        }
      };

      lector.onerror = function () {
        reject(new Error("No se pudo leer el archivo Excel de capacitación."));
      };

      lector.readAsArrayBuffer(file);
    });
  }

  function leerHojasCapacitacion(libro) {
    const registros = [];
    const hojasLeidas = [];
    let totalFilas = 0;
    let indiceGlobal = 0;
    let hojasOmitidas = 0;

    libro.SheetNames.forEach(function (nombreHoja) {
      const hoja = libro.Sheets[nombreHoja];
      if (!hoja) return;

      const filas = XLSX.utils.sheet_to_json(hoja, {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false
      });

      if (!filas || !filas.length) return;

      const lecturaHoja = leerHojaCapacitacion(filas, nombreHoja, indiceGlobal);

      if (!lecturaHoja.registros.length) {
        hojasOmitidas += 1;
        return;
      }

      registros.push(...lecturaHoja.registros);
      hojasLeidas.push(nombreHoja);
      totalFilas += lecturaHoja.totalFilas;
      indiceGlobal += lecturaHoja.registros.length;
    });

    const registrosFinales = quitarDuplicadosCapacitacion(registros);

    return {
      registros: registrosFinales,
      hojasLeidas,
      totalFilas,
      hojasOmitidas,
      duplicados: registros.length - registrosFinales.length
    };
  }

  function leerHojaCapacitacion(filas, nombreHoja, indiceInicial) {
    const encabezado = detectarFilaEncabezadoCapacitacion(filas);

    if (!encabezado) {
      return {
        registros: [],
        totalFilas: filas.length
      };
    }

    const registros = [];

    for (let i = encabezado.indice + 1; i < filas.length; i += 1) {
      const fila = filas[i] || [];
      const registro = normalizarFilaCapacitacion(fila, encabezado.columnas, nombreHoja, i, indiceInicial + registros.length);

      if (registro.__vacia) continue;

      registros.push(registro);
    }

    return {
      registros,
      totalFilas: Math.max(0, filas.length - encabezado.indice - 1)
    };
  }

  function detectarFilaEncabezadoCapacitacion(filas) {
    const limite = Math.min(filas.length, 30);
    let mejor = null;

    for (let i = 0; i < limite; i += 1) {
      const fila = (filas[i] || []).map(limpiarTexto);
      const columnas = detectarColumnasCapacitacion(fila);
      const puntaje = puntuarColumnasCapacitacion(columnas);

      if (!mejor || puntaje > mejor.puntaje) {
        mejor = {
          indice: i,
          columnas,
          puntaje
        };
      }

      if (puntaje >= 10) {
        return mejor;
      }
    }

    return mejor && mejor.puntaje >= 8 ? mejor : null;
  }

  function detectarColumnasCapacitacion(encabezados) {
    return {
      cedula: buscarIndiceColumna(encabezados, candidatosColumnas.cedula),
      docente: buscarIndiceColumna(encabezados, candidatosColumnas.docente),
      curso: buscarIndiceColumna(encabezados, candidatosColumnas.curso),
      nota: buscarIndiceColumna(encabezados, candidatosColumnas.nota),
      horas: buscarIndiceColumna(encabezados, candidatosColumnas.horas),
      fecha: buscarIndiceColumna(encabezados, candidatosColumnas.fecha)
    };
  }

  function puntuarColumnasCapacitacion(columnas) {
    let puntos = 0;
    if (columnas.cedula >= 0) puntos += 2;
    if (columnas.docente >= 0) puntos += 3;
    if (columnas.curso >= 0) puntos += 3;
    if (columnas.nota >= 0) puntos += 2;
    if (columnas.horas >= 0) puntos += 1;
    if (columnas.fecha >= 0) puntos += 1;
    return puntos;
  }

  function buscarIndiceColumna(encabezados, candidatos) {
    const claves = (encabezados || []).map(claveTexto);

    for (let i = 0; i < claves.length; i += 1) {
      const clave = claves[i];
      if (!clave) continue;

      const coincide = candidatos.some(function (candidato) {
        const claveCandidato = claveTexto(candidato);
        return clave === claveCandidato || clave.includes(claveCandidato) || claveCandidato.includes(clave);
      });

      if (coincide) return i;
    }

    return -1;
  }

  function normalizarFilaCapacitacion(fila, columnas, nombreHoja, indexFila, indice) {
    const cedula = limpiarCedula(obtenerCelda(fila, columnas.cedula));
    const docente = limpiarNombre(obtenerCelda(fila, columnas.docente));
    const curso = limpiarTexto(obtenerCelda(fila, columnas.curso));
    const notaOriginal = obtenerCelda(fila, columnas.nota);
    const nota = convertirNota(notaOriginal);
    const horas = convertirHoras(obtenerCelda(fila, columnas.horas));
    const fechaCurso = limpiarTexto(obtenerCelda(fila, columnas.fecha));

    const vacia = [cedula, docente, curso, limpiarTexto(notaOriginal), horas, fechaCurso].every(function (valor) {
      return limpiarTexto(valor) === "";
    });

    return {
      tipoCertificado: TIPO_CAPACITACION,
      indice,
      filaExcel: indexFila + 1,
      hojaExcel: nombreHoja || "",
      cedula,
      nombre: docente,
      docente,
      curso,
      tema: curso,
      nota,
      notaOriginal,
      promedio: nota,
      promedioOriginal: notaOriginal,
      horas,
      fechaCurso,
      carreraOriginal: curso,
      carreraOficial: curso,
      estadoCertificado: "pendiente_validacion",
      requiereAccion: false,
      raw: crearRawCapacitacion(fila, columnas),
      __vacia: vacia
    };
  }

  function crearRawCapacitacion(fila, columnas) {
    return {
      cedula: obtenerCelda(fila, columnas.cedula),
      docente: obtenerCelda(fila, columnas.docente),
      curso: obtenerCelda(fila, columnas.curso),
      nota: obtenerCelda(fila, columnas.nota),
      horas: obtenerCelda(fila, columnas.horas),
      fecha: obtenerCelda(fila, columnas.fecha)
    };
  }

  function obtenerCelda(fila, indice) {
    if (indice === undefined || indice === null || indice < 0) return "";
    return fila[indice] == null ? "" : fila[indice];
  }

  function procesarCapacitacion(registros) {
    const validos = [];
    const incompletos = [];

    (registros || []).forEach(function (registro, index) {
      const normalizado = normalizarRegistroCapacitacion(registro, index);
      const validacion = validarRegistroCapacitacion(normalizado);

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

    return {
      registrosValidos: validos,
      mejores: ordenarCapacitaciones(validos),
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

  function normalizarRegistroCapacitacion(registro, index) {
    const base = registro || {};
    const nota = convertirNota(base.nota !== undefined ? base.nota : base.promedio);

    return Object.assign({}, base, {
      tipoCertificado: TIPO_CAPACITACION,
      indice: base.indice !== undefined ? base.indice : index,
      cedula: limpiarCedula(base.cedula || obtenerRaw(base.raw, "cedula")),
      nombre: limpiarNombre(base.docente || base.nombre || obtenerRaw(base.raw, "docente")),
      docente: limpiarNombre(base.docente || base.nombre || obtenerRaw(base.raw, "docente")),
      curso: limpiarTexto(base.curso || base.tema || obtenerRaw(base.raw, "curso")),
      tema: limpiarTexto(base.tema || base.curso || obtenerRaw(base.raw, "curso")),
      nota,
      promedio: nota,
      notaOriginal: base.notaOriginal !== undefined ? base.notaOriginal : base.promedioOriginal,
      promedioOriginal: base.notaOriginal !== undefined ? base.notaOriginal : base.promedioOriginal,
      horas: convertirHoras(base.horas || obtenerRaw(base.raw, "horas")),
      fechaCurso: limpiarTexto(base.fechaCurso || obtenerRaw(base.raw, "fecha")),
      carreraOriginal: limpiarTexto(base.curso || base.tema || obtenerRaw(base.raw, "curso")),
      carreraOficial: limpiarTexto(base.curso || base.tema || obtenerRaw(base.raw, "curso"))
    });
  }

  function validarRegistroCapacitacion(registro) {
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

  function validarGeneracionCapacitacion(estado) {
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

  function prepararCertificadosCapacitacion(estado) {
    const validacion = validarGeneracionCapacitacion(estado);

    if (!validacion.valido) {
      return {
        valido: false,
        errores: validacion.errores,
        certificados: []
      };
    }

    const fechaLarga = formatearFechaLarga(estado.fechaCertificado);
    const periodoTexto = estado.periodoTexto || estado.periodoSeleccionado;
    const tipoConfig = obtenerConfigCapacitacion();

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
          carreraCodigo: crearNombreArchivo(item.curso),
          origen: TIPO_CAPACITACION,
          firmantes: firmantesCapacitacion.slice()
        };
      });

    return {
      valido: true,
      errores: [],
      certificados
    };
  }

  function renderizarCapacitacion(estado) {
    renderizarResumenCapacitacion(estado);
    renderizarTablaCapacitacion(estado);
    ocultarPanelesNoUsados();
  }

  function renderizarResumenCapacitacion(estado) {
    const contenedor = document.getElementById("certiResumenCards");
    if (!contenedor) return;

    const resumen = estado.resultado && estado.resultado.resumen
      ? estado.resultado.resumen
      : {
        registrosLeidos: 0,
        carrerasDetectadas: 0,
        certificadosListos: 0,
        alertas: 0
      };

    contenedor.innerHTML = `
      <article class="certi-summary-card">
        <span>Docentes leídos</span>
        <strong>${resumen.registrosLeidos || 0}</strong>
      </article>

      <article class="certi-summary-card">
        <span>Cursos detectados</span>
        <strong>${resumen.carrerasDetectadas || 0}</strong>
      </article>

      <article class="certi-summary-card">
        <span>Certificados listos</span>
        <strong>${resumen.certificadosListos || 0}</strong>
      </article>

      <article class="certi-summary-card">
        <span>Alertas</span>
        <strong>${resumen.alertas || 0}</strong>
      </article>
    `;
  }

  function renderizarTablaCapacitacion(estado) {
    const tablaBody = document.getElementById("certiTablaBody");
    const thead = document.querySelector(".certi-table thead tr");

    if (thead) {
      thead.innerHTML = `
        <th>Cédula</th>
        <th>Docente</th>
        <th>Curso / Tema</th>
        <th>Nota</th>
        <th>Estado</th>
      `;
    }

    if (!tablaBody) return;

    const registros = estado.resultado && Array.isArray(estado.resultado.mejores)
      ? estado.resultado.mejores
      : [];

    if (!registros.length) {
      tablaBody.innerHTML = `
        <tr>
          <td colspan="5" class="certi-empty">
            Cargue y procese el Excel de capacitación para ver los certificados.
          </td>
        </tr>
      `;
      return;
    }

    tablaBody.innerHTML = registros.map(function (item) {
      const listo = item.estadoCertificado === "listo";

      return `
        <tr>
          <td>${escaparHtml(item.cedula)}</td>
          <td>${escaparHtml(item.docente || item.nombre)}</td>
          <td>${escaparHtml(item.curso)}</td>
          <td>${escaparHtml(formatearNota(item.nota))}</td>
          <td>
            <span class="certi-status ${listo ? "certi-status-ok" : "certi-status-warning"}">
              ${listo ? "Listo" : "Incompleto"}
            </span>
          </td>
        </tr>
      `;
    }).join("");
  }

  function restaurarTablaReconocimiento() {
    const thead = document.querySelector(".certi-table thead tr");
    if (!thead) return;

    thead.innerHTML = `
      <th>Carrera oficial</th>
      <th>Mejor egresado</th>
      <th>Promedio</th>
      <th>Estado</th>
    `;
  }

  function ocultarPanelesNoUsados() {
    const carrerasPanel = document.getElementById("certiCarrerasPanel");
    const empatesPanel = document.getElementById("certiEmpatesPanel");

    if (carrerasPanel) carrerasPanel.classList.add("certi-hidden");
    if (empatesPanel) empatesPanel.classList.add("certi-hidden");
  }

  function dibujarCertificadoCapacitacion(doc, certificado, opciones) {
    const config = window.CertiConfig || {};
    const pdfConfig = config.pdf || {};
    const ancho = pdfConfig.ancho || 297;
    const alto = pdfConfig.alto || 210;
    const centroX = ancho / 2;
    const plantilla = opciones.plantillaDataUrl;

    dibujarFondoCapacitacion(doc, plantilla, ancho, alto);

    const nombre = limpiarNombre(certificado.nombre || certificado.docente).toUpperCase();
    const curso = limpiarTexto(certificado.curso || certificado.tema).toUpperCase();
    const nota = formatearNota(certificado.nota || certificado.promedio);
    const horas = limpiarTexto(certificado.horas || "40");
    const fecha = limpiarTexto(certificado.fecha);
    const ciudad = config.ciudad || "Quito";

    doc.setTextColor(25, 25, 25);
    doc.setFont("times", "normal");
    doc.setFontSize(14);

    escribirCentrado(doc, "El Instituto Superior Tecnológico Quito Metropolitano certifica que:", centroX, 56, 226, 6.2);

    doc.setTextColor(6, 25, 65);
    doc.setFont("times", "bold");
    doc.setFontSize(calcularTamanoNombre(nombre));
    const finNombre = escribirCentrado(doc, nombre, centroX, 76, 236, 8.8);

    dibujarLinea(doc, centroX - 92, finNombre + 6, centroX + 92, finNombre + 6, 7, 29, 76, 0.5);

    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.8);

    const textoCurso = `Participó y aprobó la capacitación: ${curso}, con una duración de ${horas} horas y calificación de ${nota}.`;
    const finCurso = escribirCentrado(doc, textoCurso, centroX, Math.max(103, finNombre + 18), 226, 5.6);

    doc.setFontSize(10.3);
    escribirCentrado(
      doc,
      "El presente certificado se emite como constancia de participación y cumplimiento académico.",
      centroX,
      Math.max(129, finCurso + 15),
      222,
      5.4
    );

    doc.setTextColor(115, 115, 115);
    doc.setFont("times", "normal");
    doc.setFontSize(11.6);
    doc.text(`${ciudad}, ${fecha}.`, ancho - 28, 151, {
      align: "right"
    });

    dibujarFirmasCapacitacion(doc, certificado.firmantes || firmantesCapacitacion, ancho);
  }

  function dibujarFondoCapacitacion(doc, plantillaDataUrl, ancho, alto) {
    if (plantillaDataUrl) {
      try {
        doc.addImage(plantillaDataUrl, "PNG", 0, 0, ancho, alto);
        return;
      } catch (error) {
        console.warn("[CertiCapacitacion] No se pudo colocar la plantilla de capacitación:", error);
      }
    }

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, ancho, alto, "F");
    dibujarLinea(doc, 10, 10, ancho - 10, 10, 13, 71, 161, 1.2);
    dibujarLinea(doc, 10, alto - 10, ancho - 10, alto - 10, 13, 71, 161, 1.2);
    dibujarLinea(doc, 16, 16, ancho - 16, 16, 196, 155, 57, 0.45);
    dibujarLinea(doc, 16, alto - 16, ancho - 16, alto - 16, 196, 155, 57, 0.45);
  }

  function dibujarFirmasCapacitacion(doc, firmantes, ancho) {
    const y = 171;
    const posiciones = [ancho * 0.32, ancho * 0.68];

    (firmantes || firmantesCapacitacion).slice(0, 2).forEach(function (firmante, index) {
      const x = posiciones[index] || ancho / 2;

      dibujarLinea(doc, x - 39, y, x + 39, y, 65, 65, 65, 0.38);

      doc.setTextColor(10, 10, 10);
      doc.setFont("times", "bold");
      doc.setFontSize(11.2);
      doc.text(firmante.nombre, x, y + 8.4, {
        align: "center"
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.3);
      doc.text(firmante.cargo, x, y + 14.2, {
        align: "center"
      });
    });
  }

  function ejecutarConConfigCapacitacion(callback) {
    const config = window.CertiConfig || {};
    config.rutas = config.rutas || {};
    config.archivos = config.archivos || {};

    const rutaOriginal = config.rutas.plantillaCertificado;
    const prefijoUnicoOriginal = config.archivos.pdfUnicoPrefijo;
    const prefijoIndividualOriginal = config.archivos.pdfIndividualPrefijo;
    const tipoConfig = obtenerConfigCapacitacion();

    config.rutas.plantillaCertificado = tipoConfig.plantilla || PLANTILLA_CAPACITACION;
    config.archivos.pdfUnicoPrefijo = tipoConfig.archivos.pdfUnicoPrefijo;
    config.archivos.pdfIndividualPrefijo = tipoConfig.archivos.pdfIndividualPrefijo;

    return Promise.resolve()
      .then(callback)
      .finally(function () {
        config.rutas.plantillaCertificado = rutaOriginal;
        config.archivos.pdfUnicoPrefijo = prefijoUnicoOriginal;
        config.archivos.pdfIndividualPrefijo = prefijoIndividualOriginal;
      });
  }

  function obtenerConfigCapacitacion() {
    const config = window.CertiConfig || {};
    const tipos = config.tiposCertificado || {};

    return tipos.capacitacion || {
      plantilla: PLANTILLA_CAPACITACION,
      horasDefecto: 40,
      firmantes: firmantesCapacitacion.slice(),
      archivos: {
        pdfUnicoPrefijo: "Certificados_Capacitacion_Docente",
        pdfIndividualPrefijo: "Certificado_Capacitacion"
      }
    };
  }

  function construirAlertasLecturaCapacitacion(procesada, nombreArchivo) {
    const alertas = [
      {
        tipo: "info",
        titulo: "Fuente de datos",
        mensaje: `Excel de capacitación: ${nombreArchivo || "archivo cargado"}`
      }
    ];

    if (procesada.registros.length > 0) {
      alertas.push({
        tipo: "success",
        titulo: "Excel leído",
        mensaje: `Se detectaron ${procesada.registros.length} fila(s) de capacitación.`
      });
    } else {
      alertas.push({
        tipo: "warning",
        titulo: "Sin datos detectados",
        mensaje: "No se encontraron columnas suficientes para capacitación: cédula, docente, curso y nota."
      });
    }

    if (procesada.duplicados > 0) {
      alertas.push({
        tipo: "info",
        titulo: "Duplicados omitidos",
        mensaje: `${procesada.duplicados} registro(s) duplicados fueron ignorados.`
      });
    }

    if (procesada.hojasOmitidas > 0) {
      alertas.push({
        tipo: "warning",
        titulo: "Hojas omitidas",
        mensaje: `${procesada.hojasOmitidas} hoja(s) no tenían encabezados reconocibles de capacitación.`
      });
    }

    return alertas;
  }

  function quitarDuplicadosCapacitacion(registros) {
    const mapa = {};
    const salida = [];

    (registros || []).forEach(function (registro) {
      const clave = [registro.cedula, registro.docente, registro.curso, registro.nota].map(claveTexto).join("|");
      if (mapa[clave]) return;
      mapa[clave] = true;
      salida.push(registro);
    });

    return salida.map(function (registro, index) {
      return Object.assign({}, registro, {
        indice: index
      });
    });
  }

  function ordenarCapacitaciones(lista) {
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

  function obtenerRaw(raw, campo) {
    if (!raw || typeof raw !== "object") return "";
    return raw[campo] == null ? "" : raw[campo];
  }

  function convertirNota(valor) {
    if (valor === null || valor === undefined || String(valor).trim() === "") return null;

    let texto = String(valor).replace(",", ".").replace(/[^0-9.-]/g, "");
    if (!texto) return null;

    let numero = Number(texto);
    if (!Number.isFinite(numero)) return null;

    if (numero > 10 && numero <= 100) {
      numero = numero / 10;
    } else if (numero > 100 && numero < 1000000) {
      numero = numero / 1000;
    }

    if (numero < 0 || numero > 10) return null;
    return Number(numero.toFixed(2));
  }

  function convertirHoras(valor) {
    const texto = limpiarTexto(valor).replace(",", ".").replace(/[^0-9.]/g, "");
    if (!texto) return "";

    const numero = Number(texto);
    if (!Number.isFinite(numero) || numero <= 0) return "";

    if (Number.isInteger(numero)) return String(numero);
    return String(Number(numero.toFixed(1)));
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

  function escaparHtml(valor) {
    if (U && typeof U.escaparHtml === "function") {
      return U.escaparHtml(valor);
    }

    return String(valor == null ? "" : valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatearFechaLarga(fecha) {
    if (U && typeof U.formatearFechaLarga === "function") {
      return U.formatearFechaLarga(fecha);
    }

    return fecha || "";
  }

  function crearNombreArchivo(texto) {
    if (U && typeof U.crearNombreArchivo === "function") {
      return U.crearNombreArchivo(texto);
    }

    return claveTexto(texto).replace(/[^A-Z0-9]+/g, "_").toLowerCase();
  }

  function escribirCentrado(doc, texto, x, y, anchoMaximo, saltoLinea) {
    const lineas = [];

    String(texto || "")
      .split("\n")
      .forEach(function (bloque) {
        const partes = doc.splitTextToSize(bloque, anchoMaximo);
        partes.forEach(function (parte) {
          lineas.push(parte);
        });
      });

    lineas.forEach(function (linea, index) {
      doc.text(linea, x, y + index * saltoLinea, {
        align: "center"
      });
    });

    return lineas.length ? y + (lineas.length - 1) * saltoLinea : y;
  }

  function dibujarLinea(doc, x1, y1, x2, y2, r, g, b, ancho) {
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(ancho);
    doc.line(x1, y1, x2, y2);
  }

  function calcularTamanoNombre(nombre) {
    const largo = String(nombre || "").length;
    if (largo > 62) return 16;
    if (largo > 54) return 17.2;
    if (largo > 46) return 18.4;
    if (largo > 38) return 19.6;
    if (largo > 30) return 20.8;
    return 22;
  }

  window.CertiCapacitacion = {
    tipo: TIPO_CAPACITACION,
    plantilla: PLANTILLA_CAPACITACION,
    firmantes: firmantesCapacitacion.slice(),
    leerArchivo: leerArchivoCapacitacion,
    procesar: procesarCapacitacion,
    prepararCertificados: prepararCertificadosCapacitacion,
    dibujarCertificado: dibujarCertificadoCapacitacion,
    obtenerTipoActual,
    establecerTipo
  };
})();
