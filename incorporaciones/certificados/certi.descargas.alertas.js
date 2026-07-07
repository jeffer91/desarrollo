/*
=========================================================
Nombre completo: certi.descargas.alertas.js
Ruta o ubicación: /incorporaciones/certificados/certi.descargas.alertas.js
Función o funciones:
- Enlazar directamente los botones Descargar PDF único y Descargar PDFs individuales.
- Generar PDFs de capacitación docente aunque el flujo original de descargas falle.
- Convertir las alertas visibles en un resumen con botón Ver alertas.
- Mostrar un modal con todas las alertas y acciones de corrección cuando correspondan.
Con qué se une:
- certi.index.html
- certi.state.js
- certi.capacitacion.logic.js
- certi.capacitacion.template.js
- certi.tipos.js
- certi.firmantes.js
- certi.utils.js
- certi.pdf.js
=========================================================
*/

(function () {
  "use strict";

  const TIPO_CAPACITACION = "capacitacion";
  const ESTADO_GLOBAL = {
    alertas: [],
    ultimoEstado: null
  };

  iniciar();

  function iniciar() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", inicializar);
      return;
    }

    inicializar();
  }

  function inicializar() {
    crearModalAlertas();
    enlazarBotonesDescarga();
    enlazarBotonAlertas();
    observarAlertas();
  }

  function enlazarBotonesDescarga() {
    const btnUnico = document.getElementById("certiBtnPdfUnico");
    const btnIndividuales = document.getElementById("certiBtnPdfIndividuales");

    if (btnUnico && btnUnico.dataset.certiDescargaDirecta !== "1") {
      btnUnico.dataset.certiDescargaDirecta = "1";
      btnUnico.addEventListener("click", function (evento) {
        evento.preventDefault();
        evento.stopImmediatePropagation();
        descargarPdfUnicoDirecto();
      }, true);
    }

    if (btnIndividuales && btnIndividuales.dataset.certiDescargaDirecta !== "1") {
      btnIndividuales.dataset.certiDescargaDirecta = "1";
      btnIndividuales.addEventListener("click", function (evento) {
        evento.preventDefault();
        evento.stopImmediatePropagation();
        descargarPdfIndividualesDirecto();
      }, true);
    }
  }

  async function descargarPdfUnicoDirecto() {
    try {
      bloquearDescargas(true, "Generando PDF...");
      mostrarEstadoDescarga("Generando PDF único. Espere un momento...", "info");

      const estado = obtenerEstadoSeguro();
      const preparado = prepararCertificadosSeguro(estado);

      if (!preparado.valido) {
        throw new Error(preparado.errores.join("\n") || "No hay certificados listos para descargar.");
      }

      const jsPDF = obtenerJsPdf();
      const config = obtenerConfigPdf(estado);
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });
      const plantillaDataUrl = await cargarPlantilla(config.plantilla);

      for (let i = 0; i < preparado.certificados.length; i += 1) {
        if (i > 0) doc.addPage();
        await dibujarCertificado(doc, preparado.certificados[i], plantillaDataUrl);
      }

      doc.save(crearNombrePdfUnico(estado, config));
      mostrarEstadoDescarga(`PDF único generado con ${preparado.certificados.length} certificado(s).`, "success");
    } catch (error) {
      mostrarEstadoDescarga(error.message || "No se pudo generar el PDF único.", "error");
    } finally {
      bloquearDescargas(false);
    }
  }

  async function descargarPdfIndividualesDirecto() {
    try {
      bloquearDescargas(true, "Generando PDFs...");
      mostrarEstadoDescarga("Generando PDFs individuales. Espere un momento...", "info");

      const estado = obtenerEstadoSeguro();
      const preparado = prepararCertificadosSeguro(estado);

      if (!preparado.valido) {
        throw new Error(preparado.errores.join("\n") || "No hay certificados listos para descargar.");
      }

      const jsPDF = obtenerJsPdf();
      const config = obtenerConfigPdf(estado);
      const plantillaDataUrl = await cargarPlantilla(config.plantilla);

      for (let i = 0; i < preparado.certificados.length; i += 1) {
        const certificado = preparado.certificados[i];
        const doc = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4"
        });

        await dibujarCertificado(doc, certificado, plantillaDataUrl);
        doc.save(crearNombrePdfIndividual(certificado, estado, config));
        await esperar(180);
      }

      mostrarEstadoDescarga(`Se generaron ${preparado.certificados.length} PDF(s) individuales.`, "success");
    } catch (error) {
      mostrarEstadoDescarga(error.message || "No se pudieron generar los PDFs individuales.", "error");
    } finally {
      bloquearDescargas(false);
    }
  }

  function obtenerEstadoSeguro() {
    let estado = {};

    if (window.CertiState && typeof window.CertiState.obtener === "function") {
      estado = window.CertiState.obtener() || {};
    }

    const tipoSelect = document.getElementById("certiTipoCertificado");
    const periodoSelect = document.getElementById("certiPeriodo");
    const fechaInput = document.getElementById("certiFechaCertificado");
    const fuenteSelect = document.getElementById("certiFuenteDatos");

    const option = periodoSelect && periodoSelect.options[periodoSelect.selectedIndex]
      ? periodoSelect.options[periodoSelect.selectedIndex]
      : null;

    const estadoSeguro = Object.assign({}, estado, {
      tipoCertificado: tipoSelect && tipoSelect.value ? tipoSelect.value : estado.tipoCertificado || TIPO_CAPACITACION,
      periodoSeleccionado: periodoSelect && periodoSelect.value ? periodoSelect.value : estado.periodoSeleccionado || "",
      periodoTexto: option ? option.textContent : estado.periodoTexto || estado.periodoSeleccionado || "",
      fechaCertificado: fechaInput && fechaInput.value ? fechaInput.value : estado.fechaCertificado || "",
      fuenteDatos: fuenteSelect && fuenteSelect.value ? fuenteSelect.value : estado.fuenteDatos || "excel"
    });

    ESTADO_GLOBAL.ultimoEstado = estadoSeguro;
    return estadoSeguro;
  }

  function prepararCertificadosSeguro(estado) {
    const esCapacitacion = estado.tipoCertificado === TIPO_CAPACITACION;

    if (esCapacitacion && window.CertiCapacitacionLogic && typeof window.CertiCapacitacionLogic.prepararCertificados === "function") {
      const preparado = window.CertiCapacitacionLogic.prepararCertificados(estado);
      if (preparado && preparado.certificados && preparado.certificados.length) return preparado;
    }

    if (window.CertiLogic && typeof window.CertiLogic.prepararCertificados === "function") {
      const preparado = window.CertiLogic.prepararCertificados(estado);
      if (preparado && preparado.valido) return preparado;
    }

    const certificados = obtenerCertificadosDesdeResultado(estado.resultado);

    if (certificados.length) {
      return {
        valido: true,
        errores: [],
        certificados: normalizarCertificadosParaPdf(certificados, estado)
      };
    }

    return {
      valido: false,
      errores: ["No hay certificados procesados para descargar."],
      certificados: []
    };
  }

  function obtenerCertificadosDesdeResultado(resultado) {
    if (!resultado || typeof resultado !== "object") return [];

    if (Array.isArray(resultado.certificados) && resultado.certificados.length) return resultado.certificados.slice();
    if (Array.isArray(resultado.mejores) && resultado.mejores.length) return resultado.mejores.slice();
    if (Array.isArray(resultado.registrosValidos) && resultado.registrosValidos.length) return resultado.registrosValidos.slice();

    return [];
  }

  function normalizarCertificadosParaPdf(certificados, estado) {
    const fechaLarga = formatearFechaLarga(estado.fechaCertificado);
    const periodo = estado.periodoTexto || estado.periodoSeleccionado || "";
    const firmantes = obtenerFirmantesCapacitacion();

    return certificados.map(function (item) {
      return Object.assign({}, item, {
        tipoCertificado: item.tipoCertificado || estado.tipoCertificado || TIPO_CAPACITACION,
        cargo: item.cargo || "",
        cedula: item.cedula || "",
        nombre: item.nombre || item.docente || "",
        docente: item.docente || item.nombre || "",
        curso: item.curso || item.tema || item.carrera || "",
        tema: item.tema || item.curso || item.carrera || "",
        nota: formatearNota(item.nota || item.promedio),
        promedio: formatearNota(item.promedio || item.nota),
        horas: String(item.horas || obtenerConfigPdf(estado).horasDefecto || 40),
        periodo,
        fecha: fechaLarga,
        fechaInput: estado.fechaCertificado,
        firmantes
      });
    });
  }

  async function dibujarCertificado(doc, certificado, plantillaDataUrl) {
    if (certificado.tipoCertificado === TIPO_CAPACITACION && window.CertiCapacitacionTemplate) {
      window.CertiCapacitacionTemplate.dibujarCertificado(doc, certificado, {
        plantillaDataUrl
      });
      return;
    }

    if (window.CertiTemplate && typeof window.CertiTemplate.dibujarCertificado === "function") {
      await window.CertiTemplate.dibujarCertificado(doc, certificado, {
        plantillaDataUrl
      });
      return;
    }

    throw new Error("No está disponible la plantilla para dibujar certificados.");
  }

  function obtenerConfigPdf(estado) {
    if (estado.tipoCertificado === TIPO_CAPACITACION && window.CertiTipos && typeof window.CertiTipos.obtenerConfig === "function") {
      const tipo = window.CertiTipos.obtenerConfig(TIPO_CAPACITACION);
      return {
        plantilla: tipo.plantilla || "./assets/certi-plantilla-capacitacion.png",
        prefijoUnico: tipo.pdfUnicoPrefijo || "Certificados_Capacitacion_Docente",
        prefijoIndividual: tipo.pdfIndividualPrefijo || "Certificado_Capacitacion",
        horasDefecto: tipo.horasDefecto || 40
      };
    }

    const config = window.CertiConfig || {};
    return {
      plantilla: config.rutas && config.rutas.plantillaCertificado ? config.rutas.plantillaCertificado : "./assets/certi-plantilla-certificado.png",
      prefijoUnico: config.archivos && config.archivos.pdfUnicoPrefijo ? config.archivos.pdfUnicoPrefijo : "Certificados",
      prefijoIndividual: config.archivos && config.archivos.pdfIndividualPrefijo ? config.archivos.pdfIndividualPrefijo : "Certificado",
      horasDefecto: 40
    };
  }

  function obtenerFirmantesCapacitacion() {
    if (window.CertiFirmantes && typeof window.CertiFirmantes.obtenerFirmantesCapacitacion === "function") {
      return window.CertiFirmantes.obtenerFirmantesCapacitacion();
    }

    return [
      { nombre: "Dr. Alex León", cargo: "VICERRECTOR" },
      { nombre: "Mgs. Jefferson Villarreal", cargo: "GESTOR DE PROCESOS ACADÉMICOS" }
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

  function crearNombrePdfUnico(estado, config) {
    const periodo = crearNombreArchivo(estado.periodoTexto || estado.periodoSeleccionado || "periodo");
    const fecha = formatearFechaArchivo(estado.fechaCertificado);
    return `${config.prefijoUnico}_${periodo}_${fecha}.pdf`;
  }

  function crearNombrePdfIndividual(certificado, estado, config) {
    const periodo = crearNombreArchivo(estado.periodoTexto || estado.periodoSeleccionado || "periodo");
    const curso = crearNombreArchivo(certificado.curso || certificado.tema || certificado.carrera || "curso");
    const nombre = crearNombreArchivo(certificado.nombre || certificado.docente || "participante");
    return `${config.prefijoIndividual}_${periodo}_${curso}_${nombre}.pdf`;
  }

  function enlazarBotonAlertas() {
    document.addEventListener("click", function (evento) {
      const boton = evento.target.closest("[data-certi-alertas-abrir]");
      if (boton) {
        evento.preventDefault();
        abrirModalAlertas();
      }

      const cerrar = evento.target.closest("[data-certi-alertas-cerrar]");
      if (cerrar) {
        evento.preventDefault();
        cerrarModalAlertas();
      }

      const corregir = evento.target.closest("[data-certi-alerta-corregir]");
      if (corregir) {
        evento.preventDefault();
        irACorreccionAlerta(corregir.dataset.certiAlertaCorregir);
      }
    });

    document.addEventListener("keydown", function (evento) {
      if (evento.key === "Escape") cerrarModalAlertas();
    });
  }

  function observarAlertas() {
    const contenedor = document.getElementById("certiAlertas");
    if (!contenedor) return;

    const observer = new MutationObserver(function () {
      if (contenedor.dataset.certiAlertasRenderizando === "1") return;
      convertirAlertasEnResumen();
    });

    observer.observe(contenedor, {
      childList: true,
      subtree: true
    });

    setTimeout(convertirAlertasEnResumen, 200);
  }

  function convertirAlertasEnResumen() {
    const contenedor = document.getElementById("certiAlertas");
    if (!contenedor) return;

    const tarjetas = Array.from(contenedor.querySelectorAll(".certi-alert"));
    if (!tarjetas.length) return;

    const alertas = tarjetas.map(function (tarjeta, index) {
      const titulo = tarjeta.querySelector("strong") ? tarjeta.querySelector("strong").textContent.trim() : "Aviso";
      const textoCompleto = tarjeta.textContent.replace(titulo, "").trim();
      const tipo = obtenerTipoDesdeTarjeta(tarjeta);

      return {
        id: `alerta_${index}`,
        titulo,
        mensaje: textoCompleto,
        tipo,
        corregible: tipo === "warning" || tipo === "danger" || tipo === "error"
      };
    });

    ESTADO_GLOBAL.alertas = alertas;
    pintarResumenAlertas(alertas);
    pintarModalAlertas(alertas);
  }

  function pintarResumenAlertas(alertas) {
    const contenedor = document.getElementById("certiAlertas");
    if (!contenedor) return;

    const total = alertas.length;
    const corregibles = alertas.filter(function (alerta) {
      return alerta.corregible;
    }).length;

    contenedor.dataset.certiAlertasRenderizando = "1";
    contenedor.innerHTML = `
      <div class="certi-alertas-resumen">
        <div>
          <strong>${total} alerta${total === 1 ? "" : "s"} del procesamiento</strong>
          <span>${corregibles ? `${corregibles} requiere(n) revisión.` : "No hay alertas que requieran corrección."}</span>
        </div>
        <button type="button" data-certi-alertas-abrir="1">Ver alertas</button>
      </div>
    `;
    contenedor.dataset.certiAlertasRenderizando = "0";
  }

  function crearModalAlertas() {
    if (document.getElementById("certiAlertasModal")) return;

    const modal = document.createElement("section");
    modal.id = "certiAlertasModal";
    modal.className = "certi-alertas-modal certi-alertas-modal-hidden";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="certi-alertas-backdrop" data-certi-alertas-cerrar="1"></div>
      <div class="certi-alertas-dialog" role="dialog" aria-modal="true" aria-labelledby="certiAlertasTitulo">
        <header class="certi-alertas-header">
          <div>
            <p>Procesamiento</p>
            <h2 id="certiAlertasTitulo">Alertas detectadas</h2>
            <span>Revise los avisos generados durante la lectura del Excel.</span>
          </div>
          <button type="button" class="certi-alertas-close" data-certi-alertas-cerrar="1">×</button>
        </header>
        <div id="certiAlertasModalBody" class="certi-alertas-body"></div>
        <footer class="certi-alertas-footer">
          <button type="button" class="certi-btn certi-btn-primary" data-certi-alertas-cerrar="1">Entendido</button>
        </footer>
      </div>
    `;

    document.body.appendChild(modal);
  }

  function pintarModalAlertas(alertas) {
    const body = document.getElementById("certiAlertasModalBody");
    if (!body) return;

    if (!alertas.length) {
      body.innerHTML = `<div class="certi-alertas-empty">No hay alertas para mostrar.</div>`;
      return;
    }

    body.innerHTML = alertas.map(function (alerta, index) {
      const tipo = normalizarTipo(alerta.tipo);
      const accion = alerta.corregible
        ? `<button type="button" data-certi-alerta-corregir="${escaparHtml(alerta.id)}">Corregir</button>`
        : `<span>No requiere corrección</span>`;

      return `
        <article class="certi-alerta-modal-item certi-alerta-modal-${tipo}">
          <div class="certi-alerta-modal-numero">${index + 1}</div>
          <div class="certi-alerta-modal-contenido">
            <strong>${escaparHtml(alerta.titulo || "Aviso")}</strong>
            <p>${escaparHtml(alerta.mensaje || "")}</p>
          </div>
          <div class="certi-alerta-modal-accion">${accion}</div>
        </article>
      `;
    }).join("");
  }

  function abrirModalAlertas() {
    const modal = document.getElementById("certiAlertasModal");
    if (!modal) return;

    pintarModalAlertas(ESTADO_GLOBAL.alertas || []);
    modal.classList.remove("certi-alertas-modal-hidden");
    modal.setAttribute("aria-hidden", "false");
  }

  function cerrarModalAlertas() {
    const modal = document.getElementById("certiAlertasModal");
    if (!modal) return;

    modal.classList.add("certi-alertas-modal-hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  function irACorreccionAlerta() {
    cerrarModalAlertas();
    const destino = document.querySelector(".certi-source-card") || document.getElementById("certiExcelInput");
    if (destino && typeof destino.scrollIntoView === "function") {
      destino.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function obtenerTipoDesdeTarjeta(tarjeta) {
    if (tarjeta.classList.contains("certi-alert-danger") || tarjeta.classList.contains("certi-alert-error")) return "danger";
    if (tarjeta.classList.contains("certi-alert-warning")) return "warning";
    if (tarjeta.classList.contains("certi-alert-success")) return "success";
    return "info";
  }

  function mostrarEstadoDescarga(mensaje, tipo) {
    let estado = document.getElementById("certiDescargaEstado");
    const zona = document.querySelector(".certi-downloads");

    if (!estado && zona) {
      estado = document.createElement("div");
      estado.id = "certiDescargaEstado";
      zona.appendChild(estado);
    }

    if (!estado) return;

    estado.textContent = mensaje;
    estado.className = `certi-process-status certi-process-status-${tipo || "info"}`;
  }

  function bloquearDescargas(bloquear, texto) {
    const btnUnico = document.getElementById("certiBtnPdfUnico");
    const btnIndividuales = document.getElementById("certiBtnPdfIndividuales");

    if (btnUnico) {
      btnUnico.disabled = Boolean(bloquear);
      btnUnico.textContent = bloquear ? texto || "Generando..." : "Descargar PDF único";
    }

    if (btnIndividuales) {
      btnIndividuales.disabled = Boolean(bloquear);
      btnIndividuales.textContent = bloquear ? texto || "Generando..." : "Descargar PDFs individuales";
    }
  }

  function normalizarTipo(tipo) {
    const valor = String(tipo || "info").toLowerCase();
    if (valor === "danger" || valor === "error") return "danger";
    if (valor === "warning" || valor === "warn") return "warning";
    if (valor === "success") return "success";
    return "info";
  }

  function formatearNota(valor) {
    if (valor === null || valor === undefined || valor === "") return "";
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return String(valor);
    return numero.toFixed(2);
  }

  function formatearFechaLarga(fecha) {
    if (window.CertiUtils && typeof window.CertiUtils.formatearFechaLarga === "function") {
      return window.CertiUtils.formatearFechaLarga(fecha);
    }

    return fecha || "";
  }

  function formatearFechaArchivo(fecha) {
    if (window.CertiUtils && typeof window.CertiUtils.formatearFechaArchivo === "function") {
      return window.CertiUtils.formatearFechaArchivo(fecha);
    }

    return String(fecha || "sin_fecha").replace(/[^0-9A-Za-z]+/g, "_");
  }

  function crearNombreArchivo(texto) {
    if (window.CertiUtils && typeof window.CertiUtils.crearNombreArchivo === "function") {
      return window.CertiUtils.crearNombreArchivo(texto);
    }

    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase();
  }

  function esperar(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function escaparHtml(valor) {
    return String(valor == null ? "" : valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  window.CertiDescargasAlertas = {
    descargarPdfUnicoDirecto,
    descargarPdfIndividualesDirecto,
    abrirModalAlertas,
    cerrarModalAlertas
  };
})();
