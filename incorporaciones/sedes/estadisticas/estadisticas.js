/*
Nombre completo: estadisticas.js
Ruta o ubicación: /incorporaciones-app/estadisticas/estadisticas.js

Función o funciones:
1. Controlar la pantalla de estadísticas de incorporaciones.
2. Validar acceso de administrador.
3. Cargar períodos desde Firebase.
4. Leer estudiantes e incorporaciones del período seleccionado.
5. Consolidar datos por cédula.
6. Calcular respondieron, no respondieron, Quito, Manta y sin sede.
7. Agrupar por carrera, modalidad y sede institucional.
8. Renderizar tablas, tarjetas y listados.
9. Exportar resultados.
10. Guardar memoria de período, filtros, listado y posición al cambiar entre pantallas.
*/

let statsEstudiantesBase = [];
let statsEstudiantesFiltrados = [];
let statsTablasActuales = null;
let statsRestaurandoMemoria = false;
let statsMemoriaPendiente = null;

const STATS_MEMORIA_KEY = "incorporaciones_stats_memoria_v1";
const ADMIN_MEMORIA_KEY_STATS = "incorporaciones_admin_memoria_v1";

const statsEls = {};

document.addEventListener("DOMContentLoaded", async function () {
  capturarElementosStats();
  configurarEventosStats();
  configurarMemoriaStats();

  statsEls.loginBox.classList.add("hidden");
  statsEls.panel.classList.remove("hidden");

  await cargarPeriodosStats();
  await restaurarMemoriaStats();
});

function capturarElementosStats() {
  statsEls.loginBox = document.getElementById("statsLoginBox");
  statsEls.panel = document.getElementById("statsPanel");
  statsEls.password = document.getElementById("statsPassword");
  statsEls.btnLogin = document.getElementById("btnStatsLogin");
  statsEls.loginMessage = document.getElementById("statsLoginMessage");

  statsEls.periodoSelect = document.getElementById("periodoStatsSelect");
  statsEls.btnCargar = document.getElementById("btnCargarEstadisticas");
  statsEls.btnRefrescar = document.getElementById("btnRefrescarEstadisticas");
  statsEls.message = document.getElementById("statsMessage");
  statsEls.exportMessage = document.getElementById("exportMessage");

  statsEls.filtroCarrera = document.getElementById("filtroCarreraStats");
  statsEls.filtroModalidad = document.getElementById("filtroModalidadStats");
  statsEls.filtroSedeInstitucional = document.getElementById("filtroSedeInstitucionalStats");
  statsEls.filtroSedeIncorporacion = document.getElementById("filtroSedeIncorporacionStats");
  statsEls.filtroRespuesta = document.getElementById("filtroRespuestaStats");
  statsEls.tipoListado = document.getElementById("tipoListadoStats");

  statsEls.statTotal = document.getElementById("statTotalEstudiantes");
  statsEls.statRespondieron = document.getElementById("statRespondieron");
  statsEls.statNoRespondieron = document.getElementById("statNoRespondieron");
  statsEls.statQuito = document.getElementById("statQuito");
  statsEls.statManta = document.getElementById("statManta");
  statsEls.statSinSede = document.getElementById("statSinSede");

  statsEls.statRespondieronPct = document.getElementById("statRespondieronPct");
  statsEls.statNoRespondieronPct = document.getElementById("statNoRespondieronPct");
  statsEls.statQuitoPct = document.getElementById("statQuitoPct");
  statsEls.statMantaPct = document.getElementById("statMantaPct");
  statsEls.statSinSedePct = document.getElementById("statSinSedePct");

  statsEls.tablaCarrera = document.getElementById("tablaCarreraBody");
  statsEls.tablaModalidad = document.getElementById("tablaModalidadBody");
  statsEls.tablaSedeInstitucional = document.getElementById("tablaSedeInstitucionalBody");
  statsEls.tablaCruceCarreraSede = document.getElementById("tablaCruceCarreraSedeBody");
  statsEls.tablaCruceModalidadSede = document.getElementById("tablaCruceModalidadSedeBody");
  statsEls.tablaCruceSedeInstitucional = document.getElementById("tablaCruceSedeInstitucionalBody");
  statsEls.tablaRankingPendientes = document.getElementById("tablaRankingPendientesBody");
  statsEls.tablaListadoDetalle = document.getElementById("tablaListadoDetalleBody");

  statsEls.btnExportarResumen = document.getElementById("btnExportarResumen");
  statsEls.btnExportarCarrera = document.getElementById("btnExportarCarrera");
  statsEls.btnExportarPendientes = document.getElementById("btnExportarPendientes");
  statsEls.btnExportarQuito = document.getElementById("btnExportarQuito");
  statsEls.btnExportarManta = document.getElementById("btnExportarManta");
  statsEls.btnExportarTodo = document.getElementById("btnExportarTodo");
}

function configurarEventosStats() {
  statsEls.btnLogin.addEventListener("click", iniciarSesionStats);

  statsEls.password.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      iniciarSesionStats();
    }
  });

  statsEls.btnCargar.addEventListener("click", async function () {
    guardarMemoriaStats();
    await cargarEstadisticasPeriodo();
  });

  statsEls.btnRefrescar.addEventListener("click", async function () {
    guardarMemoriaStats();
    await cargarEstadisticasPeriodo();
  });

  statsEls.periodoSelect.addEventListener("change", async function () {
    guardarMemoriaStats();
    await cargarEstadisticasPeriodo();
  });

  statsEls.filtroCarrera.addEventListener("change", function () {
    guardarMemoriaStats();
    aplicarFiltrosStats();
  });

  statsEls.filtroModalidad.addEventListener("change", function () {
    guardarMemoriaStats();
    aplicarFiltrosStats();
  });

  statsEls.filtroSedeInstitucional.addEventListener("change", function () {
    guardarMemoriaStats();
    aplicarFiltrosStats();
  });

  statsEls.filtroSedeIncorporacion.addEventListener("change", function () {
    guardarMemoriaStats();
    aplicarFiltrosStats();
  });

  statsEls.filtroRespuesta.addEventListener("change", function () {
    guardarMemoriaStats();
    aplicarFiltrosStats();
  });

  statsEls.tipoListado.addEventListener("change", function () {
    guardarMemoriaStats();
    renderizarListadoDetalleStats();
  });

  statsEls.btnExportarResumen.addEventListener("click", exportarResumenStats);
  statsEls.btnExportarCarrera.addEventListener("click", exportarCarreraStats);
  statsEls.btnExportarPendientes.addEventListener("click", exportarPendientesStats);
  statsEls.btnExportarQuito.addEventListener("click", exportarQuitoStats);
  statsEls.btnExportarManta.addEventListener("click", exportarMantaStats);
  statsEls.btnExportarTodo.addEventListener("click", exportarTodoStats);
}

function configurarMemoriaStats() {
  window.addEventListener("beforeunload", guardarMemoriaStats);
  window.addEventListener("pagehide", guardarMemoriaStats);

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      guardarMemoriaStats();
    }
  });

  window.addEventListener("scroll", function () {
    guardarMemoriaStats();
  }, { passive: true });
}

function leerMemoriaPorClaveStats(clave) {
  try {
    const texto = sessionStorage.getItem(clave);

    if (!texto) {
      return null;
    }

    return JSON.parse(texto);
  } catch (error) {
    return null;
  }
}

function leerMemoriaStats() {
  return leerMemoriaPorClaveStats(STATS_MEMORIA_KEY);
}

function obtenerPeriodoDesdeMemoriaAdminStats() {
  const memoriaAdmin = leerMemoriaPorClaveStats(ADMIN_MEMORIA_KEY_STATS);

  if (!memoriaAdmin || !memoriaAdmin.periodoId) {
    return "";
  }

  return memoriaAdmin.periodoId;
}

function guardarMemoriaStats() {
  if (statsRestaurandoMemoria) {
    return;
  }

  try {
    const wrappers = Array.from(document.querySelectorAll(".estadisticas-table-wrapper"));

    const memoria = {
      periodoId: statsEls.periodoSelect ? statsEls.periodoSelect.value : "",
      filtroCarrera: statsEls.filtroCarrera ? statsEls.filtroCarrera.value : "TODAS",
      filtroModalidad: statsEls.filtroModalidad ? statsEls.filtroModalidad.value : "TODAS",
      filtroSedeInstitucional: statsEls.filtroSedeInstitucional ? statsEls.filtroSedeInstitucional.value : "TODAS",
      filtroSedeIncorporacion: statsEls.filtroSedeIncorporacion ? statsEls.filtroSedeIncorporacion.value : "TODAS",
      filtroRespuesta: statsEls.filtroRespuesta ? statsEls.filtroRespuesta.value : "TODAS",
      tipoListado: statsEls.tipoListado ? statsEls.tipoListado.value : "",
      scrollY: window.scrollY || 0,
      tablasScroll: wrappers.map(function (wrapper) {
        return {
          scrollLeft: wrapper.scrollLeft || 0,
          scrollTop: wrapper.scrollTop || 0
        };
      }),
      fechaGuardado: new Date().toISOString()
    };

    sessionStorage.setItem(STATS_MEMORIA_KEY, JSON.stringify(memoria));
  } catch (error) {
    console.warn("No se pudo guardar la memoria de estadísticas:", error);
  }
}

function aplicarValorSelectStats(select, valor) {
  if (!select || valor === undefined || valor === null || valor === "") {
    return;
  }

  const existe = Array.from(select.options).some(function (option) {
    return option.value === valor;
  });

  if (existe) {
    select.value = valor;
  }
}

async function restaurarMemoriaStats() {
  const memoria = leerMemoriaStats() || {};
  const periodoDesdeAdmin = obtenerPeriodoDesdeMemoriaAdminStats();
  const periodoRestaurar = memoria.periodoId || periodoDesdeAdmin;

  if (!periodoRestaurar && Object.keys(memoria).length === 0) {
    return;
  }

  statsRestaurandoMemoria = true;
  statsMemoriaPendiente = memoria;

  aplicarValorSelectStats(statsEls.filtroModalidad, memoria.filtroModalidad);
  aplicarValorSelectStats(statsEls.filtroSedeIncorporacion, memoria.filtroSedeIncorporacion);
  aplicarValorSelectStats(statsEls.filtroRespuesta, memoria.filtroRespuesta);
  aplicarValorSelectStats(statsEls.tipoListado, memoria.tipoListado);

  if (periodoRestaurar) {
    const existePeriodo = Array.from(statsEls.periodoSelect.options).some(function (option) {
      return option.value === periodoRestaurar;
    });

    if (existePeriodo) {
      statsEls.periodoSelect.value = periodoRestaurar;
      await cargarEstadisticasPeriodo();
    }
  }

  setTimeout(function () {
    restaurarScrollStats(memoria);
    statsRestaurandoMemoria = false;
    guardarMemoriaStats();
  }, 450);
}

function restaurarScrollStats(memoria) {
  const wrappers = Array.from(document.querySelectorAll(".estadisticas-table-wrapper"));
  const tablasScroll = memoria.tablasScroll || [];

  wrappers.forEach(function (wrapper, index) {
    const scrollGuardado = tablasScroll[index];

    if (!scrollGuardado) {
      return;
    }

    wrapper.scrollLeft = Number(scrollGuardado.scrollLeft || 0);
    wrapper.scrollTop = Number(scrollGuardado.scrollTop || 0);
  });

  window.scrollTo(0, Number(memoria.scrollY || 0));
}

function mostrarMensajeStats(elemento, texto, tipo) {
  if (!elemento) {
    return;
  }

  elemento.textContent = texto || "";
  elemento.className = "message";

  if (tipo) {
    elemento.classList.add(tipo);
  }
}

function escaparHTMLStats(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function porcentajeStats(valor, total) {
  if (!total || total <= 0) {
    return "0%";
  }

  return `${((valor / total) * 100).toFixed(2)}%`;
}

function textoVisibleStats(valor, defecto) {
  const texto = String(valor || "").trim();

  if (!texto) {
    return defecto || "Sin dato";
  }

  return texto;
}

function iniciarSesionStats() {
  const clave = statsEls.password.value.trim();

  if (clave !== APP_CONFIG.adminPassword) {
    mostrarMensajeStats(statsEls.loginMessage, "Clave incorrecta.", "error");
    return;
  }

  sessionStorage.setItem("adminSesionActiva", "true");

  statsEls.loginBox.classList.add("hidden");
  statsEls.panel.classList.remove("hidden");

  cargarPeriodosStats();
}

async function cargarPeriodosStats() {
  try {
    statsEls.periodoSelect.innerHTML = `<option value="">Cargando períodos...</option>`;

    let periodos = [];

    if (typeof obtenerPeriodosFirebase === "function") {
      periodos = await obtenerPeriodosFirebase();
    } else {
      const snapshot = await db.collection(APP_COLLECTIONS.periodos).get();

      snapshot.forEach(function (doc) {
        periodos.push({
          id: doc.id,
          docId: doc.id,
          ...doc.data()
        });
      });

      periodos.sort(function (a, b) {
        return Number(b.orden || 0) - Number(a.orden || 0);
      });
    }

    if (!periodos || periodos.length === 0) {
      statsEls.periodoSelect.innerHTML = `<option value="">No existen períodos</option>`;
      return;
    }

    statsEls.periodoSelect.innerHTML = `<option value="">Seleccione un período</option>`;

    periodos.forEach(function (periodo) {
      const option = document.createElement("option");
      option.value = periodo.id;
      option.textContent = periodo.activoConsulta
        ? `${periodo.label || periodo.id} - ACTIVO`
        : periodo.label || periodo.id;

      statsEls.periodoSelect.appendChild(option);
    });

    mostrarMensajeStats(
      statsEls.message,
      "Períodos cargados correctamente. Seleccione uno para consultar estadísticas.",
      "info"
    );
  } catch (error) {
    statsEls.periodoSelect.innerHTML = `<option value="">Error al cargar períodos</option>`;
    mostrarMensajeStats(statsEls.message, error.message, "error");
  }
}

async function cargarEstudiantesConsolidadosStats(periodoId) {
  const snapshot = await db.collection(APP_COLLECTIONS.estudiantes).get();
  const estudiantesPorCedula = {};

  snapshot.forEach(function (doc) {
    const data = {
      id: doc.id,
      docId: doc.id,
      ...doc.data()
    };

    if (!perteneceEstudianteAlPeriodoStats(data, periodoId)) {
      return;
    }

    const cedula = obtenerCedulaStats(data);

    if (!cedula) {
      return;
    }

    const actual = estudiantesPorCedula[cedula];

    if (!actual || puntuarEstudianteStats(data, periodoId) > puntuarEstudianteStats(actual, periodoId)) {
      estudiantesPorCedula[cedula] = data;
    }
  });

  return Object.values(estudiantesPorCedula);
}

function perteneceEstudianteAlPeriodoStats(estudiante, periodoId) {
  const periodoCampo = String(estudiante.periodoId || "").trim();
  const periodoSeguro = limpiarIdFirestore(periodoId);
  const periodoCampoSeguro = limpiarIdFirestore(periodoCampo);
  const docIdSeguro = limpiarIdFirestore(estudiante.docId || estudiante.id || "");

  if (periodoCampo && periodoCampo === periodoId) {
    return true;
  }

  if (periodoCampoSeguro && periodoCampoSeguro === periodoSeguro) {
    return true;
  }

  if (docIdSeguro.endsWith(`_${periodoSeguro}`)) {
    return true;
  }

  if (docIdSeguro.includes(`_${periodoSeguro}`)) {
    return true;
  }

  return false;
}

function puntuarEstudianteStats(estudiante, periodoId) {
  let puntos = 0;

  const periodoCampo = String(estudiante.periodoId || "").trim();
  const periodoSeguro = limpiarIdFirestore(periodoId);
  const docIdSeguro = limpiarIdFirestore(estudiante.docId || estudiante.id || "");

  if (periodoCampo === periodoId) {
    puntos += 100;
  }

  if (limpiarIdFirestore(periodoCampo) === periodoSeguro) {
    puntos += 80;
  }

  if (docIdSeguro.includes(`_${periodoSeguro}`)) {
    puntos += 60;
  }

  if (estudiante.Nombres) {
    puntos += 10;
  }

  if (estudiante.NombreCarrera) {
    puntos += 10;
  }

  if (estudiante.Sede) {
    puntos += 5;
  }

  if (estudiante.ultimaSincronizacion) {
    puntos += 3;
  }

  return puntos;
}

async function cargarIncorporacionesPeriodoStats(periodoId) {
  const mapa = {};
  const snapshot = await db.collection(APP_COLLECTIONS.incorporaciones).get();
  const periodoSeguro = limpiarIdFirestore(periodoId);

  snapshot.forEach(function (doc) {
    const data = {
      id: doc.id,
      docId: doc.id,
      ...doc.data()
    };

    const periodoDatoSeguro = limpiarIdFirestore(data.periodoId || "");
    const docIdSeguro = limpiarIdFirestore(doc.id);

    const pertenece =
      periodoDatoSeguro === periodoSeguro ||
      docIdSeguro.includes(`_${periodoSeguro}_`) ||
      docIdSeguro.includes(`_${periodoSeguro}`);

    if (!pertenece) {
      return;
    }

    const cedula = limpiarCedula(data.cedula || data.numeroIdentificacion || "");

    if (!cedula) {
      return;
    }

    const actual = mapa[cedula];

    if (!actual || obtenerFechaComparacionStats(data) > obtenerFechaComparacionStats(actual)) {
      mapa[cedula] = data;
    }
  });

  return mapa;
}

function obtenerFechaComparacionStats(item) {
  return String(
    item.ultimaActualizacion ||
    item.fechaActualizacion ||
    item.fechaRegistro ||
    item.createdAt ||
    ""
  );
}

function obtenerCedulaStats(estudiante) {
  if (typeof obtenerCedulaEstudiante === "function") {
    return limpiarCedula(obtenerCedulaEstudiante(estudiante));
  }

  return limpiarCedula(
    estudiante.numeroIdentificacion ||
    estudiante.cedula ||
    estudiante.Cedula ||
    estudiante.id ||
    ""
  );
}

function obtenerCarreraStats(estudiante) {
  return textoVisibleStats(estudiante.NombreCarrera || estudiante.carrera || estudiante.Carrera, "Sin carrera");
}

function obtenerSedeInstitucionalStats(estudiante) {
  return textoVisibleStats(
    estudiante.Sede ||
    estudiante.sede ||
    estudiante.SedeInstitucional ||
    estudiante.sedeInstitucional,
    "Sin sede institucional"
  );
}

function obtenerModalidadStats(estudiante) {
  const modalidadCampo = normalizarTexto(estudiante.modalidadDetectada || estudiante.Modalidad || estudiante.modalidad || "");
  const carrera = normalizarTexto(obtenerCarreraStats(estudiante));

  if (
    modalidadCampo.includes("ONLINE") ||
    modalidadCampo.includes("VIRTUAL") ||
    modalidadCampo.includes("EN LINEA") ||
    carrera.includes("ONLINE") ||
    carrera.includes("VIRTUAL") ||
    carrera.includes("EN LINEA")
  ) {
    return "ONLINE";
  }

  return "NO ONLINE";
}

function obtenerSedeIncorporacionStats(estudiante, incorporacion) {
  const sede = normalizarTexto(
    incorporacion?.incorporacion ||
    incorporacion?.sedeIncorporacion ||
    incorporacion?.sede ||
    estudiante.incorporacion ||
    estudiante.sedeIncorporacion ||
    ""
  );

  if (sede === "QUITO") {
    return "QUITO";
  }

  if (sede === "MANTA") {
    return "MANTA";
  }

  return "SIN SEDE";
}

function consolidarEstudiantesStats(estudiantes, mapaIncorporaciones) {
  return estudiantes.map(function (estudiante) {
    const cedula = obtenerCedulaStats(estudiante);
    const incorporacion = mapaIncorporaciones[cedula] || null;
    const sedeIncorporacion = obtenerSedeIncorporacionStats(estudiante, incorporacion);
    const respondio = sedeIncorporacion === "QUITO" || sedeIncorporacion === "MANTA";

    return {
      cedula: cedula,
      nombres: textoVisibleStats(estudiante.Nombres || estudiante.nombres || estudiante.NombreCompleto, "Sin nombres"),
      carrera: obtenerCarreraStats(estudiante),
      modalidad: obtenerModalidadStats(estudiante),
      sedeInstitucional: obtenerSedeInstitucionalStats(estudiante),
      sedeIncorporacion: sedeIncorporacion,
      respondio: respondio,
      periodoId: estudiante.periodoId || statsEls.periodoSelect.value,
      docId: estudiante.docId || estudiante.id || "",
      fechaRegistro: incorporacion?.fechaRegistro || "",
      ultimaActualizacion: incorporacion?.ultimaActualizacion || incorporacion?.fechaActualizacion || ""
    };
  });
}

async function cargarEstadisticasPeriodo() {
  const periodoId = statsEls.periodoSelect.value;

  if (!periodoId) {
    mostrarMensajeStats(statsEls.message, "Debe seleccionar un período.", "error");
    return;
  }

  try {
    mostrarMensajeStats(statsEls.message, "Cargando estudiantes e incorporaciones...", "info");

    const estudiantes = await cargarEstudiantesConsolidadosStats(periodoId);
    const incorporaciones = await cargarIncorporacionesPeriodoStats(periodoId);

    statsEstudiantesBase = consolidarEstudiantesStats(estudiantes, incorporaciones);

    actualizarOpcionesFiltrosStats();
    aplicarFiltrosStats();

    mostrarMensajeStats(
      statsEls.message,
      `Estadísticas cargadas correctamente. Registros consolidados: ${statsEstudiantesBase.length}.`,
      "ok"
    );

    if (!statsRestaurandoMemoria) {
      guardarMemoriaStats();
    }
  } catch (error) {
    mostrarMensajeStats(statsEls.message, error.message, "error");
  }
}

function actualizarOpcionesFiltrosStats() {
  llenarSelectStats(statsEls.filtroCarrera, obtenerValoresUnicosStats(statsEstudiantesBase, "carrera"), "Todas", "TODAS");
  llenarSelectStats(statsEls.filtroSedeInstitucional, obtenerValoresUnicosStats(statsEstudiantesBase, "sedeInstitucional"), "Todas", "TODAS");

  if (statsMemoriaPendiente) {
    aplicarValorSelectStats(statsEls.filtroCarrera, statsMemoriaPendiente.filtroCarrera);
    aplicarValorSelectStats(statsEls.filtroSedeInstitucional, statsMemoriaPendiente.filtroSedeInstitucional);
  }
}

function obtenerValoresUnicosStats(lista, campo) {
  const valores = new Set();

  lista.forEach(function (item) {
    if (item[campo]) {
      valores.add(item[campo]);
    }
  });

  return Array.from(valores).sort(function (a, b) {
    return a.localeCompare(b, "es");
  });
}

function llenarSelectStats(select, valores, textoTodos, valorTodos) {
  const valorAnterior = select.value;

  select.innerHTML = "";

  const opcionTodos = document.createElement("option");
  opcionTodos.value = valorTodos;
  opcionTodos.textContent = textoTodos;
  select.appendChild(opcionTodos);

  valores.forEach(function (valor) {
    const option = document.createElement("option");
    option.value = valor;
    option.textContent = valor;
    select.appendChild(option);
  });

  const existeAnterior = Array.from(select.options).some(function (option) {
    return option.value === valorAnterior;
  });

  select.value = existeAnterior ? valorAnterior : valorTodos;
}

function aplicarFiltrosStats() {
  const carrera = statsEls.filtroCarrera.value;
  const modalidad = statsEls.filtroModalidad.value;
  const sedeInstitucional = statsEls.filtroSedeInstitucional.value;
  const sedeIncorporacion = statsEls.filtroSedeIncorporacion.value;
  const respuesta = statsEls.filtroRespuesta.value;

  statsEstudiantesFiltrados = statsEstudiantesBase.filter(function (item) {
    if (carrera !== "TODAS" && item.carrera !== carrera) {
      return false;
    }

    if (modalidad === "ONLINE" && item.modalidad !== "ONLINE") {
      return false;
    }

    if (modalidad === "NO_ONLINE" && item.modalidad !== "NO ONLINE") {
      return false;
    }

    if (sedeInstitucional !== "TODAS" && item.sedeInstitucional !== sedeInstitucional) {
      return false;
    }

    if (sedeIncorporacion !== "TODAS" && item.sedeIncorporacion !== sedeIncorporacion) {
      return false;
    }

    if (respuesta === "RESPONDIERON" && !item.respondio) {
      return false;
    }

    if (respuesta === "NO_RESPONDIERON" && item.respondio) {
      return false;
    }

    return true;
  });

  renderizarDashboardStats();

  if (!statsRestaurandoMemoria) {
    guardarMemoriaStats();
  }
}

function crearResumenStats(lista) {
  const total = lista.length;
  const quito = lista.filter(function (item) { return item.sedeIncorporacion === "QUITO"; }).length;
  const manta = lista.filter(function (item) { return item.sedeIncorporacion === "MANTA"; }).length;
  const sinSede = lista.filter(function (item) { return item.sedeIncorporacion === "SIN SEDE"; }).length;
  const respondieron = quito + manta;
  const noRespondieron = sinSede;

  return {
    total: total,
    respondieron: respondieron,
    noRespondieron: noRespondieron,
    quito: quito,
    manta: manta,
    sinSede: sinSede
  };
}

function renderizarDashboardStats() {
  const resumen = crearResumenStats(statsEstudiantesFiltrados);

  renderizarTarjetasStats(resumen);
  renderizarTablasStats();
  renderizarListadoDetalleStats();
}

function renderizarTarjetasStats(resumen) {
  statsEls.statTotal.textContent = resumen.total;
  statsEls.statRespondieron.textContent = resumen.respondieron;
  statsEls.statNoRespondieron.textContent = resumen.noRespondieron;
  statsEls.statQuito.textContent = resumen.quito;
  statsEls.statManta.textContent = resumen.manta;
  statsEls.statSinSede.textContent = resumen.sinSede;

  statsEls.statRespondieronPct.textContent = porcentajeStats(resumen.respondieron, resumen.total);
  statsEls.statNoRespondieronPct.textContent = porcentajeStats(resumen.noRespondieron, resumen.total);
  statsEls.statQuitoPct.textContent = porcentajeStats(resumen.quito, resumen.respondieron);
  statsEls.statMantaPct.textContent = porcentajeStats(resumen.manta, resumen.respondieron);
  statsEls.statSinSedePct.textContent = porcentajeStats(resumen.sinSede, resumen.total);
}

function agruparStats(lista, campo) {
  const mapa = {};

  lista.forEach(function (item) {
    const clave = item[campo] || "Sin dato";

    if (!mapa[clave]) {
      mapa[clave] = {
        nombre: clave,
        total: 0,
        respondieron: 0,
        noRespondieron: 0,
        quito: 0,
        manta: 0,
        sinSede: 0
      };
    }

    mapa[clave].total += 1;

    if (item.sedeIncorporacion === "QUITO") {
      mapa[clave].quito += 1;
      mapa[clave].respondieron += 1;
    } else if (item.sedeIncorporacion === "MANTA") {
      mapa[clave].manta += 1;
      mapa[clave].respondieron += 1;
    } else {
      mapa[clave].sinSede += 1;
      mapa[clave].noRespondieron += 1;
    }
  });

  return Object.values(mapa).sort(function (a, b) {
    return b.total - a.total || a.nombre.localeCompare(b.nombre, "es");
  });
}

function renderizarTablasStats() {
  const porCarrera = agruparStats(statsEstudiantesFiltrados, "carrera");
  const porModalidad = agruparStats(statsEstudiantesFiltrados, "modalidad");
  const porSedeInstitucional = agruparStats(statsEstudiantesFiltrados, "sedeInstitucional");

  renderizarTablaAgrupadaStats(statsEls.tablaCarrera, porCarrera);
  renderizarTablaAgrupadaStats(statsEls.tablaModalidad, porModalidad);
  renderizarTablaAgrupadaStats(statsEls.tablaSedeInstitucional, porSedeInstitucional);

  renderizarTablaCruceStats(statsEls.tablaCruceCarreraSede, porCarrera);
  renderizarTablaCruceStats(statsEls.tablaCruceModalidadSede, porModalidad);
  renderizarTablaCruceStats(statsEls.tablaCruceSedeInstitucional, porSedeInstitucional);

  renderizarRankingPendientesStats(porCarrera);

  statsTablasActuales = construirPaqueteExportacionStats();
}

function renderizarTablaAgrupadaStats(tbody, filas) {
  if (!filas || filas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="estadisticas-empty">Sin datos para mostrar.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filas.map(function (fila) {
    return `
      <tr>
        <td>${escaparHTMLStats(fila.nombre)}</td>
        <td class="estadisticas-numero">${fila.total}</td>
        <td class="estadisticas-numero">${fila.respondieron}</td>
        <td class="estadisticas-numero">${fila.noRespondieron}</td>
        <td class="estadisticas-numero">${fila.quito}</td>
        <td class="estadisticas-numero">${fila.manta}</td>
        <td class="estadisticas-numero">${fila.sinSede}</td>
        <td class="estadisticas-porcentaje">${porcentajeStats(fila.respondieron, fila.total)}</td>
      </tr>
    `;
  }).join("");
}

function renderizarTablaCruceStats(tbody, filas) {
  if (!filas || filas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="estadisticas-empty">Sin datos para mostrar.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filas.map(function (fila) {
    return `
      <tr>
        <td>${escaparHTMLStats(fila.nombre)}</td>
        <td class="estadisticas-numero">${fila.quito}</td>
        <td class="estadisticas-numero">${fila.manta}</td>
        <td class="estadisticas-numero">${fila.sinSede}</td>
        <td class="estadisticas-numero">${fila.total}</td>
      </tr>
    `;
  }).join("");
}

function renderizarRankingPendientesStats(filasCarrera) {
  const ranking = filasCarrera
    .filter(function (fila) {
      return fila.noRespondieron > 0;
    })
    .sort(function (a, b) {
      return b.noRespondieron - a.noRespondieron || b.total - a.total;
    });

  if (ranking.length === 0) {
    statsEls.tablaRankingPendientes.innerHTML = `
      <tr>
        <td colspan="5" class="estadisticas-empty">No existen pendientes por responder.</td>
      </tr>
    `;
    return;
  }

  statsEls.tablaRankingPendientes.innerHTML = ranking.map(function (fila, index) {
    return `
      <tr>
        <td class="estadisticas-numero">${index + 1}</td>
        <td>${escaparHTMLStats(fila.nombre)}</td>
        <td class="estadisticas-numero">${fila.noRespondieron}</td>
        <td class="estadisticas-numero">${fila.total}</td>
        <td class="estadisticas-porcentaje">${porcentajeStats(fila.noRespondieron, fila.total)}</td>
      </tr>
    `;
  }).join("");
}

function renderizarListadoDetalleStats() {
  const tipo = statsEls.tipoListado.value;

  let listado = [];

  if (tipo === "PENDIENTES") {
    listado = statsEstudiantesFiltrados.filter(function (item) {
      return item.sedeIncorporacion === "SIN SEDE";
    });
  }

  if (tipo === "QUITO") {
    listado = statsEstudiantesFiltrados.filter(function (item) {
      return item.sedeIncorporacion === "QUITO";
    });
  }

  if (tipo === "MANTA") {
    listado = statsEstudiantesFiltrados.filter(function (item) {
      return item.sedeIncorporacion === "MANTA";
    });
  }

  listado.sort(function (a, b) {
    return a.carrera.localeCompare(b.carrera, "es") || a.nombres.localeCompare(b.nombres, "es");
  });

  if (listado.length === 0) {
    statsEls.tablaListadoDetalle.innerHTML = `
      <tr>
        <td colspan="6" class="estadisticas-empty">Sin datos para mostrar.</td>
      </tr>
    `;

    if (!statsRestaurandoMemoria) {
      guardarMemoriaStats();
    }

    return;
  }

  statsEls.tablaListadoDetalle.innerHTML = listado.map(function (item) {
    return `
      <tr>
        <td>${escaparHTMLStats(item.cedula)}</td>
        <td>${escaparHTMLStats(item.nombres)}</td>
        <td>${escaparHTMLStats(item.carrera)}</td>
        <td>${escaparHTMLStats(item.modalidad)}</td>
        <td>${escaparHTMLStats(item.sedeInstitucional)}</td>
        <td>${escaparHTMLStats(item.sedeIncorporacion)}</td>
      </tr>
    `;
  }).join("");

  if (!statsRestaurandoMemoria) {
    guardarMemoriaStats();
  }
}

function convertirAgrupadosParaExportarStats(filas, nombreColumna) {
  return filas.map(function (fila) {
    return {
      [nombreColumna]: fila.nombre,
      Total: fila.total,
      Respondieron: fila.respondieron,
      NoRespondieron: fila.noRespondieron,
      Quito: fila.quito,
      Manta: fila.manta,
      SinSede: fila.sinSede,
      PorcentajeRespuesta: porcentajeStats(fila.respondieron, fila.total)
    };
  });
}

function convertirCruceParaExportarStats(filas, nombreColumna) {
  return filas.map(function (fila) {
    return {
      [nombreColumna]: fila.nombre,
      Quito: fila.quito,
      Manta: fila.manta,
      SinSede: fila.sinSede,
      Total: fila.total
    };
  });
}

function convertirListadoParaExportarStats(lista) {
  return lista.map(function (item) {
    return {
      Cedula: item.cedula,
      Nombres: item.nombres,
      Carrera: item.carrera,
      Modalidad: item.modalidad,
      SedeInstitucional: item.sedeInstitucional,
      SedeIncorporacion: item.sedeIncorporacion,
      Respondio: item.respondio ? "SI" : "NO",
      Periodo: item.periodoId
    };
  });
}

function construirPaqueteExportacionStats() {
  const resumen = crearResumenStats(statsEstudiantesFiltrados);
  const porCarrera = agruparStats(statsEstudiantesFiltrados, "carrera");
  const porModalidad = agruparStats(statsEstudiantesFiltrados, "modalidad");
  const porSedeInstitucional = agruparStats(statsEstudiantesFiltrados, "sedeInstitucional");

  const pendientes = statsEstudiantesFiltrados.filter(function (item) {
    return item.sedeIncorporacion === "SIN SEDE";
  });

  const quito = statsEstudiantesFiltrados.filter(function (item) {
    return item.sedeIncorporacion === "QUITO";
  });

  const manta = statsEstudiantesFiltrados.filter(function (item) {
    return item.sedeIncorporacion === "MANTA";
  });

  const rankingPendientes = porCarrera
    .filter(function (fila) {
      return fila.noRespondieron > 0;
    })
    .sort(function (a, b) {
      return b.noRespondieron - a.noRespondieron;
    })
    .map(function (fila, index) {
      return {
        Puesto: index + 1,
        Carrera: fila.nombre,
        NoRespondieron: fila.noRespondieron,
        Total: fila.total,
        PorcentajePendiente: porcentajeStats(fila.noRespondieron, fila.total)
      };
    });

  return {
    nombreArchivo: `estadisticas_incorporaciones_${statsEls.periodoSelect.value || "sin_periodo"}`,
    resumen: [{
      Periodo: statsEls.periodoSelect.value || "",
      TotalEstudiantes: resumen.total,
      Respondieron: resumen.respondieron,
      NoRespondieron: resumen.noRespondieron,
      Quito: resumen.quito,
      Manta: resumen.manta,
      SinSede: resumen.sinSede,
      PorcentajeRespuesta: porcentajeStats(resumen.respondieron, resumen.total)
    }],
    porCarrera: convertirAgrupadosParaExportarStats(porCarrera, "Carrera"),
    porModalidad: convertirAgrupadosParaExportarStats(porModalidad, "Modalidad"),
    porSedeInstitucional: convertirAgrupadosParaExportarStats(porSedeInstitucional, "SedeInstitucional"),
    cruceCarreraSede: convertirCruceParaExportarStats(porCarrera, "Carrera"),
    cruceModalidadSede: convertirCruceParaExportarStats(porModalidad, "Modalidad"),
    cruceSedeInstitucional: convertirCruceParaExportarStats(porSedeInstitucional, "SedeInstitucional"),
    rankingPendientes: rankingPendientes,
    pendientes: convertirListadoParaExportarStats(pendientes),
    quito: convertirListadoParaExportarStats(quito),
    manta: convertirListadoParaExportarStats(manta),
    baseConsolidada: convertirListadoParaExportarStats(statsEstudiantesFiltrados)
  };
}

function validarDatosParaExportarStats() {
  if (!statsEstudiantesFiltrados || statsEstudiantesFiltrados.length === 0) {
    mostrarMensajeStats(statsEls.exportMessage, "No existen datos para exportar.", "error");
    return false;
  }

  return true;
}

function exportarResumenStats() {
  if (!validarDatosParaExportarStats()) {
    return;
  }

  try {
    const paquete = construirPaqueteExportacionStats();
    const nombre = exportarHojaEstadisticas(paquete.nombreArchivo + "_resumen", "Resumen", paquete.resumen);
    mostrarMensajeStats(statsEls.exportMessage, `Resumen exportado: ${nombre}`, "ok");
    guardarMemoriaStats();
  } catch (error) {
    mostrarMensajeStats(statsEls.exportMessage, error.message, "error");
  }
}

function exportarCarreraStats() {
  if (!validarDatosParaExportarStats()) {
    return;
  }

  try {
    const paquete = construirPaqueteExportacionStats();
    const nombre = exportarHojaEstadisticas(paquete.nombreArchivo + "_por_carrera", "PorCarrera", paquete.porCarrera);
    mostrarMensajeStats(statsEls.exportMessage, `Reporte por carrera exportado: ${nombre}`, "ok");
    guardarMemoriaStats();
  } catch (error) {
    mostrarMensajeStats(statsEls.exportMessage, error.message, "error");
  }
}

function exportarPendientesStats() {
  if (!validarDatosParaExportarStats()) {
    return;
  }

  try {
    const paquete = construirPaqueteExportacionStats();
    const nombre = exportarHojaEstadisticas(paquete.nombreArchivo + "_pendientes", "Pendientes", paquete.pendientes);
    mostrarMensajeStats(statsEls.exportMessage, `Pendientes exportados: ${nombre}`, "ok");
    guardarMemoriaStats();
  } catch (error) {
    mostrarMensajeStats(statsEls.exportMessage, error.message, "error");
  }
}

function exportarQuitoStats() {
  if (!validarDatosParaExportarStats()) {
    return;
  }

  try {
    const paquete = construirPaqueteExportacionStats();
    const nombre = exportarHojaEstadisticas(paquete.nombreArchivo + "_quito", "Quito", paquete.quito);
    mostrarMensajeStats(statsEls.exportMessage, `Listado Quito exportado: ${nombre}`, "ok");
    guardarMemoriaStats();
  } catch (error) {
    mostrarMensajeStats(statsEls.exportMessage, error.message, "error");
  }
}

function exportarMantaStats() {
  if (!validarDatosParaExportarStats()) {
    return;
  }

  try {
    const paquete = construirPaqueteExportacionStats();
    const nombre = exportarHojaEstadisticas(paquete.nombreArchivo + "_manta", "Manta", paquete.manta);
    mostrarMensajeStats(statsEls.exportMessage, `Listado Manta exportado: ${nombre}`, "ok");
    guardarMemoriaStats();
  } catch (error) {
    mostrarMensajeStats(statsEls.exportMessage, error.message, "error");
  }
}

function exportarTodoStats() {
  if (!validarDatosParaExportarStats()) {
    return;
  }

  try {
    const paquete = construirPaqueteExportacionStats();
    const nombre = exportarTodoEstadisticas(paquete);
    mostrarMensajeStats(statsEls.exportMessage, `Archivo completo exportado: ${nombre}`, "ok");
    guardarMemoriaStats();
  } catch (error) {
    mostrarMensajeStats(statsEls.exportMessage, error.message, "error");
  }
}