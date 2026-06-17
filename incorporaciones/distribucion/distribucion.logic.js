/*
=========================================================
Nombre completo: distribucion.logic.js
Ruta o ubicación: /incorporaciones/sedes/distribucion/distribucion.logic.js
Función o funciones:
- Generar distribución automática de carreras por jornada.
- Priorizar equilibrio de estudiantes por jornada.
- Como segunda prioridad, intentar mantener juntas carreras del mismo coordinador.
- Respetar cambios manuales cuando se redistribuya.
- Calcular balance general de la distribución.
Con qué se une:
- distribucion.app.js
- distribucion.coordi.js
- distribucion.board.js
- distribucion.table.js
=========================================================
*/

(function () {
  "use strict";

  function generateDistribution(params) {
    const carrerasBase = Array.isArray(params.carreras) ? params.carreras : [];
    const jornadas = Array.isArray(params.jornadas) ? params.jornadas : [];
    const coordiRows = Array.isArray(params.coordiRows) ? params.coordiRows : [];
    const cambiosManuales = Array.isArray(params.cambiosManuales)
      ? params.cambiosManuales
      : [];

    const enriched = window.DistribucionCoordi.enrichCareers(carrerasBase, coordiRows);
    const carreras = enriched.carreras;
    const alerts = [...enriched.alerts];

    const buckets = jornadas.map((jornada, index) => ({
      jornadaId: jornada.id,
      jornadaOrden: index + 1,
      total: 0,
      items: []
    }));

    const lockedMap = buildManualMap(cambiosManuales);
    const pending = [];

    carreras.forEach((carrera) => {
      const lockedJornadaId = lockedMap.get(carrera.carreraKey);

      if (lockedJornadaId && buckets.some((bucket) => bucket.jornadaId === lockedJornadaId)) {
        addCareerToBucket(
          buckets.find((bucket) => bucket.jornadaId === lockedJornadaId),
          carrera,
          true
        );
      } else {
        pending.push(carrera);
      }
    });

    pending
      .sort((a, b) => Number(b.total) - Number(a.total))
      .forEach((carrera) => {
        const target = findBestBucket(carrera, buckets);
        addCareerToBucket(target, carrera, false);
      });

    const distribucion = buckets.flatMap((bucket) => {
      return bucket.items.map((item, index) => ({
        id: item.id,
        jornadaId: bucket.jornadaId,
        carrera: item.carrera,
        carreraKey: item.carreraKey,
        total: Number(item.total || 0),
        coordinador: item.coordinador,
        coordinadorKey: item.coordinadorKey,
        programa: item.programa,
        telegram: item.telegram,
        matchedCoordi: item.matchedCoordi,
        lockedManual: Boolean(item.lockedManual),
        orden: index + 1,
        updatedAt: new Date().toISOString()
      }));
    });

    const balance = calculateBalance(distribucion, jornadas);

    if (balance.level === "danger") {
      alerts.push({
        type: "warning",
        message: "La distribución quedó con diferencia alta entre jornadas. Revisa si conviene ajustar manualmente."
      });
    }

    return {
      distribucion,
      alerts,
      balance
    };
  }

  function buildManualMap(cambiosManuales) {
    const map = new Map();

    cambiosManuales.forEach((change) => {
      if (change.carreraKey && change.toJornadaId) {
        map.set(change.carreraKey, change.toJornadaId);
      }
    });

    return map;
  }

  function addCareerToBucket(bucket, carrera, lockedManual) {
    if (!bucket) {
      return;
    }

    bucket.items.push({
      id: carrera.id || createId("dist_item"),
      ...carrera,
      lockedManual
    });

    bucket.total += Number(carrera.total || 0);
  }

  function findBestBucket(carrera, buckets) {
    const sortedByTotal = [...buckets].sort((a, b) => {
      if (a.total !== b.total) {
        return a.total - b.total;
      }

      const aCoordinatorScore = countCoordinatorInBucket(a, carrera.coordinadorKey);
      const bCoordinatorScore = countCoordinatorInBucket(b, carrera.coordinadorKey);

      if (aCoordinatorScore !== bCoordinatorScore) {
        return bCoordinatorScore - aCoordinatorScore;
      }

      return a.jornadaOrden - b.jornadaOrden;
    });

    const bestByBalance = sortedByTotal[0];
    const sameCoordinatorBucket = sortedByTotal.find((bucket) => {
      return countCoordinatorInBucket(bucket, carrera.coordinadorKey) > 0;
    });

    if (!sameCoordinatorBucket) {
      return bestByBalance;
    }

    const average = getAverageTotal(buckets);
    const bestProjected = bestByBalance.total + Number(carrera.total || 0);
    const coordinatorProjected = sameCoordinatorBucket.total + Number(carrera.total || 0);

    const bestDistance = Math.abs(bestProjected - average);
    const coordinatorDistance = Math.abs(coordinatorProjected - average);

    if (coordinatorDistance <= bestDistance + 8) {
      return sameCoordinatorBucket;
    }

    return bestByBalance;
  }

  function countCoordinatorInBucket(bucket, coordinadorKey) {
    return bucket.items.filter((item) => item.coordinadorKey === coordinadorKey).length;
  }

  function getAverageTotal(buckets) {
    if (!buckets.length) {
      return 0;
    }

    const total = buckets.reduce((sum, bucket) => sum + Number(bucket.total || 0), 0);

    return total / buckets.length;
  }

  function calculateBalance(distribucion, jornadas) {
    if (!Array.isArray(jornadas) || jornadas.length === 0) {
      return {
        level: "neutral",
        message: "Equilibrio pendiente",
        rows: []
      };
    }

    const totals = jornadas.map((jornada) => {
      const total = (distribucion || [])
        .filter((item) => item.jornadaId === jornada.id)
        .reduce((sum, item) => sum + Number(item.total || 0), 0);

      return {
        jornadaId: jornada.id,
        total
      };
    });

    const totalGeneral = totals.reduce((sum, item) => sum + item.total, 0);
    const average = jornadas.length ? totalGeneral / jornadas.length : 0;

    const rows = totals.map((item) => ({
      ...item,
      difference: Math.round(item.total - average)
    }));

    const max = Math.max(...totals.map((item) => item.total), 0);
    const min = Math.min(...totals.map((item) => item.total), 0);
    const difference = max - min;

    let level = "ok";
    let message = `Equilibrio adecuado. Diferencia máxima: ${difference} estudiantes.`;

    if (difference > 35) {
      level = "danger";
      message = `Revisar equilibrio. Diferencia máxima: ${difference} estudiantes.`;
    } else if (difference > 20) {
      level = "warning";
      message = `Equilibrio aceptable con diferencia de ${difference} estudiantes.`;
    }

    return {
      level,
      message,
      average,
      difference,
      rows
    };
  }

  function createId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  window.DistribucionLogic = {
    generateDistribution,
    calculateBalance
  };
})();