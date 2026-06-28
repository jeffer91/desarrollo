/* =========================================================
Nombre completo: carga-materia.builder.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.builder.js
Función o funciones:
1. Construir la materia consolidada final de la pantalla Carga de materia.
2. Combinar datos manuales, Archivo 1, Archivo 2 y Archivo 3.
3. Usar el matcher para unir unidades, contenidos y actividades.
4. Agrupar advertencias de todos los mapeadores.
5. Entregar una estructura lista para validar, guardar y usar en el generador de libro.
========================================================= */

(function attachCargaMateriaBuilder(window) {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalizer() {
    return window.LibroCargaMateriaNormalizer || null;
  }

  function normalize(value) {
    var n = normalizer();
    return n && typeof n.normalize === "function"
      ? n.normalize(value)
      : text(value).toLowerCase();
  }

  function slug(value) {
    return normalize(value)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "materia";
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value == null ? null : value));
  }

  function collectWarnings() {
    var warnings = [];

    Array.prototype.slice.call(arguments).forEach(function eachSource(source) {
      if (!source || !source.advertencias) return;

      source.advertencias.forEach(function eachWarning(warning) {
        if (warning) warnings.push(warning);
      });
    });

    return warnings;
  }

  function buildId(carrera, materia) {
    var now = new Date();
    var stamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    return "libro-" + slug(carrera) + "-" + slug(materia) + "-" + stamp;
  }

  function build(input) {
    var matcher = window.LibroCargaMateriaMatcher;

    if (!matcher || typeof matcher.match !== "function") {
      throw new Error("No está disponible el matcher de unión inteligente del Bloque 6.");
    }

    var carrera = text(input && input.carrera);
    var materia = text(input && input.materia);
    var archivos = clone(input && input.archivos ? input.archivos : {});
    var lecturas = clone(input && input.lecturas ? input.lecturas : {});
    var base = input && input.interpretacionBase ? input.interpretacionBase : null;
    var contenidos = input && input.interpretacionContenidos ? input.interpretacionContenidos : null;
    var actividades = input && input.interpretacionActividades ? input.interpretacionActividades : null;
    var union = matcher.match(base, contenidos, actividades);
    var baseCampos = base && base.campos ? base.campos : {};
    var advertencias = collectWarnings(base, contenidos, actividades).concat(union.advertencias || []);

    return {
      idLocal: buildId(carrera, materia),
      modulo: "libro",
      pantalla: "carga-materia",
      estado: advertencias.length ? "consolidado_con_alertas" : "consolidado_completo",
      bloque: 6,
      carrera: carrera,
      materia: materia,
      descripcion: text(baseCampos.descripcion),
      objetivo: text(baseCampos.objetivo),
      unidades: union.unidades,
      bibliografia: text(baseCampos.bibliografia),
      justificacionBibliografia: text(baseCampos.justificacionBibliografia),
      elementosSinUnidad: union.sinUnidad,
      resumen: union.resumen,
      advertencias: advertencias,
      origen: {
        archivos: archivos,
        lecturas: lecturas,
        interpretacionesUsadas: {
          informacionBase: Boolean(base),
          contenidosUnidades: Boolean(contenidos),
          actividadesMateria: Boolean(actividades)
        }
      },
      listoParaValidacion: true,
      pendienteBloque7: true,
      creadoEn: new Date().toISOString()
    };
  }

  window.LibroCargaMateriaBuilder = {
    build: build
  };
})(window);
