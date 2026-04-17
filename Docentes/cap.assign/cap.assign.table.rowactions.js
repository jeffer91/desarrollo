/* =========================================================
Nombre del archivo: cap.assign.table.rowactions.js
Ruta - Ubicación: /cap.assign/cap.assign.table.rowactions.js
Función o funciones:
- handleRowAction(state, btn)
========================================================= */

export function handleRowAction(state, btn){

  const id = btn.dataset.id;
  const act = btn.dataset.act;

  if (!id) return;

  if (act === "add"){
    state.S.pendingAdd.add(id);
    state.S.pendingDel.delete(id);
  }

  if (act === "del"){
    state.S.pendingDel.add(id);
    state.S.pendingAdd.delete(id);
  }
}
