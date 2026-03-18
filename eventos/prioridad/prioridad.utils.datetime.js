/* =========================================================
Nombre del archivo: prioridad.utils.datetime.js
Ruta: /prioridad/prioridad.utils.datetime.js
Función:
- parse/format fechas
========================================================= */
(function(){
  function toDate(x){
    if (!x) return null;
    const d = new Date(x);
    return isNaN(d.getTime()) ? null : d;
  }
  function iso(d){ return (d instanceof Date) ? d.toISOString() : ""; }
  function nowISO(){ return new Date().toISOString(); }

  function toLocalInputValue(d){
    if (!d) return "";
    const pad = (n)=> String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function fmtLocal(isoStr){
    const d = toDate(isoStr);
    if (!d) return "";
    return d.toLocaleString();
  }

  window.PrioridadDate = { toDate, iso, nowISO, toLocalInputValue, fmtLocal };
})();
