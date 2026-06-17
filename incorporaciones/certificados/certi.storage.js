/*
=========================================================
Nombre completo: certi.storage.js
Ruta o ubicación: /incorporaciones/sedes/certi/certi.storage.js
Función o funciones:
- Guardar configuración local del módulo Certi.
- Recordar último período, última fecha y emparejamientos manuales de carreras.
- Guardar historial básico de generaciones.
Con qué se une:
- certi.app.js
- certi.logic.js
- certi.catalogo.js
- certi.utils.js
=========================================================
*/

(function () {
  "use strict";

  const U = window.CertiUtils;

  const claves = {
    ultimoFormulario: "certi.ultimoFormulario",
    emparejamientosCarrera: "certi.emparejamientosCarrera",
    historial: "certi.historial"
  };

  function obtenerUltimoFormulario() {
    return leerJson(claves.ultimoFormulario, {
      periodoSeleccionado: "",
      periodoTexto: "",
      fechaCertificado: ""
    });
  }

  function guardarUltimoFormulario(datos) {
    guardarJson(claves.ultimoFormulario, {
      periodoSeleccionado: datos.periodoSeleccionado || "",
      periodoTexto: datos.periodoTexto || "",
      fechaCertificado: datos.fechaCertificado || ""
    });
  }

  function obtenerEmparejamientosCarrera() {
    return leerJson(claves.emparejamientosCarrera, {});
  }

  function guardarEmparejamientosCarrera(emparejamientos) {
    guardarJson(claves.emparejamientosCarrera, emparejamientos || {});
  }

  function obtenerHistorial() {
    return leerJson(claves.historial, []);
  }

  function agregarHistorial(item) {
    const historial = obtenerHistorial();

    historial.unshift({
      id: crearIdHistorial(),
      fechaSistema: new Date().toISOString(),
      periodo: item.periodo || "",
      fechaCertificado: item.fechaCertificado || "",
      totalCertificados: item.totalCertificados || 0,
      tipoDescarga: item.tipoDescarga || "",
      archivo: item.archivo || ""
    });

    guardarJson(claves.historial, historial.slice(0, 80));
  }

  function limpiarHistorial() {
    localStorage.removeItem(claves.historial);
  }

  function leerJson(clave, fallback) {
    const valor = localStorage.getItem(clave);

    if (!valor) return fallback;

    return U.safeJsonParse(valor, fallback);
  }

  function guardarJson(clave, valor) {
    localStorage.setItem(clave, JSON.stringify(valor));
  }

  function crearIdHistorial() {
    return `certi_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  window.CertiStorage = {
    obtenerUltimoFormulario,
    guardarUltimoFormulario,
    obtenerEmparejamientosCarrera,
    guardarEmparejamientosCarrera,
    obtenerHistorial,
    agregarHistorial,
    limpiarHistorial
  };
})();