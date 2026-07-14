/* =========================================================
Nombre completo: certi.capacitadores.js
Ruta o ubicación: /incorporaciones/certificados/certi.capacitadores.js
Función o funciones:
- Generar un certificado adicional por cada combinación única de capacitador y capacitación.
- Evitar certificados duplicados cuando el mismo capacitador aparece en varias filas del Excel.
- Diferenciar certificados de participantes y certificados de capacitadores.
- Dibujar los certificados de capacitadores con texto propio y únicamente la firma del Rector.
- Mantener intactos los certificados actuales de participantes y sus tres firmantes.
- Integrarse con PDF único, ZIP y descarga individual sin cambiar sus controladores.
Con qué se une:
- certi.index.html
- certi.capacitacion.logic.js
- certi.capacitacion.template.js
- certi.firmantes.js
- certi.template.smart.js
- certi.utils.js
========================================================= */
(function () {
  "use strict";

  const VERSION = "2026-07-14-capacitadores-rector";
  const TIPO_CAPACITACION = "capacitacion";
  const ROL_PARTICIPANTE = "participante";
  const ROL_CAPACITADOR = "capacitador";

  iniciar();

  function iniciar() {
    parchearFirmantes();
    parchearLogicaCapacitacion();
    parchearPlantillaCapacitacion();

    console.info("[CertiCapacitadores] Activo:", VERSION);
  }

  function parchearFirmantes() {
    const Firmantes = window.CertiFirmantes;
    if (!Firmantes || Firmantes.__capacitadoresAplicado) return;

    Firmantes.obtenerSoloRector = function obtenerSoloRector() {
      const rector = typeof Firmantes.obtener === "function"
        ? Firmantes.obtener("rector")
        : null;

      return [normalizarFirmante(rector || {
        id: "rector",
        nombre: "Dr. León Tito",
        cargo: "RECTOR"
      })];
    };

    Firmantes.__capacitadoresAplicado = true;
  }

  function parchearLogicaCapacitacion() {
    const Logic = window.CertiCapacitacionLogic;
    if (!Logic || Logic.__capacitadoresAplicado) return;

    const procesarOriginal = Logic.procesar.bind(Logic);
    const prepararOriginal = Logic.prepararCertificados.bind(Logic);

    Logic.procesar = function procesarConCapacitadores(registros) {
      const resultadoBase = procesarOriginal(registros) || {};
      const participantesBase = obtenerParticipantesValidos(resultadoBase);
      const participantes = participantesBase.map(marcarParticipante);
      const capacitadores = crearCertificadosCapacitadores(participantesBase);
      const certificados = ordenarCertificados(participantes.concat(capacitadores));
      const alertas = agregarAlertaCapacitadores(resultadoBase.alertas, capacitadores.length);
      const resumenBase = resultadoBase.resumen || {};

      return Object.assign({}, resultadoBase, {
        registrosValidos: participantes,
        mejores: certificados,
        certificados,
        alertas,
        resumen: Object.assign({}, resumenBase, {
          certificadosListos: certificados.length,
          participantesListos: participantes.length,
          capacitadoresListos: capacitadores.length,
          alertas: alertas.length
        })
      });
    };

    Logic.prepararCertificados = function prepararConCapacitadores(estado) {
      const preparado = prepararOriginal(estado);

      if (!preparado || !preparado.valido || !Array.isArray(preparado.certificados)) {
        return preparado;
      }

      const fuentes = estado && estado.resultado && Array.isArray(estado.resultado.mejores)
        ? estado.resultado.mejores.filter(function (item) {
            return !item.estadoCertificado || item.estadoCertificado === "listo";
          })
        : [];

      const certificados = preparado.certificados.map(function (certificado, index) {
        const fuente = fuentes[index] || {};

        if (!esCertificadoCapacitador(fuente)) {
          return Object.assign({}, certificado, {
            rolCertificado: ROL_PARTICIPANTE,
            esCertificadoCapacitador: false
          });
        }

        return Object.assign({}, certificado, {
          tipoCertificado: TIPO_CAPACITACION,
          rolCertificado: ROL_CAPACITADOR,
          esCertificadoCapacitador: true,
          cargo: "Capacitador",
          cedula: "",
          nombre: fuente.nombre || fuente.docente || certificado.nombre || "",
          docente: fuente.docente || fuente.nombre || certificado.docente || certificado.nombre || "",
          curso: fuente.curso || fuente.tema || certificado.curso || certificado.tema || "",
          tema: fuente.tema || fuente.curso || certificado.tema || certificado.curso || "",
          capacitador: "",
          nota: "",
          promedio: "",
          firmantes: obtenerSoloRector()
        });
      });

      return Object.assign({}, preparado, { certificados });
    };

    Logic.esCertificadoCapacitador = esCertificadoCapacitador;
    Logic.ROL_PARTICIPANTE = ROL_PARTICIPANTE;
    Logic.ROL_CAPACITADOR = ROL_CAPACITADOR;
    Logic.__capacitadoresAplicado = true;
  }

  function obtenerParticipantesValidos(resultado) {
    if (Array.isArray(resultado.registrosValidos)) {
      return resultado.registrosValidos.slice();
    }

    if (Array.isArray(resultado.mejores)) {
      return resultado.mejores.slice();
    }

    if (Array.isArray(resultado.certificados)) {
      return resultado.certificados.slice();
    }

    return [];
  }

  function marcarParticipante(item) {
    return Object.assign({}, item || {}, {
      tipoCertificado: TIPO_CAPACITACION,
      rolCertificado: ROL_PARTICIPANTE,
      esCertificadoCapacitador: false
    });
  }

  function crearCertificadosCapacitadores(participantes) {
    const mapa = Object.create(null);
    const certificados = [];
    const tipoConfig = obtenerConfigTipo();

    (participantes || []).forEach(function (item, index) {
      const nombre = limpiarNombreCapacitador(item && item.capacitador);
      const curso = limpiarTexto(item && (item.curso || item.tema || item.carreraOficial || item.carreraOriginal));

      if (!nombre || !curso) return;

      const clave = crearClaveUnica(nombre, curso);
      if (!clave || mapa[clave]) return;
      mapa[clave] = true;

      const horas = limpiarTexto(item && item.horas) || String(tipoConfig.horasDefecto || 40);

      certificados.push({
        tipoCertificado: TIPO_CAPACITACION,
        rolCertificado: ROL_CAPACITADOR,
        esCertificadoCapacitador: true,
        indice: `capacitador_${index}_${crearNombreArchivo(nombre)}_${crearNombreArchivo(curso)}`,
        filaExcel: item && item.filaExcel ? item.filaExcel : "",
        hojaExcel: item && item.hojaExcel ? item.hojaExcel : "",
        cargo: "Capacitador",
        cedula: "",
        nombre,
        docente: nombre,
        curso,
        tema: curso,
        capacitador: "",
        nombreCapacitador: nombre,
        nota: null,
        notaOriginal: "",
        promedio: null,
        promedioOriginal: "",
        horas,
        fechaCurso: item && item.fechaCurso ? item.fechaCurso : "",
        carreraOriginal: curso,
        carreraOficial: curso,
        carreraCodigo: `${crearNombreArchivo(curso)}_capacitador`,
        estadoCertificado: "listo",
        requiereAccion: false,
        origen: "capacitador_generado",
        firmantes: obtenerSoloRector()
      });
    });

    return certificados;
  }

  function ordenarCertificados(lista) {
    return (lista || []).slice().sort(function (a, b) {
      const porCurso = limpiarTexto(a && (a.curso || a.tema)).localeCompare(
        limpiarTexto(b && (b.curso || b.tema)),
        "es"
      );

      if (porCurso !== 0) return porCurso;

      const rolA = esCertificadoCapacitador(a) ? 1 : 0;
      const rolB = esCertificadoCapacitador(b) ? 1 : 0;
      if (rolA !== rolB) return rolA - rolB;

      return limpiarTexto(a && (a.docente || a.nombre)).localeCompare(
        limpiarTexto(b && (b.docente || b.nombre)),
        "es"
      );
    });
  }

  function agregarAlertaCapacitadores(alertasOriginales, total) {
    const alertas = (Array.isArray(alertasOriginales) ? alertasOriginales : [])
      .filter(function (alerta) {
        return limpiarTexto(alerta && alerta.titulo) !== "Certificados para capacitadores";
      });

    if (total > 0) {
      alertas.push({
        tipo: "success",
        titulo: "Certificados para capacitadores",
        mensaje: `${total} certificado(s) adicional(es) de capacitador fueron generados con firma exclusiva del Rector.`
      });
    }

    return alertas;
  }

  function parchearPlantillaCapacitacion() {
    const Template = window.CertiCapacitacionTemplate;
    if (!Template || Template.__capacitadoresAplicado) return;

    const dibujarOriginal = Template.dibujarCertificado.bind(Template);

    Template.dibujarCertificado = async function dibujarSegunRol(doc, certificado, opciones) {
      if (!esCertificadoCapacitador(certificado)) {
        return dibujarOriginal(doc, certificado, opciones || {});
      }

      return dibujarCertificadoCapacitador(doc, certificado, opciones || {});
    };

    Template.__capacitadoresAplicado = true;
  }

  async function dibujarCertificadoCapacitador(doc, certificado, opciones) {
    const config = window.CertiConfig || {};
    const pdfConfig = config.pdf || {};
    const ancho = numero(pdfConfig.ancho, 297);
    const alto = numero(pdfConfig.alto, 210);
    const plantillaDataUrl = opciones.plantillaDataUrl || "";
    const layout = await obtenerLayoutVisual(plantillaDataUrl, ancho, alto);

    dibujarFondo(doc, plantillaDataUrl, ancho, alto);
    dibujarContenidoCapacitador(doc, certificado, config, ancho, layout);
    dibujarFirmaRector(doc, ancho, layout);
  }

  async function obtenerLayoutVisual(plantillaDataUrl, ancho, alto) {
    const Smart = window.CertiTemplateSmart;

    if (Smart && typeof Smart.analizarPlantilla === "function") {
      return Smart.analizarPlantilla("capacitacion", plantillaDataUrl, ancho, alto);
    }

    return {
      origen: "respaldo_capacitador",
      zonas: {
        contenido: { x: 30, y: 54, w: 237, h: 96, centroX: ancho / 2 },
        firmas: { x: 22, y: 162, w: 253, h: 34 },
        firmaBoxes: [
          { x: 36, y: 162, w: 62, h: 24, centroX: 67 },
          { x: 118, y: 162, w: 62, h: 24, centroX: 149 },
          { x: 199, y: 162, w: 62, h: 24, centroX: 230 }
        ]
      }
    };
  }

  function dibujarFondo(doc, plantillaDataUrl, ancho, alto) {
    if (plantillaDataUrl) {
      try {
        doc.addImage(plantillaDataUrl, "PNG", 0, 0, ancho, alto);
        return;
      } catch (error) {
        console.warn("[CertiCapacitadores] No se pudo colocar la plantilla:", error);
      }
    }

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, ancho, alto, "F");

    doc.setDrawColor(13, 71, 161);
    doc.setLineWidth(1.2);
    doc.rect(10, 10, ancho - 20, alto - 20);

    doc.setDrawColor(196, 155, 57);
    doc.setLineWidth(0.45);
    doc.rect(16, 16, ancho - 32, alto - 32);
  }

  function dibujarContenidoCapacitador(doc, certificado, config, ancho, layout) {
    const Smart = window.CertiTemplateSmart;
    const nombre = limpiarNombreCapacitador(certificado.nombre || certificado.docente).toUpperCase();
    const curso = limpiarTexto(certificado.curso || certificado.tema).toUpperCase();
    const horas = limpiarTexto(certificado.horas) || "40";
    const periodo = limpiarTexto(certificado.periodo || "");
    const ciudad = limpiarTexto(config.ciudad) || "Quito";
    const fecha = obtenerFechaVisible(certificado);
    const zonaContenido = layout && layout.zonas && layout.zonas.contenido
      ? normalizarZona(layout.zonas.contenido, ancho)
      : { x: 30, y: 54, w: 237, h: 96, centroX: ancho / 2 };

    const bloques = [
      {
        texto: "El Instituto Superior Tecnológico Quito Metropolitano otorga el presente certificado a:",
        font: "times",
        style: "normal",
        size: 11.6,
        minSize: 9.2,
        lineHeight: 5,
        minLineHeight: 3.8,
        color: [20, 20, 20],
        gapAfter: 4.8,
        minGapAfter: 1.5
      },
      {
        texto: nombre,
        font: "times",
        style: "bold",
        size: calcularTamanoNombre(nombre),
        minSize: 12.6,
        lineHeight: 6.4,
        minLineHeight: 4.7,
        color: [6, 25, 65],
        gapAfter: 8.5,
        minGapAfter: 4,
        lineAfter: {
          width: Math.min(176, zonaContenido.w * 0.74),
          offset: 4.1,
          color: [7, 29, 76],
          lineWidth: 0.45,
          secondary: {
            width: Math.min(116, zonaContenido.w * 0.49),
            offset: 5.5,
            color: [196, 155, 57],
            lineWidth: 0.18
          }
        }
      },
      {
        texto: "por su valiosa participación como capacitador del programa de capacitación denominado:",
        font: "times",
        style: "normal",
        size: 10.9,
        minSize: 8.6,
        lineHeight: 4.8,
        minLineHeight: 3.5,
        color: [20, 20, 20],
        gapAfter: 4.6,
        minGapAfter: 1.4
      },
      {
        texto: curso,
        font: "times",
        style: "bold",
        size: calcularTamanoCurso(curso),
        minSize: 8.6,
        lineHeight: 5.4,
        minLineHeight: 3.5,
        color: [6, 25, 65],
        gapAfter: 4.8,
        minGapAfter: 1.2
      },
      {
        texto: `impartido durante el período ${periodo}, con una duración total de ${horas} horas académicas.`,
        font: "times",
        style: "normal",
        size: 10.2,
        minSize: 8.2,
        lineHeight: 4.6,
        minLineHeight: 3.4,
        color: [20, 20, 20],
        gapAfter: 4.2,
        minGapAfter: 1.2
      },
      {
        texto: "En reconocimiento a su aporte profesional, compromiso y contribución al fortalecimiento académico de la comunidad educativa.",
        font: "times",
        style: "normal",
        size: 10.1,
        minSize: 8,
        lineHeight: 4.5,
        minLineHeight: 3.3,
        color: [20, 20, 20],
        gapAfter: 4.2,
        minGapAfter: 1.1
      },
      {
        texto: `${ciudad}, ${fecha}.`,
        font: "times",
        style: "normal",
        size: 10.1,
        minSize: 8,
        lineHeight: 4.3,
        minLineHeight: 3.2,
        color: [80, 80, 80],
        gapAfter: 0
      }
    ];

    if (Smart && typeof Smart.prepararBloques === "function" && typeof Smart.dibujarBloques === "function") {
      const layoutTexto = Smart.prepararBloques(doc, bloques, zonaContenido.w, zonaContenido.h);
      Smart.dibujarBloques(doc, layoutTexto.bloques, zonaContenido, { align: "center" });
      return;
    }

    dibujarBloquesBasicos(doc, bloques, zonaContenido);
  }

  function dibujarBloquesBasicos(doc, bloques, zona) {
    let y = zona.y;

    (bloques || []).forEach(function (bloque) {
      const color = Array.isArray(bloque.color) ? bloque.color : [20, 20, 20];
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont(bloque.font || "times", bloque.style || "normal");
      doc.setFontSize(numero(bloque.size, 10));

      const lineas = doc.splitTextToSize(bloque.texto || "", zona.w);
      lineas.forEach(function (linea, index) {
        doc.text(String(linea || ""), zona.centroX, y + index * numero(bloque.lineHeight, 4.8), {
          align: "center"
        });
      });

      y += Math.max(1, lineas.length) * numero(bloque.lineHeight, 4.8) + numero(bloque.gapAfter, 0);
    });
  }

  function dibujarFirmaRector(doc, ancho, layout) {
    const rector = obtenerSoloRector()[0] || { nombre: "Dr. León Tito", cargo: "RECTOR" };
    const centroX = ancho / 2;
    const yFirma = obtenerYFirma(layout);
    const anchoLinea = 78;

    doc.setDrawColor(65, 65, 65);
    doc.setLineWidth(0.38);
    doc.line(centroX - anchoLinea / 2, yFirma, centroX + anchoLinea / 2, yFirma);

    doc.setTextColor(10, 10, 10);
    doc.setFont("times", "bold");
    doc.setFontSize(11.4);
    doc.text(limpiarTexto(rector.nombre), centroX, yFirma + 8.4, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.6);
    doc.text(limpiarTexto(rector.cargo).toUpperCase(), centroX, yFirma + 14.4, { align: "center" });
  }

  function obtenerYFirma(layout) {
    const zonas = layout && layout.zonas ? layout.zonas : {};

    if (zonas.firmas && Number.isFinite(Number(zonas.firmas.y))) {
      return Number(zonas.firmas.y);
    }

    if (Array.isArray(zonas.firmaBoxes) && zonas.firmaBoxes.length) {
      const centro = zonas.firmaBoxes[Math.floor(zonas.firmaBoxes.length / 2)];
      if (centro && Number.isFinite(Number(centro.y))) return Number(centro.y);
    }

    return 162;
  }

  function obtenerSoloRector() {
    if (window.CertiFirmantes && typeof window.CertiFirmantes.obtenerSoloRector === "function") {
      return window.CertiFirmantes.obtenerSoloRector();
    }

    return [{ id: "rector", nombre: "Dr. León Tito", cargo: "RECTOR" }];
  }

  function esCertificadoCapacitador(item) {
    if (!item || typeof item !== "object") return false;

    return item.esCertificadoCapacitador === true ||
      limpiarTexto(item.rolCertificado).toLowerCase() === ROL_CAPACITADOR;
  }

  function obtenerConfigTipo() {
    if (window.CertiTipos && typeof window.CertiTipos.obtenerConfig === "function") {
      return window.CertiTipos.obtenerConfig(TIPO_CAPACITACION) || {};
    }

    return { horasDefecto: 40 };
  }

  function obtenerFechaVisible(certificado) {
    const directa = limpiarTexto(certificado && certificado.fecha);
    if (directa) return directa.replace(/[.]$/, "");

    const fechaInput = limpiarTexto(certificado && certificado.fechaInput);
    const U = window.CertiUtils;

    if (fechaInput && U && typeof U.formatearFechaLarga === "function") {
      return limpiarTexto(U.formatearFechaLarga(fechaInput)).replace(/[.]$/, "");
    }

    return fechaInput;
  }

  function limpiarNombreCapacitador(valor) {
    let texto = limpiarTexto(valor)
      .replace(/^(docente|profesor(?:a)?|capacitador(?:a)?|instructor(?:a)?|facilitador(?:a)?)\s*[:\-]?\s+/i, "")
      .trim();

    const U = window.CertiUtils;
    if (texto && U && typeof U.limpiarNombrePropio === "function") {
      texto = U.limpiarNombrePropio(texto);
    }

    return limpiarTexto(texto);
  }

  function crearClaveUnica(nombre, curso) {
    return `${claveTexto(nombre)}|${claveTexto(curso)}`;
  }

  function claveTexto(valor) {
    const U = window.CertiUtils;
    if (U && typeof U.claveTexto === "function") return U.claveTexto(valor);

    return limpiarTexto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9Ñ ]/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function crearNombreArchivo(valor) {
    const U = window.CertiUtils;
    if (U && typeof U.crearNombreArchivo === "function") return U.crearNombreArchivo(valor);

    return claveTexto(valor)
      .replace(/Ñ/g, "N")
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase();
  }

  function normalizarFirmante(firmante) {
    const salida = Object.assign({}, firmante || {});
    salida.nombre = limpiarTexto(salida.nombre || "Dr. León Tito");
    salida.cargo = limpiarTexto(salida.cargo || "RECTOR").toUpperCase();
    return salida;
  }

  function normalizarZona(zona, ancho) {
    const x = numero(zona && zona.x, 30);
    const y = numero(zona && zona.y, 54);
    const w = numero(zona && zona.w, 237);
    const h = numero(zona && zona.h, 96);

    return Object.assign({}, zona || {}, {
      x,
      y,
      w,
      h,
      centroX: numero(zona && zona.centroX, x + w / 2 || ancho / 2)
    });
  }

  function calcularTamanoNombre(nombre) {
    const largo = limpiarTexto(nombre).length;
    if (largo > 62) return 15.2;
    if (largo > 54) return 16.4;
    if (largo > 46) return 17.6;
    if (largo > 38) return 18.8;
    if (largo > 30) return 20;
    return 21.2;
  }

  function calcularTamanoCurso(curso) {
    const largo = limpiarTexto(curso).length;
    if (largo > 105) return 9;
    if (largo > 85) return 9.6;
    if (largo > 65) return 10.2;
    if (largo > 48) return 10.8;
    return 11.4;
  }

  function limpiarTexto(valor) {
    return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim();
  }

  function numero(valor, defecto) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : defecto;
  }

  window.CertiCapacitadores = {
    VERSION,
    ROL_PARTICIPANTE,
    ROL_CAPACITADOR,
    esCertificadoCapacitador,
    crearCertificadosCapacitadores,
    obtenerSoloRector
  };
})();