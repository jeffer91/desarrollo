/* =========================================================
Nombre del archivo: prioridad.scheduler.js
Ruta: /prioridad/prioridad.scheduler.js
Función:
- Scheduler: detecta alertas vencidas y las marca sentAt
========================================================= */
(function(){
  const D = window.PrioridadDate;
  const Toast = window.PrioridadToast;
  const Notifs = window.PrioridadNotifs;

  const S = window.PrioridadState;
  const WAlerts = window.PrioridadDBWriteAlerts;
  const Read = window.PrioridadDBRead;

  async function tick(){
    const cache = S.getCache();
    if (!cache || cache.length === 0) return;

    const now = new Date();

    const candidates = cache.filter(e =>
      e.needsAlerts === true &&
      Array.isArray(e.alerts) &&
      e.alerts.some(a => a?.at && !a.sentAt)
    );
    if (candidates.length === 0) return;

    for (const evt of candidates){
      const idx = evt.alerts.findIndex(a => a?.at && !a.sentAt && (new Date(a.at) <= now));
      if (idx === -1) continue;

      const fresh = await Read.getEvent(evt.id);
      if (!fresh || !Array.isArray(fresh.alerts)) continue;

      const j = fresh.alerts.findIndex(a => a?.at && !a.sentAt && (new Date(a.at) <= now));
      if (j === -1) continue;

      const title = fresh.title || "Evento";
      const kind = (fresh.kind === "personal") ? "Personal" : "Trabajo";
      const pr = Number(fresh.priority || 3);

// FIX: evita caracteres corruptos (ej: "#ð") usando un título ASCII + emoji estándar
Toast.toast("Alerta de evento", `${title} · ${kind} · P${pr}`);

      Notifs.notify("Alerta de evento", `${title} · ${kind} · P${pr}`);

      await WAlerts.markAlertSent(fresh.id, j, D.nowISO());

      // cache local: marcar sentAt
      const next = cache.map(x=>{
        if (String(x.id) !== String(fresh.id)) return x;
        const alerts = Array.isArray(x.alerts) ? x.alerts.slice() : [];
        if (alerts[j]) alerts[j] = { ...alerts[j], sentAt: D.nowISO() };
        return { ...x, alerts };
      });
      S.setCache(next);

      // 1 por tick
      break;
    }
  }

  function start(intervalMs=30000){
    setInterval(()=>{ tick().catch(err=>console.error("scheduler.tick:", err)); }, intervalMs);
  }

  window.PrioridadScheduler = { start };
})();
