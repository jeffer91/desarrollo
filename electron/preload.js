/*
=========================================================
Nombre completo: preload.js
Ruta o ubicación: /desarrollo/electron/preload.js

Función o funciones:
1. Exponer API segura desde Electron hacia la interfaz.
2. Mantener compatibilidad con window.api.
3. Exponer control del motor oculto de Eventos.
4. Permitir notificaciones de escritorio.
5. Permitir funciones básicas de shell, scan, PDF y updates.
6. Evitar exponer ipcRenderer completo.
7. Mantener compatibilidad con el panel visual de actualizaciones.

Con qué se comunica:
- /desarrollo/electron/main.js
- /desarrollo/electron/updater.js
- /desarrollo/electron/eventos-background-manager.js
- /desarrollo/index.html
- /desarrollo/app/app.updates.js
- /desarrollo/eventos/background.html
- /desarrollo/eventos/renderer.html

Qué aporta:
Permite que la app grande y los módulos usen funciones de Electron sin exponer ipcRenderer completo.
=========================================================
*/

"use strict";

const { contextBridge, ipcRenderer } = require("electron");

function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, payload);
}

function safeOn(channel, callback) {
  if (typeof callback !== "function") {
    throw new TypeError("El callback debe ser una función.");
  }

  const allowed = [
    "updates:status",
    "update:state",
    "agendaJeff:updateStatus",
    "eventos-background:status",
    "eventos-background:stop-runner",
    "eventos-background:start-runner"
  ];

  if (!allowed.includes(channel)) {
    return function unsubscribeBlocked() {};
  }

  const handler = function onMessage(_event, payload) {
    callback(payload);
  };

  ipcRenderer.on(channel, handler);

  return function unsubscribe() {
    ipcRenderer.removeListener(channel, handler);
  };
}

function send(channel, payload) {
  const allowed = [
    "eventos-background:heartbeat",
    "eventos-background:tick",
    "eventos-background:error"
  ];

  if (!allowed.includes(channel)) {
    return {
      ok: false,
      message: "Canal no permitido."
    };
  }

  ipcRenderer.send(channel, payload);

  return {
    ok: true,
    message: "Mensaje enviado."
  };
}

async function getUpdatesStateWrapped() {
  const state = await invoke("updates:state");

  return {
    ok: true,
    state: state || {}
  };
}

const api = {
  host: {
    info: function info() {
      return invoke("host:info");
    }
  },

  shell: {
    openPath: function openPath(targetPath) {
      return invoke("shell:openPath", targetPath);
    },
    revealPath: function revealPath(targetPath) {
      return invoke("shell:revealPath", targetPath);
    },
    chooseFolder: function chooseFolder() {
      return invoke("shell:chooseFolder");
    }
  },

  desktop: {
    notify: function notify(payload) {
      return invoke("desktop:notify", payload);
    }
  },

  scan: {
    pickFolder: function pickFolder(initialPath) {
      return invoke("scan:pick-folder", {
        initialPath: initialPath || ""
      });
    },
    run: function run(payload) {
      return invoke("scan:run", payload || {});
    }
  },

  files: {
    saveText: function saveText(payload) {
      return invoke("files:saveText", payload || {});
    },
    saveJson: function saveJson(payload) {
      return invoke("files:saveJson", payload || {});
    }
  },

  pdf: {
    export: function exportPdf(payload) {
      return invoke("pdf:export", payload || {});
    }
  },

  updates: {
    state: function state() {
      return invoke("updates:state");
    },
    getState: function getState() {
      return getUpdatesStateWrapped();
    },
    check: function check(payload) {
      return invoke("updates:check", payload || { manual: true });
    },
    download: function download() {
      return invoke("updates:download");
    },
    install: function install() {
      return invoke("updates:install");
    },
    onState: function onState(callback) {
      return safeOn("updates:status", callback);
    },
    onStatus: function onStatus(callback) {
      return safeOn("updates:status", callback);
    }
  },

  eventosBackground: {
    start: function start(options) {
      return invoke("eventos-background:start", options || {});
    },
    stop: function stop() {
      return invoke("eventos-background:stop");
    },
    restart: function restart(options) {
      return invoke("eventos-background:restart", options || {});
    },
    status: function status() {
      return invoke("eventos-background:status");
    },
    showDevWindow: function showDevWindow() {
      return invoke("eventos-background:show-dev-window");
    },
    hideDevWindow: function hideDevWindow() {
      return invoke("eventos-background:hide-dev-window");
    },
    heartbeat: function heartbeat(payload) {
      return send("eventos-background:heartbeat", payload || {});
    },
    tick: function tick(payload) {
      return send("eventos-background:tick", payload || {});
    },
    error: function error(payload) {
      return send("eventos-background:error", payload || {});
    },
    onStopRunner: function onStopRunner(callback) {
      return safeOn("eventos-background:stop-runner", callback);
    },
    onStartRunner: function onStartRunner(callback) {
      return safeOn("eventos-background:start-runner", callback);
    }
  },

  utils: {
    copyText: async function copyText(text) {
      const value = String(text == null ? "" : text);
      await navigator.clipboard.writeText(value);
      return {
        ok: true,
        message: "Texto copiado."
      };
    },
    openExternal: function openExternal(url) {
      return invoke("shell:openPath", url);
    }
  }
};

contextBridge.exposeInMainWorld("api", api);

contextBridge.exposeInMainWorld("agendaJeff", {
  appInfo: function appInfo() {
    return api.host.info();
  },
  notify: function notify(payload) {
    return api.desktop.notify(payload);
  },
  notificationStatus: async function notificationStatus() {
    return {
      ok: true,
      supported: true
    };
  },
  backgroundStatus: function backgroundStatus() {
    return api.eventosBackground.status();
  },
  backgroundStart: function backgroundStart(options) {
    return api.eventosBackground.start(options);
  },
  backgroundRestart: function backgroundRestart(options) {
    return api.eventosBackground.restart(options);
  },
  backgroundStop: function backgroundStop() {
    return api.eventosBackground.stop();
  },
  onUpdateStatus: function onUpdateStatus(callback) {
    return safeOn("updates:status", callback);
  }
});

contextBridge.exposeInMainWorld("__DESARROLLO_ELECTRON__", true);
