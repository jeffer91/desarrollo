/*
Nombre del archivo: carr.normalizar.js
Ubicación: /Curriculo/carreras/backend/carr.normalizar.js
Función:
- Limpiar y normalizar texto
- Quitar tildes y caracteres especiales
- Generar un id válido para el documento de la carrera
- Preparar registros de carrera con campos mínimos y arreglos base
*/

const CARR_NIVELES_BASE = [1, 2, 3, 4];

function carrQuitarTildes(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function carrLimpiarTextoBase(texto) {
  return String(texto || "")
    .trim()
    .replace(/\s+/g, " ");
}

function carrCrearIdCarrera(nombre) {
  return carrQuitarTildes(carrLimpiarTextoBase(nombre))
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function carrNormalizarBusqueda(texto) {
  return carrQuitarTildes(carrLimpiarTextoBase(texto)).toLowerCase();
}

function carrFechaIso(valor) {
  if (!valor) {
    return "";
  }

  try {
    if (typeof valor.toDate === "function") {
      return valor.toDate().toISOString();
    }

    if (valor instanceof Date) {
      return valor.toISOString();
    }

    if (typeof valor === "object" && typeof valor.seconds === "number") {
      return new Date(valor.seconds * 1000).toISOString();
    }

    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? "" : fecha.toISOString();
  } catch (error) {
    return "";
  }
}

function carrArrayTexto(valor) {
  return Array.isArray(valor)
    ? valor.map((item) => carrLimpiarTextoBase(item)).filter(Boolean)
    : [];
}

function carrAplicarArraysBaseCarrera(data = {}) {
  const salida = { ...data };

  CARR_NIVELES_BASE.forEach((nivel) => {
    const materiasKey = `materiasNivel${nivel}`;
    const transversalesKey = `materiasTransversal${nivel}`;

    salida[materiasKey] = carrArrayTexto(salida[materiasKey]);
    salida[transversalesKey] = carrArrayTexto(salida[transversalesKey]);
  });

  salida.nucleos = Array.isArray(salida.nucleos)
    ? salida.nucleos.slice(0, 4).map((item) => carrLimpiarTextoBase(item))
    : ["", "", "", ""];

  while (salida.nucleos.length < 4) {
    salida.nucleos.push("");
  }

  return salida;
}

function carrPrepararRegistroCarrera(valor, extra = {}) {
  const now = new Date().toISOString();
  const id = carrCrearIdCarrera(valor?.nombre || extra?.nombre || extra?.id || "");

  const base = carrAplicarArraysBaseCarrera({
    ...(extra || {}),
    id,
    nombre: carrLimpiarTextoBase(valor?.nombre ?? extra?.nombre),
    nombreNormalizado: carrNormalizarBusqueda(valor?.nombre ?? extra?.nombre),
    tipo: carrLimpiarTextoBase(valor?.tipo ?? extra?.tipo),
    estado: carrLimpiarTextoBase((valor?.estado ?? extra?.estado) || "activa").toLowerCase(),
    updatedAtLocal: now
  });

  if (!base.createdAtLocal) {
    base.createdAtLocal = carrFechaIso(extra?.createdAtLocal) || now;
  }

  return base;
}

function carrPrepararLecturaCarrera(id, data = {}) {
  const base = carrAplicarArraysBaseCarrera({
    ...data,
    id: carrLimpiarTextoBase(data.id || id),
    nombre: carrLimpiarTextoBase(data.nombre),
    nombreNormalizado: data.nombreNormalizado || carrNormalizarBusqueda(data.nombre),
    tipo: carrLimpiarTextoBase(data.tipo),
    estado: carrLimpiarTextoBase(data.estado || "activa").toLowerCase(),
    createdAt: carrFechaIso(data.createdAt) || data.createdAt || null,
    updatedAt: carrFechaIso(data.updatedAt) || data.updatedAt || null,
    createdAtLocal: carrFechaIso(data.createdAtLocal) || data.createdAtLocal || "",
    updatedAtLocal: carrFechaIso(data.updatedAtLocal) || data.updatedAtLocal || ""
  });

  return base;
}

export {
  CARR_NIVELES_BASE,
  carrQuitarTildes,
  carrLimpiarTextoBase,
  carrCrearIdCarrera,
  carrNormalizarBusqueda,
  carrFechaIso,
  carrArrayTexto,
  carrAplicarArraysBaseCarrera,
  carrPrepararRegistroCarrera,
  carrPrepararLecturaCarrera
};
