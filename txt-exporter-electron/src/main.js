/**
 * ARCHIVO: src/main.js
 * FUNCIÓN:
 * - Proceso principal de Electron (Main Process).
 * - Gestiona la ventana, el ciclo de vida de la app y la comunicación IPC.
 * - Coordina el escaneo (Core) y las exportaciones (TXT/PDF).
 * - Envía notificaciones centralizadas al renderer.
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");

// Importamos los módulos de lógica
const Core = require("./app.core");
const PdfExporter = require("./pdf/pdf.exporter");

let mainWindow = null;
let lastScan = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 800,
    minHeight: 600,
    title: "TXT Exporter",
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, "ui", "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // mainWindow.webContents.openDevTools();
}

// --- Ciclo de vida ---

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// --- Helpers ---

function safeBasename(p) {
  const name = path.basename(p || "").trim();
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").replace(/\s+/g, "_");
}

function nowStamp() {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}_${hh}${mi}`;
}

function downloadsDir() {
  return app.getPath("downloads");
}

function buildOutputName(rootPath, kind, scan) {
  const rootName = safeBasename(rootPath);
  const stamp = nowStamp();
  const total = scan?.files?.length ?? 0;
  const skipped = scan?.skipped?.length ?? 0;

  return `${rootName}__${kind}__${stamp}__${total}-files__${skipped}-skipped`;
}

function normalizeErrorMessage(err) {
  const raw = String(err?.message || err || "").trim();

  if (!raw) return "Ocurrió un error no especificado.";

  if (raw.includes("ERR_INVALID_URL")) {
    return "El contenido del reporte era demasiado grande para el método anterior de carga.";
  }

  if (raw.length > 280) {
    return `${raw.slice(0, 280)}...`;
  }

  return raw;
}

function notify(type, message, extra = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("ui:notify", { type, message, ...extra });
}

// --- IPC ---

ipcMain.handle("ui:selectRoot", async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: "Selecciona la carpeta del proyecto a analizar",
    properties: ["openDirectory"]
  });

  if (res.canceled || !res.filePaths?.[0]) {
    return { ok: false };
  }

  // Importante:
  // al seleccionar una nueva carpeta se invalida el escaneo anterior.
  lastScan = null;

  return { ok: true, rootPath: res.filePaths[0] };
});

ipcMain.handle("ui:scanRoot", async (_evt, payload) => {
  try {
    const rootPath = payload?.rootPath;
    if (!rootPath) {
      const message = "No se recibió la ruta de la carpeta.";
      notify("warn", message);
      return { ok: false, error: message };
    }

    notify("info", "Analizando estructura y archivos...");

    const scan = await Core.scanProject(rootPath, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("ui:scanProgress", progress);
      }
    });

    lastScan = scan;

    notify("success", `Análisis completado: ${scan.files.length} archivos detectados.`);
    return { ok: true, scan };
  } catch (err) {
    console.error(err);
    const message = normalizeErrorMessage(err);
    notify("error", `Error al escanear: ${message}`);
    return { ok: false, error: message };
  }
});

ipcMain.handle("ui:exportTxt", async () => {
  try {
    if (!lastScan?.rootPath) {
      const message = "Primero debes escanear una carpeta.";
      notify("warn", message);
      return { ok: false, error: message };
    }

    const outDir = downloadsDir();
    const baseName = buildOutputName(lastScan.rootPath, "TXT", lastScan);
    const outFolder = path.join(outDir, `${baseName}__txt_convertidos`);

    if (!fs.existsSync(outFolder)) {
      fs.mkdirSync(outFolder, { recursive: true });
    }

    notify("info", "Procesando archivos TXT...");

    const result = await Core.exportTxtBundle(lastScan, outFolder);

    notify("success", "Exportación TXT exitosa en Descargas.", {
      outputPath: result.todoTxtPath,
      outputDir: outFolder
    });

    return {
      ok: true,
      outputDir: outFolder,
      todoTxtPath: result.todoTxtPath
    };
  } catch (err) {
    console.error(err);
    const message = normalizeErrorMessage(err);
    notify("error", `Error exportando TXT: ${message}`);
    return { ok: false, error: message };
  }
});

ipcMain.handle("ui:exportPdf", async () => {
  try {
    if (!lastScan?.rootPath) {
      const message = "Primero debes escanear una carpeta.";
      notify("warn", message);
      return { ok: false, error: message };
    }

    const outDir = downloadsDir();
    const baseName = buildOutputName(lastScan.rootPath, "PDF", lastScan);
    const pdfPath = path.join(outDir, `${baseName}.pdf`);

    notify("info", "Generando PDF con índice... esto puede tardar un poco.");

    await PdfExporter.exportReportPdf({
      scan: lastScan,
      outPath: pdfPath
    });

    notify("success", "PDF generado exitosamente en Descargas.", {
      outputPath: pdfPath,
      outputDir: outDir
    });

    return { ok: true, pdfPath };
  } catch (err) {
    console.error(err);
    const message = normalizeErrorMessage(err);
    notify("error", `Error exportando PDF: ${message}`);
    return { ok: false, error: message };
  }
});

ipcMain.handle("ui:openPath", async (_evt, payload) => {
  try {
    const targetPath = payload?.path;

    if (!targetPath) {
      return { ok: false, error: "Ruta no proporcionada." };
    }

    if (!fs.existsSync(targetPath)) {
      return { ok: false, error: "El archivo o carpeta ya no existe." };
    }

    const openResult = await shell.openPath(targetPath);

    if (typeof openResult === "string" && openResult.trim()) {
      return { ok: false, error: openResult.trim() };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: normalizeErrorMessage(err) };
  }
});