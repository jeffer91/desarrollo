/**
 * ARCHIVO: app.core.js
 * RUTA: src/app.core.js
 * FUNCIÓN (FUERA DEL CÓDIGO):
 * - Núcleo de negocio: escaneo de carpeta, filtrado por extensiones y exclusiones.
 * - Construye estructura (árbol), lista de archivos incluidos y omitidos.
 * - Exporta:
 *   a) Un TXT por archivo (con separadores)
 *   b) Un todo.txt consolidado (INFORMACIÓN GENERAL + contenido completo)
 */

const fs = require("fs");
const path = require("path");

const INCLUDE_EXTS = [".html", ".js", ".css", ".json"];
const EXCLUDE_DIRS = new Set(["node_modules", ".git", "dist", "build", "txt_convertidos"]);

function normalizeRel(p) {
  return p.split(path.sep).join("/");
}

function isExcludedDir(dirName) {
  return EXCLUDE_DIRS.has(String(dirName || "").toLowerCase());
}

function padLine(ch = "=", count = 110) {
  return ch.repeat(count);
}

function blockTitle(title) {
  return [
    padLine("="),
    padLine("#"),
    title,
    padLine("#"),
    padLine("="),
    padLine("-"),
    padLine("-"),
    ""
  ].join("\n");
}

function safeReadText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function walk(rootPath, onProgress) {
  const files = [];
  const skipped = [];

  const stack = [rootPath];
  let visitedDirs = 0;

  while (stack.length) {
    const current = stack.pop();
    visitedDirs++;

    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (e) {
      skipped.push({
        type: "dir",
        reason: `No se pudo leer: ${e.message}`,
        absPath: current,
        relPath: normalizeRel(path.relative(rootPath, current) || ".")
      });
      continue;
    }

    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      const rel = normalizeRel(path.relative(rootPath, abs));

      if (entry.isDirectory()) {
        if (isExcludedDir(entry.name)) {
          skipped.push({
            type: "dir",
            reason: "Carpeta excluida",
            absPath: abs,
            relPath: rel
          });
          continue;
        }
        stack.push(abs);
        continue;
      }

      if (!entry.isFile()) continue;

      const ext = path.extname(entry.name).toLowerCase();
      if (!INCLUDE_EXTS.includes(ext)) {
        skipped.push({
          type: "file",
          reason: `Extensión no incluida (${ext || "sin extensión"})`,
          absPath: abs,
          relPath: rel
        });
        continue;
      }

      let size = 0;
      try {
        size = fs.statSync(abs).size;
      } catch {
        // ignore
      }

      files.push({ absPath: abs, relPath: rel, ext, size });
    }

    if (onProgress && visitedDirs % 15 === 0) {
      onProgress({
        visitedDirs,
        foundFiles: files.length,
        skipped: skipped.length
      });
    }
  }

  // ordenar por ruta relativa
  files.sort((a, b) => a.relPath.localeCompare(b.relPath));

  return { files, skipped };
}

function buildTreeText(files) {
  // Árbol simple basado en rutas (solo incluidos)
  const root = {};
  for (const f of files) {
    const parts = f.relPath.split("/");
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      if (!node[part]) node[part] = isLast ? null : {};
      if (!isLast) node = node[part];
    }
  }

  const lines = [];
  function rec(node, indent) {
    const keys = Object.keys(node).sort((a, b) => a.localeCompare(b));
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const isLast = i === keys.length - 1;
      const prefix = indent + (isLast ? "└─ " : "├─ ");
      const child = node[k];
      if (child === null) {
        lines.push(prefix + k);
      } else {
        lines.push(prefix + k + "/");
        rec(child, indent + (isLast ? "   " : "│  "));
      }
    }
  }
  rec(root, "");
  return lines.join("\n");
}

async function scanProject(rootPath, onProgress) {
  const absRoot = path.resolve(rootPath);
  const { files, skipped } = walk(absRoot, onProgress);

  return {
    rootPath: absRoot,
    includeExts: [...INCLUDE_EXTS],
    excludeDirs: [...EXCLUDE_DIRS],
    files,
    skipped,
    treeText: buildTreeText(files),
    scannedAt: new Date().toISOString()
  };
}

function formatGeneralInfo(scan, outputHint) {
  const lines = [];
  lines.push(blockTitle("INFORMACIÓN GENERAL").trimEnd());
  lines.push(`FECHA/HORA: ${new Date().toISOString().replace("T", " ").slice(0, 19)}`);
  lines.push(`RAÍZ: ${scan.rootPath}`);
  lines.push(`INCLUYE: ${scan.includeExts.join(" ")}`);
  lines.push(`EXCLUYE CARPETAS: ${scan.excludeDirs.join(", ")}`);
  lines.push(`SALIDA: ${outputHint}`);
  lines.push(`TOTAL ARCHIVOS: ${scan.files.length}`);
  lines.push("");
  return lines.join("\n");
}

function formatFileBlock(index, file, codeText) {
  const n = index + 1;
  const header = [
    blockTitle(`ARCHIVO ${n}`).trimEnd(),
    `archivo ${n}: ${path.basename(file.relPath)}`,
    `ruta del archivo ${n}: ${file.relPath}`,
    `código completo del archivo ${n}:`,
    "",
    blockTitle(`CÓDIGO ${n} (INICIO)`).trimEnd(),
    codeText,
    "",
    blockTitle(`CÓDIGO ${n} (FIN)`).trimEnd()
  ];
  return header.join("\n");
}

function exportTxtBundle(scan, outFolder) {
  const outputHint = normalizeRel(path.relative(scan.rootPath, outFolder)) + "/";

  const todoParts = [];
  todoParts.push(formatGeneralInfo(scan, outputHint));
  todoParts.push(blockTitle("INICIO DE CONTENIDO"));

  // Un .txt por archivo + construir todo.txt
  for (let i = 0; i < scan.files.length; i++) {
    const f = scan.files[i];
    let code = "";
    try {
      code = safeReadText(f.absPath);
    } catch (e) {
      code = `/* ERROR: no se pudo leer el archivo: ${e.message} */`;
    }

    // 1) txt individual
    const single = [
      formatGeneralInfo(scan, outputHint),
      blockTitle("INICIO DE CONTENIDO"),
      formatFileBlock(i, f, code)
    ].join("\n");

    const safeRel = f.relPath.replace(/\//g, "__").replace(/[:*?"<>|]/g, "_");
    const outTxtPath = path.join(outFolder, `${String(i + 1).padStart(3, "0")}__${safeRel}.txt`);
    fs.writeFileSync(outTxtPath, single, "utf8");

    // 2) todo
    todoParts.push(formatFileBlock(i, f, code));
  }

  const todoTxtPath = path.join(outFolder, "todo.txt");
  fs.writeFileSync(todoTxtPath, todoParts.join("\n"), "utf8");

  return { todoTxtPath };
}

module.exports = {
  scanProject,
  exportTxtBundle
};
