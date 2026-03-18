/* =========================================================
Nombre del archivo: prioridad.db.write.alerts.js
Ruta: /prioridad/prioridad.db.write.alerts.js
Función:
- setAlerts(id, alerts)
- markAlertSent(id, alertIndex, sentAtISO)
========================================================= */
(function(){
  const { COL, assertDb } = window.PrioridadDBCore;

  async function setAlerts(id, alerts){
    const db = assertDb();
    return db.collection(COL).doc(String(id)).set({ alerts: alerts || [] }, { merge:true });
  }

  async function markAlertSent(id, alertIndex, sentAtISO){
    const db = assertDb();
    const ref = db.collection(COL).doc(String(id));
    const doc = await ref.get();
    if (!doc.exists) return;
    const data = doc.data() || {};
    const alerts = Array.isArray(data.alerts) ? data.alerts.slice() : [];
    const i = Number(alertIndex);
    if (!alerts[i]) return;
    alerts[i] = { ...alerts[i], sentAt: String(sentAtISO || "") };
    return ref.set({ alerts }, { merge:true });
  }

  window.PrioridadDBWriteAlerts = { setAlerts, markAlertSent };
})();
