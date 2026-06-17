/* =========================================================
Nombre del archivo: regman.msg.ui.js
Ruta - Ubicación: /registro.manage/regman.msg.ui.js
Función o funciones:
- createMsgUI(): msg(text,type)
========================================================= */

import { DOM } from "./regman.dom.js";

export function createMsgUI(){
  function msg(text, type){
    const el = DOM.msg();
    if (!el) return;
    el.textContent = text || "";
    el.dataset.type = type || "info";
  }
  return { msg };
}
