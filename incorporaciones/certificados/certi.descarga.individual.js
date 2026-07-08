/*
=========================================================
Nombre completo: certi.descarga.individual.js
Ruta o ubicación: /incorporaciones/certificados/certi.descarga.individual.js
Función o funciones:
- Agregar una columna Acción a la tabla de certificados procesados.
- Permitir descargar un certificado individual desde cada fila.
- Mantener los botones generales para descargar todos en PDF o todos como ZIP.
- Funcionar aunque la tabla sea pintada por render principal o por fallback.
Con qué se une:
- certi.index.html
- certi.state.js
- certi.template.js
- certi.capacitacion.template.js
- certi.tipos.js
- certi.firmantes.js
- jsPDF
=========================================================
*/

(function () {
  "use strict";

  const TIPO_CAPACITACION = "capacitacion";
  let actualizandoTabla = false;

  iniciar();

  function iniciar() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", inicializar);
      return;
    }

    inicializar();
  }

  function inicializar() {
    enlazarClickIndividual();
    observarTabla();
    setTimeout(asegurarColumnaAccion, 250);
  }

  function enlazarClickIndividual() {
    document.addEventListener("click", function (evento) {
      const boton = evento.target.closest("[data-certi-descargar-uno]");
      if (!boton) return;

      evento.preventDefault();
      evento.stopImmediatePropagation();
      descargarCertificadoIndividual(boton);
    }, true);
  }

  function observarTabla() {
    const tbody = document.getElementById("certiTablaBody");
    const thead = document.querySelector(".certi-table thead tr");

    if (!tbody && !thead) return;

    const observer = new MutationObserver(function () {
      if (actualizandoTabla) return;
      setTimeout(asegurarColumnaAccion, 0);
    });

    if (tbody) observer.observe(tbody, { childList: true, subtree: true });
    if (thead) observer.observe(thead, { childList: true, subtree: true });
  }

  function asegurarColumnaAccion() {
    if (actualizandoTabla) return;

    const tbody = document.getElementById("certiTablaBody");
    const thead = document.querySelector(".certi-table thead tr");
    if (!tbody || !thead) return;

    actualizandoTabla = true;

    try {
      asegurarHeaderAccion(thead);
      asegurarFilasAccion(tbody, thead.children.length);
    } finally {
      actualizandoTabla = false;
    }
  }

  function asegurarHeaderAccion(thead) {
    const ths = Array.from(thead.querySelectorAll("th"));
    const existe = ths.some(function (th) {
      return th.dataset.certiAccionHeader === "1" || limpiarTexto(th.textContent).toUpperCase() === "ACCIÓN";
    });

    if (existe) return;

    const th = document.createElement("th");
    th.textContent = "Acción";
    th.dataset.certiAccionHeader = "1";
    thead.appendChild(th);
  }

  function asegurarFilasAccion(tbody, columnas) {
    const filas = Array.from(tbody.querySelectorAll("tr"));
    let indiceCertificado = 0;

    filas.forEach(function (fila) {
      const celdas = Array.from(fila.querySelectorAll("td"));
      if (!celdas.length) return;

      const celdaVacia = fila.querySelector(".certi-empty");
      if (celdaVacia) {
        celdaVacia.colSpan = Math.max(columnas, Number(celdaVacia.colSpan || 1));
        return;
      }

      const existeAccion = celdas.some(function (td) {
        return td.dataset.certiAccionCell === "1";
      });

      if (existeAccion) {
        indiceCertificado += 1;
        return;
      }

      const estadoTexto = limpiarTexto(celdas[celdas.length - 1].textContent);
      const listo = /LISTO/i.test(estadoTexto);
      const td = document.createElement("td");
      td.dataset.certiAccionCell = "1";
      td.innerHTML = `
        <button
          type="button"
          class="certi-btn certi-btn-secondary"
          data-certi-descargar-uno="1"
          data-certi-resultado-index="${indiceCertificado}"
          ${listo ? "" : "disabled"}
          title="Descargar solo este certificado"
          style="padding: 8px 12px; font-size: 12px; white-space: nowrap;"
        >
          Descargar PDF
        </button>
      `;

      fila.appendChild(td);
      indiceCertificado += 1;
    });
  }

  async function descargarCertificadoIndividual(boton) {
    try {
      boton.disabled = true;
      const textoOriginal = boton.textContent;
      boton.textContent = "Generando...";
      mostrarEstado("Generando certificado individual. Espere un momento...", "info");

      const estado = obtenerEstadoSeguro();
      const indice = Number(boton.dataset.certiResultadoIndex);
      const lista = obtenerCertificadosDesdeResultado(estado.resultado);
      const item = lista[indice];

      if (!item) {
        throw new Error("No se encontró el certificado seleccionado en el resultado procesado.");
      }

      if (item.estadoCertificado && item.estadoCertificado !== "listo") {
        throw new Error("Este certificado aún no está listo para descarga.");
      }

      const jsPDF = obtenerJsPdf();
      const config = obtenerConfigPdf(estado, item);
      const plantillaDataUrl = await cargarPlantilla(config.plantilla);
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const certificado = normalizarCertificado(item, estado, config);

      await dibujarCertificado(doc, certificado, plantillaDataUrl);
      doc.save(crearNombrePdfIndividual(certificado, estado, config));

      mostrarEstado("Certificado individual generado correctamente.", "success");
      boton.textContent = textoOriginal || "Descargar PDF";
      boton.disabled = false;
    } catch (error) {
      mostrarEstado(error.message || "No se pudo generar el certificado individual.", "error");
      boton.textContent = "Descargar PDF";
      boton.disabled = false;
    }
  }

  function obtenerEstadoSeguro() {
    const estado = window.CertiState && typeof window.CertiState.obtener === "function"
      ? window.CertiState.obtener() || {}
      : {};

    const tipoSelect = document.getElementById("certiTipoCertificado");
    const periodoSelect = document.getElementById("certiPeriodo");
    const fechaInput = document.getElementById("certiFechaCertificado");
    const option = periodoSelect && periodoSelect.options[periodoSelect.selectedIndex]
      ? periodoSelect.options[periodoSelect.selectedIndex]
      : null;

    return Object.assign({}, estado, {
      tipoCertificado: tipoSelect && tipoSelect.value ? tipoSelect.value : estado.tipoCertificado || "reconocimiento",
      periodoSeleccionado: periodoSelect && periodoSelect.value ? periodoSelect.value : estado.periodoSeleccionado || "",
      periodoTexto: option ? option.textContent : estado.periodoTexto || estado.periodoSeleccionado || "",
      fechaCertificado: fechaInput && fechaInput.value ? fechaInput.value : estado.fechaCertificado || ""
    });
  }

  function obtenerCertificadosDesdeResultado(resultado) {
    if (!resultado || typeof resultado !== "object") return [];

    if (Array.isArray(resultado.certificados) && resultado.certificados.length) return resultado.certificados.slice();
    if (Array.isArray(resultado.mejores) && resultado.mejores.length) return resultado.mejores.slice();
    if (Array.isArray(resultado.registrosValidos) && resultado.registrosValidos.length) return resultado.registrosValidos.slice();

    return [];
  }

  function normalizarCertificado(item, estado, config) {
    const esCapacitacion = item.tipoCertificado === TIPO_CAPACITACION || estado.tipoCertificado === TIPO_CAPACITACION;
    const periodo = estado.periodoTexto || estado.periodoSeleccionado || "";
    const fecha = formatearFechaLarga(estado.fechaCertificado);

    if (esCapacitacion) {
      const capacitador = limpiarNombre(item.capacitador || item.instructor || item.facilitador || "");

      return Object.assign({}, item, {
        tipoCertificado: TIPO_CAPACITACION,
        cargo: item.cargo || "",
        cedula: item.cedula || "",
        nombre: item.nombre || item.docente || "",
        docente: item.docente || item.nombre || "",
        curso: item.curso || item.tema || item.carrera || "",
        tema: item.tema || item.curso || item.carrera || "",
        capacitador,
        nota: formatearNota(item.nota || item.promedio),
        promedio: formatearNota(item.promedio || item.nota),
        horas: String(item.horas || config.horasDefecto || 40),
        periodo,
        fecha,
        fechaInput: estado.fechaCertificado,
        carrera: item.curso || item.tema || item.carrera || "",
        firmantes: obtenerFirmantesCapacitacion(capacitador)
      });
    }

    return Object.assign({}, item, {
      tipoCertificado: "reconocimiento",
      nombre: item.nombre || item.estudiante || "",
      carrera: item.carrera || item.carreraOficial || item.carreraOriginal || "",
      promedio: item.promedio || item.nota || "",
      periodo,
      fecha,
      fechaInput: estado.fechaCertificado,
      carreraCodigo: item.carreraCodigo || crearNombreArchivo(item.carrera || item.carreraOficial || item.carreraOriginal || "carrera")
    });
  }

  function obtenerConfigPdf(estado, item) {
    const esCapacitacion = item.tipoCertificado === TIPO_CAPACITACION || estado.tipoCertificado === TIPO_CAPACITACION;

    if (esCapacitacion && window.CertiTipos && typeof window.CertiTipos.obtenerConfig === "function") {
      const tipo = window.CertiTipos.obtenerConfig(TIPO_CAPACITACION);
      return {
        plantilla: tipo.plantilla || "./assets/certi-plantilla-capacitacion.png",
        prefijoIndividual: tipo.pdfIndividualPrefijo || "Certificado_Capacitacion",
        horasDefecto: tipo.horasDefecto || 40
      };
    }

    const config = window.CertiConfig || {};
    return {
      plantilla: config.rutas && config.rutas.plantillaCertificado ? config.rutas.plantillaCertificado : "./assets/certi-plantilla-certificado.png",
      prefijoIndividual: config.archivos && config.archivos.pdfIndividualPrefijo ? config.archivos.pdfIndividualPrefijo : "Certificado",
      horasDefecto: 40
    };
  }

  async function dibujarCertificado(doc, certificado, plantillaDataUrl) {
    if (certificado.tipoCertificado === TIPO_CAPACITACION && window.CertiCapacitacionTemplate) {
      await window.CertiCapacitacionTemplate.dibujarCertificado(doc, certificado, { plantillaDataUrl });
      return;
    }

    if (window.CertiTemplate && typeof window.CertiTemplate.dibujarCertificado === "function") {
      await window.CertiTemplate.dibujarCertificado(doc, certificado, { plantillaDataUrl });
      return;
    }

    throw new Error("No está disponible la plantilla para dibujar el certificado.");
  }

  function obtenerFirmantesCapacitacion(capacitador) {
    if (window.CertiFirmantes && typeof window.CertiFirmantes.obtenerFirmantesCapacitacion === "function") {
      return window.CertiFirmantes.obtenerFirmantesCapacitacion(capacitador);
    }

    return [
      { nombre: "Dr. León Tito", cargo: "RECTOR" },
      { nombre: "Mgs. Jefferson Villarreal", cargo: "GESTOR DE PROCESOS ACADÉMICOS" },
      { nombre: capacitador || "CAPACITADOR", cargo: "CAPACITADOR" }
    ];
  }

  function obtenerJsPdf() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("No se encontró la librería jsPDF.");
    }

    return window.jspdf.jsPDF;
  }

  async function cargarPlantilla(ruta) {
    if (!ruta) return "";

    try {
      return await imagenADataUrl(ruta);
    } catch (error) {
      console.warn("No se pudo cargar la plantilla. Se usará fondo básico.", error);
      return "";
    }
  }

  function imagenADataUrl(ruta) {
    return new Promise(function (resolve, reject) {
      const imagen = new Image();
      imagen.onload = function () {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = imagen.naturalWidth || imagen.width;
          canvas.height = imagen.naturalHeight || imagen.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(imagen, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch (error) {
          reject(error);
        }
      };
      imagen.onerror = function () {
        reject(new Error("No se pudo cargar la imagen de plantilla."));
      };
      imagen.src = ruta;
    });
  }

  function crearNombrePdfIndividual(certificado, estado, config) {
    const periodo = crearNombreArchivo(estado.periodoTexto || estado.periodoSeleccionado || "periodo");
    const cursoCarrera = crearNombreArchivo(certificado.curso || certificado.tema || certificado.carrera || "certificado");
    const nombre = crearNombreArchivo(certificado.nombre || certificado.docente || "participante");
    return `${config.prefijoIndividual}_${periodo}_${cursoCarrera}_${nombre}.pdf`;
  }

  function mostrarEstado(mensaje, tipo) {
    let estado = document.getElementById("certiProcesarEstado");

    if (!estado) {
      const acciones = document.querySelector(".certi-actions") || document.querySelector(".certi-downloads");
      if (!acciones) return;

      estado = document.createElement("div");
      estado.id = "certiProcesarEstado";
      acciones.appendChild(estado);
    }

    estado.textContent = mensaje;
    estado.className = `certi-process-status certi-process-status-${tipo || "info"}`;
  }

  function formatearNota(valor) {
    const texto = limpiarTexto(valor);
    if (!texto) return "";

    const numero = Number(texto.replace(",", ".").replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(numero)) return texto.replace(".", ",");

    return numero.toFixed(2).replace(".", ",");
  }

  function formatearFechaLarga(fechaInput) {
    if (window.CertiUtils && typeof window.CertiUtils.formatearFechaLarga === "function") {
      return window.CertiUtils.formatearFechaLarga(fechaInput);
    }

    return fechaInput || "";
  }

  function formatearFechaArchivo(fechaInput) {
    if (window.CertiUtils && typeof window.CertiUtils.formatearFechaArchivo === "function") {
      return window.CertiUtils.formatearFechaArchivo(fechaInput);
    }

    return String(fechaInput || "fecha").replace(/[^0-9A-Za-z_-]+/g, "_");
  }

  function crearNombreArchivo(valor) {
    if (window.CertiUtils && typeof window.CertiUtils.crearNombreArchivo === "function") {
      return window.CertiUtils.crearNombreArchivo(valor);
    }

    return limpiarTexto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase() || "certificado";
  }

  function limpiarNombre(valor) {
    if (window.CertiUtils && typeof window.CertiUtils.limpiarNombrePropio === "function") {
      return window.CertiUtils.limpiarNombrePropio(valor);
    }

    return limpiarTexto(valor).toUpperCase();
  }

  function limpiarTexto(valor) {
    return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim();
  }

  window.CertiDescargaIndividual = {
    asegurarColumnaAccion,
    descargarCertificadoIndividual
  };
})();