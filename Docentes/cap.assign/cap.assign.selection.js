/* =========================================================
Nombre del archivo: cap.assign.selection.js
Ruta - Ubicación: /cap.assign/cap.assign.selection.js
Función o funciones:
- toggleSelection(state, id, checked)
- selectAllVisible(state, rows)
- clearSelection(state)
========================================================= */

export function toggleSelection(state, id, checked){
  if (checked) state.S.selectedDocIds.add(id);
  else state.S.selectedDocIds.delete(id);
}

export function selectAllVisible(state, rows){
  state.clearSelection();
  rows.forEach(r => state.S.selectedDocIds.add(r.id));
}

export function clearSelection(state){
  state.clearSelection();
}
