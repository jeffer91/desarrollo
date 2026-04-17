/* =========================================================
Nombre del archivo: ctr.state.js
Ruta - Ubicación: /control/ctr.docs/backend/ctr.state.js
Función o funciones:
- createState(): estado único del módulo
- resetOnPeriodo(S): limpia selección y pendientes al cambiar periodo
- resetOnCap(S): limpia pendientes al cambiar capacitación
========================================================= */
export function createState(){
  return {
    periodoLabel: "todos",
    capId: "",
    caps: [],
    docentes: [],
    pending: new Map()
    // Map(docenteId -> {
    //   nombres,
    //   apellidos,
    //   planIndividual,
    //   acuerdoPatrocinio,
    //   reporteResultados
    // })
  };
}

export function resetOnPeriodo(S){
  // Comentario técnico:
  // evita mezclar selección, docentes y pendientes de otro periodo.
  S.capId = "";
  S.pending.clear();
  S.docentes = [];
}

export function resetOnCap(S){
  // Comentario técnico:
  // al cambiar cap se limpian pendientes para no guardar checks o nombres
  // bajo una capacitación distinta.
  S.pending.clear();
}