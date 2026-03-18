/**
 * ARCHIVO: pdf.exporter.js
 * RUTA: src/pdf/pdf.exporter.js
 * FUNCIÓN (FUERA DEL CÓDIGO):
 * - Exporta un PDF desde HTML usando Electron (printToPDF).
 * - Evita usar data URLs gigantes para proyectos grandes.
 * - Crea un HTML temporal en disco, lo renderiza en una BrowserWindow oculta y guarda el PDF.
 */

const { BrowserWindow } = require("electron");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

const Builder = require("./pdf.builder");

function ensureDirSync(dirPath) {
  if (!dirPath) return;
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function createTempHtmlFile(html) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "txt-exporter-pdf-"));
  const tempHtmlPath = path.join(tempDir, "report.html");
  fs.writeFileSync(tempHtmlPath, html, "utf8");
  return { tempDir, tempHtmlPath };
}

async function waitForStableLayout(win) {
  if (!win || win.isDestroyed()) return;

  try {
    await win.webContents.executeJavaScript(
      `
      new Promise((resolve) => {
        const done = () => setTimeout(resolve, 120);

        try {
          if (document && document.fonts && document.fonts.ready) {
            document.fonts.ready.then(done).catch(done);
            return;
          }
        } catch (_) {}

        done();
      });
      `,
      true
    );
  } catch (_) {
    // Si executeJavaScript falla por alguna razón, seguimos con una espera breve.
  }

  await new Promise((resolve) => setTimeout(resolve, 180));
}

async function loadHtmlFromTempFile(win, html) {
  const { tempDir, tempHtmlPath } = createTempHtmlFile(html);

  try {
    const fileUrl = pathToFileURL(tempHtmlPath).href;
    await win.loadURL(fileUrl);
    await waitForStableLayout(win);
    return { tempDir, tempHtmlPath };
  } catch (error) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

async function exportReportPdf({ scan, outPath }) {
  if (!scan || !scan.rootPath) {
    throw new Error("scan inválido (rootPath vacío).");
  }

  if (!outPath) {
    throw new Error("outPath vacío.");
  }

  const html = Builder.buildHtmlReport(scan);

  if (typeof html !== "string" || !html.trim()) {
    throw new Error("No se pudo construir el HTML del reporte PDF.");
  }

  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    autoHideMenuBar: true,
    backgroundColor: "#ffffff",
    webPreferences: {
      contextIsolation: true,
      sandbox: true
    }
  });

  let tempDir = "";

  try {
    const loaded = await loadHtmlFromTempFile(win, html);
    tempDir = loaded.tempDir;

    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      marginsType: 0,
      pageSize: "A4",
      preferCSSPageSize: true
    });

    const dir = path.dirname(outPath);
    ensureDirSync(dir);

    fs.writeFileSync(outPath, pdfBuffer);
    return outPath;
  } finally {
    if (!win.isDestroyed()) {
      win.destroy();
    }

    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

module.exports = { exportReportPdf };