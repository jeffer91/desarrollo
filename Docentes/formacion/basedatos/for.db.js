/*
Nombre completo: for.db.js
Ruta o ubicación: formacion/basedatos/for.db.js
Función o funciones: Proveer una capa simple de persistencia local para el módulo Formación, incluyendo lectura y escritura JSON mediante localStorage y una memoria de respaldo cuando localStorage no esté disponible
*/

const FOR_DB_KEYS = {
  records: "formacion.for.records",
  catalogs: "formacion.for.catalogs"
};

const forMemoryStore = new Map();

function forHasLocalStorage() {
  try {
    return typeof window !== "undefined" && "localStorage" in window && window.localStorage;
  } catch {
    return false;
  }
}

function forReadRaw(key) {
  if (forHasLocalStorage()) {
    return window.localStorage.getItem(key);
  }
  return forMemoryStore.has(key) ? forMemoryStore.get(key) : null;
}

function forWriteRaw(key, value) {
  if (forHasLocalStorage()) {
    window.localStorage.setItem(key, value);
    return;
  }
  forMemoryStore.set(key, value);
}

export function forGetDbKeys() {
  return { ...FOR_DB_KEYS };
}

export function forReadJson(key, fallback = null) {
  const raw = forReadRaw(key);

  if (raw === null || raw === undefined || raw === "") {
    return structuredClone(fallback);
  }

  try {
    return JSON.parse(raw);
  } catch {
    return structuredClone(fallback);
  }
}

export function forWriteJson(key, value) {
  forWriteRaw(key, JSON.stringify(value ?? null));
}

export function forRemoveKey(key) {
  if (forHasLocalStorage()) {
    window.localStorage.removeItem(key);
    return;
  }
  forMemoryStore.delete(key);
}