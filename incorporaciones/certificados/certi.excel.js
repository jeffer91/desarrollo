/*
=========================================================
Nombre completo: certi.excel.js
Ruta o ubicación: /incorporaciones/certificados/certi.excel.js
Función o funciones:
- Leer el Excel de mejores egresados cargado por el usuario.
- Leer todas las hojas del Excel, no solo la primera.
- Identificar columnas Carrera, Nombre, Promedio y FechaIncorporacion.
- Soportar celdas combinadas del Excel.
- Heredar la última carrera válida cuando las filas siguientes vienen con carrera vacía.
- Normalizar registros para el procesamiento interno del módulo.
- Evitar registros duplicados.
- Ignorar FechaIncorporacion para la generación del certificado.
Con qué se une:
- certi.html
- certi.index.html
- certi.app.js
- certi.logic.js
- certi.utils.js
=========================================================
*/

(function () {
  "use strict";

  const U = window.CertiUtils || {};

  const candidatosColumnas = {
    carrera: [
      "CARRERA",
      "NOMBRE CARRERA",
      "NOMBRE DE CARRERA",
      "CARRERA ESTUDIANTE",
      "CARRERA DEL ESTUDIANTE",
      "PROGRAMA",
      "PROGRAMA ACADÉMICO",
      "PROGRAMA ACADEMICO",
      "OFERTA",
      "OFERTA ACADÉMICA",
      "OFERTA ACADEMICA",
      "TITULO",
      "TÍTULO",
      "NOMBRE TITULO",
      "NOMBRE TÍTULO",
      "CARRERAS"
    ],
    nombre: [
      "NOMBRE",
      "NOMBRES",
      "ESTUDIANTE",
      "NOMBRE ESTUDIANTE",
      "NOMBRE DEL ESTUDIANTE",
      "APELLIDOS Y NOMBRES",
      "APELLIDOS Y NOMBRES DEL ESTUDIANTE",
      "NOMBRES COMPLETOS",
      "NOMBRE COMPLETO",
      "ALUMNO",
      "GRADUADO",
      "EGRESADO",
      "MEJOR EGRESADO"
    ],
    promedio: [
      "PROMEDIO",
      "NOTA",
      "CALIFICACION",
      "CALIFICACIÓN",
      "PROMEDIO FINAL",
      "NOTA FINAL",
      "PROMEDIO GENERAL",
      "PROMEDIO TOTAL",
      "PUNTAJE",
      "CALIFICACIÓN FINAL",
      "CALIFICACION FINAL",
      "PROMEDIO TITULACION",
      "PROMEDIO TITULACIÓN"
    ],
    fechaIncorporacion: [
      "FECHAINCORPORACION",
      "FECHA INCORPORACION",
      "FECHA DE INCORPORACION",
      "FECHA DE INCORPORACIÓN",
      "FECHA",
      "FECHA GRADUACION",
      "FECHA GRADUACIÓN",
      "FECHA TITULACION",
      "FECHA TITULACIÓN"
    ]
  };

  function leerArchivo(file) {
    return new Promise(function (resolve, reject) {
      if (!file) {
        reject(new Error("Debe cargar un archivo Excel."));
        return;
      }

      if (!window.XLSX) {
        reject(new Error("No se encontró la librería XLSX."));
        return;
      }

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

          if (!libro.SheetNames || libro.SheetNames.length === 0) {
            throw new Error("El Excel no contiene hojas.");
          }

          const lectura = leerTodasLasHojas(libro);

          resolve({
            nombreArchivo: file.name,
            hoja: lectura.hojasLeidas.join(", "),
            hojasLeidas: lectura.hojasLeidas,
            totalFilas: lectura.totalFilas,
            registros: lectura.registros
          });
        } catch (error) {
          reject(error);
        }
      };

      lector.onerror = function () {
        reject(new Error("No se pudo leer el archivo Excel."));
      };

      lector.readAsArrayBuffer(file);
    });
  }

  function leerTodasLasHojas(libro) {
    const registrosAcumulados = [];
    const hojasLeidas = [];
    let totalFilas = 0;
    let indiceGlobal = 0;

    libro.SheetNames.forEach(function (nombreHoja) {
      try {
        const hoja = libro.Sheets[nombreHoja];

        if (!hoja) return;

        const filas = convertirHojaAFilas(hoja);

        if (!Array.isArray(filas) || filas.length === 0) return;

        const columnas = detectarColumnas(filas[0]);

        if (!columnas.carrera || !columnas.nombre || !columnas.promedio) {
          console.warn(
            `[CertiExcel] Hoja omitida porque no se detectaron columnas completas: ${nombreHoja}`,
            columnas
          );
          return;
        }

        const registrosHoja = normalizarFilasConIndice(filas, nombreHoja, indiceGlobal);

        if (registrosHoja.length > 0) {
          hojasLeidas.push(nombreHoja);
          totalFilas += filas.length;
          registrosAcumulados.push(...registrosHoja);
          indiceGlobal += registrosHoja.length;
        }
      } catch (error) {
        console.warn(`[CertiExcel] No se pudo leer la hoja: ${nombreHoja}`, error);
      }
    });

    const registrosSinDuplicados = quitarDuplicados(registrosAcumulados);

    return {
      hojasLeidas,
      totalFilas,
      registros: registrosSinDuplicados
    };
  }

  function convertirHojaAFilas(hoja) {
    const hojaPreparada = completarCeldasCombinadas(hoja);

    const matriz = XLSX.utils.sheet_to_json(hojaPreparada, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false
    });

    if (!Array.isArray(matriz) || matriz.length === 0) {
      return [];
    }

    const indiceEncabezado = detectarFilaEncabezado(matriz);

    if (indiceEncabezado < 0) {
      return [];
    }

    return crearObjetosDesdeMatriz(matriz, indiceEncabezado);
  }

  function completarCeldasCombinadas(hoja) {
    const copia = Object.assign({}, hoja);

    if (!hoja || !Array.isArray(hoja["!merges"])) {
      return copia;
    }

    hoja["!merges"].forEach(function (rango) {
      const celdaOrigenRef = XLSX.utils.encode_cell({
        r: rango.s.r,
        c: rango.s.c
      });

      const celdaOrigen = hoja[celdaOrigenRef];

      if (!celdaOrigen) {
        return;
      }

      for (let r = rango.s.r; r <= rango.e.r; r += 1) {
        for (let c = rango.s.c; c <= rango.e.c; c += 1) {
          const celdaDestinoRef = XLSX.utils.encode_cell({ r, c });

          if (!copia[celdaDestinoRef]) {
            copia[celdaDestinoRef] = Object.assign({}, celdaOrigen);
          }
        }
      }
    });

    return copia;
  }

  function detectarFilaEncabezado(matriz) {
    let mejorIndice = -1;
    let mejorPuntaje = 0;
    const limite = Math.min(matriz.length, 30);

    for (let i = 0; i < limite; i += 1) {
      const encabezados = (matriz[i] || []).map(function (valor) {
        return limpiarTexto(valor);
      });

      const columnas = detectarColumnasDesdeEncabezados(encabezados);
      let puntaje = 0;

      if (columnas.carrera) puntaje += 3;
      if (columnas.nombre) puntaje += 3;
      if (columnas.promedio) puntaje += 3;
      if (columnas.fechaIncorporacion) puntaje += 1;

      const celdasConTexto = encabezados.filter(function (valor) {
        return !esVacio(valor);
      }).length;

      if (puntaje > mejorPuntaje && celdasConTexto >= 2) {
        mejorPuntaje = puntaje;
        mejorIndice = i;
      }

      if (columnas.carrera && columnas.nombre && columnas.promedio) {
        return i;
      }
    }

    return mejorPuntaje >= 9 ? mejorIndice : -1;
  }

  function crearObjetosDesdeMatriz(matriz, indiceEncabezado) {
    const encabezadosOriginales = matriz[indiceEncabezado] || [];
    const usados = {};
    const encabezados = encabezadosOriginales.map(function (encabezado, index) {
      return crearEncabezadoUnico(encabezado, index, usados);
    });

    const filas = [];

    for (let i = indiceEncabezado + 1; i < matriz.length; i += 1) {
      const filaArray = matriz[i] || [];
      const filaObjeto = {
        __filaExcel: i + 1
      };

      let tieneAlgunValor = false;

      encabezados.forEach(function (encabezado, index) {
        const valor = filaArray[index] == null ? "" : filaArray[index];

        if (!esVacio(valor)) {
          tieneAlgunValor = true;
        }

        filaObjeto[encabezado] = valor;
      });

      if (tieneAlgunValor) {
        filas.push(filaObjeto);
      }
    }

    return filas;
  }

  function crearEncabezadoUnico(encabezado, index, usados) {
    const base = limpiarTexto(encabezado) || `__COLUMNA_${index + 1}`;
    const claveBase = claveTexto(base);
    let nombre = base;
    let contador = 2;

    while (usados[claveTexto(nombre)]) {
      nombre = `${base}_${contador}`;
      contador += 1;
    }

    usados[claveTexto(nombre)] = true;

    if (!claveBase) {
      return `__COLUMNA_${index + 1}`;
    }

    return nombre;
  }

  function normalizarFilas(filas) {
    return normalizarFilasConIndice(filas, "", 0);
  }

  function normalizarFilasConIndice(filas, nombreHoja, indiceInicial) {
    if (!Array.isArray(filas) || filas.length === 0) return [];

    const columnas = detectarColumnas(filas[0]);
    let ultimaCarreraValida = "";

    return filas
      .map(function (fila, index) {
        const carreraRaw = obtenerValor(fila, columnas.carrera);
        const nombreRaw = obtenerValor(fila, columnas.nombre);
        const promedioRaw = obtenerValor(fila, columnas.promedio);
        const fechaIncorporacionRaw = obtenerValor(fila, columnas.fechaIncorporacion);

        const carreraLimpia = limpiarTexto(carreraRaw);
        const nombreLimpio = limpiarNombre(nombreRaw);
        const promedioTexto = limpiarTexto(promedioRaw);
        const promedioConvertido = convertirPromedio(promedioRaw);

        const tieneNombreOPromedio =
          !esVacio(nombreLimpio) ||
          !esVacio(promedioTexto) ||
          promedioConvertido !== null;

        if (!esVacio(carreraLimpia)) {
          ultimaCarreraValida = carreraLimpia;
        }

        const carreraFinal =
          esVacio(carreraLimpia) && tieneNombreOPromedio
            ? ultimaCarreraValida
            : carreraLimpia;

        return {
          indice: indiceInicial + index,
          filaExcel: fila.__filaExcel || index + 2,
          hojaExcel: nombreHoja || "",
          carreraOriginal: carreraFinal,
          nombre: nombreLimpio,
          promedioOriginal: promedioRaw,
          promedio: promedioConvertido,
          fechaIncorporacion: limpiarTexto(fechaIncorporacionRaw),
          raw: fila
        };
      })
      .filter(function (registro) {
        const tieneCarrera = !esVacio(registro.carreraOriginal);
        const tieneNombre = !esVacio(registro.nombre);
        const tienePromedioTexto = !esVacio(registro.promedioOriginal);
        const tienePromedioNumero = registro.promedio !== null && registro.promedio !== undefined;

        if (!tieneCarrera && !tieneNombre && !tienePromedioTexto && !tienePromedioNumero) {
          return false;
        }

        if (tieneCarrera && !tieneNombre && !tienePromedioTexto && !tienePromedioNumero) {
          return false;
        }

        return true;
      });
  }

  function detectarColumnas(filaEjemplo) {
    const encabezados = Object.keys(filaEjemplo || {}).filter(function (key) {
      return key.indexOf("__") !== 0;
    });

    return detectarColumnasDesdeEncabezados(encabezados);
  }

  function detectarColumnasDesdeEncabezados(encabezados) {
    return {
      carrera: buscarColumna(encabezados, candidatosColumnas.carrera),
      nombre: buscarColumna(encabezados, candidatosColumnas.nombre),
      promedio: buscarColumna(encabezados, candidatosColumnas.promedio),
      fechaIncorporacion: buscarColumna(encabezados, candidatosColumnas.fechaIncorporacion)
    };
  }

  function buscarColumna(encabezados, candidatos) {
    const listaEncabezados = (encabezados || []).filter(function (encabezado) {
      return !esVacio(encabezado);
    });

    const mapa = listaEncabezados.reduce(function (acc, encabezado) {
      acc[claveTexto(encabezado)] = encabezado;
      return acc;
    }, {});

    for (const candidato of candidatos) {
      const clave = claveTexto(candidato);

      if (mapa[clave]) return mapa[clave];
    }

    const encontrada = listaEncabezados.find(function (encabezado) {
      const claveEncabezado = claveTexto(encabezado);

      return candidatos.some(function (candidato) {
        const claveCandidato = claveTexto(candidato);

        return (
          claveEncabezado.length >= 4 &&
          claveCandidato.length >= 4 &&
          (
            claveEncabezado.includes(claveCandidato) ||
            claveCandidato.includes(claveEncabezado)
          )
        );
      });
    });

    return encontrada || "";
  }

  function obtenerValor(fila, columna) {
    if (!fila || !columna) return "";

    return fila[columna] == null ? "" : fila[columna];
  }

  function quitarDuplicados(registros) {
    const mapa = {};
    const limpios = [];

    registros.forEach(function (registro) {
      const clave = [
        claveTexto(registro.carreraOriginal),
        claveTexto(registro.nombre),
        String(registro.promedio == null ? "" : registro.promedio)
      ].join("|");

      if (mapa[clave]) return;

      mapa[clave] = true;
      limpios.push(registro);
    });

    return limpios.map(function (registro, index) {
      return {
        ...registro,
        indice: index
      };
    });
  }

  function limpiarTexto(valor) {
    try {
      if (U && typeof U.limpiarEspacios === "function") {
        return U.limpiarEspacios(valor);
      }
    } catch (error) {
      console.warn("[CertiExcel] Error en limpiarEspacios:", error);
    }

    return String(valor == null ? "" : valor)
      .replace(/\s+/g, " ")
      .trim();
  }

  function limpiarNombre(valor) {
    try {
      if (U && typeof U.limpiarNombrePropio === "function") {
        return U.limpiarNombrePropio(valor);
      }
    } catch (error) {
      console.warn("[CertiExcel] Error en limpiarNombrePropio:", error);
    }

    return limpiarTexto(valor).toLocaleUpperCase("es-EC");
  }

  function claveTexto(valor) {
    try {
      if (U && typeof U.claveTexto === "function") {
        return U.claveTexto(valor);
      }
    } catch (error) {
      console.warn("[CertiExcel] Error en claveTexto:", error);
    }

    return limpiarTexto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  }

  function esVacio(valor) {
    try {
      if (U && typeof U.esVacio === "function") {
        return U.esVacio(valor);
      }
    } catch (error) {
      console.warn("[CertiExcel] Error en esVacio:", error);
    }

    return limpiarTexto(valor) === "";
  }

  function convertirPromedio(valor) {
    try {
      if (U && typeof U.convertirPromedio === "function") {
        const convertido = U.convertirPromedio(valor);

        if (convertido === null || convertido === undefined || Number.isNaN(convertido)) {
          return null;
        }

        return convertido;
      }
    } catch (error) {
      console.warn("[CertiExcel] Error en convertirPromedio:", error);
    }

    const texto = limpiarTexto(valor)
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");

    if (!texto) {
      return null;
    }

    const numero = Number(texto);

    return Number.isFinite(numero) ? numero : null;
  }

  window.CertiExcel = {
    leerArchivo,
    normalizarFilas
  };
})();