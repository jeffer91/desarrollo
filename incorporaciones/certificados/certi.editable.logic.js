/* =========================================================
Nombre completo: certi.editable.logic.js
Ruta o ubicación: /incorporaciones/certificados/certi.editable.logic.js
Función o funciones:
- Interpretar texto libre o texto con etiquetas para certificados editables.
- Separar varios certificados mediante líneas con ---.
- Detectar título, beneficiarios, contenido, cierre, lugar, fecha y hasta tres firmantes.
- Crear un certificado por cada beneficiario detectado.
- Reemplazar variables como {{NOMBRE}}, {{PERIODO}}, {{FECHA}} y {{CIUDAD}}.
Con qué se une:
- certi.editable.js
- certi.editable.template.js
- certi.utils.js
========================================================= */
(function () {
  "use strict";

  const TIPO_EDITABLE = "editable";

  const MAPA_ETIQUETAS = {
    TITULO: "titulo",
    ENCABEZADO: "introduccion",
    INTRODUCCION: "introduccion",
    NOMBRE: "beneficiarios",
    BENEFICIARIO: "beneficiarios",
    BENEFICIARIOS: "beneficiarios",
    PARTICIPANTE: "beneficiarios",
    PARTICIPANTES: "beneficiarios",
    TEXTO: "textoPrincipal",
    CONTENIDO: "textoPrincipal",
    TEXTO_PRINCIPAL: "textoPrincipal",
    PRINCIPAL: "textoPrincipal",
    DESTACADO: "destacado",
    EVENTO: "destacado",
    TEMA: "destacado",
    CURSO: "destacado",
    DETALLE: "complemento",
    COMPLEMENTO: "complemento",
    TEXTO_COMPLEMENTARIO: "complemento",
    CIERRE: "cierre",
    MENSAJE_FINAL: "cierre",
    CIUDAD: "ciudad",
    LUGAR: "ciudad",
    FECHA: "fecha"
  };

  function parsearTexto(texto, opciones) {
    const config = opciones || {};
    const limpio = normalizarSaltos(texto).trim();

    if (!limpio) return [];

    const partes = limpio
      .split(/^\s*(?:---+|===+)\s*$/m)
      .map(function (parte) { return parte.trim(); })
      .filter(Boolean);

    return partes.map(function (parte, index) {
      const etiquetado = parsearEtiquetado(parte, config, index);
      const bloque = etiquetado.etiquetas > 0
        ? completarBloque(etiquetado.bloque, config, index)
        : completarBloque(parsearLibre(parte, config, index), config, index);

      bloque.textoOriginal = parte;
      return bloque;
    });
  }

  function parsearEtiquetado(texto, config, index) {
    const bloque = crearBloqueBase(config, index);
    const lineas = normalizarSaltos(texto).split("\n");
    const firmantes = [{ nombre: "", cargo: "" }, { nombre: "", cargo: "" }, { nombre: "", cargo: "" }];
    let campoActual = "";
    let etiquetas = 0;

    lineas.forEach(function (lineaOriginal) {
      const linea = limpiarTexto(lineaOriginal);
      if (!linea) {
        campoActual = "";
        return;
      }

      const etiqueta = detectarEtiqueta(linea);

      if (etiqueta) {
        etiquetas += 1;
        campoActual = etiqueta.campo;

        if (etiqueta.tipo === "firmante") {
          firmantes[etiqueta.indice].nombre = agregarTexto(firmantes[etiqueta.indice].nombre, etiqueta.valor);
          return;
        }

        if (etiqueta.tipo === "cargo") {
          firmantes[etiqueta.indice].cargo = agregarTexto(firmantes[etiqueta.indice].cargo, etiqueta.valor);
          return;
        }

        if (campoActual === "beneficiarios") {
          bloque.beneficiarios = bloque.beneficiarios.concat(separarBeneficiarios(etiqueta.valor));
          return;
        }

        bloque[campoActual] = agregarTexto(bloque[campoActual], etiqueta.valor);
        return;
      }

      if (/^firmante_\d+$/.test(campoActual)) {
        const indiceFirmante = Math.max(0, Math.min(2, Number(campoActual.split("_")[1]) - 1));
        firmantes[indiceFirmante].nombre = agregarTexto(firmantes[indiceFirmante].nombre, linea);
        return;
      }

      if (/^cargo_\d+$/.test(campoActual)) {
        const indiceCargo = Math.max(0, Math.min(2, Number(campoActual.split("_")[1]) - 1));
        firmantes[indiceCargo].cargo = agregarTexto(firmantes[indiceCargo].cargo, linea);
        return;
      }

      if (campoActual === "beneficiarios") {
        bloque.beneficiarios = bloque.beneficiarios.concat(separarBeneficiarios(linea));
        return;
      }

      if (campoActual && Object.prototype.hasOwnProperty.call(bloque, campoActual)) {
        bloque[campoActual] = agregarTexto(bloque[campoActual], linea);
      }
    });

    bloque.firmantes = firmantes.filter(function (item) {
      return limpiarTexto(item.nombre) || limpiarTexto(item.cargo);
    });

    return { bloque, etiquetas };
  }

  function detectarEtiqueta(linea) {
    const match = String(linea || "").match(/^([^:]{2,45})\s*:\s*(.*)$/);
    if (!match) return null;

    const clave = claveEtiqueta(match[1]);
    const valor = limpiarTexto(match[2]);

    const firmanteMatch = clave.match(/^(?:FIRMANTE|NOMBRE_FIRMANTE)(?:_?([123]))?$/);
    if (firmanteMatch) {
      const indice = Math.max(0, Math.min(2, Number(firmanteMatch[1] || 1) - 1));
      return { tipo: "firmante", indice, campo: `firmante_${indice + 1}`, valor };
    }

    const cargoMatch = clave.match(/^CARGO(?:_?([123]))?$/);
    if (cargoMatch) {
      const indice = Math.max(0, Math.min(2, Number(cargoMatch[1] || 1) - 1));
      return { tipo: "cargo", indice, campo: `cargo_${indice + 1}`, valor };
    }

    const campo = MAPA_ETIQUETAS[clave];
    if (!campo) return null;

    return { tipo: "campo", campo, valor };
  }

  function parsearLibre(texto, config, index) {
    const bloque = crearBloqueBase(config, index);
    const parrafos = normalizarSaltos(texto)
      .split(/\n\s*\n+/)
      .map(limpiarParrafo)
      .filter(Boolean);

    const trabajo = parrafos.slice();

    extraerFirmanteLibre(trabajo, bloque);
    extraerFechaLibre(trabajo, bloque);

    if (trabajo.length && pareceTitulo(trabajo[0])) {
      bloque.titulo = trabajo.shift();
    }

    if (trabajo.length && pareceNombre(trabajo[0])) {
      bloque.beneficiarios = separarBeneficiarios(trabajo.shift());
    }

    const indiceDestacado = trabajo.findIndex(function (parrafo) {
      return pareceDestacado(parrafo);
    });

    if (indiceDestacado >= 0) {
      bloque.destacado = trabajo.splice(indiceDestacado, 1)[0];
    }

    if (trabajo.length >= 4) {
      bloque.introduccion = trabajo.shift();
      bloque.textoPrincipal = trabajo.shift();
      bloque.cierre = trabajo.pop();
      bloque.complemento = trabajo.join("\n");
    } else if (trabajo.length === 3) {
      bloque.introduccion = trabajo[0];
      bloque.textoPrincipal = trabajo[1];
      bloque.cierre = trabajo[2];
    } else if (trabajo.length === 2) {
      if (/instituto|otorga|certifica|confiere/i.test(trabajo[0])) {
        bloque.introduccion = trabajo[0];
        bloque.cierre = trabajo[1];
      } else {
        bloque.textoPrincipal = trabajo[0];
        bloque.cierre = trabajo[1];
      }
    } else if (trabajo.length === 1) {
      bloque.textoPrincipal = trabajo[0];
    }

    return bloque;
  }

  function extraerFirmanteLibre(parrafos, bloque) {
    if (!parrafos.length) return;

    const ultimo = parrafos[parrafos.length - 1];
    const lineas = String(ultimo || "").split(/\n/).map(limpiarTexto).filter(Boolean);

    if (lineas.length >= 2 && pareceCargo(lineas[lineas.length - 1])) {
      bloque.firmantes = [{
        nombre: lineas[lineas.length - 2],
        cargo: lineas[lineas.length - 1]
      }];
      parrafos.pop();
      return;
    }

    if (pareceCargo(ultimo) && parrafos.length >= 2) {
      const nombre = parrafos[parrafos.length - 2];
      if (pareceNombre(nombre)) {
        bloque.firmantes = [{ nombre, cargo: ultimo }];
        parrafos.splice(parrafos.length - 2, 2);
      }
    }
  }

  function extraerFechaLibre(parrafos, bloque) {
    const indice = parrafos.findIndex(function (parrafo) {
      return pareceFechaLugar(parrafo);
    });

    if (indice < 0) return;

    const encontrado = parrafos.splice(indice, 1)[0];
    const partes = encontrado.split(",").map(limpiarTexto).filter(Boolean);

    if (partes.length > 1) {
      bloque.ciudad = partes.shift();
      bloque.fecha = partes.join(", ").replace(/[.]$/, "");
    } else {
      bloque.fecha = encontrado.replace(/[.]$/, "");
    }
  }

  function completarBloque(bloqueEntrada, config, index) {
    const bloque = Object.assign(crearBloqueBase(config, index), bloqueEntrada || {});

    bloque.titulo = limpiarTexto(bloque.titulo) || "CERTIFICADO";
    bloque.beneficiarios = quitarDuplicados(
      (Array.isArray(bloque.beneficiarios) ? bloque.beneficiarios : separarBeneficiarios(bloque.beneficiarios))
        .map(limpiarTexto)
        .filter(Boolean)
    );
    bloque.introduccion = limpiarParrafo(bloque.introduccion);
    bloque.textoPrincipal = limpiarParrafo(bloque.textoPrincipal);
    bloque.destacado = limpiarParrafo(bloque.destacado);
    bloque.complemento = limpiarParrafo(bloque.complemento);
    bloque.cierre = limpiarParrafo(bloque.cierre);
    bloque.ciudad = limpiarTexto(bloque.ciudad) || limpiarTexto(config.ciudad) || "Quito";
    bloque.fecha = limpiarTexto(bloque.fecha) || limpiarTexto(config.fecha) || "";
    bloque.firmantes = normalizarFirmantes(bloque.firmantes);

    if (!bloque.firmantes.length && config.firmanteDefecto !== false) {
      bloque.firmantes = [{ nombre: "Dr. León Tito", cargo: "RECTOR" }];
    }

    return bloque;
  }

  function crearResultado(bloquesEntrada, contexto) {
    const config = contexto || {};
    const bloques = (bloquesEntrada || []).map(function (item, index) {
      return completarBloque(item, config, index);
    });
    const certificados = [];
    const errores = [];
    const alertas = [];

    bloques.forEach(function (bloque, bloqueIndex) {
      if (!bloque.beneficiarios.length) {
        errores.push(`El bloque ${bloqueIndex + 1} no tiene beneficiarios.`);
        return;
      }

      if (!bloque.textoPrincipal && !bloque.introduccion && !bloque.cierre) {
        errores.push(`El bloque ${bloqueIndex + 1} no tiene contenido para el certificado.`);
        return;
      }

      bloque.beneficiarios.forEach(function (beneficiario, beneficiarioIndex) {
        certificados.push(crearCertificado(bloque, beneficiario, config, bloqueIndex, beneficiarioIndex));
      });
    });

    if (!errores.length && certificados.length) {
      alertas.push({
        tipo: "success",
        titulo: "Texto ordenado correctamente",
        mensaje: `${certificados.length} certificado(s) editable(s) están listos para descargar.`
      });
    }

    const sinFirmas = certificados.filter(function (item) {
      return !Array.isArray(item.firmantes) || !item.firmantes.length;
    }).length;

    if (sinFirmas > 0) {
      alertas.push({
        tipo: "warning",
        titulo: "Certificados sin firma",
        mensaje: `${sinFirmas} certificado(s) se generarán sin firmante.`
      });
    }

    errores.forEach(function (mensaje) {
      alertas.push({ tipo: "danger", titulo: "Texto incompleto", mensaje });
    });

    return {
      tipoCertificado: TIPO_EDITABLE,
      bloques,
      certificados,
      mejores: certificados,
      registrosValidos: certificados,
      alertas,
      errores,
      resumen: {
        registrosLeidos: bloques.length,
        bloquesAnalizados: bloques.length,
        beneficiariosDetectados: certificados.length,
        certificadosListos: certificados.length,
        alertas: alertas.length
      }
    };
  }

  function crearCertificado(bloque, beneficiario, contexto, bloqueIndex, beneficiarioIndex) {
    const variables = {
      NOMBRE: beneficiario,
      BENEFICIARIO: beneficiario,
      TITULO: bloque.titulo,
      PERIODO: contexto.periodoTexto || contexto.periodoSeleccionado || "",
      FECHA: bloque.fecha || contexto.fechaLarga || contexto.fechaCertificado || "",
      CIUDAD: bloque.ciudad || contexto.ciudad || "Quito"
    };

    return {
      tipoCertificado: TIPO_EDITABLE,
      rolCertificado: TIPO_EDITABLE,
      indice: `editable_${bloqueIndex}_${beneficiarioIndex}`,
      nombre: reemplazarVariables(beneficiario, variables),
      beneficiario: reemplazarVariables(beneficiario, variables),
      titulo: reemplazarVariables(bloque.titulo, variables),
      introduccion: reemplazarVariables(bloque.introduccion, variables),
      textoPrincipal: reemplazarVariables(bloque.textoPrincipal, variables),
      destacado: reemplazarVariables(bloque.destacado, variables),
      complemento: reemplazarVariables(bloque.complemento, variables),
      cierre: reemplazarVariables(bloque.cierre, variables),
      ciudad: reemplazarVariables(bloque.ciudad, variables),
      fecha: reemplazarVariables(bloque.fecha || variables.FECHA, variables),
      fechaInput: contexto.fechaCertificado || "",
      periodo: variables.PERIODO,
      firmantes: bloque.firmantes.map(function (firmante) {
        return {
          nombre: reemplazarVariables(firmante.nombre, variables),
          cargo: reemplazarVariables(firmante.cargo, variables)
        };
      }),
      estadoCertificado: "listo",
      requiereAccion: false,
      origen: "texto_editable"
    };
  }

  function crearBloqueBase(config, index) {
    return {
      id: `editable_bloque_${index || 0}`,
      titulo: "",
      beneficiarios: [],
      introduccion: "",
      textoPrincipal: "",
      destacado: "",
      complemento: "",
      cierre: "",
      ciudad: "",
      fecha: "",
      firmantes: []
    };
  }

  function normalizarFirmantes(lista) {
    return (Array.isArray(lista) ? lista : [])
      .slice(0, 3)
      .map(function (item) {
        return {
          nombre: limpiarTexto(item && item.nombre),
          cargo: limpiarTexto(item && item.cargo).toUpperCase()
        };
      })
      .filter(function (item) {
        return item.nombre || item.cargo;
      });
  }

  function separarBeneficiarios(valor) {
    return String(valor == null ? "" : valor)
      .split(/\n|;|\s+\|\s+/)
      .map(function (item) { return limpiarTexto(item.replace(/^[-•]\s*/, "")); })
      .filter(Boolean);
  }

  function reemplazarVariables(texto, variables) {
    return String(texto == null ? "" : texto).replace(/\{\{\s*([A-ZÁÉÍÓÚÑ_]+)\s*\}\}/gi, function (_match, clave) {
      const normalizada = claveEtiqueta(clave);
      return Object.prototype.hasOwnProperty.call(variables, normalizada)
        ? String(variables[normalizada] == null ? "" : variables[normalizada])
        : _match;
    });
  }

  function pareceTitulo(texto) {
    const limpio = limpiarTexto(texto);
    if (!limpio || limpio.length > 90) return false;
    if (/CERTIFICADO|RECONOCIMIENTO|CONSTANCIA|DIPLOMA/i.test(limpio)) return true;
    return proporcionMayusculas(limpio) >= 0.78 && limpio.split(" ").length <= 10;
  }

  function pareceNombre(texto) {
    const limpio = limpiarTexto(texto).replace(/[.,;:]+$/, "");
    if (!limpio || limpio.length > 85) return false;
    if (/[.!?]/.test(limpio)) return false;
    if (pareceFechaLugar(limpio) || pareceCargo(limpio) || pareceTitulo(limpio)) return false;
    const palabras = limpio.split(" ").filter(Boolean);
    return palabras.length >= 2 && palabras.length <= 8;
  }

  function pareceDestacado(texto) {
    const limpio = limpiarTexto(texto);
    if (!limpio || limpio.length > 120) return false;
    return proporcionMayusculas(limpio) >= 0.72 && limpio.split(" ").length <= 16;
  }

  function pareceCargo(texto) {
    return /^(RECTOR|VICERRECTOR|DIRECTOR(?:A)?|COORDINADOR(?:A)?|GESTOR(?:A)?|DOCENTE|CAPACITADOR(?:A)?|PRESIDENTE|SECRETARIO(?:A)?)(\s+.*)?$/i.test(limpiarTexto(texto));
  }

  function pareceFechaLugar(texto) {
    const limpio = limpiarTexto(texto);
    return /(Quito|Guayaquil|Cuenca|Ecuador).*(\d{1,2}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i.test(limpio) ||
      /\d{1,2}[/-]\d{1,2}[/-](?:20)?\d{2}/.test(limpio);
  }

  function proporcionMayusculas(texto) {
    const letras = String(texto || "").replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
    if (!letras) return 0;
    const mayusculas = letras.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, "");
    return mayusculas.length / letras.length;
  }

  function claveEtiqueta(valor) {
    return limpiarTexto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase();
  }

  function agregarTexto(anterior, nuevo) {
    const a = limpiarTexto(anterior);
    const b = limpiarTexto(nuevo);
    if (!a) return b;
    if (!b) return a;
    return `${a}\n${b}`;
  }

  function limpiarParrafo(valor) {
    return String(valor == null ? "" : valor)
      .split("\n")
      .map(limpiarTexto)
      .filter(Boolean)
      .join("\n");
  }

  function limpiarTexto(valor) {
    return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim();
  }

  function normalizarSaltos(valor) {
    return String(valor == null ? "" : valor).replace(/\r\n?/g, "\n");
  }

  function quitarDuplicados(lista) {
    const mapa = Object.create(null);
    return (lista || []).filter(function (item) {
      const clave = claveEtiqueta(item);
      if (!clave || mapa[clave]) return false;
      mapa[clave] = true;
      return true;
    });
  }

  window.CertiEditableLogic = {
    TIPO_EDITABLE,
    parsearTexto,
    crearResultado,
    completarBloque,
    separarBeneficiarios,
    reemplazarVariables
  };
})();
