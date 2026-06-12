/*
Nombre completo: estudiante.js
Ruta o ubicación: /incorporaciones-app/js/estudiante.js

Función o funciones:
1. Buscar estudiante por número de cédula dentro de los períodos activos.
2. Tomar el período activo más actual si el estudiante aparece en más de uno.
3. Mostrar datos principales del estudiante de forma compacta.
4. Validar si todos los requisitos están en CUMPLE.
5. Mostrar requisitos pendientes en formato resumido.
6. Permitir seleccionar Quito o Manta solo si está habilitado.
7. Bloquear cambios si ya existe una incorporación registrada.
8. Guardar la sede de incorporación en la colección incorporaciones.
9. Guardar una copia de compatibilidad en la colección Estudiantes.
10. Guardar una copia local de la respuesta.
11. Capturar y guardar el Telegram del estudiante.
12. Permitir registrar que el estudiante no irá a la incorporación.
*/

let estudianteActual = null;
let periodoActual = null;
let incorporacionActual = null;

const cedulaInput = document.getElementById("cedulaInput");
const btnBuscarCedula = document.getElementById("btnBuscarCedula");
const consultaMessage = document.getElementById("consultaMessage");

const datosEstudianteBox = document.getElementById("datosEstudianteBox");
const sedeBox = document.getElementById("sedeBox");
const noHabilitadoBox = document.getElementById("noHabilitadoBox");
const yaRespondioBox = document.getElementById("yaRespondioBox");
const yaRespondioTexto = document.getElementById("yaRespondioTexto");

const datoCedula = document.getElementById("datoCedula");
const datoNombres = document.getElementById("datoNombres");
const datoCarrera = document.getElementById("datoCarrera");
const datoPeriodo = document.getElementById("datoPeriodo");
const datoSedeActual = document.getElementById("datoSedeActual");

const requisitosPendientesBox = document.getElementById("requisitosPendientesBox");
const sedeMessage = document.getElementById("sedeMessage");

/* Corrección: se capturan los nuevos controles agregados en estudiante.html.
   Evita errores si el HTML todavía no fue actualizado o si el botón no existe. */
const telegramInput = document.getElementById("telegramInput");
const btnNoIre = document.getElementById("btnNoIre");

document.addEventListener("DOMContentLoaded", function () {
  configurarEventosEstudiante();
});

function configurarEventosEstudiante() {
  btnBuscarCedula.addEventListener("click", buscarEstudiante);

  cedulaInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      buscarEstudiante();
    }
  });

  document.querySelectorAll(".sede-option").forEach(function (button) {
    button.addEventListener("click", function () {
      const sede = button.getAttribute("data-sede");
      seleccionarSede(sede);
    });
  });

  /* Corrección: conecta el botón "No iré" con su flujo propio.
     Evita que esta respuesta pase por la validación exclusiva de Quito/Manta. */
  if (btnNoIre) {
    btnNoIre.addEventListener("click", registrarNoIre);
  }
}

function mostrarMensajeEstudiante(elemento, texto, tipo) {
  if (!elemento) {
    return;
  }

  elemento.textContent = texto || "";
  elemento.className = "message";

  if (tipo) {
    elemento.classList.add(tipo);
  }
}

function limpiarVistaEstudiante() {
  estudianteActual = null;
  periodoActual = null;
  incorporacionActual = null;

  datosEstudianteBox.classList.add("hidden");
  sedeBox.classList.add("hidden");
  noHabilitadoBox.classList.add("hidden");

  if (yaRespondioBox) {
    yaRespondioBox.classList.add("hidden");
  }

  datoCedula.textContent = "-";
  datoNombres.textContent = "-";
  datoCarrera.textContent = "-";
  datoPeriodo.textContent = "-";
  datoSedeActual.textContent = "Sin registrar";

  requisitosPendientesBox.innerHTML = "";
  mostrarMensajeEstudiante(sedeMessage, "", "");

  /* Corrección: limpia Telegram al consultar otra cédula.
     Evita guardar por error el Telegram escrito para un estudiante anterior. */
  if (telegramInput) {
    telegramInput.value = "";
  }
}

async function buscarEstudiante() {
  const cedula = limpiarCedula(cedulaInput.value);

  limpiarVistaEstudiante();

  if (!cedula) {
    mostrarMensajeEstudiante(
      consultaMessage,
      "Ingrese un número de cédula válido.",
      "error"
    );
    return;
  }

  try {
    mostrarMensajeEstudiante(
      consultaMessage,
      "Consultando información...",
      "info"
    );

    const resultado = await buscarEstudiantePorCedulaEnPeriodosActivos(cedula);

    if (!resultado.estudiante) {
      mostrarMensajeEstudiante(
        consultaMessage,
        "No se encontró un estudiante registrado con esa cédula en los períodos habilitados.",
        "error"
      );
      return;
    }

    estudianteActual = resultado.estudiante;
    periodoActual = resultado.periodo;

    mostrarDatosEstudiante(estudianteActual, periodoActual);

    incorporacionActual = await buscarIncorporacionActual(
      obtenerCedulaEstudiante(estudianteActual),
      obtenerPeriodoEstudiante(estudianteActual)
    );

    if (incorporacionActual) {
      // Corrección existente: se muestra la respuesta actual.
      // El guardado vuelve a validar existencia antes de escribir en Firebase.
      mostrarYaRespondio(incorporacionActual);
    }

    const habilitado = estudianteEstaHabilitado(estudianteActual);

    if (!habilitado) {
      mostrarNoHabilitado(estudianteActual);

      mostrarMensajeEstudiante(
        consultaMessage,
        "Estudiante encontrado, pero aún no está habilitado/a para seleccionar sede.",
        "error"
      );

      return;
    }

    sedeBox.classList.remove("hidden");

    mostrarMensajeEstudiante(
      consultaMessage,
      "Estudiante habilitado/a. Puede seleccionar sede de incorporación.",
      "ok"
    );
  } catch (error) {
    mostrarMensajeEstudiante(consultaMessage, error.message, "error");
  }
}

function mostrarDatosEstudiante(estudiante, periodo) {
  datosEstudianteBox.classList.remove("hidden");

  const cedula = obtenerCedulaEstudiante(estudiante);
  const periodoId = estudiante.periodoId || periodo?.id || "";

  datoCedula.textContent = cedula;
  datoNombres.textContent = estudiante.Nombres || "";
  datoCarrera.textContent = estudiante.NombreCarrera || "";
  datoPeriodo.textContent = periodo?.label || periodoId;
  datoSedeActual.textContent =
    estudiante.incorporacion ||
    estudiante.sedeIncorporacion ||
    "Sin registrar";
}

function mostrarYaRespondio(incorporacion) {
  if (!yaRespondioBox) {
    return;
  }

  yaRespondioBox.classList.remove("hidden");
  sedeBox.classList.add("hidden");

  const sede = incorporacion.incorporacion || "SIN REGISTRO";
  const fecha = incorporacion.fechaRegistro || "";
  const telegram = incorporacion.telegram || incorporacion.telegramIncorporacion || "";

  datoSedeActual.textContent = sede;

  /* Corrección: muestra texto especial cuando la respuesta guardada es "No iré".
     Evita presentar "NO IRÉ" como si fuera una sede física. */
  if (normalizarTexto(sede) === "NO IRE") {
    yaRespondioTexto.textContent =
      `Usted ya registró que no irá a la incorporación. Telegram registrado: ${telegram || "sin registrar"}. Fecha de registro: ${fecha}`;
    return;
  }

  yaRespondioTexto.textContent =
    `Usted ya registra la sede ${sede}. Telegram registrado: ${telegram || "sin registrar"}. Si necesita cambiarla, debe contactar con el Coordinador de Titulación. Fecha de registro: ${fecha}`;
}

function mostrarNoHabilitado(estudiante) {
  const pendientes = obtenerRequisitosPendientes(estudiante);

  noHabilitadoBox.classList.remove("hidden");
  sedeBox.classList.add("hidden");

  requisitosPendientesBox.innerHTML = "";

  if (pendientes.length === 0) {
    const div = document.createElement("div");
    div.className = "pending-item";
    div.textContent = "No se detectaron pendientes, pero el sistema no habilitó la selección. Contacte con el Coordinador de Titulación.";
    requisitosPendientesBox.appendChild(div);
    return;
  }

  const resumen = pendientes
    .map(function (item) {
      return item.nombre;
    })
    .join(", ");

  const div = document.createElement("div");
  div.className = "pending-item";
  div.textContent = `Pendientes: ${resumen}`;
  requisitosPendientesBox.appendChild(div);
}

function obtenerTelegramFormulario() {
  return String(telegramInput?.value || "").trim();
}

function validarTelegramFormulario() {
  const telegram = obtenerTelegramFormulario();

  /* Corrección: Telegram se exige antes de guardar.
     Evita crear registros incompletos en Firebase. */
  if (!telegram) {
    mostrarMensajeEstudiante(
      sedeMessage,
      "Ingrese su Telegram antes de registrar la respuesta.",
      "error"
    );
    return "";
  }

  return telegram;
}

async function seleccionarSede(sede) {
  if (!estudianteActual) {
    mostrarMensajeEstudiante(
      sedeMessage,
      "Primero debe consultar su cédula.",
      "error"
    );
    return;
  }

  const sedeNormalizada = normalizarTexto(sede);

  if (!APP_CONFIG.sedesPermitidas.includes(sedeNormalizada)) {
    mostrarMensajeEstudiante(
      sedeMessage,
      "Sede no válida.",
      "error"
    );
    return;
  }

  const telegram = validarTelegramFormulario();

  if (!telegram) {
    return;
  }

  try {
    const existente = await buscarIncorporacionActual(
      obtenerCedulaEstudiante(estudianteActual),
      obtenerPeriodoEstudiante(estudianteActual)
    );

    if (existente) {
      // Corrección existente: se informa la respuesta previa antes de intentar guardar.
      // El guardado impedirá duplicados para no sobreescribir Firebase accidentalmente.
      mostrarYaRespondio(existente);
    }

    const confirmado = confirm(
      `¿Está seguro/a de seleccionar la sede ${sedeNormalizada} para su incorporación? Esta selección solo podrá ser modificada por el administrador.`
    );

    if (!confirmado) {
      return;
    }

    mostrarMensajeEstudiante(
      sedeMessage,
      "Guardando selección de sede...",
      "info"
    );

    const respuesta = await guardarRespuestaIncorporacionFirebase(
      sedeNormalizada,
      telegram,
      false
    );

    finalizarRegistroEstudiante(respuesta, telegram);

    mostrarMensajeEstudiante(
      sedeMessage,
      `Su sede de incorporación fue registrada correctamente: ${respuesta.incorporacion}.`,
      "ok"
    );

    mostrarMensajeEstudiante(
      consultaMessage,
      "Registro completado correctamente.",
      "ok"
    );
  } catch (error) {
    mostrarMensajeEstudiante(sedeMessage, error.message, "error");
  }
}

async function registrarNoIre() {
  if (!estudianteActual) {
    mostrarMensajeEstudiante(
      sedeMessage,
      "Primero debe consultar su cédula.",
      "error"
    );
    return;
  }

  const telegram = validarTelegramFormulario();

  if (!telegram) {
    return;
  }

  try {
    const existente = await buscarIncorporacionActual(
      obtenerCedulaEstudiante(estudianteActual),
      obtenerPeriodoEstudiante(estudianteActual)
    );

    if (existente) {
      mostrarYaRespondio(existente);
    }

    const confirmado = confirm(
      "¿Está seguro/a de registrar que no irá a la incorporación? Esta respuesta solo podrá ser modificada por el administrador."
    );

    if (!confirmado) {
      return;
    }

    mostrarMensajeEstudiante(
      sedeMessage,
      "Guardando respuesta...",
      "info"
    );

    /* Corrección: registra la opción "No iré" como una respuesta formal.
       No usa APP_CONFIG.sedesPermitidas porque esa lista solo acepta Quito y Manta. */
    const respuesta = await guardarRespuestaIncorporacionFirebase(
      "NO IRÉ",
      telegram,
      true
    );

    finalizarRegistroEstudiante(respuesta, telegram);

    mostrarMensajeEstudiante(
      sedeMessage,
      "Su respuesta fue registrada correctamente: No iré.",
      "ok"
    );

    mostrarMensajeEstudiante(
      consultaMessage,
      "Registro completado correctamente.",
      "ok"
    );
  } catch (error) {
    mostrarMensajeEstudiante(sedeMessage, error.message, "error");
  }
}

async function guardarRespuestaIncorporacionFirebase(incorporacion, telegram, noIre) {
  if (!estudianteActual) {
    throw new Error("No existe información del estudiante.");
  }

  const cedula = obtenerCedulaEstudiante(estudianteActual);
  const periodoId = obtenerPeriodoEstudiante(estudianteActual);
  const incorporacionNormalizada = normalizarTexto(incorporacion);
  const esNoIre = noIre === true || incorporacionNormalizada === "NO IRE";

  if (!cedula) {
    throw new Error("No se encontró la cédula del estudiante.");
  }

  if (!periodoId) {
    throw new Error("No se encontró el período del estudiante.");
  }

  if (!estudianteEstaHabilitado(estudianteActual)) {
    throw new Error("El estudiante no está habilitado para registrar respuesta.");
  }

  if (!esNoIre && !APP_CONFIG.sedesPermitidas.includes(incorporacionNormalizada)) {
    throw new Error("Sede no válida. Solo se permite QUITO o MANTA.");
  }

  const existente = await buscarIncorporacionActual(cedula, periodoId);

  if (existente) {
    throw new Error(
      `Ya existe una respuesta registrada para este período: ${existente.incorporacion}. Para cambios, contacte con el Coordinador de Titulación.`
    );
  }

  const fecha = obtenerFechaISO();
  const docId = generarIdIncorporacion(cedula, periodoId, fecha);

  /* Corrección: se agregan Telegram y estado de "No iré" al documento principal.
     Evita que Firebase guarde solo la sede y pierda el dato de contacto solicitado. */
  const datos = {
    cedula: cedula,
    incorporacion: esNoIre ? "NO IRÉ" : incorporacionNormalizada,
    periodoId: periodoId,
    fechaRegistro: fecha,
    ultimaActualizacion: fecha,
    origen: "web-estudiante",
    estudianteDocId: estudianteActual.docId || estudianteActual.id || "",
    nombres: obtenerNombreEstudiante(estudianteActual),
    carrera: obtenerCarreraEstudiante(estudianteActual),
    telegram: telegram,
    telegramIncorporacion: telegram,
    noIreIncorporacion: esNoIre,
    estadoIncorporacion: esNoIre ? "NO_IRE" : "SEDE_SELECCIONADA"
  };

  await db
    .collection(APP_COLLECTIONS.incorporaciones)
    .doc(docId)
    .set(datos, { merge: true });

  /* Corrección: guarda copia de compatibilidad también en Estudiantes.
     Evita que administrador, respaldos o exportaciones dependan solo de incorporaciones. */
  await db
    .collection(APP_COLLECTIONS.estudiantes)
    .doc(estudianteActual.docId || estudianteActual.id)
    .set(
      {
        sedeIncorporacion: datos.incorporacion,
        incorporacion: datos.incorporacion,
        respondioIncorporacion: true,
        fechaRespuestaIncorporacion: datos.fechaRegistro,
        ultimaActualizacionIncorporacion: datos.ultimaActualizacion,
        incorporacionDocId: docId,
        origenRespuestaIncorporacion: datos.origen,
        telegram: datos.telegram,
        telegramIncorporacion: datos.telegramIncorporacion,
        noIreIncorporacion: datos.noIreIncorporacion,
        estadoIncorporacion: datos.estadoIncorporacion
      },
      { merge: true }
    );

  return {
    docId: docId,
    ...datos
  };
}

function finalizarRegistroEstudiante(respuesta, telegram) {
  if (typeof guardarRespuestaLocal === "function") {
    guardarRespuestaLocal({
      cedula: respuesta.cedula,
      nombres: estudianteActual.Nombres || "",
      carrera: estudianteActual.NombreCarrera || "",
      periodoId: estudianteActual.periodoId || "",
      incorporacion: respuesta.incorporacion,
      telegram: telegram,
      noIreIncorporacion: respuesta.noIreIncorporacion === true,
      estadoIncorporacion: respuesta.estadoIncorporacion || "",
      fecha: respuesta.fechaRegistro
    });
  }

  estudianteActual.incorporacion = respuesta.incorporacion;
  estudianteActual.sedeIncorporacion = respuesta.incorporacion;
  estudianteActual.respondioIncorporacion = true;
  estudianteActual.telegram = telegram;
  estudianteActual.telegramIncorporacion = telegram;
  estudianteActual.noIreIncorporacion = respuesta.noIreIncorporacion === true;
  estudianteActual.estadoIncorporacion = respuesta.estadoIncorporacion || "";
  estudianteActual.ultimaActualizacionIncorporacion =
    respuesta.ultimaActualizacion;

  datoSedeActual.textContent = respuesta.incorporacion;

  sedeBox.classList.add("hidden");
  mostrarYaRespondio(respuesta);
}