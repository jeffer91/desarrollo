/*
=========================================================
Nombre completo: distribucion.aprobados.js
Ruta o ubicación: /incorporaciones/sedes/distribucion/distribucion.aprobados.js
Función o funciones:
- Leer estudiantes del período seleccionado.
- Filtrar únicamente estudiantes aprobados o habilitados para incorporación.
- Agrupar por carrera.
- Devolver solo número de estudiantes aprobados por carrera, no listado completo.
Con qué se une:
- distribucion.app.js
- distribucion.state.js
- distribucion.logic.js
- js/database.js si está disponible
- js/incorporaciones-manager.js si está disponible
=========================================================
*/

(function () {
  "use strict";

  async function loadAprobadosPorCarrera(periodoId) {
    const estudiantes = await loadStudents(periodoId);
    const filtrados = estudiantes.filter(isApprovedStudent);
    const grouped = groupByCareer(filtrados);

    return grouped.sort((a, b) => {
      return a.carrera.localeCompare(b.carrera, "es");
    });
  }

  async function loadStudents(periodoId) {
    const fromManager = await tryFromIncorporacionesManager(periodoId);

    if (fromManager.length > 0) {
      return fromManager;
    }

    const fromDatabase = await tryFromDatabase(periodoId);

    if (fromDatabase.length > 0) {
      return fromDatabase;
    }

    const fromGlobal = tryFromGlobal(periodoId);

    if (fromGlobal.length > 0) {
      return fromGlobal;
    }

    return tryFromLocalStorage(periodoId);
  }

  async function tryFromIncorporacionesManager(periodoId) {
    try {
      const manager = window.IncorporacionesManager || window.incorporacionesManager;

      if (manager && typeof manager.obtenerEstudiantesPorPeriodo === "function") {
        const result = await manager.obtenerEstudiantesPorPeriodo(periodoId);
        return Array.isArray(result) ? result : [];
      }

      if (manager && typeof manager.obtenerEstudiantes === "function") {
        const result = await manager.obtenerEstudiantes(periodoId);
        return Array.isArray(result) ? result : [];
      }
    } catch (error) {
      console.warn("No se pudo leer desde IncorporacionesManager:", error);
    }

    return [];
  }

  async function tryFromDatabase(periodoId) {
    try {
      const db = window.AppDatabase || window.Database || window.database;

      if (db && typeof db.getStudentsByPeriod === "function") {
        const result = await db.getStudentsByPeriod(periodoId);
        return Array.isArray(result) ? result : [];
      }

      if (db && typeof db.obtenerEstudiantesPorPeriodo === "function") {
        const result = await db.obtenerEstudiantesPorPeriodo(periodoId);
        return Array.isArray(result) ? result : [];
      }
    } catch (error) {
      console.warn("No se pudo leer desde Database:", error);
    }

    return [];
  }

  function tryFromGlobal(periodoId) {
    const candidates = [
      window.INCORPORACIONES_ESTUDIANTES,
      window.estudiantesIncorporaciones,
      window.estudiantes
    ];

    for (const candidate of candidates) {
      if (!Array.isArray(candidate)) {
        continue;
      }

      const filtered = candidate.filter((student) => {
        return samePeriod(student, periodoId);
      });

      if (filtered.length > 0) {
        return filtered;
      }
    }

    return [];
  }

  function tryFromLocalStorage(periodoId) {
    const keys = [
      "incorporaciones_estudiantes",
      "estudiantes_incorporaciones",
      "itsqmet_incorporaciones_estudiantes",
      "incorporaciones"
    ];

    for (const key of keys) {
      const raw = localStorage.getItem(key);

      if (!raw) {
        continue;
      }

      try {
        const parsed = JSON.parse(raw);
        const list = extractArray(parsed);
        const filtered = list.filter((student) => samePeriod(student, periodoId));

        if (filtered.length > 0) {
          return filtered;
        }
      } catch (error) {
        console.warn(`No se pudo leer localStorage ${key}:`, error);
      }
    }

    return [];
  }

  function extractArray(parsed) {
    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (Array.isArray(parsed.estudiantes)) {
      return parsed.estudiantes;
    }

    if (Array.isArray(parsed.data)) {
      return parsed.data;
    }

    if (Array.isArray(parsed.rows)) {
      return parsed.rows;
    }

    return [];
  }

  function samePeriod(student, periodoId) {
    const possibleValues = [
      student.periodoId,
      student.periodo,
      student.Periodo,
      student.periodoAcademico,
      student["Periodo Académico"],
      student["PERIODO"],
      student["PERÍODO"]
    ]
      .filter(Boolean)
      .map(String);

    return possibleValues.some((value) => value === String(periodoId));
  }

  function isApprovedStudent(student) {
    const values = [
      student.estado,
      student.Estado,
      student.estadoIncorporacion,
      student.incorporacion,
      student.aprobado,
      student.Aprobado,
      student.resultado,
      student.Resultado,
      student.habilitado,
      student.Habilitado
    ]
      .filter((value) => value !== undefined && value !== null)
      .map((value) => String(value).toLowerCase());

    if (values.length === 0) {
      return true;
    }

    const approvedWords = [
      "aprobado",
      "aprobada",
      "habilitado",
      "habilitada",
      "apto",
      "apta",
      "si",
      "sí",
      "true",
      "cumple",
      "incorporar"
    ];

    const rejectedWords = [
      "reprobado",
      "no aprobado",
      "no cumple",
      "pendiente",
      "retirado",
      "rechazado",
      "false"
    ];

    if (values.some((value) => rejectedWords.some((word) => value.includes(word)))) {
      return false;
    }

    return values.some((value) => approvedWords.some((word) => value.includes(word)));
  }

  function groupByCareer(students) {
    const map = new Map();

    students.forEach((student) => {
      const carrera = getCareerName(student);

      if (!carrera) {
        return;
      }

      const key = normalizeKey(carrera);

      if (!map.has(key)) {
        map.set(key, {
          carrera,
          carreraKey: key,
          total: 0
        });
      }

      map.get(key).total += 1;
    });

    return Array.from(map.values());
  }

  function getCareerName(student) {
    return String(
      student.carrera ||
      student.Carrera ||
      student.CARRERA ||
      student.programa ||
      student.Programa ||
      student["Nombre Carrera"] ||
      ""
    ).trim();
  }

  function normalizeKey(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  window.DistribucionAprobados = {
    loadAprobadosPorCarrera,
    isApprovedStudent,
    groupByCareer
  };
})();