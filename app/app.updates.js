/*
=========================================================
Nombre del archivo: app.updates.js
Ruta o ubicación: /desarrollo/app/app.updates.js
Función o funciones:
- Controla la interfaz visual del actualizador en el launcher principal
- Escucha el estado emitido por window.api.updates
- Muestra estado, versiones, progreso y acciones disponibles
- No rompe el launcher actual cuando se ejecuta fuera de Electron
=========================================================
*/
(function attachAppUpdates(window, document) {
  "use strict";

  var state = {
    status: "idle",
    message: "Sin revisar actualizaciones todavía.",
    checking: false,
    available: false,
    downloaded: false,
    downloadInProgress: false,
    progressPercent: 0,
    currentVersion: "-",
    availableVersion: "",
    lastCheckedAt: "",
    lastError: "",
    availableInThisEnv: true
  };

  var elements = {
    root: null,
    badge: null,
    currentVersion: null,
    availableVersion: null,
    message: null,
    lastChecked: null,
    progressWrap: null,
    progressBar: null,
    progressValue: null,
    error: null,
    btnCheck: null,
    btnDownload: null,
    btnInstall: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function asText(value, fallback) {
    var text = value == null ? "" : String(value).trim();
    return text || (fallback || "");
  }

  function asNumber(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback || 0);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getUpdatesApi() {
    if (!window.api || !window.api.updates) {
      return null;
    }
    return window.api.updates;
  }

  function getHostApi() {
    if (!window.api || !window.api.host) {
      return null;
    }
    return window.api.host;
  }

  function formatDate(value) {
    var raw = asText(value, "");
    if (!raw) {
      return "Aún no se ha revisado.";
    }

    try {
      var date = new Date(raw);
      if (Number.isNaN(date.getTime())) {
        return "Aún no se ha revisado.";
      }
      return date.toLocaleString();
    } catch (error) {
      return "Aún no se ha revisado.";
    }
  }

  function getStatusLabel(status) {
    switch (status) {
      case "checking":
        return "Revisando";
      case "available":
        return "Disponible";
      case "downloading":
        return "Descargando";
      case "downloaded":
        return "Lista para instalar";
      case "error":
        return "Error";
      case "idle":
      default:
        return "Sin cambios";
    }
  }

  function getBadgeClass(status) {
    switch (status) {
      case "checking":
        return "is-checking";
      case "available":
        return "is-available";
      case "downloading":
        return "is-downloading";
      case "downloaded":
        return "is-downloaded";
      case "error":
        return "is-error";
      case "idle":
      default:
        return "is-idle";
    }
  }

  function mergeState(nextState) {
    if (!nextState || typeof nextState !== "object") {
      return;
    }
    Object.assign(state, nextState);
    render();
  }

  function setDisabled(button, disabled) {
    if (!button) {
      return;
    }
    button.disabled = Boolean(disabled);
  }

  function renderBadge() {
    if (!elements.badge) {
      return;
    }
    elements.badge.className = "updates-badge " + getBadgeClass(state.status);
    elements.badge.textContent = getStatusLabel(state.status);
  }

  function renderVersions() {
    if (elements.currentVersion) {
      elements.currentVersion.textContent = asText(state.currentVersion, "-");
    }

    if (elements.availableVersion) {
      elements.availableVersion.textContent = asText(state.availableVersion, "No disponible");
    }
  }

  function renderMessage() {
    if (elements.message) {
      elements.message.textContent = asText(
        state.message,
        "Sin revisar actualizaciones todavía."
      );
    }

    if (elements.lastChecked) {
      elements.lastChecked.textContent = formatDate(state.lastCheckedAt);
    }

    if (elements.error) {
      var errorText = asText(state.lastError, "");
      elements.error.textContent = errorText;
      elements.error.hidden = !errorText;
    }
  }

  function renderProgress() {
    var percent = clamp(Math.round(asNumber(state.progressPercent, 0)), 0, 100);
    var mustShow =
      Boolean(state.downloadInProgress) ||
      state.status === "downloading" ||
      state.status === "downloaded";

    if (elements.progressWrap) {
      elements.progressWrap.hidden = !mustShow;
    }

    if (elements.progressBar) {
      elements.progressBar.style.width = percent + "%";
    }

    if (elements.progressValue) {
      elements.progressValue.textContent =
        state.status === "downloaded" ? "Descarga completada" : percent + "%";
    }
  }

  function renderButtons() {
    var updatesApi = getUpdatesApi();
    var unavailable = !updatesApi || !state.availableInThisEnv;
    var checking = Boolean(state.checking);
    var downloading = Boolean(state.downloadInProgress);
    var canDownload =
      Boolean(state.available) &&
      !Boolean(state.downloaded) &&
      !Boolean(state.downloadInProgress);

    var canInstall = Boolean(state.downloaded);

    setDisabled(elements.btnCheck, unavailable || checking || downloading);
    setDisabled(elements.btnDownload, unavailable || !canDownload);
    setDisabled(elements.btnInstall, unavailable || !canInstall);

    if (elements.btnCheck) {
      elements.btnCheck.textContent = checking ? "Revisando..." : "Buscar actualización";
    }

    if (elements.btnDownload) {
      elements.btnDownload.textContent = downloading
        ? "Descargando..."
        : "Descargar actualización";
    }

    if (elements.btnInstall) {
      elements.btnInstall.textContent = "Reiniciar e instalar";
    }
  }

  function render() {
    if (!elements.root) {
      return;
    }

    renderBadge();
    renderVersions();
    renderMessage();
    renderProgress();
    renderButtons();
  }

  async function loadHostVersion() {
    try {
      var hostApi = getHostApi();
      if (!hostApi || typeof hostApi.info !== "function") {
        return;
      }

      var info = await hostApi.info();
      if (info && info.ok && info.appVersion) {
        mergeState({
          currentVersion: String(info.appVersion)
        });
      }
    } catch (error) {
      return;
    }
  }

  async function loadInitialState() {
    try {
      var updatesApi = getUpdatesApi();

      if (!updatesApi || typeof updatesApi.getState !== "function") {
        mergeState({
          status: "idle",
          availableInThisEnv: false,
          message: "El panel de actualización solo funciona en la app instalada de Electron."
        });
        return;
      }

      var result = await updatesApi.getState();
      if (result && result.ok && result.state) {
        mergeState(result.state);
      } else {
        mergeState({
          availableInThisEnv: true,
          message: "No se pudo obtener el estado inicial del actualizador."
        });
      }
    } catch (error) {
      mergeState({
        status: "error",
        lastError: error && error.message ? error.message : "No se pudo leer el estado inicial.",
        message: "No se pudo leer el estado inicial del actualizador."
      });
    }
  }

  function bindUpdatesEvents() {
    var updatesApi = getUpdatesApi();
    if (!updatesApi || typeof updatesApi.onStatus !== "function") {
      return;
    }

    updatesApi.onStatus(function onStatus(nextState) {
      mergeState(nextState);
    });
  }

  async function handleCheck() {
    try {
      var updatesApi = getUpdatesApi();
      if (!updatesApi || typeof updatesApi.check !== "function") {
        return;
      }

      setDisabled(elements.btnCheck, true);
      await updatesApi.check();
    } catch (error) {
      mergeState({
        status: "error",
        lastError: error && error.message ? error.message : "No se pudo revisar actualizaciones.",
        message: "No se pudo iniciar la revisión de actualizaciones."
      });
    } finally {
      renderButtons();
    }
  }

  async function handleDownload() {
    try {
      var updatesApi = getUpdatesApi();
      if (!updatesApi || typeof updatesApi.download !== "function") {
        return;
      }

      setDisabled(elements.btnDownload, true);
      await updatesApi.download();
    } catch (error) {
      mergeState({
        status: "error",
        lastError: error && error.message ? error.message : "No se pudo descargar la actualización.",
        message: "No se pudo iniciar la descarga de la actualización."
      });
    } finally {
      renderButtons();
    }
  }

  async function handleInstall() {
    try {
      var updatesApi = getUpdatesApi();
      if (!updatesApi || typeof updatesApi.install !== "function") {
        return;
      }

      setDisabled(elements.btnInstall, true);
      await updatesApi.install();
    } catch (error) {
      mergeState({
        status: "error",
        lastError: error && error.message ? error.message : "No se pudo instalar la actualización.",
        message: "No se pudo iniciar la instalación de la actualización."
      });
      renderButtons();
    }
  }

  function bindDom() {
    elements.root = byId("updates-panel");
    if (!elements.root) {
      return false;
    }

    elements.badge = byId("updates-badge");
    elements.currentVersion = byId("updates-current-version");
    elements.availableVersion = byId("updates-available-version");
    elements.message = byId("updates-message");
    elements.lastChecked = byId("updates-last-checked");
    elements.progressWrap = byId("updates-progress");
    elements.progressBar = byId("updates-progress-bar");
    elements.progressValue = byId("updates-progress-value");
    elements.error = byId("updates-error");
    elements.btnCheck = byId("updates-btn-check");
    elements.btnDownload = byId("updates-btn-download");
    elements.btnInstall = byId("updates-btn-install");

    if (elements.btnCheck) {
      elements.btnCheck.addEventListener("click", handleCheck);
    }

    if (elements.btnDownload) {
      elements.btnDownload.addEventListener("click", handleDownload);
    }

    if (elements.btnInstall) {
      elements.btnInstall.addEventListener("click", handleInstall);
    }

    return true;
  }

  async function init() {
    if (!bindDom()) {
      return;
    }

    render();
    bindUpdatesEvents();
    await loadHostVersion();
    await loadInitialState();
  }

  document.addEventListener("DOMContentLoaded", init);
})(window, document);