/* =========================================================
Nombre completo: localsave/localsave.scheduler.js
Función:
- Scheduler de sincronización automática
- Ejecuta push una sola vez al día en la ventana 17:00 a 18:00
- Permite disparo manual cuando se necesite
========================================================= */
(function attachLocalSaveScheduler(window) {
  "use strict";

  var intervalId = null;
  var runningTick = false;

  function must(name) {
    var value = window[name];
    if (!value) {
      throw new Error(name + " no disponible.");
    }
    return value;
  }

  function nowDate() {
    return new Date();
  }

  function pad2(value) {
    return String(Number(value || 0)).padStart(2, "0");
  }

  function getDayKey(date) {
    var d = date instanceof Date ? date : nowDate();
    return [
      d.getFullYear(),
      pad2(d.getMonth() + 1),
      pad2(d.getDate())
    ].join("-");
  }

  function readJsonStorage(key) {
    try {
      var raw = window.localStorage.getItem(String(key || ""));
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function writeJsonStorage(key, value) {
    try {
      window.localStorage.setItem(String(key || ""), JSON.stringify(value || {}));
      return true;
    } catch (error) {
      return false;
    }
  }

  function getMinutesOfDay(date) {
    var d = date instanceof Date ? date : nowDate();
    return d.getHours() * 60 + d.getMinutes();
  }

  function buildMinutes(hour, minute) {
    return Number(hour || 0) * 60 + Number(minute || 0);
  }

  function isMinuteInWindow(date, startHour, startMinute, endHour, endMinute) {
    var minute = getMinutesOfDay(date);
    var start = buildMinutes(startHour, startMinute);
    var end = buildMinutes(endHour, endMinute);
    return minute >= start && minute < end;
  }

  function getPushStateKey() {
    var Config = must("LocalSaveConfig");
    var cfg = Config.get();
    return (
      cfg.workday &&
      cfg.workday.eveningPush &&
      cfg.workday.eveningPush.stateStorageKey
    ) || "__localsave_push_state__";
  }

  function hasRunToday(date) {
    var key = getPushStateKey();
    var state = readJsonStorage(key);
    return state.lastRunDay === getDayKey(date);
  }

  function markRunToday(date, payload) {
    var key = getPushStateKey();
    writeJsonStorage(key, {
      lastRunDay: getDayKey(date),
      lastRunAt: new Date().toISOString(),
      payload: payload || null
    });
  }

  function clearRunState() {
    var key = getPushStateKey();
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function canRunAutoNow(date) {
    var Config = must("LocalSaveConfig");
    var cfg = Config.get();
    var pushCfg = cfg.workday && cfg.workday.eveningPush ? cfg.workday.eveningPush : {};
    if (!cfg.sync.enabled || !pushCfg.enabled) {
      return false;
    }
    if (!isMinuteInWindow(
      date,
      pushCfg.startHour24,
      pushCfg.startMinute,
      pushCfg.endHour24,
      pushCfg.endMinute
    )) {
      return false;
    }
    if (pushCfg.oncePerDay && hasRunToday(date)) {
      return false;
    }
    return true;
  }

  async function tick() {
    if (runningTick) {
      return;
    }
    runningTick = true;
    try {
      if (!canRunAutoNow(nowDate())) {
        return;
      }
      var Sync = must("LocalSaveSync");
      var result = await Sync.run({
        trigger: "scheduler",
        reason: "Ventana automática de sincronización 17:00-18:00"
      });
      if (result && result.ok) {
        markRunToday(nowDate(), {
          processed: Number(result.processed || 0),
          succeeded: Number(result.succeeded || 0),
          failed: Number(result.failed || 0)
        });
      }
    } catch (error) {
      console.error("[LocalSaveScheduler] Error en tick:", error);
    } finally {
      runningTick = false;
    }
  }

  function start() {
    var Config = must("LocalSaveConfig");
    var cfg = Config.get();
    var everyMs = Number(cfg.sync.schedulerIntervalMs || 60000);

    if (intervalId) {
      return {
        ok: true,
        alreadyRunning: true,
        intervalMs: everyMs
      };
    }

    intervalId = window.setInterval(tick, everyMs);

    if (cfg.sync.retryOnOpen) {
      window.setTimeout(function () {
        tick();
      }, 1500);
    }

    return {
      ok: true,
      alreadyRunning: false,
      intervalMs: everyMs
    };
  }

  function stop() {
    if (intervalId) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
    return { ok: true };
  }

  async function runNow(options) {
    var Sync = must("LocalSaveSync");
    return Sync.run(Object.assign({
      trigger: "manual",
      reason: "Sincronización manual"
    }, options || {}));
  }

  function getState() {
    return {
      running: !!intervalId,
      hasRunToday: hasRunToday(nowDate()),
      today: getDayKey(nowDate())
    };
  }

  window.LocalSaveScheduler = {
    start: start,
    stop: stop,
    tick: tick,
    runNow: runNow,
    getState: getState,
    canRunAutoNow: canRunAutoNow,
    hasRunToday: hasRunToday,
    markRunToday: markRunToday,
    clearRunState: clearRunState,
    isMinuteInWindow: isMinuteInWindow
  };
})(window);