/* =========================================================
Archivo: baselocal.manual.js
Ubicación: BaseLocal/baselocal.manual.js

Función:
- Documentar cómo otras apps deben leer BaseLocal.
- Entregar referencias copiables de scripts.
- Entregar ejemplos de lectura, diagnóstico y Firebase.
========================================================= */

(function (window) {
  "use strict";

  var references = [
    '<script src="../Gestion/Excel/excel-local/excel-local.config.js"></script>',
    '<script src="../Gestion/Excel/excel-local/excel-local.storage.js"></script>',
    '<script src="../Gestion/Excel/excel-local/excel-local.bridge.js"></script>',
    '<script src="../Gestion/Excel/excel-local.repo.js"></script>',
    '<script src="../Stats/stats-period-rules.js"></script>',
    '<script src="../Stats/stats-period-divisions.js"></script>',
    '<script src="../BaseLocal/baselocal.core.js"></script>'
  ];

  var firebaseReferences = [
    '<script src="../Gestion/Excel/excel-remote.repo.js"></script>',
    '<script src="../Gestion/Excel/excel-sync.service.js"></script>',
    '<script src="../Gestion/Excel/excel-sync.bridge.js"></script>',
    '<script src="../BaseLocal/baselocal.firebase.js"></script>'
  ];

  var schema = {
    snapshot: {
      meta: {
        app: "Requisitos",
        module: "BaseLocal",
        version: "1.0.0",
        source: "ExcelLocalRepo",
        generatedAt: "ISO_DATE",
        totalPeriodos: 0,
        totalEstudiantes: 0,
        totalDivisiones: 0,
        totalCarreras: 0
      },
      periodos: [],
      estudiantes: [],
      divisiones: [],
      carreras: [],
      indices: {
        estudiantesPorCedula: {},
        estudiantesPorPeriodo: {},
        divisionesPorPeriodo: {},
        carrerasPorPeriodo: {}
      },
      diagnostico: {
        ok: true,
        errores: [],
        advertencias: []
      }
    },

    periodo: {
      id: "octubre_2025_marzo_2026",
      label: "Octubre 2025 a Marzo 2026",
      inicioMes: 10,
      inicioAnio: 2025,
      finMes: 3,
      finAnio: 2026,
      totalEstudiantes: 0,
      totalDivisiones: 0,
      raw: {}
    },

    estudiante: {
      id: "periodo__cedula",
      localId: "cedula",
      cedula: "0000000000",
      nombres: "NOMBRE",
      apellidos: "APELLIDO",
      nombreCompleto: "NOMBRE APELLIDO",
      periodoId: "periodo_id",
      periodoLabel: "Período",
      carrera: "CARRERA",
      modalidad: "MODALIDAD",
      jornada: "JORNADA",
      sede: "SEDE",
      divisionId: "periodo__carrera__modalidad__jornada__sede",
      divisionLabel: "CARRERA / MODALIDAD / JORNADA / SEDE",
      estadoMatricula: "ACTIVO",
      requisitos: {
        academico: "CUMPLE",
        documentacion: "CUMPLE",
        financiero: "CUMPLE",
        titulacion: "CUMPLE",
        practicas: "CUMPLE",
        vinculacion: "CUMPLE",
        seguimientoGraduados: "CUMPLE",
        ingles: "CUMPLE",
        actualizacionDatos: "CUMPLE"
      },
      notas: {
        notaFinal: null
      },
      contacto: {
        celular: "",
        correoInstitucional: "",
        correoPersonal: ""
      },
      raw: {}
    },

    division: {
      id: "periodo__carrera__modalidad__jornada__sede",
      periodoId: "periodo_id",
      label: "CARRERA / MODALIDAD / JORNADA / SEDE",
      carrera: "CARRERA",
      modalidad: "MODALIDAD",
      jornada: "JORNADA",
      sede: "SEDE",
      totalEstudiantes: 0,
      estudiantesIds: []
    }
  };

  var examples = {
    readAll: [
      "async function leerBaseLocal() {",
      "  await window.BaseLocalAPI.ensureReady();",
      "  const db = window.BaseLocalAPI.getSnapshot();",
      "  console.log(db.meta);",
      "  console.log(db.periodos);",
      "  console.log(db.estudiantes);",
      "  console.log(db.divisiones);",
      "  return db;",
      "}"
    ].join("\n"),

    readStudentsByPeriod: [
      "async function leerEstudiantesDePeriodo(periodoId) {",
      "  await window.BaseLocalAPI.ensureReady();",
      "  return window.BaseLocalAPI.getStudentsByPeriod(periodoId);",
      "}"
    ].join("\n"),

    readDiagnostics: [
      "async function diagnosticarBase() {",
      "  await window.BaseLocalAPI.ensureReady();",
      "  const diagnostico = window.BaseLocalAPI.getDiagnostics();",
      "  if (!diagnostico.ok) {",
      "    console.warn('Errores:', diagnostico.errores);",
      "  }",
      "  console.warn('Advertencias:', diagnostico.advertencias);",
      "  return diagnostico;",
      "}"
    ].join("\n"),

    pushFirebase: [
      "async function enviarBaseAFirebase() {",
      "  await window.BaseLocalAPI.ensureReady();",
      "  const result = await window.BaseLocalFirebase.pushToFirebase();",
      "  console.log(result);",
      "  return result;",
      "}"
    ].join("\n"),

    pullFirebase: [
      "async function jalarBaseDesdeFirebase() {",
      "  const result = await window.BaseLocalFirebase.pullFromFirebase({",
      "    applyToLocal: true",
      "  });",
      "  console.log(result);",
      "  return result;",
      "}"
    ].join("\n")
  };

  function getReferenceText() {
    return [
      "BASELOCAL — MANUAL PARA FUTURAS APPS",
      "====================================",
      "",
      "1. Ubicación recomendada:",
      "   /BaseLocal/",
      "",
      "2. Regla principal:",
      "   Excel carga la base.",
      "   ExcelLocalRepo guarda la base local.",
      "   Stats ayuda a normalizar divisiones.",
      "   BaseLocalAPI entrega la base lista para otras apps.",
      "",
      "3. Scripts mínimos para leer BaseLocal:",
      "",
      references.join("\n"),
      "",
      "4. Scripts adicionales si la app también usará Firebase:",
      "",
      firebaseReferences.join("\n"),
      "",
      "5. Ejemplo: leer toda la base",
      "",
      examples.readAll,
      "",
      "6. Ejemplo: leer estudiantes por período",
      "",
      examples.readStudentsByPeriod,
      "",
      "7. Ejemplo: diagnóstico",
      "",
      examples.readDiagnostics,
      "",
      "8. Ejemplo: enviar a Firebase",
      "",
      examples.pushFirebase,
      "",
      "9. Ejemplo: jalar desde Firebase",
      "",
      examples.pullFirebase,
      "",
      "10. Esquema normalizado",
      "",
      JSON.stringify(schema, null, 2),
      "",
      "11. Colecciones usadas en Firebase",
      "",
      "requisitos_base_local_meta",
      "requisitos_base_local_periodos",
      "requisitos_base_local_estudiantes",
      "requisitos_base_local_divisiones",
      "requisitos_base_local_syncLogs"
    ].join("\n");
  }

  async function copyReferenceText() {
    var text = getReferenceText();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return {
        ok: true,
        method: "clipboard"
      };
    }

    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    document.execCommand("copy");
    textarea.remove();

    return {
      ok: true,
      method: "execCommand"
    };
  }

  window.BaseLocalManual = {
    version: "1.0.0",
    description: "Manual de uso de BaseLocal para futuras apps.",
    scriptReferences: references.slice(),
    firebaseReferences: firebaseReferences.slice(),
    dataSchema: schema,
    examples: examples,

    getReferenceText: getReferenceText,
    copyReferenceText: copyReferenceText
  };
})(window);
