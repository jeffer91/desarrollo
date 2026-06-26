/* =========================================================
Nombre completo: bl-normalizador.js
Ruta o ubicación: /Requisitos/BaseLocal/services/bl-normalizador.js
Función o funciones:
- Normalizar estudiantes y períodos sin borrar campos originales.
- Usar cédula como clave principal y numeroIdentificacion como respaldo.
- Mantener tolerancia para campos con tilde, sin tilde y variaciones de mayúsculas.
Con qué se conecta:
- bl-campos.js
- baselocal.core.js
- futuros servicios de sincronización BL
========================================================= */
(function(window){
  "use strict";

  function campos(){
    if(!window.BLCampos){
      throw new Error("BLCampos no disponible.");
    }
    return window.BLCampos;
  }

  function text(value){
    return campos().text(value);
  }

  function now(){
    return new Date().toISOString();
  }

  function clone(value){
    try{
      return JSON.parse(JSON.stringify(value == null ? null : value));
    }catch(error){
      return value;
    }
  }

  function normalizeText(value){
    return text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function periodKey(value){
    var raw = text(value);
    if(!raw){
      return "";
    }
    return normalizeText(raw).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  function normalizePeriod(period){
    var src = Object.assign({}, period || {});
    var id = text(src.id || src.periodoId || src.value || src.periodId);
    var label = text(src.label || src.periodoLabel || src.periodo || src.nombrePeriodo || id);
    if(!id && label){
      id = periodKey(label);
    }
    if(!label && id){
      label = id;
    }
    return Object.assign({}, src, {
      id:id,
      periodoId:text(src.periodoId || id),
      label:label,
      periodoLabel:text(src.periodoLabel || label),
      updatedAt:text(src.updatedAt || src.actualizadoEn || src.creadoEn) || now()
    });
  }

  function getCampo(row, name, fallback){
    return campos().getValue(row || {}, name, fallback);
  }

  function normalizeStudent(row, index, options){
    options = options || {};
    var src = clone(row || {}) || {};
    var out = campos().ensureIdentity(src);
    var cedula = text(getCampo(out, "cedula", ""));
    var numero = text(getCampo(out, "numeroIdentificacion", cedula));
    var periodoId = text(getCampo(out, "periodoId", options.periodoId || out.periodoId || ""));
    var periodoLabel = text(getCampo(out, "periodoLabel", options.periodoLabel || out.periodoLabel || periodoId));
    var nombres = text(getCampo(out, "nombres", out.nombres || ""));
    var carrera = text(getCampo(out, "nombreCarrera", out.nombrecarrera || ""));
    var estado = campos().normalizeEstado(getCampo(out, "estadoMatricula", out.estadoMatricula || "ACTIVO"));
    var docId = text(out._docId || out.docId || out._firebaseId || out.id || cedula || numero || ("estudiante_" + (index + 1)));

    out._docId = docId;
    out.docId = docId;
    out.cedula = cedula || numero || docId;
    out.numeroIdentificacion = numero || cedula || docId;
    out.periodoId = periodoId;
    out.ultimoPeriodoId = text(getCampo(out, "ultimoPeriodoId", periodoId)) || periodoId;
    out.periodoLabel = periodoLabel || periodoId;
    out.nombres = nombres;
    out.nombrecarrera = carrera;
    out.estadoMatricula = estado;
    out.updatedAt = text(getCampo(out, "updatedAt", out.updatedAt || "")) || now();
    out._source = out._source || options.source || "local";

    if(!out.Nombres && nombres){
      out.Nombres = nombres;
    }
    if(!out.NombreCarrera && carrera){
      out.NombreCarrera = carrera;
    }
    return out;
  }

  function normalizeStudents(rows, options){
    var list = Array.isArray(rows) ? rows : [];
    return list.map(function(row, index){
      return normalizeStudent(row, index, options || {});
    });
  }

  function indexByCedula(rows){
    var map = {};
    normalizeStudents(rows || []).forEach(function(student){
      var key = text(student.cedula || student.numeroIdentificacion);
      if(key){
        map[key] = student;
      }
    });
    return map;
  }

  window.BLNormalizador = {
    text:text,
    now:now,
    clone:clone,
    normalizeText:normalizeText,
    periodKey:periodKey,
    normalizePeriod:normalizePeriod,
    normalizeStudent:normalizeStudent,
    normalizeStudents:normalizeStudents,
    indexByCedula:indexByCedula
  };
})(window);
