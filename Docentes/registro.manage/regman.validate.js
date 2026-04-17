/* =========================================================
Nombre del archivo: regman.validate.js
Ruta - Ubicación: /registro.manage/regman.validate.js
Función o funciones:
- validateDocente(d): retorna { ok, msg }
========================================================= */

function onlyDigits(x){ return /^[0-9]+$/.test(x || ""); }

export function validateDocente(d){
  const cedula = (d.cedula || "").trim();
  if (!cedula) return { ok:false, msg:"Cédula es obligatoria." };
  if (!onlyDigits(cedula)) return { ok:false, msg:"Cédula debe contener solo números." };
  if (cedula.length < 10) return { ok:false, msg:"Cédula incompleta (mínimo 10 dígitos)." };

  if (!(d.nombres || "").trim()) return { ok:false, msg:"Nombres es obligatorio." };
  if (!(d.apellidos || "").trim()) return { ok:false, msg:"Apellidos es obligatorio." };
  if (!(d.carreraId || "").trim()) return { ok:false, msg:"Selecciona una carrera." };

  return { ok:true, msg:"OK" };
}
