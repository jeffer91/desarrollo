/*
Nombre completo: ctl.filters.js
Ruta o ubicación: /control/ctl.filters.js
Función o funciones:
- Filtrar registros por carrera, nivel, estado y texto
- Devolver una lista lista para renderizar en pantalla
*/

function ctlNormalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function ctlMatchTexto(item, texto) {
  if (!texto) return true;

  const base = ctlNormalize([
    item.carreraNombre,
    item.nivelNombre,
    item.materiaNombre
  ].join(" "));

  return base.includes(ctlNormalize(texto));
}

function ctlFilterItems(items, filtros) {
  const list = Array.isArray(items) ? items : [];

  return list.filter((item) => {
    if (filtros?.carreraId && item.carreraId !== filtros.carreraId) {
      return false;
    }

    if (filtros?.nivelId && item.nivelId !== filtros.nivelId) {
      return false;
    }

    if (filtros?.estado && item.estado !== filtros.estado) {
      return false;
    }

    if (!ctlMatchTexto(item, filtros?.texto)) {
      return false;
    }

    return true;
  });
}

export {
  ctlFilterItems
};