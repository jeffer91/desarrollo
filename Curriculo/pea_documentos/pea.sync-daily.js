/*
Nombre del archivo: pea.sync-daily.js
Ubicación: /Curriculo/pea_documentos/pea.sync-daily.js
Función:
- Ejecutar sincronización diaria de PEA sin depender de una hora fija
- Subir pendientes locales a Firebase
- Descargar versiones remotas nuevas
- Refrescar estado visual de PEA y Currículo
*/
(function (window, document) {
  "use strict";

  window.PEA = window.PEA || {};
  var PEA = window.PEA;

  var TIMER = null;
  var INTERVAL = 10 * 60 * 1000;
  var KEY = "pea_daily_sync_date_v4";

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function readLast() {
    try { return String(localStorage.getItem(KEY) || ""); }
    catch (error) { return ""; }
  }

  function writeLast() {
    try { localStorage.setItem(KEY, todayKey()); }
    catch (error) { return false; }
    return true;
  }

  async function run(options) {
    var force = !!(options && options.force);
    var pulled = { ok: true, skipped: true, pulled: 0 };
    var pushed = { ok: true, skipped: true, pushed: 0 };

    if (!PEA.store) return { ok: false, skipped: true, reason: "PEA.store no está disponible." };
    if (!force && readLast() === todayKey()) return { ok: true, skipped: true, reason: "PEA ya sincronizó hoy." };

    if (typeof PEA.store.pullFromFirebaseIfDue === "function") pulled = await PEA.store.pullFromFirebaseIfDue(force);
    if (typeof PEA.store.pushPendingToFirebaseIfDue === "function") pushed = await PEA.store.pushPendingToFirebaseIfDue(force);

    writeLast();

    if (PEA.extraUi && typeof PEA.extraUi.refresh === "function") PEA.extraUi.refresh();
    if (PEA.firebase && typeof PEA.firebase.refreshLocalStatus === "function") await PEA.firebase.refreshLocalStatus();

    return { ok: true, skipped: false, pulled: pulled.pulled || 0, pushed: pushed.pushed || 0 };
  }

  function start() {
    if (TIMER) window.clearInterval(TIMER);
    window.setTimeout(function () { run({ force: false }).catch(function () {}); }, 2500);
    TIMER = window.setInterval(function () { run({ force: false }).catch(function () {}); }, INTERVAL);
    return TIMER;
  }

  PEA.syncDaily = { run: run, start: start };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(window, document);
