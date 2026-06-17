/*
=========================================================
Nombre completo: falt.diagnostico.js
Ruta o ubicación: /incorporaciones/falt/falt.diagnostico.js

Función o funciones:
1. Revisar que los módulos JavaScript obligatorios de Faltantes existan.
2. Revisar que los elementos HTML obligatorios existan.
3. Detectar errores de integración del pop-up de búsqueda.
4. Mostrar advertencias en consola sin romper el funcionamiento principal.
5. Facilitar la corrección rápida si falta algún archivo o ID.

Con qué se conecta:
- falt.html
- falt.config.js
- falt.state.js
- falt.utils.js
- falt.data.js
- falt.filters.js
- falt.search.js
- falt.message.js
- falt.history.js
- falt.whatsapp.js
- falt.telegram.js
- falt.table.js
- falt.app.js
=========================================================
*/

(function (window, document) {
  "use strict";

  function existsGlobal(name) {
    return Boolean(window[name]);
  }

  function existsId(id) {
    return Boolean(document.getElementById(id));
  }

  function revisarModulos() {
    var requeridos = [
      "FaltConfig",
      "FaltState",
      "FaltUtils",
      "FaltData",
      "FaltFilters",
      "FaltSearch",
      "FaltMessage",
      "FaltHistory",
      "FaltWhatsapp",
      "FaltTelegram",
      "FaltTable",
      "FaltApp"
    ];

    return requeridos.map(function (name) {
      return {
        tipo: "modulo",
        nombre: name,
        ok: existsGlobal(name)
      };
    });
  }

  function revisarElementos() {
    var requeridos = [
      "falt-status",
      "falt-loader",
      "falt-periodo-select",
      "falt-search-input",
      "falt-estado-select",
      "falt-canal-select",
      "falt-btn-buscar-estudiantes",
      "falt-btn-limpiar-seleccion",
      "falt-btn-recargar",
      "falt-btn-copiar-todos",
      "falt-resumen",
      "falt-kpi-total",
      "falt-kpi-faltantes",
      "falt-kpi-enviados",
      "falt-message-preview",
      "falt-table-body",
      "falt-modal-busqueda",
      "falt-modal-input",
      "falt-modal-close",
      "falt-modal-procesar",
      "falt-modal-confirmar",
      "falt-modal-limpiar",
      "falt-modal-summary",
      "falt-modal-results"
    ];

    return requeridos.map(function (id) {
      return {
        tipo: "elemento",
        nombre: id,
        ok: existsId(id)
      };
    });
  }

  function diagnosticar() {
    var modulos = revisarModulos();
    var elementos = revisarElementos();
    var resultados = modulos.concat(elementos);

    var errores = resultados.filter(function (item) {
      return !item.ok;
    });

    if (errores.length) {
      console.group("[FaltDiagnostico] Errores detectados");
      errores.forEach(function (item) {
        console.warn("Falta " + item.tipo + ": " + item.nombre);
      });
      console.groupEnd();
    } else {
      console.info("[FaltDiagnostico] Correcto. Todos los módulos y elementos requeridos existen.");
    }

    return {
      correcto: errores.length === 0,
      errores: errores,
      resultados: resultados
    };
  }

  function mostrarDiagnosticoEnConsola() {
    var resultado = diagnosticar();

    if (
      window.FaltData &&
      typeof window.FaltData.diagnostico === "function"
    ) {
      try {
        console.info("[FaltDiagnostico] Datos:", window.FaltData.diagnostico());
      } catch (error) {
        console.warn("[FaltDiagnostico] No se pudo revisar FaltData:", error);
      }
    }

    return resultado;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mostrarDiagnosticoEnConsola);
  } else {
    mostrarDiagnosticoEnConsola();
  }

  window.FaltDiagnostico = {
    diagnosticar: diagnosticar,
    revisarModulos: revisarModulos,
    revisarElementos: revisarElementos
  };
})(window, document);