/* =========================================================
Nombre del archivo: prioridad.utils.js
Ruta: /prioridad/prioridad.utils.js
Función:
- Helpers: escape, fechas, business-days, generación 3 alertas laborables
========================================================= */

(function(){
  function esc(x){
    return String(x ?? "")
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }

  function toDate(x){
    if (!x) return null;
    const d = new Date(x);
    return isNaN(d.getTime()) ? null : d;
  }

  function toLocalInputValue(d){
    if (!d) return "";
    const pad = (n)=> String(n).padStart(2,"0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth()+1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  function iso(d){ return (d instanceof Date) ? d.toISOString() : ""; }

  function nowISO(){ return new Date().toISOString(); }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  // Lunes(1) ... Viernes(5) = laborable
  function isBusinessDay(d){
    const day = d.getDay(); // 0 dom, 6 sáb
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

  // Devuelve lista de fechas (Date) laborables entre start y end (incluye ambos si son laborables)
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

  // Ajusta una fecha/hora a laborable: si cae sábado/domingo => retrocede al viernes anterior manteniendo hora
  function adjustToBusinessDay(dt){
    const d = new Date(dt);
    while (!isBusinessDay(d)){
      d.setDate(d.getDate() - 1);
    }
    return d;
  }

  // Crea un Date usando fecha de "day" + hora/minutos de "timeFrom"
  function withTime(day, timeFrom){
    const d = new Date(day);
    d.setHours(timeFrom.getHours(), timeFrom.getMinutes(), 0, 0);
    return d;
  }

  // Genera 3 alertas laborables distribuidas entre startAt y deadline.
  // - Usa días laborables (L-V)
  // - La 3ra alerta apunta al día del evento (o el laborable anterior si cae fin de semana)
  // - Si hay pocos días laborables, “colapsa” sin repetir exacto en lo posible.
  function generate3BusinessAlerts(startAt, deadline){
    const s = toDate(startAt);
    const e = toDate(deadline);
    if (!s || !e) return [];

    // Si start > end, intercambia
    let start = s, end = e;
    if (end < start){ start = e; end = s; }

    const days = businessDaysBetween(start, end);

    // Si no hay días laborables (raro), ajusta ambos a laborable y crea 3 iguales escalonadas por horas.
    if (days.length === 0){
      const a = adjustToBusinessDay(start);
      const b = adjustToBusinessDay(end);
      const base = withTime(a, start);
      const last = withTime(b, end);
      const mid = new Date(base.getTime() + (last.getTime()-base.getTime())/2);
      return [base, mid, last].map(x => iso(adjustToBusinessDay(x)));
    }

    // Elegir índices aproximadamente 1/3, 2/3, 3/3 (último = último día)
    const lastIdx = days.length - 1;
    const idx1 = clamp(Math.round(lastIdx * (1/3)), 0, lastIdx);
    const idx2 = clamp(Math.round(lastIdx * (2/3)), 0, lastIdx);
    const idx3 = lastIdx;

    // Hora: primera y segunda a las 09:00 (para que avise temprano), tercera a la hora del evento
    const nine = new Date(); nine.setHours(9,0,0,0);

    const a1 = withTime(days[idx1], nine);
    const a2 = withTime(days[idx2], nine);

    // Tercera: día del evento (si no laborable, se ajusta), con hora del deadline
    const endDay = adjustToBusinessDay(withTime(startOfDay(end), end));
    const a3 = endDay;

    // Asegurar orden y evitar duplicados exactos (si colapsa por pocos días)
    let arr = [a1, a2, a3].map(adjustToBusinessDay).sort((x,y)=>x-y);

    // Dedup por timestamp; si hay duplicados, desplaza 1 hora hacia adelante (manteniendo laborable) para diferenciar
    const seen = new Set();
    arr = arr.map((d)=>{
      let t = d.getTime();
      while (seen.has(t)){
        d = new Date(d.getTime() + 60*60*1000);
        d = adjustToBusinessDay(d);
        t = d.getTime();
      }
      seen.add(t);
      return d;
    });

    return arr.map(iso);
  }

  // Formato simple para UI
  function fmtLocal(dtISO){
    const d = toDate(dtISO);
    if (!d) return "";
    return d.toLocaleString();
  }

  window.PrioridadUtils = {
    esc,
    toDate,
    iso,
    nowISO,
    toLocalInputValue,
    generate3BusinessAlerts,
    fmtLocal
  };
})();
