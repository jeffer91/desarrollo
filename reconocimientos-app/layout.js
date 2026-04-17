window.ReconLayout = (() => {
  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function round(value) {
    return Math.round(value * 100) / 100;
  }

  function getScale(targetWidth, targetHeight, referenceWidth, referenceHeight) {
    return {
      sx: targetWidth / referenceWidth,
      sy: targetHeight / referenceHeight
    };
  }

  function scaleNumber(value, factor) {
    return round(value * factor);
  }

  function scaleBox(box, sx, sy) {
    const scaled = {
      ...box,
      x: scaleNumber(box.x, sx),
      y: scaleNumber(box.y, sy),
      width: scaleNumber(box.width, sx),
      fontSize: scaleNumber(box.fontSize, Math.min(sx, sy)),
      minFontSize: scaleNumber(box.minFontSize, Math.min(sx, sy)),
      lineHeight: scaleNumber(box.lineHeight, sy)
    };

    scaled._lineFactor = scaled.lineHeight / Math.max(scaled.fontSize, 1);
    return scaled;
  }

  function scaleLine(line, sx, sy) {
    return {
      ...line,
      x1: scaleNumber(line.x1, sx),
      y1: scaleNumber(line.y1, sy),
      x2: scaleNumber(line.x2, sx),
      y2: scaleNumber(line.y2, sy),
      width: scaleNumber(line.width, Math.min(sx, sy))
    };
  }

  function estimateCharFactor(char) {
    if (char === " ") return 0.32;
    if (/[.,:;'"`´’‘]/.test(char)) return 0.24;
    if (/[(){}\[\]¡!¿?]/.test(char)) return 0.30;
    if (/[1ilÍíIjtfr]/.test(char)) return 0.34;
    if (/[mwMW@#%&ÓÚÁÉÑQG]/.test(char)) return 0.86;
    if (/[A-ZÁÉÍÓÚÑ]/.test(char)) return 0.66;
    if (/[a-záéíóúñ0-9]/.test(char)) return 0.54;
    return 0.56;
  }

  function estimateTextWidth(text, fontSize, weight = 400) {
    const safeText = String(text || "");
    const weightFactor = Number(weight) >= 700 ? 1.03 : 1;
    let total = 0;

    for (const char of safeText) {
      total += estimateCharFactor(char);
    }

    return total * fontSize * weightFactor;
  }

  function wrapText(text, maxWidth, fontSize, weight) {
    const safeText = String(text || "").replace(/\s+/g, " ").trim();
    if (!safeText) return [];

    const words = safeText.split(" ");
    const lines = [];
    let current = "";

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const testWidth = estimateTextWidth(test, fontSize, weight);

      if (!current || testWidth <= maxWidth) {
        current = test;
      } else {
        lines.push(current);
        current = word;
      }
    }

    if (current) {
      lines.push(current);
    }

    return lines;
  }

  function getBlockHeight(block) {
    if (!block || !block.lines || !block.lines.length) return 0;
    return block.fontSize + (block.lines.length - 1) * block.lineHeight;
  }

  function cloneBoxWithSize(box, fontSize) {
    const cloned = { ...box };
    cloned.fontSize = fontSize;
    cloned.lineHeight = round(fontSize * cloned._lineFactor);
    return cloned;
  }

  function fitWrappedBlock(text, box) {
    let size = box.fontSize;
    let lastResult = null;

    while (size >= box.minFontSize) {
      const currentBox = cloneBoxWithSize(box, size);
      const lines = wrapText(text, currentBox.width, currentBox.fontSize, currentBox.weight);

      lastResult = {
        x: currentBox.x,
        y: currentBox.y,
        width: currentBox.width,
        fontSize: currentBox.fontSize,
        lineHeight: currentBox.lineHeight,
        weight: currentBox.weight,
        align: currentBox.align || "center",
        lines
      };

      if (lines.length <= currentBox.maxLines) {
        return {
          ...lastResult,
          fits: true
        };
      }

      size -= 1;
    }

    const minBox = cloneBoxWithSize(box, box.minFontSize);
    return {
      x: minBox.x,
      y: minBox.y,
      width: minBox.width,
      fontSize: minBox.fontSize,
      lineHeight: minBox.lineHeight,
      weight: minBox.weight,
      align: minBox.align || "center",
      lines: wrapText(text, minBox.width, minBox.fontSize, minBox.weight),
      fits: false
    };
  }

  function fitSingleLineBlock(text, box) {
    let size = box.fontSize;

    while (size >= box.minFontSize) {
      const width = estimateTextWidth(text, size, box.weight);
      if (width <= box.width) {
        return {
          x: box.x,
          y: box.y,
          width: box.width,
          fontSize: size,
          lineHeight: round(size * box._lineFactor),
          weight: box.weight,
          align: box.align || "center",
          lines: [String(text || "")],
          fits: true
        };
      }
      size -= 1;
    }

    return {
      x: box.x,
      y: box.y,
      width: box.width,
      fontSize: box.minFontSize,
      lineHeight: round(box.minFontSize * box._lineFactor),
      weight: box.weight,
      align: box.align || "center",
      lines: [String(text || "")],
      fits: false
    };
  }

  function fitNameBlock(text, box) {
    const single = fitSingleLineBlock(text, box);
    if (single.fits) return single;

    let size = box.fontSize;
    while (size >= box.minFontSize) {
      const currentBox = cloneBoxWithSize(box, size);
      const lines = wrapText(text, currentBox.width, currentBox.fontSize, currentBox.weight);

      if (lines.length <= box.maxLines) {
        return {
          x: currentBox.x,
          y: currentBox.y,
          width: currentBox.width,
          fontSize: currentBox.fontSize,
          lineHeight: currentBox.lineHeight,
          weight: currentBox.weight,
          align: currentBox.align || "center",
          lines,
          fits: true
        };
      }

      size -= 1;
    }

    const minBox = cloneBoxWithSize(box, box.minFontSize);
    return {
      x: minBox.x,
      y: minBox.y,
      width: minBox.width,
      fontSize: minBox.fontSize,
      lineHeight: minBox.lineHeight,
      weight: minBox.weight,
      align: minBox.align || "center",
      lines: wrapText(text, minBox.width, minBox.fontSize, minBox.weight),
      fits: false
    };
  }

  function shrinkBox(box, amount = 1) {
    if (box.fontSize <= box.minFontSize) return false;
    box.fontSize = Math.max(box.minFontSize, box.fontSize - amount);
    box.lineHeight = round(box.fontSize * box._lineFactor);
    return true;
  }

  function buildParagraphText(record, settings) {
    return `Por su destacada trayectoria académica y por haber alcanzado un promedio de ${record.promedio} en la carrera de ${record.carrera}, cohorte ${settings.cohorte}.`;
  }

  function buildDateText(settings) {
    if (settings.certificateDate) {
      const [year, month, day] = settings.certificateDate.split("-").map(Number);
      const monthName = settings.mesNombre || "";
      return `Quito, ${day} de ${monthName} de ${year}.`;
    }
    return `Quito, ${settings.mesNombre} de ${settings.anio}.`;
  }

  function buildContent(record, settings, cfg) {
    return {
      intro: cfg.fixedText.intro,
      name: String(record?.nombre || "").trim().toUpperCase(),
      paragraph: buildParagraphText(record, settings),
      closing: cfg.fixedText.closing,
      date: buildDateText(settings),
      authority: cfg.fixedText.authority,
      cargo: cfg.fixedText.cargo
    };
  }

  function scaleFlow(flow, sy) {
    const scaled = {};
    for (const [key, value] of Object.entries(flow)) {
      scaled[key] = scaleNumber(value, sy);
    }
    return scaled;
  }

  function compute(record, settings, options = {}) {
    const cfg = window.ReconConfig;
    const targetWidth = options.width || cfg.reference.width;
    const targetHeight = options.height || cfg.reference.height;
    const { sx, sy } = getScale(
      targetWidth,
      targetHeight,
      cfg.reference.width,
      cfg.reference.height
    );

    const scaledLayout = {
      introBox: scaleBox(deepClone(cfg.layout.introBox), sx, sy),
      nameBox: scaleBox(deepClone(cfg.layout.nameBox), sx, sy),
      paragraphBox: scaleBox(deepClone(cfg.layout.paragraphBox), sx, sy),
      closingBox: scaleBox(deepClone(cfg.layout.closingBox), sx, sy),
      dateBox: scaleBox(deepClone(cfg.layout.dateBox), sx, sy),
      authorityBox: scaleBox(deepClone(cfg.layout.authorityBox), sx, sy),
      cargoBox: scaleBox(deepClone(cfg.layout.cargoBox), sx, sy),
      separatorLine: scaleLine(cfg.layout.separatorLine, sx, sy),
      signatureLine: scaleLine(cfg.layout.signatureLine, sx, sy),
      flow: scaleFlow(cfg.layout.flow, sy)
    };

    const content = buildContent(record, settings, cfg);

    let intro;
    let name;
    let paragraph;
    let closing;
    let date;
    let separatorLine;
    let overflow = 0;
    let guard = 0;

    const shrinkOrder = [
      scaledLayout.paragraphBox,
      scaledLayout.closingBox,
      scaledLayout.introBox,
      scaledLayout.dateBox,
      scaledLayout.nameBox
    ];

    do {
      intro = fitWrappedBlock(content.intro, scaledLayout.introBox);
      name = fitNameBlock(content.name, scaledLayout.nameBox);
      paragraph = fitWrappedBlock(content.paragraph, scaledLayout.paragraphBox);
      closing = fitWrappedBlock(content.closing, scaledLayout.closingBox);
      date = fitWrappedBlock(content.date, scaledLayout.dateBox);

      intro.y = scaledLayout.introBox.y;

      const introBottom = intro.y + getBlockHeight(intro);
      name.y = Math.max(
        scaledLayout.nameBox.y,
        introBottom + scaledLayout.flow.spaceAfterIntro
      );

      const nameBottom = name.y + getBlockHeight(name);

      separatorLine = {
        ...scaledLayout.separatorLine,
        y1: round(nameBottom + scaledLayout.flow.spaceAfterName),
        y2: round(nameBottom + scaledLayout.flow.spaceAfterName)
      };

      paragraph.y = round(separatorLine.y1 + scaledLayout.flow.spaceAfterLine);
      const paragraphBottom = paragraph.y + getBlockHeight(paragraph);

      closing.y = round(paragraphBottom + scaledLayout.flow.spaceAfterParagraph);
      const closingBottom = closing.y + getBlockHeight(closing);

      date.y = round(closingBottom + scaledLayout.flow.spaceAfterClosing);
      const dateBottom = date.y + getBlockHeight(date);

      const bottomLimit = scaledLayout.signatureLine.y1 - scaledLayout.flow.spaceBeforeSignature;
      overflow = round(dateBottom - bottomLimit);

      const fitsEverything =
        intro.fits &&
        name.fits &&
        paragraph.fits &&
        closing.fits &&
        date.fits &&
        overflow <= 0;

      if (fitsEverything) break;

      let changed = false;
      for (const box of shrinkOrder) {
        if (shrinkBox(box, 1)) {
          changed = true;
          break;
        }
      }

      if (!changed) break;
      guard += 1;
    } while (guard < 120);

    const authority = fitSingleLineBlock(content.authority, scaledLayout.authorityBox);
    authority.y = scaledLayout.authorityBox.y;

    const cargo = fitSingleLineBlock(content.cargo, scaledLayout.cargoBox);
    cargo.y = scaledLayout.cargoBox.y;

    return {
      size: {
        width: targetWidth,
        height: targetHeight
      },
      content,
      blocks: {
        intro,
        name,
        paragraph,
        closing,
        date,
        authority,
        cargo
      },
      lines: {
        separator: separatorLine,
        signature: scaledLayout.signatureLine
      }
    };
  }

  return {
    compute,
    estimateTextWidth,
    wrapText,
    getBlockHeight
  };
})();