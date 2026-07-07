/*
=========================================================
Nombre completo: certi.descargas.alertas.js
Ruta o ubicación: /incorporaciones/certificados/certi.descargas.alertas.js
Función o funciones:
- Enlazar directamente los botones Descargar PDF único y Descargar PDFs individuales.
- Generar un PDF único con todos los certificados.
- Generar un único archivo ZIP cuando se soliciten PDFs individuales.
- Evitar múltiples ventanas o descargas separadas que puedan colapsar Electron.
- Convertir alertas visibles en resumen con botón Ver alertas.
- Mostrar modal con todas las alertas y acciones de corrección cuando correspondan.
Con qué se une:
- certi.index.html
- certi.state.js
- certi.capacitacion.template.js
- certi.tipos.js
- certi.firmantes.js
- certi.utils.js
- jsPDF
- JSZip, cargado dinámicamente si no existe
=========================================================
*/

(function () {
  "use strict";

  const TIPO_CAPACITACION = "capacitacion";
  const JSZIP_CDN = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";

  const ESTADO_GLOBAL = {
    alertas: []
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
        descargarZipIndividualesDirecto();
      }, true);
    }
  }

  async function descargarPdfUnicoDirecto() {
    try {
      bloquearDescargas(true, "Generando PDF...");
      mostrarEstadoDescarga("Generando PDF único. Espere un momento...", "info");

      const estado = obtenerEstadoSeguro();
      const certificados = obtenerCertificadosParaPdf(estado);

      if (!certificados.length) {
        throw new Error("No hay certificados procesados para descargar.");
      }

      const jsPDF = obtenerJsPdf();
      const config = obtenerConfigPdf(estado);
      const plantillaDataUrl = await cargarPlantilla(config.plantilla);
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      for (let i = 0; i < certificados.length; i += 1) {
        if (i > 0) doc.addPage();
        await dibujarCertificado(doc, normalizarCertificado(certificados[i], estado, config), plantillaDataUrl);

        if ((i + 1) % 10 === 0 || i + 1 === certificados.length) {
          mostrarEstadoDescarga(`Generando PDF único: ${i + 1} de ${certificados.length} certificado(s)...`, "info");
          await esperar(40);
        }
      }

      doc.save(crearNombrePdfUnico(estado, config));
      mostrarEstadoDescarga(`PDF único generado con ${certificados.length} certificado(s).`, "success");
    } catch (error) {
      mostrarEstadoDescarga(error.message || "No se pudo generar el PDF único.", "error");
    } finally {
      bloquearDescargas(false);
    }
  }

  async function descargarZipIndividualesDirecto() {
    try {
      bloquearDescargas(true, "Generando ZIP...");
      mostrarEstadoDescarga("Preparando PDFs individuales en un único ZIP. Espere un momento...", "info");

      const estado = obtenerEstadoSeguro();
      const certificados = obtenerCertificadosParaPdf(estado);

      if (!certificados.length) {
        throw new Error("No hay certificados listos para comprimir en ZIP.");
      }

      await asegurarJSZip();

      const jsPDF = obtenerJsPdf();
      const zip = new window.JSZip();
      const config = obtenerConfigPdf(estado);
      const plantillaDataUrl = await cargarPlantilla(config.plantilla);
      const usados = {};

      for (let i = 0; i < certificados.length; i += 1) {
        const certificado = normalizarCertificado(certificados[i], estado, config);
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

        await dibujarCertificado(doc, certificado, plantillaDataUrl);

        const nombrePdf = crearNombreUnico(crearNombrePdfIndividual(certificado, estado, config), usados);
        zip.file(nombrePdf, doc.output("blob"));

        if ((i + 1) % 10 === 0 || i + 1 === certificados.length) {
          mostrarEstadoDescarga(`Preparando ZIP: ${i + 1} de ${certificados.length} PDF(s)...`, "info");
          await esperar(60);
        }
      }

      mostrarEstadoDescarga("Comprimiendo ZIP. Espere un momento...", "info");

      const blobZip = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });

      descargarBlob(blobZip, crearNombreZip(estado, config));
      mostrarEstadoDescarga(`ZIP generado correctamente con ${certificados.length} certificado(s).`, "success");
    } catch (error) {
      mostrarEstadoDescarga(error.message || "No se pudo generar el ZIP de certificados.", "error");
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

    return Object.assign({}, estado, {
      tipoCertificado: tipoSelect && tipoSelect.value ? tipoSelect.value : estado.tipoCertificado || TIPO_CAPACITACION,
      periodoSeleccionado: periodoSelect && periodoSelect.value ? periodoSelect.value : estado.periodoSeleccionado || "",
      periodoTexto: option ? option.textContent : estado.periodoTexto || estado.periodoSeleccionado || "",
      fechaCertificado: fechaInput && fechaInput.value ? fechaInput.value : estado.fechaCertificado || "",
      fuenteDatos: fuenteSelect && fuenteSelect.value ? fuenteSelect.value : estado.fuenteDatos || "excel"
    });
  }

  function obtenerCertificadosParaPdf(estado) {
    let certificados = [];

    if (estado && estado.resultado) {
      certificados = obtenerCertificadosDesdeResultado(estado.resultado);
    }

    if (!certificados.length && window.CertiState && typeof window.CertiState.obtener === "function") {
      const estadoActual = window.CertiState.obtener() || {};
      certificados = obtenerCertificadosDesdeResultado(estadoActual.resultado);
    }

    if (!certificados.length) {
      certificados = obtenerCertificadosDesdeTabla();
    }

    return certificados;
  }

  function obtenerCertificadosDesdeResultado(resultado) {
    if (!resultado || typeof resultado !== "object") return [];

    if (Array.isArray(resultado.certificados) && resultado.certificados.length) return resultado.certificados.slice();
    if (Array.isArray(resultado.mejores) && resultado.mejores.length) return resultado.mejores.slice();
    if (Array.isArray(resultado.registrosValidos) && resultado.registrosValidos.length) return resultado.registrosValidos.slice();

    return [];
  }

  function obtenerCertificadosDesdeTabla() {
    const filas = Array.from(document.querySelectorAll("#certiTablaBody tr"));
    const certificados = [];

    filas.forEach(function (fila) {
      const celdas = Array.from(fila.querySelectorAll("td"));
      if (celdas.length < 5) return;

      const estado = limpiarTexto(celdas[4].textContent);
      if (!/LISTO/i.test(estado)) return;

      const cargo = limpiarTexto(celdas[0].textContent);
      const docente = limpiarTexto(celdas[1].textContent);
      const curso = limpiarTexto(celdas[2].textContent);
      const nota = limpiarTexto(celdas[3].textContent);

      if (!docente || !curso) return;

      certificados.push({
        tipoCertificado: TIPO_CAPACITACION,
        cargo: cargo && cargo !== "—" ? cargo : "",
        cedula: "",
        nombre: docente,
        docente,
        curso,
        tema: curso,
        nota,
        promedio: nota,
        horas: "40",
        estadoCertificado: "listo"
      });
    });

    return certificados;
  }

  function normalizarCertificado(item, estado, config) {
    const fechaLarga = formatearFechaLarga(estado.fechaCertificado);
    const periodo = estado.periodoTexto || estado.periodoSeleccionado || "";
    const firmantes = obtenerFirmantesCapacitacion();

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
      horas: String(item.horas || config.horasDefecto || 40),
      periodo,
      fecha: fechaLarga,
      fechaInput: estado.fechaCertificado,
      firmantes
    });
  }

  async function dibujarCertificado(doc, certificado, plantillaDataUrl) {
    if (certificado.tipoCertificado === TIPO_CAPACITACION && window.CertiCapacitacionTemplate) {
      window.CertiCapacitacionTemplate.dibujarCertificado(doc, certificado, { plantillaDataUrl });
      return;
    }

    if (window.CertiTemplate && typeof window.CertiTemplate.dibujarCertificado === "function") {
      await window.CertiTemplate.dibujarCertificado(doc, certificado, { plantillaDataUrl });
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
        prefijoZip: tipo.pdfZipPrefijo || "Certificados_Capacitacion_Docente_ZIP",
        prefijoIndividual: tipo.pdfIndividualPrefijo || "Certificado_Capacitacion",
        horasDefecto: tipo.horasDefecto || 40
      };
    }

    const config = window.CertiConfig || {};
    return {
      plantilla: config.rutas && config.rutas.plantillaCertificado ? config.rutas.plantillaCertificado : "./assets/certi-plantilla-certificado.png",
      prefijoUnico: config.archivos && config.archivos.pdfUnicoPrefijo ? config.archivos.pdfUnicoPrefijo : "Certificados",
      prefijoZip: "Certificados_ZIP",
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

  function asegurarJSZip() {
    return new Promise(function (resolve, reject) {
      if (window.JSZip) {
        resolve(window.JSZip);
        return;
      }

      const existente = document.querySelector(`script[src="${JSZIP_CDN}"]`);
      if (existente) {
        existente.addEventListener("load", function () {
          resolve(window.JSZip);
        });
        existente.addEventListener("error", function () {
          reject(new Error("No se pudo cargar JSZip."));
        });
        return;
      }

      const script = document.createElement("script");
      script.src = JSZIP_CDN;
      script.onload = function () {
        if (window.JSZip) resolve(window.JSZip);
        else reject(new Error("JSZip no quedó disponible después de cargar."));
      };
      script.onerror = function () {
        reject(new Error("No se pudo cargar JSZip para crear el archivo ZIP."));
      };
      document.head.appendChild(script);
    });
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

  function descargarBlob(blob, nombreArchivo) {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1500);
  }

  function crearNombrePdfUnico(estado, config) {
    const periodo = crearNombreArchivo(estado.periodoTexto || estado.periodoSeleccionado || "periodo");
    const fecha = formatearFechaArchivo(estado.fechaCertificado);
    return `${config.prefijoUnico}_${periodo}_${fecha}.pdf`;
  }

  function crearNombreZip(estado, config) {
    const periodo = crearNombreArchivo(estado.periodoTexto || estado.periodoSeleccionado || "periodo");
    const fecha = formatearFechaArchivo(estado.fechaCertificado);
    return `${config.prefijoZip}_${periodo}_${fecha}.zip`;
  }

  function crearNombrePdfIndividual(certificado, estado, config) {
    const periodo = crearNombreArchivo(estado.periodoTexto || estado.periodoSeleccionado || "periodo");
    const curso = crearNombreArchivo(certificado.curso || certificado.tema || certificado.carrera || "curso");
    const nombre = crearNombreArchivo(certificado.nombre || certificado.docente || "participante");
    return `${config.prefijoIndividual}_${periodo}_${curso}_${nombre}.pdf`;
  }

  function crearNombreUnico(nombre, usados) {
    if (!usados[nombre]) {
      usados[nombre] = 1;
      return nombre;
    }

    usados[nombre] += 1;
    return nombre.replace(/\.pdf$/i, `_${usados[nombre]}.pdf`);
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
        irACorreccionAlerta();
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

    observer.observe(contenedor, { childList: true, subtree: true });
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
      btnIndividuales.textContent = bloquear ? texto || "Generando ZIP..." : "Descargar PDFs individuales";
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

  function limpiarTexto(valor) {
    return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim();
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
    descargarZipIndividualesDirecto,
    abrirModalAlertas,
    cerrarModalAlertas
  };
})();
