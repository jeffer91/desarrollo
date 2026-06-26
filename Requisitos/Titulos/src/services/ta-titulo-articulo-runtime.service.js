/*
  Nombre completo: ta-titulo-articulo-runtime.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-runtime.service.js
  Función o funciones:
  - Detectar el entorno de ejecución del módulo Títulos.
  - Diferenciar doble click, Live Server, Vite, Electron, Netlify Dev y Netlify publicado.
  - Decidir qué origen de datos debe usar la app: Firebase directo o Netlify Functions.
  - Mantener una configuración local simple y reutilizable por estudiante, coordinador y administrador.
  Se conecta con:
  - ta-titulo-articulo-data-adapter.service.js
  - ta-titulo-articulo-api-client.service.js
  - ta-titulo-articulo-firebase-direct.service.js
*/

const RUNTIME_STORAGE_KEY = "ta.titulo.articulo.runtimeMode";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function getWindow() {
  return typeof window !== "undefined" ? window : null;
}

function getDocument() {
  return typeof document !== "undefined" ? document : null;
}

function getLocation() {
  return getWindow()?.location || null;
}

function getLocalStorageValue(key) {
  try {
    return clean(getWindow()?.localStorage?.getItem(key));
  } catch (error) {
    console.warn(`[Títulos Runtime] No se pudo leer localStorage: ${error.message}`);
    return "";
  }
}

function setLocalStorageValue(key, value) {
  try {
    getWindow()?.localStorage?.setItem(key, value);
  } catch (error) {
    console.warn(`[Títulos Runtime] No se pudo guardar localStorage: ${error.message}`);
  }
}

function obtenerParametroUrl(...nombres) {
  const location = getLocation();
  if (!location?.search) return "";

  const params = new URLSearchParams(location.search);
  for (const nombre of nombres) {
    const value = clean(params.get(nombre));
    if (value) return value;
  }

  return "";
}

function obtenerRuntimeDeclarado() {
  return clean(getDocument()?.body?.dataset?.taRuntime || getDocument()?.documentElement?.dataset?.taRuntime);
}

function obtenerPantalla() {
  return clean(getDocument()?.querySelector("[data-ta-screen]")?.dataset?.taScreen);
}

function estaEnArchivoLocal(location = getLocation()) {
  return location?.protocol === "file:";
}

function estaEnHttpLocal(location = getLocation()) {
  if (!location) return false;
  return ["http:", "https:"].includes(location.protocol) && LOCAL_HOSTS.has(location.hostname);
}

function estaEnNetlifyDev(location = getLocation()) {
  return estaEnHttpLocal(location) && clean(location?.port) === "8888";
}

function estaEnVite(location = getLocation()) {
  return estaEnHttpLocal(location) && clean(location?.port) === "5173";
}

function estaEnLiveServer(location = getLocation()) {
  if (!estaEnHttpLocal(location)) return false;
  const port = clean(location?.port);
  return Boolean(port && !["5173", "8888"].includes(port));
}

function estaEnNetlifyPublicado(location = getLocation()) {
  if (!location) return false;
  return ["http:", "https:"].includes(location.protocol) && !estaEnHttpLocal(location);
}

function normalizarModoDatos(value) {
  const modo = clean(value).toLowerCase();
  if (["firebase", "firebase-direct", "direct", "local"].includes(modo)) return "firebase-direct";
  if (["api", "functions", "netlify", "netlify-functions"].includes(modo)) return "netlify-functions";
  if (["auto", ""].includes(modo)) return "auto";
  return "auto";
}

function obtenerModoDatosConfigurado() {
  const desdeParametro = normalizarModoDatos(obtenerParametroUrl("taDataMode", "dataMode", "modoDatos"));
  if (desdeParametro !== "auto") {
    setLocalStorageValue(RUNTIME_STORAGE_KEY, desdeParametro);
    return desdeParametro;
  }

  const desdeGlobal = normalizarModoDatos(getWindow()?.TA_TITULO_ARTICULO_DATA_MODE);
  if (desdeGlobal !== "auto") {
    setLocalStorageValue(RUNTIME_STORAGE_KEY, desdeGlobal);
    return desdeGlobal;
  }

  return normalizarModoDatos(getLocalStorageValue(RUNTIME_STORAGE_KEY));
}

function detectarRuntime() {
  const location = getLocation();
  const declarado = obtenerRuntimeDeclarado();
  const protocol = clean(location?.protocol);
  const hostname = clean(location?.hostname);
  const port = clean(location?.port);

  const runtime = {
    pantalla: obtenerPantalla(),
    declarado,
    protocol,
    hostname,
    port,
    esElectron: declarado === "electron",
    esPublico: declarado === "public",
    esFile: estaEnArchivoLocal(location),
    esHttpLocal: estaEnHttpLocal(location),
    esVite: estaEnVite(location),
    esLiveServer: estaEnLiveServer(location),
    esNetlifyDev: estaEnNetlifyDev(location),
    esNetlifyPublicado: estaEnNetlifyPublicado(location)
  };

  runtime.esLocal = runtime.esElectron || runtime.esFile || runtime.esHttpLocal;
  runtime.esNetlify = runtime.esNetlifyDev || runtime.esNetlifyPublicado;
  return runtime;
}

function obtenerOrigenDatos() {
  const runtime = detectarRuntime();
  const configurado = obtenerModoDatosConfigurado();

  if (configurado === "firebase-direct" || configurado === "netlify-functions") {
    return configurado;
  }

  if (runtime.esNetlifyPublicado || runtime.esNetlifyDev) return "netlify-functions";
  return "firebase-direct";
}

export const TaTituloArticuloRuntime = Object.freeze({
  detectarRuntime,
  obtenerOrigenDatos,
  configurarOrigenDatos(origen) {
    const normalizado = normalizarModoDatos(origen);
    if (normalizado === "auto") {
      setLocalStorageValue(RUNTIME_STORAGE_KEY, "");
      return "auto";
    }
    setLocalStorageValue(RUNTIME_STORAGE_KEY, normalizado);
    return normalizado;
  },
  limpiarConfiguracion() {
    setLocalStorageValue(RUNTIME_STORAGE_KEY, "");
  }
});
