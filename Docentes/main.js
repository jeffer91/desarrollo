/* =========================================================
   Archivo: main.js (NUEVO)
   Función:
   - Main process Electron
   - Servidor estático local para servir tus HTML/JS/CSS como http://localhost
   - Evita problemas de file:// (origin null) con imports/SDK remotos
   ========================================================= */
const { app, BrowserWindow } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

let server = null;

function mimeByExt(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".ico") return "image/x-icon";
  return "application/octet-stream";
}

function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      try {
        const base = new URL("http://127.0.0.1");
        const u = new URL(req.url || "/", base);

        // Sanitiza path (evita ../)
        const rawPath = decodeURIComponent(u.pathname || "/");
        const safePath = rawPath.replace(/\\/g, "/");
        const finalRel = safePath.startsWith("/") ? safePath.slice(1) : safePath;

        // Si piden directorio, intenta index.html
        const rel = finalRel.endsWith("/") ? (finalRel + "index.html") : finalRel;

        const abs = path.normalize(path.join(rootDir, rel));
        if (!abs.startsWith(path.normalize(rootDir))) {
          res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("403");
          return;
        }

        fs.readFile(abs, (err, data) => {
          if (err) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("404");
            return;
          }
          res.writeHead(200, { "Content-Type": mimeByExt(abs) });
          res.end(data);
        });
      } catch (e) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("500");
      }
    });

    // Puerto dinámico para evitar choques
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      resolve({ srv, port: addr && addr.port ? addr.port : 0 });
    });
    srv.on("error", reject);
  });
}

async function createMainWindow() {
  const rootDir = __dirname; // raíz del proyecto (donde están /menu, /cap.manage, etc.)
  const started = await startStaticServer(rootDir);
  server = started.srv;

  const win = new BrowserWindow({
    width: 1280,
    height: 780,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
      // Comentario: NO activamos webSecurity:false (sería un bypass inseguro).
    }
  });

  const url = `http://127.0.0.1:${started.port}/menu/menu.shell.html`;
  await win.loadURL(url);
}

app.whenReady().then(createMainWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  // Comentario: apaga el server local para liberar puerto
  try { if (server) server.close(); } catch (_) {}
});