/* =========================================================
Nombre completo: carga-materia.user-messages.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.user-messages.js
Función o funciones:
1. Mostrar mensajes simples y claros para el usuario.
2. Traducir estados técnicos internos a lenguaje normal.
3. Mantener oculto cualquier JSON, código, ruta o detalle técnico.
4. Acompañar el flujo Procesar materia y Guardar.
5. Mostrar guardado limpio sin rutas internas.
========================================================= */

(function iniciarMensajesCargaMateria(window, document) {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function hasValue(id) {
    var element = byId(id);
    return Boolean(element && text(element.value));
  }

  function hasFile(id) {
    var element = byId(id);
    return Boolean(element && element.files && element.files.length);
  }

  function getFileExtension(id) {
    var element = byId(id);
    var file = element && element.files && element.files.length ? element.files[0] : null;
    var name = file && file.name ? String(file.name) : "";
    var parts = name.split(".");
    return parts.length < 2 ? "" : parts.pop().toLowerCase();
  }

  function hasSource(kind) {
    return hasFile(kind + "-file-input") || hasValue(kind + "-text-input");
  }

  function hasMainDocument() {
    var ext = getFileExtension("base-file-input");
    return hasValue("base-text-input") || ext === "pdf" || ext === "txt";
  }

  function setMessage(element, type, message) {
    if (!element) return;

    element.classList.remove("is-pending", "is-ok", "is-warning", "is-error");
    element.classList.add(type || "is-pending");
    element.textContent = message || "Completa la información para procesar la materia.";
  }

  function getSourceMessage() {
    var carrera = hasValue("carrera-input");
    var materia = hasValue("materia-input");
    var base = hasSource("base");
    var contenidos = hasSource("contenidos") || hasMainDocument();
    var actividades = hasSource("actividades") || hasMainDocument();

    if (!carrera && !materia && !base) {
      return "Completa carrera, materia y agrega la información de la materia.";
    }

    if (!carrera || !materia) {
      return "Falta completar carrera y materia.";
    }

    if (!base) {
      return "Agrega la información base mediante archivo o texto.";
    }

    if (!contenidos || !actividades) {
      return "Agrega contenidos y actividades, o usa un PDF/TXT completo en Información base.";
    }

    return "Información lista. Presiona Procesar materia.";
  }

  function messageFromStatus(statusText) {
    var status = text(statusText).toLowerCase();

    if (status.indexOf("procesando") >= 0 || status.indexOf("validando") >= 0) {
      return { type: "is-warning", message: "Procesando la materia. Espera un momento." };
    }

    if (status.indexOf("guardando") >= 0) {
      return { type: "is-warning", message: "Guardando la materia. Espera un momento." };
    }

    if (status.indexOf("guardado") >= 0) {
      return { type: "is-ok", message: "Materia guardada correctamente." };
    }

    if (status.indexOf("sin guardar") >= 0) {
      return { type: "is-warning", message: "Primero procesa la materia para poder guardar." };
    }

    if (status.indexOf("procesado") >= 0 || status.indexOf("completo") >= 0) {
      return { type: "is-ok", message: "Materia procesada correctamente. Ya puedes guardar." };
    }

    if (status.indexOf("alerta") >= 0) {
      return { type: "is-warning", message: "Materia procesada. Hay elementos por revisar antes de guardar." };
    }

    if (status.indexOf("incompleto") >= 0) {
      return { type: "is-warning", message: "Falta información para completar la materia." };
    }

    if (status.indexOf("error") >= 0) {
      return { type: "is-error", message: "No se pudo procesar la materia. Revisa el archivo o el texto ingresado." };
    }

    return { type: "is-pending", message: getSourceMessage() };
  }

  function refreshMessage() {
    var messageBox = byId("user-message");
    var status = byId("expediente-status");
    var parsed = messageFromStatus(status ? status.textContent : "");

    setMessage(messageBox, parsed.type, parsed.message);
  }

  function bindSourceChanges() {
    [
      "carrera-input",
      "materia-input",
      "base-file-input",
      "contenidos-file-input",
      "actividades-file-input",
      "base-text-input",
      "contenidos-text-input",
      "actividades-text-input"
    ].forEach(function eachId(id) {
      var element = byId(id);
      if (!element) return;

      element.addEventListener("input", refreshMessage);
      element.addEventListener("change", refreshMessage);
    });
  }

  function observeStatus() {
    var status = byId("expediente-status");
    if (!status || typeof MutationObserver === "undefined") return;

    var observer = new MutationObserver(refreshMessage);
    observer.observe(status, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  function boot() {
    bindSourceChanges();
    observeStatus();
    refreshMessage();
  }

  document.addEventListener("DOMContentLoaded", boot);
})(window, document);
