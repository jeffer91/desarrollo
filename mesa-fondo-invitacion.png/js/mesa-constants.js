/*
=========================================================
Nombre completo: mesa-constants.js
Ruta o ubicación: /js/mesa-constants.js
Función o funciones:
- Centralizar constantes generales del proyecto.
- Definir cargos válidos y sus etiquetas documentales.
- Mantener tratamientos, textos base y configuraciones.
=========================================================
*/
"use strict";

(function attachMesaConstants(global) {
  const MesaConstants = Object.freeze({
    STORAGE_KEY: "mesa_invitaciones_generator_v3",

    DEFAULT_CITY: "Quito",
    DEFAULT_DOCUMENT_DATE: "",
    DEFAULT_SESSION_DATE: "",
    DEFAULT_PROMOTION: "",

    DEFAULT_SIGNATURE_NAME: "MSc. Jefferson Villarreal",
    DEFAULT_SIGNATURE_ROLE: "Coordinador de Titulación",

    TREATMENTS: Object.freeze([
      "",
      "Dr.",
      "Dra.",
      "Ing.",
      "Lic.",
      "Lcda.",
      "MSc.",
      "Mgtr.",
      "MBA",
      "Esp.",
      "Tecnóloga Superior",
      "Tecnólogo Superior"
    ]),

    CARGO_OPTIONS: Object.freeze([
      {
        value: "maestro_ceremonia",
        label: "Maestro de ceremonia",
        simpleLabel: "maestra de ceremonias / maestro de ceremonias",
        groupedLabel: "Maestro de ceremonia"
      },
      {
        value: "mesa_directiva_1",
        label: "Mesa directiva 1",
        simpleLabel: "integrante de la Mesa Directiva",
        groupedLabel: "Asistencia en la Mesa Directiva"
      },
      {
        value: "mesa_directiva_2",
        label: "Mesa directiva 2",
        simpleLabel: "integrante de la Mesa Directiva",
        groupedLabel: "Asistencia en la Mesa Directiva"
      },
      {
        value: "mesa_directiva_3",
        label: "Mesa directiva 3",
        simpleLabel: "integrante de la Mesa Directiva",
        groupedLabel: "Asistencia en la Mesa Directiva"
      },
      {
        value: "mesa_directiva_4",
        label: "Mesa directiva 4",
        simpleLabel: "integrante de la Mesa Directiva",
        groupedLabel: "Asistencia en la Mesa Directiva"
      },
      {
        value: "mesa_directiva_5",
        label: "Mesa directiva 5",
        simpleLabel: "integrante de la Mesa Directiva",
        groupedLabel: "Asistencia en la Mesa Directiva"
      },
      {
        value: "mesa_directiva_6",
        label: "Mesa directiva 6",
        simpleLabel: "integrante de la Mesa Directiva",
        groupedLabel: "Asistencia en la Mesa Directiva"
      },
      {
        value: "mesa_directiva_7",
        label: "Mesa directiva 7",
        simpleLabel: "integrante de la Mesa Directiva",
        groupedLabel: "Asistencia en la Mesa Directiva"
      },
      {
        value: "mesa_directiva_8",
        label: "Mesa directiva 8",
        simpleLabel: "integrante de la Mesa Directiva",
        groupedLabel: "Asistencia en la Mesa Directiva"
      },
      {
        value: "mesa_directiva_9",
        label: "Mesa directiva 9",
        simpleLabel: "integrante de la Mesa Directiva",
        groupedLabel: "Asistencia en la Mesa Directiva"
      },
      {
        value: "bienvenida",
        label: "Bienvenida",
        simpleLabel: "responsable de la bienvenida",
        groupedLabel: "Bienvenida"
      },
      {
        value: "intervencion_oficial",
        label: "Intervención oficial",
        simpleLabel: "responsable de la intervención oficial",
        groupedLabel: "Intervención oficial"
      },
      {
        value: "promesa_solemne",
        label: "Promesa solemne de los graduados",
        simpleLabel: "responsable de la promesa solemne de los graduados",
        groupedLabel: "Promesa solemne de los graduados"
      },
      {
        value: "mensaje_nuevos_profesionales",
        label: "MENSAJE A LOS NUEVOS PROFESIONALES",
        simpleLabel: "responsable del mensaje a los nuevos profesionales",
        groupedLabel: "Mensaje a los nuevos profesionales"
      },
      {
        value: "palabras_mejores_graduados",
        label: "Palabras a los mejores graduados",
        simpleLabel: "responsable de las palabras a los mejores graduados",
        groupedLabel: "Palabras a los mejores graduados"
      }
    ])
  });

  global.MesaConstants = MesaConstants;
})(window);