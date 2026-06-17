/*
=========================================================
Nombre completo: certi.text.js
Ruta o ubicación: /incorporaciones/certificados/certi.text.js
Función o funciones:
- Leer texto pegado para generar certificados de mejores egresados.
- Detectar datos en tablas, listados por carrera, líneas sueltas y texto semiestructurado.
- Extraer carrera, nombre y promedio sin depender de Excel.
- Entregar registros compatibles con certi.logic.js.
Con qué se une:
- certi.source.js
- certi.app.js
- certi.logic.js
- certi.utils.js
=========================================================
*/

(function () {
  "use strict";

  const U = window.CertiUtils || {};

  const palabrasCarrera = [
    "CARRERA",
    "PROGRAMA",
    "OFERTA",
    "TITULO",
    "TÍTULO",
    "TECNOLOGIA",
    "TECNOLOGÍA",
    "TECNICA",
    "TÉCNICA",
    "SUPERIOR",
    "ENFERMERIA",
    "ENFERMERÍA",
    "ADMINISTRACION",
    "ADMINISTRACIÓN",
    "CONTABILIDAD",
    "SOFTWARE",
    "EDUCACION",
    "EDUCACIÓN",
    "ESTETICA",
    "ESTÉTICA",
    "MECANICA",
    "MECÁNICA",
    "REDES",
    "TELECOMUNICACIONES",
    "ALIMENTOS",
    "SEGURIDAD",
    "RIESGOS",
    "TALENTO",
    "MARKETING",
    "PEDAGOGIA",
    "PEDAGOGÍA"
  ];

  const palabrasNombre = [
    "NOMBRE",
    "NOMBRES",
    "ESTUDIANTE",
    "EGRESADO",
    "GRADUADO",
    "ALUMNO",
    "APELLIDOS"
  ];

  const palabrasPromedio = [
    "PROMEDIO",
    "NOTA",
    "CALIFICACION",
    "CALIFICACIÓN",
    "PUNTAJE"
  ];

  const palabrasBasuraLinea = [
    "LISTADO",
    "MEJORES EGRESADOS",
    "MEJOR EGRESADO",
    "INCORPORACION",
    "INCORPORACIÓN",
    "FECHA",
    "PERIODO",
    "PERÍODO",
    "COHORTE"
  ];

  function leerTexto(texto, opciones) {
    const config = opciones || {};
    const textoOriginal = normalizarSaltos(texto);

    const lineas = textoOriginal
      .split("\n")
      .map(function (linea) {
        return limpiarTexto(linea);
      })
      .filter(function (linea) {
        return linea.length > 0;
      });

    const lecturaBloques = leerTextoLibrePorBloques(lineas);

    if (lecturaBloques.registros.length > 0) {
      const registrosFinales = quitarDuplicados(
        lecturaBloques.registros.map(function (item, index) {
          return crearRegistro(item, index);
        })
      );

      const alertas = [
        {
          tipo: "success",
          titulo: "Texto interpretado",
          mensaje: `Se detectaron ${registrosFinales.length} registro(s) desde el texto pegado.`
        },
        {
          tipo: "info",
          titulo: "Lectura inteligente",
          mensaje: "Se interpretaron bloques libres usando cédula, nombre, carrera y promedio."
        }
      ];

      if (lecturaBloques.carrerasHeredadas > 0) {
        alertas.push({
          tipo: "info",
          titulo: "Carreras heredadas",
          mensaje: `${lecturaBloques.carrerasHeredadas} registro(s) tomaron la carrera del bloque anterior.`
        });
      }

      if (lecturaBloques.bloquesIncompletos > 0 && config.mostrarIgnoradas !== false) {
        alertas.push({
          tipo: "warning",
          titulo: "Bloques incompletos",
          mensaje: `${lecturaBloques.bloquesIncompletos} bloque(s) tenían cédula o promedio, pero faltaba nombre o carrera.`
        });
      }

      return {
        nombreArchivo: "Texto pegado",
        hoja: "Texto pegado",
        hojasLeidas: ["Texto pegado"],
        totalFilas: lineas.length,
        registros: registrosFinales,
        alertas,
        origen: "texto",
        fuente: "texto"
      };
    }

    const registros = [];
    const alertas = [];

    let ultimaCarrera = "";
    let filasIgnoradas = 0;
    let carrerasHeredadas = 0;

    lineas.forEach(function (linea, index) {
      const analisis = analizarLinea(linea, ultimaCarrera, index);

      if (analisis.tipo === "carrera") {
        ultimaCarrera = analisis.carrera;
        return;
      }

      if (analisis.tipo === "registro") {
        if (analisis.carrera) {
          ultimaCarrera = analisis.carrera;
        }

        if (!analisis.carrera && ultimaCarrera && analisis.nombre && analisis.promedio !== null) {
          analisis.carrera = ultimaCarrera;
          analisis.carreraHeredada = true;
          carrerasHeredadas += 1;
        }

        registros.push(crearRegistro(analisis, registros.length));
        return;
      }

      if (analisis.tipo === "tabla") {
        analisis.registros.forEach(function (item) {
          if (item.carrera) {
            ultimaCarrera = item.carrera;
          }

          if (!item.carrera && ultimaCarrera && item.nombre && item.promedio !== null) {
            item.carrera = ultimaCarrera;
            item.carreraHeredada = true;
            carrerasHeredadas += 1;
          }

          registros.push(crearRegistro(item, registros.length));
        });

        return;
      }

      filasIgnoradas += 1;
    });

    const registrosFinales = quitarDuplicados(registros);
    const duplicados = registros.length - registrosFinales.length;

    if (!lineas.length) {
      alertas.push({
        tipo: "warning",
        titulo: "Texto vacío",
        mensaje: "No se pegó información para procesar."
      });
    }

    if (registrosFinales.length > 0) {
      alertas.push({
        tipo: "success",
        titulo: "Texto interpretado",
        mensaje: `Se detectaron ${registrosFinales.length} registro(s) desde el texto pegado.`
      });
    }

    if (carrerasHeredadas > 0) {
      alertas.push({
        tipo: "info",
        titulo: "Carreras heredadas",
        mensaje: `${carrerasHeredadas} registro(s) tomaron la carrera del bloque anterior.`
      });
    }

    if (filasIgnoradas > 0 && config.mostrarIgnoradas !== false) {
      alertas.push({
        tipo: "warning",
        titulo: "Líneas ignoradas",
        mensaje: `${filasIgnoradas} línea(s) no tenían nombre, carrera y promedio suficientes.`
      });
    }

    if (duplicados > 0) {
      alertas.push({
        tipo: "info",
        titulo: "Duplicados omitidos",
        mensaje: `${duplicados} registro(s) repetidos fueron ignorados.`
      });
    }

    return {
      nombreArchivo: "Texto pegado",
      hoja: "Texto pegado",
      hojasLeidas: ["Texto pegado"],
      totalFilas: lineas.length,
      registros: registrosFinales,
      alertas,
      origen: "texto",
      fuente: "texto"
    };
  }

  function leerTextoLibrePorBloques(lineas) {
    const bloques = [];
    let actual = [];

    function cerrarBloque() {
      if (!actual.length) return;

      bloques.push(actual);
      actual = [];
    }

    lineas.forEach(function (linea, index) {
      const entrada = {
        linea,
        index
      };

      if (esLineaCedula(linea) && actual.length) {
        cerrarBloque();
      }

      actual.push(entrada);

      if (
        extraerPromedio(linea) !== null &&
        actual.some(function (item) {
          return obtenerCedula(item.linea);
        })
      ) {
        cerrarBloque();
      }
    });

    cerrarBloque();

    const registros = [];
    let bloquesIncompletos = 0;
    let carrerasHeredadas = 0;
    let ultimaCarrera = "";

    bloques.forEach(function (bloque) {
      const item = interpretarBloqueLibre(bloque, ultimaCarrera);

      if (!item) {
        const teniaAncla = bloque.some(function (entrada) {
          return obtenerCedula(entrada.linea) || extraerPromedio(entrada.linea) !== null;
        });

        if (teniaAncla) {
          bloquesIncompletos += 1;
        }

        return;
      }

      if (item.carreraHeredada) {
        carrerasHeredadas += 1;
      }

      if (item.carrera) {
        ultimaCarrera = item.carrera;
      }

      registros.push(item);
    });

    return {
      registros,
      bloquesIncompletos,
      carrerasHeredadas
    };
  }

  function interpretarBloqueLibre(bloque, carreraAnterior) {
    const lineasBloque = bloque.map(function (entrada) {
      return entrada.linea;
    });

    const textoBloque = lineasBloque.join("\n");
    const cedula = obtenerCedula(textoBloque);
    const promedioInfo = obtenerPromedioBloque(lineasBloque);

    if (!cedula || promedioInfo.valor === null) {
      return null;
    }

    const carreraDetectada = obtenerCarreraBloque(lineasBloque);
    const carreraFinal = carreraDetectada || carreraAnterior || "";
    const nombre = obtenerNombreBloque(lineasBloque, carreraFinal);

    if (!nombre || !carreraFinal) {
      return null;
    }

    return {
      lineaOriginal: textoBloque,
      filaTexto: bloque[0] ? bloque[0].index + 1 : 1,
      cedula,
      carrera: carreraFinal,
      nombre,
      promedio: promedioInfo.valor,
      promedioOriginal: promedioInfo.texto,
      sede: obtenerSedeBloque(lineasBloque),
      modalidad: obtenerModalidadBloque(lineasBloque),
      carreraHeredada: !carreraDetectada && Boolean(carreraAnterior),
      raw: {
        texto: textoBloque,
        cedula,
        carrera: carreraFinal,
        nombre,
        promedio: promedioInfo.valor,
        sede: obtenerSedeBloque(lineasBloque),
        modalidad: obtenerModalidadBloque(lineasBloque)
      }
    };
  }

  function obtenerPromedioBloque(lineas) {
    let encontrado = {
      valor: null,
      texto: ""
    };

    lineas.forEach(function (linea) {
      const promedio = extraerPromedio(linea);

      if (promedio !== null) {
        encontrado = {
          valor: promedio,
          texto: obtenerTextoPromedio(linea) || String(promedio)
        };
      }
    });

    return encontrado;
  }

  function obtenerCarreraBloque(lineas) {
    let carrera = "";

    lineas.some(function (linea) {
      const partes = separarLinea(linea);

      const carreraParte = partes.find(function (parte) {
        return !obtenerCedula(parte) && extraerPromedio(parte) === null && pareceCarrera(parte);
      });

      if (carreraParte) {
        carrera = limpiarCarrera(carreraParte);
        return true;
      }

      if (!obtenerCedula(linea) && extraerPromedio(linea) === null) {
        const directa = extraerCarreraDeclarada(linea);

        if (directa) {
          carrera = directa;
          return true;
        }
      }

      return false;
    });

    return carrera;
  }

  function obtenerNombreBloque(lineas, carrera) {
    const candidatos = [];

    lineas.forEach(function (linea) {
      const partes = separarLinea(linea);

      partes.forEach(function (parte) {
        if (!parte) return;
        if (obtenerCedula(parte)) return;
        if (extraerPromedio(parte) !== null) return;
        if (esLineaContextoNoNombre(parte)) return;

        if (carrera && claveTexto(parte) === claveTexto(carrera)) {
          return;
        }

        if (pareceCarrera(parte)) {
          return;
        }

        const nombre = extraerNombreDesdeLinea(parte, carrera);

        if (nombre && pareceNombre(nombre)) {
          candidatos.push(nombre);
        }
      });
    });

    candidatos.sort(function (a, b) {
      return b.length - a.length;
    });

    return candidatos[0] || "";
  }

  function obtenerSedeBloque(lineas) {
    let sede = "";

    lineas.some(function (linea) {
      const match = limpiarTexto(linea).match(/^sede\s*[:：-]?\s*(.+)$/i);

      if (match && match[1]) {
        sede = `Sede ${limpiarTexto(match[1]).replace(/^sede\s+/i, "")}`;
        return true;
      }

      return false;
    });

    return sede;
  }

  function obtenerModalidadBloque(lineas) {
    let modalidad = "";

    lineas.some(function (linea) {
      const clave = claveTexto(linea);

      if (
        clave.includes("ONLINE") ||
        clave.includes("PRESENCIAL") ||
        clave.includes("DISTANCIA") ||
        clave.includes("VIRTUAL") ||
        clave.includes("HIBRIDA") ||
        clave.includes("HÍBRIDA")
      ) {
        modalidad = limpiarTexto(linea);
        return true;
      }

      return false;
    });

    return modalidad;
  }

  function esLineaCedula(linea) {
    return /^(?:cc|c\.c\.|cedula|c[eé]dula)?\s*[:：-]?\s*\d{10,13}$/i.test(limpiarTexto(linea));
  }

  function obtenerCedula(texto) {
    const match = limpiarTexto(texto).match(/\b(?:cc|c\.c\.|cedula|c[eé]dula)?\s*[:：-]?\s*(\d{10,13})\b/i);
    return match && match[1] ? match[1] : "";
  }

  function esLineaContextoNoNombre(linea) {
    const clave = claveTexto(linea);

    if (!clave) return true;

    return (
      /^SEDE\b/.test(clave) ||
      clave.includes("ONLINE") ||
      clave.includes("PRESENCIAL") ||
      clave.includes("DISTANCIA") ||
      clave.includes("VIRTUAL") ||
      clave.includes("HIBRIDA") ||
      clave.includes("MODALIDAD") ||
      clave === "NO ONLINE"
    );
  }

  function analizarLinea(linea, ultimaCarrera, index) {
    const limpia = limpiarTexto(linea);

    if (!limpia || esLineaBasura(limpia)) {
      return { tipo: "ignorar" };
    }

    if (pareceEncabezado(limpia)) {
      return { tipo: "ignorar" };
    }

    const tabla = intentarTabla(limpia, ultimaCarrera, index);

    if (tabla) {
      return tabla;
    }

    const carreraDirecta = extraerCarreraDeclarada(limpia);

    if (carreraDirecta && !extraerPromedio(limpia) && !extraerNombreDesdeLinea(limpia)) {
      return {
        tipo: "carrera",
        carrera: carreraDirecta
      };
    }

    const promedio = extraerPromedio(limpia);
    const carrera = carreraDirecta || extraerCarreraEnLinea(limpia);
    const nombre = extraerNombreDesdeLinea(limpia, carrera, promedio);

    if (nombre || carrera || promedio !== null) {
      return {
        tipo: "registro",
        lineaOriginal: linea,
        filaTexto: index + 1,
        carrera: carrera || "",
        nombre: nombre || "",
        promedio,
        promedioOriginal: promedio !== null ? obtenerTextoPromedio(limpia) : "",
        raw: {
          texto: linea,
          carrera,
          nombre,
          promedio
        }
      };
    }

    return { tipo: "ignorar" };
  }

  function intentarTabla(linea, ultimaCarrera, index) {
    const separador = detectarSeparadorTabla(linea);

    if (!separador) {
      return null;
    }

    const partes = linea
      .split(separador)
      .map(limpiarTexto)
      .filter(function (item) {
        return item.length > 0;
      });

    if (partes.length < 2 || partes.length > 8) {
      return null;
    }

    if (partes.some(pareceEncabezado)) {
      return { tipo: "ignorar" };
    }

    const registros = [];

    const promedioParte = partes.find(function (parte) {
      return extraerPromedio(parte) !== null;
    });

    if (!promedioParte) {
      return null;
    }

    const promedio = extraerPromedio(promedioParte);

    const restantes = partes.filter(function (parte) {
      return parte !== promedioParte;
    });

    let carrera = restantes.find(pareceCarrera) || "";

    let nombre = restantes.find(function (parte) {
      return parte !== carrera && pareceNombre(parte);
    }) || "";

    if (!carrera && ultimaCarrera) {
      carrera = ultimaCarrera;
    }

    if (!nombre) {
      nombre = limpiarNombre(
        restantes
          .filter(function (parte) {
            return parte !== carrera;
          })
          .join(" ")
      );
    }

    if (nombre || carrera || promedio !== null) {
      registros.push({
        lineaOriginal: linea,
        filaTexto: index + 1,
        carrera,
        nombre,
        promedio,
        promedioOriginal: promedioParte,
        raw: {
          texto: linea,
          columnas: partes
        }
      });
    }

    return registros.length ? { tipo: "tabla", registros } : null;
  }

  function crearRegistro(item, indice) {
    const cedula = limpiarTexto(item.cedula);
    const sede = limpiarTexto(item.sede);
    const modalidad = limpiarTexto(item.modalidad);
    const rawBase = item.raw || {
      texto: item.lineaOriginal || ""
    };

    return {
      indice,
      filaTexto: item.filaTexto || indice + 1,
      hojaExcel: "Texto pegado",
      cedula,
      carreraOriginal: limpiarTexto(item.carrera),
      nombre: limpiarNombre(item.nombre),
      promedioOriginal: item.promedioOriginal !== undefined ? item.promedioOriginal : item.promedio,
      promedio: convertirPromedio(item.promedio),
      fechaIncorporacion: "",
      sede,
      modalidad,
      fuente: "texto",
      carreraHeredada: Boolean(item.carreraHeredada),
      raw: {
        ...rawBase,
        cedula,
        sede,
        modalidad
      }
    };
  }

  function extraerCarreraDeclarada(linea) {
    const patrones = [
      /(?:^|\b)(?:carrera|programa|oferta|t[ií]tulo)\s*[:：-]\s*(.+)$/i,
      /(?:^|\b)(?:tecnolog[ií]a|t[eé]cnica)\s+superior\s+(.+)$/i
    ];

    for (let i = 0; i < patrones.length; i += 1) {
      const match = linea.match(patrones[i]);

      if (match && match[1]) {
        return limpiarCarrera(match[1]);
      }
    }

    if (pareceCarrera(linea) && !pareceNombre(linea) && extraerPromedio(linea) === null) {
      return limpiarCarrera(linea);
    }

    return "";
  }

  function extraerCarreraEnLinea(linea) {
    const partes = separarLinea(linea);
    const carrera = partes.find(pareceCarrera);

    if (carrera) {
      return limpiarCarrera(carrera);
    }

    const match = linea.match(/((?:TECNOLOG[IÍ]A|T[EÉ]CNICA)\s+SUPERIOR(?:\s+UNIVERSITARIA)?\s+(?:EN\s+)?[A-ZÁÉÍÓÚÑ\s]{5,})/i);

    return match && match[1] ? limpiarCarrera(match[1]) : "";
  }

  function extraerNombreDesdeLinea(linea, carrera) {
    let texto = limpiarTexto(linea);

    texto = texto.replace(/(?:^|\b)(?:nombre|estudiante|egresado|graduado|alumno)\s*[:：-]\s*/i, "");
    texto = texto.replace(/(?:^|\b)(?:promedio|nota|calificaci[oó]n|puntaje)\s*[:：-]?\s*\d+(?:[.,]\d+)?/ig, " ");
    texto = texto.replace(/\b\d+(?:[.,]\d+)?\b/g, " ");

    if (carrera) {
      texto = texto.replace(new RegExp(escaparRegExp(carrera), "ig"), " ");
    }

    const partes = separarLinea(texto)
      .filter(function (parte) {
        return !pareceCarrera(parte) && pareceNombre(parte);
      });

    const nombre = partes.sort(function (a, b) {
      return b.length - a.length;
    })[0] || "";

    return limpiarNombre(nombre);
  }

  function extraerPromedio(linea) {
    const texto = limpiarTexto(linea);

    const patrones = [
      /(?:promedio|nota|calificaci[oó]n|puntaje)\s*[:：-]?\s*(\d{1,3}(?:[.,]\d{1,8})?)/i,
      /\b(10(?:[.,]0{1,8})?|[0-9](?:[.,]\d{1,8})?)\b/g
    ];

    const directo = texto.match(patrones[0]);

    if (directo && directo[1]) {
      return convertirPromedio(directo[1]);
    }

    const numeros = [];
    let match;
    const regex = patrones[1];

    while ((match = regex.exec(texto)) !== null) {
      const numero = convertirPromedio(match[1]);

      if (numero !== null && numero >= 0 && numero <= 10) {
        numeros.push(numero);
      }
    }

    if (!numeros.length) {
      return null;
    }

    return numeros[numeros.length - 1];
  }

  function obtenerTextoPromedio(linea) {
    const match = limpiarTexto(linea).match(/(?:promedio|nota|calificaci[oó]n|puntaje)?\s*[:：-]?\s*(10(?:[.,]0{1,8})?|[0-9](?:[.,]\d{1,8})?)/i);
    return match && match[1] ? match[1] : "";
  }

  function separarLinea(linea) {
    return limpiarTexto(linea)
      .replace(/\s+-\s+/g, "|")
      .replace(/\t/g, "|")
      .replace(/;/g, "|")
      .replace(/\s{2,}/g, "|")
      .split("|")
      .map(limpiarTexto)
      .filter(Boolean);
  }

  function detectarSeparadorTabla(linea) {
    if (linea.includes("|")) return "|";
    if (linea.includes("\t")) return "\t";
    if (linea.includes(";")) return ";";
    if (/\s+-\s+/.test(linea)) return /\s+-\s+/;
    return null;
  }

  function pareceCarrera(valor) {
    const clave = claveTexto(valor);

    if (!clave || clave.length < 5) return false;
    if (extraerPromedio(valor) !== null && clave.split(" ").length <= 3) return false;

    return palabrasCarrera.some(function (palabra) {
      return clave.includes(claveTexto(palabra));
    });
  }

  function pareceNombre(valor) {
    const texto = limpiarTexto(valor);
    const clave = claveTexto(texto);

    if (!texto || texto.length < 5) return false;
    if (pareceCarrera(texto)) return false;
    if (extraerPromedio(texto) !== null && clave.split(" ").length <= 3) return false;
    if (/[@]|https?:\/\//i.test(texto)) return false;
    if (/\b\d{10,13}\b/.test(texto)) return false;

    const palabras = texto.split(/\s+/).filter(Boolean);
    return palabras.length >= 2 && palabras.length <= 8;
  }

  function pareceEncabezado(linea) {
    const clave = claveTexto(linea);

    const tieneNombre = palabrasNombre.some(function (palabra) {
      return clave.includes(claveTexto(palabra));
    });

    const tieneCarrera = palabrasCarrera.some(function (palabra) {
      return clave.includes(claveTexto(palabra));
    });

    const tienePromedio = palabrasPromedio.some(function (palabra) {
      return clave.includes(claveTexto(palabra));
    });

    return tienePromedio && (tieneNombre || tieneCarrera) && extraerPromedio(linea) === null;
  }

  function esLineaBasura(linea) {
    const clave = claveTexto(linea);

    if (/^[-_=*#]+$/.test(clave)) return true;
    if (/^\d+$/.test(clave)) return true;

    return palabrasBasuraLinea.some(function (palabra) {
      return clave === claveTexto(palabra);
    });
  }

  function quitarDuplicados(registros) {
    const mapa = {};

    return (registros || [])
      .filter(function (registro) {
        const clave = [
          claveTexto(registro.cedula),
          claveTexto(registro.carreraOriginal),
          claveTexto(registro.nombre),
          String(registro.promedio == null ? "" : registro.promedio)
        ].join("|");

        if (!clave.replace(/\|/g, "") || mapa[clave]) {
          return false;
        }

        mapa[clave] = true;
        return true;
      })
      .map(function (registro, index) {
        return {
          ...registro,
          indice: index
        };
      });
  }

  function limpiarCarrera(valor) {
    return limpiarTexto(valor)
      .replace(/^(carrera|programa|oferta|t[ií]tulo)\s*[:：-]\s*/i, "")
      .replace(/[.]+$/g, "")
      .trim();
  }

  function limpiarNombre(valor) {
    const limpio = limpiarTexto(valor)
      .replace(/^(nombre|estudiante|egresado|graduado|alumno)\s*[:：-]\s*/i, "")
      .replace(/\b(?:cc|c\.c\.|cedula|c[eé]dula)\b\s*[:：-]?\s*\d+/ig, "")
      .replace(/\b\d{10,13}\b/g, "")
      .replace(/[.]+$/g, "")
      .trim();

    if (U && typeof U.limpiarNombrePropio === "function") {
      return U.limpiarNombrePropio(limpio);
    }

    return limpio.toLocaleUpperCase("es-EC");
  }

  function convertirPromedio(valor) {
    if (valor === null || valor === undefined || valor === "") return null;

    if (U && typeof U.convertirPromedio === "function") {
      const convertido = U.convertirPromedio(valor);
      return Number.isFinite(Number(convertido)) ? Number(convertido) : null;
    }

    const texto = String(valor).replace(",", ".").replace(/[^0-9.-]/g, "");

    if (!texto) return null;

    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : null;
  }

  function limpiarTexto(valor) {
    if (U && typeof U.limpiarEspacios === "function") {
      return U.limpiarEspacios(valor);
    }

    return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim();
  }

  function claveTexto(valor) {
    if (U && typeof U.claveTexto === "function") {
      return U.claveTexto(valor);
    }

    return limpiarTexto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  }

  function normalizarSaltos(valor) {
    return String(valor == null ? "" : valor)
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");
  }

  function escaparRegExp(valor) {
    return String(valor || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  window.CertiText = {
    leerTexto
  };
})();