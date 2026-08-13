/*
=========================================================
Nombre completo: certi.tipos.js
Ruta o ubicación: /incorporaciones/certificados/certi.tipos.js
Función o funciones:
- Definir los tipos disponibles en Certi.
- Mantener el tipo seleccionado en localStorage.
- Integrar reconocimiento, capacitación, editable e invitaciones de incorporación.
- Para invitaciones: leer Excel Cargo | Sesiones, agrupar personas, configurar fechas y generar PDF/ZIP/individual.
Con qué se une:
- certi.index.html
- certi.config.js
- certi.state.js
- certi.capacitacion.js
- certi.editable.js
- XLSX, jsPDF y JSZip
=========================================================
*/
(function () {
  "use strict";

  const TIPO_RECONOCIMIENTO = "reconocimiento";
  const TIPO_CAPACITACION = "capacitacion";
  const TIPO_EDITABLE = "editable";
  const TIPO_INVITACION = "invitacion";
  const STORAGE_TIPO = "certi.tipoCertificado";

  const plantillas = {
    reconocimiento: "./assets/certi-plantilla-certificado.png",
    capacitacion: "./assets/certi-plantilla-capacitacion.png",
    editable: "./assets/certi-plantilla-certificado.png",
    invitacion: "./assets/certi-plantilla-fondo.png"
  };

  const tipos = {
    reconocimiento: {
      id: TIPO_RECONOCIMIENTO,
      nombre: "Reconocimiento a mejores egresados",
      descripcion: "Generación automática de reconocimientos para mejores egresados por carrera.",
      fuente: "excel_texto",
      plantilla: plantillas.reconocimiento,
      pdfUnicoPrefijo: "Certificados_Mejores_Egresados",
      pdfZipPrefijo: "Certificados_Mejores_Egresados_ZIP",
      pdfIndividualPrefijo: "Certificado"
    },
    capacitacion: {
      id: TIPO_CAPACITACION,
      nombre: "Certificados de capacitación docente",
      descripcion: "Generación automática de certificados para participantes y capacitadores desde Excel.",
      fuente: "excel",
      plantilla: plantillas.capacitacion,
      pdfUnicoPrefijo: "Certificados_Capacitacion_Docente",
      pdfZipPrefijo: "Certificados_Capacitacion_Docente_ZIP",
      pdfIndividualPrefijo: "Certificado_Capacitacion",
      horasDefecto: 40
    },
    editable: {
      id: TIPO_EDITABLE,
      nombre: "Certificado editable desde texto",
      descripcion: "Pegue texto libre o etiquetado; Certi lo ordena y prepara uno o varios certificados editables.",
      fuente: "texto_editable",
      plantilla: plantillas.editable,
      pdfUnicoPrefijo: "Certificados_Editables",
      pdfZipPrefijo: "Certificados_Editables_ZIP",
      pdfIndividualPrefijo: "Certificado_Editable"
    },
    invitacion: {
      id: TIPO_INVITACION,
      nombre: "Invitaciones de incorporación",
      descripcion: "Generación automática de invitaciones de incorporación agrupadas por persona y sesión.",
      fuente: "excel",
      plantilla: plantillas.invitacion,
      pdfUnicoPrefijo: "Invitaciones_Incorporacion",
      pdfZipPrefijo: "Invitaciones_Incorporacion_ZIP",
      pdfIndividualPrefijo: "Invitacion"
    }
  };

  asegurarOpcionInvitacion();
  extenderConfig();

  function asegurarOpcionInvitacion() {
    const selector = document.getElementById("certiTipoCertificado");
    if (!selector) return;
    if (!selector.querySelector('option[value="invitacion"]')) {
      const option = document.createElement("option");
      option.value = TIPO_INVITACION;
      option.textContent = "Invitaciones de incorporación";
      selector.appendChild(option);
    }
    try {
      if (localStorage.getItem(STORAGE_TIPO) === TIPO_INVITACION) selector.value = TIPO_INVITACION;
    } catch (error) {}
  }

  function extenderConfig() {
    const config = window.CertiConfig;
    if (!config) return;
    config.tiposCertificado = config.tiposCertificado || {};
    Object.keys(tipos).forEach(function (id) {
      config.tiposCertificado[id] = Object.assign({}, tipos[id], config.tiposCertificado[id] || {});
    });
    config.rutas = config.rutas || {};
    config.rutas.plantillaReconocimiento = config.rutas.plantillaReconocimiento || config.rutas.plantillaCertificado || plantillas.reconocimiento;
    config.rutas.plantillaCapacitacion = config.rutas.plantillaCapacitacion || plantillas.capacitacion;
    config.rutas.plantillaEditable = config.rutas.plantillaEditable || plantillas.editable;
    config.rutas.plantillaInvitacion = config.rutas.plantillaInvitacion || plantillas.invitacion;
  }

  function normalizar(tipo) {
    const valor = String(tipo || "").toLowerCase().trim();
    if (valor === TIPO_CAPACITACION) return TIPO_CAPACITACION;
    if (valor === TIPO_EDITABLE) return TIPO_EDITABLE;
    if (valor === TIPO_INVITACION) return TIPO_INVITACION;
    return TIPO_RECONOCIMIENTO;
  }

  function obtenerActual() {
    const selector = document.getElementById("certiTipoCertificado");
    if (selector && selector.value) return normalizar(selector.value);
    if (window.__certiTipoCertificadoActual) return normalizar(window.__certiTipoCertificadoActual);
    try {
      const guardado = localStorage.getItem(STORAGE_TIPO);
      if (guardado) return normalizar(guardado);
    } catch (error) {}
    return TIPO_RECONOCIMIENTO;
  }

  function establecer(tipo, opciones) {
    const config = opciones || {};
    const valor = normalizar(tipo);
    window.__certiTipoCertificadoActual = valor;
    if (config.guardar !== false) {
      try { localStorage.setItem(STORAGE_TIPO, valor); } catch (error) {}
    }
    const selector = document.getElementById("certiTipoCertificado");
    if (selector && selector.value !== valor) selector.value = valor;
    return valor;
  }

  function obtenerConfig(tipo) {
    const id = normalizar(tipo || obtenerActual());
    const registrados = (window.CertiConfig && window.CertiConfig.tiposCertificado) || {};
    return Object.assign({}, tipos[id], registrados[id] || {});
  }

  function obtenerNombre(tipo) { return obtenerConfig(tipo).nombre; }
  function esCapacitacion(tipo) { return normalizar(tipo || obtenerActual()) === TIPO_CAPACITACION; }
  function esReconocimiento(tipo) { return normalizar(tipo || obtenerActual()) === TIPO_RECONOCIMIENTO; }
  function esEditable(tipo) { return normalizar(tipo || obtenerActual()) === TIPO_EDITABLE; }
  function esInvitacion(tipo) { return normalizar(tipo || obtenerActual()) === TIPO_INVITACION; }

  function listar() {
    return [obtenerConfig(TIPO_RECONOCIMIENTO), obtenerConfig(TIPO_CAPACITACION), obtenerConfig(TIPO_EDITABLE), obtenerConfig(TIPO_INVITACION)];
  }

  function inicializarSelector(callbackCambio) {
    const selector = document.getElementById("certiTipoCertificado");
    if (!selector || selector.__certiTiposInicializado) return;
    asegurarOpcionInvitacion();
    selector.value = obtenerActual();
    selector.addEventListener("change", function () {
      const tipo = establecer(selector.value, { guardar: true });
      if (typeof callbackCambio === "function") callbackCambio(tipo);
    });
    selector.__certiTiposInicializado = true;
  }

  window.CertiTipos = {
    TIPO_RECONOCIMIENTO, TIPO_CAPACITACION, TIPO_EDITABLE, TIPO_INVITACION, STORAGE_TIPO,
    plantillas, normalizar, obtenerActual, establecer, obtenerConfig, obtenerNombre,
    esCapacitacion, esReconocimiento, esEditable, esInvitacion, listar, inicializarSelector, extenderConfig
  };

  iniciarInvitaciones();

  function iniciarInvitaciones() {
    const I = {
      sesiones: [], participaciones: [], invitados: [], resultado: null,
      procesando: false, descargando: false
    };
    let plantillaInvitacionDataUrl = null;
    let plantillaInvitacionPromise = null;

    document.addEventListener("click", function (e) {
      if (!esInvitacion()) return;
      const procesar = e.target.closest("#certiBtnProcesar");
      const limpiar = e.target.closest("#certiBtnLimpiar");
      const pdf = e.target.closest("#certiBtnPdfUnico");
      const zip = e.target.closest("#certiBtnPdfIndividuales");
      const uno = e.target.closest("[data-certi-invitacion-descargar]");
      if (!procesar && !limpiar && !pdf && !zip && !uno) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (procesar) procesarInvitaciones();
      else if (limpiar) limpiarInvitaciones();
      else if (pdf) descargarTodoPdf();
      else if (zip) descargarTodoZip();
      else descargarUno(Number(uno.dataset.certiInvitacionIndex));
    }, true);

    prepararUI();

    function prepararUI() {
      crearPanel();
      const selector = document.getElementById("certiTipoCertificado");
      const excel = document.getElementById("certiExcelInput");
      const fecha = document.getElementById("certiFechaCertificado");

      if (selector && !selector.dataset.invUi) {
        selector.dataset.invUi = "1";
        selector.addEventListener("change", function () { setTimeout(sincronizarUI, 30); });
      }
      if (excel && !excel.dataset.invUi) {
        excel.dataset.invUi = "1";
        excel.addEventListener("change", function () {
          if (!esInvitacion()) return;
          I.resultado = null;
          descubrirSesiones();
        });
      }
      if (fecha && !fecha.dataset.invUi) {
        fecha.dataset.invUi = "1";
        fecha.addEventListener("change", function () {
          if (!esInvitacion()) return;
          const r = document.getElementById("certiInvFechaResolucion");
          if (r && !r.value) r.value = fecha.value || "";
        });
      }
      if (window.CertiState && typeof window.CertiState.suscribir === "function" && !window.__certiInvState) {
        window.__certiInvState = true;
        window.CertiState.suscribir(function () {
          if (!esInvitacion()) return;
          setTimeout(function () {
            sincronizarUI();
            if (I.resultado) renderResultado(I.resultado);
          }, 30);
        });
      }
      sincronizarUI();
      setTimeout(sincronizarUI, 30);
    }

    function crearPanel() {
      if (document.getElementById("certiInvPanel")) return;
      const editable = document.getElementById("certiEditablePanel");
      if (!editable || !editable.parentElement) return;
      const panel = document.createElement("section");
      panel.id = "certiInvPanel";
      panel.className = "certi-hidden";
      panel.style.cssText = "margin-top:18px;padding:18px;border:1px solid #dfe5ee;border-radius:14px;background:#f8fafc";
      panel.innerHTML = `
        <div style="margin-bottom:14px"><h3 style="margin:0 0 5px">Invitaciones de incorporación</h3><p style="margin:0;color:#667085">Excel: primera columna Cargo; las demás columnas son sesiones como Lunes 9 am y Lunes 2 pm.</p></div>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">
          <label class="certi-field"><span>Fecha de resolución del OCS</span><input id="certiInvFechaResolucion" type="date"></label>
          <label class="certi-field"><span>Firmante</span><input id="certiInvFirmante" type="text" value="MSc. Jefferson Villarreal"></label>
          <label class="certi-field"><span>Cargo del firmante</span><input id="certiInvCargoFirmante" type="text" value="Coordinador de Titulación"></label>
        </div>
        <div style="margin-top:14px;padding:12px;border-radius:10px;background:#fff8e8;border:1px solid #ead39b;font-size:13px"><b>Estructura:</b> Cargo | Lunes 9 am | Lunes 2 pm. Una persona repetida se agrupa en una sola invitación.</div>
        <div style="margin-top:16px"><b>Fechas y horas de las sesiones</b><div id="certiInvSesionesEstado" style="font-size:12px;color:#667085;margin:4px 0 10px">Cargue el Excel para detectar las sesiones.</div><div id="certiInvSesiones" style="display:grid;gap:9px"></div></div>
      `;
      editable.parentElement.insertBefore(panel, editable.nextSibling);
    }

    function sincronizarUI() {
      const inv = esInvitacion();
      const panel = document.getElementById("certiInvPanel");
      const excelBlock = document.getElementById("certiBloqueExcel");
      const textBlock = document.getElementById("certiBloqueTexto");
      const editable = document.getElementById("certiEditablePanel");
      const fuenteField = document.getElementById("certiFuenteField");
      const fuente = document.getElementById("certiFuenteDatos");
      const btn = document.getElementById("certiBtnProcesar");
      const badge = document.querySelector(".certi-hero-badge strong");
      const hero = document.querySelector(".certi-hero p:not(.certi-eyebrow)");
      const excelLabel = document.querySelector("#certiBloqueExcel .certi-file-field span");
      const excelHelp = document.querySelector("#certiBloqueExcel .certi-help-text");
      const fecha = document.getElementById("certiFechaCertificado");
      const fechaLabel = fecha && fecha.closest("label") ? fecha.closest("label").querySelector("span") : null;

      if (!inv) {
        if (panel) panel.classList.add("certi-hidden");
        if (fechaLabel) fechaLabel.textContent = "Fecha del certificado";
        return;
      }

      if (panel) panel.classList.remove("certi-hidden");
      if (excelBlock) excelBlock.style.display = "";
      if (textBlock) textBlock.style.display = "none";
      if (editable) editable.classList.add("certi-hidden");
      if (fuenteField) fuenteField.style.display = "";
      if (fuente) { fuente.value = "excel"; fuente.disabled = true; }
      if (btn) btn.textContent = "Procesar invitaciones";
      if (badge) badge.textContent = "Invitaciones";
      if (hero) hero.textContent = "Generación automática de invitaciones institucionales para actos de incorporación.";
      if (excelLabel) excelLabel.textContent = "Excel de invitaciones de incorporación";
      if (excelHelp) excelHelp.textContent = "Primera columna: Cargo. Columnas siguientes: Lunes 9 am, Lunes 2 pm, Martes 9 am, etc.";
      if (fechaLabel) fechaLabel.textContent = "Fecha de emisión";
      const r = document.getElementById("certiInvFechaResolucion");
      if (r && !r.value && fecha) r.value = fecha.value || "";
      ocultarPaneles();
    }

    async function descubrirSesiones() {
      try {
        const lectura = await leerExcelActual();
        I.participaciones = lectura.participaciones;
        I.sesiones = preservarSesiones(lectura.sesiones);
        renderSesiones();
      } catch (error) {
        I.sesiones = [];
        I.participaciones = [];
        renderSesiones(error.message);
      }
    }

    async function leerExcelActual() {
      const input = document.getElementById("certiExcelInput");
      const archivo = input && input.files && input.files[0] ? input.files[0] : null;
      if (!archivo) throw new Error("Cargue el Excel de invitaciones.");
      if (!window.XLSX) throw new Error("No está disponible XLSX.");
      const libro = window.XLSX.read(await archivo.arrayBuffer(), { type: "array" });
      if (!libro.SheetNames.length) throw new Error("El Excel no contiene hojas.");
      const filas = window.XLSX.utils.sheet_to_json(libro.Sheets[libro.SheetNames[0]], { header: 1, defval: "", raw: false });
      return analizarMatriz(filas);
    }

    function analizarMatriz(filasEntrada) {
      const filas = (filasEntrada || []).map(function (f) { return Array.isArray(f) ? f.map(limpiar) : []; });
      const hi = filas.findIndex(esCabecera);
      if (hi < 0) throw new Error("No se encontró la cabecera Cargo | Lunes 9 am | Lunes 2 pm.");
      let sesiones = sesionesDeCabecera(filas[hi], 1);
      const mapa = {};
      sesiones.forEach(function (s) { mapa[s.clave] = s; });
      const participaciones = [];

      for (let i = hi + 1; i < filas.length; i += 1) {
        const fila = filas[i];
        if (!fila.some(Boolean)) continue;
        if (esCabecera(fila)) {
          sesiones = sesionesDeCabecera(fila, 1);
          sesiones.forEach(function (s) { mapa[s.clave] = mapa[s.clave] || s; });
          continue;
        }
        const secundaria = cabeceraSecundaria(fila, sesiones.length);
        if (secundaria) {
          sesiones = secundaria;
          sesiones.forEach(function (s) { mapa[s.clave] = mapa[s.clave] || s; });
          continue;
        }
        const cargo = limpiar(fila[0]);
        if (!cargo) continue;
        sesiones.forEach(function (s) {
          const persona = limpiar(fila[s.columna]);
          if (!persona) return;
          persona.split(/\n|;/).map(limpiar).filter(Boolean).forEach(function (nombre) {
            participaciones.push({ nombre, personaClave: clavePersona(nombre), cargo, sesionClave: s.clave });
          });
        });
      }
      const usadas = Object.values(mapa).filter(function (s) { return participaciones.some(function (p) { return p.sesionClave === s.clave; }); });
      if (!participaciones.length) throw new Error("No se encontraron participantes en el Excel.");
      return { sesiones: usadas, participaciones };
    }

    function esCabecera(fila) {
      if (!fila || fila.length < 2) return false;
      const c = clave(fila[0]);
      return /^(CARGO|ACTIVIDAD|FUNCION|ROL)$/.test(c) && fila.slice(1).some(pareceSesion);
    }

    function cabeceraSecundaria(fila, cantidad) {
      const vals = (fila || []).map(limpiar);
      if (!vals[0] && vals.slice(1).filter(Boolean).length && vals.slice(1).every(function (x) { return !x || pareceSesion(x); })) return sesionesDeCabecera(vals, 1);
      const noVacios = vals.filter(Boolean);
      if (noVacios.length >= 2 && noVacios.every(pareceSesion) && (!cantidad || noVacios.length === cantidad)) {
        return noVacios.map(function (x, i) { return nuevaSesion(x, i + 1); });
      }
      return null;
    }

    function sesionesDeCabecera(fila, inicio) {
      const out = [];
      for (let i = inicio; i < fila.length; i += 1) if (limpiar(fila[i])) out.push(nuevaSesion(fila[i], i));
      return out;
    }

    function nuevaSesion(etiqueta, columna) {
      return { clave: clave(etiqueta).replace(/\s+/g, "_"), etiqueta: limpiar(etiqueta), columna, fecha: "", hora: extraerHora(etiqueta) };
    }

    function preservarSesiones(nuevas) {
      const old = {};
      I.sesiones.forEach(function (s) { old[s.clave] = s; });
      return nuevas.map(function (s) { return Object.assign({}, s, old[s.clave] ? { fecha: old[s.clave].fecha, hora: old[s.clave].hora || s.hora } : {}); });
    }

    function renderSesiones(error) {
      const box = document.getElementById("certiInvSesiones");
      const estado = document.getElementById("certiInvSesionesEstado");
      if (!box) return;
      if (!I.sesiones.length) {
        box.innerHTML = "";
        if (estado) estado.textContent = error || "Cargue el Excel para detectar las sesiones.";
        return;
      }
      box.innerHTML = I.sesiones.map(function (s, i) {
        return `<div style="display:grid;grid-template-columns:1.2fr .8fr .55fr;gap:10px;align-items:end;padding:10px;border:1px solid #e3e8ef;border-radius:10px;background:white"><b style="align-self:center">${html(s.etiqueta)}</b><label class="certi-field"><span>Fecha real</span><input type="date" data-inv-fecha="${i}" value="${html(s.fecha)}"></label><label class="certi-field"><span>Hora</span><input type="time" data-inv-hora="${i}" value="${html(s.hora)}"></label></div>`;
      }).join("");
      if (estado) estado.textContent = `${I.sesiones.length} sesión(es) detectada(s). Complete fecha y hora.`;
    }

    function recogerSesiones() {
      const box = document.getElementById("certiInvSesiones");
      if (!box) return;
      I.sesiones = I.sesiones.map(function (s, i) {
        const f = box.querySelector(`[data-inv-fecha="${i}"]`);
        const h = box.querySelector(`[data-inv-hora="${i}"]`);
        return Object.assign({}, s, { fecha: f ? f.value : s.fecha, hora: h ? h.value : s.hora });
      });
    }

    async function procesarInvitaciones() {
      if (I.procesando) return;
      I.procesando = true;
      try {
        bloquearProceso(true);
        estadoProceso("Procesando invitaciones...", "info");
        const contexto = contextoActual();
        validarContexto(contexto);
        recogerSesiones();
        const lectura = await leerExcelActual();
        I.participaciones = lectura.participaciones;
        I.sesiones = preservarSesiones(lectura.sesiones);
        renderSesiones();
        recogerSesiones();
        const incompleta = I.sesiones.find(function (s) { return !s.fecha || !s.hora; });
        if (incompleta) throw new Error(`Complete fecha y hora de ${incompleta.etiqueta}.`);
        I.invitados = agrupar(I.participaciones, I.sesiones);
        I.resultado = { invitados: I.invitados, contexto, resumen: { personas: I.invitados.length, participaciones: I.participaciones.length, sesiones: I.sesiones.length } };
        renderResultado(I.resultado);
        estadoProceso(`${I.invitados.length} invitación(es) lista(s).`, "success");
      } catch (error) {
        I.resultado = null;
        alerta(error.message || "No se pudieron procesar las invitaciones.");
        habilitarDescargas(false);
        estadoProceso(error.message || "No se pudieron procesar las invitaciones.", "error");
      } finally {
        I.procesando = false;
        bloquearProceso(false);
      }
    }

    function contextoActual() {
      const periodo = document.getElementById("certiPeriodo");
      const op = periodo && periodo.options[periodo.selectedIndex] ? periodo.options[periodo.selectedIndex] : null;
      return {
        periodo: periodo ? periodo.value : "",
        periodoTexto: op ? limpiar(op.textContent) : "",
        fechaEmision: valor("certiFechaCertificado"),
        fechaResolucion: valor("certiInvFechaResolucion"),
        firmante: valor("certiInvFirmante") || "MSc. Jefferson Villarreal",
        cargoFirmante: valor("certiInvCargoFirmante") || "Coordinador de Titulación"
      };
    }

    function validarContexto(c) {
      if (!c.periodo) throw new Error("Seleccione el período o promoción.");
      if (!c.fechaEmision) throw new Error("Seleccione la fecha de emisión.");
      if (!c.fechaResolucion) throw new Error("Seleccione la fecha de resolución del OCS.");
    }

    function agrupar(participaciones, sesiones) {
      const sm = {};
      sesiones.forEach(function (s) { sm[s.clave] = s; });
      const mapa = {};
      participaciones.forEach(function (p) {
        if (!p.personaClave || !sm[p.sesionClave]) return;
        if (!mapa[p.personaClave]) mapa[p.personaClave] = { clave: p.personaClave, nombre: p.nombre, participaciones: [] };
        else if (puntuarNombre(p.nombre) > puntuarNombre(mapa[p.personaClave].nombre)) mapa[p.personaClave].nombre = p.nombre;
        const dup = mapa[p.personaClave].participaciones.some(function (x) { return x.sesionClave === p.sesionClave && clave(x.cargo) === clave(p.cargo); });
        if (!dup) mapa[p.personaClave].participaciones.push({ cargo: p.cargo, sesionClave: p.sesionClave, fecha: sm[p.sesionClave].fecha, hora: sm[p.sesionClave].hora });
      });
      return Object.values(mapa).map(function (x) {
        x.participaciones.sort(ordenParticipacion);
        x.sesiones = new Set(x.participaciones.map(function (p) { return p.sesionClave; })).size;
        return x;
      }).sort(function (a, b) { return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }); });
    }

    function renderResultado(r) {
      if (!esInvitacion()) return;
      ocultarPaneles();
      const cards = document.getElementById("certiResumenCards");
      const alerts = document.getElementById("certiAlertas");
      const head = document.querySelector(".certi-table thead tr");
      const body = document.getElementById("certiTablaBody");
      if (cards) cards.innerHTML = `<article class="certi-summary-card"><span>Personas detectadas</span><strong>${r.resumen.personas}</strong></article><article class="certi-summary-card"><span>Participaciones</span><strong>${r.resumen.participaciones}</strong></article><article class="certi-summary-card"><span>Sesiones</span><strong>${r.resumen.sesiones}</strong></article><article class="certi-summary-card"><span>Invitaciones listas</span><strong>${r.resumen.personas}</strong></article>`;
      if (alerts) alerts.innerHTML = `<div class="certi-alert certi-alert-success"><strong>Invitaciones listas</strong><span>${r.resumen.personas} invitación(es) consolidadas.</span></div>`;
      if (head) head.innerHTML = `<th>Invitado</th><th>Participaciones</th><th>Sesiones</th><th>Estado</th><th data-certi-accion-header="1">Acción</th>`;
      if (body) body.innerHTML = r.invitados.map(function (x, i) {
        return `<tr><td>${html(x.nombre)}</td><td>${x.participaciones.length}</td><td>${x.sesiones}</td><td><span class="certi-status certi-status-ok">Listo</span></td><td data-certi-accion-cell="1"><button type="button" class="certi-btn certi-btn-secondary" data-certi-invitacion-descargar="1" data-certi-invitacion-index="${i}" style="padding:8px 12px;font-size:12px">Descargar PDF</button></td></tr>`;
      }).join("");
      habilitarDescargas(r.invitados.length > 0);
    }

    function limpiarInvitaciones() {
      const input = document.getElementById("certiExcelInput");
      if (input) input.value = "";
      I.sesiones = []; I.participaciones = []; I.invitados = []; I.resultado = null;
      renderSesiones();
      const alerts = document.getElementById("certiAlertas");
      if (alerts) alerts.innerHTML = "";
      const body = document.getElementById("certiTablaBody");
      if (body) body.innerHTML = `<tr><td colspan="5" class="certi-empty">Cargue y procese el Excel de invitaciones.</td></tr>`;
      habilitarDescargas(false);
      estadoProceso("Pantalla de invitaciones limpiada.", "info");
    }

    function obtenerPlantillaInvitacionDataUrl() {
      if (plantillaInvitacionDataUrl) return Promise.resolve(plantillaInvitacionDataUrl);
      if (plantillaInvitacionPromise) return plantillaInvitacionPromise;

      const ruta = (window.CertiConfig && window.CertiConfig.rutas && window.CertiConfig.rutas.plantillaInvitacion)
        ? window.CertiConfig.rutas.plantillaInvitacion
        : plantillas.invitacion;

      plantillaInvitacionPromise = fetch(ruta, { cache: "no-store" })
        .then(function (respuesta) {
          if (!respuesta.ok) throw new Error(`No se pudo cargar la plantilla de invitación: ${ruta}`);
          return respuesta.blob();
        })
        .then(function (blob) {
          return new Promise(function (resolve, reject) {
            const reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = function () { reject(new Error("No se pudo convertir la plantilla de invitación.")); };
            reader.readAsDataURL(blob);
          });
        })
        .then(function (dataUrl) {
          plantillaInvitacionDataUrl = dataUrl;
          return dataUrl;
        })
        .catch(function (error) {
          plantillaInvitacionPromise = null;
          throw error;
        });

      return plantillaInvitacionPromise;
    }

    async function descargarTodoPdf() {
      const r = exigirResultado();
      if (I.descargando) return;
      I.descargando = true;
      try {
        bloquearDescargas(true);
        const jsPDF = obtenerJsPdf();
        const plantillaDataUrl = await obtenerPlantillaInvitacionDataUrl();
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        r.invitados.forEach(function (x, i) {
          if (i) doc.addPage();
          dibujarInvitacion(doc, x, r.contexto, plantillaDataUrl);
        });
        doc.save(`Invitaciones_Incorporacion_${nombreArchivo(r.contexto.periodoTexto)}_${r.contexto.fechaEmision}.pdf`);
        estadoProceso("PDF único generado correctamente.", "success");
      } catch (error) { estadoProceso(error.message, "error"); }
      finally { I.descargando = false; bloquearDescargas(false); }
    }

    async function descargarTodoZip() {
      const r = exigirResultado();
      if (I.descargando) return;
      I.descargando = true;
      try {
        bloquearDescargas(true);
        if (!window.JSZip) throw new Error("No está disponible JSZip.");
        const jsPDF = obtenerJsPdf();
        const plantillaDataUrl = await obtenerPlantillaInvitacionDataUrl();
        const zip = new window.JSZip();
        const usados = {};
        r.invitados.forEach(function (x) {
          const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
          dibujarInvitacion(doc, x, r.contexto, plantillaDataUrl);
          let n = `Invitacion_${nombreArchivo(x.nombre)}.pdf`;
          if (usados[n]) { usados[n] += 1; n = n.replace(/\.pdf$/i, `_${usados[n]}.pdf`); } else usados[n] = 1;
          zip.file(n, doc.output("arraybuffer"));
        });
        descargarBlob(await zip.generateAsync({ type: "blob", compression: "DEFLATE" }), `Invitaciones_Incorporacion_${nombreArchivo(r.contexto.periodoTexto)}.zip`);
        estadoProceso("ZIP generado correctamente.", "success");
      } catch (error) { estadoProceso(error.message, "error"); }
      finally { I.descargando = false; bloquearDescargas(false); }
    }

    async function descargarUno(indice) {
      const r = exigirResultado();
      const x = r.invitados[indice];
      if (!x) return;
      try {
        const jsPDF = obtenerJsPdf();
        const plantillaDataUrl = await obtenerPlantillaInvitacionDataUrl();
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        dibujarInvitacion(doc, x, r.contexto, plantillaDataUrl);
        doc.save(`Invitacion_${nombreArchivo(x.nombre)}.pdf`);
      } catch (error) {
        estadoProceso(error.message || "No se pudo generar la invitación.", "error");
      }
    }

    function dibujarInvitacion(doc, invitado, c, plantillaDataUrl) {
      const W = 210, H = 297, X = 30, TW = 150;
      if (!plantillaDataUrl) throw new Error("La plantilla institucional de invitación no está disponible.");

      doc.addImage(plantillaDataUrl, "PNG", 0, 0, W, H, undefined, "FAST");

      doc.setTextColor(40,40,40);
      doc.setFont("times","normal");
      doc.setFontSize(11.2);
      doc.text(`Quito, ${fechaLarga(c.fechaEmision)}`, W-X, 54, {align:"right"});

      let y=70;
      y=parrafo(doc,`El Órgano Colegiado Superior del Instituto Superior Universitario Quito Metropolitano, en sesión celebrada el día ${fechaLarga(c.fechaResolucion)}, RESOLVIÓ:`,X,y,TW,11.2,5.2)+8;
      doc.setFont("times","bold");
      doc.setFontSize(13);
      doc.text("Designar a:",W/2,y,{align:"center"});
      y+=9;

      const nom=limpiar(invitado.nombre).toUpperCase();
      doc.setTextColor(10,28,63);
      doc.setFont("times","bold");
      doc.setFontSize(nom.length>52?12.5:nom.length>40?14:15.5);
      const nl=doc.splitTextToSize(nom,140);
      nl.forEach(function(l,i){doc.text(l,W/2,y+i*6.2,{align:"center"});});
      y+=nl.length*6.2+8;

      doc.setTextColor(40,40,40);
      y=parrafo(doc,`para participar en el evento de incorporación correspondiente a la promoción ${c.periodoTexto}.`,X,y,TW,11.1,5.1)+8;
      y=parrafo(doc,parrafoParticipaciones(invitado.participaciones),X,y,TW,10.9,5.0)+8;
      y=parrafo(doc,"Agradecemos profundamente su valiosa participación y su compromiso con la excelencia académica en este acto solemne de incorporación.",X,y,TW,10.8,5.0);

      const fy=Math.max(208,Math.min(226,y+20));
      doc.setFont("times","normal");
      doc.setFontSize(11.1);
      doc.text("Atentamente,",W/2,fy,{align:"center"});
      doc.setDrawColor(85,85,85);
      doc.setLineWidth(.3);
      doc.line(72,fy+25,138,fy+25);
      doc.setFont("times","bold");
      doc.setFontSize(10.8);
      doc.text(c.firmante,W/2,fy+32,{align:"center"});
      doc.setFont("times","normal");
      doc.setFontSize(9.9);
      doc.text(c.cargoFirmante,W/2,fy+37.5,{align:"center"});
    }

    function parrafoParticipaciones(lista) {
      const g={};
      lista.forEach(function(p){ const k=p.sesionClave; if(!g[k]) g[k]={fecha:p.fecha,hora:p.hora,cargos:[]}; if(!g[k].cargos.some(function(c){return clave(c)===clave(p.cargo)})) g[k].cargos.push(p.cargo); });
      const fs=Object.values(g).sort(function(a,b){return `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`)}).map(function(s){return `${fechaConDia(s.fecha)}, a las ${s.hora}, para ${unir(s.cargos.map(redactarCargo))}`});
      return fs.length===1?`Su presencia será requerida el ${fs[0]}.`:`Su presencia será requerida en las siguientes sesiones: ${fs.join("; ")}.`;
    }

    function redactarCargo(cargo) {
      const k=clave(cargo), o=limpiar(cargo);
      if(/^MESA DIRECTIVA\s*1$/.test(k)) return "presidir la mesa directiva";
      if(/^MESA DIRECTIVA\s*\d+$/.test(k)||k==="MESA DIRECTIVA") return "integrar la mesa directiva";
      if(k.includes("MAESTRO DE CEREMONIA")||k.includes("MAESTRA DE CEREMONIA")) return "ejercer la función de Maestro de Ceremonias";
      if(k.includes("BIENVENIDA")) return "realizar la bienvenida institucional";
      if(k.includes("INTERVENCION OFICIAL")) return "realizar la intervención oficial";
      if(k.includes("PROMESA SOLEMNE")) return "dirigir la promesa solemne de los graduados";
      if(k.includes("MENSAJE A LOS NUEVOS PROFESIONALES")) return "brindar el mensaje a los nuevos profesionales";
      return `participar en la actividad ${o}`;
    }

    function unir(a){ if(!a.length)return "participar en el acto de incorporación"; if(a.length===1)return a[0]; if(a.length===2)return `${a[0]} y ${a[1]}`; return `${a.slice(0,-1).join(", ")} y ${a[a.length-1]}`; }
    function parrafo(doc,t,x,y,w,size,lh){ doc.setTextColor(40,40,40); doc.setFont("times","normal"); doc.setFontSize(size); const ls=doc.splitTextToSize(t,w); ls.forEach(function(l,i){doc.text(l,x,y+i*lh)}); return y+ls.length*lh; }
    function ordenParticipacion(a,b){ const f=`${a.fecha||""} ${a.hora||""}`.localeCompare(`${b.fecha||""} ${b.hora||""}`); return f||prioridad(a.cargo)-prioridad(b.cargo)||a.cargo.localeCompare(b.cargo,"es"); }
    function prioridad(c){ const k=clave(c); if(/^MESA DIRECTIVA\s*1$/.test(k))return 10; if(/^MESA DIRECTIVA/.test(k))return 20; if(k.includes("MAESTRO DE CEREMONIA"))return 30; if(k.includes("BIENVENIDA"))return 40; if(k.includes("INTERVENCION OFICIAL"))return 50; if(k.includes("PROMESA SOLEMNE"))return 60; if(k.includes("MENSAJE A LOS NUEVOS"))return 70; return 100; }
    function clavePersona(n){ let k=clave(n), pref=["MAGISTER","MGS","MASTER","MSC","DOCTOR","DOCTORA","DR","DRA","LICENCIADO","LICENCIADA","LIC","INGENIERO","INGENIERA","ING"]; let cambio=true; while(cambio){cambio=false;pref.forEach(function(p){if(k.startsWith(p+" ")){k=k.slice(p.length).trim();cambio=true;}})} return k; }
    function puntuarNombre(n){ return (/^(MAGISTER|MGS|MASTER|MSC|DOCTOR|DOCTORA|DR|DRA|LICENCIADO|LICENCIADA|LIC|INGENIERO|INGENIERA|ING)\b/.test(clave(n))?100:0)+limpiar(n).length; }
    function pareceSesion(v){ const k=clave(v); return /\b(LUNES|MARTES|MIERCOLES|JUEVES|VIERNES|SABADO|DOMINGO)\b/.test(k)||/\b\d{1,2}(:\d{2})?\s*(AM|PM)\b/.test(k)||/\b\d{1,2}:\d{2}\b/.test(k); }
    function extraerHora(v){ const t=limpiar(v).toLowerCase(); let m=t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i); if(m){let h=+m[1],min=+(m[2]||0);if(m[3].toLowerCase()==="pm"&&h<12)h+=12;if(m[3].toLowerCase()==="am"&&h===12)h=0;return `${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}`;} m=t.match(/\b(\d{1,2}):(\d{2})\b/); return m?`${String(+m[1]).padStart(2,"0")}:${m[2]}`:""; }
    function fechaLarga(f){ if(!f)return ""; const p=f.split("-").map(Number),m=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]; return p.length===3?`${p[2]} de ${m[p[1]-1]} de ${p[0]}`:f; }
    function fechaConDia(f){ const d=new Date(`${f}T12:00:00`),ds=["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]; return Number.isNaN(d.getTime())?fechaLarga(f):`${ds[d.getDay()]}, ${fechaLarga(f)}`; }
    function exigirResultado(){ if(!I.resultado||!I.resultado.invitados.length)throw new Error("Procese primero las invitaciones."); return I.resultado; }
    function obtenerJsPdf(){ if(!window.jspdf||!window.jspdf.jsPDF)throw new Error("No está disponible jsPDF."); return window.jspdf.jsPDF; }
    function bloquearProceso(on){ const b=document.getElementById("certiBtnProcesar"); if(b){b.disabled=on;b.textContent=on?"Procesando...":"Procesar invitaciones";} }
    function habilitarDescargas(on){ const p=document.getElementById("certiBtnPdfUnico"),z=document.getElementById("certiBtnPdfIndividuales"); if(p)p.disabled=!on;if(z)z.disabled=!on; }
    function bloquearDescargas(on){ const p=document.getElementById("certiBtnPdfUnico"),z=document.getElementById("certiBtnPdfIndividuales"); if(p){p.disabled=on;p.textContent=on?"Generando...":"Descargar todos en un PDF";} if(z){z.disabled=on;z.textContent=on?"Generando...":"Descargar todos como ZIP";} }
    function alerta(msg){ const a=document.getElementById("certiAlertas"); if(a)a.innerHTML=`<div class="certi-alert certi-alert-warning"><strong>Revisar datos</strong><span>${html(msg)}</span></div>`; }
    function estadoProceso(msg,tipo){ let e=document.getElementById("certiProcesarEstado"); if(!e){const a=document.querySelector(".certi-actions");if(!a)return;e=document.createElement("div");e.id="certiProcesarEstado";a.appendChild(e);}e.textContent=msg;e.className=`certi-process-status certi-process-status-${tipo||"info"}`; }
    function ocultarPaneles(){ const c=document.getElementById("certiCarrerasPanel"),e=document.getElementById("certiEmpatesPanel"); if(c)c.classList.add("certi-hidden");if(e)e.classList.add("certi-hidden"); }
    function valor(id){ const e=document.getElementById(id);return e?limpiar(e.value):""; }
    function limpiar(v){ return String(v==null?"":v).replace(/\s+/g," ").trim(); }
    function clave(v){ return limpiar(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9Ññ ]+/g," ").replace(/\s+/g," ").trim().toUpperCase(); }
    function html(v){ return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }
    function nombreArchivo(v){ if(window.CertiUtils&&typeof window.CertiUtils.crearNombreArchivo==="function")return window.CertiUtils.crearNombreArchivo(v);return clave(v).replace(/[^A-Z0-9]+/g,"_").toLowerCase()||"archivo"; }
    function descargarBlob(blob,n){ const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=n;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},1000); }

    window.CertiInvitaciones = { analizarMatriz, agrupar, redactarCargo, parrafoParticipaciones, dibujarInvitacion, procesarInvitaciones };
  }
})();
