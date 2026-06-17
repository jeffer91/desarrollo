/*
Nombre completo: local-backup.js
Ruta o ubicación: /incorporaciones-app/js/local-backup.js

Función o funciones:
1. Guardar una copia local simple de la respuesta del estudiante.
2. Guardar una copia local simple de los estudiantes cargados en administrador.
3. Leer respaldos locales.
4. Borrar respaldos locales.
5. Limpiar respaldos diarios si cambia el día.
6. Mantener compatibilidad con versiones anteriores de la app.
*/

const LOCAL_BACKUP_KEYS = {
  respuestaEstudiante: "incorporaciones_respuesta_estudiante",
  respuestasEstudiantes: "incorporaciones_respuestas_estudiantes",
  backupAdmin: "incorporaciones_backup_admin",
  fechaBackup: "incorporaciones_fecha_backup"
};

function obtenerFechaLocalBackup() {
  const fecha = new Date();
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function obtenerFechaHoraLocalBackup() {
  return new Date().toISOString();
}

function guardarRespuestaLocal(respuesta) {
  if (!respuesta) {
    return null;
  }

  const registro = {
    ...respuesta,
    guardadoLocalEn: obtenerFechaHoraLocalBackup()
  };

  localStorage.setItem(
    LOCAL_BACKUP_KEYS.respuestaEstudiante,
    JSON.stringify(registro)
  );

  const historial = leerRespuestasLocales();

  historial.push(registro);

  localStorage.setItem(
    LOCAL_BACKUP_KEYS.respuestasEstudiantes,
    JSON.stringify(historial)
  );

  return registro;
}

function leerRespuestaLocal() {
  const texto = localStorage.getItem(LOCAL_BACKUP_KEYS.respuestaEstudiante);

  if (!texto) {
    return null;
  }

  try {
    return JSON.parse(texto);
  } catch (error) {
    console.error("Error al leer respuesta local:", error);
    return null;
  }
}

function leerRespuestasLocales() {
  const texto = localStorage.getItem(LOCAL_BACKUP_KEYS.respuestasEstudiantes);

  if (!texto) {
    return [];
  }

  try {
    const datos = JSON.parse(texto);
    return Array.isArray(datos) ? datos : [];
  } catch (error) {
    console.error("Error al leer historial local de respuestas:", error);
    return [];
  }
}

function guardarBackupAdmin(estudiantes) {
  const data = {
    fecha: obtenerFechaHoraLocalBackup(),
    fechaDia: obtenerFechaLocalBackup(),
    total: Array.isArray(estudiantes) ? estudiantes.length : 0,
    estudiantes: Array.isArray(estudiantes) ? estudiantes : []
  };

  localStorage.setItem(LOCAL_BACKUP_KEYS.backupAdmin, JSON.stringify(data));
  localStorage.setItem(LOCAL_BACKUP_KEYS.fechaBackup, data.fechaDia);

  return data;
}

function leerBackupAdmin() {
  const texto = localStorage.getItem(LOCAL_BACKUP_KEYS.backupAdmin);

  if (!texto) {
    return null;
  }

  try {
    return JSON.parse(texto);
  } catch (error) {
    console.error("Error al leer backup admin:", error);
    return null;
  }
}

function borrarBackupAdmin() {
  localStorage.removeItem(LOCAL_BACKUP_KEYS.backupAdmin);
}

function borrarRespuestaLocal() {
  localStorage.removeItem(LOCAL_BACKUP_KEYS.respuestaEstudiante);
}

function borrarRespuestasLocales() {
  localStorage.removeItem(LOCAL_BACKUP_KEYS.respuestasEstudiantes);
}

function borrarTodosLosBackupsLocales() {
  borrarBackupAdmin();
  borrarRespuestaLocal();
  borrarRespuestasLocales();

  localStorage.removeItem(LOCAL_BACKUP_KEYS.fechaBackup);

  if (typeof borrarRespaldoJsonLocal === "function") {
    borrarRespaldoJsonLocal();
  }
}

function limpiarBackupDiarioSiCambioElDia() {
  const fechaHoy = obtenerFechaLocalBackup();
  const fechaGuardada = localStorage.getItem(LOCAL_BACKUP_KEYS.fechaBackup);

  if (!fechaGuardada) {
    localStorage.setItem(LOCAL_BACKUP_KEYS.fechaBackup, fechaHoy);
    return;
  }

  if (fechaGuardada !== fechaHoy) {
    borrarBackupAdmin();
    localStorage.setItem(LOCAL_BACKUP_KEYS.fechaBackup, fechaHoy);
  }
}

function descargarBackupLocalSimple() {
  const backup = leerBackupAdmin();

  if (!backup) {
    throw new Error("No existe respaldo local del administrador.");
  }

  if (typeof descargarObjetoComoJson === "function") {
    return descargarObjetoComoJson(backup, "backup_local_admin");
  }

  const texto = JSON.stringify(backup, null, 2);
  const blob = new Blob([texto], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `backup_local_admin_${obtenerFechaLocalBackup()}.json`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  URL.revokeObjectURL(url);

  return enlace.download;
}