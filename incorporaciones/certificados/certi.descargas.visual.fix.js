/*
=========================================================
Nombre completo: certi.descargas.visual.fix.js
Ruta o ubicación: /incorporaciones/certificados/certi.descargas.visual.fix.js
Función o funciones:
- Controlar de forma única y segura las descargas generales del módulo Certi.
- Generar un PDF único con todos los certificados procesados.
- Generar un ZIP con un PDF individual por certificado procesado.
- Evitar que los botones queden bloqueados en "Generando ZIP...".
- Cargar JSZip con control de error y tiempo máximo de espera.
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
  const TIPO_RECONOCIMIENTO = "reconocimiento";
  const JSZIP_CDN = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
  const JSZIP_TIMEOUT_MS = 15000;
  const IMAGEN_TIMEOUT_MS = 12000;

  const CONTROL = {
    descargando: false,
    tipo: ""
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
    restablecerBotonesSiQuedaronAtorados();

    document.addEventListener("click", function (evento) {
      const btnPdfUnico = evento.target.closest("#certiBtnPdfUnico");
      const btnZip = evento.target.closest("#certiBtnPdfIndividuales");

      if (!btnPdfUnico && !btnZip) return;

      evento.preventDefault();
      evento.stopImmediatePropagation();

      if (CONTROL.descargando) {
        mostrarEstado("Ya existe una descarga en proceso. Espere a que termine.", "warning");
        return;
      }

      if (btnPdfUnico) {
        descargarTodosEnPdf();
        return;
      }

      descargarTodosComoZip();
    }, true);
  }

  async function descargarTodosEnPdf() {
    CONTROL.descargando = true;
    CONTROL.tipo = "pdf";

    try {
      bloquearDescargas(true, {
        pdf: "Generando PDF...",
        zip: "Espere..."
      });
      mostrarEstado("Preparando PDF único. Espere un momento...", "info");

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
          await esperar(35);
        }
      }

      doc.save(crearNombrePdfUnico(estado, config));
      mostrarEstado(`PDF único generado correctamente con ${certificados.length} certificado(s).`, "success");
    } catch (error) {
      mostrarEstado(error && error.message ? error.message : "No se pudo generar el PDF único.", "error");
    } finally {
      CONTROL.descargando = false;
      CONTROL.tipo = "";
      bloquearDescargas(false);
    }
  }

  async function descargarTodosComoZip() {
    CONTROL.descargando = true;
    CONTROL.tipo = "zip";

    try {
      bloquearDescargas(true, {
        pdf: "Espere...",
        zip: "Generando ZIP..."
      });
      mostrarEstado("Preparando PDFs individuales en un único ZIP. Espere un momento...", "info");

      const estado = obtenerEstadoSeguro();
      const certificados = obtenerCertificadosParaPdf(estado);

      if (!certificados.length) {
        throw new Error("No hay certificados listos para comprimir en ZIP.");
      }

      const JSZip = await asegurarJSZip();
      const jsPDF = obtenerJsPdf();
      const zip = new JSZip();
      const config = obtenerConfigPdf(estado);
      const plantillaDataUrl = await cargarPlantilla(config.plantilla);
      const usados = {};

      for (let i = 0; i < certificados.length; i += 1) {
        const certificado = normalizarCertificado(certificados[i], estado, config);
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

        await dibujarCertificado(doc, certificado, plantillaDataUrl);

        const nombrePdf = crearNombreUnico(crearNombrePdfIndividual(certificado, estado, config), usados);
        zip.file(nombrePdf, doc.output("arraybuffer"));

        if ((i + 1) % 5 === 0 || i + 1 === certificados.length) {
          mostrarEstado(`Preparando ZIP: ${i + 1} de ${certificados.length} PDF(s)...`, "info");
          await esperar(50);
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
      mostrarEstado(error && error.message ? error.message : "No se pudo generar el ZIP de certificados.", "error");
    } finally {
      CONTROL.descargando = false;
      CONTROL.tipo = "";
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
      if (desdeResultado.length) return filtrarListos(desdeResultado);
    }

    if (window.CertiState && typeof window.CertiState.obtener === "function") {
      const actual = window.CertiState.obtener() || {};
      const desdeEstadoActual = obtenerCertificadosDesdeResultado(actual.resultado);
      if (desdeEstadoActual.length) return filtrarListos(desdeEstadoActual);
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

  function filtrarListos(lista) {
    return (lista || []).filter(function (item) {
      return !item.estadoCertificado || item.estadoCertificado === "listo";
    });
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
          tipoCertificado: TIPO_RECONOCIMIENTO,
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
      tipoCertificado: TIPO_RECONOCIMIENTO,
      nombre: item.nombre || item.estudiante || "",
      carrera: item.carrera || item.carreraOficial || item.carreraOriginal || "",
      promedio: item.promedio || item.nota || "",
      periodo,
      fecha: fechaLarga,
      fechaInput: estado.fechaCertificado,
      carreraCodigo: item.carreraCodigo || crearNombreArchivo(item.carrera || item.carreraOficial || item.carreraOriginal || "carrera")
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

  async function asegurarJSZip() {
    if (window.JSZip) return window.JSZip;

    await cargarScriptJSZip();

    if (!window.JSZip) {
      throw new Error("JSZip no quedó disponible para crear el archivo ZIP.");
    }

    return window.JSZip;
  }

  function cargarScriptJSZip() {
    return new Promise(function (resolve, reject) {
      if (window.JSZip) {
        resolve(window.JSZip);
        return;
      }

      const existente = document.querySelector('script[data-certi-jszip="1"]') || document.querySelector(`script[src="${JSZIP_CDN}"]`);

      if (existente && existente.dataset.certiJszipLoading === "1") {
        esperarScriptExistente(existente, resolve, reject);
        return;
      }

      if (existente && !window.JSZip) {
        existente.remove();
      }

      const script = document.createElement("script");
      let terminado = false;
      let timer = null;

      function limpiar() {
        terminado = true;
        clearTimeout(timer);
        script.dataset.certiJszipLoading = "0";
      }

      script.src = JSZIP_CDN;
      script.async = true;
      script.defer = true;
      script.dataset.certiJszip = "1";
      script.dataset.certiJszipLoading = "1";

      script.onload = function () {
        if (terminado) return;
        limpiar();

        if (window.JSZip) {
          script.dataset.certiJszipLoaded = "1";
          resolve(window.JSZip);
          return;
        }

        reject(new Error("JSZip se cargó, pero no quedó disponible."));
      };

      script.onerror = function () {
        if (terminado) return;
        limpiar();
        script.remove();
        reject(new Error("No se pudo cargar JSZip para crear el archivo ZIP. Revise la conexión a internet."));
      };

      timer = setTimeout(function () {
        if (terminado) return;
        limpiar();
        script.remove();
        reject(new Error("La carga de JSZip tardó demasiado. Recargue la pantalla e intente nuevamente."));
      }, JSZIP_TIMEOUT_MS);

      document.head.appendChild(script);
    });
  }

  function esperarScriptExistente(script, resolve, reject) {
    let terminado = false;
    let timer = null;

    function limpiar() {
      terminado = true;
      clearTimeout(timer);
    }

    if (window.JSZip) {
      resolve(window.JSZip);
      return;
    }

    script.addEventListener("load", function () {
      if (terminado) return;
      limpiar();
      if (window.JSZip) resolve(window.JSZip);
      else reject(new Error("JSZip se cargó, pero no quedó disponible."));
    }, { once: true });

    script.addEventListener("error", function () {
      if (terminado) return;
      limpiar();
      script.remove();
      reject(new Error("No se pudo cargar JSZip para crear el archivo ZIP."));
    }, { once: true });

    timer = setTimeout(function () {
      if (terminado) return;
      limpiar();
      script.remove();
      reject(new Error("La carga anterior de JSZip quedó inconclusa. Recargue la pantalla e intente nuevamente."));
    }, JSZIP_TIMEOUT_MS);
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
      let terminado = false;
      let timer = null;

      function cerrar(callback, valor) {
        if (terminado) return;
        terminado = true;
        clearTimeout(timer);
        callback(valor);
      }

      imagen.onload = function () {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = imagen.naturalWidth || imagen.width;
          canvas.height = imagen.naturalHeight || imagen.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(imagen, 0, 0);
          cerrar(resolve, canvas.toDataURL("image/png"));
        } catch (error) {
          cerrar(reject, error);
        }
      };

      imagen.onerror = function () {
        cerrar(reject, new Error("No se pudo cargar la imagen de plantilla."));
      };

      timer = setTimeout(function () {
        cerrar(reject, new Error("La plantilla tardó demasiado en cargar."));
      }, IMAGEN_TIMEOUT_MS);

      imagen.src = ruta;
    });
  }

  function descargarBlob(blob, nombreArchivo) {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombreArchivo;
    enlace.style.display = "none";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1800);
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

  function bloquearDescargas(bloquear, textos) {
    const btnUnico = document.getElementById("certiBtnPdfUnico");
    const btnIndividuales = document.getElementById("certiBtnPdfIndividuales");
    const cfg = textos || {};

    aplicarEstadoBoton(btnUnico, bloquear, cfg.pdf, "Descargar todos en un PDF");
    aplicarEstadoBoton(btnIndividuales, bloquear, cfg.zip, "Descargar todos como ZIP");
  }

  function aplicarEstadoBoton(boton, bloquear, textoTemporal, textoDefecto) {
    if (!boton) return;

    if (!boton.dataset.certiTextoOriginal) {
      boton.dataset.certiTextoOriginal = limpiarTexto(boton.textContent) || textoDefecto;
    }

    boton.disabled = Boolean(bloquear);

    if (bloquear) {
      boton.textContent = textoTemporal || "Espere...";
      return;
    }

    boton.textContent = boton.dataset.certiTextoOriginal || textoDefecto;
    delete boton.dataset.certiTextoOriginal;
  }

  function restablecerBotonesSiQuedaronAtorados() {
    const btnUnico = document.getElementById("certiBtnPdfUnico");
    const btnIndividuales = document.getElementById("certiBtnPdfIndividuales");

    if (btnUnico && /GENERANDO|ESPERE/i.test(btnUnico.textContent)) {
      btnUnico.textContent = "Descargar todos en un PDF";
    }

    if (btnIndividuales && /GENERANDO|ESPERE/i.test(btnIndividuales.textContent)) {
      btnIndividuales.textContent = "Descargar todos como ZIP";
    }
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
    descargarTodosComoZip,
    asegurarJSZip,
    restablecerBotonesSiQuedaronAtorados
  };
})();