/*
Nombre completo: admin.js
Ruta o ubicación: /incorporaciones-app/js/admin.js

Función o funciones:
1. Controlar el acceso del administrador con la clave configurada en firebase-config.js.
2. Cargar períodos desde Firebase.
3. Cargar automáticamente los estudiantes al seleccionar un período.
4. Leer Excel solo después de seleccionar un período.
5. Guardar estudiantes en Firebase anexados al período seleccionado.
6. Consultar respuestas desde la colección incorporaciones.
7. Combinar estudiantes + incorporación para mostrar en tabla.
8. Calcular estadísticas rápidas de respuesta: habilitados, respondieron, no respondieron, Quito, Manta, No iré y sin sede.
9. Aplicar filtros de búsqueda, estado y sede.
10. Permitir que solo el administrador cambie la respuesta desde el selector de incorporación.
11. Exportar Excel.
12. Crear, descargar y borrar respaldo JSON local.
13. Conectarse con admin-table-tools.js para buscador predictivo, selector de estudiantes y ordenamiento por encabezados.
14. Guardar memoria de período, filtros, búsqueda y posición al cambiar entre pantallas.
*/

let estudiantesCargados = [];
let estudiantesDesdeExcel = [];
let mapaIncorporacionesActual = {};
let periodoSeleccionadoActual = "";
let ultimoPaqueteJson = null;
let restaurandoMemoriaAdmin = false;

const ADMIN_MEMORIA_KEY = "incorporaciones_admin_memoria_v1";

const loginAdminBox = document.getElementById("loginAdminBox");
const adminPanel = document.getElementById("adminPanel");
const adminPassword = document.getElementById("adminPassword");
const btnLoginAdmin = document.getElementById("btnLoginAdmin");
const loginAdminMessage = document.getElementById("loginAdminMessage");

const periodoSelect = document.getElementById("periodoSelect");
const btnCargarPeriodo = document.getElementById("btnCargarPeriodo");
const btnRefrescar = document.getElementById("btnRefrescar");
const periodoMessage = document.getElementById("periodoMessage");

const excelInput = document.getElementById("excelInput");
const btnLeerExcel = document.getElementById("btnLeerExcel");
const btnGuardarExcelFirebase = document.getElementById("btnGuardarExcelFirebase");
const excelMessage = document.getElementById("excelMessage");

const busquedaInput = document.getElementById("busquedaInput");
const filtroEstado = document.getElementById("filtroEstado");
const filtroSede = document.getElementById("filtroSede");

const tablaEstudiantesBody = document.getElementById("tablaEstudiantesBody");
const tablaMessage = document.getElementById("tablaMessage");

const btnExportarExcel = document.getElementById("btnExportarExcel");
const btnCrearRespaldoLocal = document.getElementById("btnCrearRespaldoLocal");
const btnDescargarJson = document.getElementById("btnDescargarJson");
const btnBorrarRespaldoLocal = document.getElementById("btnBorrarRespaldoLocal");

const statTotal = document.getElementById("statTotal");
const statRespondieron = document.getElementById("statRespondieron");
const statNoRespondieron = document.getElementById("statNoRespondieron");
const statQuito = document.getElementById("statQuito");
const statManta = document.getElementById("statManta");
const statNoIre = document.getElementById("statNoIre");
const statSinSede = document.getElementById("statSinSede");

document.addEventListener("DOMContentLoaded", async function () {
  if (typeof limpiarBackupDiarioSiCambioElDia === "function") {
    limpiarBackupDiarioSiCambioElDia();
  }

  configurarEventosAdmin();
  configurarHerramientasTablaAdmin();
  configurarMemoriaAdmin();

  loginAdminBox.classList.add("hidden");
  adminPanel.classList.remove("hidden");

  await cargarPeriodos();
  await restaurarMemoriaAdmin();
});

function configurarEventosAdmin() {
  btnLoginAdmin.addEventListener("click", iniciarSesionAdmin);

  adminPassword.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      iniciarSesionAdmin();
    }
  });

  periodoSelect.addEventListener("change", async function () {
    periodoSeleccionadoActual = periodoSelect.value;
    estudiantesDesdeExcel = [];
    btnGuardarExcelFirebase.disabled = true;
    mostrarMensaje(excelMessage, "", "");

    guardarMemoriaAdmin();

    if (periodoSeleccionadoActual) {
      await cargarEstudiantesPeriodoSeleccionado();
    } else {
      limpiarTablaEstudiantes("Seleccione un período para cargar la información.");
    }
  });

  btnCargarPeriodo.addEventListener("click", async function () {
    guardarMemoriaAdmin();
    await cargarEstudiantesPeriodoSeleccionado();
  });

  btnRefrescar.addEventListener("click", async function () {
    guardarMemoriaAdmin();
    await cargarEstudiantesPeriodoSeleccionado();
  });

  btnLeerExcel.addEventListener("click", leerExcelSeleccionado);
  btnGuardarExcelFirebase.addEventListener("click", guardarExcelEnFirebase);

  filtroEstado.addEventListener("change", function () {
    guardarMemoriaAdmin();
    renderizarTabla();
  });

  filtroSede.addEventListener("change", function () {
    guardarMemoriaAdmin();
    renderizarTabla();
  });

  if (busquedaInput) {
    busquedaInput.addEventListener("input", function () {
      guardarMemoriaAdmin();
    });
  }

  btnExportarExcel.addEventListener("click", exportarExcelAdmin);
  btnCrearRespaldoLocal.addEventListener("click", crearRespaldoJsonAdmin);

  if (btnDescargarJson) {
    btnDescargarJson.addEventListener("click", descargarJsonAdmin);
  }

  btnBorrarRespaldoLocal.addEventListener("click", borrarRespaldoLocalAdmin);
}

function configurarHerramientasTablaAdmin() {
  if (!window.AdminTableTools) {
    if (busquedaInput) {
      busquedaInput.addEventListener("input", renderizarTabla);
    }
    return;
  }

  AdminTableTools.inicializar({
    tablaSelector: "#tablaEstudiantesAdmin",
    busquedaPrincipalId: "busquedaInput",
    busquedaListadoId: "busquedaTablaInput",
    datalistId: "busquedaEstudiantesList",
    selectorEstudianteId: "selectorEstudianteTabla",
    botonLimpiarBusquedaId: "btnLimpiarBusquedaTabla",
    renderizar: function () {
      guardarMemoriaAdmin();
      renderizarTabla();
    },
    obtenerCedula: obtenerCedulaEstudiante,
    obtenerNombres: function (estudiante) {
      return estudiante.Nombres || "";
    },
    obtenerCarrera: function (estudiante) {
      return estudiante.NombreCarrera || "";
    },
    obtenerPeriodo: function (estudiante) {
      return estudiante.periodoId || "";
    },
    obtenerValorOrden: obtenerValorOrdenAdmin
  });
}

function configurarMemoriaAdmin() {
  window.addEventListener("beforeunload", guardarMemoriaAdmin);

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      guardarMemoriaAdmin();
    }
  });

  window.addEventListener("pagehide", guardarMemoriaAdmin);

  window.addEventListener("scroll", function () {
    guardarMemoriaAdmin();
  }, { passive: true });
}

function leerMemoriaAdmin() {
  try {
    const texto = sessionStorage.getItem(ADMIN_MEMORIA_KEY);

    if (!texto) {
      return null;
    }

    return JSON.parse(texto);
  } catch (error) {
    return null;
  }
}

function guardarMemoriaAdmin() {
  try {
    const busquedaListadoInput = document.getElementById("busquedaTablaInput");
    const selectorEstudianteTabla = document.getElementById("selectorEstudianteTabla");
    const tableWrapper = document.querySelector("#panelListadoEstudiantes .table-wrapper");

    const memoria = {
      periodoId: periodoSelect ? periodoSelect.value : "",
      filtroEstado: filtroEstado ? filtroEstado.value : "TODOS",
      filtroSede: filtroSede ? filtroSede.value : "TODAS",
      busquedaPrincipal: busquedaInput ? busquedaInput.value : "",
      busquedaListado: busquedaListadoInput ? busquedaListadoInput.value : "",
      selectorEstudiante: selectorEstudianteTabla ? selectorEstudianteTabla.value : "",
      scrollY: window.scrollY || 0,
      tablaScrollLeft: tableWrapper ? tableWrapper.scrollLeft : 0,
      tablaScrollTop: tableWrapper ? tableWrapper.scrollTop : 0,
      fechaGuardado: new Date().toISOString()
    };

    sessionStorage.setItem(ADMIN_MEMORIA_KEY, JSON.stringify(memoria));
  } catch (error) {
    console.warn("No se pudo guardar la memoria del administrador:", error);
  }
}

async function restaurarMemoriaAdmin() {
  const memoria = leerMemoriaAdmin();

  if (!memoria) {
    return;
  }

  restaurandoMemoriaAdmin = true;

  if (filtroEstado && memoria.filtroEstado) {
    filtroEstado.value = memoria.filtroEstado;
  }

  if (filtroSede && memoria.filtroSede) {
    filtroSede.value = memoria.filtroSede;
  }

  if (busquedaInput && memoria.busquedaPrincipal) {
    busquedaInput.value = memoria.busquedaPrincipal;
  }

  const busquedaListadoInput = document.getElementById("busquedaTablaInput");

  if (busquedaListadoInput && memoria.busquedaListado) {
    busquedaListadoInput.value = memoria.busquedaListado;
  }

  if (periodoSelect && memoria.periodoId) {
    const existePeriodo = Array.from(periodoSelect.options).some(function (option) {
      return option.value === memoria.periodoId;
    });

    if (existePeriodo) {
      periodoSelect.value = memoria.periodoId;
      periodoSeleccionadoActual = memoria.periodoId;
      await cargarEstudiantesPeriodoSeleccionado();
    }
  }

  setTimeout(function () {
    const memoriaActual = leerMemoriaAdmin() || memoria;
    const tableWrapper = document.querySelector("#panelListadoEstudiantes .table-wrapper");
    const selectorEstudianteTabla = document.getElementById("selectorEstudianteTabla");

    if (selectorEstudianteTabla && memoriaActual.selectorEstudiante) {
      selectorEstudianteTabla.value = memoriaActual.selectorEstudiante;
    }

    if (tableWrapper) {
      tableWrapper.scrollLeft = Number(memoriaActual.tablaScrollLeft || 0);
      tableWrapper.scrollTop = Number(memoriaActual.tablaScrollTop || 0);
    }

    window.scrollTo(0, Number(memoriaActual.scrollY || 0));
    restaurandoMemoriaAdmin = false;
  }, 350);
}

function mostrarMensaje(elemento, texto, tipo) {
  if (!elemento) {
    return;
  }

  elemento.textContent = texto || "";
  elemento.className = "message";

  if (tipo) {
    elemento.classList.add(tipo);
  }
}

function escaparHTML(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizarIncorporacionAdmin(valor) {
  const textoBase = typeof normalizarTexto === "function"
    ? normalizarTexto(valor)
    : String(valor || "").trim().toUpperCase();

  const texto = textoBase
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (texto === "QUITO") {
    return "QUITO";
  }

  if (texto === "MANTA") {
    return "MANTA";
  }

  if (
    texto === "NO IRE" ||
    texto === "NO IRÉ" ||
    texto === "NOIRE" ||
    texto === "NO IRA" ||
    texto === "NO IRÁ" ||
    texto === "NO ASISTIRE" ||
    texto === "NO ASISTIRÉ" ||
    texto === "NO ASISTIRA" ||
    texto === "NO ASISTIRÁ"
  ) {
    return "NO IRE";
  }

  return "";
}

function textoIncorporacionVisibleAdmin(valor) {
  const sede = normalizarIncorporacionAdmin(valor);

  if (sede === "NO IRE") {
    return "NO IRÉ";
  }

  return sede || "SIN SEDE";
}

function iniciarSesionAdmin() {
  const clave = adminPassword.value.trim();

  if (clave !== APP_CONFIG.adminPassword) {
    mostrarMensaje(loginAdminMessage, "Clave incorrecta.", "error");
    return;
  }

  sessionStorage.setItem("adminSesionActiva", "true");

  loginAdminBox.classList.add("hidden");
  adminPanel.classList.remove("hidden");

  cargarPeriodos();
}

async function cargarPeriodos() {
  try {
    periodoSelect.innerHTML = `<option value="">Cargando períodos...</option>`;

    const periodos = await obtenerPeriodosFirebase();

    if (!periodos || periodos.length === 0) {
      periodoSelect.innerHTML = `<option value="">No existen períodos</option>`;
      return;
    }

    periodoSelect.innerHTML = `<option value="">Seleccione un período</option>`;

    periodos.forEach(function (periodo) {
      const option = document.createElement("option");
      option.value = periodo.id;
      option.textContent = periodo.activoConsulta
        ? `${periodo.label || periodo.id} - ACTIVO`
        : periodo.label || periodo.id;

      periodoSelect.appendChild(option);
    });
  } catch (error) {
    periodoSelect.innerHTML = `<option value="">Error al cargar períodos</option>`;
    mostrarMensaje(periodoMessage, error.message, "error");
  }
}

async function cargarEstudiantesPeriodoSeleccionado() {
  const periodoId = periodoSelect.value;

  if (!periodoId) {
    mostrarMensaje(periodoMessage, "Debe seleccionar un período.", "error");
    return;
  }

  try {
    periodoSeleccionadoActual = periodoId;

    mostrarMensaje(periodoMessage, "Cargando estudiantes e incorporaciones...", "info");

    const estudiantes = await obtenerEstudiantesPorPeriodo(periodoId);
    mapaIncorporacionesActual = await obtenerMapaIncorporacionesPorPeriodo(periodoId);

    estudiantesCargados = combinarEstudiantesConIncorporaciones(
      estudiantes,
      mapaIncorporacionesActual
    );

    actualizarPredictorBusquedaAdmin();

    mostrarMensaje(
      periodoMessage,
      `Se cargaron ${estudiantesCargados.length} estudiantes del período seleccionado.`,
      "ok"
    );

    actualizarEstadisticas();
    renderizarTabla();

    ultimoPaqueteJson = await crearRespaldoJsonDesdePeriodo(
      periodoId,
      estudiantesCargados,
      mapaIncorporacionesActual
    );

    guardarRespaldoJsonLocal(ultimoPaqueteJson);
    guardarMemoriaAdmin();
  } catch (error) {
    mostrarMensaje(periodoMessage, error.message, "error");
  }
}

function limpiarTablaEstudiantes(mensaje) {
  estudiantesCargados = [];
  mapaIncorporacionesActual = {};

  if (window.AdminTableTools) {
    AdminTableTools.limpiarBusqueda();
  }

  actualizarPredictorBusquedaAdmin();
  actualizarEstadisticas();

  tablaEstudiantesBody.innerHTML = `
    <tr>
      <td colspan="9" class="empty-cell">
        ${escaparHTML(mensaje || "No existen datos para mostrar.")}
      </td>
    </tr>
  `;

  mostrarMensaje(tablaMessage, "", "");
  guardarMemoriaAdmin();
}

async function leerExcelSeleccionado() {
  const periodoId = periodoSelect.value;
  const file = excelInput.files[0];

  if (!periodoId) {
    mostrarMensaje(
      excelMessage,
      "Primero debe seleccionar un período antes de leer el Excel.",
      "error"
    );
    return;
  }

  if (!file) {
    mostrarMensaje(excelMessage, "Debe seleccionar un archivo Excel.", "error");
    return;
  }

  try {
    mostrarMensaje(excelMessage, "Leyendo Excel...", "info");

    const resultado = await leerExcelComoEstudiantes(file);

    estudiantesDesdeExcel = resultado.estudiantes.map(function (estudiante) {
      return {
        ...estudiante,
        periodoId: periodoId
      };
    });

    btnGuardarExcelFirebase.disabled = estudiantesDesdeExcel.length === 0;

    mostrarMensaje(
      excelMessage,
      `Excel leído correctamente. Hoja: ${resultado.hoja}. Filas: ${resultado.totalFilas}. Estudiantes válidos: ${resultado.totalEstudiantesValidos}. Período asignado: ${periodoId}.`,
      "ok"
    );

    guardarMemoriaAdmin();
  } catch (error) {
    estudiantesDesdeExcel = [];
    btnGuardarExcelFirebase.disabled = true;
    mostrarMensaje(excelMessage, error.message, "error");
  }
}

async function guardarExcelEnFirebase() {
  const periodoId = periodoSelect.value;

  if (!periodoId) {
    mostrarMensaje(
      excelMessage,
      "Debe seleccionar un período antes de guardar el Excel.",
      "error"
    );
    return;
  }

  if (estudiantesDesdeExcel.length === 0) {
    mostrarMensaje(excelMessage, "No hay estudiantes leídos desde el Excel.", "error");
    return;
  }

  const confirmar = confirm(
    `Se guardarán o actualizarán ${estudiantesDesdeExcel.length} estudiantes en el período ${periodoId}.\n¿Desea continuar?`
  );

  if (!confirmar) {
    return;
  }

  try {
    mostrarMensaje(excelMessage, "Guardando estudiantes en Firebase...", "info");

    const resultado = await guardarEstudiantesFirebase(estudiantesDesdeExcel, periodoId);

    mostrarMensaje(
      excelMessage,
      `Proceso finalizado. Guardados o actualizados: ${resultado.guardados}. Omitidos: ${resultado.omitidos}.`,
      "ok"
    );

    await cargarEstudiantesPeriodoSeleccionado();
    guardarMemoriaAdmin();
  } catch (error) {
    mostrarMensaje(excelMessage, error.message, "error");
  }
}

function obtenerSedeIncorporacionAdmin(estudiante) {
  if (!estudiante) {
    return "";
  }

  if (estudiante.noIre === true || estudiante.noIreIncorporacion === true) {
    return "NO IRE";
  }

  return normalizarIncorporacionAdmin(
    estudiante.incorporacion || estudiante.sedeIncorporacion || ""
  );
}

function estudianteRespondioAdmin(estudiante) {
  const sede = obtenerSedeIncorporacionAdmin(estudiante);

  return (
    Boolean(sede) ||
    estudiante.respondioIncorporacion === true ||
    estudiante.noIre === true ||
    estudiante.noIreIncorporacion === true
  );
}

function obtenerTextoBusquedaAdmin() {
  if (window.AdminTableTools) {
    return AdminTableTools.obtenerBusqueda();
  }

  return busquedaInput ? busquedaInput.value : "";
}

function obtenerEstudiantesFiltrados() {
  const busqueda = normalizarTexto(obtenerTextoBusquedaAdmin());
  const estado = filtroEstado.value;
  const sede = filtroSede.value;

  return estudiantesCargados.filter(function (estudiante) {
    const habilitado = estudianteEstaHabilitado(estudiante);
    const respondio = estudianteRespondioAdmin(estudiante);
    const sedeActual = obtenerSedeIncorporacionAdmin(estudiante);

    const textoBusqueda = normalizarTexto(
      [
        obtenerCedulaEstudiante(estudiante),
        estudiante.id,
        estudiante.docId,
        estudiante.Nombres,
        estudiante.NombreCarrera,
        estudiante.periodoId
      ].join(" ")
    );

    if (busqueda && !textoBusqueda.includes(busqueda)) {
      return false;
    }

    if (estado === "RESPONDIO" && !respondio) {
      return false;
    }

    if (estado === "PENDIENTE" && respondio) {
      return false;
    }

    if (estado === "HABILITADO" && !habilitado) {
      return false;
    }

    if (estado === "NO_HABILITADO" && habilitado) {
      return false;
    }

    if (sede === "QUITO" && sedeActual !== "QUITO") {
      return false;
    }

    if (sede === "MANTA" && sedeActual !== "MANTA") {
      return false;
    }

    if (sede === "NO_IRE" && sedeActual !== "NO IRE") {
      return false;
    }

    if (sede === "SIN_SEDE" && sedeActual) {
      return false;
    }

    return true;
  });
}

function actualizarEstadisticas() {
  const habilitados = estudiantesCargados.filter(function (estudiante) {
    return estudianteEstaHabilitado(estudiante);
  }).length;

  const respondieron = estudiantesCargados.filter(function (estudiante) {
    return estudianteRespondioAdmin(estudiante);
  }).length;

  const noRespondieron = estudiantesCargados.filter(function (estudiante) {
    return !estudianteRespondioAdmin(estudiante);
  }).length;

  const quito = estudiantesCargados.filter(function (estudiante) {
    return obtenerSedeIncorporacionAdmin(estudiante) === "QUITO";
  }).length;

  const manta = estudiantesCargados.filter(function (estudiante) {
    return obtenerSedeIncorporacionAdmin(estudiante) === "MANTA";
  }).length;

  const noIre = estudiantesCargados.filter(function (estudiante) {
    return obtenerSedeIncorporacionAdmin(estudiante) === "NO IRE";
  }).length;

  const sinSede = estudiantesCargados.filter(function (estudiante) {
    return !obtenerSedeIncorporacionAdmin(estudiante);
  }).length;

  statTotal.textContent = habilitados;
  statRespondieron.textContent = respondieron;
  statNoRespondieron.textContent = noRespondieron;
  statQuito.textContent = quito;
  statManta.textContent = manta;

  if (statNoIre) {
    statNoIre.textContent = noIre;
  }

  statSinSede.textContent = sinSede;
}

function actualizarPredictorBusquedaAdmin() {
  if (window.AdminTableTools) {
    AdminTableTools.actualizarPredictor(estudiantesCargados);
  }
}

function obtenerValorOrdenAdmin(estudiante, campo) {
  if (campo === "cedula") {
    return obtenerCedulaEstudiante(estudiante);
  }

  if (campo === "nombres") {
    return estudiante.Nombres || "";
  }

  if (campo === "carrera") {
    return estudiante.NombreCarrera || "";
  }

  if (campo === "periodo") {
    return estudiante.periodoId || "";
  }

  if (campo === "habilitado") {
    return estudianteEstaHabilitado(estudiante) ? "1" : "0";
  }

  if (campo === "incorporacion") {
    return textoIncorporacionVisibleAdmin(obtenerSedeIncorporacionAdmin(estudiante));
  }

  if (campo === "respondio") {
    return estudianteRespondioAdmin(estudiante) ? "1" : "0";
  }

  if (campo === "fechaRegistro") {
    return estudiante.fechaRegistroIncorporacion || "";
  }

  if (campo === "ultimaActualizacion") {
    return estudiante.ultimaActualizacionIncorporacion || "";
  }

  return "";
}

function obtenerEstudiantesOrdenadosAdmin(estudiantes) {
  if (window.AdminTableTools) {
    return AdminTableTools.ordenar(estudiantes);
  }

  return estudiantes;
}

function renderizarTabla() {
  const estudiantes = obtenerEstudiantesOrdenadosAdmin(obtenerEstudiantesFiltrados());

  actualizarEstadisticas();

  if (window.AdminTableTools) {
    AdminTableTools.actualizarIndicadoresOrden();
  }

  if (estudiantes.length === 0) {
    tablaEstudiantesBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-cell">
          No existen estudiantes con los filtros seleccionados.
        </td>
      </tr>
    `;

    mostrarMensaje(tablaMessage, "", "");
    guardarMemoriaAdmin();
    return;
  }

  tablaEstudiantesBody.innerHTML = "";

  estudiantes.forEach(function (estudiante) {
    const cedula = obtenerCedulaEstudiante(estudiante);
    const habilitado = estudianteEstaHabilitado(estudiante);
    const respondio = estudianteRespondioAdmin(estudiante);
    const incorporacionNormalizada = obtenerSedeIncorporacionAdmin(estudiante);
    const fechaRegistro = estudiante.fechaRegistroIncorporacion || "";
    const ultimaActualizacion = estudiante.ultimaActualizacionIncorporacion || "";

    const tr = document.createElement("tr");
    tr.setAttribute("data-cedula", cedula);

    tr.innerHTML = `
      <td>${escaparHTML(cedula)}</td>
      <td>${escaparHTML(estudiante.Nombres || "")}</td>
      <td>${escaparHTML(estudiante.NombreCarrera || "")}</td>
      <td>${escaparHTML(estudiante.periodoId || "")}</td>
      <td>
        ${
          habilitado
            ? `<span class="badge badge-ok">SÍ</span>`
            : `<span class="badge badge-error">NO</span>`
        }
      </td>
      <td>
        <select
          class="incorporacionSelect"
          data-cedula="${escaparHTML(cedula)}"
          data-sede-actual="${escaparHTML(incorporacionNormalizada)}"
        >
          <option value="" ${!incorporacionNormalizada ? "selected" : ""} disabled>SIN SEDE</option>
          <option value="QUITO" ${incorporacionNormalizada === "QUITO" ? "selected" : ""}>QUITO</option>
          <option value="MANTA" ${incorporacionNormalizada === "MANTA" ? "selected" : ""}>MANTA</option>
          <option value="NO IRE" ${incorporacionNormalizada === "NO IRE" ? "selected" : ""}>NO IRÉ</option>
        </select>
      </td>
      <td>
        ${
          respondio
            ? `<span class="badge badge-ok">SÍ</span>`
            : `<span class="badge badge-error">NO</span>`
        }
      </td>
      <td>${escaparHTML(fechaRegistro)}</td>
      <td>${escaparHTML(ultimaActualizacion)}</td>
    `;

    tablaEstudiantesBody.appendChild(tr);
  });

  configurarSelectoresCambioSede();

  mostrarMensaje(
    tablaMessage,
    `Mostrando ${estudiantes.length} estudiante(s).`,
    "info"
  );

  if (!restaurandoMemoriaAdmin) {
    guardarMemoriaAdmin();
  }
}

function configurarSelectoresCambioSede() {
  document.querySelectorAll(".incorporacionSelect").forEach(function (selector) {
    selector.addEventListener("change", async function () {
      const cedula = selector.getAttribute("data-cedula");
      const sedeAnterior = selector.getAttribute("data-sede-actual") || "";
      const nuevaSede = selector.value;

      selector.disabled = true;

      const cambioAplicado = await cambiarSedeAdmin(cedula, nuevaSede);

      if (!cambioAplicado) {
        selector.value = sedeAnterior;
        selector.disabled = false;
      }
    });
  });
}

async function cambiarSedeAdmin(cedula, sedeSeleccionada) {
  const estudiante = estudiantesCargados.find(function (item) {
    return obtenerCedulaEstudiante(item) === limpiarCedula(cedula);
  });

  if (!estudiante) {
    mostrarMensaje(tablaMessage, "No se encontró el estudiante seleccionado.", "error");
    return false;
  }

  const sedeActual = estudiante.incorporacion || estudiante.sedeIncorporacion || "";
  const sedeActualNormalizada = obtenerSedeIncorporacionAdmin(estudiante);
  const sedeNormalizada = normalizarIncorporacionAdmin(sedeSeleccionada);
  const respuestasPermitidasAdmin = ["QUITO", "MANTA", "NO IRE"];

  if (!respuestasPermitidasAdmin.includes(sedeNormalizada)) {
    mostrarMensaje(
      tablaMessage,
      "Respuesta inválida. Solo se permite QUITO, MANTA o NO IRÉ.",
      "error"
    );
    return false;
  }

  if (sedeNormalizada === sedeActualNormalizada) {
    mostrarMensaje(tablaMessage, "La respuesta seleccionada ya está registrada.", "info");
    return false;
  }

  const motivo = prompt(
    "Escriba el motivo o evidencia del cambio:",
    "Corrección realizada por administrador"
  );

  if (!motivo) {
    mostrarMensaje(
      tablaMessage,
      "Cambio cancelado. Para cambiar la respuesta debe registrar un motivo.",
      "error"
    );
    return false;
  }

  const confirmar = confirm(
    `¿Confirma cambiar la incorporación de ${estudiante.Nombres || cedula} de ${textoIncorporacionVisibleAdmin(sedeActual || sedeActualNormalizada)} a ${textoIncorporacionVisibleAdmin(sedeNormalizada)}?`
  );

  if (!confirmar) {
    return false;
  }

  try {
    mostrarMensaje(tablaMessage, "Actualizando respuesta...", "info");

    await cambiarIncorporacionDesdeAdmin(estudiante, sedeNormalizada, motivo);

    mostrarMensaje(tablaMessage, "Respuesta de incorporación actualizada correctamente.", "ok");

    await cargarEstudiantesPeriodoSeleccionado();
    guardarMemoriaAdmin();

    return true;
  } catch (error) {
    mostrarMensaje(tablaMessage, error.message, "error");
    return false;
  }
}

function exportarExcelAdmin() {
  try {
    const estudiantes = obtenerEstudiantesOrdenadosAdmin(obtenerEstudiantesFiltrados());

    if (estudiantes.length === 0) {
      mostrarMensaje(tablaMessage, "No hay estudiantes para exportar.", "error");
      return;
    }

    exportarEstudiantesAExcel(estudiantes, "reporte_incorporaciones");

    mostrarMensaje(tablaMessage, "Excel exportado correctamente.", "ok");
    guardarMemoriaAdmin();
  } catch (error) {
    mostrarMensaje(tablaMessage, error.message, "error");
  }
}

async function crearRespaldoJsonAdmin() {
  const periodoId = periodoSelect.value;

  if (!periodoId) {
    mostrarMensaje(tablaMessage, "Debe seleccionar un período para crear respaldo.", "error");
    return;
  }

  try {
    ultimoPaqueteJson = await crearRespaldoJsonDesdePeriodo(
      periodoId,
      estudiantesCargados,
      mapaIncorporacionesActual
    );

    const resultado = guardarRespaldoJsonLocal(ultimoPaqueteJson);

    mostrarMensaje(
      tablaMessage,
      `Respaldo JSON creado. Fecha: ${resultado.fecha}. Estudiantes: ${resultado.totalEstudiantes}. Incorporaciones: ${resultado.totalIncorporaciones}.`,
      "ok"
    );

    guardarMemoriaAdmin();
  } catch (error) {
    mostrarMensaje(tablaMessage, error.message, "error");
  }
}

async function descargarJsonAdmin() {
  try {
    if (!ultimoPaqueteJson) {
      const respaldoLocal = leerRespaldoJsonLocal();

      if (respaldoLocal) {
        ultimoPaqueteJson = respaldoLocal;
      }
    }

    if (!ultimoPaqueteJson) {
      await crearRespaldoJsonAdmin();
    }

    if (!ultimoPaqueteJson) {
      mostrarMensaje(tablaMessage, "No existe respaldo JSON para descargar.", "error");
      return;
    }

    const nombre = descargarRespaldoJson(
      ultimoPaqueteJson,
      `respaldo_incorporaciones_${periodoSelect.value || "sin_periodo"}`
    );

    mostrarMensaje(tablaMessage, `JSON descargado correctamente: ${nombre}`, "ok");
    guardarMemoriaAdmin();
  } catch (error) {
    mostrarMensaje(tablaMessage, error.message, "error");
  }
}

function borrarRespaldoLocalAdmin() {
  const confirmar = confirm("¿Está seguro de borrar el respaldo local?");

  if (!confirmar) {
    return;
  }

  if (typeof borrarBackupAdmin === "function") {
    borrarBackupAdmin();
  }

  borrarRespaldoJsonLocal();
  ultimoPaqueteJson = null;

  mostrarMensaje(tablaMessage, "Respaldo local eliminado.", "ok");
  guardarMemoriaAdmin();
}