/*
=========================================================
Nombre completo: certi.audit.js
Ruta o ubicación: /incorporaciones/sedes/certi/certi.audit.js
Función o funciones:
- Crear registros de auditoría interna para el módulo Certi.
- Guardar acciones importantes: carga de Excel, procesamiento, descarga y errores.
- Facilitar revisión posterior sin afectar la generación de certificados.
Con qué se une:
- certi.app.js
- certi.pdf.js
- certi.storage.js
=========================================================
*/

(function () {
  "use strict";

  const clave = "certi.audit.log";

  function registrar(accion, detalle) {
    const lista = obtener();

    lista.unshift({
      id: crearId(),
      accion: accion || "accion",
      detalle: detalle || {},
      fecha: new Date().toISOString()
    });

    localStorage.setItem(clave, JSON.stringify(lista.slice(0, 150)));
  }

  function obtener() {
    try {
      return JSON.parse(localStorage.getItem(clave) || "[]");
    } catch (error) {
      return [];
    }
  }

  function limpiar() {
    localStorage.removeItem(clave);
  }

  function crearId() {
    return `certi_audit_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  window.CertiAudit = {
    registrar,
    obtener,
    limpiar
  };
})();