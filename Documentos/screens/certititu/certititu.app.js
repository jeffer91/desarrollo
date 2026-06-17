// Archivo: screens/certititu/certititu.app.js
(function (window) {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  // Referencias
  var elPeriodo = $("ct-periodo");
  var elSearch = $("ct-search");
  var elSuggest = $("ct-suggest");
  var elSuggestList = $("ct-suggest-list");
  var elSelected = $("ct-selected");
  var elStatus = $("ct-status"); // Ahora es un pill arriba
  var elDoc = $("ct-doc");
  var btnPdf = $("ct-btn-pdf");
  var btnRefrescar = $("ct-btn-refrescar");
  var btnVolver = $("ct-btn-volver"); // Referencia al botón volver

  var state = {
    estudiantes: [],
    periodo: "",
    selectedStudent: null
  };

  function setStatus(msg, type) {
    if (!elStatus) return;
    elStatus.textContent = msg;
    if (type === "ok") {
      elStatus.style.color = "#166534";
      elStatus.style.background = "#dcfce7";
      elStatus.style.borderColor = "#bbf7d0";
    } else if (type === "err") {
      elStatus.style.color = "#9f1239";
      elStatus.style.background = "#fee2e2";
      elStatus.style.borderColor = "#fecaca";
    } else {
      elStatus.style.color = "#475569";
      elStatus.style.background = "#f1f5f9";
      elStatus.style.borderColor = "#e2e8f0";
    }
  }

  function fillPeriodos(items) {
    elPeriodo.innerHTML = "";
    var opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "Selecciona periodo...";
    elPeriodo.appendChild(opt0);

    (items || []).forEach(function (it) {
      var opt = document.createElement("option");
      opt.value = it.value;
      opt.textContent = it.label;
      elPeriodo.appendChild(opt);
    });
  }

  function clearSuggest() {
    elSuggest.hidden = true;
    elSuggestList.innerHTML = "";
  }

  function selectStudent(student) {
    state.selectedStudent = student;

    // Corrección: soporta ambas formas de datos (Cedula/NombreCompleto o cedula/nombre)
    var ced = student.Cedula || student.cedula || student.id || "";
    var nom = student.NombreCompleto || student.nombre || "";

    elSelected.innerHTML = `Seleccionado: <b>${ced} - ${nom}</b>`;
    elSearch.value = ced + " - " + nom;

    clearSuggest();
    btnPdf.disabled = false;
    setStatus("Listo para descargar", "ok");
    renderDoc();
  }

  function showSuggest(items) {
    elSuggestList.innerHTML = "";
    if (!items || items.length === 0) {
      clearSuggest();
      return;
    }

    (items || []).slice(0, 10).forEach(function (s) {
      var li = document.createElement("li");
      li.style.padding = "10px 12px";
      li.style.cursor = "pointer";
      li.style.borderBottom = "1px solid #f1f5f9";
      li.style.backgroundColor = "#fff";
      li.style.listStyle = "none";
      li.style.fontSize = "13px";

      li.textContent = `${s.Cedula || s.cedula || ""} - ${s.NombreCompleto || s.nombre || ""}`;

      li.onmouseover = function () { li.style.backgroundColor = "#f8fafc"; };
      li.onmouseout = function () { li.style.backgroundColor = "#fff"; };

      li.onclick = function (e) {
        e.stopPropagation();
        selectStudent(s);
      };
      elSuggestList.appendChild(li);
    });
    elSuggest.hidden = false;
  }

  function buildPayload(student) {
    if (!student) return {};

    var periodoTexto = state.periodo ?
      (elPeriodo.options[elPeriodo.selectedIndex].text) :
      (student.periodoLabel || "");

    var now = new Date();

    // Comentario técnico:
    // Se mantienen campos nuevos para plantilla/PDF. Ya no dependemos de "tituloObtenido" en el texto final
    // porque se reemplazó por "graduación en la carrera de", evitando problemas de género.
    return {
      // Nuevos (plantilla oficial)
      nombreCompletoEstudiante: student.NombreCompleto || student.nombre || "NOMBRE DESCONOCIDO",
      numeroCedula: student.Cedula || student.cedula || student.id || "S/N",
      nombreCarrera: student.Carrera || student.carrera || "Titulación",
      modalidad: student.Modalidad || student.modalidad || "",
      jornada: student.Jornada || student.jornada || "",
      periodoAcademico: periodoTexto,
      ciudad: student.Ciudad || student.ciudad || "Quito",
      dia: String(now.getDate()),
      mes: now.toLocaleDateString("es-EC", { month: "long" }),
      anio: String(now.getFullYear()),

      // Antiguos (compatibilidad con otros usos)
      periodo: periodoTexto,
      estudiante: student.NombreCompleto || student.nombre || "NOMBRE DESCONOCIDO",
      cedula: student.Cedula || student.cedula || student.id || "S/N",
      carrera: student.Carrera || student.carrera || "Titulación",
      fecha: now.toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" }),
      firmante: "Mgs. Jefferson Villarreal" // Solo Coordinador
    };
  }

  function safeFilenameFromStudent(s) {
    var nombre = (s.NombreCompleto || s.nombre || "ESTUDIANTE")
      .toString().trim().replace(/[\\/:*?"<>|]+/g, "").substring(0, 50);
    var cedula = (s.Cedula || s.cedula || s.id || "").toString().trim();
    return ("CERT_" + cedula + "_" + nombre + ".pdf").replace(/\s+/g, "_");
  }

  function renderDoc() {
    try {
      var s = state.selectedStudent;
      if (!s) {
        elDoc.innerHTML = `<div style="text-align:center; margin-top:50px; color:#ccc;">
          <p>Selecciona un estudiante para visualizar el certificado</p>
        </div>`;
        return;
      }

      var payload = buildPayload(s);

      // Renderiza HTML simple para la vista previa
      if (window.CERTITITU.template) {
        elDoc.innerHTML = window.CERTITITU.template.render(payload, { signed: false });
      }
    } catch (e) {
      console.error(e);
      elDoc.innerHTML = "Error renderizando vista previa.";
    }
  }

  // --- EVENTOS ---

  function onPeriodoChange() {
    state.periodo = (elPeriodo.value || "").toString().trim();
    state.selectedStudent = null;
    elSearch.value = "";
    elSelected.textContent = "";
    clearSuggest();
    btnPdf.disabled = true;

    if (!state.periodo) {
      elSearch.disabled = true;
      setStatus("Selecciona periodo", "info");
      renderDoc();
      return;
    }

    elSearch.disabled = false;
    elSearch.focus();
    setStatus("Busca estudiante...", "info");
    renderDoc();
  }

  function onSearchInput() {
    var q = (elSearch.value || "").toString().trim().toUpperCase();
    if (!q || q.length < 2) {
      clearSuggest();
      return;
    }

    var hits = state.estudiantes.filter(function (s) {
      if (s.periodoId !== state.periodo) return false;
      var ced = (s.Cedula || s.cedula || s.id || "").toString().toUpperCase();
      var nom = (s.NombreCompleto || s.nombre || "").toString().toUpperCase();
      return (ced.indexOf(q) !== -1 || nom.indexOf(q) !== -1);
    });

    showSuggest(hits);
  }

  async function onPdf() {
    try {
      var s = state.selectedStudent;
      if (!s) return;

      // Feedback visual inmediato
      btnPdf.innerHTML = "Generando...";
      btnPdf.disabled = true;
      setStatus("Generando PDF...", "info");

      var payload = buildPayload(s);
      var filename = safeFilenameFromStudent(s);

      // Generar
      var pdfBytes = await window.CERTITITU.pdf.generatePdfBytes(payload);

      // Descargar
      var blob = new Blob([pdfBytes], { type: "application/pdf" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setStatus("Descarga iniciada", "ok");

    } catch (e) {
      console.error(e);
      setStatus("Error al generar PDF", "err");
    } finally {
      // Restaurar botón
      btnPdf.innerHTML = `<span class="icon">⬇</span> Descargar PDF`;
      btnPdf.disabled = false;
    }
  }

  async function load() {
    try {
      setStatus("Cargando...", "info");

      if (!window.CERTITITU || !window.CERTITITU.data) {
        setStatus("Error de archivos", "err");
        return;
      }

      var data = await window.CERTITITU.data.getAll();
      state.estudiantes = data.estudiantes || [];
      var periodos = data.periodos || [];

      fillPeriodos(periodos);

      state.periodo = "";
      state.selectedStudent = null;
      elSearch.value = "";
      elSearch.disabled = true;
      btnPdf.disabled = true;

      setStatus("Listo", "ok");
      renderDoc();

    } catch (err) {
      console.error(err);
      setStatus("Error de red/datos", "err");
    }
  }

  // Listeners
  elPeriodo.addEventListener("change", onPeriodoChange);
  elSearch.addEventListener("input", onSearchInput);

  document.addEventListener("click", function (ev) {
    var inside = elSuggest.contains(ev.target) || elSearch.contains(ev.target);
    if (!inside) clearSuggest();
  });

  btnPdf.addEventListener("click", onPdf);
  btnRefrescar.addEventListener("click", load);

  // Funcionalidad Volver
  if (btnVolver) {
    btnVolver.addEventListener("click", function () {
      // Intenta volver atrás en el historial o ir a la lista
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "../screen-lista/list.ui.html";
      }
    });
  }

  load();
})(window);