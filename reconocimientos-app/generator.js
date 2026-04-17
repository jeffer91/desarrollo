window.ReconGenerator = (() => {
  const imageCache = new Map();

  function setCanvasFont(ctx, size, weight, family) {
    ctx.font = `${weight} ${size}px ${family}`;
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      if (imageCache.has(src)) {
        resolve(imageCache.get(src));
        return;
      }

      const image = new Image();
      image.onload = () => {
        imageCache.set(src, image);
        resolve(image);
      };
      image.onerror = () => resolve(null);
      image.src = src;
    });
  }

  function drawFallbackBackground(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#f8f9fc";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#c8a74c";
    ctx.lineWidth = 4;
    ctx.strokeRect(70, 90, width - 140, height - 160);

    ctx.fillStyle = "#081144";
    ctx.fillRect(0, height - 160, width, 160);

    ctx.beginPath();
    ctx.moveTo(0, height - 180);
    ctx.quadraticCurveTo(width * 0.35, height - 40, width, height - 165);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = "#c8ae4f";
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, height - 200);
    ctx.quadraticCurveTo(width * 0.38, height - 65, width, height - 185);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = "#091245";
    ctx.fill();
  }

  async function imageToDataUri(src) {
    const image = await loadImage(src);
    if (!image) return null;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = image.naturalWidth || image.width;
    tempCanvas.height = image.naturalHeight || image.height;

    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(image, 0, 0);

    return tempCanvas.toDataURL("image/png");
  }

  function drawCanvasLine(ctx, line, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = line.width || 2;
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();
  }

  function drawCanvasBlock(ctx, block, family, color) {
    if (!block || !block.lines || !block.lines.length) return;

    setCanvasFont(ctx, block.fontSize, block.weight || 400, family);
    ctx.fillStyle = color;
    ctx.textAlign = block.align || "center";
    ctx.textBaseline = "top";

    const centerX = block.x + block.width / 2;
    let currentY = block.y;

    for (const line of block.lines) {
      ctx.fillText(line, centerX, currentY);
      currentY += block.lineHeight;
    }
  }

  async function renderRecognition(canvas, record, settings) {
    const cfg = window.ReconConfig;
    const layout = window.ReconLayout.compute(record, settings, {
      width: cfg.canvas.width,
      height: cfg.canvas.height
    });

    const ctx = canvas.getContext("2d");
    canvas.width = cfg.canvas.width;
    canvas.height = cfg.canvas.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const template = await loadImage(cfg.templateImage);
    if (template) {
      ctx.drawImage(template, 0, 0, canvas.width, canvas.height);
    } else {
      drawFallbackBackground(ctx, canvas.width, canvas.height);
    }

    const family = cfg.fonts.certificate.normal;
    const strongFamily = cfg.fonts.certificate.strong;

    drawCanvasBlock(ctx, layout.blocks.intro, family, cfg.colors.main);
    drawCanvasBlock(ctx, layout.blocks.name, strongFamily, cfg.colors.main);
    drawCanvasLine(ctx, layout.lines.separator, cfg.colors.line);
    drawCanvasBlock(ctx, layout.blocks.paragraph, family, cfg.colors.main);
    drawCanvasBlock(ctx, layout.blocks.closing, family, cfg.colors.main);
    drawCanvasBlock(ctx, layout.blocks.date, family, cfg.colors.main);
    drawCanvasLine(ctx, layout.lines.signature, cfg.colors.softLine);
    drawCanvasBlock(ctx, layout.blocks.authority, strongFamily, cfg.colors.signature);
    drawCanvasBlock(ctx, layout.blocks.cargo, family, cfg.colors.signature);
  }

  function drawPdfLine(page, pageHeight, line, color) {
    page.drawLine({
      start: { x: line.x1, y: pageHeight - line.y1 },
      end: { x: line.x2, y: pageHeight - line.y2 },
      thickness: line.width || 1,
      color
    });
  }

  function drawPdfBlock(page, pageHeight, block, font, color) {
    if (!block || !block.lines || !block.lines.length) return;

    const centerX = block.x + block.width / 2;
    let currentY = block.y;

    for (const line of block.lines) {
      const textWidth = font.widthOfTextAtSize(line, block.fontSize);
      const drawX = centerX - textWidth / 2;
      const drawY = pageHeight - currentY - block.fontSize;

      page.drawText(line, {
        x: drawX,
        y: drawY,
        size: block.fontSize,
        font,
        color
      });

      currentY += block.lineHeight;
    }
  }

  async function buildEditablePdf(record, settings) {
    const cfg = window.ReconConfig;
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;

    const pdfDoc = await PDFDocument.create();
    const pageWidth = cfg.pdf.page.width;
    const pageHeight = cfg.pdf.page.height;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    const regularFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const mainColor = rgb(0.129, 0.192, 0.373);
    const lineColor = rgb(0.176, 0.224, 0.412);
    const signatureColor = rgb(0.114, 0.114, 0.114);
    const softLineColor = rgb(0.55, 0.56, 0.60);

    const templateUri = await imageToDataUri(cfg.templateImage);
    if (templateUri) {
      const templateImage = await pdfDoc.embedPng(templateUri);
      page.drawImage(templateImage, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight
      });
    }

    const layout = window.ReconLayout.compute(record, settings, {
      width: pageWidth,
      height: pageHeight
    });

    drawPdfBlock(page, pageHeight, layout.blocks.intro, regularFont, mainColor);
    drawPdfBlock(page, pageHeight, layout.blocks.name, boldFont, mainColor);
    drawPdfLine(page, pageHeight, layout.lines.separator, lineColor);
    drawPdfBlock(page, pageHeight, layout.blocks.paragraph, regularFont, mainColor);
    drawPdfBlock(page, pageHeight, layout.blocks.closing, regularFont, mainColor);
    drawPdfBlock(page, pageHeight, layout.blocks.date, regularFont, mainColor);
    drawPdfLine(page, pageHeight, layout.lines.signature, softLineColor);
    drawPdfBlock(page, pageHeight, layout.blocks.authority, boldFont, signatureColor);
    drawPdfBlock(page, pageHeight, layout.blocks.cargo, regularFont, signatureColor);

    return await pdfDoc.save();
  }

  return {
    renderRecognition,
    buildEditablePdf
  };
})();