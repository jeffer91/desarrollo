/* =========================================================
Nombre del archivo: ctr.util.js
Ruta - Ubicación: /control/ctr.docs/backend/ctr.util.js
Función o funciones:
- $(): selector por id
- escapeHtml(): render seguro en tabla
- setMsg(): mensaje superior (info/ok/err)
- setFloatSave(): estado del botón flotante Guardar
========================================================= */
export function $(id){
  return document.getElementById(id);
}

export function escapeHtml(v){
  return String(v == null ? "" : v)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

export function setMsg(text, type){
  const el = $("ctrMsg");
  if (!el) return;
  el.textContent = text || "";
  el.dataset.type = type || "info";
}

export function setFloatSave(n, enabled){
  const btn = $("ctrSave");
  if (!btn) return;
  btn.textContent = `Guardar (${Number(n || 0)})`;
  btn.dataset.disabled = enabled ? "0" : "1";
  btn.disabled = !enabled;
}