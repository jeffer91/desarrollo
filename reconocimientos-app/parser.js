window.ReconParser = (() => {
  function cleanText(value) {
    return String(value || "")
      .replace(/\r/g, "")
      .replace(/^"+|"+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function splitCells(line) {
    if (line.includes("\t")) {
      return line.split("\t").map(cleanText);
    }

    return line.split(/\s{2,}/).map(cleanText);
  }

  function normalizeHeader(value) {
    return cleanText(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function buildHeaderMap(cells) {
    const map = {};

    cells.forEach((cell, index) => {
      const key = normalizeHeader(cell);

      if (key === "carrera") map.carrera = index;
      if (key === "nombre") map.nombre = index;
      if (key === "promedio") map.promedio = index;
    });

    if (
      typeof map.carrera === "number" &&
      typeof map.nombre === "number" &&
      typeof map.promedio === "number"
    ) {
      return map;
    }

    return null;
  }

  function normalizeAverage(value) {
    const raw = cleanText(value)
      .replace(/\./g, "")
      .replace(",", ".");

    const parsed = Number(raw);

    if (Number.isNaN(parsed)) {
      return cleanText(value);
    }

    return parsed.toFixed(3);
  }

  function parseRawText(rawText) {
    const lines = String(rawText || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) return [];

    const firstRow = splitCells(lines[0]);
    const headerMap = buildHeaderMap(firstRow);
    const records = [];

    lines.forEach((line, index) => {
      const cells = splitCells(line).filter((item) => item !== "");

      if (headerMap && index === 0) return;

      let carrera = "";
      let nombre = "";
      let promedio = "";

      if (headerMap) {
        carrera = cleanText(cells[headerMap.carrera] || "");
        nombre = cleanText(cells[headerMap.nombre] || "").toUpperCase();
        promedio = normalizeAverage(cells[headerMap.promedio] || "");
      } else {
        if (cells.length < 3) return;
        carrera = cleanText(cells[0] || "");
        nombre = cleanText(cells[1] || "").toUpperCase();
        promedio = normalizeAverage(cells[2] || "");
      }

      if (!carrera || !nombre || !promedio) return;

      records.push({
        carrera,
        nombre,
        promedio
      });
    });

    return records;
  }

  return {
    parseRawText,
    cleanText,
    normalizeAverage
  };
})();