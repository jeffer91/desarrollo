/*
  Nombre completo: ta-titulo-articulo-admin-diagnostico.app.js
  Ruta o ubicación: /Requisitos/Titulos/src/admin/ta-titulo-articulo-admin-diagnostico.app.js
  Función o funciones:
  - Mostrar diagnóstico de arranque del administrador en Electron.
  - Confirmar runtime, origen de datos y proyecto Firebase activo.
  - Ayudar a detectar si el panel abrió en Firebase directo o Netlify Functions.
  Se conecta con:
  - Requisitos/Titulos/electron/admin/ta-titulo-articulo-administrador.html
  - Requisitos/Titulos/src/services/ta-titulo-articulo-api-client.service.js
  - Requisitos/Titulos/src/firebase/ta-titulo-articulo-firebase-client.js
*/

import { TaTituloArticuloApi } from "../services/ta-titulo-articulo-api-client.service.js";
import { obtenerFirebaseConfigPublica } from "../firebase/ta-titulo-articulo-firebase-client.js";

const $ = (id) => document.getElementById(id);
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = clean(value) || "---";
}

function renderDiagnostico() {
  const runtime = TaTituloArticuloApi.diagnostico.obtenerRuntime();
  const origenDatos = TaTituloArticuloApi.diagnostico.obtenerOrigenDatos();
  const firebase = obtenerFirebaseConfigPublica();

  setText("ta-admin-runtime", runtime.esElectron ? "Electron" : runtime.esFile ? "Doble click" : runtime.esLiveServer ? "Live Server" : runtime.esVite ? "Vite" : runtime.esNetlify ? "Netlify" : "Local");
  setText("ta-admin-origen", origenDatos);
  setText("ta-admin-firebase-project", firebase.projectId || "Sin proyecto");
  setText("ta-admin-firebase-sdk", firebase.sdkVersion || "No detectado");

  const badge = $("ta-admin-origen-datos");
  if (badge) {
    badge.textContent = origenDatos === "firebase-direct" ? "Firebase directo" : "Netlify Functions";
    badge.classList.remove("ta-badge--warning", "ta-badge--soft", "ta-badge--gold");
    badge.classList.add(origenDatos === "firebase-direct" ? "ta-badge--gold" : "ta-badge--warning");
  }

  if (!firebase.configurado && firebase.error) {
    setText("ta-admin-firebase-project", `Error: ${firebase.error}`);
  }
}

function init() {
  try {
    renderDiagnostico();
  } catch (error) {
    console.error("[Títulos admin diagnóstico]", error);
    setText("ta-admin-runtime", "Error de diagnóstico");
    setText("ta-admin-origen", error.message || "No se pudo detectar");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
