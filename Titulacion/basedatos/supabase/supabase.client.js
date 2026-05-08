/* =========================================================
Nombre completo: supabase.client.js
Ruta: /Titulacion/basedatos/supabase/supabase.client.js
Función o funciones:
- Crear el cliente global de Supabase.
- Validar que la librería de Supabase esté cargada.
- Exponer una API segura para reutilizar Supabase en todo Titulación.
========================================================= */

(function (window) {
  "use strict";

  var client = null;
  var ready = false;
  var lastError = "";

  function getConfig() {
    return window.SUPABASE_CONFIG || {};
  }

  function isEnabled() {
    var cfg = getConfig();
    return cfg.enabled !== false;
  }

  function hasLibrary() {
    return !!(
      window.supabase &&
      typeof window.supabase.createClient === "function"
    );
  }

  function init() {
    var cfg = getConfig();

    if (!isEnabled()) {
      ready = false;
      lastError = "Supabase está deshabilitado en SUPABASE_CONFIG.";
      console.warn("[SupabaseClientApp] " + lastError);
      return null;
    }

    if (!hasLibrary()) {
      ready = false;
      lastError = "La librería @supabase/supabase-js no está cargada.";
      console.warn("[SupabaseClientApp] " + lastError);
      return null;
    }

    if (!cfg.url || !cfg.anonKey) {
      ready = false;
      lastError = "Faltan url o anonKey en SUPABASE_CONFIG.";
      console.warn("[SupabaseClientApp] " + lastError);
      return null;
    }

    try {
      client = window.supabase.createClient(cfg.url, cfg.anonKey);
      ready = true;
      lastError = "";
      console.info("[SupabaseClientApp] Cliente Supabase inicializado correctamente.");
      return client;
    } catch (error) {
      ready = false;
      lastError = error && error.message ? error.message : String(error);
      console.error("[SupabaseClientApp] Error inicializando Supabase:", error);
      return null;
    }
  }

  function getClient() {
    if (client && ready) {
      return client;
    }

    return init();
  }

  function isReady() {
    return !!(getClient() && ready);
  }

  function getLastError() {
    return lastError;
  }

  window.SupabaseClientApp = {
    init: init,
    getClient: getClient,
    isReady: isReady,
    getLastError: getLastError
  };

  init();
})(window);