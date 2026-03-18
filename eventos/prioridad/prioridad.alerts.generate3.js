/* =========================================================
Nombre del archivo: prioridad.alerts.generate3.js
Ruta: /prioridad/prioridad.alerts.generate3.js
Función:
- Genera 3 alertas por defecto entre startAt y deadline (solo días laborables)
========================================================= */
(function(){
  const D = window.PrioridadDate;
  const B = window.PrioridadBiz;

  function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }

  function withTime(day, timeFrom){
    const d = new Date(day);
    d.setHours(timeFrom.getHours(), timeFrom.getMinutes(), 0, 0);
    return d;
  }

  function generate3(startAtISO, deadlineISO){
    const s = D.toDate(startAtISO);
    const e = D.toDate(deadlineISO);
    if (!s || !e) return [];

    let start = s, end = e;
    if (end < start){ start = e; end = s; }

    const days = B.businessDaysBetween(start, end);

    if (days.length === 0){
      const a = B.adjustToBusinessDay(start);
      const b = B.adjustToBusinessDay(end);
      const base = withTime(a, start);
      const last = withTime(b, end);
      const mid = new Date(base.getTime() + (last.getTime()-base.getTime())/2);
      return [base, mid, last].map(x => D.iso(B.adjustToBusinessDay(x)));
    }

    const lastIdx = days.length - 1;
    const idx1 = clamp(Math.round(lastIdx * (1/3)), 0, lastIdx);
    const idx2 = clamp(Math.round(lastIdx * (2/3)), 0, lastIdx);
    const idx3 = lastIdx;

    const nine = new Date(); nine.setHours(9,0,0,0);

    const a1 = B.adjustToBusinessDay(withTime(days[idx1], nine));
    const a2 = B.adjustToBusinessDay(withTime(days[idx2], nine));

    const endDay = B.adjustToBusinessDay(withTime(B.startOfDay(end), end));
    const a3 = endDay;

    let arr = [a1, a2, a3].sort((x,y)=>x-y);

    // Dedup
    const seen = new Set();
    arr = arr.map((d)=>{
      let t = d.getTime();
      while (seen.has(t)){
        d = new Date(d.getTime() + 60*60*1000);
        d = B.adjustToBusinessDay(d);
        t = d.getTime();
      }
      seen.add(t);
      return d;
    });

    return arr.map(D.iso);
  }

  window.PrioridadAlertsGen = { generate3 };
})();
