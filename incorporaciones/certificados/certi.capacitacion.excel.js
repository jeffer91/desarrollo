/*
=========================================================
Nombre completo: certi.capacitacion.excel.js
Ruta o ubicación: /incorporaciones/certificados/certi.capacitacion.excel.js
Función o funciones:
- Leer Excel de certificados de capacitación docente.
- Detectar columnas de cargo, cédula, docente, curso/tema, nota, horas y fecha.
- Soportar el formato real: Cargo | Nombre | capacitación | Calificación.
- Evitar coincidencias falsas como tomar Nombre como Nombre del curso.
Con qué se une:
- certi.capacitacion.js
- certi.capacitacion.logic.js
- certi.utils.js
=========================================================
*/

(function () {
  "use strict";

  const U = window.CertiUtils || {};
  const TIPO_CAPACITACION = "capacitacion";

  const candidatosColumnas = {
    cargo: ["CARGO", "ROL", "FUNCION", "FUNCIÓN", "PUESTO", "TIPO", "PERFIL"],
    cedula: ["CEDULA", "CÉDULA", "N. CEDULA", "N° CEDULA", "NRO CEDULA", "NUMERO CEDULA", "IDENTIFICACION", "IDENTIFICACIÓN", "DOCUMENTO", "DNI"],
    docente: ["DOCENTE", "NOMBRE DOCENTE", "NOMBRE DEL DOCENTE", "PARTICIPANTE", "NOMBRE PARTICIPANTE", "NOMBRE", "NOMBRES", "NOMBRE COMPLETO", "APELLIDOS Y NOMBRES"],
    curso: ["CURSO", "TEMA", "NOMBRE DEL CURSO", "NOMBRE CURSO", "CAPACITACION", "CAPACITACIÓN", "TEMA DE CAPACITACION", "TEMA DE CAPACITACIÓN", "EVENTO", "MODULO", "MÓDULO"],
    nota: ["NOTA", "NOTA FINAL", "CALIFICACION", "CALIFICACIÓN", "CALIFICACION FINAL", "CALIFICACIÓN FINAL", "PUNTAJE", "PROMEDIO"],
    horas: ["HORAS", "HORA", "DURACION", "DURACIÓN", "INTENSIDAD", "CARGA HORARIA", "NUMERO DE HORAS", "NÚMERO DE HORAS"],
    fecha: ["FECHA", "FECHA CURSO", "FECHA DEL CURSO", "FECHA CAPACITACION", "FECHA CAPACITACIÓN", "FECHA EMISION", "FECHA EMISIÓN"]
  };

  async function leerArchivo(file) {
    if (!file) throw new Error("Debe cargar el Excel de capacitación docente.");
    if (!window.XLSX) throw new Error("No se encontró la librería XLSX para leer Excel.");

    const libro = await leerLibro(file);
    const procesado = leerHojas(libro);

    return {
      nombreArchivo: file.name,
      hoja: procesado.hojasLeidas.join(", ") || "Excel de capacitación",
      hojasLeidas: procesado.hojasLeidas,
      totalFilas: procesado.totalFilas,
      registros: procesado.registros,
      alertas: construirAlertas(procesado, file.name),
      origen: TIPO_CAPACITACION,
      fuente: "excel"
    };
  }

  function leerLibro(file) {
    return new Promise(function (resolve, reject) {
      const lector = new FileReader();

      lector.onload = function (evento) {
        try {
          const datos = new Uint8Array(evento.target.result);
          const libro = XLSX.read(datos, {
            type: "array",
            cellDates: false,
            cellNF: false,
            cellText: false
          });

          if (!libro.SheetNames || !libro.SheetNames.length) {
            throw new Error("El Excel no contiene hojas.");
          }

          resolve(libro);
        } catch (error) {
          reject(error);
        }
      };

      lector.onerror = function () {
        reject(new Error("No se pudo leer el archivo Excel de capacitación."));
      };

      lector.readAsArrayBuffer(file);
    });
  }

  function leerHojas(libro) {
    const registros = [];
    const hojasLeidas = [];
    let totalFilas = 0;
    let hojasOmitidas = 0;
    let indiceGlobal = 0;

    libro.SheetNames.forEach(function (nombreHoja) {
      const hoja = libro.Sheets[nombreHoja];
      if (!hoja) return;

      const filas = XLSX.utils.sheet_to_json(hoja, {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false
      });

      if (!Array.isArray(filas) || !filas.length) return;

      const lectura = leerHoja(filas, nombreHoja, indiceGlobal);

      if (!lectura.registros.length) {
        hojasOmitidas += 1;
        return;
      }

      registros.push(...lectura.registros);
      hojasLeidas.push(nombreHoja);
      totalFilas += lectura.totalFilas;
      indiceGlobal += lectura.registros.length;
    });

    const registrosSinDuplicados = quitarDuplicados(registros);

    return {
      registros: registrosSinDuplicados,
      hojasLeidas,
      totalFilas,
      hojasOmitidas,
      duplicados: registros.length - registrosSinDuplicados.length
    };
  }

  function leerHoja(filas, nombreHoja, indiceInicial) {
    const encabezado = detectarFilaEncabezado(filas);

    if (!encabezado) {
      return { registros: [], totalFilas: filas.length };
    }

    const registros = [];

    for (let i = encabezado.indice + 1; i < filas.length; i += 1) {
      const fila = filas[i] || [];
      const registro = normalizarFila(fila, encabezado.columnas, nombreHoja, i, indiceInicial + registros.length);
      if (registro.__vacia) continue;
      registros.push(registro);
    }

    return {
      registros,
      totalFilas: Math.max(0, filas.length - encabezado.indice - 1)
    };
  }

  function detectarFilaEncabezado(filas) {
    const limite = Math.min(filas.length, 30);
    let mejor = null;

    for (let i = 0; i < limite; i += 1) {
      const fila = (filas[i] || []).map(limpiarTexto);
      const columnas = detectarColumnas(fila);
      const puntaje = puntuarColumnas(columnas);

      if (!mejor || puntaje > mejor.puntaje) {
        mejor = { indice: i, columnas, puntaje };
      }

      if (puntaje >= 9) return mejor;
    }

    return mejor && mejor.puntaje >= 8 ? mejor : null;
  }

  function detectarColumnas(encabezados) {
    return {
      cargo: buscarIndiceColumna(encabezados, candidatosColumnas.cargo),
      cedula: buscarIndiceColumna(encabezados, candidatosColumnas.cedula),
      docente: buscarIndiceColumna(encabezados, candidatosColumnas.docente),
      curso: buscarIndiceColumna(encabezados, candidatosColumnas.curso),
      nota: buscarIndiceColumna(encabezados, candidatosColumnas.nota),
      horas: buscarIndiceColumna(encabezados, candidatosColumnas.horas),
      fecha: buscarIndiceColumna(encabezados, candidatosColumnas.fecha)
    };
  }

  function puntuarColumnas(columnas) {
    let puntos = 0;
    if (columnas.cargo >= 0) puntos += 1;
    if (columnas.cedula >= 0) puntos += 1;
    if (columnas.docente >= 0) puntos += 3;
    if (columnas.curso >= 0) puntos += 3;
    if (columnas.nota >= 0) puntos += 2;
    if (columnas.horas >= 0) puntos += 1;
    if (columnas.fecha >= 0) puntos += 1;
    return puntos;
  }

  function buscarIndiceColumna(encabezados, candidatos) {
    const claves = (encabezados || []).map(claveTexto);

    const coincidenciaExacta = buscarPorCoincidenciaExacta(claves, candidatos);
    if (coincidenciaExacta >= 0) return coincidenciaExacta;

    return buscarPorContenidoSeguro(claves, candidatos);
  }

  function buscarPorCoincidenciaExacta(claves, candidatos) {
    for (let i = 0; i < claves.length; i += 1) {
      const clave = claves[i];
      if (!clave) continue;

      const coincide = candidatos.some(function (candidato) {
        return clave === claveTexto(candidato);
      });

      if (coincide) return i;
    }

    return -1;
  }

  function buscarPorContenidoSeguro(claves, candidatos) {
    for (let i = 0; i < claves.length; i += 1) {
      const clave = claves[i];
      if (!clave) continue;

      const coincide = candidatos.some(function (candidato) {
        const claveCandidato = claveTexto(candidato);
        if (!claveCandidato) return false;

        return clave.includes(claveCandidato);
      });

      if (coincide) return i;
    }

    return -1;
  }

  function normalizarFila(fila, columnas, nombreHoja, indexFila, indice) {
    const cargo = limpiarTexto(obtenerCelda(fila, columnas.cargo));
    const cedula = limpiarCedula(obtenerCelda(fila, columnas.cedula));
    const docente = limpiarNombre(obtenerCelda(fila, columnas.docente));
    const curso = limpiarTexto(obtenerCelda(fila, columnas.curso));
    const notaOriginal = obtenerCelda(fila, columnas.nota);
    const nota = convertirNota(notaOriginal);
    const horas = convertirHoras(obtenerCelda(fila, columnas.horas));
    const fechaCurso = limpiarTexto(obtenerCelda(fila, columnas.fecha));

    const vacia = [cargo, cedula, docente, curso, limpiarTexto(notaOriginal), horas, fechaCurso].every(function (valor) {
      return limpiarTexto(valor) === "";
    });

    return {
      tipoCertificado: TIPO_CAPACITACION,
      indice,
      filaExcel: indexFila + 1,
      hojaExcel: nombreHoja || "",
      cargo,
      cedula,
      nombre: docente,
      docente,
      curso,
      tema: curso,
      nota,
      notaOriginal,
      promedio: nota,
      promedioOriginal: notaOriginal,
      horas,
      fechaCurso,
      carreraOriginal: curso,
      carreraOficial: curso,
      estadoCertificado: "pendiente_validacion",
      requiereAccion: false,
      raw: {
        cargo: obtenerCelda(fila, columnas.cargo),
        cedula: obtenerCelda(fila, columnas.cedula),
        docente: obtenerCelda(fila, columnas.docente),
        curso: obtenerCelda(fila, columnas.curso),
        nota: obtenerCelda(fila, columnas.nota),
        horas: obtenerCelda(fila, columnas.horas),
        fecha: obtenerCelda(fila, columnas.fecha)
      },
      __vacia: vacia
    };
  }

  function obtenerCelda(fila, indice) {
    if (indice === undefined || indice === null || indice < 0) return "";
    return fila[indice] == null ? "" : fila[indice];
  }

  function construirAlertas(procesado, nombreArchivo) {
    const alertas = [
      {
        tipo: "info",
        titulo: "Fuente de datos",
        mensaje: `Excel de capacitación: ${nombreArchivo || "archivo cargado"}`
      }
    ];

    if (procesado.registros.length > 0) {
      alertas.push({
        tipo: "success",
        titulo: "Excel leído",
        mensaje: `Se detectaron ${procesado.registros.length} fila(s) de capacitación.`
      });
    } else {
      alertas.push({
        tipo: "warning",
        titulo: "Sin datos detectados",
        mensaje: "No se encontraron columnas suficientes para capacitación: nombre, capacitación y calificación."
      });
    }

    if (procesado.duplicados > 0) {
      alertas.push({
        tipo: "info",
        titulo: "Duplicados omitidos",
        mensaje: `${procesado.duplicados} registro(s) duplicados fueron ignorados.`
      });
    }

    if (procesado.hojasOmitidas > 0) {
      alertas.push({
        tipo: "warning",
        titulo: "Hojas omitidas",
        mensaje: `${procesado.hojasOmitidas} hoja(s) no tenían encabezados reconocibles de capacitación.`
      });
    }

    return alertas;
  }

  function quitarDuplicados(registros) {
    const mapa = {};
    const salida = [];

    (registros || []).forEach(function (registro) {
      const clave = [registro.cargo, registro.cedula, registro.docente, registro.curso, registro.nota].map(claveTexto).join("|");
      if (mapa[clave]) return;
      mapa[clave] = true;
      salida.push(registro);
    });

    return salida.map(function (registro, index) {
      return Object.assign({}, registro, { indice: index });
    });
  }

  function convertirNota(valor) {
    if (valor === null || valor === undefined || String(valor).trim() === "") return null;

    const texto = String(valor).replace(",", ".").replace(/[^0-9.-]/g, "");
    if (!texto) return null;

    let numero = Number(texto);
    if (!Number.isFinite(numero)) return null;

    if (numero > 10 && numero <= 100) {
      numero = numero / 10;
    } else if (numero > 100 && numero < 1000000) {
      numero = numero / 1000;
    }

    if (numero < 0 || numero > 10) return null;
    return Number(numero.toFixed(2));
  }

  function convertirHoras(valor) {
    const texto = limpiarTexto(valor).replace(",", ".").replace(/[^0-9.]/g, "");
    if (!texto) return "";

    const numero = Number(texto);
    if (!Number.isFinite(numero) || numero <= 0) return "";

    if (Number.isInteger(numero)) return String(numero);
    return String(Number(numero.toFixed(1)));
  }

  function limpiarCedula(valor) {
    return limpiarTexto(valor).replace(/[^0-9A-Za-z-]/g, "").toUpperCase();
  }

  function limpiarNombre(valor) {
    if (U && typeof U.limpiarNombrePropio === "function") return U.limpiarNombrePropio(valor);
    return limpiarTexto(valor).toUpperCase();
  }

  function limpiarTexto(valor) {
    if (U && typeof U.limpiarEspacios === "function") return U.limpiarEspacios(valor);
    return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim();
  }

  function claveTexto(valor) {
    if (U && typeof U.claveTexto === "function") return U.claveTexto(valor);

    return limpiarTexto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9Ñ ]/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  window.CertiCapacitacionExcel = {
    leerArchivo,
    leerHojas,
    convertirNota,
    convertirHoras,
    candidatosColumnas
  };
})();
