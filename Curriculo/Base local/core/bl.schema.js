/*
  Base local BL - Curriculo
  Archivo: bl.schema.js
  Funcion: normalizar registros, validar campos base y detectar campos nuevos.
*/
(function (window) {
  'use strict';

  const BL = window.CurriculoBL = window.CurriculoBL || {};

  const BASE_FIELDS = Object.freeze([
    'idLocal',
    'idFirebase',
    'nombre',
    'modulo',
    'ruta',
    'estado',
    'datos',
    'creadoEn',
    'actualizadoEn',
    'sincronizadoEn',
    'origen',
    'version'
  ]);

  const MODULE_FIELDS = Object.freeze({
    carreras: ['codigoCarrera', 'nombreCarrera', 'modalidad', 'sede', 'estadoCarrera'],
    materias: ['codigoMateria', 'nombreMateria', 'nivel', 'creditos', 'horas'],
    fichas: ['codigoFicha', 'periodo', 'carrera', 'responsable'],
    actas: ['codigoActa', 'fechaActa', 'tipoActa', 'responsable'],
    pea_documentos: ['codigoPea', 'periodo', 'materia', 'docente', 'archivo'],
    control: ['tipoControl', 'estadoControl', 'responsable'],
    menu: ['titulo', 'url', 'orden', 'activo']
  });

  function knownFieldsForModule(moduleName) {
    const modulo = BL.utils?.normalizeText ? BL.utils.normalizeText(moduleName).replace(/-/g, '_') : String(moduleName || '');
    return [...BASE_FIELDS, ...(MODULE_FIELDS[modulo] || [])];
  }

  function normalizeRecord(input, options) {
    const opts = options || {};
    const now = BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString();
    const source = input && typeof input === 'object' ? input : {};
    const modulo = source.modulo || opts.modulo || 'general';
    const ruta = source.ruta || opts.ruta || 'Curriculo';
    const nombre = source.nombre || opts.nombre || source.titulo || source.name || 'registro-sin-nombre';

    const record = {
      idLocal: source.idLocal || BL.utils?.makeId?.(`bl-${modulo}`) || `bl-${Date.now()}`,
      idFirebase: source.idFirebase || source.firebaseId || null,
      nombre,
      modulo,
      ruta,
      estado: source.estado || BL.config?.estadosRegistro?.PENDIENTE || 'pendiente',
      datos: source.datos || source.data || source,
      creadoEn: source.creadoEn || now,
      actualizadoEn: source.actualizadoEn || source.updatedAt || source.fechaActualizacion || now,
      sincronizadoEn: source.sincronizadoEn || null,
      origen: source.origen || opts.origen || 'base-local',
      version: source.version || BL.config?.version || '1.0.0'
    };

    record.clave = BL.utils?.buildRecordKey ? BL.utils.buildRecordKey(record) : `${record.modulo}:${record.ruta}:${record.nombre}`;
    return record;
  }

  function validateRecord(input) {
    const record = normalizeRecord(input);
    const errors = [];

    ['idLocal', 'nombre', 'modulo', 'ruta', 'estado', 'actualizadoEn'].forEach((field) => {
      if (!record[field]) errors.push(`Falta el campo obligatorio: ${field}`);
    });

    if (!Object.values(BL.config?.estadosRegistro || {}).includes(record.estado)) {
      errors.push(`Estado no reconocido: ${record.estado}`);
    }

    return {
      valido: errors.length === 0,
      errores: errors,
      registro: record
    };
  }

  function detectNewFields(input, moduleName) {
    const record = input && typeof input === 'object' ? input : {};
    const modulo = moduleName || record.modulo || 'general';
    const known = knownFieldsForModule(modulo);
    const directFields = Object.keys(record);
    const dataFields = record.datos && typeof record.datos === 'object' ? Object.keys(record.datos) : [];
    const allFields = [...new Set([...directFields, ...dataFields])];

    return allFields
      .filter((field) => !known.includes(field))
      .map((field) => ({
        id: BL.utils?.makeId ? BL.utils.makeId('campo-nuevo') : `campo-nuevo-${Date.now()}`,
        campo: field,
        modulo,
        ruta: record.ruta || null,
        estado: 'campo nuevo detectado',
        detectadoEn: BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString()
      }));
  }

  async function registerNewFields(input, moduleName) {
    const nuevos = detectNewFields(input, moduleName);
    if (!nuevos.length) return [];

    if (BL.storage?.appendToArray) {
      for (const campo of nuevos) {
        await BL.storage.appendToArray('camposNuevos', 'camposNuevos', campo);
      }
      await BL.storage.updateResumen?.();
    }

    BL.logger?.warn('Campos nuevos detectados en Curriculo.', nuevos);
    return nuevos;
  }

  function prepareForSave(input, options) {
    const validated = validateRecord(input, options);
    const camposNuevos = detectNewFields(validated.registro, validated.registro.modulo);

    return {
      ...validated,
      camposNuevos
    };
  }

  BL.schema = {
    baseFields: BASE_FIELDS,
    moduleFields: MODULE_FIELDS,
    knownFieldsForModule,
    normalizeRecord,
    validateRecord,
    detectNewFields,
    registerNewFields,
    prepareForSave
  };
})(window);
