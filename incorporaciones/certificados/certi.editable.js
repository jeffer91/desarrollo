/* =========================================================
Nombre completo: certi.editable.js
Ruta o ubicación: /incorporaciones/certificados/certi.editable.js
Función o funciones:
- Controlar el tercer tipo "Certificado editable desde texto".
- Mostrar el panel de texto libre y ocultar Excel/fuentes cuando corresponda.
- Ordenar automáticamente texto libre o etiquetado en campos editables.
- Crear uno o varios certificados desde beneficiarios y bloques separados por ---.
- Renderizar resumen, alertas y tabla del flujo editable.
- Interceptar PDF único, ZIP y descarga individual para usar la plantilla editable.
Con qué se une:
- certi.index.html
- certi.tipos.js
- certi.editable.logic.js
- certi.editable.template.js
- certi.state.js
- jsPDF
- JSZip
========================================================= */
(function () {
  "use strict";

  const TIPO_EDITABLE = "editable";
  const VERSION = "2026-07-14-editable-v1";
  const IMAGEN_TIMEOUT_MS = 12000;
  const estadoLocal = {
    bloques: [],
    textoOrdenado: "",
    procesando: false,
    descargando: false
  };

  registrarInterceptores();
  iniciarInterfaz();

  function registrarInterceptores() {
    document.addEventListener("click", function (evento) {
      if (!esTipoEditableActual()) return;

      const btnProcesar = evento.target.closest("#certiBtnProcesar");
      const btnLimpiar = evento.target.closest("#certiBtnLimpiar");
      const btnOrdenar = evento.target.closest("#certiEditableOrdenar");
      const btnAgregar = evento.target.closest("#certiEditableAgregar");
      const btnEliminar = evento.target.closest("[data-certi-editable-eliminar]");
      const btnPdf = evento.target.closest("#certiBtnPdfUnico");
      const btnZip = evento.target.closest("#certiBtnPdfIndividuales");
      const btnUno = evento.target.closest("[data-certi-descargar-uno]");

      if (!btnProcesar && !btnLimpiar && !btnOrdenar && !btnAgregar && !btnEliminar && !btnPdf && !btnZip && !btnUno) {
        return;
      }

      evento.preventDefault();
      evento.stopImmediatePropagation();

      if (btnProcesar) procesarEditable();
      else if (btnLimpiar) limpiarEditable();
      else if (btnOrdenar) ordenarTextoDesdeDom(true);
      else if (btnAgregar) agregarBloqueManual();
      else if (btnEliminar) eliminarBloque(btnEliminar);
      else if (btnPdf) descargarPdfUnico();
      else if (btnZip) descargarZip();
      else if (btnUno) descargarIndividual(Number(btnUno.dataset.certiResultadoIndex));
    }, true);
  }

  function iniciarInterfaz() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", inicializar);
      return;
    }

    inicializar();
  }

  function inicializar() {
    const selector = document.getElementById("certiTipoCertificado");
    if (selector && !selector.dataset.certiEditableEnlazado) {
      selector.dataset.certiEditableEnlazado = "1";
      selector.addEventListener("change", function () {
        setTimeout(actualizarInterfazPorTipo, 0);
      });
    }

    actualizarInterfazPorTipo();
    setTimeout(actualizarInterfazPorTipo, 0);
    console.info("[CertiEditable] Activo:", VERSION);
  }

  function actualizarInterfazPorTipo() {
    const editable = esTipoEditableActual();
    const panel = document.getElementById("certiEditablePanel");
    const bloqueExcel = document.getElementById("certiBloqueExcel");
    const bloqueTexto = document.getElementById("certiBloqueTexto");
    const fuenteField = document.getElementById("certiFuenteField");
    const btnProcesar = document.getElementById("certiBtnProcesar");
    const descripcion = document.querySelector(".certi-hero p:not(.certi-eyebrow)");
    const badge = document.querySelector(".certi-hero-badge strong");
    const subtitulo = document.querySelector(".certi-panel-title p");

    if (!editable) {
      if (panel) panel.classList.add("certi-hidden");
      if (fuenteField) fuenteField.style.display = "";
      if (btnProcesar) btnProcesar.textContent = "Procesar datos";

      if (window.CertiCapacitacion && typeof window.CertiCapacitacion.actualizarInterfazPorTipo === "function") {
        window.CertiCapacitacion.actualizarInterfazPorTipo();
      }

      return;
    }

    if (panel) panel.classList.remove("certi-hidden");
    if (bloqueExcel) bloqueExcel.style.display = "none";
    if (bloqueTexto) bloqueTexto.style.display = "none";
    if (fuenteField) fuenteField.style.display = "none";
    if (btnProcesar) btnProcesar.textContent = "Ordenar y procesar";
    if (descripcion) descripcion.textContent = "Pegue texto libre o etiquetado y Certi lo ordenará automáticamente antes de generar los certificados.";
    if (badge) badge.textContent = "Texto editable";
    if (subtitulo) subtitulo.textContent = "Seleccione período y fecha; luego pegue el contenido que desea convertir en uno o varios certificados.";

    ocultarPanelesAcademicos();
    asegurarBloqueInicial();
  }

  function asegurarBloqueInicial() {
    const estructura = document.getElementById("certiEditableEstructura");
    const texto = document.getElementById("certiEditableTexto");
    if (!estructura || estructura.children.length || (texto && texto.value.trim())) return;

    estadoLocal.bloques = [];
    estructura.innerHTML = "";
  }

  function ordenarTextoDesdeDom(mostrarMensaje) {
    const textarea = document.getElementById("certiEditableTexto");
    const texto = textarea ? textarea.value || "" : "";

    if (!texto.trim()) {
      mostrarEstadoEditable("Pegue el texto del certificado antes de ordenarlo.", "warning");
      return [];
    }

    const Logic = window.CertiEditableLogic;
    if (!Logic || typeof Logic.parsearTexto !== "function") {
      mostrarEstadoEditable("No está disponible el organizador de texto editable.", "danger");
      return [];
    }

    const bloques = Logic.parsearTexto(texto, obtenerContextoBase());
    estadoLocal.bloques = bloques;
    estadoLocal.textoOrdenado = texto;
    renderizarEstructura(bloques);

    if (mostrarMensaje !== false) {
      const beneficiarios = contarBeneficiarios(bloques);
      mostrarEstadoEditable(
        `Texto ordenado: ${bloques.length} bloque(s) y ${beneficiarios} beneficiario(s) detectado(s). Revise los campos antes de procesar.`,
        "success"
      );
    }

    return bloques;
  }

  function agregarBloqueManual() {
    const bloques = recogerBloquesDesdeTarjetas();
    bloques.push(crearBloqueVacio(bloques.length));
    estadoLocal.bloques = bloques;
    renderizarEstructura(bloques);
    mostrarEstadoEditable("Se agregó un nuevo bloque editable.", "info");
  }

  function eliminarBloque(boton) {
    const tarjeta = boton.closest(".certi-editable-card");
    if (!tarjeta) return;

    tarjeta.remove();
    const bloques = recogerBloquesDesdeTarjetas();
    estadoLocal.bloques = bloques;
    renumerarTarjetas();
    mostrarEstadoEditable("Bloque eliminado.", "info");
  }

  async function procesarEditable() {
    if (estadoLocal.procesando) return;
    estadoLocal.procesando = true;

    try {
      bloquearProcesar(true);
      mostrarEstadoProceso("Ordenando texto y preparando certificados editables...", "info");

      const textarea = document.getElementById("certiEditableTexto");
      const textoActual = textarea ? textarea.value || "" : "";
      let bloques = recogerBloquesDesdeTarjetas();

      if (!bloques.length || (textoActual.trim() && textoActual !== estadoLocal.textoOrdenado)) {
        bloques = ordenarTextoDesdeDom(false);
      }

      if (!bloques.length) {
        throw new Error("No existen bloques editables para procesar.");
      }

      const Logic = window.CertiEditableLogic;
      const contexto = obtenerContextoBase();
      const resultado = Logic.crearResultado(bloques, contexto);

      if (resultado.errores && resultado.errores.length) {
        throw new Error(resultado.errores[0]);
      }

      guardarEnEstado(resultado, bloques, textoActual);
      renderizarResultado(resultado);
      mostrarEstadoProceso(
        `Procesamiento terminado: ${resultado.resumen.certificadosListos} certificado(s) editable(s) listo(s).`,
        "success"
      );
    } catch (error) {
      const mensaje = error && error.message ? error.message : "No se pudo procesar el texto editable.";
      renderizarError(mensaje);
      mostrarEstadoProceso(mensaje, "error");
    } finally {
      estadoLocal.procesando = false;
      bloquearProcesar(false);
    }
  }

  function guardarEnEstado(resultado, bloques, textoOriginal) {
    const lectura = {
      nombreArchivo: "Texto editable",
      hoja: "Texto editable",
      hojasLeidas: ["Texto editable"],
      totalFilas: bloques.length,
      registros: resultado.certificados.slice(),
      alertas: resultado.alertas.slice(),
      origen: TIPO_EDITABLE,
      fuente: "texto_editable"
    };

    if (!window.CertiState) return;

    if (typeof window.CertiState.establecerTextoPegado === "function") {
      window.CertiState.establecerTextoPegado(textoOriginal || "");
    }
    if (typeof window.CertiState.establecerFuenteDatos === "function") {
      window.CertiState.establecerFuenteDatos("texto");
    }
    if (typeof window.CertiState.establecerLecturaDatos === "function") {
      window.CertiState.establecerLecturaDatos(lectura);
    }
    if (typeof window.CertiState.establecerRegistros === "function") {
      window.CertiState.establecerRegistros(resultado.certificados);
    }
    if (typeof window.CertiState.establecerOrigenDatos === "function") {
      window.CertiState.establecerOrigenDatos(TIPO_EDITABLE, "Texto editable");
    }
    if (typeof window.CertiState.establecerResultado === "function") {
      window.CertiState.establecerResultado(resultado);
    }
  }

  function renderizarResultado(resultado) {
    renderizarResumen(resultado);
    renderizarAlertas(resultado.alertas || []);
    renderizarTabla(resultado.certificados || []);
    habilitarDescargas((resultado.certificados || []).length > 0);
    ocultarPanelesAcademicos();
  }

  function renderizarResumen(resultado) {
    const contenedor = document.getElementById("certiResumenCards");
    if (!contenedor) return;

    const resumen = resultado.resumen || {};
    contenedor.innerHTML = `
      <article class="certi-summary-card">
        <span>Textos analizados</span>
        <strong>${escapar(resumen.bloquesAnalizados || 0)}</strong>
      </article>
      <article class="certi-summary-card">
        <span>Beneficiarios detectados</span>
        <strong>${escapar(resumen.beneficiariosDetectados || 0)}</strong>
      </article>
      <article class="certi-summary-card">
        <span>Certificados listos</span>
        <strong>${escapar(resumen.certificadosListos || 0)}</strong>
      </article>
      <article class="certi-summary-card">
        <span>Alertas</span>
        <strong>${escapar(resumen.alertas || 0)}</strong>
      </article>
    `;
  }

  function renderizarAlertas(alertas) {
    const contenedor = document.getElementById("certiAlertas");
    if (!contenedor) return;

    contenedor.innerHTML = (alertas || []).map(function (alerta) {
      const tipo = normalizarTipoAlerta(alerta.tipo);
      return `
        <div class="certi-alert certi-alert-${tipo}">
          <strong>${escapar(alerta.titulo || "Aviso")}</strong>
          ${escapar(alerta.mensaje || "")}
        </div>
      `;
    }).join("");
  }

  function renderizarTabla(certificados) {
    const tbody = document.getElementById("certiTablaBody");
    const thead = document.querySelector(".certi-table thead tr");
    if (!tbody || !thead) return;

    thead.innerHTML = `
      <th>Tipo</th>
      <th>Beneficiario</th>
      <th>Título</th>
      <th>Firmante principal</th>
      <th>Estado</th>
    `;

    if (!certificados.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="certi-empty">No existen certificados editables listos.</td></tr>`;
      return;
    }

    tbody.innerHTML = certificados.map(function (item) {
      const firmante = item.firmantes && item.firmantes[0] ? item.firmantes[0].nombre : "Sin firma";
      return `
        <tr>
          <td>Editable</td>
          <td>${escapar(item.beneficiario || item.nombre || "")}</td>
          <td>${escapar(item.titulo || "CERTIFICADO")}</td>
          <td>${escapar(firmante)}</td>
          <td><span class="certi-status certi-status-ok">Listo</span></td>
        </tr>
      `;
    }).join("");
  }

  function renderizarError(mensaje) {
    renderizarAlertas([{ tipo: "danger", titulo: "Error", mensaje }]);
    habilitarDescargas(false);
  }

  function renderizarEstructura(bloques) {
    const contenedor = document.getElementById("certiEditableEstructura");
    if (!contenedor) return;

    contenedor.innerHTML = (bloques || []).map(function (bloque, index) {
      return crearTarjetaHtml(bloque, index);
    }).join("");
  }

  function crearTarjetaHtml(bloque, index) {
    const firmantes = normalizarFirmantesParaTarjeta(bloque.firmantes);
    return `
      <article class="certi-editable-card" data-certi-editable-card="${index}">
        <div class="certi-editable-card-header">
          <strong>Bloque ${index + 1}</strong>
          <button type="button" class="certi-btn certi-btn-ghost" data-certi-editable-eliminar="1">Eliminar</button>
        </div>
        <div class="certi-editable-grid">
          ${campoInput("Título", "titulo", bloque.titulo, true)}
          ${campoTextarea("Beneficiarios — uno por línea", "beneficiarios", (bloque.beneficiarios || []).join("\n"), true)}
          ${campoTextarea("Introducción o encabezado", "introduccion", bloque.introduccion, true)}
          ${campoTextarea("Texto principal", "textoPrincipal", bloque.textoPrincipal, true)}
          ${campoTextarea("Texto destacado, evento o tema", "destacado", bloque.destacado, true)}
          ${campoTextarea("Texto complementario", "complemento", bloque.complemento, true)}
          ${campoTextarea("Cierre", "cierre", bloque.cierre, true)}
          ${campoInput("Ciudad", "ciudad", bloque.ciudad, false)}
          ${campoInput("Fecha visible", "fecha", bloque.fecha, false)}
          <div class="certi-editable-signatures">
            ${firmantes.map(function (firmante, firmaIndex) {
              return `
                <div class="certi-editable-signature">
                  <span>Firma ${firmaIndex + 1}</span>
                  <input type="text" data-certi-editable-firmante-nombre="${firmaIndex}" value="${escaparAtributo(firmante.nombre)}" placeholder="Nombre del firmante" />
                  <input type="text" data-certi-editable-firmante-cargo="${firmaIndex}" value="${escaparAtributo(firmante.cargo)}" placeholder="Cargo" />
                </div>
              `;
            }).join("")}
          </div>
        </div>
      </article>
    `;
  }

  function campoInput(etiqueta, campo, valor, anchoCompleto) {
    return `
      <label class="certi-field ${anchoCompleto ? "certi-field-wide" : ""}">
        <span>${escapar(etiqueta)}</span>
        <input type="text" data-certi-editable-campo="${campo}" value="${escaparAtributo(valor || "")}" />
      </label>
    `;
  }

  function campoTextarea(etiqueta, campo, valor, anchoCompleto) {
    return `
      <label class="certi-field ${anchoCompleto ? "certi-field-wide" : ""}">
        <span>${escapar(etiqueta)}</span>
        <textarea data-certi-editable-campo="${campo}">${escapar(valor || "")}</textarea>
      </label>
    `;
  }

  function recogerBloquesDesdeTarjetas() {
    return Array.from(document.querySelectorAll(".certi-editable-card")).map(function (tarjeta, index) {
      const obtener = function (campo) {
        const elemento = tarjeta.querySelector(`[data-certi-editable-campo="${campo}"]`);
        return elemento ? elemento.value || "" : "";
      };
      const firmantes = [0, 1, 2].map(function (firmaIndex) {
        const nombre = tarjeta.querySelector(`[data-certi-editable-firmante-nombre="${firmaIndex}"]`);
        const cargo = tarjeta.querySelector(`[data-certi-editable-firmante-cargo="${firmaIndex}"]`);
        return {
          nombre: nombre ? nombre.value || "" : "",
          cargo: cargo ? cargo.value || "" : ""
        };
      }).filter(function (item) {
        return item.nombre.trim() || item.cargo.trim();
      });

      return {
        id: `editable_bloque_${index}`,
        titulo: obtener("titulo"),
        beneficiarios: obtener("beneficiarios").split(/\n|;/).map(limpiar).filter(Boolean),
        introduccion: obtener("introduccion"),
        textoPrincipal: obtener("textoPrincipal"),
        destacado: obtener("destacado"),
        complemento: obtener("complemento"),
        cierre: obtener("cierre"),
        ciudad: obtener("ciudad"),
        fecha: obtener("fecha"),
        firmantes
      };
    });
  }

  function crearBloqueVacio(index) {
    const contexto = obtenerContextoBase();
    return {
      id: `editable_bloque_${index}`,
      titulo: "CERTIFICADO",
      beneficiarios: [],
      introduccion: "El Instituto Superior Tecnológico Quito Metropolitano otorga el presente certificado a:",
      textoPrincipal: "",
      destacado: "",
      complemento: "",
      cierre: "",
      ciudad: contexto.ciudad,
      fecha: contexto.fecha,
      firmantes: [{ nombre: "Dr. León Tito", cargo: "RECTOR" }]
    };
  }

  function normalizarFirmantesParaTarjeta(lista) {
    const salida = (Array.isArray(lista) ? lista : []).slice(0, 3).map(function (item) {
      return { nombre: limpiar(item && item.nombre), cargo: limpiar(item && item.cargo) };
    });
    while (salida.length < 3) salida.push({ nombre: "", cargo: "" });
    return salida;
  }

  async function descargarPdfUnico() {
    if (estadoLocal.descargando) return;
    estadoLocal.descargando = true;

    try {
      const certificados = obtenerCertificadosListos();
      if (!certificados.length) throw new Error("Primero debe procesar el texto editable.");

      bloquearDescargas(true, "Generando PDF...", "Espere...");
      mostrarEstadoProceso("Generando PDF único editable...", "info");

      const jsPDF = obtenerJsPdf();
      const plantilla = await cargarPlantilla(obtenerConfigEditable().plantilla);
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      for (let i = 0; i < certificados.length; i += 1) {
        if (i > 0) doc.addPage();
        await window.CertiEditableTemplate.dibujarCertificado(doc, certificados[i], { plantillaDataUrl: plantilla });
      }

      doc.save(crearNombreArchivoGeneral("pdf"));
      mostrarEstadoProceso(`PDF generado con ${certificados.length} certificado(s) editable(s).`, "success");
    } catch (error) {
      mostrarEstadoProceso(error.message || "No se pudo generar el PDF editable.", "error");
    } finally {
      estadoLocal.descargando = false;
      bloquearDescargas(false);
    }
  }

  async function descargarZip() {
    if (estadoLocal.descargando) return;
    estadoLocal.descargando = true;

    try {
      const certificados = obtenerCertificadosListos();
      if (!certificados.length) throw new Error("Primero debe procesar el texto editable.");
      if (!window.JSZip) throw new Error("No está disponible JSZip para crear el archivo ZIP.");

      bloquearDescargas(true, "Espere...", "Generando ZIP...");
      mostrarEstadoProceso("Generando certificados editables individuales...", "info");

      const jsPDF = obtenerJsPdf();
      const plantilla = await cargarPlantilla(obtenerConfigEditable().plantilla);
      const zip = new window.JSZip();
      const usados = Object.create(null);

      for (let i = 0; i < certificados.length; i += 1) {
        const certificado = certificados[i];
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        await window.CertiEditableTemplate.dibujarCertificado(doc, certificado, { plantillaDataUrl: plantilla });
        const nombre = nombreIndividualUnico(certificado, usados);
        zip.file(nombre, doc.output("arraybuffer"));
      }

      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });
      descargarBlob(blob, crearNombreArchivoGeneral("zip"));
      mostrarEstadoProceso(`ZIP generado con ${certificados.length} certificado(s) editable(s).`, "success");
    } catch (error) {
      mostrarEstadoProceso(error.message || "No se pudo generar el ZIP editable.", "error");
    } finally {
      estadoLocal.descargando = false;
      bloquearDescargas(false);
    }
  }

  async function descargarIndividual(indice) {
    if (estadoLocal.descargando) return;
    estadoLocal.descargando = true;

    try {
      const certificados = obtenerCertificadosListos();
      const certificado = certificados[indice];
      if (!certificado) throw new Error("No se encontró el certificado editable seleccionado.");

      mostrarEstadoProceso("Generando certificado editable individual...", "info");
      const jsPDF = obtenerJsPdf();
      const plantilla = await cargarPlantilla(obtenerConfigEditable().plantilla);
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      await window.CertiEditableTemplate.dibujarCertificado(doc, certificado, { plantillaDataUrl: plantilla });
      doc.save(crearNombreIndividual(certificado));
      mostrarEstadoProceso("Certificado editable individual generado correctamente.", "success");
    } catch (error) {
      mostrarEstadoProceso(error.message || "No se pudo generar el certificado editable.", "error");
    } finally {
      estadoLocal.descargando = false;
    }
  }

  function obtenerCertificadosListos() {
    const estado = window.CertiState && typeof window.CertiState.obtener === "function"
      ? window.CertiState.obtener() || {}
      : {};
    const resultado = estado.resultado || {};
    const lista = Array.isArray(resultado.certificados) ? resultado.certificados : [];
    return lista.filter(function (item) {
      return item && item.tipoCertificado === TIPO_EDITABLE && (!item.estadoCertificado || item.estadoCertificado === "listo");
    });
  }

  function obtenerContextoBase() {
    const periodo = document.getElementById("certiPeriodo");
    const fechaInput = document.getElementById("certiFechaCertificado");
    const option = periodo && periodo.options[periodo.selectedIndex] ? periodo.options[periodo.selectedIndex] : null;
    const fechaValor = fechaInput ? fechaInput.value || "" : "";
    return {
      periodoSeleccionado: periodo ? periodo.value || "" : "",
      periodoTexto: option ? option.textContent || option.value || "" : "",
      fechaCertificado: fechaValor,
      fecha: formatearFechaLarga(fechaValor),
      fechaLarga: formatearFechaLarga(fechaValor),
      ciudad: "Quito"
    };
  }

  function obtenerConfigEditable() {
    if (window.CertiTipos && typeof window.CertiTipos.obtenerConfig === "function") {
      return window.CertiTipos.obtenerConfig(TIPO_EDITABLE) || {};
    }
    return {
      plantilla: "./assets/certi-plantilla-certificado.png",
      pdfUnicoPrefijo: "Certificados_Editables",
      pdfZipPrefijo: "Certificados_Editables_ZIP",
      pdfIndividualPrefijo: "Certificado_Editable"
    };
  }

  function limpiarEditable() {
    const textarea = document.getElementById("certiEditableTexto");
    const estructura = document.getElementById("certiEditableEstructura");
    if (textarea) textarea.value = "";
    if (estructura) estructura.innerHTML = "";
    estadoLocal.bloques = [];
    estadoLocal.textoOrdenado = "";

    if (window.CertiState && typeof window.CertiState.limpiarResultados === "function") {
      window.CertiState.limpiarResultados();
    }

    renderizarResumen({ resumen: {} });
    renderizarAlertas([]);
    renderizarTabla([]);
    habilitarDescargas(false);
    mostrarEstadoEditable("Contenido editable limpiado.", "info");
    mostrarEstadoProceso("Pantalla limpiada.", "info");
  }

  function ocultarPanelesAcademicos() {
    ["certiCarrerasPanel", "certiEmpatesPanel"].forEach(function (id) {
      const elemento = document.getElementById(id);
      if (elemento) elemento.classList.add("certi-hidden");
    });
  }

  function esTipoEditableActual() {
    const selector = document.getElementById("certiTipoCertificado");
    return Boolean(selector && selector.value === TIPO_EDITABLE);
  }

  function contarBeneficiarios(bloques) {
    return (bloques || []).reduce(function (total, bloque) {
      return total + (Array.isArray(bloque.beneficiarios) ? bloque.beneficiarios.length : 0);
    }, 0);
  }

  function renumerarTarjetas() {
    Array.from(document.querySelectorAll(".certi-editable-card")).forEach(function (tarjeta, index) {
      tarjeta.dataset.certiEditableCard = String(index);
      const titulo = tarjeta.querySelector(".certi-editable-card-header strong");
      if (titulo) titulo.textContent = `Bloque ${index + 1}`;
    });
  }

  function mostrarEstadoEditable(mensaje, tipo) {
    const elemento = document.getElementById("certiEditableEstado");
    if (!elemento) return;
    elemento.textContent = mensaje || "";
    elemento.className = `certi-editable-status certi-alert-${normalizarTipoAlerta(tipo)}`;
  }

  function mostrarEstadoProceso(mensaje, tipo) {
    let elemento = document.getElementById("certiProcesarEstado");
    if (!elemento) {
      const acciones = document.querySelector(".certi-actions");
      if (!acciones) return;
      elemento = document.createElement("div");
      elemento.id = "certiProcesarEstado";
      acciones.appendChild(elemento);
    }
    elemento.textContent = mensaje || "";
    elemento.className = `certi-process-status certi-process-status-${tipo || "info"}`;
  }

  function bloquearProcesar(bloquear) {
    const boton = document.getElementById("certiBtnProcesar");
    if (!boton) return;
    boton.disabled = Boolean(bloquear);
    boton.textContent = bloquear ? "Procesando..." : "Ordenar y procesar";
  }

  function habilitarDescargas(habilitar) {
    const pdf = document.getElementById("certiBtnPdfUnico");
    const zip = document.getElementById("certiBtnPdfIndividuales");
    if (pdf) pdf.disabled = !habilitar;
    if (zip) zip.disabled = !habilitar;
  }

  function bloquearDescargas(bloquear, textoPdf, textoZip) {
    const pdf = document.getElementById("certiBtnPdfUnico");
    const zip = document.getElementById("certiBtnPdfIndividuales");
    if (pdf) {
      pdf.disabled = Boolean(bloquear);
      pdf.textContent = bloquear ? (textoPdf || "Generando...") : "Descargar todos en un PDF";
    }
    if (zip) {
      zip.disabled = Boolean(bloquear);
      zip.textContent = bloquear ? (textoZip || "Generando...") : "Descargar todos como ZIP";
    }
  }

  function obtenerJsPdf() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("No se encontró la librería jsPDF.");
    }
    if (!window.CertiEditableTemplate || typeof window.CertiEditableTemplate.dibujarCertificado !== "function") {
      throw new Error("No está disponible la plantilla de certificado editable.");
    }
    return window.jspdf.jsPDF;
  }

  function cargarPlantilla(ruta) {
    if (!ruta) return Promise.resolve("");

    return new Promise(function (resolve) {
      const imagen = new Image();
      let finalizado = false;
      const cerrar = function (valor) {
        if (finalizado) return;
        finalizado = true;
        clearTimeout(timer);
        resolve(valor || "");
      };
      const timer = setTimeout(function () { cerrar(""); }, IMAGEN_TIMEOUT_MS);

      imagen.onload = function () {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = imagen.naturalWidth || imagen.width;
          canvas.height = imagen.naturalHeight || imagen.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(imagen, 0, 0);
          cerrar(canvas.toDataURL("image/png"));
        } catch (_error) {
          cerrar("");
        }
      };
      imagen.onerror = function () { cerrar(""); };
      imagen.src = ruta;
    });
  }

  function crearNombreArchivoGeneral(extension) {
    const config = obtenerConfigEditable();
    const contexto = obtenerContextoBase();
    const prefijo = extension === "zip"
      ? (config.pdfZipPrefijo || "Certificados_Editables_ZIP")
      : (config.pdfUnicoPrefijo || "Certificados_Editables");
    const periodo = nombreArchivoSeguro(contexto.periodoTexto || contexto.periodoSeleccionado || "periodo");
    const fecha = (contexto.fechaCertificado || "fecha").replace(/-/g, "");
    return `${prefijo}_${periodo}_${fecha}.${extension}`;
  }

  function crearNombreIndividual(certificado) {
    const config = obtenerConfigEditable();
    const titulo = nombreArchivoSeguro(certificado.titulo || "certificado");
    const nombre = nombreArchivoSeguro(certificado.beneficiario || certificado.nombre || "beneficiario");
    return `${config.pdfIndividualPrefijo || "Certificado_Editable"}_${titulo}_${nombre}.pdf`;
  }

  function nombreIndividualUnico(certificado, usados) {
    const base = crearNombreIndividual(certificado);
    if (!usados[base]) {
      usados[base] = 1;
      return base;
    }
    usados[base] += 1;
    return base.replace(/\.pdf$/i, `_${usados[base]}.pdf`);
  }

  function descargarBlob(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    enlace.style.display = "none";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function formatearFechaLarga(fecha) {
    if (!fecha) return "";
    if (window.CertiUtils && typeof window.CertiUtils.formatearFechaLarga === "function") {
      return window.CertiUtils.formatearFechaLarga(fecha);
    }
    const partes = String(fecha).split("-");
    if (partes.length !== 3) return fecha;
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return `${Number(partes[2])} de ${meses[Number(partes[1]) - 1] || partes[1]} de ${partes[0]}`;
  }

  function nombreArchivoSeguro(valor) {
    return limpiar(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase() || "certificado";
  }

  function normalizarTipoAlerta(tipo) {
    const valor = String(tipo || "info").toLowerCase();
    if (valor === "danger" || valor === "error") return "danger";
    if (valor === "warning" || valor === "warn") return "warning";
    if (valor === "success") return "success";
    return "info";
  }

  function limpiar(valor) {
    return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim();
  }

  function escapar(valor) {
    return String(valor == null ? "" : valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escaparAtributo(valor) {
    return escapar(valor).replace(/\n/g, "&#10;");
  }

  window.CertiEditable = {
    VERSION,
    actualizarInterfazPorTipo,
    ordenarTextoDesdeDom,
    procesarEditable,
    recogerBloquesDesdeTarjetas,
    descargarPdfUnico,
    descargarZip,
    descargarIndividual
  };
})();
