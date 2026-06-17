/*
Nombre completo: json-backup.js
Ruta o ubicación: /incorporaciones-app/js/json-backup.js

Función o funciones:
1. Crear un paquete de respaldo JSON.
2. Guardar respaldo JSON en localStorage.
3. Descargar respaldo JSON como archivo .json.
4. Leer el último respaldo JSON guardado.
5. Borrar respaldo JSON local.
6. Servir como respaldo adicional a Firebase.
*/

function crearPaqueteRespaldoJson(opciones) {
  const datos = opciones || {};

  return {
    app: APP_CONFIG.appName,
    version: APP_CONFIG.appVersion,
    generadoEn: obtenerFechaISO(),
    periodoId: datos.periodoId || "",
    origen: datos.origen || "admin",

    resumen: {
      totalPeriodos: Array.isArray(datos.periodos) ? datos.periodos.length : 0,
      totalEstudiantes: Array.isArray(datos.estudiantes)
        ? datos.estudiantes.length
        : 0,
      totalIncorporaciones: Array.isArray(datos.incorporaciones)
        ? datos.incorporaciones.length
        : 0
    },

    periodos: Array.isArray(datos.periodos) ? datos.periodos : [],
    estudiantes: Array.isArray(datos.estudiantes) ? datos.estudiantes : [],
    incorporaciones: Array.isArray(datos.incorporaciones)
      ? datos.incorporaciones
      : []
  };
}

function guardarRespaldoJsonLocal(paquete) {
  if (!paquete) {
    throw new Error("No existe información para respaldar.");
  }

  const texto = JSON.stringify(paquete, null, 2);

  localStorage.setItem(APP_CONFIG.jsonBackupKey, texto);
  localStorage.setItem(APP_CONFIG.jsonBackupLastDateKey, obtenerFechaISO());

  return {
    fecha: paquete.generadoEn || obtenerFechaISO(),
    totalEstudiantes: paquete.resumen?.totalEstudiantes || 0,
    totalIncorporaciones: paquete.resumen?.totalIncorporaciones || 0
  };
}

function leerRespaldoJsonLocal() {
  const texto = localStorage.getItem(APP_CONFIG.jsonBackupKey);

  if (!texto) {
    return null;
  }

  try {
    return JSON.parse(texto);
  } catch (error) {
    console.error("No se pudo leer el respaldo JSON local:", error);
    return null;
  }
}

function borrarRespaldoJsonLocal() {
  localStorage.removeItem(APP_CONFIG.jsonBackupKey);
  localStorage.removeItem(APP_CONFIG.jsonBackupLastDateKey);
}

function descargarObjetoComoJson(objeto, nombreArchivoBase) {
  if (!objeto) {
    throw new Error("No existe información para descargar.");
  }

  const texto = JSON.stringify(objeto, null, 2);
  const blob = new Blob([texto], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const fecha = obtenerFechaLocalCorta();
  const nombreSeguro = limpiarIdFirestore(nombreArchivoBase || "respaldo");
  const nombreArchivo = `${nombreSeguro}_${fecha}.json`;

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  URL.revokeObjectURL(url);

  return nombreArchivo;
}

function descargarRespaldoJson(paquete, nombreArchivoBase) {
  return descargarObjetoComoJson(
    paquete,
    nombreArchivoBase || "respaldo_incorporaciones"
  );
}

function convertirMapaIncorporacionesALista(mapaIncorporaciones) {
  if (!mapaIncorporaciones || typeof mapaIncorporaciones !== "object") {
    return [];
  }

  return Object.keys(mapaIncorporaciones).map(function (cedula) {
    return mapaIncorporaciones[cedula];
  });
}

async function crearRespaldoJsonDesdePeriodo(periodoId, estudiantes, mapaIncorporaciones) {
  const periodos = await obtenerPeriodosFirebase();
  const incorporaciones = convertirMapaIncorporacionesALista(mapaIncorporaciones);

  return crearPaqueteRespaldoJson({
    periodoId: periodoId,
    origen: "admin-periodo",
    periodos: periodos,
    estudiantes: estudiantes || [],
    incorporaciones: incorporaciones
  });
}

function prepararDatosParaJsonSeguro(datos) {
  return JSON.parse(JSON.stringify(datos || {}));
}