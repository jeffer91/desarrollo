/*
=========================================================
Nombre completo: certi.catalogo.js
Ruta o ubicación: /incorporaciones/certificados/certi.catalogo.js
Función o funciones:
- Leer carreras desde la base local de Requisitos.
- Usar ExcelLocalRepo si está disponible.
- Usar localStorage de Requisitos como respaldo directo.
- Mantener catálogo interno solo como respaldo.
- Normalizar carreras con regla institucional:
  * Enfermería = TÉCNICA SUPERIOR EN ENFERMERÍA.
  * Carreras universitarias = TECNOLOGÍA SUPERIOR UNIVERSITARIA EN ...
  * Las demás = TECNOLOGÍA SUPERIOR EN ...
- Corregir tildes y nombres institucionales:
  * GESTIÓN DEL TALENTO HUMANO.
  * SEGURIDAD CIUDADANA Y ORDEN PÚBLICO.
- Detectar carreras no reconocidas y permitir emparejamiento manual.
Con qué se une:
- certi.logic.js
- certi.render.js
- certi.storage.js
=========================================================
*/

(function () {
  "use strict";

  const U = window.CertiUtils;
  const STORAGE_REQUISITOS_SNAPSHOT = "itsqmet.requisitos.excel.snapshot";

  const camposCarrera = [
    "carrera",
    "Carrera",
    "CARRERA",
    "nombrecarrera",
    "nombreCarrera",
    "NombreCarrera",
    "NOMBRECARRERA",
    "NOMBRE CARRERA",
    "NOMBRE DE CARRERA",
    "nombre_carrera",
    "programa",
    "Programa",
    "PROGRAMA",
    "programaAcademico",
    "programa_academico",
    "PROGRAMA ACADÉMICO",
    "PROGRAMA ACADEMICO",
    "abreviatura_carrera",
    "abreviaturaCarrera",
    "carreraNombre"
  ];

  const camposCodigoCarrera = [
    "codigoCarrera",
    "CodigoCarrera",
    "codigo_carrera",
    "codigo",
    "Codigo",
    "CODIGO",
    "idCarrera",
    "carreraId"
  ];

  const camposTipoCarrera = [
    "tipoCarrera",
    "TipoCarrera",
    "tipo_carrera",
    "tipo",
    "Tipo",
    "TIPO",
    "nivel",
    "Nivel",
    "NIVEL",
    "nivelCarrera",
    "nivel_carrera",
    "grado",
    "Grado",
    "titulo",
    "Titulo",
    "Título",
    "categoria",
    "Categoría",
    "categoriaCarrera",
    "categoria_carrera"
  ];

  const basesCarreraControladas = [
    ["ENFERMERIA", "ENFERMERÍA"],
    ["ENFERMERÍA", "ENFERMERÍA"],

    ["ADMINISTRACION", "ADMINISTRACIÓN"],
    ["ADMINISTRACIÓN", "ADMINISTRACIÓN"],

    ["CONTABILIDAD", "CONTABILIDAD"],

    ["DESARROLLO DE SOFTWARE", "DESARROLLO DE SOFTWARE"],
    ["SOFTWARE", "DESARROLLO DE SOFTWARE"],

    ["EDUCACION BASICA", "EDUCACIÓN BÁSICA"],
    ["EDUCACIÓN BÁSICA", "EDUCACIÓN BÁSICA"],

    ["EDUCACION INICIAL", "EDUCACIÓN INICIAL"],
    ["EDUCACIÓN INICIAL", "EDUCACIÓN INICIAL"],

    ["ESTETICA INTEGRAL", "ESTÉTICA INTEGRAL"],
    ["ESTÉTICA INTEGRAL", "ESTÉTICA INTEGRAL"],

    ["MECANICA AUTOMOTRIZ", "MECÁNICA AUTOMOTRIZ"],
    ["MECÁNICA AUTOMOTRIZ", "MECÁNICA AUTOMOTRIZ"],

    ["REDES Y TELECOMUNICACIONES", "REDES Y TELECOMUNICACIONES"],

    ["PROCESAMIENTO DE ALIMENTOS", "PROCESAMIENTO DE ALIMENTOS"],
    ["ALIMENTOS", "PROCESAMIENTO DE ALIMENTOS"],

    ["SEGURIDAD CIUDADANA Y ORDEN PUBLICO", "SEGURIDAD CIUDADANA Y ORDEN PÚBLICO"],
    ["SEGURIDAD CIUDADANA Y ORDEN PÚBLICO", "SEGURIDAD CIUDADANA Y ORDEN PÚBLICO"],
    ["SEGURIDAD CIUDADANA ORDEN PUBLICO", "SEGURIDAD CIUDADANA Y ORDEN PÚBLICO"],
    ["SEGURIDAD CIUDADANA ORDEN PÚBLICO", "SEGURIDAD CIUDADANA Y ORDEN PÚBLICO"],
    ["SEGURIDAD CIUDADANA", "SEGURIDAD CIUDADANA Y ORDEN PÚBLICO"],

    ["SEGURIDAD Y PREVENCION DE RIESGOS LABORALES", "SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES"],
    ["SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES", "SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES"],
    ["RIESGOS LABORALES", "SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES"],

    ["ADMINISTRACION DE EMPRESAS E INTELIGENCIA DE NEGOCIOS", "ADMINISTRACIÓN DE EMPRESAS E INTELIGENCIA DE NEGOCIOS"],
    ["ADMINISTRACIÓN DE EMPRESAS E INTELIGENCIA DE NEGOCIOS", "ADMINISTRACIÓN DE EMPRESAS E INTELIGENCIA DE NEGOCIOS"],
    ["INTELIGENCIA DE NEGOCIOS", "ADMINISTRACIÓN DE EMPRESAS E INTELIGENCIA DE NEGOCIOS"],

    ["ADMINISTRACION DE TALENTO HUMANO", "ADMINISTRACIÓN DE TALENTO HUMANO"],
    ["ADMINISTRACIÓN DE TALENTO HUMANO", "ADMINISTRACIÓN DE TALENTO HUMANO"],

    ["GESTION DEL TALENTO HUMANO", "GESTIÓN DEL TALENTO HUMANO"],
    ["GESTIÓN DEL TALENTO HUMANO", "GESTIÓN DEL TALENTO HUMANO"],
    ["GESTION DE TALENTO HUMANO", "GESTIÓN DEL TALENTO HUMANO"],
    ["GESTIÓN DE TALENTO HUMANO", "GESTIÓN DEL TALENTO HUMANO"],
    ["GESTION TALENTO HUMANO", "GESTIÓN DEL TALENTO HUMANO"],
    ["GESTIÓN TALENTO HUMANO", "GESTIÓN DEL TALENTO HUMANO"],

    ["CONTABILIDAD Y TRIBUTACION", "CONTABILIDAD Y TRIBUTACIÓN"],
    ["CONTABILIDAD Y TRIBUTACIÓN", "CONTABILIDAD Y TRIBUTACIÓN"],

    ["VENTAS", "VENTAS"],

    ["MARKETING DIGITAL", "MARKETING DIGITAL"],
    ["MARKETING DIGITAL Y COMERCIO ELECTRONICO", "MARKETING DIGITAL Y COMERCIO ELECTRÓNICO"],
    ["MARKETING DIGITAL Y COMERCIO ELECTRÓNICO", "MARKETING DIGITAL Y COMERCIO ELECTRÓNICO"],
    ["MKT Y COMERCIO ELECTRONICO", "MARKETING DIGITAL Y COMERCIO ELECTRÓNICO"],
    ["MKT Y COMERCIO ELECTRÓNICO", "MARKETING DIGITAL Y COMERCIO ELECTRÓNICO"],

    ["PEDAGOGIA", "PEDAGOGÍA"],
    ["PEDAGOGÍA", "PEDAGOGÍA"],

    ["DISENO MULTIMEDIA", "DISEÑO MULTIMEDIA"],
    ["DISEÑO MULTIMEDIA", "DISEÑO MULTIMEDIA"]
  ];

  const carrerasRespaldo = [
    crearCarreraRespaldo("TS-ENF", "TÉCNICA SUPERIOR EN ENFERMERÍA", [
      "ENFERMERIA",
      "ENFERMERÍA",
      "TECNICA SUPERIOR EN ENFERMERIA",
      "TÉCNICA SUPERIOR EN ENFERMERÍA"
    ]),
    crearCarreraRespaldo("TS-ADM", "TECNOLOGÍA SUPERIOR EN ADMINISTRACIÓN", [
      "ADMINISTRACION",
      "ADMINISTRACIÓN"
    ]),
    crearCarreraRespaldo("TS-CONT", "TECNOLOGÍA SUPERIOR EN CONTABILIDAD", [
      "CONTABILIDAD"
    ]),
    crearCarreraRespaldo("TS-DES", "TECNOLOGÍA SUPERIOR EN DESARROLLO DE SOFTWARE", [
      "DESARROLLO DE SOFTWARE",
      "SOFTWARE"
    ]),
    crearCarreraRespaldo("TS-EDB", "TECNOLOGÍA SUPERIOR EN EDUCACIÓN BÁSICA", [
      "EDUCACION BASICA",
      "EDUCACIÓN BÁSICA"
    ]),
    crearCarreraRespaldo("TS-EDI", "TECNOLOGÍA SUPERIOR EN EDUCACIÓN INICIAL", [
      "EDUCACION INICIAL",
      "EDUCACIÓN INICIAL"
    ]),
    crearCarreraRespaldo("TS-EST", "TECNOLOGÍA SUPERIOR EN ESTÉTICA INTEGRAL", [
      "ESTETICA INTEGRAL",
      "ESTÉTICA INTEGRAL"
    ]),
    crearCarreraRespaldo("TS-MEC", "TECNOLOGÍA SUPERIOR EN MECÁNICA AUTOMOTRIZ", [
      "MECANICA AUTOMOTRIZ",
      "MECÁNICA AUTOMOTRIZ"
    ]),
    crearCarreraRespaldo("TS-RED", "TECNOLOGÍA SUPERIOR EN REDES Y TELECOMUNICACIONES", [
      "REDES Y TELECOMUNICACIONES"
    ]),
    crearCarreraRespaldo("TS-ALI", "TECNOLOGÍA SUPERIOR EN PROCESAMIENTO DE ALIMENTOS", [
      "PROCESAMIENTO DE ALIMENTOS",
      "ALIMENTOS"
    ]),
    crearCarreraRespaldo("TS-SEG", "TECNOLOGÍA SUPERIOR EN SEGURIDAD CIUDADANA Y ORDEN PÚBLICO", [
      "SEGURIDAD CIUDADANA",
      "SEGURIDAD CIUDADANA Y ORDEN PUBLICO",
      "SEGURIDAD CIUDADANA Y ORDEN PÚBLICO"
    ]),
    crearCarreraRespaldo("TS-RIE", "TECNOLOGÍA SUPERIOR EN SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES", [
      "RIESGOS LABORALES",
      "SEGURIDAD Y PREVENCION DE RIESGOS LABORALES",
      "SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES"
    ]),
    crearCarreraRespaldo("TS-GTH", "TECNOLOGÍA SUPERIOR EN GESTIÓN DEL TALENTO HUMANO", [
      "GESTION DEL TALENTO HUMANO",
      "GESTIÓN DEL TALENTO HUMANO",
      "GESTION DE TALENTO HUMANO",
      "TALENTO HUMANO"
    ]),
    crearCarreraRespaldo("TS-MCE", "TECNOLOGÍA SUPERIOR EN MARKETING DIGITAL Y COMERCIO ELECTRÓNICO", [
      "MARKETING DIGITAL Y COMERCIO ELECTRONICO",
      "MARKETING DIGITAL Y COMERCIO ELECTRÓNICO"
    ]),
    crearCarreraRespaldo("TSU-EDI", "TECNOLOGÍA SUPERIOR UNIVERSITARIA EN EDUCACIÓN INICIAL", [
      "TECNOLOGIA SUPERIOR UNIVERSITARIA EN EDUCACION INICIAL",
      "TECNOLOGÍA SUPERIOR UNIVERSITARIA EN EDUCACIÓN INICIAL"
    ]),
    crearCarreraRespaldo("TSU-RED", "TECNOLOGÍA SUPERIOR UNIVERSITARIA EN REDES Y TELECOMUNICACIONES", [
      "TECNOLOGIA SUPERIOR UNIVERSITARIA EN REDES Y TELECOMUNICACIONES",
      "TECNOLOGÍA SUPERIOR UNIVERSITARIA EN REDES Y TELECOMUNICACIONES"
    ]),
    crearCarreraRespaldo("TSU-AEI", "TECNOLOGÍA SUPERIOR UNIVERSITARIA EN ADMINISTRACIÓN DE EMPRESAS E INTELIGENCIA DE NEGOCIOS", [
      "ADMINISTRACION DE EMPRESAS E INTELIGENCIA DE NEGOCIOS",
      "ADMINISTRACIÓN DE EMPRESAS E INTELIGENCIA DE NEGOCIOS"
    ]),
    crearCarreraRespaldo("TSU-ATH", "TECNOLOGÍA SUPERIOR UNIVERSITARIA EN ADMINISTRACIÓN DE TALENTO HUMANO", [
      "ADMINISTRACION DE TALENTO HUMANO",
      "ADMINISTRACIÓN DE TALENTO HUMANO"
    ]),
    crearCarreraRespaldo("TSU-CTR", "TECNOLOGÍA SUPERIOR UNIVERSITARIA EN CONTABILIDAD Y TRIBUTACIÓN", [
      "CONTABILIDAD Y TRIBUTACION",
      "CONTABILIDAD Y TRIBUTACIÓN"
    ]),
    crearCarreraRespaldo("TSU-MKT", "TECNOLOGÍA SUPERIOR UNIVERSITARIA EN MARKETING DIGITAL", [
      "MARKETING DIGITAL"
    ]),
    crearCarreraRespaldo("TSU-PED", "TECNOLOGÍA SUPERIOR UNIVERSITARIA EN PEDAGOGÍA", [
      "PEDAGOGIA",
      "PEDAGOGÍA"
    ])
  ];

  function crearCarreraRespaldo(codigo, nombre, alias) {
    return {
      codigo,
      nombre,
      alias: alias || [],
      origen: "respaldo"
    };
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

  function esVacio(valor) {
    if (U && typeof U.esVacio === "function") {
      return U.esVacio(valor);
    }

    return limpiarTexto(valor) === "";
  }

  function crearCodigoDesdeNombre(nombre, index) {
    const base = claveTexto(nombre)
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24);

    return base ? `REQ-${base}` : `REQ-CARRERA-${index + 1}`;
  }

  function obtenerPrimerValor(objeto, campos) {
    const data = objeto || {};

    for (let i = 0; i < campos.length; i += 1) {
      const campo = campos[i];

      if (Object.prototype.hasOwnProperty.call(data, campo)) {
        const valor = limpiarTexto(data[campo]);

        if (valor) {
          return valor;
        }
      }
    }

    const keys = Object.keys(data);
    const mapa = {};

    keys.forEach(function (key) {
      mapa[claveTexto(key)] = key;
    });

    for (let j = 0; j < campos.length; j += 1) {
      const buscado = claveTexto(campos[j]);
      const realKey = mapa[buscado];

      if (realKey) {
        const valor = limpiarTexto(data[realKey]);

        if (valor) {
          return valor;
        }
      }
    }

    return "";
  }

  function extraerCarreraDeRegistro(registro) {
    return obtenerPrimerValor(registro, camposCarrera);
  }

  function extraerCodigoDeRegistro(registro) {
    return obtenerPrimerValor(registro, camposCodigoCarrera);
  }

  function extraerTipoDeRegistro(registro) {
    return obtenerPrimerValor(registro, camposTipoCarrera);
  }

  function quitarPrefijosCarrera(nombre) {
    let texto = limpiarTexto(nombre);

    texto = texto
      .replace(/\s*[|:;]\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const patrones = [
      /^TECNOLOG[IÍ]AS?\s+SUPERIORES?\s+UNIVERSITARIAS?\s+(EN\s+)?/i,
      /^TECNOLOG[IÍ]A\s+SUPERIOR\s+UNIVERSITARIA\s+(EN\s+)?/i,
      /^TECNOLOG[IÍ]AS?\s+UNIVERSITARIAS?\s+(EN\s+)?/i,
      /^TECNOLOG[IÍ]AS?\s+SUPERIORES?\s+(EN\s+)?/i,
      /^TECNOLOG[IÍ]A\s+SUPERIOR\s+(EN\s+)?/i,
      /^T[EÉ]CNIC[AO]\s+SUPERIOR\s+(EN\s+)?/i,
      /^UNIVERSITARIA\s+(EN\s+)?/i,
      /^SUPERIOR\s+UNIVERSITARIA\s+(EN\s+)?/i,
      /^SUPERIOR\s+(EN\s+)?/i
    ];

    let anterior = "";

    while (anterior !== texto) {
      anterior = texto;

      patrones.forEach(function (patron) {
        texto = texto.replace(patron, "");
      });

      texto = limpiarTexto(texto);
    }

    return texto;
  }

  function corregirBaseCarrera(base) {
    const limpia = limpiarTexto(base);
    const clave = claveTexto(limpia);

    if (!clave) {
      return "";
    }

    if (clave.includes("ENFERMERIA")) {
      return "ENFERMERÍA";
    }

    if (clave.includes("GESTION") && clave.includes("TALENTO")) {
      return "GESTIÓN DEL TALENTO HUMANO";
    }

    if (
      clave.includes("SEGURIDAD") &&
      clave.includes("CIUDADANA") &&
      (clave.includes("ORDEN") || clave.includes("PUBLICO"))
    ) {
      return "SEGURIDAD CIUDADANA Y ORDEN PÚBLICO";
    }

    const exacta = basesCarreraControladas.find(function (item) {
      return claveTexto(item[0]) === clave || claveTexto(item[1]) === clave;
    });

    if (exacta) {
      return exacta[1];
    }

    const aproximada = basesCarreraControladas
      .slice()
      .sort(function (a, b) {
        return claveTexto(b[0]).length - claveTexto(a[0]).length;
      })
      .find(function (item) {
        const claveBase = claveTexto(item[0]);
        const claveOficial = claveTexto(item[1]);

        return (
          claveBase.length >= 7 &&
          (
            clave.includes(claveBase) ||
            claveBase.includes(clave) ||
            clave.includes(claveOficial) ||
            claveOficial.includes(clave)
          )
        );
      });

    if (aproximada) {
      return aproximada[1];
    }

    return limpia.toLocaleUpperCase("es-EC");
  }

  function esCarreraEnfermeria(nombre, codigo, tipo) {
    const texto = claveTexto([nombre, codigo, tipo].join(" "));
    return texto.includes("ENFERMERIA") || texto.includes("ENF");
  }

  function esCarreraUniversitaria(nombre, codigo, tipo) {
    const texto = claveTexto([nombre, codigo, tipo].join(" "));

    return (
      texto.includes("UNIVERSITARIA") ||
      texto.includes("UNIVERSITARIO") ||
      texto.includes("UNIVERSITARIAS") ||
      texto.includes("UNIVERSITARIOS") ||
      texto.includes("TSU") ||
      texto.includes("TECNOLOGICO UNIVERSITARIO") ||
      texto.includes("TECNOLOGICA UNIVERSITARIA")
    );
  }

  function normalizarNombreCarreraInstitucional(nombreOriginal, codigo, tipo) {
    const original = limpiarTexto(nombreOriginal);
    const baseSinPrefijo = quitarPrefijosCarrera(original);
    const base = corregirBaseCarrera(baseSinPrefijo);

    if (!base) {
      return original.toLocaleUpperCase("es-EC");
    }

    if (esCarreraEnfermeria(original, codigo, tipo) || claveTexto(base) === "ENFERMERIA") {
      return "TÉCNICA SUPERIOR EN ENFERMERÍA";
    }

    if (esCarreraUniversitaria(original, codigo, tipo)) {
      return `TECNOLOGÍA SUPERIOR UNIVERSITARIA EN ${base}`;
    }

    return `TECNOLOGÍA SUPERIOR EN ${base}`;
  }

  function crearAliasCarrera(nombreOriginal, nombreOficial) {
    const base = quitarPrefijosCarrera(nombreOriginal);
    const baseCorregida = corregirBaseCarrera(base);

    const alias = [
      nombreOriginal,
      nombreOficial,
      base,
      baseCorregida
    ];

    if (claveTexto(baseCorregida).includes("GESTION") && claveTexto(baseCorregida).includes("TALENTO")) {
      alias.push("GESTION DEL TALENTO HUMANO");
      alias.push("GESTIÓN DEL TALENTO HUMANO");
      alias.push("GESTION DE TALENTO HUMANO");
      alias.push("TECNOLOGIA SUPERIOR EN GESTION DEL TALENTO HUMANO");
      alias.push("TECNOLOGÍA SUPERIOR EN GESTIÓN DEL TALENTO HUMANO");
    }

    if (claveTexto(baseCorregida).includes("SEGURIDAD") && claveTexto(baseCorregida).includes("CIUDADANA")) {
      alias.push("SEGURIDAD CIUDADANA");
      alias.push("SEGURIDAD CIUDADANA Y ORDEN PUBLICO");
      alias.push("SEGURIDAD CIUDADANA Y ORDEN PÚBLICO");
      alias.push("TECNOLOGIA SUPERIOR EN SEGURIDAD CIUDADANA Y ORDEN PUBLICO");
      alias.push("TECNOLOGÍA SUPERIOR EN SEGURIDAD CIUDADANA Y ORDEN PÚBLICO");
    }

    if (esCarreraEnfermeria(nombreOriginal, "", "")) {
      alias.push("ENFERMERIA");
      alias.push("ENFERMERÍA");
      alias.push("TECNICA SUPERIOR EN ENFERMERIA");
      alias.push("TÉCNICA SUPERIOR EN ENFERMERÍA");
    }

    const mapa = {};
    const limpios = [];

    alias.forEach(function (item) {
      const valor = limpiarTexto(item);
      const clave = claveTexto(valor);

      if (!valor || mapa[clave]) {
        return;
      }

      mapa[clave] = true;
      limpios.push(valor);
    });

    return limpios;
  }

  function leerEstudiantesDesdeExcelLocalRepo() {
    try {
      if (
        window.ExcelLocalBridge &&
        typeof window.ExcelLocalBridge.ensureReady === "function"
      ) {
        window.ExcelLocalBridge.ensureReady();
      }

      if (
        window.ExcelLocalRepo &&
        typeof window.ExcelLocalRepo.listAllStudents === "function"
      ) {
        return window.ExcelLocalRepo.listAllStudents() || [];
      }
    } catch (error) {
      console.warn("[CertiCatalogo] No se pudo leer ExcelLocalRepo:", error);
    }

    return [];
  }

  function leerSnapshotRequisitos() {
    try {
      const texto = window.localStorage.getItem(STORAGE_REQUISITOS_SNAPSHOT);

      if (!texto) {
        return null;
      }

      return JSON.parse(texto);
    } catch (error) {
      console.warn("[CertiCatalogo] No se pudo leer snapshot de Requisitos:", error);
      return null;
    }
  }

  function leerEstudiantesDesdeSnapshot() {
    const snapshot = leerSnapshotRequisitos();

    const byId =
      snapshot &&
      snapshot.scopes &&
      snapshot.scopes.excel &&
      snapshot.scopes.excel.collections &&
      snapshot.scopes.excel.collections.Estudiantes &&
      snapshot.scopes.excel.collections.Estudiantes.byId
        ? snapshot.scopes.excel.collections.Estudiantes.byId
        : {};

    return Object.keys(byId).map(function (id) {
      return byId[id];
    });
  }

  function obtenerCarrerasDesdeRequisitos() {
    const registros = [
      ...leerEstudiantesDesdeExcelLocalRepo(),
      ...leerEstudiantesDesdeSnapshot()
    ];

    const mapa = {};
    const carreras = [];

    registros.forEach(function (registro) {
      const nombreOriginal = limpiarTexto(extraerCarreraDeRegistro(registro));

      if (!nombreOriginal) {
        return;
      }

      const codigoRegistro = limpiarTexto(extraerCodigoDeRegistro(registro));
      const tipoRegistro = limpiarTexto(extraerTipoDeRegistro(registro));

      const nombreOficial = normalizarNombreCarreraInstitucional(
        nombreOriginal,
        codigoRegistro,
        tipoRegistro
      );

      const clave = claveTexto(nombreOficial);

      if (mapa[clave]) {
        return;
      }

      const carrera = {
        codigo: codigoRegistro || crearCodigoDesdeNombre(nombreOficial, carreras.length),
        nombre: nombreOficial,
        alias: crearAliasCarrera(nombreOriginal, nombreOficial),
        origen: "requisitos"
      };

      mapa[clave] = true;
      carreras.push(carrera);
    });

    carreras.sort(function (a, b) {
      return a.nombre.localeCompare(b.nombre, "es");
    });

    return carreras;
  }

  function obtenerCatalogoCompleto() {
    const carrerasRequisitos = obtenerCarrerasDesdeRequisitos();

    const catalogoBase = carrerasRequisitos.length
      ? carrerasRequisitos
      : carrerasRespaldo;

    const mapa = {};
    const catalogo = [];

    catalogoBase.forEach(function (carrera, index) {
      const nombreOficial = normalizarNombreCarreraInstitucional(
        carrera.nombre,
        carrera.codigo,
        carrera.origen
      );

      const clave = claveTexto(nombreOficial);

      if (mapa[clave]) {
        return;
      }

      mapa[clave] = true;

      catalogo.push({
        codigo: carrera.codigo || crearCodigoDesdeNombre(nombreOficial, index),
        nombre: nombreOficial,
        alias: crearAliasCarrera(carrera.nombre, nombreOficial).concat(carrera.alias || []),
        origen: carrera.origen || "catalogo"
      });
    });

    carrerasRespaldo.forEach(function (carrera, index) {
      const nombreOficial = normalizarNombreCarreraInstitucional(
        carrera.nombre,
        carrera.codigo,
        "respaldo"
      );

      const clave = claveTexto(nombreOficial);

      if (mapa[clave]) {
        return;
      }

      mapa[clave] = true;

      catalogo.push({
        codigo: carrera.codigo || crearCodigoDesdeNombre(nombreOficial, index),
        nombre: nombreOficial,
        alias: crearAliasCarrera(carrera.nombre, nombreOficial).concat(carrera.alias || []),
        origen: "respaldo"
      });
    });

    catalogo.sort(function (a, b) {
      return a.nombre.localeCompare(b.nombre, "es");
    });

    return catalogo;
  }

  function listar() {
    return obtenerCatalogoCompleto().map(function (carrera) {
      return {
        codigo: carrera.codigo,
        nombre: carrera.nombre,
        origen: carrera.origen || ""
      };
    });
  }

  function buscarPorNombreOficial(nombre) {
    const clave = claveTexto(nombre);
    const catalogo = obtenerCatalogoCompleto();

    if (!clave) {
      return null;
    }

    return catalogo.find(function (carrera) {
      if (claveTexto(carrera.nombre) === clave) {
        return true;
      }

      return (carrera.alias || []).some(function (alias) {
        return claveTexto(alias) === clave;
      });
    }) || null;
  }

  function buscarExacta(nombre) {
    const claveOriginal = claveTexto(nombre);
    const catalogo = obtenerCatalogoCompleto();

    return catalogo.find(function (carrera) {
      if (claveTexto(carrera.nombre) === claveOriginal) {
        return true;
      }

      return (carrera.alias || []).some(function (alias) {
        return claveTexto(alias) === claveOriginal;
      });
    }) || null;
  }

  function buscarAproximada(nombre) {
    const claveOriginal = claveTexto(nombre);
    const catalogo = obtenerCatalogoCompleto();

    if (!claveOriginal || claveOriginal.length < 6) {
      return null;
    }

    return catalogo.find(function (carrera) {
      const claveOficial = claveTexto(carrera.nombre);

      if (
        claveOficial.length >= 6 &&
        (
          claveOriginal.includes(claveOficial) ||
          claveOficial.includes(claveOriginal)
        )
      ) {
        return true;
      }

      return (carrera.alias || []).some(function (alias) {
        const claveAlias = claveTexto(alias);

        return (
          claveAlias.length >= 6 &&
          (
            claveOriginal.includes(claveAlias) ||
            claveAlias.includes(claveOriginal)
          )
        );
      });
    }) || null;
  }

  function normalizar(nombreExcel, emparejamientosManual) {
    const original = limpiarTexto(nombreExcel);

    if (esVacio(original)) {
      return {
        reconocida: false,
        original: "",
        oficial: "",
        codigo: "",
        requiereEmparejamiento: true,
        origen: "vacio"
      };
    }

    const manual = emparejamientosManual && emparejamientosManual[original];

    if (manual) {
      const carreraManual = buscarPorNombreOficial(manual);

      if (carreraManual) {
        const oficialManual = normalizarNombreCarreraInstitucional(
          carreraManual.nombre,
          carreraManual.codigo,
          carreraManual.origen
        );

        return {
          reconocida: true,
          original,
          oficial: oficialManual,
          codigo: carreraManual.codigo,
          requiereEmparejamiento: false,
          origen: "manual"
        };
      }
    }

    const exacta = buscarExacta(original);

    if (exacta) {
      const oficialExacta = normalizarNombreCarreraInstitucional(
        exacta.nombre,
        exacta.codigo,
        exacta.origen
      );

      return {
        reconocida: true,
        original,
        oficial: oficialExacta,
        codigo: exacta.codigo,
        requiereEmparejamiento: false,
        origen: exacta.origen || "catalogo"
      };
    }

    const aproximada = buscarAproximada(original);

    if (aproximada) {
      const oficialAproximada = normalizarNombreCarreraInstitucional(
        aproximada.nombre,
        aproximada.codigo,
        aproximada.origen
      );

      return {
        reconocida: true,
        original,
        oficial: oficialAproximada,
        codigo: aproximada.codigo,
        requiereEmparejamiento: false,
        origen: aproximada.origen === "requisitos" ? "requisitos_aproximado" : "aproximado"
      };
    }

    const baseCorregida = corregirBaseCarrera(quitarPrefijosCarrera(original));
    const claveBase = claveTexto(baseCorregida);

    if (
      claveBase.includes("GESTION") ||
      claveBase.includes("SEGURIDAD CIUDADANA") ||
      claveBase.includes("ENFERMERIA")
    ) {
      const oficialDirecta = normalizarNombreCarreraInstitucional(original, "", "");

      return {
        reconocida: true,
        original,
        oficial: oficialDirecta,
        codigo: crearCodigoDesdeNombre(oficialDirecta, 0),
        requiereEmparejamiento: false,
        origen: "correccion_directa"
      };
    }

    return {
      reconocida: false,
      original,
      oficial: "",
      codigo: "",
      requiereEmparejamiento: true,
      origen: "no_reconocida"
    };
  }

  function obtenerDiagnostico() {
    const carrerasRequisitos = obtenerCarrerasDesdeRequisitos();
    const carrerasUsadas = obtenerCatalogoCompleto();

    return {
      carrerasDesdeRequisitos: carrerasRequisitos.length,
      carrerasDisponibles: carrerasUsadas.length,
      fuente: carrerasRequisitos.length ? "requisitos" : "respaldo",
      storageKey: STORAGE_REQUISITOS_SNAPSHOT
    };
  }

  window.CertiCatalogo = {
    listar,
    normalizar,
    buscarPorNombreOficial,
    obtenerDiagnostico,
    normalizarNombreCarreraInstitucional
  };
})();