/**
 * ARCHIVO: pdf.builder.js
 * RUTA: src/pdf/pdf.builder.js
 * FUNCIÓN (FUERA DEL CÓDIGO):
 * - Construye el HTML del reporte PDF con:
 *   1) Portada
 *   2) Resumen
 *   3) Índice (TOC) con links internos
 *   4) Estructura
 *   5) Archivos omitidos
 *   6) Código completo por archivo (con encabezados)
 */

const fs = require("fs");
const path = require("path");

function escHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function readTemplateFiles() {
  const templatePath = path.join(__dirname, "pdf.template.html");
  const stylesPath = path.join(__dirname, "pdf.styles.css");
  const template = fs.readFileSync(templatePath, "utf8");
  const styles = fs.readFileSync(stylesPath, "utf8");
  return { template, styles };
}

function fileFunctionGuess(relPath) {
  // “Función” mínima y útil sin inventar demasiado
  const base = path.basename(relPath).toLowerCase();
  if (base === "main.js") return "Proceso principal Electron: ventana + IPC.";
  if (base === "preload.js") return "Puente seguro IPC (contextBridge) hacia Renderer.";
  if (base === "renderer.js") return "Lógica de interfaz: botones, progreso, notificaciones.";
  if (base === "index.html") return "Estructura visual principal (UI).";
  if (base === "styles.css") return "Estilos visuales de la UI.";
  if (base.endsWith(".json")) return "Configuración / datos en formato JSON.";
  if (base.endsWith(".css")) return "Estilos CSS.";
  if (base.endsWith(".html")) return "Vista HTML.";
  if (base.endsWith(".js")) return "Módulo JavaScript.";
  return "Archivo del proyecto.";
}

function buildTOC(sections) {
  return `
    <ol class="toc">
      ${sections
        .map(
          (s) => `<li><a href="#${s.id}">${escHtml(s.title)}</a></li>`
        )
        .join("\n")}
    </ol>
  `;
}

function buildHtmlReport(scan) {
  const { template, styles } = readTemplateFiles();

  const rootName = path.basename(scan.rootPath);
  const when = new Date().toISOString().replace("T", " ").slice(0, 19);

  const sections = [
    { id: "sec-resumen", title: "1. Resumen general" },
    { id: "sec-estructura", title: "2. Estructura (archivos incluidos)" },
    { id: "sec-omitidos", title: "3. Archivos/carpeta omitidos" },
    { id: "sec-codigos", title: "4. Códigos (por archivo)" }
  ];

  const tocHtml = buildTOC(sections);

  const resumenHtml = `
    <div class="kv">
      <div class="k">Fecha/Hora</div><div class="v">${escHtml(when)}</div>
      <div class="k">Raíz</div><div class="v">${escHtml(scan.rootPath)}</div>
      <div class="k">Incluye</div><div class="v">${escHtml(scan.includeExts.join(" "))}</div>
      <div class="k">Excluye carpetas</div><div class="v">${escHtml(scan.excludeDirs.join(", "))}</div>
      <div class="k">Total incluidos</div><div class="v">${scan.files.length}</div>
      <div class="k">Total omitidos</div><div class="v">${scan.skipped.length}</div>
    </div>
  `;

  const estructuraHtml = `
    <pre class="codeblock">${escHtml(scan.treeText || "(sin estructura)")}</pre>
  `;

  const omitidosHtml = `
    <div class="small muted">Se listan los elementos omitidos por exclusión o extensión no permitida.</div>
    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Tipo</th>
          <th>Ruta</th>
          <th>Razón</th>
        </tr>
      </thead>
      <tbody>
        ${
          (scan.skipped || [])
            .slice(0, 3000)
            .map((s, idx) => {
              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${escHtml(s.type || "")}</td>
                  <td>${escHtml(s.relPath || "")}</td>
                  <td>${escHtml(s.reason || "")}</td>
                </tr>
              `;
            })
            .join("\n")
        }
      </tbody>
    </table>
  `;

  const codesHtml = scan.files
    .map((f, idx) => {
      const title = `${idx + 1}. ${f.relPath}`;
      const anchor = `file-${idx + 1}`;
      let code = "";
      try {
        code = fs.readFileSync(f.absPath, "utf8");
      } catch (e) {
        code = `/* ERROR: no se pudo leer el archivo: ${e.message} */`;
      }

      return `
        <section class="file-section" id="${anchor}">
          <div class="file-header">
            <div class="file-title">${escHtml(title)}</div>
            <div class="file-meta">
              <span class="pill">Función: ${escHtml(fileFunctionGuess(f.relPath))}</span>
              <span class="pill">Ext: ${escHtml(f.ext)}</span>
              <span class="pill">Size: ${Number(f.size || 0)} bytes</span>
            </div>
          </div>
          <pre class="codeblock">${escHtml(code)}</pre>
        </section>
      `;
    })
    .join("\n");

  const html = template
    .replace("{{INLINE_CSS}}", styles)
    .replaceAll("{{ROOT_NAME}}", escHtml(rootName))
    .replaceAll("{{ROOT_PATH}}", escHtml(scan.rootPath))
    .replaceAll("{{WHEN}}", escHtml(when))
    .replace("{{TOC}}", tocHtml)
    .replace("{{RESUMEN}}", resumenHtml)
    .replace("{{ESTRUCTURA}}", estructuraHtml)
    .replace("{{OMITIDOS}}", omitidosHtml)
    .replace("{{CODES}}", codesHtml);

  return html;
}

module.exports = { buildHtmlReport };
