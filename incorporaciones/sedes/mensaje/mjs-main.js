/*
=========================================================
Nombre completo: mjs-main.js
Ruta o ubicación: /incorporaciones/sedes/mensaje/mjs-main.js
Función o funciones:
1. Controlar la pantalla Mensajes WhatsApp.
2. Cargar períodos en el selector.
3. Cargar estudiantes del período seleccionado.
4. Aplicar filtros por carrera, sede, estado y búsqueda.
5. Renderizar estadísticas y tabla.
6. Manejar buscador predictor.
7. Abrir WhatsApp y guardar estado Avisado.
8. Guardar memoria de período, filtros, búsqueda, orden y posición al cambiar entre pantallas.
=========================================================
*/

let mjsRegistrosBase = [];
let mjsRegistrosFiltrados = [];
let mjsPeriodoSeleccionado = "";
let mjsRestaurandoMemoria = false;
let mjsMemoriaPendiente = null;

const MJS_MEMORIA_KEY = "incorporaciones_mensajes_memoria_v1";
const MJS_ADMIN_MEMORIA_KEY = "incorporaciones_admin_memoria_v1";
const MJS_STATS_MEMORIA_KEY = "incorporaciones_stats_memoria_v1";

let mjsOrdenTabla = {
  campo: "",
  direccion: "asc"
};

const mjsEls = {};

document.addEventListener("DOMContentLoaded", async function () {
  mjsCapturarElementos();
  mjsConfigurarEventos();
  mjsConfigurarMemoria();
  await mjsCargarPeriodosIniciales();
  await mjsRestaurarMemoria();
});

function mjsCapturarElementos() {
  mjsEls.periodoSelect = document.getElementById("mjsPeriodoSelect");
  mjsEls.carreraSelect = document.getElementById("mjsCarreraSelect");
  mjsEls.sedeSelect = document.getElementById("mjsSedeSelect");
  mjsEls.estadoSelect = document.getElementById("mjsEstadoSelect");
  mjsEls.habilitadoSelect = document.getElementById("mjsHabilitadoSelect");

  mjsEls.btnCargar = document.getElementById("mjsBtnCargar");
  mjsEls.btnRefrescar = document.getElementById("mjsBtnRefrescar");
  mjsEls.btnLimpiarFiltros = document.getElementById("mjsBtnLimpiarFiltros");

  mjsEls.mensajeEstado = document.getElementById("mjsMensajeEstado");

  mjsEls.statTotal = document.getElementById("mjsStatTotal");
  mjsEls.statPendiente = document.getElementById("mjsStatPendiente");
  mjsEls.statAvisado = document.getElementById("mjsStatAvisado");
  mjsEls.statCumplido = document.getElementById("mjsStatCumplido");

  mjsEls.busquedaInput = document.getElementById("mjsBusquedaInput");
  mjsEls.datalist = document.getElementById("mjsEstudiantesDatalist");
  mjsEls.selectorEstudiante = document.getElementById("mjsSelectorEstudiante");
  mjsEls.btnLimpiarBusqueda = document.getElementById("mjsBtnLimpiarBusqueda");

  mjsEls.tabla = document.getElementById("mjsTablaMensajes");
  mjsEls.tablaBody = document.getElementById("mjsTablaBody");
  mjsEls.tablaMensaje = document.getElementById("mjsTablaMensaje");
}

function mjsConfigurarEventos() {
  mjsEls.periodoSelect.addEventListener("change", async function () {
    mjsGuardarMemoria();
    await mjsCargarEstudiantes();
  });

  mjsEls.btnCargar.addEventListener("click", async function () {
    mjsGuardarMemoria();
    await mjsCargarEstudiantes();
  });

  mjsEls.btnRefrescar.addEventListener("click", async function () {
    mjsGuardarMemoria();
    await mjsCargarEstudiantes();
  });

  mjsEls.carreraSelect.addEventListener("change", function () {
    mjsGuardarMemoria();
    mjsAplicarFiltros();
  });

  mjsEls.sedeSelect.addEventListener("change", function () {
    mjsGuardarMemoria();
    mjsAplicarFiltros();
  });

  mjsEls.estadoSelect.addEventListener("change", function () {
    mjsGuardarMemoria();
    mjsAplicarFiltros();
  });

  mjsEls.habilitadoSelect.addEventListener("change", function () {
    mjsGuardarMemoria();
    mjsAplicarFiltros();
  });

  mjsEls.btnLimpiarFiltros.addEventListener("click", mjsLimpiarFiltros);

  mjsEls.busquedaInput.addEventListener("input", function () {
    mjsGuardarMemoria();
    mjsAplicarFiltros();
  });

  mjsEls.btnLimpiarBusqueda.addEventListener("click", mjsLimpiarBusqueda);
  mjsEls.selectorEstudiante.addEventListener("change", mjsSeleccionarEstudianteDesdeSelector);

  if (mjsEls.tabla) {
    mjsEls.tabla.addEventListener("click", mjsOrdenarTablaPorEncabezado);
  }

  mjsEls.tablaBody.addEventListener("click", mjsAtenderClickTabla);
}

function mjsConfigurarMemoria() {
  window.addEventListener("beforeunload", mjsGuardarMemoria);
  window.addEventListener("pagehide", mjsGuardarMemoria);

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      mjsGuardarMemoria();
    }
  });

  window.addEventListener("scroll", function () {
    mjsGuardarMemoria();
  }, { passive: true });
}

function mjsLeerMemoriaPorClave(clave) {
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

function mjsLeerMemoria() {
  return mjsLeerMemoriaPorClave(MJS_MEMORIA_KEY);
}

function mjsObtenerPeriodoCompartido() {
  const memoriaMensajes = mjsLeerMemoriaPorClave(MJS_MEMORIA_KEY);
  const memoriaAdmin = mjsLeerMemoriaPorClave(MJS_ADMIN_MEMORIA_KEY);
  const memoriaStats = mjsLeerMemoriaPorClave(MJS_STATS_MEMORIA_KEY);

  return (
    memoriaMensajes?.periodoId ||
    memoriaAdmin?.periodoId ||
    memoriaStats?.periodoId ||
    ""
  );
}

function mjsObtenerContenedorTablaScroll() {
  if (!mjsEls.tabla) {
    return null;
  }

  return mjsEls.tabla.closest(".table-wrapper, .mjs-table-wrapper") || null;
}

function mjsGuardarMemoria() {
  if (mjsRestaurandoMemoria) {
    return;
  }

  try {
    const contenedorTabla = mjsObtenerContenedorTablaScroll();

    const memoria = {
      periodoId: mjsEls.periodoSelect ? mjsEls.periodoSelect.value : "",
      carrera: mjsEls.carreraSelect ? mjsEls.carreraSelect.value : "TODAS",
      sede: mjsEls.sedeSelect ? mjsEls.sedeSelect.value : "TODAS",
      estado: mjsEls.estadoSelect ? mjsEls.estadoSelect.value : "TODOS",
      habilitado: mjsEls.habilitadoSelect ? mjsEls.habilitadoSelect.value : "TODOS",
      busqueda: mjsEls.busquedaInput ? mjsEls.busquedaInput.value : "",
      selectorEstudiante: mjsEls.selectorEstudiante ? mjsEls.selectorEstudiante.value : "",
      ordenCampo: mjsOrdenTabla.campo || "",
      ordenDireccion: mjsOrdenTabla.direccion || "asc",
      scrollY: window.scrollY || 0,
      tablaScrollLeft: contenedorTabla ? contenedorTabla.scrollLeft : 0,
      tablaScrollTop: contenedorTabla ? contenedorTabla.scrollTop : 0,
      fechaGuardado: new Date().toISOString()
    };

    sessionStorage.setItem(MJS_MEMORIA_KEY, JSON.stringify(memoria));
  } catch (error) {
    console.warn("No se pudo guardar la memoria de Mensajes:", error);
  }
}

function mjsAplicarValorSelect(select, valor) {
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

async function mjsRestaurarMemoria() {
  const memoria = mjsLeerMemoria() || {};
  const periodoRestaurar = memoria.periodoId || mjsObtenerPeriodoCompartido();

  if (!periodoRestaurar && Object.keys(memoria).length === 0) {
    return;
  }

  mjsRestaurandoMemoria = true;
  mjsMemoriaPendiente = memoria;

  if (memoria.busqueda && mjsEls.busquedaInput) {
    mjsEls.busquedaInput.value = memoria.busqueda;
  }

  mjsAplicarValorSelect(mjsEls.estadoSelect, memoria.estado);
  mjsAplicarValorSelect(mjsEls.habilitadoSelect, memoria.habilitado);

  if (memoria.ordenCampo) {
    mjsOrdenTabla.campo = memoria.ordenCampo;
    mjsOrdenTabla.direccion = memoria.ordenDireccion || "asc";
  }

  if (periodoRestaurar) {
    const existePeriodo = Array.from(mjsEls.periodoSelect.options).some(function (option) {
      return option.value === periodoRestaurar;
    });

    if (existePeriodo) {
      mjsEls.periodoSelect.value = periodoRestaurar;
      await mjsCargarEstudiantes();
    }
  }

  setTimeout(function () {
    const contenedorTabla = mjsObtenerContenedorTablaScroll();

    if (mjsEls.selectorEstudiante && memoria.selectorEstudiante) {
      mjsEls.selectorEstudiante.value = memoria.selectorEstudiante;
    }

    if (contenedorTabla) {
      contenedorTabla.scrollLeft = Number(memoria.tablaScrollLeft || 0);
      contenedorTabla.scrollTop = Number(memoria.tablaScrollTop || 0);
    }

    window.scrollTo(0, Number(memoria.scrollY || 0));

    mjsRestaurandoMemoria = false;
    mjsGuardarMemoria();
  }, 450);
}

function mjsMostrarMensaje(elemento, texto, tipo) {
  if (!elemento) {
    return;
  }

  elemento.textContent = texto || "";
  elemento.className = "message";

  if (tipo) {
    elemento.classList.add(tipo);
  }
}

function mjsEscaparHTML(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function mjsCargarPeriodosIniciales() {
  try {
    mjsEls.periodoSelect.innerHTML = `<option value="">Cargando períodos...</option>`;

    const periodos = await mjsObtenerPeriodosMensaje();

    if (!periodos || periodos.length === 0) {
      mjsEls.periodoSelect.innerHTML = `<option value="">No existen períodos</option>`;
      mjsMostrarMensaje(mjsEls.mensajeEstado, "No existen períodos registrados.", "error");
      return;
    }

    mjsEls.periodoSelect.innerHTML = `<option value="">Seleccione un período</option>`;

    periodos.forEach(function (periodo) {
      const option = document.createElement("option");
      option.value = periodo.id;
      option.textContent = periodo.activoConsulta
        ? `${periodo.label || periodo.id} - ACTIVO`
        : periodo.label || periodo.id;

      mjsEls.periodoSelect.appendChild(option);
    });

    mjsMostrarMensaje(
      mjsEls.mensajeEstado,
      "Períodos cargados correctamente. Seleccione un período para consultar.",
      "info"
    );
  } catch (error) {
    mjsEls.periodoSelect.innerHTML = `<option value="">Error al cargar períodos</option>`;
    mjsMostrarMensaje(mjsEls.mensajeEstado, error.message, "error");
  }
}

async function mjsCargarEstudiantes() {
  const periodoId = String(mjsEls.periodoSelect.value || "").trim();

  if (!periodoId) {
    mjsPeriodoSeleccionado = "";
    mjsRegistrosBase = [];
    mjsRegistrosFiltrados = [];
    mjsLimpiarTabla("Seleccione un período para cargar la información.");
    mjsActualizarEstadisticas();
    mjsActualizarPredictores();
    mjsMostrarMensaje(mjsEls.mensajeEstado, "Debe seleccionar un período.", "error");
    mjsGuardarMemoria();
    return;
  }

  try {
    mjsPeriodoSeleccionado = periodoId;

    mjsMostrarMensaje(
      mjsEls.mensajeEstado,
      "Cargando estudiantes, incorporaciones y estados de mensaje...",
      "info"
    );

    mjsRegistrosBase = await mjsCargarRegistrosMensaje(periodoId);

    mjsActualizarFiltrosSelect();
    mjsActualizarPredictores();
    mjsAplicarFiltros();

    mjsMostrarMensaje(
      mjsEls.mensajeEstado,
      `Información cargada correctamente. Total de registros: ${mjsRegistrosBase.length}.`,
      "ok"
    );

    if (!mjsRestaurandoMemoria) {
      mjsGuardarMemoria();
    }
  } catch (error) {
    mjsRegistrosBase = [];
    mjsRegistrosFiltrados = [];
    mjsLimpiarTabla("No se pudo cargar la información.");
    mjsActualizarEstadisticas();
    mjsActualizarPredictores();
    mjsMostrarMensaje(mjsEls.mensajeEstado, error.message, "error");
  }
}

function mjsObtenerValoresUnicos(lista, campo) {
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

function mjsLlenarSelect(select, valores, textoTodos, valorTodos) {
  const valorAnterior = select.value;

  select.innerHTML = "";

  const optionTodos = document.createElement("option");
  optionTodos.value = valorTodos;
  optionTodos.textContent = textoTodos;
  select.appendChild(optionTodos);

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

function mjsActualizarFiltrosSelect() {
  mjsLlenarSelect(
    mjsEls.carreraSelect,
    mjsObtenerValoresUnicos(mjsRegistrosBase, "carrera"),
    "Todas",
    "TODAS"
  );

  mjsLlenarSelect(
    mjsEls.sedeSelect,
    mjsObtenerValoresUnicos(mjsRegistrosBase, "sede"),
    "Todas",
    "TODAS"
  );

  if (mjsMemoriaPendiente) {
    mjsAplicarValorSelect(mjsEls.carreraSelect, mjsMemoriaPendiente.carrera);
    mjsAplicarValorSelect(mjsEls.sedeSelect, mjsMemoriaPendiente.sede);
    mjsAplicarValorSelect(mjsEls.estadoSelect, mjsMemoriaPendiente.estado);
    mjsAplicarValorSelect(mjsEls.habilitadoSelect, mjsMemoriaPendiente.habilitado);
  }
}

function mjsAplicarFiltros() {
  const carrera = mjsEls.carreraSelect.value;
  const sede = mjsEls.sedeSelect.value;
  const estado = mjsEls.estadoSelect.value;
  const habilitado = mjsEls.habilitadoSelect.value;
  const busqueda = mjsNormalizarTextoFlexibleDato(mjsEls.busquedaInput.value);

  mjsRegistrosFiltrados = mjsRegistrosBase.filter(function (registro) {
    const textoBusqueda = mjsNormalizarTextoFlexibleDato(
      `${registro.cedula} ${registro.nombres} ${registro.carrera} ${registro.sede}`
    );

    if (carrera !== "TODAS" && registro.carrera !== carrera) {
      return false;
    }

    if (sede !== "TODAS" && registro.sede !== sede) {
      return false;
    }

    if (estado !== "TODOS" && registro.estado !== estado) {
      return false;
    }

    if (habilitado === "HABILITADO" && registro.habilitado !== true) {
      return false;
    }

    if (habilitado === "NO_HABILITADO" && registro.habilitado !== false) {
      return false;
    }

    if (busqueda && !textoBusqueda.includes(busqueda)) {
      return false;
    }

    return true;
  });

  mjsOrdenarRegistrosFiltrados();

  mjsActualizarEstadisticas();
  mjsActualizarPredictores();
  mjsRenderizarTabla();

  if (!mjsRestaurandoMemoria) {
    mjsGuardarMemoria();
  }
}

function mjsActualizarEstadisticas() {
  const total = mjsRegistrosFiltrados.length;

  const pendiente = mjsRegistrosFiltrados.filter(function (item) {
    return item.estado === MJS_ESTADOS.PENDIENTE;
  }).length;

  const avisado = mjsRegistrosFiltrados.filter(function (item) {
    return item.estado === MJS_ESTADOS.AVISADO;
  }).length;

  const cumplido = mjsRegistrosFiltrados.filter(function (item) {
    return item.estado === MJS_ESTADOS.CUMPLIDO;
  }).length;

  mjsEls.statTotal.textContent = total;
  mjsEls.statPendiente.textContent = pendiente;
  mjsEls.statAvisado.textContent = avisado;
  mjsEls.statCumplido.textContent = cumplido;
}

function mjsActualizarPredictores() {
  mjsEls.datalist.innerHTML = "";
  mjsEls.selectorEstudiante.innerHTML = `<option value="">Seleccione un estudiante...</option>`;

  mjsRegistrosFiltrados.forEach(function (registro) {
    const texto = `${registro.cedula} - ${registro.nombres} - ${registro.carrera}`;

    const optionDatalist = document.createElement("option");
    optionDatalist.value = texto;
    mjsEls.datalist.appendChild(optionDatalist);

    const optionSelect = document.createElement("option");
    optionSelect.value = registro.key;
    optionSelect.textContent = texto;
    mjsEls.selectorEstudiante.appendChild(optionSelect);
  });
}

function mjsCrearBadgeEstado(estado) {
  if (estado === MJS_ESTADOS.CUMPLIDO) {
    return `<span class="mjs-badge mjs-badge-cumplido">Cumplido</span>`;
  }

  if (estado === MJS_ESTADOS.AVISADO) {
    return `<span class="mjs-badge mjs-badge-avisado">Avisado</span>`;
  }

  return `<span class="mjs-badge mjs-badge-pendiente">Pendiente</span>`;
}

function mjsCrearCelularHTML(registro) {
  if (registro.tieneCelular) {
    return `
      <span class="mjs-celular">${mjsEscaparHTML(registro.celularOriginal)}</span>
      <br>
      <span class="mjs-badge mjs-badge-neutro">WhatsApp válido</span>
    `;
  }

  return `
    <span class="mjs-celular-error">Sin celular válido</span>
    <br>
    <span class="mjs-badge mjs-badge-error">Revisar Excel</span>
  `;
}

function mjsCrearBotonAccion(registro) {
  if (registro.estado === MJS_ESTADOS.CUMPLIDO) {
    return `<span class="btn mjs-btn-deshabilitado">Cumplido</span>`;
  }

  if (registro.habilitado === false) {
    return `<span class="btn mjs-btn-deshabilitado">No habilitado</span>`;
  }

  if (!registro.tieneCelular) {
    return `<span class="btn mjs-btn-deshabilitado">Sin celular</span>`;
  }

  return `
    <button
      type="button"
      class="btn mjs-btn-whatsapp"
      data-mjs-whatsapp="${mjsEscaparHTML(registro.key)}"
    >
      Enviar WhatsApp
    </button>
  `;
}

function mjsObtenerCampoOrdenTabla(indice) {
  const campos = [
    "cedula",
    "nombres",
    "carrera",
    "periodo",
    "sede",
    "celularOriginal",
    "estado",
    ""
  ];

  return campos[indice] || "";
}

function mjsOrdenarTablaPorEncabezado(event) {
  const encabezado = event.target.closest("th");

  if (!encabezado || !mjsEls.tabla.contains(encabezado)) {
    return;
  }

  const indice = Array.from(encabezado.parentNode.children).indexOf(encabezado);
  const campo = mjsObtenerCampoOrdenTabla(indice);

  if (!campo) {
    return;
  }

  mjsOrdenTabla.direccion =
    mjsOrdenTabla.campo === campo && mjsOrdenTabla.direccion === "asc"
      ? "desc"
      : "asc";

  mjsOrdenTabla.campo = campo;

  mjsOrdenarRegistrosFiltrados();
  mjsActualizarPredictores();
  mjsRenderizarTabla();
  mjsGuardarMemoria();
}

function mjsOrdenarRegistrosFiltrados() {
  if (!mjsOrdenTabla.campo) {
    return;
  }

  const direccion = mjsOrdenTabla.direccion === "desc" ? -1 : 1;

  mjsRegistrosFiltrados.sort(function (a, b) {
    const valorA = String(a[mjsOrdenTabla.campo] || "");
    const valorB = String(b[mjsOrdenTabla.campo] || "");

    return valorA.localeCompare(valorB, "es", {
      numeric: true,
      sensitivity: "base"
    }) * direccion;
  });
}

function mjsRenderizarTabla() {
  if (!mjsRegistrosFiltrados || mjsRegistrosFiltrados.length === 0) {
    mjsLimpiarTabla("No existen registros con los filtros seleccionados.");
    mjsMostrarMensaje(mjsEls.tablaMensaje, "", "");
    return;
  }

  mjsEls.tablaBody.innerHTML = mjsRegistrosFiltrados.map(function (registro) {
    return `
      <tr id="${mjsEscaparHTML(registro.idFila)}" data-mjs-key="${mjsEscaparHTML(registro.key)}">
        <td>${mjsEscaparHTML(registro.cedula)}</td>

        <td>
          <span class="mjs-estudiante-nombre">${mjsEscaparHTML(registro.nombres)}</span>
        </td>

        <td>
          ${mjsEscaparHTML(registro.carrera)}
        </td>

        <td>
          ${mjsEscaparHTML(registro.periodo)}
        </td>

        <td>
          ${mjsEscaparHTML(registro.sede)}
        </td>

        <td>
          ${mjsCrearCelularHTML(registro)}
        </td>

        <td>
          ${mjsCrearBadgeEstado(registro.estado)}
        </td>

        <td>
          ${mjsCrearBotonAccion(registro)}
        </td>
      </tr>
    `;
  }).join("");

  mjsMostrarMensaje(
    mjsEls.tablaMensaje,
    `Mostrando ${mjsRegistrosFiltrados.length} estudiante(s).`,
    "info"
  );
}

function mjsLimpiarTabla(texto) {
  mjsEls.tablaBody.innerHTML = `
    <tr>
      <td colspan="8" class="empty-cell">
        ${mjsEscaparHTML(texto || "No existen datos para mostrar.")}
      </td>
    </tr>
  `;
}

function mjsLimpiarFiltros() {
  mjsEls.carreraSelect.value = "TODAS";
  mjsEls.sedeSelect.value = "TODAS";
  mjsEls.estadoSelect.value = "TODOS";
  mjsEls.habilitadoSelect.value = "TODOS";
  mjsEls.busquedaInput.value = "";
  mjsEls.selectorEstudiante.value = "";

  mjsAplicarFiltros();
  mjsGuardarMemoria();
}

function mjsLimpiarBusqueda() {
  mjsEls.busquedaInput.value = "";
  mjsEls.selectorEstudiante.value = "";
  mjsAplicarFiltros();
  mjsGuardarMemoria();
}

function mjsSeleccionarEstudianteDesdeSelector() {
  const key = mjsEls.selectorEstudiante.value;

  if (!key) {
    mjsGuardarMemoria();
    return;
  }

  const registro = mjsRegistrosFiltrados.find(function (item) {
    return item.key === key;
  });

  if (!registro) {
    mjsGuardarMemoria();
    return;
  }

  mjsEls.busquedaInput.value = `${registro.cedula} - ${registro.nombres}`;

  const fila = document.getElementById(registro.idFila);

  if (fila) {
    fila.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    fila.classList.remove("mjs-fila-seleccionada");

    setTimeout(function () {
      fila.classList.add("mjs-fila-seleccionada");
      mjsGuardarMemoria();
    }, 50);
  }

  mjsGuardarMemoria();
}

async function mjsAtenderClickTabla(event) {
  const boton = event.target.closest("[data-mjs-whatsapp]");

  if (!boton) {
    return;
  }

  const key = boton.getAttribute("data-mjs-whatsapp");

  const registro = mjsRegistrosBase.find(function (item) {
    return item.key === key;
  });

  if (!registro) {
    mjsMostrarMensaje(mjsEls.tablaMensaje, "No se encontró el estudiante seleccionado.", "error");
    return;
  }

  if (registro.habilitado === false) {
    mjsMostrarMensaje(mjsEls.tablaMensaje, "No se puede enviar WhatsApp a un estudiante no habilitado.", "error");
    return;
  }

  try {
    const urlWhatsapp = mjsCrearUrlWhatsapp(registro);
    const ventana = window.open(urlWhatsapp, "_blank");

    if (!ventana) {
      mjsMostrarMensaje(
        mjsEls.tablaMensaje,
        "El navegador bloqueó la ventana de WhatsApp. Permita ventanas emergentes e intente nuevamente.",
        "error"
      );
      return;
    }

    await mjsGuardarEstadoAvisado(registro);

    registro.estado = MJS_ESTADOS.AVISADO;

    const indiceFiltrado = mjsRegistrosFiltrados.findIndex(function (item) {
      return item.key === key;
    });

    if (indiceFiltrado >= 0) {
      mjsRegistrosFiltrados[indiceFiltrado].estado = MJS_ESTADOS.AVISADO;
    }

    mjsAplicarFiltros();

    mjsMostrarMensaje(
      mjsEls.tablaMensaje,
      `WhatsApp abierto y estudiante marcado como Avisado: ${registro.nombres}.`,
      "ok"
    );

    mjsGuardarMemoria();
  } catch (error) {
    mjsMostrarMensaje(mjsEls.tablaMensaje, error.message, "error");
  }
}