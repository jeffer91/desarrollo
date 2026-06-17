/*
=========================================================
Nombre completo: mjs-whatsapp.js
Ruta o ubicación: /incorporaciones/sedes/mensaje/mjs-whatsapp.js
Función o funciones:
1. Normalizar números de celular para WhatsApp.
2. Crear el mensaje formal para estudiantes.
3. Incluir nombre, carrera, período y link de encuesta.
4. Generar la URL de WhatsApp lista para abrir.
=========================================================
*/

const MJS_LINK_ENCUESTA = "https://statuesque-cheesecake-f3270a.netlify.app/estudiante.html";

function mjsNormalizarCelularWhatsapp(valor) {
  let celular = String(valor || "").trim();

  if (!celular) {
    return "";
  }

  celular = celular.replace(/[^\d+]/g, "");

  if (celular.startsWith("+")) {
    celular = celular.substring(1);
  }

  if (celular.startsWith("00")) {
    celular = celular.substring(2);
  }

  celular = celular.replace(/\D/g, "");

  if (celular.startsWith("593") && celular.length >= 11 && celular.length <= 12) {
    return celular;
  }

  if (celular.length === 10 && celular.startsWith("0")) {
    return `593${celular.substring(1)}`;
  }

  if (celular.length === 9 && celular.startsWith("9")) {
    return `593${celular}`;
  }

  return "";
}

function mjsTextoSeguroWhatsapp(valor, defecto) {
  const texto = String(valor || "").trim();
  return texto || defecto || "";
}

function mjsCrearMensajeWhatsapp(registro) {
  const nombre = mjsTextoSeguroWhatsapp(registro?.nombres, "estudiante");
  const carrera = mjsTextoSeguroWhatsapp(registro?.carrera, "su carrera");
  const periodo = mjsTextoSeguroWhatsapp(registro?.periodo || registro?.periodoId, "el período correspondiente");

  return `Estimado/a ${nombre}, reciba un cordial saludo.

Desde la Unidad de Titulación y Eficiencia Terminal del ITSQMET, se le recuerda que aún no ha completado la encuesta de selección de sede para el proceso de incorporación correspondiente al período ${periodo}, carrera ${carrera}.

Su registro es necesario para continuar con la organización institucional del proceso.

Por favor, complete la encuesta en el siguiente enlace:
${MJS_LINK_ENCUESTA}

Atentamente,
Unidad de Titulación y Eficiencia Terminal
ITSQMET`;
}

function mjsCrearUrlWhatsapp(registro) {
  const celular = registro?.celularWhatsapp || mjsNormalizarCelularWhatsapp(registro?.celularOriginal);

  if (!celular) {
    throw new Error("El estudiante no tiene un celular válido para WhatsApp.");
  }

  const mensaje = mjsCrearMensajeWhatsapp(registro);

  return `https://wa.me/${celular}?text=${encodeURIComponent(mensaje)}`;
}