/*
Nombre del archivo: carr.tabla.js
Ubicación: /Curriculo/carreras/frontend/carr.tabla.js
Función:
- Cargar carreras desde local/Firebase
- Renderizar tabla editable
- Filtrar y ordenar registros
- Detectar cambios pendientes
- Guardar actualizaciones o renombrados
*/

import { carrLeerTodasLasCarreras } from "../backend/carr.leer.js";
import { carrActualizarCarrera } from "../backend/carr.actualizar.js";
import { carrRenombrarCarrera } from "../backend/carr.renombrar.js";
import { carrCrearIdCarrera } from "../backend/carr.normalizar.js";

const CARR_TIPOS = [
  "Tecnologia Superior",
  "Tecnologia Universitaria",
  "Tecnica Superior"
];

const CARR_ESTADOS = ["activa", "inactiva"];

function txt(valor, fallback = "—") {
  const limpio = String(valor ?? "").trim();
  return limpio || fallback;
}

function limpiar(valor) {
  return String(valor ?? "").trim().replace(/\s+/g, " ");
}

function normalizarEstado(valor) {
  return String(valor ?? "").trim().toLowerCase() === "inactiva" ? "inactiva" : "activa";
}

function normalizarBusqueda(valor) {
  return String(valor ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function fechaOrdenable(valor) {
  if (!valor) return 0;

  try {
    if (typeof valor?.toDate === "function") return valor.toDate().getTime();
    if (valor instanceof Date) return valor.getTime();
    if (typeof valor === "object" && typeof valor.seconds === "number") return valor.seconds * 1000;
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? 0 : fecha.getTime();
  } catch (error) {
    return 0;
  }
}

function fechaVisible(valor) {
  const tiempo = fechaOrdenable(valor);
  if (!tiempo) return "—";

  try {
    return new Intl.DateTimeFormat("es-EC", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date(tiempo));
  } catch (error) {
    return "—";
  }
}

function estadoVacio(contenedor, mensaje, esError = false) {
  if (!contenedor) return;

  contenedor.innerHTML = "";
  const vacio = document.createElement("div");
  vacio.className = esError ? "carr-tabla-empty carr-tabla-empty-error" : "carr-tabla-empty";
  vacio.textContent = mensaje;
  contenedor.appendChild(vacio);
}

function selectCampo(options, value, rowId, field) {
  const select = document.createElement("select");
  select.className = "carr-table-control carr-table-select";
  select.dataset.rowId = rowId;
  select.dataset.field = field;

  options.forEach((optionValue) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = field === "estado"
      ? optionValue.charAt(0).toUpperCase() + optionValue.slice(1)
      : optionValue;
    option.selected = optionValue === value;
    select.appendChild(option);
  });

  return select;
}

function resumenTexto(visibles, total, cambios) {
  return `${visibles} visible(s) · ${total} registro(s) · ${cambios} cambio(s)`;
}

function snapshot(item) {
  return {
    nombre: limpiar(item?.nombre),
    tipo: limpiar(item?.tipo),
    estado: normalizarEstado(item?.estado)
  };
}

function carrCrearTablaCarreras(config = {}) {
  const contenedor = document.getElementById(config.contenedorId || "carrTablaWrap");
  const resumenNodo = document.getElementById(config.resumenId || "carrTablaResumen");
  const onDirtyChange = typeof config.onDirtyChange === "function" ? config.onDirtyChange : null;

  const state = {
    items: [],
    itemsById: new Map(),
    originalById: new Map(),
    dirty: new Map(),
    search: "",
    sortKey: "nombre",
    sortDir: "asc"
  };

  function notificar() {
    if (onDirtyChange) {
      onDirtyChange({ total: state.dirty.size, hasChanges: state.dirty.size > 0 });
    }
  }

  function actualizarResumen() {
    if (!resumenNodo) return;
    resumenNodo.textContent = resumenTexto(obtenerVisibles().length, state.items.length, state.dirty.size);
  }

  function syncMaps() {
    state.itemsById = new Map();
    state.originalById = new Map();

    state.items.forEach((item) => {
      const fila = {
        id: txt(item.id, ""),
        nombre: limpiar(item.nombre),
        tipo: limpiar(item.tipo),
        estado: normalizarEstado(item.estado),
        createdAt: item.createdAt || item.createdAtLocal || null,
        updatedAt: item.updatedAt || item.updatedAtLocal || null,
        createdAtLocal: item.createdAtLocal || "",
        updatedAtLocal: item.updatedAtLocal || ""
      };

      state.itemsById.set(fila.id, fila);
      state.originalById.set(fila.id, snapshot(fila));
    });

    state.dirty = new Map();
    notificar();
  }

  function coincideBusqueda(item) {
    if (!state.search) return true;
    const base = [item.id, item.nombre, item.tipo, item.estado].join(" ");
    return normalizarBusqueda(base).includes(state.search);
  }

  function valorOrden(item, key) {
    if (key === "createdAt" || key === "updatedAt") return fechaOrdenable(item[key]);
    return normalizarBusqueda(item[key] || "");
  }

  function obtenerVisibles() {
    const items = state.items.filter(coincideBusqueda).slice();

    items.sort((a, b) => {
      const av = valorOrden(a, state.sortKey);
      const bv = valorOrden(b, state.sortKey);
      if (av < bv) return state.sortDir === "asc" ? -1 : 1;
      if (av > bv) return state.sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return items;
  }

  function filaModificada(rowId) {
    const original = state.originalById.get(rowId);
    const actual = state.itemsById.get(rowId);

    if (!original || !actual) {
      state.dirty.delete(rowId);
      notificar();
      return false;
    }

    const isDirty =
      limpiar(actual.nombre) !== original.nombre ||
      limpiar(actual.tipo) !== original.tipo ||
      normalizarEstado(actual.estado) !== original.estado;

    if (isDirty) {
      state.dirty.set(rowId, { id: rowId, before: { ...original }, after: snapshot(actual) });
    } else {
      state.dirty.delete(rowId);
    }

    notificar();
    return isDirty;
  }

  function marcarFila(tr, rowId) {
    if (tr) tr.classList.toggle("carr-row-dirty", state.dirty.has(rowId));
  }

  function sortButton(label, key) {
    const activa = state.sortKey === key;
    const boton = document.createElement("button");
    const texto = document.createElement("span");
    const indicador = document.createElement("span");

    boton.type = "button";
    boton.className = activa ? "carr-sort-btn is-active" : "carr-sort-btn";
    boton.dataset.sortKey = key;
    texto.textContent = label;
    indicador.className = "carr-sort-indicator";
    indicador.textContent = !activa ? "↕" : state.sortDir === "asc" ? "↑" : "↓";
    boton.appendChild(texto);
    boton.appendChild(indicador);
    return boton;
  }

  function tdTexto(clase, valor) {
    const td = document.createElement("td");
    td.className = clase;
    td.textContent = valor;
    return td;
  }

  function render() {
    if (!contenedor) return;

    if (!state.items.length) {
      estadoVacio(contenedor, "Todavía no hay carreras registradas.");
      actualizarResumen();
      return;
    }

    const visibles = obtenerVisibles();

    if (!visibles.length) {
      estadoVacio(contenedor, "No hay coincidencias para la búsqueda actual.");
      actualizarResumen();
      return;
    }

    contenedor.innerHTML = "";

    const scroll = document.createElement("div");
    scroll.className = "carr-tabla-scroll";

    const tabla = document.createElement("table");
    tabla.className = "carr-tabla";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");

    [
      ["ID", "id"],
      ["Nombre", "nombre"],
      ["Tipo", "tipo"],
      ["Estado", "estado"],
      ["Creado", "createdAt"],
      ["Actualizado", "updatedAt"]
    ].forEach(([label, key]) => {
      const th = document.createElement("th");
      th.appendChild(sortButton(label, key));
      headRow.appendChild(th);
    });

    thead.appendChild(headRow);

    const tbody = document.createElement("tbody");

    visibles.forEach((item) => {
      const tr = document.createElement("tr");
      tr.dataset.rowId = item.id;
      marcarFila(tr, item.id);

      const inputNombre = document.createElement("input");
      inputNombre.type = "text";
      inputNombre.value = item.nombre;
      inputNombre.className = "carr-table-control carr-table-input";
      inputNombre.dataset.rowId = item.id;
      inputNombre.dataset.field = "nombre";
      inputNombre.spellcheck = false;

      const tdNombre = document.createElement("td");
      tdNombre.appendChild(inputNombre);

      const tdTipo = document.createElement("td");
      tdTipo.appendChild(selectCampo(CARR_TIPOS, item.tipo, item.id, "tipo"));

      const tdEstado = document.createElement("td");
      tdEstado.appendChild(selectCampo(CARR_ESTADOS, item.estado, item.id, "estado"));

      tr.appendChild(tdTexto("carr-cell-id", item.id));
      tr.appendChild(tdNombre);
      tr.appendChild(tdTipo);
      tr.appendChild(tdEstado);
      tr.appendChild(tdTexto("carr-cell-readonly", fechaVisible(item.createdAt || item.createdAtLocal)));
      tr.appendChild(tdTexto("carr-cell-readonly", fechaVisible(item.updatedAt || item.updatedAtLocal)));
      tbody.appendChild(tr);
    });

    tabla.appendChild(thead);
    tabla.appendChild(tbody);
    scroll.appendChild(tabla);
    contenedor.appendChild(scroll);
    actualizarResumen();
  }

  function handleControlChange(event) {
    const target = event.target;

    if (!target || !(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    if (!target.classList.contains("carr-table-control")) return;

    const rowId = limpiar(target.dataset.rowId);
    const field = limpiar(target.dataset.field);

    if (!rowId || !field || !state.itemsById.has(rowId)) return;

    const item = state.itemsById.get(rowId);
    if (!item) return;

    if (field === "nombre") {
      item.nombre = limpiar(target.value);
      target.value = item.nombre;
    }

    if (field === "tipo") item.tipo = limpiar(target.value);

    if (field === "estado") {
      item.estado = normalizarEstado(target.value);
      target.value = item.estado;
    }

    const tr = target.closest("tr");
    filaModificada(rowId);
    marcarFila(tr, rowId);
    actualizarResumen();

    if (event.type === "change" && (state.search || state.sortKey === field)) render();
  }

  function handleSortClick(event) {
    const boton = event.target.closest(".carr-sort-btn");
    if (!boton) return;

    const key = limpiar(boton.dataset.sortKey);
    if (!key) return;

    if (state.sortKey === key) {
      state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    } else {
      state.sortKey = key;
      state.sortDir = "asc";
    }

    render();
  }

  async function cargar() {
    if (!contenedor) {
      return { ok: false, total: 0, items: [], mensaje: "No se encontró el contenedor de la tabla." };
    }

    estadoVacio(contenedor, "Cargando carreras...");

    try {
      const resultado = await carrLeerTodasLasCarreras();

      if (!resultado.ok) {
        estadoVacio(contenedor, resultado.mensaje || "No se pudo cargar la tabla de carreras.", true);
        if (resumenNodo) resumenNodo.textContent = "Error al cargar";
        return resultado;
      }

      state.items = Array.isArray(resultado.items) ? resultado.items.map((item) => ({ ...item })) : [];
      syncMaps();
      render();

      return { ok: true, total: state.items.length, items: state.items, fuente: resultado.fuente || "" };
    } catch (error) {
      console.error("[carr] Error inesperado al cargar la tabla:", error);
      estadoVacio(contenedor, "Ocurrió un error inesperado al cargar el listado.", true);
      if (resumenNodo) resumenNodo.textContent = "Error inesperado";
      return { ok: false, total: 0, items: [], mensaje: "Ocurrió un error inesperado al cargar la tabla." };
    }
  }

  function setBuscar(valor) {
    state.search = normalizarBusqueda(valor);
    render();
  }

  function getPendientes() {
    return state.dirty.size;
  }

  function hayCambios() {
    return state.dirty.size > 0;
  }

  async function guardarCambios() {
    const cambios = Array.from(state.dirty.values());

    if (!cambios.length) {
      return { ok: true, total: 0, resultados: [], mensaje: "No hay cambios pendientes." };
    }

    const resultados = [];
    let totalGuardados = 0;

    for (const cambio of cambios) {
      const idActual = cambio.id;
      const nuevoId = carrCrearIdCarrera(cambio.after.nombre);
      const resultado = nuevoId && nuevoId !== idActual
        ? await carrRenombrarCarrera(idActual, cambio.after)
        : await carrActualizarCarrera(idActual, cambio.after);

      if (!resultado.ok) {
        if (totalGuardados > 0) await cargar();
        return {
          ok: false,
          parcial: totalGuardados > 0,
          totalGuardados,
          resultados,
          mensaje: resultado.mensaje || "No se pudieron guardar todos los cambios."
        };
      }

      resultados.push(resultado);
      totalGuardados += 1;
    }

    await cargar();

    return {
      ok: true,
      total: totalGuardados,
      resultados,
      mensaje: `${totalGuardados} cambio(s) guardado(s) localmente y pendiente(s) de sincronización.`
    };
  }

  if (contenedor) {
    contenedor.addEventListener("input", handleControlChange);
    contenedor.addEventListener("change", handleControlChange);
    contenedor.addEventListener("click", handleSortClick);
  }

  return {
    cargar,
    setBuscar,
    getPendientes,
    hayCambios,
    guardarCambios
  };
}

export { carrCrearTablaCarreras };
