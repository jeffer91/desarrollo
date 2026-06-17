/* =========================================================
Nombre del archivo: ctr.lock.js
Ruta - Ubicación: /control/ctr.docs/backend/ctr.lock.js
Función o funciones:
- setLocked(on, text): bloquea/desbloquea UI mientras se guarda
========================================================= */

function getLockEl(){
  return document.getElementById("ctrLock");
}
function getLockTxtEl(){
  return document.getElementById("ctrLockTxt");
}

export function setLocked(on, text){
  const lock = getLockEl();
  if (!lock) return;

  const t = getLockTxtEl();
  if (t && text) t.textContent = String(text);

  lock.dataset.on = on ? "1" : "0";

  // Comentario técnico:
  // - bloqueamos controles marcados con data-ctrctl="1"
  // - evitamos interacciones mientras se hace batch commit
  const ctrls = document.querySelectorAll('[data-ctrctl="1"]');
  ctrls.forEach((el) => {
    if (!el || typeof el.disabled === "undefined") return;
    el.disabled = !!on;
  });
}