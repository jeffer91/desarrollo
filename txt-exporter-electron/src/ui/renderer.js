/**
 * ARCHIVO: renderer.js
 * RUTA: src/ui/renderer.js
 * FUNCIÓN (FUERA DEL CÓDIGO):
 * - Controla la UI (renderer).
 * - Llama al main vía window.api: seleccionar carpeta, escanear, exportar TXT, exportar PDF.
 * - Muestra progreso y notificaciones con botones para abrir archivo/carpeta.
 * - Evita duplicar toasts que ya llegan desde main.js.
 */

const $ = (id) => document.getElementById(id);

const btnSelect = $("btnSelect");
const btnScan = $("btnScan");
const btnExportTxt = $("btnExportTxt");
const btnExportPdf = $("btnExportPdf");

const rootPathInput = $("rootPath");

const kIncluded = $("kIncluded");
const kSkipped = $("kSkipped");
const kDirs = $("kDirs");
const treeText = $("treeText");

const progressBar = $("progressBar");
const toastArea = $("toastArea");

let currentRoot = "";
let lastScan = null;
let isBusy = false;

function setProgress(pct) {
  const v = Math.max(0, Math.min(100, Number(pct) || 0));
  progressBar.style.width = `${v}%`;
}

function setBusy(nextBusy) {
  isBusy = Boolean(nextBusy);

  btnSelect.disabled = isBusy;
  btnScan.disabled = isBusy;
  btnExportTxt.disabled = isBusy;
  btnExportPdf.disabled = isBusy;
}

function clearSummary() {
  kIncluded.textContent = "0";
  kSkipped.textContent = "0";
  kDirs.textContent = "0";
  treeText.textContent = "(sin estructura)";
  setProgress(0);
}

function toast(type, message, actions = []) {
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;

  const msg = document.createElement("div");
  msg.className = "toast-message";
  msg.textContent = message;

  const btns = document.createElement("div");
  btns.className = "toast-actions";

  for (const action of actions) {
    const b = document.createElement("button");
    b.className = "btn btn-small";
    b.textContent = action.label;
    b.addEventListener("click", action.onClick);
    btns.appendChild(b);
  }

  el.appendChild(msg);
  if (actions.length) el.appendChild(btns);

  toastArea.prepend(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => el.classList.remove("show"), 9000);
  setTimeout(() => el.remove(), 11000);
}

function refreshSummary(scan) {
  if (!scan) return;

  kIncluded.textContent = String(scan.files?.length ?? 0);
  kSkipped.textContent = String(scan.skipped?.length ?? 0);
  treeText.textContent = scan.treeText || "(sin estructura)";
}

async function openPathSafely(targetPath) {
  const res = await window.api.openPath(targetPath);
  if (!res?.ok) {
    toast("error", res?.error || "No se pudo abrir el archivo o carpeta.");
  }
}

btnSelect.addEventListener("click", async () => {
  if (isBusy) return;

  const res = await window.api.selectRoot();
  if (!res.ok) return;

  currentRoot = res.rootPath;
  rootPathInput.value = currentRoot;

  // Se invalida el resumen previo hasta volver a escanear.
  lastScan = null;
  clearSummary();

  toast("info", "Carpeta seleccionada. Ahora puedes escanear.");
});

btnScan.addEventListener("click", async () => {
  if (isBusy) return;

  if (!currentRoot) {
    toast("warn", "Primero elige una carpeta.");
    return;
  }

  setBusy(true);
  setProgress(5);

  try {
    const res = await window.api.scanRoot(currentRoot);

    if (!res.ok) {
      setProgress(0);
      return;
    }

    lastScan = res.scan;
    refreshSummary(lastScan);
    setProgress(100);
  } finally {
    setBusy(false);
  }
});

btnExportTxt.addEventListener("click", async () => {
  if (isBusy) return;

  if (!lastScan) {
    toast("warn", "Primero escanea una carpeta.");
    return;
  }

  setBusy(true);

  try {
    await window.api.exportTxt();
    // No mostramos toast aquí.
    // main.js ya envía la notificación correcta con acciones.
  } finally {
    setBusy(false);
  }
});

btnExportPdf.addEventListener("click", async () => {
  if (isBusy) return;

  if (!lastScan) {
    toast("warn", "Primero escanea una carpeta.");
    return;
  }

  setBusy(true);

  try {
    await window.api.exportPdf();
    // No mostramos toast aquí.
    // main.js ya envía la notificación correcta con acciones.
  } finally {
    setBusy(false);
  }
});

// Eventos desde main
window.api.onScanProgress((p) => {
  kDirs.textContent = String(p.visitedDirs ?? 0);
  kIncluded.textContent = String(p.foundFiles ?? 0);
  kSkipped.textContent = String(p.skipped ?? 0);

  const rough = Math.min(90, 10 + Math.floor((p.visitedDirs || 0) / 6));
  setProgress(rough);
});

window.api.onNotify((payload) => {
  const type = payload?.type || "info";
  const message = payload?.message || "";
  const outputPath = payload?.outputPath;
  const outputDir = payload?.outputDir;

  const actions = [];

  if (outputPath) {
    actions.push({
      label: "Abrir resultado",
      onClick: () => openPathSafely(outputPath)
    });
  }

  if (outputDir) {
    actions.push({
      label: "Abrir carpeta",
      onClick: () => openPathSafely(outputDir)
    });
  }

  toast(type, message, actions);
});