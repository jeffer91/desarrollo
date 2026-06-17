const { app, BrowserWindow } = require("electron");
const path = require("path");

let mainWindow;

function createWindow(){
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      // Mejor práctica: mantener false y solo web
      nodeIntegration: false,
      contextIsolation: true
    }
    // No pongas icon aquí si no existe un .ico o png incluido
  });

  mainWindow.loadFile("index.html");
  mainWindow.on("closed", () => { mainWindow = null; });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if(process.platform !== "darwin") app.quit();
});
