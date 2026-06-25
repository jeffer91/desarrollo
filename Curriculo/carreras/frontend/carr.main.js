/*
Nombre del archivo: carr.main.js
Ubicación: /Curriculo/carreras/frontend/carr.main.js
Función:
- Controlar el formulario principal de carreras
- Guardar primero en la base local central
- Cargar la tabla editable
- Filtrar la tabla con el buscador
- Guardar cambios de la tabla con el botón flotante
- Mantener actualizado el estado de sincronización
*/

import { carrGuardarCarrera } from "../backend/carr.guardar.js";
import {
  carrUiBloquearGuardado,
  carrUiBloquearGuardadoFlotante,
  carrUiLimpiarFormulario,
  carrUiRecogerFormulario,
  carrUiResetMensajeBase,
  carrUiSetEstado,
  carrUiActualizarBotonFlotante,
  carrUiRefrescarEstadoSync
} from "./carr.ui.js";

let carrTablaApi = null;
let carrSyncTimer = null;

function carrMostrarTablaTemporal(mensaje, resumen = "Tabla no disponible", esError = false) {
  const wrap = document.getElementById("carrTablaWrap");
  const resumenNodo = document.getElementById("carrTablaResumen");

  if (resumenNodo) {
    resumenNodo.textContent = resumen;
  }

  if (!wrap) return;

  wrap.innerHTML = "";

  const estado = document.createElement("div");
  estado.className = esError
    ? "carr-tabla-empty carr-tabla-empty-error"
    : "carr-tabla-empty";
  estado.textContent = mensaje;

  wrap.appendChild(estado);
}

async function carrIntentarCargarModuloTabla() {
  if (carrTablaApi && typeof carrTablaApi.cargar === "function") {
    return true;
  }

  try {
    const modulo = await import("./carr.tabla.js");

    if (typeof modulo.carrCrearTablaCarreras !== "function") {
      return false;
    }

    carrTablaApi = modulo.carrCrearTablaCarreras({
      contenedorId: "carrTablaWrap",
      resumenId: "carrTablaResumen",
      onDirtyChange: ({ total }) => {
        carrUiActualizarBotonFlotante(total);
      }
    });

    return true;
  } catch (error) {
    console.warn("[carr] No se pudo cargar carr.tabla.js:", error);
    return false;
  }
}

async function carrRefrescarTabla() {
  const tablaLista = await carrIntentarCargarModuloTabla();

  if (!tablaLista) {
    carrMostrarTablaTemporal(
      "La tabla no se pudo inicializar.",
      "Módulo no disponible",
      true
    );

    carrUiActualizarBotonFlotante(0);

    return {
      ok: false,
      total: 0,
      items: []
    };
  }

  try {
    const resultado = await carrTablaApi.cargar();
    carrUiActualizarBotonFlotante(carrTablaApi.getPendientes());
    await carrUiRefrescarEstadoSync();

    return resultado;
  } catch (error) {
    console.error("[carr] Error al refrescar la tabla:", error);

    carrMostrarTablaTemporal(
      "No se pudo cargar la tabla de carreras.",
      "Error de carga",
      true
    );

    carrUiActualizarBotonFlotante(0);

    return {
      ok: false,
      total: 0,
      items: []
    };
  }
}

async function carrSubmitFormulario(event) {
  event.preventDefault();

  try {
    carrUiBloquearGuardado(true);
    carrUiSetEstado("Validando y guardando la carrera...");

    const data = carrUiRecogerFormulario();
    const resultado = await carrGuardarCarrera(data);

    if (!resultado.ok) {
      carrUiSetEstado(
        resultado.mensaje || "No se pudo guardar la carrera.",
        "error"
      );
      return;
    }

    carrUiSetEstado(
      resultado.mensaje || `Carrera guardada correctamente con id: ${resultado.id}`,
      "ok"
    );

    carrUiLimpiarFormulario();
    await carrRefrescarTabla();
    await carrUiRefrescarEstadoSync();
  } catch (error) {
    console.error("[carr] Error inesperado al guardar:", error);

    carrUiSetEstado(
      "Ocurrió un error inesperado al guardar la carrera.",
      "error"
    );
  } finally {
    carrUiBloquearGuardado(false);
  }
}

async function carrGuardarCambiosTabla() {
  if (!carrTablaApi || typeof carrTablaApi.guardarCambios !== "function") {
    carrUiSetEstado("La tabla editable todavía no está disponible.", "error");
    return;
  }

  const pendientes = carrTablaApi.getPendientes();

  if (!pendientes) {
    carrUiSetEstado("No hay cambios pendientes en la tabla.");
    carrUiActualizarBotonFlotante(0);
    return;
  }

  try {
    carrUiBloquearGuardadoFlotante(true);
    carrUiSetEstado("Guardando cambios de la tabla...");

    const resultado = await carrTablaApi.guardarCambios();

    if (!resultado.ok) {
      carrUiSetEstado(
        resultado.mensaje || "No se pudieron guardar los cambios de la tabla.",
        "error"
      );

      return;
    }

    carrUiSetEstado(
      resultado.mensaje || `${resultado.total || 0} cambio(s) guardado(s) correctamente.`,
      "ok"
    );

    await carrUiRefrescarEstadoSync();
  } catch (error) {
    console.error("[carr] Error inesperado al guardar cambios de tabla:", error);

    carrUiSetEstado(
      "Ocurrió un error inesperado al guardar los cambios de la tabla.",
      "error"
    );
  } finally {
    const totalPendientes = carrTablaApi && typeof carrTablaApi.getPendientes === "function"
      ? carrTablaApi.getPendientes()
      : 0;

    carrUiBloquearGuardadoFlotante(false, totalPendientes);
  }
}

function carrRegistrarEventos() {
  const form = document.getElementById("carrForm");
  const btnRecargarTabla = document.getElementById("carrBtnRecargarTabla");
  const btnGuardarCambios = document.getElementById("carrBtnGuardarCambios");
  const inputBuscar = document.getElementById("carrTablaBuscar");
  const btnLimpiarBusqueda = document.getElementById("carrBtnLimpiarBusqueda");
  const btnLimpiar = document.getElementById("carrBtnLimpiar");

  if (form) {
    form.addEventListener("submit", carrSubmitFormulario);
  }

  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", () => {
      window.setTimeout(carrUiResetMensajeBase, 0);
    });
  }

  if (btnRecargarTabla) {
    btnRecargarTabla.addEventListener("click", async () => {
      carrUiSetEstado("Recargando tabla de carreras...");
      const resultado = await carrRefrescarTabla();
      carrUiSetEstado(
        resultado.ok
          ? `Tabla recargada. Total: ${resultado.total || 0}`
          : resultado.mensaje || "No se pudo recargar la tabla.",
        resultado.ok ? "ok" : "error"
      );
    });
  }

  if (btnGuardarCambios) {
    btnGuardarCambios.addEventListener("click", carrGuardarCambiosTabla);
  }

  if (inputBuscar) {
    inputBuscar.addEventListener("input", () => {
      if (carrTablaApi && typeof carrTablaApi.setBuscar === "function") {
        carrTablaApi.setBuscar(inputBuscar.value);
      }
    });
  }

  if (btnLimpiarBusqueda) {
    btnLimpiarBusqueda.addEventListener("click", () => {
      if (inputBuscar) {
        inputBuscar.value = "";
      }

      if (carrTablaApi && typeof carrTablaApi.setBuscar === "function") {
        carrTablaApi.setBuscar("");
      }
    });
  }
}

function carrIniciarRefrescoSync() {
  if (carrSyncTimer) {
    window.clearInterval(carrSyncTimer);
  }

  carrUiRefrescarEstadoSync();
  carrSyncTimer = window.setInterval(carrUiRefrescarEstadoSync, 5000);
}

async function carrInit() {
  carrRegistrarEventos();
  carrUiResetMensajeBase();
  carrIniciarRefrescoSync();
  await carrRefrescarTabla();
}

document.addEventListener("DOMContentLoaded", carrInit);
