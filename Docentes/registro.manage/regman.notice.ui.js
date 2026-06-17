/* =========================================================
Nombre del archivo: regman.notice.ui.js
Ruta - Ubicación: /registro.manage/regman.notice.ui.js
Función:
- Administrar avisos de UI:
  - Si el modal está abierto: mostrar dentro del modal (bulkStats) y alert SOLO en warn/err
  - Si el modal NO está abierto: usar ui.msg(...) (mensaje principal)
========================================================= */

export function createNoticeUI({ DOM, ui }){
// FIX: también mostrar "cuadrito" cuando es OK, para que "Agregar" por fila no quede sin feedback.
// Nota: si luego haces cargas masivas grandes y te molesta, lo ajustamos a "solo add-one".
const ALERT_TYPES = new Set(["warn", "err", "ok"]);


  function isModalOpen(){
    const m = DOM.bulkModal?.();
    return !!m && m.hidden === false;
  }

  function writeInModal(text){
    const el = DOM.bulkStats?.();
    if (!el) return false;
    el.textContent = (text || "").toString();
    return true;
  }

  function write(text, type){
    const t = (text || "").toString();
    const tp = (type || "info").toString();

    if (isModalOpen()){
      // FIX: en modal, ui.msg queda detrás del overlay; bulkStats siempre visible
      writeInModal(t);

      // FIX: "cuadrito" nativo solo en warn/err (lo que de verdad requiere atención)
      if (ALERT_TYPES.has(tp)){
        window.alert(t);
      }
      return;
    }

    // Fuera del modal: comportamiento original
    if (ui && typeof ui.msg === "function"){
      ui.msg(t, tp);
    }
  }

  function clear(){
    const el = DOM.bulkStats?.();
    if (el) el.textContent = "";
  }

  return {
    msg: write,
    info: (t) => write(t, "info"),
    ok: (t) => write(t, "ok"),
    warn: (t) => write(t, "warn"),
    err: (t) => write(t, "err"),
    clear
  };
}
