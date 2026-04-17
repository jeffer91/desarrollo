/* =========================================================
Nombre del archivo: ctr.val.js
Ruta - Ubicación: /control/ctr.docs/backend/ctr.val.js
Función o funciones:
- isSafeMapKey(key): valida que la llave no rompa Firestore update (no ".")
- canEditAgreement(capId): acuerdo solo se edita si hay cap seleccionada
========================================================= */

export function isSafeMapKey(key){
  const k = String(key || "");
  // Comentario técnico: Firestore interpreta "." como path (rompe updates en mapas).
  return !!k && !k.includes(".");
}

export function canEditAgreement(capId){
  return !!String(capId || "").trim();
}