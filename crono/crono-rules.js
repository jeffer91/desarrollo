/*
=========================================================
Nombre completo: crono-rules.js
Ruta o ubicación: /Requisitos/crono/crono-rules.js

Función o funciones:
1. Aplicar reglas de Regulares y Supletorios.
2. Separar agendas por período y división.
3. Filtrar estudiantes habilitados.
4. Validar conflictos de aula, enlace, tribunal y horario.
=========================================================
*/
(function (window) {
  "use strict";

  var U = window.CronoUtils;
  var Storage = window.CronoStorage;

  function isActiveStudent(student) {
    var raw = U.normalizeText(student && student.estadoMatricula).toUpperCase();

    if (!raw) return true;

    if (raw === "RETIRADO") return false;
    if (raw === "ANULADO") return false;
    if (raw === "INACTIVO") return false;

    return true;
  }

  function matchesPeriod(student, periodoId) {
    return U.asText(student && student.periodoId) === U.asText(periodoId);
  }

  function matchesDivision(student, divisionId) {
    var div = U.asText(divisionId);

    if (!div || div === "__TODAS__") return true;

    return U.asText(student && student.divisionId) === div;
  }

  function matchesCareer(student, career) {
    var selected = U.asText(career);

    if (!selected || selected === "__TODAS__") return true;

    return U.normalizeText(student && student.carrera) === U.normalizeText(selected);
  }

  function getDivisions(students, periodoId) {
    var list = [];

    (Array.isArray(students) ? students : []).forEach(function (s) {
      if (!matchesPeriod(s, periodoId)) return;

      list.push({
        id: s.divisionId || "general",
        label: s.divisionLabel || "General"
      });
    });

    var seen = Object.create(null);
    var out = [];

    list.forEach(function (d) {
      if (seen[d.id]) return;
      seen[d.id] = true;
      out.push(d);
    });

    out.sort(function (a, b) {
      return U.compareSpanish(a.label, b.label);
    });

    return out;
  }

  function getCareers(students, periodoId, divisionId) {
    var list = [];

    (Array.isArray(students) ? students : []).forEach(function (s) {
      if (!matchesPeriod(s, periodoId)) return;
      if (!matchesDivision(s, divisionId)) return;
      if (!s.habilitado) return;
      if (!isActiveStudent(s)) return;

      list.push(s.carrera);
    });

    return U.unique(list).sort(U.compareSpanish);
  }

  function filterStudents(params) {
    var students = Array.isArray(params.students) ? params.students : [];
    var periodoId = params.periodoId;
    var divisionId = params.divisionId;
    var carrera = params.carrera;
    var tipoAgenda = params.tipoAgenda || "regulares";

    var base = students.filter(function (s) {
      if (!matchesPeriod(s, periodoId)) return false;
      if (!matchesDivision(s, divisionId)) return false;
      if (!matchesCareer(s, carrera)) return false;
      if (!isActiveStudent(s)) return false;
      if (!s.habilitado) return false;
      return true;
    });

    if (tipoAgenda !== "supletorios") {
      return base;
    }

    var results = Storage.getRegularResults(periodoId, divisionId);

    return base.filter(function (s) {
      return results[s.cedula] === "no_paso";
    });
  }

  function validateAgenda(agenda) {
    var list = Array.isArray(agenda) ? agenda : [];
    var conflicts = [];
    var byRoom = Object.create(null);
    var byLink = Object.create(null);
    var byTribunal = Object.create(null);

    list.forEach(function (item) {
      var fecha = U.asText(item.fecha);
      var hora = U.asText(item.hora);
      var aula = U.asText(item.aula);
      var enlace = U.asText(item.enlace);
      var sede = U.asText(item.sede);
      var keyBase = fecha + "|" + hora;

      if (!fecha || !hora) return;

      if (!U.isVirtualSede(sede) && aula) {
        var roomKey = U.slotKey([keyBase, aula]);
        if (byRoom[roomKey]) {
          conflicts.push({
            type: "AULA",
            message: "Cruce de aula: " + aula + " el " + fecha + " a las " + hora,
            items: [byRoom[roomKey], item]
          });
        } else {
          byRoom[roomKey] = item;
        }
      }

      if (U.isVirtualSede(sede) && enlace) {
        var linkKey = U.slotKey([keyBase, enlace]);
        if (byLink[linkKey]) {
          conflicts.push({
            type: "ENLACE",
            message: "Cruce de enlace virtual el " + fecha + " a las " + hora,
            items: [byLink[linkKey], item]
          });
        } else {
          byLink[linkKey] = item;
        }
      }

      (item.tribunales || []).forEach(function (tribunal) {
        var t = U.normalizePerson(tribunal);
        if (!t) return;

        var tribunalKey = U.slotKey([keyBase, t]);

        if (byTribunal[tribunalKey]) {
          conflicts.push({
            type: "TRIBUNAL",
            message: "Cruce de tribunal: " + tribunal + " el " + fecha + " a las " + hora,
            items: [byTribunal[tribunalKey], item]
          });
        } else {
          byTribunal[tribunalKey] = item;
        }
      });
    });

    return conflicts;
  }

  window.CronoRules = {
    isActiveStudent: isActiveStudent,
    getDivisions: getDivisions,
    getCareers: getCareers,
    filterStudents: filterStudents,
    validateAgenda: validateAgenda
  };
})(window);
