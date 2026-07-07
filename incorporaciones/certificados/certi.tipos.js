/*
=========================================================
Nombre completo: certi.tipos.js
Ruta o ubicación: /incorporaciones/certificados/certi.tipos.js
Función o funciones:
- Definir los tipos de certificados disponibles en Certi.
- Mantener el tipo seleccionado en localStorage.
- Exponer utilidades para saber si el flujo actual es reconocimiento o capacitación.
- Registrar configuración base de plantillas, textos y prefijos por tipo.
Con qué se une:
- certi.index.html
- certi.config.js
- certi.state.js
- certi.capacitacion.js
=========================================================
*/

(function () {
  "use strict";

  const TIPO_RECONOCIMIENTO = "reconocimiento";
  const TIPO_CAPACITACION = "capacitacion";
  const STORAGE_TIPO = "certi.tipoCertificado";

  const plantillas = {
    reconocimiento: "./assets/certi-plantilla-certificado.png",
    capacitacion: "./assets/certi-plantilla-capacitacion.png"
  };

  const tipos = {
    reconocimiento: {
      id: TIPO_RECONOCIMIENTO,
      nombre: "Reconocimiento a mejores egresados",
      descripcion: "Generación automática de certificados de reconocimiento para mejores egresados por carrera.",
      fuente: "excel_texto",
      plantilla: plantillas.reconocimiento,
      pdfUnicoPrefijo: "Certificados_Mejores_Egresados",
      pdfIndividualPrefijo: "Certificado"
    },
    capacitacion: {
      id: TIPO_CAPACITACION,
      nombre: "Certificado de capacitación docente",
      descripcion: "Generación automática de certificados de capacitación para docentes desde Excel.",
      fuente: "excel",
      plantilla: plantillas.capacitacion,
      pdfUnicoPrefijo: "Certificados_Capacitacion_Docente",
      pdfIndividualPrefijo: "Certificado_Capacitacion",
      horasDefecto: 40
    }
  };

  extenderConfig();

  function extenderConfig() {
    const config = window.CertiConfig;
    if (!config) return;

    config.tiposCertificado = config.tiposCertificado || {};
    config.tiposCertificado.reconocimiento = Object.assign(
      {},
      tipos.reconocimiento,
      config.tiposCertificado.reconocimiento || {}
    );
    config.tiposCertificado.capacitacion = Object.assign(
      {},
      tipos.capacitacion,
      config.tiposCertificado.capacitacion || {}
    );

    config.rutas = config.rutas || {};
    config.rutas.plantillaReconocimiento = config.rutas.plantillaReconocimiento || config.rutas.plantillaCertificado || plantillas.reconocimiento;
    config.rutas.plantillaCapacitacion = config.rutas.plantillaCapacitacion || plantillas.capacitacion;
  }

  function normalizar(tipo) {
    const valor = String(tipo || "").toLowerCase().trim();
    return valor === TIPO_CAPACITACION ? TIPO_CAPACITACION : TIPO_RECONOCIMIENTO;
  }

  function obtenerActual() {
    const selector = document.getElementById("certiTipoCertificado");

    if (selector && selector.value) {
      return normalizar(selector.value);
    }

    if (window.__certiTipoCertificadoActual) {
      return normalizar(window.__certiTipoCertificadoActual);
    }

    try {
      const guardado = localStorage.getItem(STORAGE_TIPO);
      if (guardado) return normalizar(guardado);
    } catch (error) {
      console.warn("[CertiTipos] No se pudo leer el tipo guardado:", error);
    }

    return TIPO_RECONOCIMIENTO;
  }

  function establecer(tipo, opciones) {
    const config = opciones || {};
    const normalizado = normalizar(tipo);
    window.__certiTipoCertificadoActual = normalizado;

    if (config.guardar !== false) {
      try {
        localStorage.setItem(STORAGE_TIPO, normalizado);
      } catch (error) {
        console.warn("[CertiTipos] No se pudo guardar el tipo:", error);
      }
    }

    const selector = document.getElementById("certiTipoCertificado");
    if (selector && selector.value !== normalizado) {
      selector.value = normalizado;
    }

    return normalizado;
  }

  function obtenerConfig(tipo) {
    const id = normalizar(tipo || obtenerActual());
    const config = window.CertiConfig || {};
    const registrados = config.tiposCertificado || {};

    return Object.assign({}, tipos[id], registrados[id] || {});
  }

  function obtenerNombre(tipo) {
    return obtenerConfig(tipo).nombre;
  }

  function esCapacitacion(tipo) {
    return normalizar(tipo || obtenerActual()) === TIPO_CAPACITACION;
  }

  function esReconocimiento(tipo) {
    return normalizar(tipo || obtenerActual()) === TIPO_RECONOCIMIENTO;
  }

  function listar() {
    return [
      obtenerConfig(TIPO_RECONOCIMIENTO),
      obtenerConfig(TIPO_CAPACITACION)
    ];
  }

  function inicializarSelector(callbackCambio) {
    const selector = document.getElementById("certiTipoCertificado");
    if (!selector || selector.__certiTiposInicializado) return;

    selector.value = obtenerActual();

    selector.addEventListener("change", function () {
      const tipo = establecer(selector.value, { guardar: true });

      if (typeof callbackCambio === "function") {
        callbackCambio(tipo);
      }
    });

    selector.__certiTiposInicializado = true;
  }

  window.CertiTipos = {
    TIPO_RECONOCIMIENTO,
    TIPO_CAPACITACION,
    STORAGE_TIPO,
    plantillas,
    normalizar,
    obtenerActual,
    establecer,
    obtenerConfig,
    obtenerNombre,
    esCapacitacion,
    esReconocimiento,
    listar,
    inicializarSelector,
    extenderConfig
  };
})();
