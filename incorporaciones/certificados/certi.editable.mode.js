/* =========================================================
Nombre completo: certi.editable.mode.js
Ruta o ubicación: /incorporaciones/certificados/certi.editable.mode.js
Función o funciones:
- Mantener visibles únicamente las entradas correspondientes al tipo seleccionado.
- Restaurar correctamente Excel y texto al salir del modo editable.
- Reaplicar el modo después de cada actualización del estado central.
- Mejorar la lectura cuando hay líneas en blanco después de etiquetas.
- Interpretar texto libre escrito línea por línea aunque no tenga párrafos separados.
- Permitir que Invitaciones de incorporación trabaje con Excel o texto/tabla pegada.
- Convertir automáticamente tablas Markdown o tabuladas a un Excel temporal compatible con el motor existente.
- Soportar tablas pegadas con títulos intermedios y encabezados desplazados como Tabla 1, Tabla 2 y Tabla 3.
- Ejecutarse al final para resolver cambios realizados por controladores anteriores.
Con qué se une:
- certi.index.html
- certi.state.js
- certi.capacitacion.js
- certi.editable.logic.js
- certi.editable.js
- certi.tipos.js
- XLSX
========================================================= */
(function () {
  "use strict";

  const STORAGE_FUENTE_INVITACION = "certi.invitacion.fuente";
  const NOMBRE_EXCEL_TEXTO = "invitaciones_desde_texto.xlsx";

  let fuenteInvitacionPreferida = leerFuenteInvitacion();
  let ultimaFuenteInvitacion = "excel";
  let archivoExcelReal = null;
  let archivoTextoCache = null;
  let ultimoTextoCache = "";
  let asignandoArchivoInterno = false;
  let timerTexto = null;

  function iniciar() {
    const tipo = document.getElementById("certiTipoCertificado");
    const fuente = document.getElementById("certiFuenteDatos");

    mejorarLogicaEditable();
    prepararFuentesInvitacion();

    if (tipo && !tipo.dataset.certiEditableMode) {
      tipo.dataset.certiEditableMode = "1";
      tipo.addEventListener("change", function () {
        sincronizarTarde();
      });
    }

    if (fuente && !fuente.dataset.certiEditableMode) {
      fuente.dataset.certiEditableMode = "1";
      fuente.addEventListener("change", function () {
        if (esInvitacionActual()) {
          fuenteInvitacionPreferida = normalizarFuente(fuente.value);
          guardarFuenteInvitacion(fuenteInvitacionPreferida);
          sincronizarArchivoInvitacion(false);
        }
        sincronizarTarde();
      });
    }

    if (
      window.CertiState &&
      typeof window.CertiState.suscribir === "function" &&
      !window.__certiEditableModeSuscrito
    ) {
      window.__certiEditableModeSuscrito = true;
      window.CertiState.suscribir(function () {
        sincronizarTarde();
      });
    }

    sincronizar();
    setTimeout(sincronizar, 80);
  }

  function prepararFuentesInvitacion() {
    const tipo = document.getElementById("certiTipoCertificado");
    const excel = document.getElementById("certiExcelInput");
    const texto = document.getElementById("certiTextoInput");

    if (tipo && !tipo.dataset.certiInvFuentes) {
      tipo.dataset.certiInvFuentes = "1";
      tipo.addEventListener("change", function () {
        setTimeout(function () {
          sincronizar();
          if (esInvitacionActual()) sincronizarArchivoInvitacion(false);
        }, 90);
      });
    }

    if (excel && !excel.dataset.certiInvFuentes) {
      excel.dataset.certiInvFuentes = "1";
      excel.addEventListener("change", function () {
        if (!esInvitacionActual() || asignandoArchivoInterno) return;
        const file = obtenerArchivoInput(excel);
        if (file && !esArchivoDesdeTexto(file)) {
          archivoExcelReal = file;
          ultimaFuenteInvitacion = "excel";
        }
      });

      const inicial = obtenerArchivoInput(excel);
      if (inicial && !esArchivoDesdeTexto(inicial)) archivoExcelReal = inicial;
    }

    if (texto && !texto.dataset.certiInvFuentes) {
      texto.dataset.certiInvFuentes = "1";
      texto.addEventListener("input", function () {
        if (!esInvitacionActual()) return;
        ultimaFuenteInvitacion = "texto";
        clearTimeout(timerTexto);
        timerTexto = setTimeout(function () {
          sincronizarArchivoInvitacion(false);
        }, 120);
      });
    }

    if (!window.__certiInvFuentesClick) {
      window.__certiInvFuentesClick = true;
      window.addEventListener("click", function (evento) {
        if (!esInvitacionActual()) return;

        const procesar = evento.target && evento.target.closest
          ? evento.target.closest("#certiBtnProcesar")
          : null;
        const limpiar = evento.target && evento.target.closest
          ? evento.target.closest("#certiBtnLimpiar")
          : null;

        if (procesar) {
          try {
            sincronizarArchivoInvitacion(true);
          } catch (error) {
            limpiarArchivoTemporalDelInput();
            mostrarEstadoFuente(error.message || "No se pudo interpretar el texto de invitaciones.", "error");
          }
        }

        if (limpiar) {
          setTimeout(limpiarFuenteInvitacion, 0);
        }
      }, true);
    }
  }

  function mejorarLogicaEditable() {
    const Logic = window.CertiEditableLogic;
    if (!Logic || typeof Logic.parsearTexto !== "function" || Logic.__modoMejorado) return;

    const parsearOriginal = Logic.parsearTexto.bind(Logic);

    Logic.parsearTexto = function parsearTextoMejorado(texto, opciones) {
      let normalizado = String(texto == null ? "" : texto).replace(/\r\n?/g, "\n");

      normalizado = normalizado.replace(
        /^(\s*(?:T[IÍ]TULO|ENCABEZADO|INTRODUCCI[OÓ]N|NOMBRE|BENEFICIARIOS?|PARTICIPANTES?|TEXTO|CONTENIDO|TEXTO PRINCIPAL|DESTACADO|EVENTO|TEMA|CURSO|DETALLE|COMPLEMENTO|CIERRE|CIUDAD|LUGAR|FECHA|FIRMANTE(?:\s*[123])?|CARGO(?:\s*[123])?)\s*:[^\n]*)\n(?:\s*\n)+/gmi,
        "$1\n"
      );

      if (!/\n\s*\n/.test(normalizado) && !/^[^:\n]{2,45}\s*:/m.test(normalizado)) {
        const lineas = normalizado.split("\n").map(function (linea) {
          return linea.trim();
        }).filter(Boolean);

        if (lineas.length >= 4) {
          normalizado = lineas.join("\n\n");
        }
      }

      return parsearOriginal(normalizado, opciones);
    };

    Logic.__modoMejorado = true;
  }

  function sincronizarTarde() {
    sincronizar();
    setTimeout(sincronizar, 50);
    setTimeout(sincronizar, 100);
  }

  function sincronizar() {
    const tipo = document.getElementById("certiTipoCertificado");
    const fuente = document.getElementById("certiFuenteDatos");
    const bloqueExcel = document.getElementById("certiBloqueExcel");
    const bloqueTexto = document.getElementById("certiBloqueTexto");
    const panelEditable = document.getElementById("certiEditablePanel");
    const campoFuente = document.getElementById("certiFuenteField");
    const valorTipo = tipo ? tipo.value : "reconocimiento";

    if (valorTipo === "editable") {
      if (bloqueExcel) bloqueExcel.style.display = "";
      if (bloqueTexto) bloqueTexto.style.display = "none";
      if (panelEditable) panelEditable.classList.remove("certi-hidden");
      if (campoFuente) campoFuente.style.display = "none";
      ajustarEtiquetasEditable();
      return;
    }

    if (panelEditable) panelEditable.classList.add("certi-hidden");
    if (campoFuente) campoFuente.style.display = "";

    if (valorTipo === "capacitacion") {
      if (bloqueExcel) bloqueExcel.style.display = "";
      if (bloqueTexto) bloqueTexto.style.display = "none";
      return;
    }

    if (valorTipo === "invitacion") {
      if (fuente) {
        fuente.disabled = false;
        fuente.value = fuenteInvitacionPreferida;
      }

      const valorFuenteInv = fuenteInvitacionPreferida;
      if (bloqueExcel) bloqueExcel.style.display = valorFuenteInv === "texto" ? "none" : "";
      if (bloqueTexto) bloqueTexto.style.display = valorFuenteInv === "excel" ? "none" : "";

      ajustarEtiquetasInvitacion();
      return;
    }

    restaurarEtiquetasReconocimiento();

    const valorFuente = fuente ? fuente.value : "auto";
    if (bloqueExcel) bloqueExcel.style.display = valorFuente === "texto" ? "none" : "";
    if (bloqueTexto) bloqueTexto.style.display = valorFuente === "excel" ? "none" : "";
  }

  function ajustarEtiquetasEditable() {
    const labelExcel = document.querySelector("#certiBloqueExcel .certi-file-field span");
    const ayudaExcel = document.querySelector("#certiBloqueExcel .certi-help-text");
    const descripcion = document.querySelector(".certi-hero p:not(.certi-eyebrow)");
    const badge = document.querySelector(".certi-hero-badge strong");

    if (labelExcel) labelExcel.textContent = "Excel de certificados editables";
    if (ayudaExcel) {
      ayudaExcel.textContent = "Use la plantilla descargable: fila 1 encabezados, fila 2 instrucciones y fila 3 en adelante datos.";
    }
    if (descripcion) {
      descripcion.textContent = "Cargue la plantilla Excel o pegue texto libre; Certi ordenará la información antes de generar los certificados.";
    }
    if (badge) badge.textContent = "Excel + Texto editable";
  }

  function ajustarEtiquetasInvitacion() {
    const labelExcel = document.querySelector("#certiBloqueExcel .certi-file-field span");
    const ayudaExcel = document.querySelector("#certiBloqueExcel .certi-help-text");
    const labelTexto = document.querySelector("#certiBloqueTexto .certi-field > span");
    const texto = document.getElementById("certiTextoInput");
    const ayudaTexto = document.getElementById("certiTextoAyuda");
    const descripcionPanel = document.querySelector("#certiInvPanel h3 + p");
    const estadoSesiones = document.getElementById("certiInvSesionesEstado");

    if (labelExcel) labelExcel.textContent = "Excel de invitaciones de incorporación";
    if (ayudaExcel) ayudaExcel.textContent = "Puede cargar un Excel con Cargo/Actividad en la primera columna y una columna por sesión.";
    if (labelTexto) labelTexto.textContent = "Texto o tabla pegada de invitaciones";

    if (texto) {
      texto.placeholder = "Pegue una tabla desde Word, Excel o Markdown. Ejemplo:\nCargo | Lunes 9:00 a. m. | Lunes 2:00 p. m.\nMaestro de ceremonia | María Hernández | María Hernández\nMesa directiva 1 | Dr. León Tito |";
    }

    if (ayudaTexto) {
      ayudaTexto.innerHTML = "<strong>Formatos aceptados</strong><span>Tabla pegada con | o tabulaciones.</span><span>Puede incluir Tabla 1, Tabla 2, Tabla 3, filas vacías y encabezados repetidos.</span><span>La misma persona se consolida en una sola invitación.</span>";
      ayudaTexto.style.display = "";
    }

    if (descripcionPanel) {
      descripcionPanel.textContent = "Puede cargar un Excel o pegar directamente la tabla de organización. Certi detectará cargos, actividades, sesiones y personas.";
    }

    if (estadoSesiones && /Cargue el Excel/i.test(estadoSesiones.textContent || "")) {
      estadoSesiones.textContent = "Cargue un Excel o pegue una tabla para detectar las sesiones.";
    }
  }

  function restaurarEtiquetasReconocimiento() {
    const labelExcel = document.querySelector("#certiBloqueExcel .certi-file-field span");
    const labelTexto = document.querySelector("#certiBloqueTexto .certi-field > span");
    const texto = document.getElementById("certiTextoInput");
    const ayudaTexto = document.getElementById("certiTextoAyuda");

    if (labelExcel) labelExcel.textContent = "Excel de mejores egresados";
    if (labelTexto) labelTexto.textContent = "Texto pegado de mejores egresados";
    if (texto) texto.placeholder = "Pegue aquí datos como: Carrera | Estudiante | Promedio";

    if (ayudaTexto) {
      ayudaTexto.innerHTML = "<strong>Ejemplos aceptados</strong><span>Carrera | Estudiante | Promedio</span><span>Desarrollo de Software | Juan Pérez Zambrano | 9.85</span><span>Carrera: Administración / Carlos Ruiz Mera - 9.91</span>";
      ayudaTexto.style.display = "";
    }
  }

  function sincronizarArchivoInvitacion(lanzarError) {
    if (!esInvitacionActual()) return;

    const fuente = fuenteInvitacionPreferida;
    const textoInput = document.getElementById("certiTextoInput");
    const texto = textoInput ? String(textoInput.value || "").trim() : "";

    if (fuente === "excel") {
      ultimaFuenteInvitacion = "excel";
      restaurarArchivoExcelReal();
      return;
    }

    if (fuente === "texto") {
      ultimaFuenteInvitacion = "texto";
      if (!texto) {
        limpiarArchivoTemporalDelInput();
        if (lanzarError) throw new Error("Pegue la tabla de invitaciones en el bloque de texto.");
        return;
      }
      prepararExcelDesdeTexto(texto, lanzarError);
      return;
    }

    if (ultimaFuenteInvitacion === "texto" && texto) {
      prepararExcelDesdeTexto(texto, lanzarError);
      return;
    }

    if (archivoExcelReal) {
      restaurarArchivoExcelReal();
      return;
    }

    if (texto) {
      ultimaFuenteInvitacion = "texto";
      prepararExcelDesdeTexto(texto, lanzarError);
    }
  }

  function prepararExcelDesdeTexto(texto, lanzarError) {
    try {
      if (!window.XLSX) throw new Error("No está disponible XLSX para interpretar la tabla pegada.");

      if (archivoTextoCache && ultimoTextoCache === texto) {
        asignarArchivoAlInput(archivoTextoCache, true);
        return archivoTextoCache;
      }

      const matriz = convertirTextoAMatrizInvitaciones(texto);
      const hoja = window.XLSX.utils.aoa_to_sheet(matriz);
      const libro = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(libro, hoja, "Invitaciones");
      const bytes = window.XLSX.write(libro, { bookType: "xlsx", type: "array" });
      const archivo = new File(
        [bytes],
        NOMBRE_EXCEL_TEXTO,
        { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
      );

      archivoTextoCache = archivo;
      ultimoTextoCache = texto;
      asignarArchivoAlInput(archivo, true);
      mostrarEstadoFuente("Tabla pegada convertida correctamente. Ya puede procesar las invitaciones.", "success");
      return archivo;
    } catch (error) {
      limpiarArchivoTemporalDelInput();
      mostrarEstadoFuente(error.message || "No se pudo interpretar la tabla pegada.", "error");
      if (lanzarError) throw error;
      return null;
    }
  }

  function convertirTextoAMatrizInvitaciones(texto) {
    const filas = extraerFilasTexto(texto);
    if (!filas.length) throw new Error("No se detectó una tabla en el texto pegado.");

    const sesionesGlobales = [];
    const mapaSesiones = {};
    const registros = [];
    let cabeceraActual = null;

    filas.forEach(function (fila) {
      const cabecera = detectarCabeceraTabla(fila);

      if (cabecera) {
        cabeceraActual = cabecera;
        cabecera.sesiones.forEach(function (sesion) {
          if (!mapaSesiones[sesion.clave]) {
            mapaSesiones[sesion.clave] = {
              clave: sesion.clave,
              etiqueta: sesion.etiqueta
            };
            sesionesGlobales.push(mapaSesiones[sesion.clave]);
          }
        });
        return;
      }

      if (!cabeceraActual) return;

      const cargo = limpiarTexto(fila[cabeceraActual.columnaCargo]);
      if (!cargo || esTituloTabla(cargo)) return;

      const personas = {};
      let tienePersona = false;

      cabeceraActual.sesiones.forEach(function (sesion) {
        const persona = limpiarTexto(fila[sesion.columnaDato]);
        if (!persona) return;
        personas[sesion.clave] = persona;
        tienePersona = true;
      });

      if (tienePersona) registros.push({ cargo, personas });
    });

    if (!sesionesGlobales.length) {
      throw new Error("No se detectaron sesiones como Lunes 9:00 a. m. o Lunes 2:00 p. m.");
    }

    if (!registros.length) {
      throw new Error("Se detectaron encabezados, pero no participantes debajo de las sesiones.");
    }

    const salida = [["Cargo"].concat(sesionesGlobales.map(function (s) { return s.etiqueta; }))];

    registros.forEach(function (registro) {
      salida.push([registro.cargo].concat(sesionesGlobales.map(function (sesion) {
        return registro.personas[sesion.clave] || "";
      })));
    });

    return salida;
  }

  function extraerFilasTexto(texto) {
    return String(texto == null ? "" : texto)
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map(parsearLineaTabla)
      .filter(function (fila) {
        return Array.isArray(fila) && fila.some(function (celda) { return limpiarTexto(celda) !== ""; });
      });
  }

  function parsearLineaTabla(lineaEntrada) {
    let linea = String(lineaEntrada == null ? "" : lineaEntrada).trim();
    if (!linea) return null;

    let celdas;

    if (linea.includes("|")) {
      if (linea.startsWith("|")) linea = linea.slice(1);
      if (linea.endsWith("|")) linea = linea.slice(0, -1);
      celdas = linea.split("|").map(limpiarCeldaTabla);
    } else if (linea.includes("\t")) {
      celdas = linea.split("\t").map(limpiarCeldaTabla);
    } else {
      const partes = linea.split(/\s{3,}/).map(limpiarCeldaTabla);
      if (partes.length < 2) return null;
      celdas = partes;
    }

    if (esSeparadorMarkdown(celdas)) return null;
    return celdas;
  }

  function detectarCabeceraTabla(filaEntrada) {
    const fila = (filaEntrada || []).map(limpiarTexto);
    const indicesSesion = [];

    fila.forEach(function (celda, index) {
      if (pareceSesion(celda)) indicesSesion.push(index);
    });

    if (!indicesSesion.length) return null;

    let indiceMarcador = fila.findIndex(function (celda) {
      const k = claveTexto(celda);
      return /^(CARGO|ACTIVIDAD|FUNCION|ROL|INTERVENCION)$/.test(k);
    });

    if (indiceMarcador < 0) {
      indiceMarcador = Math.max(0, indicesSesion[0] - 1);
    }

    let desplazamiento = 0;
    if (
      indiceMarcador > 0 &&
      fila.slice(0, indiceMarcador).every(function (celda) { return !limpiarTexto(celda); })
    ) {
      desplazamiento = indiceMarcador;
    }

    const columnaCargo = Math.max(0, indiceMarcador - desplazamiento);
    const sesiones = indicesSesion.map(function (indice) {
      const etiqueta = limpiarTexto(fila[indice]);
      return {
        clave: claveSesion(etiqueta),
        etiqueta,
        columnaDato: Math.max(0, indice - desplazamiento)
      };
    }).filter(function (sesion) {
      return sesion.clave && sesion.columnaDato !== columnaCargo;
    });

    if (!sesiones.length) return null;
    return { columnaCargo, sesiones };
  }

  function pareceSesion(valor) {
    const k = claveTexto(valor);
    return /\b(LUNES|MARTES|MIERCOLES|JUEVES|VIERNES|SABADO|DOMINGO)\b/.test(k) ||
      /\b\d{1,2}\s*\d{0,2}\s*(AM|PM|A M|P M)\b/.test(k) ||
      /\b\d{1,2}\s+\d{2}\b/.test(k);
  }

  function claveSesion(valor) {
    return claveTexto(valor)
      .replace(/\bA M\b/g, "AM")
      .replace(/\bP M\b/g, "PM")
      .replace(/\s+/g, "_");
  }

  function esTituloTabla(valor) {
    const k = claveTexto(valor);
    return /^TABLA\s*\d+/.test(k) || /^ORGANIZACION DE/.test(k);
  }

  function esSeparadorMarkdown(celdas) {
    const noVacias = (celdas || []).map(function (c) { return String(c || "").trim(); }).filter(Boolean);
    return noVacias.length > 0 && noVacias.every(function (celda) {
      return /^:?-{3,}:?$/.test(celda);
    });
  }

  function limpiarCeldaTabla(valor) {
    return limpiarTexto(String(valor == null ? "" : valor)
      .replace(/\*\*/g, "")
      .replace(/<br\s*\/?>/gi, "\n"));
  }

  function restaurarArchivoExcelReal() {
    const input = document.getElementById("certiExcelInput");
    if (!input) return;

    const actual = obtenerArchivoInput(input);
    if (actual && !esArchivoDesdeTexto(actual)) {
      archivoExcelReal = actual;
      return;
    }

    if (archivoExcelReal) {
      asignarArchivoAlInput(archivoExcelReal, false);
    } else if (actual && esArchivoDesdeTexto(actual)) {
      input.value = "";
    }
  }

  function asignarArchivoAlInput(file, esTexto) {
    const input = document.getElementById("certiExcelInput");
    if (!input || !file) return;

    const actual = obtenerArchivoInput(input);
    if (actual === file || (actual && actual.name === file.name && actual.size === file.size && esTexto)) return;

    if (typeof DataTransfer === "undefined") {
      throw new Error("El navegador no permite preparar el archivo temporal desde texto.");
    }

    const dt = new DataTransfer();
    dt.items.add(file);

    asignandoArchivoInterno = true;
    try {
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } finally {
      asignandoArchivoInterno = false;
    }
  }

  function limpiarArchivoTemporalDelInput() {
    const input = document.getElementById("certiExcelInput");
    if (!input) return;
    const actual = obtenerArchivoInput(input);
    if (actual && esArchivoDesdeTexto(actual)) input.value = "";
  }

  function limpiarFuenteInvitacion() {
    const texto = document.getElementById("certiTextoInput");
    if (texto) texto.value = "";
    archivoTextoCache = null;
    ultimoTextoCache = "";
    archivoExcelReal = null;
    ultimaFuenteInvitacion = "excel";
    const estadoSesiones = document.getElementById("certiInvSesionesEstado");
    if (estadoSesiones) estadoSesiones.textContent = "Cargue un Excel o pegue una tabla para detectar las sesiones.";
  }

  function obtenerArchivoInput(input) {
    return input && input.files && input.files[0] ? input.files[0] : null;
  }

  function esArchivoDesdeTexto(file) {
    return Boolean(file && file.name === NOMBRE_EXCEL_TEXTO);
  }

  function esInvitacionActual() {
    const tipo = document.getElementById("certiTipoCertificado");
    return Boolean(tipo && tipo.value === "invitacion");
  }

  function normalizarFuente(valor) {
    const v = String(valor || "").toLowerCase();
    if (v === "excel" || v === "texto") return v;
    return "auto";
  }

  function leerFuenteInvitacion() {
    try {
      return normalizarFuente(localStorage.getItem(STORAGE_FUENTE_INVITACION) || "auto");
    } catch (error) {
      return "auto";
    }
  }

  function guardarFuenteInvitacion(valor) {
    try {
      localStorage.setItem(STORAGE_FUENTE_INVITACION, normalizarFuente(valor));
    } catch (error) {}
  }

  function mostrarEstadoFuente(mensaje, tipo) {
    let estado = document.getElementById("certiProcesarEstado");
    if (!estado) {
      const acciones = document.querySelector(".certi-actions");
      if (!acciones) return;
      estado = document.createElement("div");
      estado.id = "certiProcesarEstado";
      acciones.appendChild(estado);
    }

    estado.textContent = mensaje;
    estado.className = `certi-process-status certi-process-status-${tipo || "info"}`;
  }

  function limpiarTexto(valor) {
    return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim();
  }

  function claveTexto(valor) {
    return limpiarTexto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9Ññ ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }

  window.CertiEditableMode = {
    sincronizar,
    mejorarLogicaEditable,
    convertirTextoAMatrizInvitaciones,
    sincronizarArchivoInvitacion
  };
})();
