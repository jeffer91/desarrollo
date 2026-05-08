/* =========================================================
Nombre completo: supabase.config.js
Ruta: /Titulacion/basedatos/supabase/supabase.config.js
Función o funciones:
- Guardar la URL pública del proyecto Supabase.
- Guardar la clave pública publishable/anon.
- Definir el bucket de Supabase Storage para anexos de titulación.
- Centralizar la configuración remota del módulo Titulación.
========================================================= */

(function (window) {
  "use strict";

  window.SUPABASE_CONFIG = {
    enabled: true,

    url: "https://tlzqvbpfaauovnltnpqs.supabase.co",

    anonKey: "sb_publishable_CkdMqskG7ZYWnNg-pJbRxg_LwN61t6i",

    storage: {
      bucket: "anexos",
      baseFolder: "titulacion",
      publicBucket: false
    }
  };
})(window);