/*
Nombre completo: ctl.stats.js
Ruta o ubicación: /control/ctl.stats.js
Función o funciones:
- Calcular los indicadores globales
- Calcular los indicadores por carrera
- Obtener porcentajes de avance por agrupación
*/

function ctlPercent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function ctlBuildGlobalStats(items) {
  const list = Array.isArray(items) ? items : [];

  const totalMaterias = list.length;
  const totalCarreras = new Set(list.map((item) => item.carreraId)).size;
  const conPea = list.filter((item) => item.pea).length;
  const conFicha = list.filter((item) => item.ficha).length;
  const conActa = list.filter((item) => item.acta).length;
  const completos = list.filter((item) => item.estado === "completo").length;

  return {
    totalCarreras,
    totalMaterias,
    conPea,
    conFicha,
    conActa,
    completos,
    peaPct: ctlPercent(conPea, totalMaterias),
    fichaPct: ctlPercent(conFicha, totalMaterias),
    actaPct: ctlPercent(conActa, totalMaterias),
    completoPct: ctlPercent(completos, totalMaterias)
  };
}

function ctlBuildCarreraStats(items) {
  const list = Array.isArray(items) ? items : [];
  const map = new Map();

  list.forEach((item) => {
    if (!map.has(item.carreraId)) {
      map.set(item.carreraId, {
        carreraId: item.carreraId,
        carreraNombre: item.carreraNombre,
        totalMaterias: 0,
        conPea: 0,
        conFicha: 0,
        conActa: 0,
        completos: 0,
        avancePromedio: 0
      });
    }

    const row = map.get(item.carreraId);
    row.totalMaterias += 1;
    row.conPea += Number(Boolean(item.pea));
    row.conFicha += Number(Boolean(item.ficha));
    row.conActa += Number(Boolean(item.acta));
    row.completos += Number(item.estado === "completo");
    row.avancePromedio += Number(item.avance || 0);
  });

  return Array.from(map.values()).map((row) => ({
    ...row,
    peaPct: ctlPercent(row.conPea, row.totalMaterias),
    fichaPct: ctlPercent(row.conFicha, row.totalMaterias),
    actaPct: ctlPercent(row.conActa, row.totalMaterias),
    completoPct: ctlPercent(row.completos, row.totalMaterias),
    avancePromedio: row.totalMaterias
      ? Math.round(row.avancePromedio / row.totalMaterias)
      : 0
  }));
}

export {
  ctlBuildGlobalStats,
  ctlBuildCarreraStats
};