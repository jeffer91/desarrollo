/* =========================================================
Nombre del archivo: prioridad.utils.businessdays.js
Ruta: /prioridad/prioridad.utils.businessdays.js
Función:
- Días laborables (L-V)
========================================================= */
(function(){
  function isBusinessDay(d){
    const day = d.getDay(); // 0 dom .. 6 sáb
    return day >= 1 && day <= 5;
  }
  function startOfDay(d){
    const x = new Date(d);
    x.setHours(0,0,0,0);
    return x;
  }
  function addDays(d, n){
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }
  function businessDaysBetween(start, end){
    const s = startOfDay(start);
    const e = startOfDay(end);
    if (e < s) return [];
    const out = [];
    for (let cur = new Date(s); cur <= e; cur = addDays(cur, 1)){
      if (isBusinessDay(cur)) out.push(new Date(cur));
    }
    return out;
  }
  function adjustToBusinessDay(dt){
    const d = new Date(dt);
    while (!isBusinessDay(d)) d.setDate(d.getDate() - 1);
    return d;
  }
  window.PrioridadBiz = { isBusinessDay, businessDaysBetween, adjustToBusinessDay, startOfDay, addDays };
})();
