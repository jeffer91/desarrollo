/*
Nombre del archivo: carr.validar.js
Ubicación: /Curriculo/carreras/backend/carr.validar.js
Función:
- Validar la estructura mínima de una carrera
- Normalizar nombre, tipo y estado
- Devolver errores y un objeto listo para guardar
*/

import { carrLimpiarTextoBase } from "./carr.normalizar.js";

const CARR_TIPOS_PERMITIDOS = [
  "Tecnologia Superior",
  "Tecnologia Universitaria",
  "Tecnica Superior"
];

const CARR_ESTADOS_PERMITIDOS = [
  "activa",
  "inactiva"
];

function carrLimpiarTexto(valor) {
  return carrLimpiarTextoBase(valor);
}

function carrNormalizarEstado(valor) {
  const limpio = carrLimpiarTexto(valor).toLowerCase();
  return CARR_ESTADOS_PERMITIDOS.includes(limpio) ? limpio : "activa";
}

function carrValidarTipo(valor) {
  const limpio = carrLimpiarTexto(valor);

  if (CARR_TIPOS_PERMITIDOS.includes(limpio)) {
    return limpio;
  }

  const sinTildes = limpio
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return CARR_TIPOS_PERMITIDOS.includes(sinTildes) ? sinTildes : limpio;
}

function carrValidarCarrera(data) {
  const errores = [];

  const nombre = carrLimpiarTexto(data?.nombre);
  const tipo = carrValidarTipo(data?.tipo);
  const estado = carrNormalizarEstado(data?.estado);

  if (!nombre) {
    errores.push("El nombre de la carrera es obligatorio.");
  } else if (nombre.length < 2) {
    errores.push("El nombre de la carrera debe tener al menos 2 caracteres.");
  } else if (nombre.length > 120) {
    errores.push("El nombre de la carrera no debe exceder 120 caracteres.");
  }

  if (!tipo) {
    errores.push("El tipo de carrera es obligatorio.");
  } else if (!CARR_TIPOS_PERMITIDOS.includes(tipo)) {
    errores.push("El tipo de carrera no es válido.");
  }

  if (!CARR_ESTADOS_PERMITIDOS.includes(estado)) {
    errores.push("El estado de la carrera no es válido.");
  }

  const valor = {
    nombre,
    tipo,
    estado
  };

  return {
    ok: errores.length === 0,
    errores,
    valor
  };
}

export {
  CARR_TIPOS_PERMITIDOS,
  CARR_ESTADOS_PERMITIDOS,
  carrLimpiarTexto,
  carrNormalizarEstado,
  carrValidarTipo,
  carrValidarCarrera
};
