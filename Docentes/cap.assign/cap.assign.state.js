/* =========================================================
Nombre del archivo: cap.assign.state.js
Ruta - Ubicación: /cap.assign/cap.assign.state.js
Función o funciones:
- Estado local pantalla Asignación
- Mantiene catálogo completo y catálogo filtrado de capacitaciones
- Mantiene períodos disponibles y período seleccionado
- Filtros: carrera, search, inout
- Selección: selectedDocIds (Set)
- Pendientes: pendingAdd (Set) / pendingDel (Set)
- ✅ Nuevo: capTouched para distinguir si la capacitación fue elegida
  explícitamente por el usuario o quedó auto-seleccionada por contexto
========================================================= */
export function createCapAssignState(){
 const S = {
  carreras: [],
  docentes: [],
  periodos: [],
  capacitacionesAll: [],
  capacitaciones: [],
  periodoId: "",
  capSelectedId: "",
  capTouched: false,
  carreraId: "",
  search: "",
  inout: "all",
  selectedDocIds: new Set(),
  pendingAdd: new Set(),
  pendingDel: new Set()
 };

 function setCarreras(rows){
  S.carreras = Array.isArray(rows) ? rows.slice() : [];
 }

 function setDocentes(rows){
  S.docentes = Array.isArray(rows) ? rows.slice() : [];
 }

 function setPeriodos(rows){
  S.periodos = Array.isArray(rows) ? rows.slice() : [];
 }

 function setCapacitacionesAll(rows){
  S.capacitacionesAll = Array.isArray(rows) ? rows.slice() : [];
 }

 function setCapacitaciones(rows){
  S.capacitaciones = Array.isArray(rows) ? rows.slice() : [];
 }

 function setPeriodoId(id){
  S.periodoId = (id || "").toString().trim();
 }

 function setCapSelectedId(id){
  S.capSelectedId = (id || "").toString().trim();
 }

 function setCapTouched(v){
  // Comentario técnico: este flag evita exportar solo la primera capacitación
  // auto-seleccionada cuando el usuario realmente filtró por período.
  S.capTouched = !!v;
 }

 function setCarreraId(id){
  S.carreraId = (id || "").toString().trim();
 }

 function setSearch(q){
  S.search = (q || "").toString();
 }

 function setInOut(v){
  S.inout = (v || "all").toString();
 }

 function clearSelection(){
  S.selectedDocIds = new Set();
 }

 function clearPendings(){
  S.pendingAdd = new Set();
  S.pendingDel = new Set();
 }

 return {
  S,
  setCarreras,
  setDocentes,
  setPeriodos,
  setCapacitacionesAll,
  setCapacitaciones,
  setPeriodoId,
  setCapSelectedId,
  setCapTouched,
  setCarreraId,
  setSearch,
  setInOut,
  clearSelection,
  clearPendings
 };
}