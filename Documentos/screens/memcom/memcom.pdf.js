/* =========================================================
Nombre completo: memcom.pdf.js
Ruta: /screens/memcom/memcom.pdf.js
Función o funciones:
- Generar el PDF del memorando de cronograma.
- Mostrar el encabezado correcto: MEMORANDO No. MEM-ITSQMET-UTET-YYYY-MM-XX.
- Eliminar los dos puntos después de "No.".
- Usar el código reservado por memcom.sequence.js.
- Construir el cuerpo del memorando con período, tipo de proceso y tablas.
- Permitir 1, 2, 3 o 4 tablas dentro de un mismo memorando.
- Mostrar el título de cada tabla antes de su contenido.
- Evitar que el título de una tabla quede solo al final de una página.
- Mantener fallback seguro si no llega un código reservado.
- Calcular fallback del año y mes desde la fecha de fin del período menos 3 meses.
- Mostrar solo el logo superior sin textos institucionales.
- Corregir la proporción del logo para evitar que salga comprimido.
- Eliminar líneas horizontales visuales no requeridas.
========================================================= */

(function (window) {
  "use strict";

  window.MEMCOM = window.MEMCOM || {};

  var MONTHS_ES = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre"
  ];

  var MONTH_NAME_TO_NUMBER = {
    enero: 1,
    febrero: 2,
    marzo: 3,
    abril: 4,
    mayo: 5,
    junio: 6,
    julio: 7,
    agosto: 8,
    septiembre: 9,
    setiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12
  };

  async function getBase64ImageFromUrl(imageUrl) {
    try {
      var response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error("No se pudo cargar la imagen: " + imageUrl);
      }

      var blob = await response.blob();

      return new Promise(function (resolve, reject) {
        var reader = new FileReader();

        reader.onloadend = function () {
          resolve(reader.result);
        };

        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn("[MEMCOM_PDF] No se cargó logo opcional:", error);
      return null;
    }
  }

  function pad2(value) {
    var n = parseInt(value, 10);

    if (isNaN(n) || n < 1) {
      return "01";
    }

    return n < 10 ? "0" + n : String(n);
  }

  function isValidDate(value) {
    return value instanceof Date && !isNaN(value.getTime());
  }

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function getDateParts(dateValue) {
    var date = isValidDate(dateValue) ? dateValue : new Date();

    if (isNaN(date.getTime())) {
      date = new Date();
    }

    var year = date.getFullYear();
    var month = pad2(date.getMonth() + 1);
    var day = pad2(date.getDate());

    return {
      year: year,
      month: month,
      day: day,
      codigoMes: year + "-" + month,
      fechaIso: year + "-" + month + "-" + day
    };
  }

  function getFechaHumana(dateValue) {
    var date = isValidDate(dateValue) ? dateValue : new Date();

    if (isNaN(date.getTime())) {
      date = new Date();
    }

    return date.getDate() + " de " + MONTHS_ES[date.getMonth()] + " de " + date.getFullYear();
  }

  function buildLocalDate(year, monthNumber, day) {
    var y = parseInt(year, 10);
    var m = parseInt(monthNumber, 10);
    var d = parseInt(day || 1, 10);

    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      return null;
    }

    return new Date(y, m - 1, isNaN(d) ? 1 : d, 12, 0, 0, 0);
  }

  function parsePeriodoEndFromNumeric(value) {
    var text = String(value || "").trim();
    var match = /^(\d{4})\D+(\d{1,2})\D+(\d{4})\D+(\d{1,2})$/.exec(text);

    if (match) {
      return buildLocalDate(match[3], match[4], 1);
    }

    var all = [];
    var regex = /(\d{4})\D+(\d{1,2})/g;
    var item;

    while ((item = regex.exec(text)) !== null) {
      all.push({
        year: item[1],
        month: item[2]
      });
    }

    if (all.length > 0) {
      var last = all[all.length - 1];
      return buildLocalDate(last.year, last.month, 1);
    }

    return null;
  }

  function parsePeriodoEndFromHumanText(value) {
    var text = normalizeText(value);

    if (!text) {
      return null;
    }

    var parts = text.split(/\s+a\s+/i);
    var endPart = parts.length > 1 ? parts[parts.length - 1] : text;
    var yearMatch = endPart.match(/(20\d{2}|19\d{2})/);

    if (!yearMatch) {
      var allYears = text.match(/(20\d{2}|19\d{2})/g);
      yearMatch = allYears && allYears.length ? [allYears[allYears.length - 1]] : null;
    }

    if (!yearMatch) {
      return null;
    }

    var monthNumber = null;

    Object.keys(MONTH_NAME_TO_NUMBER).some(function (monthName) {
      var regex = new RegExp("\\b" + monthName + "\\b", "i");

      if (regex.test(endPart)) {
        monthNumber = MONTH_NAME_TO_NUMBER[monthName];
        return true;
      }

      return false;
    });

    if (!monthNumber) {
      Object.keys(MONTH_NAME_TO_NUMBER).forEach(function (monthName) {
        var regex = new RegExp("\\b" + monthName + "\\b", "i");

        if (regex.test(text)) {
          monthNumber = MONTH_NAME_TO_NUMBER[monthName];
        }
      });
    }

    if (!monthNumber) {
      return null;
    }

    return buildLocalDate(yearMatch[0], monthNumber, 1);
  }

  function getPeriodoEndDate(periodoValue) {
    var numericDate = parsePeriodoEndFromNumeric(periodoValue);

    if (numericDate) {
      return numericDate;
    }

    return parsePeriodoEndFromHumanText(periodoValue);
  }

  function getMemoDateFromPeriodo(periodoValue) {
    var endDate = getPeriodoEndDate(periodoValue);

    if (!endDate) {
      return null;
    }

    return new Date(
      endDate.getFullYear(),
      endDate.getMonth() - 3,
      1,
      12,
      0,
      0,
      0
    );
  }

  function formatearPeriodoHumano(periodo) {
    if (!periodo) {
      return "";
    }

    var value = String(periodo).trim();

    if (value.toLowerCase().indexOf(" a ") !== -1 && value.length > 15) {
      return value;
    }

    var match = /^(\d{4})\D+(\d{1,2})\D+(\d{4})\D+(\d{1,2})$/.exec(value);

    if (!match) {
      return value;
    }

    var map = {
      "01": "Enero",
      "02": "Febrero",
      "03": "Marzo",
      "04": "Abril",
      "05": "Mayo",
      "06": "Junio",
      "07": "Julio",
      "08": "Agosto",
      "09": "Septiembre",
      "10": "Octubre",
      "11": "Noviembre",
      "12": "Diciembre"
    };

    var m1 = map[pad2(match[2])];
    var m2 = map[pad2(match[4])];

    if (m1 && m2) {
      return m1 + " " + match[1] + " a " + m2 + " " + match[3];
    }

    return value;
  }

  function getFallbackMemoDate(data) {
    data = data || {};

    if (data.memo && data.memo.fechaIso) {
      var memoDate = new Date(data.memo.fechaIso + "T12:00:00");

      if (isValidDate(memoDate)) {
        return memoDate;
      }
    }

    if (data.fechaDocumentoIso) {
      var isoDate = new Date(String(data.fechaDocumentoIso) + "T12:00:00");

      if (isValidDate(isoDate)) {
        return isoDate;
      }
    }

    var fromPeriod = getMemoDateFromPeriodo(data.periodo || data.periodoLabel || data.periodoId || "");

    if (fromPeriod) {
      return fromPeriod;
    }

    return new Date();
  }

  function obtenerCodigoMemo(data) {
    if (data && data.memo && data.memo.codigoCompleto) {
      return data.memo.codigoCompleto;
    }

    if (data && data.memoCodigoCompleto) {
      return data.memoCodigoCompleto;
    }

    if (data && data.codigoMemo) {
      return data.codigoMemo;
    }

    var parts = getDateParts(getFallbackMemoDate(data));

    return "MEM-ITSQMET-UTET-" + parts.codigoMes + "-01";
  }

  function obtenerFechaDocumento(data) {
    if (data && data.fechaDocumento) {
      return data.fechaDocumento;
    }

    if (data && data.memo && data.memo.fechaHumana) {
      return data.memo.fechaHumana;
    }

    return getFechaHumana(getFallbackMemoDate(data));
  }

  function safeText(value) {
    return String(value == null ? "" : value);
  }

  function drawJustifiedText(doc, text, x, y, maxWidth, lineHeight) {
    var lines = doc.splitTextToSize(safeText(text), maxWidth);

    doc.text(lines, x, y, {
      align: "justify",
      maxWidth: maxWidth
    });

    return y + (lines.length * lineHeight);
  }

  function ensureSpace(doc, cursorY, needed, marginTop) {
    if (cursorY + needed > 272) {
      doc.addPage();
      return marginTop;
    }

    return cursorY;
  }

  function normalizeLegacyCronograma(cronograma) {
    if (!Array.isArray(cronograma) || cronograma.length === 0) {
      return [];
    }

    return cronograma.map(function (row) {
      var r = Array.isArray(row) ? row : [];

      return [
        safeText(r[0]),
        safeText(r[1]),
        safeText(r[2])
      ];
    });
  }

  function normalizeTables(data) {
    data = data || {};

    if (Array.isArray(data.tablas) && data.tablas.length > 0) {
      return data.tablas.slice(0, 4).map(function (tabla, index) {
        var columnas = Array.isArray(tabla.columnas) && tabla.columnas.length
          ? tabla.columnas
          : ["Actividad", "Fecha inicio", "Fecha fin"];

        var filas = Array.isArray(tabla.filas)
          ? tabla.filas
          : [];

        return {
          index: index + 1,
          titulo: safeText(tabla.titulo || "Tabla " + (index + 1) + ". Cronograma"),
          columnas: columnas.slice(0, 3).map(safeText),
          filas: filas.map(function (fila) {
            var r = Array.isArray(fila) ? fila : [];

            return [
              safeText(r[0]),
              safeText(r[1]),
              safeText(r[2])
            ];
          })
        };
      });
    }

    var legacy = normalizeLegacyCronograma(data.cronograma);

    if (legacy.length > 0) {
      return [
        {
          index: 1,
          titulo: "Cronograma",
          columnas: legacy[0],
          filas: legacy.slice(1)
        }
      ];
    }

    return [];
  }

  function drawPageFooter(doc, pageNumber, pageCount) {
    var width = doc.internal.pageSize.getWidth();

    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Página " + pageNumber + " de " + pageCount, width / 2, 287, {
      align: "center"
    });
    doc.setTextColor(0, 0, 0);
  }

  function drawInstitutionalHeader(doc, logoBase64, margin) {
    var cursorY = 14;

    if (logoBase64) {
      try {
        var props = doc.getImageProperties(logoBase64);
        var logoHeight = 22;
        var logoWidth = (props.width / props.height) * logoHeight;

        if (logoWidth > 60) {
          logoWidth = 60;
          logoHeight = (props.height / props.width) * logoWidth;
        }

        doc.addImage(logoBase64, "PNG", margin, cursorY, logoWidth, logoHeight);
      } catch (error) {
        console.warn("[MEMCOM_PDF] No se pudo insertar logo:", error);
      }
    }

    return 49;
  }

  function drawTable(doc, tabla, margin, cursorY, contentWidth) {
    if (!tabla || !Array.isArray(tabla.filas) || tabla.filas.length === 0) {
      return cursorY;
    }

    var headers = tabla.columnas || ["Actividad", "Fecha inicio", "Fecha fin"];

    var colWidths = [
      Math.round(contentWidth * 0.56),
      Math.round(contentWidth * 0.22),
      Math.round(contentWidth * 0.22)
    ];

    var tableWidth = colWidths[0] + colWidths[1] + colWidths[2];
    var rowHeight = 8;
    var headerHeight = 9;

    function drawHeader() {
      var hX = margin;

      doc.setFillColor(37, 99, 235);
      doc.setTextColor(255, 255, 255);
      doc.setDrawColor(37, 99, 235);
      doc.rect(margin, cursorY, tableWidth, headerHeight, "F");

      doc.setFont("times", "bold");
      doc.setFontSize(9);

      headers.forEach(function (header, index) {
        var w = colWidths[index] || 30;
        doc.text(safeText(header), hX + 2, cursorY + 6);
        hX += w;
      });

      cursorY += headerHeight;

      doc.setTextColor(0, 0, 0);
      doc.setFont("times", "normal");
      doc.setFontSize(9);
    }

    cursorY = ensureSpace(doc, cursorY, headerHeight + rowHeight, 22);
    drawHeader();

    tabla.filas.forEach(function (row, rowIndex) {
      var maxLines = 1;
      var prepared = row.map(function (cell, index) {
        var lines = doc.splitTextToSize(safeText(cell), (colWidths[index] || 30) - 4);
        maxLines = Math.max(maxLines, lines.length);
        return lines;
      });

      var dynamicHeight = Math.max(rowHeight, maxLines * 4.5 + 4);

      if (cursorY + dynamicHeight > 272) {
        doc.addPage();
        cursorY = 22;
        drawHeader();
      }

      if (rowIndex % 2 === 1) {
        doc.setFillColor(245, 247, 250);
        doc.rect(margin, cursorY, tableWidth, dynamicHeight, "F");
      }

      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, cursorY, tableWidth, dynamicHeight, "S");

      doc.line(margin + colWidths[0], cursorY, margin + colWidths[0], cursorY + dynamicHeight);
      doc.line(
        margin + colWidths[0] + colWidths[1],
        cursorY,
        margin + colWidths[0] + colWidths[1],
        cursorY + dynamicHeight
      );

      var rX = margin;

      prepared.forEach(function (lines, index) {
        doc.text(lines, rX + 2, cursorY + 5);
        rX += colWidths[index] || 30;
      });

      cursorY += dynamicHeight;
    });

    return cursorY;
  }

  function drawTableSection(doc, tabla, margin, cursorY, contentWidth) {
    var neededForTitleAndHeader = 22;

    cursorY = ensureSpace(doc, cursorY, neededForTitleAndHeader, 22);

    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    var titleLines = doc.splitTextToSize(safeText(tabla.titulo), contentWidth);
    doc.text(titleLines, margin, cursorY);

    cursorY += titleLines.length * 5 + 3;

    doc.setFont("times", "normal");
    doc.setFontSize(9);

    cursorY = drawTable(doc, tabla, margin, cursorY, contentWidth);
    cursorY += 8;

    return cursorY;
  }

  async function generatePdfBytes(data) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("No está cargada la librería jsPDF.");
    }

    data = data || {};

    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait"
    });

    var width = doc.internal.pageSize.getWidth();
    var margin = 25.4;
    var contentWidth = width - margin * 2;
    var cursorY;
    var logoBase64 = await getBase64ImageFromUrl("./logo.png");

    var codigoMemo = obtenerCodigoMemo(data);
    var fechaDocumento = obtenerFechaDocumento(data);
    var periodo = formatearPeriodoHumano(data.periodo || "");
    var tipo = safeText(data.tipo || "EXAMEN COMPLEXIVO").toUpperCase();
    var tablas = normalizeTables(data);

    cursorY = drawInstitutionalHeader(doc, logoBase64, margin);

    doc.setFont("times", "bold");
    doc.setFontSize(12);

    doc.text("MEMORANDO No. " + codigoMemo, width / 2, cursorY, {
      align: "center"
    });

    cursorY += 12;

    doc.setFont("times", "normal");
    doc.setFontSize(11);

    doc.text("Quito, " + fechaDocumento, margin, cursorY);
    cursorY += 12;

    doc.setFont("times", "bold");
    doc.text("PARA:", margin, cursorY);
    doc.setFont("times", "normal");
    doc.text("Estudiantes del proceso de titulación", margin + 24, cursorY);
    cursorY += 7;

    doc.setFont("times", "bold");
    doc.text("DE:", margin, cursorY);
    doc.setFont("times", "normal");
    doc.text("Unidad de Titulación y Eficiencia Terminal", margin + 24, cursorY);
    cursorY += 7;

    doc.setFont("times", "bold");
    doc.text("ASUNTO:", margin, cursorY);
    doc.setFont("times", "normal");
    doc.text("Cronograma del proceso de titulación", margin + 24, cursorY);
    cursorY += 7;

    doc.setFont("times", "bold");
    doc.text("PERÍODO:", margin, cursorY);
    doc.setFont("times", "normal");
    doc.text(periodo || "No especificado", margin + 24, cursorY);
    cursorY += 12;

    doc.setFont("times", "normal");
    doc.setFontSize(11);

    var intro =
      "Por medio del presente, se informa el cronograma correspondiente al proceso de " +
      tipo +
      " para el período " +
      (periodo || "seleccionado") +
      ". Las actividades detalladas a continuación deberán ser consideradas por los estudiantes y áreas involucradas para el adecuado cumplimiento del proceso de titulación.";

    cursorY = drawJustifiedText(doc, intro, margin, cursorY, contentWidth, 5);
    cursorY += 8;

    if (tablas.length > 0) {
      tablas.forEach(function (tabla) {
        cursorY = drawTableSection(doc, tabla, margin, cursorY, contentWidth);
      });
    } else {
      doc.setFont("times", "bold");
      doc.text("Cronograma", margin, cursorY);
      cursorY += 7;

      doc.setFont("times", "normal");
      doc.text("No se registró cronograma.", margin, cursorY);
      cursorY += 10;
    }

    cursorY = ensureSpace(doc, cursorY, 45, 22);

    var cierre = [
      "Se recuerda a los estudiantes que el cumplimiento del cronograma está sujeto a la entrega oportuna de actividades, asistencia a las evaluaciones programadas y observancia de los requisitos académicos y administrativos establecidos para el proceso de titulación.",
      "Cualquier modificación al cronograma será comunicada oportunamente a través de los canales institucionales oficiales.",
      "Sin otro particular, se solicita tomar en cuenta la presente información."
    ];

    cierre.forEach(function (paragraph) {
      cursorY = ensureSpace(doc, cursorY, 20, 22);
      cursorY = drawJustifiedText(doc, paragraph, margin, cursorY, contentWidth, 5);
      cursorY += 5;
    });

    cursorY += 10;
    cursorY = ensureSpace(doc, cursorY, 45, 22);

    doc.setFont("times", "normal");
    doc.text("Atentamente,", margin, cursorY);
    cursorY += 22;

    doc.setFont("times", "bold");
    doc.text("MSc. Jefferson Villarreal", margin, cursorY);
    cursorY += 5;

    doc.setFont("times", "normal");
    doc.text("Coordinador de Titulación", margin, cursorY);
    cursorY += 5;
    doc.text("Unidad de Titulación y Eficiencia Terminal", margin, cursorY);

    var pageCount = doc.internal.getNumberOfPages();

    for (var page = 1; page <= pageCount; page++) {
      doc.setPage(page);
      drawPageFooter(doc, page, pageCount);
    }

    return doc.output("arraybuffer");
  }

  window.MEMCOM.pdf = {
    generatePdfBytes: generatePdfBytes,
    obtenerCodigoMemo: obtenerCodigoMemo,
    obtenerFechaDocumento: obtenerFechaDocumento,
    formatearPeriodoHumano: formatearPeriodoHumano,
    getMemoDateFromPeriodo: getMemoDateFromPeriodo
  };
})(window);