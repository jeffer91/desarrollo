/*
=========================================================
Nombre completo: certi.descargas.zip.js
Ruta o ubicación: /incorporaciones/certificados/certi.descargas.zip.js
Función o funciones:
- Reemplazar la descarga masiva individual por un único archivo ZIP.
- Generar cada certificado PDF en memoria.
- Insertar todos los PDFs dentro de un ZIP.
- Evitar que Electron/Windows abra 50 descargas separadas y colapse.
Con qué se une:
- certi.index.html
- certi.capacitacion.template.js
- certi.tipos.js
- certi.firmantes.js
- certi.utils.js
- jsPDF
- JSZip
=========================================================
*/

(function () {
  "use strict";

  const TIPO_CAPACITACION = "capacitacion";

  iniciar();

  function iniciar() {
    document.addEventListener("click", function (evento) {
      const boton = evento.target.closest("#certiBtnPdfIndividuales");
      if (!boton) return;

      evento.preventDefault();
      evento.stopPropagation();
      evento.stopImmediatePropagation();

      descargarZipIndividuales();
    }, true);
  }

  async function descargarZipIndividuales() {
    try {
      bloquearBotones(true, "Generando ZIP...");
      mostrarEstado("Preparando ZIP con PDFs individuales. Espere un momento...", "info");

      const certificados = obtenerCertificadosParaPdf();

      if (!certificados.length) {
        throw new Error("No hay certificados listos para comprimir en ZIP.");
      }

      if (!window.JSZip) {
        throw new Error("No se encontró la librería JSZip para crear el archivo ZIP.");
      }

      const jsPDF = obtenerJsPdf();
      const estado = obtenerEstadoPantalla();
      const config = obtenerConfigPdf(estado);
      const plantillaDataUrl = await cargarPlantilla(config.plantilla);
      const zip = new JSZip();
      const usados = {};

      for (let i = 0; i < certificados.length; i += 1) {
        const certificado = normalizarCertificado(certificados[i], estado, config);
        const doc = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4"
        });

        await dibujarCertificado(doc, certificado, plantillaDataUrl);

        const nombre = crearNombreUnico(
          crearNombrePdfIndividual(certificado, estado, config),
          usados
        );

        zip.file(nombre, doc.output("blob"));

        if ((i + 1) % 10 === 0 || i + 1 === certificados.length) {
          mostrarEstado(`Generando ZIP: ${i + 1} de ${certificados.length} PDF(s) preparados...`, "info");
          await esperar(60);
        }
      }

      mostrarEstado("Comprimiendo certificados en ZIP...", "info");

      const blobZip = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6
        }
      });

      descargarBlob(blobZip, crearNombreZip(estado, config));
      mostrarEstado(`ZIP generado correctamente con ${certificados.length} certificado(s).`, "success");
    } catch (error) {
      mostrarEstado(error.message || "No se pudo generar el ZIP de certificados.", "error");
    } finally {
      bloquearBotones(false);
    }
  }

  function obtenerCertificadosParaPdf() {
    const desdeEstado = obtenerCertificadosDesdeEstado();
    if (desdeEstado.length) return desdeEstado;

    return obtenerCertificadosDesdeTabla();
  }

  function obtenerCertificadosDesdeEstado() {
    if (!window.CertiState || typeof window.CertiState.obtener !== "function") return [];

    const estado = window.CertiState.obtener() || {};
    const resultado = estado.resultado || {};

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

  function obtenerEstadoPantalla() {
    let estado = {};

    if (window.CertiState && typeof window.CertiState.obtener === "function") {
      estado = window.CertiState.obtener() || {};
    }

    const tipo = document.getElementById("certiTipoCertificado");
    const periodo = document.getElementById("certiPeriodo");
    const fecha = document.getElementById("certiFechaCertificado");
    const option = periodo && periodo.options[periodo.selectedIndex] ? periodo.options[periodo.selectedIndex] : null;

    return Object.assign({}, estado, {
      tipoCertificado: tipo && tipo.value ? tipo.value : estado.tipoCertificado || TIPO_CAPACITACION,
      periodoSeleccionado: periodo && periodo.value ? periodo.value : estado.periodoSeleccionado || "",
      periodoTexto: option ? option.textContent : estado.periodoTexto || estado.periodoSeleccionado || "",
      fechaCertificado: fecha && fecha.value ? fecha.value : estado.fechaCertificado || ""
    });
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
        prefijoZip: tipo.pdfZipPrefijo || "Certificados_Capacitacion_Docente_ZIP",
        prefijoIndividual: tipo.pdfIndividualPrefijo || "Certificado_Capacitacion",
        horasDefecto: tipo.horasDefecto || 40
      };
    }

    const config = window.CertiConfig || {};
    return {
      plantilla: config.rutas && config.rutas.plantillaCertificado ? config.rutas.plantillaCertificado : "./assets/certi-plantilla-certificado.png",
      prefijoZip: "Certificados_ZIP",
      prefijoIndividual: config.archivos && config.archivos.pdfIndividualPrefijo ? config.archivos.pdfIndividualPrefijo : "Certificado",
      horasDefecto: 40
    };
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

  function obtenerJsPdf() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("No se encontró la librería jsPDF.");
    }

    return window.jspdf.jsPDF;
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

  function mostrarEstado(mensaje, tipo) {
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

  function bloquearBotones(bloquear, texto) {
    const btnUnico = document.getElementById("certiBtnPdfUnico");
    const btnIndividuales = document.getElementById("certiBtnPdfIndividuales");

    if (btnUnico) btnUnico.disabled = Boolean(bloquear);

    if (btnIndividuales) {
      btnIndividuales.disabled = Boolean(bloquear);
      btnIndividuales.textContent = bloquear ? texto || "Generando ZIP..." : "Descargar PDFs individuales";
    }
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

  function limpiarTexto(valor) {
    return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim();
  }

  function esperar(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  window.CertiDescargasZip = {
    descargarZipIndividuales
  };
})();
