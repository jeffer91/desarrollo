/*
=========================================================
Nombre completo: falt.data.js
Ruta o ubicación: /incorporaciones/falt/falt.data.js

Función o funciones:
1. Leer períodos disponibles desde la base local compartida con Requisitos/Tabla.
2. Leer estudiantes únicamente del período seleccionado.
3. Normalizar registros para que el módulo Faltantes pueda buscar por cédula o nombre.
4. Usar ExcelLocalRepo como fuente principal cuando esté disponible.
5. Usar localStorage como respaldo si ExcelLocalRepo no está disponible.
6. No mostrar estudiantes automáticamente en la tabla; solo entrega la base del período
   para que falt.search.js procese la búsqueda del pop-up.

Con qué se conecta:
- ../../Requisitos/Gestion/Excel/excel-local/excel-local.config.js
- ../../Requisitos/Gestion/Excel/excel-local/excel-local.storage.js
- ../../Requisitos/Gestion/Excel/excel-local/excel-local.bridge.js
- ../../Requisitos/Gestion/Excel/excel-local.repo.js
- falt.utils.js
- falt.state.js
- falt.search.js
- falt.app.js
=========================================================
*/

(function (window) {
  "use strict";

  var U = window.FaltUtils || {};

  var SNAPSHOT_KEYS = [
    "itsqmet.requisitos.excel.snapshot",
    "itsqmet.requisitos.excel.local.snapshot",
    "excel.local.snapshot",
    "itsqmet.excel.snapshot"
  ];

  function asText(value) {
    if (U.asText) return U.asText(value);
    return String(value == null ? "" : value).trim();
  }

  function normalizeText(value) {
    if (U.normalizeText) return U.normalizeText(value);

    return asText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function keyText(value) {
    return normalizeText(value).toUpperCase();
  }

  function cleanCedula(value) {
    var digits = asText(value).replace(/\D+/g, "");
    if (digits.length === 9) return "0" + digits;
    return digits;
  }

  function getFirst(row, keys) {
    var data = row || {};

    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];

      if (Object.prototype.hasOwnProperty.call(data, key)) {
        var value = asText(data[key]);

        if (value) return value;
      }
    }

    var realKeys = Object.keys(data);
    var map = {};

    realKeys.forEach(function (key) {
      map[keyText(key)] = key;
    });

    for (var j = 0; j < keys.length; j += 1) {
      var wanted = keyText(keys[j]);
      var realKey = map[wanted];

      if (realKey) {
        var realValue = asText(data[realKey]);

        if (realValue) return realValue;
      }
    }

    return "";
  }

  function getCedula(row) {
    if (U.getCedula) return asText(U.getCedula(row));

    return getFirst(row, [
      "cedula",
      "cédula",
      "Cedula",
      "Cédula",
      "CEDULA",
      "numeroIdentificacion",
      "Número Identificación",
      "Numero Identificacion",
      "identificacion",
      "Identificacion",
      "IDENTIFICACION",
      "documento",
      "Documento"
    ]);
  }

  function getNombres(row) {
    if (U.getNombres) return asText(U.getNombres(row));

    return getFirst(row, [
      "Nombres",
      "nombres",
      "nombre",
      "Nombre",
      "NOMBRE",
      "estudiante",
      "Estudiante",
      "ESTUDIANTE",
      "apellidosNombres",
      "Apellidos y Nombres",
      "APELLIDOS Y NOMBRES"
    ]);
  }

  function getCarrera(row) {
    if (U.getCarrera) return asText(U.getCarrera(row));

    return getFirst(row, [
      "Carrera",
      "carrera",
      "CARRERA",
      "nombreCarrera",
      "Nombre Carrera",
      "NOMBRE CARRERA",
      "programa",
      "Programa",
      "PROGRAMA",
      "carreraNombre"
    ]);
  }

  function getPeriodo(row) {
    return getFirst(row, [
      "periodoId",
      "periodo",
      "Periodo",
      "PERIODO",
      "periodoAcademico",
      "Periodo Académico",
      "Periodo Academico",
      "PERIODO ACADEMICO",
      "cohorte",
      "Cohorte"
    ]);
  }

  function getTelefono(row) {
    if (U.getTelefono) return asText(U.getTelefono(row));

    return getFirst(row, [
      "celular",
      "Celular",
      "CELULAR",
      "telefono",
      "Teléfono",
      "Telefono",
      "TELEFONO",
      "whatsapp",
      "WhatsApp",
      "WHATSAPP",
      "numeroCelular",
      "Número Celular"
    ]);
  }

  function getTelegram(row) {
    if (U.getTelegram) return asText(U.getTelegram(row));

    return getFirst(row, [
      "telegram",
      "Telegram",
      "TELEGRAM",
      "usuarioTelegram",
      "Usuario Telegram",
      "userTelegram",
      "telegramUser"
    ]);
  }

  function getCorreo(row) {
    return getFirst(row, [
      "correo",
      "Correo",
      "CORREO",
      "email",
      "Email",
      "EMAIL",
      "correoPersonal",
      "correoInstitucional"
    ]);
  }

  function normalizarEstudiante(row, periodoId, periodoTexto) {
    var cedula = getCedula(row);
    var nombre = getNombres(row);
    var carrera = getCarrera(row);
    var periodo = getPeriodo(row) || periodoTexto || periodoId;

    var clone = Object.assign({}, row || {});

    clone._faltBase = Object.assign({}, clone._faltBase || {}, {
      id: cleanCedula(cedula) || normalizeText(nombre + carrera),
      cedula: cedula,
      cedulaNormal: cleanCedula(cedula),
      nombre: nombre,
      carrera: carrera,
      periodo: periodo,
      periodoId: asText(periodoId),
      periodoTexto: asText(periodoTexto) || asText(periodoId),
      telefono: getTelefono(row),
      telegram: getTelegram(row),
      correo: getCorreo(row)
    });

    return clone;
  }

  function ensureBridgeReady() {
    try {
      if (
        window.ExcelLocalBridge &&
        typeof window.ExcelLocalBridge.ensureReady === "function"
      ) {
        window.ExcelLocalBridge.ensureReady();
      }
    } catch (error) {
      console.warn("[FaltData] No se pudo inicializar ExcelLocalBridge:", error);
    }
  }

  function readFromExcelLocalRepo() {
    ensureBridgeReady();

    try {
      if (
        window.ExcelLocalRepo &&
        typeof window.ExcelLocalRepo.listAllStudents === "function"
      ) {
        var rows = window.ExcelLocalRepo.listAllStudents() || [];
        return Array.isArray(rows) ? rows : [];
      }

      if (
        window.ExcelLocalRepo &&
        typeof window.ExcelLocalRepo.listStudents === "function"
      ) {
        var rows2 = window.ExcelLocalRepo.listStudents() || [];
        return Array.isArray(rows2) ? rows2 : [];
      }
    } catch (error) {
      console.warn("[FaltData] No se pudo leer ExcelLocalRepo:", error);
    }

    return [];
  }

  function readSnapshotByKey(key) {
    try {
      var raw = window.localStorage.getItem(key);

      if (!raw) return null;

      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function extractArrayDeep(value, result, depth) {
    if (depth > 5 || !value) return;

    if (Array.isArray(value)) {
      value.forEach(function (item) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          result.push(item);
        }
      });
      return;
    }

    if (typeof value === "object") {
      Object.keys(value).forEach(function (key) {
        var child = value[key];

        if (Array.isArray(child)) {
          extractArrayDeep(child, result, depth + 1);
        } else if (child && typeof child === "object") {
          if (child.byId && typeof child.byId === "object") {
            Object.keys(child.byId).forEach(function (id) {
              if (child.byId[id] && typeof child.byId[id] === "object") {
                result.push(child.byId[id]);
              }
            });
          }

          extractArrayDeep(child, result, depth + 1);
        }
      });
    }
  }

  function readFromSnapshots() {
    var result = [];

    SNAPSHOT_KEYS.forEach(function (key) {
      var snapshot = readSnapshotByKey(key);

      if (!snapshot) return;

      extractArrayDeep(snapshot, result, 0);
    });

    return result;
  }

  function uniqueRows(rows) {
    var seen = {};
    var result = [];

    (rows || []).forEach(function (row, index) {
      var cedula = cleanCedula(getCedula(row));
      var nombre = normalizeText(getNombres(row));
      var carrera = normalizeText(getCarrera(row));
      var key = cedula || nombre + "|" + carrera || "row_" + index;

      if (!key || seen[key]) return;

      seen[key] = true;
      result.push(row);
    });

    return result;
  }

  function getAllStudents() {
    var repoRows = readFromExcelLocalRepo();
    var snapshotRows = readFromSnapshots();

    return uniqueRows(repoRows.concat(snapshotRows));
  }

  function extractPeriodos(rows) {
    var map = {};

    (rows || []).forEach(function (row) {
      var periodo = getPeriodo(row);

      if (!periodo) return;

      var id = periodo;
      var key = keyText(id);

      if (!map[key]) {
        map[key] = {
          id: id,
          value: id,
          label: periodo,
          text: periodo,
          nombre: periodo
        };
      }
    });

    return Object.keys(map)
      .map(function (key) {
        return map[key];
      })
      .sort(function (a, b) {
        return asText(b.label).localeCompare(asText(a.label), "es");
      });
  }

  function periodoMatches(row, periodoId, periodoTexto) {
    var rowPeriodo = getPeriodo(row);
    var selectedId = asText(periodoId);
    var selectedText = asText(periodoTexto);

    if (!selectedId && !selectedText) return false;

    var rowKey = keyText(rowPeriodo);
    var idKey = keyText(selectedId);
    var textKey = keyText(selectedText);

    if (!rowKey) return false;

    return rowKey === idKey || rowKey === textKey;
  }

  async function listarPeriodos() {
    var rows = getAllStudents();
    return extractPeriodos(rows);
  }

  async function cargarEstudiantesPorPeriodo(periodoId, periodoTexto) {
    var rows = getAllStudents();

    var filtered = rows.filter(function (row) {
      return periodoMatches(row, periodoId, periodoTexto || periodoId);
    });

    return filtered.map(function (row) {
      return normalizarEstudiante(row, periodoId, periodoTexto || periodoId);
    });
  }

  function diagnostico() {
    var all = getAllStudents();
    var periodos = extractPeriodos(all);

    return {
      totalEstudiantes: all.length,
      totalPeriodos: periodos.length,
      usaExcelLocalRepo: Boolean(
        window.ExcelLocalRepo &&
          (
            typeof window.ExcelLocalRepo.listAllStudents === "function" ||
            typeof window.ExcelLocalRepo.listStudents === "function"
          )
      ),
      snapshotKeys: SNAPSHOT_KEYS
    };
  }

  window.FaltData = {
    listarPeriodos: listarPeriodos,
    cargarEstudiantesPorPeriodo: cargarEstudiantesPorPeriodo,
    diagnostico: diagnostico,
    getAllStudents: getAllStudents,
    getCedula: getCedula,
    getNombres: getNombres,
    getCarrera: getCarrera,
    getPeriodo: getPeriodo,
    getTelefono: getTelefono,
    getTelegram: getTelegram
  };
})(window);