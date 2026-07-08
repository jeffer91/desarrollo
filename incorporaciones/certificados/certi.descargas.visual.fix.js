/*
=========================================================
Nombre completo: certi.descargas.visual.fix.js
Ruta o ubicación: /incorporaciones/certificados/certi.descargas.visual.fix.js
Función o funciones:
- Reemplazar de forma segura las descargas generales con soporte para análisis visual de plantilla.
- Interceptar Descargar todos en PDF y Descargar todos como ZIP antes del controlador anterior.
- Esperar correctamente las plantillas async de reconocimiento y capacitación.
- Conservar el capacitador real en los certificados de capacitación.
Con qué se une:
- certi.index.html
- certi.state.js
- certi.template.smart.js
- certi.template.js
- certi.capacitacion.template.js
- certi.tipos.js
- certi.firmantes.js
- jsPDF
- JSZip
=========================================================
*/

(function () {
  "use strict";

  const TIPO_CAPACITACION = "capacitacion";
  const JSZIP_CDN = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";

  iniciar();

  function iniciar() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", inicializar);
      return;
    }

    inicializar();
  }

  function inicializar() {
    document.addEventListener("click", function (evento) {
      const btnPdfUnico = evento.target.closest("#certiBtnPdfUnico");
      const btnZip = evento.target.closest("#certiBtnPdfIndividuales");

      if (!btnPdfUnico && !btnZip) return;

      evento.preventDefault();
      evento.stopImmediatePropagation();

      if (btnPdfUnico) {
        descargarTodosEnPdf();
        return;
      }

      descargarTodosComoZip();
    }, true);
  }

  async function descargarTodosEnPdf() {
    try {
      bloquearDescargas(true, "Generando PDF...");
      mostrarEstado("Analizando plantilla y generando PDF único...", "info");

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

        const certificado = normalizarCertificado(certificados[i], estado, config);
        await dibujarCertificado(doc, certificado, plantillaDataUrl);

        if ((i + 1) % 10 === 0 || i + 1 === certificados.length) {
          mostrarEstado(`Generando PDF único: ${i + 1} de ${certificados.length} certificado(s)...`, "info");
          await esperar(40);
        }
      }

      doc.save(crearNombrePdfUnico(estado, config));
      mostrarEstado(`PDF único generado correctamente con ${certificados.length} certificado(s).`, "success");
    } catch (error) {
      mostrarEstado(error.message || "No se pudo generar el PDF único.", "error");
    } finally {
      bloquearDescargas(false);
    }
  }

  async function descargarTodosComoZip() {
    try {
      bloquearDescargas(true, "Generando ZIP...");
      mostrarEstado("Analizando plantilla y preparando certificados en ZIP...", "info");

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
          mostrarEstado(`Preparando ZIP: ${i + 1} de ${certificados.length} PDF(s)...`, "info");
          await esperar(60);
        }
      }

      mostrarEstado("Comprimiendo ZIP. Espere un momento...", "info");

      const blobZip = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });

      descargarBlob(blobZip, crearNombreZip(estado, config));
      mostrarEstado(`ZIP generado correctamente con ${certificados.length} certificado(s).`, "success");
    } catch (error) {
      mostrarEstado(error.message || "No se pudo generar el ZIP de certificados.", "error");
    } finally {
      bloquearDescargas(false);
    }
  }

  function obtenerEstadoSeguro() {
    const estado = window.CertiState && typeof window.CertiState.obtener === "function"
      ? window.CertiState.obtener() || {}
      : {};

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
    if (estado && estado.resultado) {
      const desdeResultado = obtenerCertificadosDesdeResultado(estado.resultado);
      if (desdeResultado.length) return desdeResultado;
    }

    if (window.CertiState && typeof window.CertiState.obtener === "function") {
      const actual = window.CertiState.obtener() || {};
      const desdeEstadoActual = obtenerCertificadosDesdeResultado(actual.resultado);
      if (desdeEstadoActual.length) return desdeEstadoActual;
    }

    return obtenerCertificadosDesdeTabla(estado);
  }

  function obtenerCertificadosDesdeResultado(resultado) {
    if (!resultado || typeof resultado !== "object") return [];
    if (Array.isArray(resultado.certificados) && resultado.certificados.length) return resultado.certificados.slice();
    if (Array.isArray(resultado.mejores) && resultado.mejores.length) return resultado.mejores.slice();
    if (Array.isArray(resultado.registrosValidos) && resultado.registrosValidos.length) return resultado.registrosValidos.slice();
    return [];
  }

  function obtenerCertificadosDesdeTabla(estado) {
    const filas = Array.from(document.querySelectorAll("#certiTablaBody tr"));
    const certificados = [];
    const tipo = estado && estado.tipoCertificado ? estado.tipoCertificado : TIPO_CAPACITACION;

    filas.forEach(function (fila) {
      const celdas = Array.from(fila.querySelectorAll("td"));
      if (!celdas.length || fila.querySelector(".certi-empty")) return;

      if (tipo === TIPO_CAPACITACION && celdas.length >= 5) {
        const estadoFila = limpiarTexto(celdas[4].textContent);
        if (!/LISTO/i.test(estadoFila)) return;

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
        return;
      }

      if (tipo !== TIPO_CAPACITACION && celdas.length >= 4) {
        const estadoFila = limpiarTexto(celdas[3].textContent);
        if (!/LISTO/i.test(estadoFila)) return;

        certificados.push({
          tipoCertificado: "reconocimiento",
          carrera: limpiarTexto(celdas[0].textContent),
          nombre: limpiarTexto(celdas[1].textContent),
          promedio: limpiarTexto(celdas[2].textContent),
          estadoCertificado: "listo"
        });
      }
    });

    return certificados;
  }

  function normalizarCertificado(item, estado, config) {
    const tipo = item.tipoCertificado || estado.tipoCertificado || TIPO_CAPACITACION;
    const fechaLarga = formatearFechaLarga(estado.fechaCertificado);
    const periodo = estado.periodoTexto || estado.periodoSeleccionado || "";

    if (tipo === TIPO_CAPACITACION) {
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
        fecha: fechaLarga,
        fechaInput: estado.fechaCertificado,
        firmantes: obtenerFirmantesCapacitacion(capacitador)
      });
    }

    return Object.assign({}, item, {
      tipoCertificado: "reconocimiento",
      nombre: item.nombre || item.estudiante || "",
      carrera: item.carrera || item.carreraOficial || item.carreraOriginal || "",
      promedio: item.promedio || item.nota || "",
      periodo,
      fecha: fechaLarga,
      fechaInput: estado.fechaCertificado
    });
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

  function obtenerFirmantesCapacitacion(capacitador) {
    if (window.CertiFirmantes && typeof window.CertiFirmantes.obtenerFirmantesCapacitacion === "function") {
      return window.CertiFirmantes.obtenerFirmantesCapacitacion(capacitador || "");
    }

    return [
      { nombre: "Dr. León Tito", cargo: "RECTOR" },
      { nombre: "Mgs. Jefferson Villarreal", cargo: "GESTOR DE PROCESOS ACADÉMICOS" },
      { nombre: capacitador || "", cargo: "CAPACITADOR" }
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

  function bloquearDescargas(bloquear, texto) {
    const botones = [
      document.getElementById("certiBtnPdfUnico"),
      document.getElementById("certiBtnPdfIndividuales")
    ];

    botones.forEach(function (boton) {
      if (!boton) return;
      boton.disabled = Boolean(bloquear);
      if (bloquear && texto) boton.dataset.textoOriginal = boton.textContent;
      if (bloquear && texto) boton.textContent = texto;
      if (!bloquear && boton.dataset.textoOriginal) {
        boton.textContent = boton.dataset.textoOriginal;
        delete boton.dataset.textoOriginal;
      }
    });
  }

  function mostrarEstado(mensaje, tipo) {
    let estado = document.getElementById("certiProcesarEstado");

    if (!estado) {
      const acciones = document.querySelector(".certi-downloads") || document.querySelector(".certi-actions");
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

  function esperar(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms || 0);
    });
  }

  window.CertiDescargasVisualFix = {
    descargarTodosEnPdf,
    descargarTodosComoZip
  };
})();