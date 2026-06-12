/*
=========================================================
Nombre completo: distribucion.coordi.js
Ruta o ubicación: /incorporaciones/sedes/distribucion/distribucion.coordi.js
Función o funciones:
- Leer la configuración guardada desde la pantalla Coordi.
- Relacionar cada carrera con su coordinador y programa.
- Detectar carreras no emparejadas.
- Proveer datos para que la distribución intente agrupar carreras del mismo coordinador.
Con qué se une:
- distribucion.app.js
- distribucion.logic.js
- distribucion.board.js
- /Docentes/coordi/coordi.repo.js
=========================================================
*/

(function () {
  "use strict";

  const COORDI_STORAGE_KEY = "itsqmet_docentes_coordi_v1";

  async function loadCoordi() {
    const fromStorage = loadFromStorage();

    if (fromStorage.length > 0) {
      return fromStorage.map(normalizeCoordiRow);
    }

    if (window.CoordiSeed && typeof window.CoordiSeed.getRows === "function") {
      return window.CoordiSeed.getRows().map(normalizeCoordiRow);
    }

    return [];
  }

  function loadFromStorage() {
    const raw = localStorage.getItem(COORDI_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed.rows)) {
        return parsed.rows;
      }

      if (Array.isArray(parsed.data)) {
        return parsed.data;
      }

      return [];
    } catch (error) {
      console.warn("No se pudo leer Coordi desde localStorage:", error);
      return [];
    }
  }

  function normalizeCoordiRow(row) {
    return {
      id: row.id || createId("coordi"),
      carrera: clean(row.carrera),
      carreraKey: toKey(row.carrera),
      coordinador: clean(row.coordinador),
      coordinadorKey: toKey(row.coordinador),
      programa: clean(row.programa),
      programaKey: toKey(row.programa),
      telegram: clean(row.telegram)
    };
  }

  function findCoordiByCareer(carrera, coordiRows) {
    const key = toKey(carrera);

    return (
      (coordiRows || []).find((item) => item.carreraKey === key) ||
      null
    );
  }

  function enrichCareers(carreras, coordiRows) {
    const alerts = [];

    const enriched = (carreras || []).map((item) => {
      const coordi = findCoordiByCareer(item.carrera, coordiRows);

      if (!coordi) {
        alerts.push({
          type: "warning",
          message: `La carrera "${item.carrera}" no está emparejada en Coordi.`
        });
      }

      return {
        carrera: item.carrera,
        carreraKey: item.carreraKey || toKey(item.carrera),
        total: Number(item.total || 0),
        coordinador: coordi ? coordi.coordinador : "Sin coordinador",
        coordinadorKey: coordi ? coordi.coordinadorKey : "sin_coordinador",
        programa: coordi ? coordi.programa : "",
        telegram: coordi ? coordi.telegram : "",
        matchedCoordi: Boolean(coordi)
      };
    });

    return {
      carreras: enriched,
      alerts
    };
  }

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function toKey(value) {
    return clean(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[.,;:(){}[\]'"´`]/g, " ")
      .replace(/\ben linea\b/g, "online")
      .replace(/\bvirtual\b/g, "online")
      .replace(/\bon line\b/g, "online")
      .replace(/\btsu\b/g, "tecnologia universitaria")
      .replace(/\s+/g, " ")
      .trim();
  }

  function createId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  window.DistribucionCoordi = {
    loadCoordi,
    findCoordiByCareer,
    enrichCareers,
    toKey
  };
})();