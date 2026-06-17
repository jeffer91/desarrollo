/*
=========================================================
Nombre completo: coordi.normalize.js
Ruta o ubicación: /Docentes/coordi/coordi.normalize.js
Función o funciones:
- Normalizar textos para comparar carreras y coordinadores.
- Quitar tildes, espacios dobles y diferencias menores de escritura.
- Crear claves estables para detectar duplicados y emparejar carreras.
- Preparar la información para ser usada por Distribución.
Con qué se une:
- coordi.validate.js
- coordi.table.js
- coordi.app.js
- /incorporaciones/sedes/distribucion/distribucion.coordi.js
=========================================================
*/

(function () {
  "use strict";

  function cleanText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,;:(){}[\]'"´`]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function toKey(value) {
    return cleanText(value)
      .toLowerCase()
      .replace(/\ben linea\b/g, "online")
      .replace(/\bvirtual\b/g, "online")
      .replace(/\bon line\b/g, "online")
      .replace(/\borden publico\b/g, "orden publico")
      .replace(/\btecnologia superior universitaria\b/g, "tecnologia universitaria")
      .replace(/\btecnologico superior\b/g, "tecnologia superior")
      .replace(/\btsu\b/g, "tecnologia universitaria")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeTelegram(value) {
    const text = String(value || "").trim();

    if (!text) {
      return "";
    }

    return text.startsWith("@") ? text : `@${text}`;
  }

  function normalizeProgram(value) {
    const key = toKey(value);

    if (key.includes("universitaria")) {
      return "Tecnología Universitaria";
    }

    if (key.includes("tecnico")) {
      return "Técnico Superior";
    }

    if (key.includes("tecnologia")) {
      return "Tecnología Superior";
    }

    return cleanText(value);
  }

  function normalizeRow(row) {
    return {
      id: row.id,
      carrera: cleanText(row.carrera),
      coordinador: cleanText(row.coordinador),
      programa: normalizeProgram(row.programa),
      telegram: normalizeTelegram(row.telegram),
      updatedAt: row.updatedAt || new Date().toISOString(),
      carreraKey: toKey(row.carrera),
      coordinadorKey: toKey(row.coordinador),
      programaKey: toKey(row.programa)
    };
  }

  function findExactCareer(careerName, rows) {
    const careerKey = toKey(careerName);

    return rows.find((row) => toKey(row.carrera) === careerKey) || null;
  }

  function findPossibleCareers(careerName, rows) {
    const careerKey = toKey(careerName);

    if (!careerKey) {
      return [];
    }

    return rows
      .map((row) => {
        const rowKey = toKey(row.carrera);
        const score = getSimilarityScore(careerKey, rowKey);

        return {
          row,
          score
        };
      })
      .filter((item) => item.score >= 0.58)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  function getSimilarityScore(a, b) {
    if (!a || !b) {
      return 0;
    }

    if (a === b) {
      return 1;
    }

    if (a.includes(b) || b.includes(a)) {
      return 0.85;
    }

    const aWords = new Set(a.split(" "));
    const bWords = new Set(b.split(" "));
    let matches = 0;

    aWords.forEach((word) => {
      if (bWords.has(word)) {
        matches += 1;
      }
    });

    const total = Math.max(aWords.size, bWords.size);

    return total === 0 ? 0 : matches / total;
  }

  window.CoordiNormalize = {
    cleanText,
    toKey,
    normalizeTelegram,
    normalizeProgram,
    normalizeRow,
    findExactCareer,
    findPossibleCareers,
    getSimilarityScore
  };
})();