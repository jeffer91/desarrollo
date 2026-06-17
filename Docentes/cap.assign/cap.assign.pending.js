/* =========================================================
Nombre del archivo: cap.assign.pending.js
Ruta - Ubicación: /cap.assign/cap.assign.pending.js
Función o funciones:
- pendCount(state)
- queueAdd(state, docId)
- queueDel(state, docId)
- applyBulkAdd(state, docIds)
- applyBulkDel(state, docIds)
- clearPendings(state)
========================================================= */

export function pendCount(state){
  return (state.S.pendingAdd.size + state.S.pendingDel.size);
}

export function queueAdd(state, docId){
  if (!docId) return;
  state.S.pendingAdd.add(docId);
  state.S.pendingDel.delete(docId);
}

export function queueDel(state, docId){
  if (!docId) return;
  state.S.pendingDel.add(docId);
  state.S.pendingAdd.delete(docId);
}

export function applyBulkAdd(state, docIds){
  (docIds || []).forEach(id => queueAdd(state, id));
}

export function applyBulkDel(state, docIds){
  (docIds || []).forEach(id => queueDel(state, id));
}

export function clearPendings(state){
  state.clearPendings();
}
