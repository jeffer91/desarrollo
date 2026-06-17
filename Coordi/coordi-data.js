/*
=========================================================
Nombre completo: coordi-data.js
Ruta o ubicación: /Coordi/coordi-data.js
Función o funciones:
1. Centralizar responsables de requisitos.
2. Centralizar coordinadores por carrera y Telegram.
3. Definir requisitos y alias para lectura flexible.
4. No toca datos de Gestión ni modifica estudiantes.
=========================================================
*/
(function (window) {
  "use strict";

  function asText(value) {
    return String(value == null ? "" : value).trim();
  }

  function onlyDigits(value) {
    return asText(value).replace(/\D+/g, "");
  }

  function normalizeEcuadorPhone(value) {
    var digits = onlyDigits(value);

    if (!digits) return "";

    if (digits.indexOf("593") === 0) {
      return digits;
    }

    if (digits.charAt(0) === "0") {
      return "593" + digits.slice(1);
    }

    if (digits.length === 9) {
      return "593" + digits;
    }

    return digits;
  }

  var RESPONSABLES = {
    academico: {
      id: "academico",
      area: "Académico",
      nombre: "Ing. Martha Tomalá",
      whatsapp: "0995278201",
      whatsappIntl: normalizeEcuadorPhone("0995278201"),
      correo: "mtomala@itsqmet.edu.ec"
    },
    documentacion: {
      id: "documentacion",
      area: "Documentación",
      nombre: "Srta. Leidy Salinas",
      whatsapp: "0990400113",
      whatsappIntl: normalizeEcuadorPhone("0990400113"),
      correo: "lsalinas@itsqmet.edu.ec"
    },
    financiero: {
      id: "financiero",
      area: "Financiero",
      nombre: "Tnlg. Paulina Araujo",
      whatsapp: "0984848165",
      whatsappIntl: normalizeEcuadorPhone("0984848165"),
      correo: "paraujo@itsqmet.edu.ec"
    },
    ingles: {
      id: "ingles",
      area: "Inglés",
      nombre: "Mgt. Alejandra Hernández",
      whatsapp: "0999741618",
      whatsappIntl: normalizeEcuadorPhone("0999741618"),
      correo: "mhernandez@itsqmet.edu.ec"
    },
    actualizacion_datos: {
      id: "actualizacion_datos",
      area: "Actualización de Datos",
      nombre: "Srta. Leidy Salinas",
      whatsapp: "0990400113",
      whatsappIntl: normalizeEcuadorPhone("0990400113"),
      correo: "lsalinas@itsqmet.edu.ec"
    },
    practicas: {
      id: "practicas",
      area: "Prácticas",
      nombre: "Mgt. Verónica Ayala",
      whatsapp: "0990400113",
      whatsappIntl: normalizeEcuadorPhone("0990400113"),
      correo: "veayala@itsqmet.edu.ec"
    },
    vinculacion: {
      id: "vinculacion",
      area: "Vinculación",
      nombre: "Mgt. Verónica Ayala",
      whatsapp: "0990400113",
      whatsappIntl: normalizeEcuadorPhone("0990400113"),
      correo: "veayala@itsqmet.edu.ec"
    },
    seguimiento: {
      id: "seguimiento",
      area: "Seguimiento Graduados",
      nombre: "Mgt. Yesenia Ortega",
      whatsapp: "0983553466",
      whatsappIntl: normalizeEcuadorPhone("0983553466"),
      correo: "mortegaf@itsqmet.edu.ec"
    },
    titulacion: {
      id: "titulacion",
      area: "Titulación",
      nombre: "Msc. Jefferson Villarreal",
      whatsapp: "",
      whatsappIntl: "",
      correo: "jvillarreal@itsqmet.edu.ec"
    }
  };

  var REQUIREMENTS = [
    {
      id: "academico",
      label: "Académico",
      responsableId: "academico",
      aliases: [
        "academico",
        "académico",
        "requisito academico",
        "requisito académico",
        "estado academico",
        "estado académico"
      ]
    },
    {
      id: "documentacion",
      label: "Documentación",
      responsableId: "documentacion",
      aliases: [
        "documentacion",
        "documentación",
        "documentació",
        "requisito documentacion",
        "requisito documentación",
        "estado documentacion",
        "estado documentación"
      ]
    },
    {
      id: "financiero",
      label: "Financiero",
      responsableId: "financiero",
      aliases: [
        "financiero",
        "requisito financiero",
        "estado financiero"
      ]
    },
    {
      id: "ingles",
      label: "Inglés",
      responsableId: "ingles",
      aliases: [
        "ingles",
        "inglés",
        "requisito ingles",
        "requisito inglés",
        "estado ingles",
        "estado inglés"
      ]
    },
    {
      id: "actualizacion_datos",
      label: "Actualización de Datos",
      responsableId: "actualizacion_datos",
      aliases: [
        "actualizacion datos",
        "actualización datos",
        "actualizacion de datos",
        "actualización de datos",
        "actualizaciondatos",
        "actualizacióndatos",
        "act datos",
        "act. datos",
        "datos",
        "actualizacion"
      ]
    },
    {
      id: "practicas",
      label: "Prácticas",
      responsableId: "practicas",
      aliases: [
        "practicas",
        "prácticas",
        "practicas vinculacion",
        "prácticas vinculación",
        "practicasvinculacion",
        "prácticasvinculación"
      ]
    },
    {
      id: "vinculacion",
      label: "Vinculación",
      responsableId: "vinculacion",
      aliases: [
        "vinculacion",
        "vinculación",
        "requisito vinculacion",
        "requisito vinculación",
        "estado vinculacion",
        "estado vinculación"
      ]
    },
    {
      id: "seguimiento",
      label: "Seguimiento Graduados",
      responsableId: "seguimiento",
      aliases: [
        "seguimiento",
        "seguimiento graduados",
        "seguimientograduados",
        "seguimiento a graduados",
        "seguimiento de graduados"
      ]
    },
    {
      id: "titulacion",
      label: "Titulación",
      responsableId: "titulacion",
      aliases: [
        "titulacion",
        "titulación",
        "requisito titulacion",
        "requisito titulación",
        "estado titulacion",
        "estado titulación"
      ]
    }
  ];

  var COORDINATORS = [
    {
      carrera: "Enfermería",
      coordinador: "Ana Emilia Guzman",
      programa: "Técnico Superior",
      telegram: "@emiliaguzmant"
    },
    {
      carrera: "Mecánica Automotriz",
      coordinador: "Dario Torres",
      programa: "Tecnología Superior",
      telegram: "@INGEDARIOTORRES"
    },
    {
      carrera: "Mecánica de Motos",
      coordinador: "Dario Torres",
      programa: "Tecnología Superior",
      telegram: "@INGEDARIOTORRES"
    },
    {
      carrera: "Diseño Multimedia",
      coordinador: "Javier Tapia",
      programa: "Tecnología Superior",
      telegram: "@JAVIERTAPIA28"
    },
    {
      carrera: "Marketing Digital y Comercio Electrónico",
      coordinador: "Javier Tapia",
      programa: "Tecnología Superior",
      telegram: "@JAVIERTAPIA28"
    },
    {
      carrera: "Marketing Digital y Comercio Electrónico TSU",
      coordinador: "Javier Tapia",
      programa: "Tecnología Universitaria",
      telegram: "@JAVIERTAPIA28"
    },
    {
      carrera: "Ventas",
      coordinador: "Javier Tapia",
      programa: "Tecnología Superior",
      telegram: "@JAVIERTAPIA28"
    },
    {
      carrera: "Desarrollo de Software",
      coordinador: "Juan Carlos Pazmiño",
      programa: "Tecnología Superior",
      telegram: "@JUANPAZMINO"
    },
    {
      carrera: "Desarrollo de Software y Ciberseguridad",
      coordinador: "Juan Carlos Pazmiño",
      programa: "Tecnología Universitaria",
      telegram: "@JUANPAZMINO"
    },
    {
      carrera: "Redes y Telecomunicaciones",
      coordinador: "Juan Carlos Pazmiño",
      programa: "Tecnología Superior",
      telegram: "@JUANPAZMINO"
    },
    {
      carrera: "Redes y Telecomunicaciones TSU",
      coordinador: "Juan Carlos Pazmiño",
      programa: "Tecnología Universitaria",
      telegram: "@JUANPAZMINO"
    },
    {
      carrera: "Estética Integral",
      coordinador: "Katherine Chamba",
      programa: "Tecnología Superior",
      telegram: "@Katherine_Chamba_21"
    },
    {
      carrera: "Educación Básica",
      coordinador: "Maria Eugenio Barre",
      programa: "Tecnología Superior",
      telegram: "@MBARREAVILA"
    },
    {
      carrera: "Educación Inicial",
      coordinador: "Maria Eugenio Barre",
      programa: "Tecnología Superior",
      telegram: "@MBARREAVILA"
    },
    {
      carrera: "Educación Inicial TSU",
      coordinador: "Maria Eugenio Barre",
      programa: "Tecnología Universitaria",
      telegram: "@MBARREAVILA"
    },
    {
      carrera: "Pedagogía",
      coordinador: "Maria Eugenio Barre",
      programa: "Tecnología Universitaria",
      telegram: "@MBARREAVILA"
    },
    {
      carrera: "Procesamiento de Alimentos",
      coordinador: "Mayra Molina",
      programa: "Tecnología Superior",
      telegram: ""
    },
    {
      carrera: "Administración",
      coordinador: "Rodrigo Espinoza",
      programa: "Tecnología Superior",
      telegram: "@RODRIGOESPINOZAITSQMET"
    },
    {
      carrera: "Administración de Empresas e inteligencia de negocios",
      coordinador: "Rodrigo Espinoza",
      programa: "Tecnología Universitaria",
      telegram: "@RODRIGOESPINOZAITSQMET"
    },
    {
      carrera: "Administración del Talento Humano",
      coordinador: "Rodrigo Espinoza",
      programa: "Tecnología Universitaria",
      telegram: ""
    },
    {
      carrera: "Contabilidad",
      coordinador: "Rodrigo Espinoza",
      programa: "Tecnología Superior",
      telegram: "@RODRIGOESPINOZAITSQMET"
    },
    {
      carrera: "Contabilidad y Tributación TSU",
      coordinador: "Rodrigo Espinoza",
      programa: "Tecnología Universitaria",
      telegram: "@RODRIGOESPINOZAITSQMET"
    },
    {
      carrera: "Gestión del Talento Humano",
      coordinador: "Rodrigo Espinoza",
      programa: "Tecnología Superior",
      telegram: ""
    },
    {
      carrera: "Seguridad y Prevención de Riesgos Laborales",
      coordinador: "Rodrigo Espinoza",
      programa: "Tecnología Superior",
      telegram: "@RODRIGOESPINOZAITSQMET"
    },
    {
      carrera: "Rehabilitación Física",
      coordinador: "Andrea Moreano",
      programa: "Tecnología Superior",
      telegram: ""
    },
    {
      carrera: "Seguridad Ciudadana y Orden Publico",
      coordinador: "Sonia Moreno",
      programa: "Tecnología Superior",
      telegram: "@Smoreno1"
    },
    {
      carrera: "Gastronomia",
      coordinador: "Amado Chiluisa",
      programa: "Tecnología Superior",
      telegram: ""
    }
  ];

  window.CoordiData = {
    RESPONSABLES: RESPONSABLES,
    REQUIREMENTS: REQUIREMENTS,
    COORDINATORS: COORDINATORS,
    normalizeEcuadorPhone: normalizeEcuadorPhone
  };
})(window);
