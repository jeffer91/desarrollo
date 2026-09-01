/*
=========================================================
Nombre completo: certi.plantillas.excel.js
Ruta o ubicación: /incorporaciones/certificados/certi.plantillas.excel.js
Función o funciones:
- Descargar una plantilla Excel distinta para cada tipo de certificado.
- Mantener la fila 1 como encabezados y la fila 2 como instrucciones.
- Leer nuevamente la plantilla del certificado editable.
- Centralizar los encabezados oficiales de las plantillas descargables.
Con qué se une:
- certi.index.html
- certi.excel.js
- certi.capacitacion.excel.js
- certi.editable.js
- certi.tipos.js
- XLSX
=========================================================
*/

(function () {
  "use strict";

  const TIPO_RECONOCIMIENTO = "reconocimiento";
  const TIPO_CAPACITACION = "capacitacion";
  const TIPO_EDITABLE = "editable";
  const TIPO_INVITACION = "invitacion";

  const DEFINICIONES = {
    reconocimiento: {
      nombre: "Reconocimiento a mejores egresados",
      archivo: "Plantilla_Reconocimiento_Mejores_Egresados.xlsx",
      hoja: "Reconocimiento",
      encabezados: ["CARRERA", "NOMBRE", "PROMEDIO"],
      explicaciones: [
        "INSTRUCCIÓN: escriba el nombre oficial de la carrera del estudiante.",
        "INSTRUCCIÓN: escriba los nombres y apellidos completos del egresado.",
        "INSTRUCCIÓN: ingrese el promedio final. Ejemplo: 9.85."
      ],
      anchos: [42, 42, 18]
    },

    capacitacion: {
      nombre: "Certificados de capacitación docente",
      archivo: "Plantilla_Capacitacion_Docente.xlsx",
      hoja: "Capacitacion",
      encabezados: ["CARGO", "CÉDULA", "NOMBRE", "CAPACITACIÓN", "CAPACITADOR", "CALIFICACIÓN", "HORAS", "FECHA"],
      explicaciones: [
        "INSTRUCCIÓN: cargo o función del participante.",
        "INSTRUCCIÓN: número de cédula o identificación.",
        "INSTRUCCIÓN: nombres y apellidos completos del participante.",
        "INSTRUCCIÓN: nombre completo de la capacitación, curso o programa.",
        "INSTRUCCIÓN: nombre completo de quien impartió la capacitación.",
        "INSTRUCCIÓN: calificación final sobre 10. Ejemplo: 9.50.",
        "INSTRUCCIÓN: número total de horas académicas.",
        "INSTRUCCIÓN: fecha de la capacitación. Puede usar dd/mm/aaaa."
      ],
      anchos: [24, 18, 38, 48, 38, 20, 14, 22]
    },

    editable: {
      nombre: "Certificado editable",
      archivo: "Plantilla_Certificado_Editable.xlsx",
      hoja: "Certificado editable",
      encabezados: [
        "TÍTULO", "BENEFICIARIO", "INTRODUCCIÓN", "TEXTO PRINCIPAL", "DESTACADO",
        "COMPLEMENTO", "CIERRE", "CIUDAD", "FECHA",
        "FIRMANTE 1", "CARGO 1", "FIRMANTE 2", "CARGO 2", "FIRMANTE 3", "CARGO 3"
      ],
      explicaciones: [
        "INSTRUCCIÓN: título visible del certificado. Ejemplo: CERTIFICADO DE RECONOCIMIENTO.",
        "INSTRUCCIÓN: nombre completo del beneficiario. Para varios en el mismo certificado sepárelos con punto y coma.",
        "INSTRUCCIÓN: texto inicial o encabezado del certificado.",
        "INSTRUCCIÓN: contenido principal. Este campo o la introducción/cierre debe contener texto.",
        "INSTRUCCIÓN: texto, evento, curso o tema que desea resaltar. Es opcional.",
        "INSTRUCCIÓN: información adicional. Es opcional.",
        "INSTRUCCIÓN: texto final del certificado. Es opcional.",
        "INSTRUCCIÓN: ciudad de emisión. Si se deja vacío se usará Quito.",
        "INSTRUCCIÓN: fecha visible. Si se deja vacío se usará la fecha seleccionada en Certi.",
        "INSTRUCCIÓN: nombre del primer firmante. Es opcional.",
        "INSTRUCCIÓN: cargo del primer firmante.",
        "INSTRUCCIÓN: nombre del segundo firmante. Es opcional.",
        "INSTRUCCIÓN: cargo del segundo firmante.",
        "INSTRUCCIÓN: nombre del tercer firmante. Es opcional.",
        "INSTRUCCIÓN: cargo del tercer firmante."
      ],
      anchos: [34, 40, 54, 66, 44, 48, 54, 20, 26, 34, 30, 34, 30, 34, 30]
    },

    invitacion: {
      nombre: "Invitaciones de incorporación",
      archivo: "Plantilla_Invitaciones_Incorporacion.xlsx",
      hoja: "Invitaciones",
      encabezados: ["CARGO", "Lunes 9 am", "Lunes 2 pm", "Martes 9 am", "Martes 2 pm"],
      explicaciones: [
        "INSTRUCCIÓN: escriba el cargo, actividad o función que cumplirá la persona en la ceremonia.",
        "INSTRUCCIÓN: escriba el nombre completo de la persona asignada a esta sesión. Para varias personas sepárelas con punto y coma.",
        "INSTRUCCIÓN: escriba el nombre completo de la persona asignada a esta sesión. Para varias personas sepárelas con punto y coma.",
        "INSTRUCCIÓN: escriba el nombre completo de la persona asignada a esta sesión. Para varias personas sepárelas con punto y coma.",
        "INSTRUCCIÓN: escriba el nombre completo de la persona asignada a esta sesión. Para varias personas sepárelas con punto y coma."
      ],
      anchos: [42, 38, 38, 38, 38]
    }
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
    const boton = document.getElementById("certiBtnDescargarPlantillaExcel");
    const selector = document.getElementById("certiTipoCertificado");

    if (boton && !boton.dataset.certiPlantillaExcel) {
      boton.dataset.certiPlantillaExcel = "1";
      boton.addEventListener("click", function () {
        descargar(obtenerTipoActual());
      });
    }

    if (selector && !selector.dataset.certiPlantillaExcel) {
      selector.dataset.certiPlantillaExcel = "1";
      selector.addEventListener("change", function () {
        setTimeout(actualizarInterfaz, 0);
      });
    }

    actualizarInterfaz();
  }

  function actualizarInterfaz() {
    const tipo = obtenerTipoActual();
    const definicion = obtenerDefinicion(tipo);
    const boton = document.getElementById("certiBtnDescargarPlantillaExcel");
    const ayuda = document.getElementById("certiPlantillaExcelAyuda");

    if (boton) {
      boton.textContent = "Descargar plantilla Excel";
      boton.title = "Descargar " + definicion.archivo;
    }

    if (ayuda) {
      ayuda.textContent =
        "Plantilla para " + definicion.nombre +
        ": fila 1 = encabezados, fila 2 = explicación y fila 3 en adelante = datos.";
    }
  }

  function descargar(tipo) {
    if (!window.XLSX || !window.XLSX.utils) {
      mostrarEstado("No está disponible la librería XLSX para crear la plantilla.", "error");
      return;
    }

    const definicion = obtenerDefinicion(tipo);
    const filas = [
      definicion.encabezados.slice(),
      definicion.explicaciones.slice(),
      definicion.encabezados.map(function () { return ""; })
    ];

    const hoja = window.XLSX.utils.aoa_to_sheet(filas);
    hoja["!cols"] = definicion.anchos.map(function (ancho) {
      return { wch: ancho };
    });

    if (window.XLSX.utils.encode_range) {
      hoja["!autofilter"] = {
        ref: window.XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: 0, c: definicion.encabezados.length - 1 }
        })
      };
    }

    const libro = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(libro, hoja, definicion.hoja);
    window.XLSX.writeFile(libro, definicion.archivo);

    mostrarEstado("Plantilla Excel descargada: " + definicion.archivo, "success");
  }

  async function leerEditable(file, contexto) {
    if (!file) {
      throw new Error("Cargue el Excel del certificado editable.");
    }

    if (!window.XLSX || !window.XLSX.utils) {
      throw new Error("No está disponible XLSX para leer el Excel editable.");
    }

    const libro = window.XLSX.read(await file.arrayBuffer(), {
      type: "array",
      cellDates: false,
      cellNF: false,
      cellText: false
    });

    if (!libro.SheetNames || !libro.SheetNames.length) {
      throw new Error("El Excel editable no contiene hojas.");
    }

    const hoja = libro.Sheets[libro.SheetNames[0]];
    const matriz = window.XLSX.utils.sheet_to_json(hoja, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false
    });

    const indiceEncabezado = detectarEncabezadoEditable(matriz);
    if (indiceEncabezado < 0) {
      throw new Error("No se encontró la cabecera de la plantilla editable. Descargue una plantilla nueva desde Certi.");
    }

    const encabezados = (matriz[indiceEncabezado] || []).map(clave);
    const bloques = [];

    for (let i = indiceEncabezado + 1; i < matriz.length; i += 1) {
      const fila = Array.isArray(matriz[i]) ? matriz[i] : [];
      if (!fila.some(function (valor) { return limpiar(valor); })) continue;
      if (esFilaExplicacion(fila)) continue;

      const objeto = {};
      encabezados.forEach(function (encabezado, index) {
        if (!encabezado) return;
        objeto[encabezado] = fila[index] == null ? "" : fila[index];
      });

      const bloque = crearBloqueEditable(objeto, contexto || {}, bloques.length);
      if (!bloque.beneficiarios.length && !tieneContenidoEditable(bloque)) continue;
      bloques.push(bloque);
    }

    if (!bloques.length) {
      throw new Error("El Excel editable no contiene datos. Complete la fila 3 en adelante.");
    }

    return bloques;
  }

  function detectarEncabezadoEditable(matriz) {
    const limite = Math.min((matriz || []).length, 30);

    for (let i = 0; i < limite; i += 1) {
      const encabezados = (matriz[i] || []).map(clave);
      const tieneBeneficiario = encabezados.some(function (x) {
        return x === "BENEFICIARIO" || x === "BENEFICIARIOS" || x === "NOMBRE" || x === "PARTICIPANTE";
      });
      const tieneContenido = encabezados.some(function (x) {
        return x === "TEXTO PRINCIPAL" || x === "TEXTO" || x === "INTRODUCCION" || x === "CIERRE" || x === "TITULO";
      });

      if (tieneBeneficiario && tieneContenido) return i;
    }

    return -1;
  }

  function crearBloqueEditable(fila, contexto, index) {
    const beneficiarios = separarBeneficiarios(
      valorFila(fila, ["BENEFICIARIO", "BENEFICIARIOS", "NOMBRE", "PARTICIPANTE", "PARTICIPANTES"])
    );

    const firmantes = [1, 2, 3].map(function (numero) {
      return {
        nombre: limpiar(valorFila(fila, ["FIRMANTE " + numero, "FIRMANTE_" + numero])),
        cargo: limpiar(valorFila(fila, ["CARGO " + numero, "CARGO_" + numero]))
      };
    }).filter(function (item) {
      return item.nombre || item.cargo;
    });

    return {
      id: "editable_excel_" + index,
      titulo: limpiar(valorFila(fila, ["TITULO"])) || "CERTIFICADO",
      beneficiarios: beneficiarios,
      introduccion: limpiar(valorFila(fila, ["INTRODUCCION", "ENCABEZADO"])),
      textoPrincipal: limpiar(valorFila(fila, ["TEXTO PRINCIPAL", "TEXTO", "CONTENIDO"])),
      destacado: limpiar(valorFila(fila, ["DESTACADO", "EVENTO", "TEMA", "CURSO"])),
      complemento: limpiar(valorFila(fila, ["COMPLEMENTO", "DETALLE", "TEXTO COMPLEMENTARIO"])),
      cierre: limpiar(valorFila(fila, ["CIERRE", "MENSAJE FINAL"])),
      ciudad: limpiar(valorFila(fila, ["CIUDAD", "LUGAR"])) || limpiar(contexto.ciudad) || "Quito",
      fecha: limpiar(valorFila(fila, ["FECHA"])) || limpiar(contexto.fecha || contexto.fechaLarga || contexto.fechaCertificado),
      firmantes: firmantes,
      textoOriginal: "Excel editable - fila " + (index + 3)
    };
  }

  function valorFila(fila, candidatos) {
    const claves = Object.keys(fila || {});
    for (let i = 0; i < candidatos.length; i += 1) {
      const candidato = clave(candidatos[i]);
      const encontrada = claves.find(function (key) {
        return clave(key) === candidato;
      });
      if (encontrada !== undefined) return fila[encontrada];
    }
    return "";
  }

  function tieneContenidoEditable(bloque) {
    return Boolean(
      limpiar(bloque.titulo) ||
      limpiar(bloque.introduccion) ||
      limpiar(bloque.textoPrincipal) ||
      limpiar(bloque.destacado) ||
      limpiar(bloque.complemento) ||
      limpiar(bloque.cierre)
    );
  }

  function separarBeneficiarios(valor) {
    return String(valor == null ? "" : valor)
      .split(/\n|;/)
      .map(limpiar)
      .filter(Boolean);
  }

  function esFilaExplicacion(fila) {
    const valores = (fila || []).map(limpiar).filter(Boolean);
    if (!valores.length) return false;

    const instrucciones = valores.filter(function (valor) {
      return /^INSTRUCCI[ÓO]N\s*:/i.test(valor) || /^EXPLICACI[ÓO]N\s*:/i.test(valor);
    });

    return instrucciones.length >= Math.max(1, Math.ceil(valores.length * 0.5));
  }

  function obtenerTipoActual() {
    const selector = document.getElementById("certiTipoCertificado");
    const valor = selector ? selector.value : TIPO_RECONOCIMIENTO;
    return DEFINICIONES[valor] ? valor : TIPO_RECONOCIMIENTO;
  }

  function obtenerDefinicion(tipo) {
    return DEFINICIONES[tipo] || DEFINICIONES[TIPO_RECONOCIMIENTO];
  }

  function clave(valor) {
    return limpiar(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[_-]+/g, " ")
      .replace(/[^A-Za-z0-9Ññ ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function limpiar(valor) {
    return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim();
  }

  function mostrarEstado(mensaje, tipo) {
    let elemento = document.getElementById("certiProcesarEstado");
    if (!elemento) {
      const acciones = document.querySelector(".certi-actions");
      if (!acciones) return;
      elemento = document.createElement("div");
      elemento.id = "certiProcesarEstado";
      acciones.appendChild(elemento);
    }

    elemento.textContent = mensaje || "";
    elemento.className = "certi-process-status certi-process-status-" + (tipo || "info");
  }

  window.CertiPlantillasExcel = {
    TIPO_RECONOCIMIENTO,
    TIPO_CAPACITACION,
    TIPO_EDITABLE,
    TIPO_INVITACION,
    DEFINICIONES,
    descargar,
    obtenerDefinicion,
    leerEditable,
    esFilaExplicacion,
    actualizarInterfaz
  };
})();
