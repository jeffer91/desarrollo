/*
Nombre completo: database.js
Ruta o ubicación: /incorporaciones-app/js/database.js

Función o funciones:
1. Normalizar textos para evitar errores por espacios, tildes o mayúsculas.
2. Limpiar cédulas.
3. Crear IDs seguros para Firestore.
4. Leer períodos desde Firebase.
5. Leer períodos activos para consulta estudiantil.
6. Buscar estudiantes por cédula dentro de los períodos activos.
7. Leer estudiantes por período.
8. Guardar o actualizar estudiantes desde Excel usando el período seleccionado en pantalla.
9. Validar si un estudiante está habilitado.
10. Obtener requisitos pendientes en formato compacto.
*/

function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarTextoFlexible(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function limpiarCedula(valor) {
  return String(valor || "")
    .trim()
    .replace(/\D/g, "");
}

function normalizarCedulaSistema(valor) {
  const cedula = limpiarCedula(valor);

  if (cedula.length === 9) {
    // Corrección: recupera el 0 inicial perdido por Excel antiguo exportado como HTML/XLS.
    // Evita tratar 750687964 y 0750687964 como estudiantes distintos.
    // Mantiene una sola clave lógica de cédula dentro del sistema.
    return `0${cedula}`;
  }

  return cedula;
}

function obtenerFechaISO() {
  return new Date().toISOString();
}

function obtenerFechaLocalCorta() {
  const fecha = new Date();
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function limpiarIdFirestore(valor) {
  return String(valor || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function generarIdEstudiantePeriodo(cedula, periodoId) {
  const cedulaLimpia = normalizarCedulaSistema(cedula);
  const periodoSeguro = limpiarIdFirestore(periodoId);
  return `${cedulaLimpia}_${periodoSeguro}`;
}

function obtenerModalidadDesdeCarrera(nombreCarrera) {
  const carrera = normalizarTexto(nombreCarrera);

  if (
    carrera.includes("ONLINE") ||
    carrera.includes("VIRTUAL") ||
    carrera.includes("EN LINEA")
  ) {
    return "ONLINE";
  }

  return "PRESENCIAL";
}

function obtenerNumeroOrdenPeriodo(periodo) {
  if (!periodo) {
    return 0;
  }

  const ordenDirecto =
    periodo.ordenPeriodo ||
    periodo.orden ||
    periodo.numeroOrden ||
    periodo.creadoEn ||
    periodo.fechaCreacion ||
    "";

  if (typeof ordenDirecto === "number") {
    return ordenDirecto;
  }

  const texto = String(ordenDirecto || periodo.label || periodo.id || "");
  const numeros = texto.match(/\d+/g);

  if (!numeros || numeros.length === 0) {
    return 0;
  }

  return Number(numeros.join("").slice(0, 12)) || 0;
}

function compararPeriodosMasActuales(a, b) {
  const ordenA = obtenerNumeroOrdenPeriodo(a);
  const ordenB = obtenerNumeroOrdenPeriodo(b);

  if (ordenA !== ordenB) {
    return ordenB - ordenA;
  }

  return String(b.label || b.id || "").localeCompare(
    String(a.label || a.id || ""),
    "es"
  );
}

function estudianteEstaHabilitado(estudiante) {
  if (!estudiante) {
    return false;
  }

  return APP_CONFIG.camposCumplimiento.every(function (campo) {
    return normalizarTexto(estudiante[campo]) === "CUMPLE";
  });
}

function compararEstudiantesDuplicados(a, b) {
  const habilitadoA = estudianteEstaHabilitado(a) ? 1 : 0;
  const habilitadoB = estudianteEstaHabilitado(b) ? 1 : 0;

  if (habilitadoA !== habilitadoB) {
    // Corrección: si existe un duplicado habilitado, se prioriza sobre el no habilitado.
    // Evita que un registro viejo con Financiero pendiente reemplace al actualizado.
    // Esto corrige duplicados causados por cédulas con y sin cero inicial.
    return habilitadoB - habilitadoA;
  }

  return String(b.actualizadoEn || b.ultimaSincronizacion || "").localeCompare(
    String(a.actualizadoEn || a.ultimaSincronizacion || "")
  );
}

function obtenerRequisitosPendientes(estudiante) {
  if (!estudiante) {
    return APP_CONFIG.camposCumplimiento.map(function (campo) {
      return {
        campo: campo,
        nombre: APP_CONFIG.nombresRequisitos[campo] || campo,
        valor: "SIN REGISTRO"
      };
    });
  }

  return APP_CONFIG.camposCumplimiento
    .filter(function (campo) {
      return normalizarTexto(estudiante[campo]) !== "CUMPLE";
    })
    .map(function (campo) {
      return {
        campo: campo,
        nombre: APP_CONFIG.nombresRequisitos[campo] || campo,
        valor: estudiante[campo] || "SIN REGISTRO"
      };
    });
}

function obtenerRequisitosPendientesTexto(estudiante) {
  const pendientes = obtenerRequisitosPendientes(estudiante);

  if (pendientes.length === 0) {
    return "";
  }

  return pendientes
    .map(function (item) {
      return item.nombre;
    })
    .join(", ");
}

async function obtenerPeriodosFirebase() {
  const snapshot = await db
    .collection(APP_COLLECTIONS.periodos)
    .get();

  const periodos = [];

  snapshot.forEach(function (doc) {
    const data = doc.data() || {};

    periodos.push({
      docId: doc.id,
      id: data.id || doc.id,
      label: data.label || data.nombre || data.id || doc.id,
      activoConsulta: data.activoConsulta === true,
      creadoEn: data.creadoEn || data.fechaCreacion || "",
      ordenPeriodo: data.ordenPeriodo || data.orden || "",
      raw: data
    });
  });

  periodos.sort(compararPeriodosMasActuales);

  return periodos;
}

async function obtenerPeriodosActivosConsulta() {
  const periodos = await obtenerPeriodosFirebase();

  return periodos
    .filter(function (periodo) {
      return periodo.activoConsulta === true;
    })
    .sort(compararPeriodosMasActuales);
}

async function obtenerPeriodoPorId(periodoId) {
  const periodos = await obtenerPeriodosFirebase();

  return (
    periodos.find(function (periodo) {
      return String(periodo.id) === String(periodoId);
    }) || null
  );
}

async function obtenerEstudiantesPorPeriodo(periodoId) {
  if (!periodoId) {
    throw new Error("Debe seleccionar un período.");
  }

  const snapshot = await db
    .collection(APP_COLLECTIONS.estudiantes)
    .where("periodoId", "==", periodoId)
    .get();

  const estudiantesPorCedula = {};

  snapshot.forEach(function (doc) {
    const estudiante = {
      id: doc.id,
      docId: doc.id,
      ...doc.data()
    };

    const cedulaNormalizada = normalizarCedulaSistema(
      obtenerCedulaEstudiante(estudiante)
    );

    if (!cedulaNormalizada) {
      return;
    }

    if (!estudiantesPorCedula[cedulaNormalizada]) {
      estudiantesPorCedula[cedulaNormalizada] = [];
    }

    // Corrección: agrupa duplicados de la misma cédula lógica.
    // Evita mostrar dos filas cuando el Excel antiguo guardó una cédula sin 0 inicial.
    // La selección final se hace después priorizando habilitados y registros recientes.
    estudiantesPorCedula[cedulaNormalizada].push({
      ...estudiante,
      cedula: cedulaNormalizada,
      numeroIdentificacion: cedulaNormalizada
    });
  });

  const estudiantes = Object.keys(estudiantesPorCedula).map(function (cedula) {
    const duplicados = estudiantesPorCedula[cedula];

    duplicados.sort(compararEstudiantesDuplicados);

    return duplicados[0];
  });

  estudiantes.sort(function (a, b) {
    return String(a.Nombres || "").localeCompare(String(b.Nombres || ""), "es");
  });

  return estudiantes;
}

async function buscarEstudiantesPorCedulaYPeriodo(cedula, periodoId) {
  const cedulaLimpia = normalizarCedulaSistema(cedula);

  if (!cedulaLimpia) {
    throw new Error("Debe ingresar una cédula válida.");
  }

  if (!periodoId) {
    throw new Error("Debe existir un período seleccionado.");
  }

  const resultados = [];
  const vistos = new Set();

  const consultaNumero = await db
    .collection(APP_COLLECTIONS.estudiantes)
    .where("numeroIdentificacion", "==", cedulaLimpia)
    .where("periodoId", "==", periodoId)
    .get();

  consultaNumero.forEach(function (doc) {
    vistos.add(doc.id);
    resultados.push({
      id: doc.id,
      docId: doc.id,
      ...doc.data()
    });
  });

  const consultaCedula = await db
    .collection(APP_COLLECTIONS.estudiantes)
    .where("cedula", "==", cedulaLimpia)
    .where("periodoId", "==", periodoId)
    .get();

  consultaCedula.forEach(function (doc) {
    if (!vistos.has(doc.id)) {
      vistos.add(doc.id);
      resultados.push({
        id: doc.id,
        docId: doc.id,
        ...doc.data()
      });
    }
  });

  const cedulaSinCero = cedulaLimpia.length === 10 && cedulaLimpia.startsWith("0")
    ? cedulaLimpia.substring(1)
    : "";

  if (cedulaSinCero) {
    // Corrección: también busca documentos ya creados con la cédula de 9 dígitos.
    // Evita perder registros antiguos generados por el Excel HTML/XLS.
    // Estos resultados luego se ordenan para priorizar el registro habilitado.
    const consultaNumeroSinCero = await db
      .collection(APP_COLLECTIONS.estudiantes)
      .where("numeroIdentificacion", "==", cedulaSinCero)
      .where("periodoId", "==", periodoId)
      .get();

    consultaNumeroSinCero.forEach(function (doc) {
      if (!vistos.has(doc.id)) {
        vistos.add(doc.id);
        resultados.push({
          id: doc.id,
          docId: doc.id,
          ...doc.data()
        });
      }
    });

    const consultaCedulaSinCero = await db
      .collection(APP_COLLECTIONS.estudiantes)
      .where("cedula", "==", cedulaSinCero)
      .where("periodoId", "==", periodoId)
      .get();

    consultaCedulaSinCero.forEach(function (doc) {
      if (!vistos.has(doc.id)) {
        vistos.add(doc.id);
        resultados.push({
          id: doc.id,
          docId: doc.id,
          ...doc.data()
        });
      }
    });
  }

  const docAntiguo = await db
    .collection(APP_COLLECTIONS.estudiantes)
    .doc(cedulaLimpia)
    .get();

  if (docAntiguo.exists && !vistos.has(docAntiguo.id)) {
    const data = docAntiguo.data() || {};

    if (String(data.periodoId || "") === String(periodoId)) {
      resultados.push({
        id: docAntiguo.id,
        docId: docAntiguo.id,
        ...data
      });
    }
  }

  resultados.sort(compararEstudiantesDuplicados);

  return resultados;
}

async function buscarEstudiantePorCedulaEnPeriodosActivos(cedula) {
  const cedulaLimpia = normalizarCedulaSistema(cedula);

  if (!cedulaLimpia) {
    throw new Error("Debe ingresar una cédula válida.");
  }

  const periodosActivos = await obtenerPeriodosActivosConsulta();

  if (periodosActivos.length === 0) {
    throw new Error(
      "No existe ningún período habilitado para consulta estudiantil. Contacte con el Coordinador de Titulación."
    );
  }

  for (const periodo of periodosActivos) {
    const encontrados = await buscarEstudiantesPorCedulaYPeriodo(
      cedulaLimpia,
      periodo.id
    );

    if (encontrados.length > 0) {
      const estudiante = encontrados[0];

      return {
        estudiante: estudiante,
        periodo: periodo,
        todosLosPeriodosActivos: periodosActivos
      };
    }
  }

  return {
    estudiante: null,
    periodo: null,
    todosLosPeriodosActivos: periodosActivos
  };
}

async function buscarEstudiantePorCedula(cedula) {
  const resultado = await buscarEstudiantePorCedulaEnPeriodosActivos(cedula);
  return resultado.estudiante;
}

function prepararEstudianteParaGuardar(estudiante, periodoId) {
  const cedula = normalizarCedulaSistema(
    estudiante.numeroIdentificacion ||
      estudiante.NumeroIdentificacion ||
      estudiante.Cedula ||
      estudiante.cedula
  );

  if (!cedula) {
    return null;
  }

  const nombreCarrera = String(estudiante.NombreCarrera || "").trim();

  return {
    ...estudiante,

    cedula: cedula,
    numeroIdentificacion: cedula,
    periodoId: String(periodoId || "").trim(),

    Nombres: String(estudiante.Nombres || estudiante.Nombre || "").trim(),
    NombreCarrera: nombreCarrera,
    CodigoCarrera: String(estudiante.CodigoCarrera || "").trim(),

    modalidadDetectada: obtenerModalidadDesdeCarrera(nombreCarrera),

    actualizadoEn: obtenerFechaISO(),
    origenCarga: "excel-admin"
  };
}

async function guardarEstudiantesFirebase(estudiantes, periodoId) {
  if (!periodoId) {
    throw new Error("Debe seleccionar un período antes de guardar el Excel.");
  }

  if (!Array.isArray(estudiantes) || estudiantes.length === 0) {
    throw new Error("No hay estudiantes para guardar.");
  }

  const batchSize = 450;
  let guardados = 0;
  let omitidos = 0;

  for (let i = 0; i < estudiantes.length; i += batchSize) {
    const batch = db.batch();
    const bloque = estudiantes.slice(i, i + batchSize);

    bloque.forEach(function (estudianteOriginal) {
      const estudiante = prepararEstudianteParaGuardar(
        estudianteOriginal,
        periodoId
      );

      if (!estudiante) {
        omitidos++;
        return;
      }

      const docId = generarIdEstudiantePeriodo(
        estudiante.numeroIdentificacion,
        periodoId
      );

      const docRef = db
        .collection(APP_COLLECTIONS.estudiantes)
        .doc(docId);

      batch.set(
        docRef,
        {
          ...estudiante,
          estudiantePeriodoId: docId
        },
        { merge: true }
      );

      guardados++;
    });

    await batch.commit();
  }

  return {
    guardados: guardados,
    omitidos: omitidos,
    totalProcesados: guardados + omitidos
  };
}

function obtenerCedulaEstudiante(estudiante) {
  return normalizarCedulaSistema(
    estudiante?.cedula ||
      estudiante?.numeroIdentificacion ||
      estudiante?.NumeroIdentificacion ||
      estudiante?.Cedula ||
      estudiante?.id ||
      ""
  );
}

function obtenerPeriodoEstudiante(estudiante) {
  return String(estudiante?.periodoId || estudiante?.Periodo || "").trim();
}

function obtenerNombreEstudiante(estudiante) {
  return String(estudiante?.Nombres || estudiante?.Nombre || "").trim();
}

function obtenerCarreraEstudiante(estudiante) {
  return String(estudiante?.NombreCarrera || estudiante?.Carrera || "").trim();
}