/* =========================================================
Nombre del archivo: cap.manage.state.js
Ruta - Ubicación: /cap.manage/cap.manage.state.js
Función o funciones:
- Estado local Gestión Capacitaciones
- Mantiene: rows, search, selectedId, editId
- Setters y getters simples
========================================================= */

export function createCapManageState(){
  const S = {
    rows: [],
    search: "",
    selectedId: "",
    editId: "" // si existe => modo edición
  };

  function setRows(rows){
    S.rows = Array.isArray(rows) ? rows.slice() : [];
  }
  function setSearch(q){
    S.search = (q || "").toString();
  }
  function setSelectedId(id){
    S.selectedId = (id || "").toString().trim();
  }
  function setEditId(id){
    S.editId = (id || "").toString().trim();
  }
  function clearSelection(){
    S.selectedId = "";
    S.editId = "";
  }

  return {
    S,
    setRows,
    setSearch,
    setSelectedId,
    setEditId,
    clearSelection
  };
}
