/*
Nombre completo: for.catalogs.js
Ruta o ubicación: formacion/basedatos/for.catalogs.js
Función o funciones: Definir los catálogos base del módulo Formación y exponer utilidades para obtener opciones de modalidad, estado, financiamiento, patrocinio y tipo de apoyo
*/

export const FOR_DEFAULT_CATALOGS = Object.freeze({
  modalidades: ["Presencial", "Virtual", "Híbrida"],
  estados: ["En curso", "Finalizado", "Suspendido", "Pendiente"],
  financiamiento: ["Sí", "No", "No aplica"],
  patrocinio: ["Sí", "No"],
  tiposApoyo: ["Económico", "Con tiempo", "Económico y Con tiempo", "No aplica"]
});

export function forGetDefaultCatalogs() {
  return structuredClone(FOR_DEFAULT_CATALOGS);
}

export function forGetCatalogOptions(catalogName) {
  const catalogs = forGetDefaultCatalogs();
  return Array.isArray(catalogs[catalogName]) ? catalogs[catalogName] : [];
}

export function forCatalogIncludes(catalogName, value) {
  const options = forGetCatalogOptions(catalogName);
  return options.includes(String(value ?? "").trim());
}