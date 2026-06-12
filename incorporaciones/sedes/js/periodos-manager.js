/*
Nombre completo: periodos-manager.js
Ruta o ubicación: /incorporaciones-app/js/periodos-manager.js

Función o funciones:
1. Crear o actualizar períodos en Firebase.
2. Activar un período para consulta estudiantil.
3. Desactivar un período para consulta estudiantil.
4. Permitir que existan varios períodos activos al mismo tiempo.
5. Mostrar el estado del período seleccionado en el administrador.
6. Refrescar el selector principal de períodos.
*/

const periodoIdInput = document.getElementById("periodoIdInput");
const periodoLabelInput = document.getElementById("periodoLabelInput");
const periodoOrdenInput = document.getElementById("periodoOrdenInput");
const periodoActivoInput = document.getElementById("periodoActivoInput");

const btnGuardarPeriodo = document.getElementById("btnGuardarPeriodo");
const btnActivarPeriodo = document.getElementById("btnActivarPeriodo");
const btnDesactivarPeriodo = document.getElementById("btnDesactivarPeriodo");
const btnLimpiarPeriodoForm = document.getElementById("btnLimpiarPeriodoForm");

const periodoManagerMessage = document.getElementById("periodoManagerMessage");
const periodoEstadoBox = document.getElementById("periodoEstadoBox");

document.addEventListener("DOMContentLoaded", function () {
  configurarEventosPeriodosManager();
});

function configurarEventosPeriodosManager() {
  if (!btnGuardarPeriodo) {
    return;
  }

  btnGuardarPeriodo.addEventListener("click", guardarPeriodoDesdeFormulario);

  if (btnActivarPeriodo) {
    btnActivarPeriodo.addEventListener("click", function () {
      cambiarEstadoPeriodoSeleccionado(true);
    });
  }

  if (btnDesactivarPeriodo) {
    btnDesactivarPeriodo.addEventListener("click", function () {
      cambiarEstadoPeriodoSeleccionado(false);
    });
  }

  if (btnLimpiarPeriodoForm) {
    btnLimpiarPeriodoForm.addEventListener("click", limpiarFormularioPeriodo);
  }

  const periodoSelectPrincipal = document.getElementById("periodoSelect");

  if (periodoSelectPrincipal) {
    periodoSelectPrincipal.addEventListener("change", cargarPeriodoEnFormulario);
  }
}

function mostrarMensajePeriodoManager(texto, tipo) {
  if (!periodoManagerMessage) {
    return;
  }

  periodoManagerMessage.textContent = texto || "";
  periodoManagerMessage.className = "message";

  if (tipo) {
    periodoManagerMessage.classList.add(tipo);
  }
}

function obtenerDatosFormularioPeriodo() {
  const idManual = String(periodoIdInput?.value || "").trim();
  const label = String(periodoLabelInput?.value || "").trim();
  const ordenTexto = String(periodoOrdenInput?.value || "").trim();
  const activoConsulta = periodoActivoInput?.checked === true;

  const id = idManual || label;

  if (!id) {
    throw new Error("Debe escribir el ID o nombre del período.");
  }

  if (!label) {
    throw new Error("Debe escribir el nombre visible del período.");
  }

  const docId = limpiarIdFirestore(id);

  return {
    docId: docId,
    id: id,
    label: label,
    ordenPeriodo: ordenTexto ? Number(ordenTexto) : 0,
    activoConsulta: activoConsulta
  };
}

async function guardarPeriodoFirebase(datos) {
  if (!datos || !datos.docId) {
    throw new Error("Datos de período incompletos.");
  }

  const fecha = obtenerFechaISO();

  await db
    .collection(APP_COLLECTIONS.periodos)
    .doc(datos.docId)
    .set(
      {
        id: datos.id,
        label: datos.label,
        ordenPeriodo: datos.ordenPeriodo || 0,
        activoConsulta: datos.activoConsulta === true,
        actualizadoEn: fecha,
        creadoEn: firebase.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

  return datos;
}

async function guardarPeriodoDesdeFormulario() {
  try {
    mostrarMensajePeriodoManager("Guardando período...", "info");

    const datos = obtenerDatosFormularioPeriodo();

    await guardarPeriodoFirebase(datos);

    mostrarMensajePeriodoManager("Período guardado correctamente.", "ok");

    await refrescarPeriodosDesdeManager();
  } catch (error) {
    mostrarMensajePeriodoManager(error.message, "error");
  }
}

async function cambiarEstadoPeriodoSeleccionado(activo) {
  const periodoSelectPrincipal = document.getElementById("periodoSelect");
  const periodoId = periodoSelectPrincipal?.value || periodoIdInput?.value || "";

  if (!periodoId) {
    mostrarMensajePeriodoManager("Debe seleccionar o escribir un período.", "error");
    return;
  }

  try {
    mostrarMensajePeriodoManager(
      activo ? "Activando período..." : "Desactivando período...",
      "info"
    );

    const docId = limpiarIdFirestore(periodoId);

    await db
      .collection(APP_COLLECTIONS.periodos)
      .doc(docId)
      .set(
        {
          id: periodoId,
          activoConsulta: activo === true,
          actualizadoEn: obtenerFechaISO()
        },
        { merge: true }
      );

    mostrarMensajePeriodoManager(
      activo
        ? "Período activado para consulta estudiantil."
        : "Período desactivado para consulta estudiantil.",
      "ok"
    );

    await refrescarPeriodosDesdeManager();
  } catch (error) {
    mostrarMensajePeriodoManager(error.message, "error");
  }
}

async function cargarPeriodoEnFormulario() {
  const periodoSelectPrincipal = document.getElementById("periodoSelect");

  if (!periodoSelectPrincipal || !periodoSelectPrincipal.value) {
    mostrarEstadoPeriodoSeleccionado(null);
    return;
  }

  try {
    const periodo = await obtenerPeriodoPorId(periodoSelectPrincipal.value);

    if (!periodo) {
      mostrarEstadoPeriodoSeleccionado(null);
      return;
    }

    if (periodoIdInput) {
      periodoIdInput.value = periodo.id || "";
    }

    if (periodoLabelInput) {
      periodoLabelInput.value = periodo.label || "";
    }

    if (periodoOrdenInput) {
      periodoOrdenInput.value = periodo.ordenPeriodo || "";
    }

    if (periodoActivoInput) {
      periodoActivoInput.checked = periodo.activoConsulta === true;
    }

    mostrarEstadoPeriodoSeleccionado(periodo);
  } catch (error) {
    mostrarMensajePeriodoManager(error.message, "error");
  }
}

function mostrarEstadoPeriodoSeleccionado(periodo) {
  if (!periodoEstadoBox) {
    return;
  }

  if (!periodo) {
    periodoEstadoBox.innerHTML = `
      <div class="periodo-activo-card">
        <div>
          <strong>Sin período seleccionado</strong><br>
          <span>Seleccione un período para ver su estado.</span>
        </div>
      </div>
    `;
    return;
  }

  periodoEstadoBox.innerHTML = `
    <div class="periodo-activo-card">
      <div>
        <strong>${periodo.label || periodo.id}</strong><br>
        <span>ID: ${periodo.id}</span>
      </div>
      ${
        periodo.activoConsulta
          ? `<span class="badge badge-ok">ACTIVO PARA ESTUDIANTE</span>`
          : `<span class="badge badge-error">INACTIVO</span>`
      }
    </div>
  `;
}

function limpiarFormularioPeriodo() {
  if (periodoIdInput) {
    periodoIdInput.value = "";
  }

  if (periodoLabelInput) {
    periodoLabelInput.value = "";
  }

  if (periodoOrdenInput) {
    periodoOrdenInput.value = "";
  }

  if (periodoActivoInput) {
    periodoActivoInput.checked = false;
  }

  mostrarEstadoPeriodoSeleccionado(null);
  mostrarMensajePeriodoManager("", "");
}

async function refrescarPeriodosDesdeManager() {
  if (typeof cargarPeriodos === "function") {
    await cargarPeriodos();
  }

  const periodoSelectPrincipal = document.getElementById("periodoSelect");

  if (periodoSelectPrincipal && periodoIdInput && periodoIdInput.value) {
    periodoSelectPrincipal.value = periodoIdInput.value;
  }

  await cargarPeriodoEnFormulario();
}