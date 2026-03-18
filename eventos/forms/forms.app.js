/* =========================================================
Nombre del archivo: forms.app.js
Ruta: /forms.app.js
Función o funciones:
- Orquesta la app:
  init, submit form, reload, buscar, eliminar
- Soporta eventos y pendientes
- Valida fecha solo para eventos
- Carga familias desde Firestore
========================================================= */
(function(){
  const Utils = window.FormsUtils || {};
  const DB = window.FormsDB || {};
  const UI = window.FormsUI || {};

  const uid = Utils.uid;
  const nowISO = Utils.nowISO;

  const addEvent = DB.addEvent;
  const listEvents = DB.listEvents;
  const deleteEvent = DB.deleteEvent;
  const listFamilies = DB.listFamilies;

  const setPill = UI.setPill;
  const showMsg = UI.showMsg;
  const renderList = UI.renderList;
  const fillFamilySelect = UI.fillFamilySelect;
  const syncTypeUi = UI.syncTypeUi;

  let cache = [];
  let familiesCache = [];

  function $(id){
    return document.getElementById(id);
  }

  function getValue(id){
    return String($(id)?.value || "").trim();
  }

  function currentType(){
    return getValue("type") === "pending" ? "pending" : "event";
  }

  function applyTypeUi(){
    const type = currentType();

    if (typeof syncTypeUi === "function"){
      syncTypeUi(type);
    }

    const statusEl = $("status");
    if (statusEl){
      const current = String(statusEl.value || "").trim();
      const canAutoReplace =
        !current ||
        current === "programado" ||
        current === "pendiente";

      if (canAutoReplace){
        statusEl.value = type === "pending" ? "pendiente" : "programado";
      }
    }
  }

  function readForm(){
    return {
      type: currentType(),
      title: getValue("title"),
      date: getValue("date"),
      time: getValue("time"),
      place: getValue("place"),
      responsible: getValue("responsible"),
      familyId: getValue("familyId"),
      status: getValue("status"),
      desc: getValue("desc")
    };
  }

  function normalizeData(data){
    const type = String(data.type || "").toLowerCase() === "pending" ? "pending" : "event";

    const row = {
      type,
      title: String(data.title || "").trim(),
      date: String(data.date || "").trim(),
      time: String(data.time || "").trim(),
      place: String(data.place || "").trim(),
      responsible: String(data.responsible || "").trim(),
      familyId: String(data.familyId || "").trim(),
      status: String(data.status || "").trim(),
      desc: String(data.desc || "").trim()
    };

    if (type === "pending"){
      row.time = "";
      row.place = "";
      if (!row.status) row.status = "pendiente";
    }else{
      if (!row.status) row.status = "programado";
    }

    return row;
  }

  function validateData(data){
    if (!data.title){
      return "Escribe un título.";
    }

    if (data.type === "event" && !data.date){
      return "La fecha es obligatoria para un evento.";
    }

    return "";
  }

  function clearForm(){
    const map = {
      type: "event",
      title: "",
      date: "",
      time: "",
      place: "",
      responsible: "",
      familyId: "",
      status: "programado",
      desc: ""
    };

    Object.keys(map).forEach(id => {
      const el = $(id);
      if (!el) return;
      el.value = map[id];
    });

    if (typeof fillFamilySelect === "function"){
      fillFamilySelect(familiesCache, "");
    }

    applyTypeUi();
  }

  function filterRows(q){
    const needle = String(q || "").toLowerCase().trim();
    if (!needle) return cache;

    return cache.filter(r => {
      const bag = [
        r.title,
        r.responsible,
        r.desc,
        r.status,
        r.familyId,
        r.familyLabel,
        r.familyName
      ]
        .map(x => String(x || "").toLowerCase())
        .join(" ");

      return bag.includes(needle);
    });
  }

  async function loadFamilies(){
    if (typeof listFamilies !== "function" || typeof fillFamilySelect !== "function"){
      return;
    }

    try{
      familiesCache = await listFamilies();
      fillFamilySelect(familiesCache, $("familyId")?.value || "");
    }catch(err){
      console.warn("No se pudo cargar familias.", err);
      familiesCache = [];
      fillFamilySelect([], $("familyId")?.value || "");
    }
  }

  async function reload(){
    if (typeof showMsg === "function") showMsg("");
    if (typeof setPill === "function") setPill("Estado: cargando…");

    try{
      cache = typeof listEvents === "function" ? await listEvents() : [];
      if (typeof renderList === "function"){
        renderList(filterRows($("q")?.value));
      }
      if (typeof setPill === "function") setPill("Estado: listo");
    }catch(err){
      console.error(err);
      if (typeof setPill === "function") setPill("Estado: error");
      if (typeof showMsg === "function"){
        showMsg("No se pudo cargar registros. Revisa consola.", "error");
      }
    }
  }

  async function onSubmit(e){
    e.preventDefault();

    if (typeof showMsg === "function") showMsg("");

    const data = normalizeData(readForm());
    const error = validateData(data);

    if (error){
      if (typeof showMsg === "function") showMsg(error, "warn");
      return;
    }

    const payload = {
      ...data,
      uid: typeof uid === "function" ? uid("evt") : ("evt_" + Date.now()),
      createdAt: typeof nowISO === "function" ? nowISO() : new Date().toISOString(),
      updatedAt: typeof nowISO === "function" ? nowISO() : new Date().toISOString()
    };

    const btn = $("btnSave");
    if (btn) btn.disabled = true;

    try{
      if (typeof addEvent !== "function"){
        throw new Error("FormsDB.addEvent no está disponible.");
      }

      await addEvent(payload);

      if (typeof showMsg === "function"){
        showMsg(
          payload.type === "pending" ? "Pendiente guardado." : "Evento guardado.",
          "ok"
        );
      }

      clearForm();
      await reload();
    }catch(err){
      console.error(err);
      if (typeof showMsg === "function"){
        showMsg("No se pudo guardar. Revisa permisos o reglas de Firestore.", "error");
      }
    }finally{
      if (btn) btn.disabled = false;
    }
  }

  async function onListClick(e){
    const btn = e.target?.closest?.("button[data-action]");
    if (!btn) return;

    const item = btn.closest(".item");
    const id = item?.dataset?.id;
    if (!id) return;

    if (btn.dataset.action === "del"){
      try{
        if (typeof deleteEvent !== "function"){
          throw new Error("FormsDB.deleteEvent no está disponible.");
        }

        await deleteEvent(id);
        await reload();
      }catch(err){
        console.error(err);
        if (typeof showMsg === "function"){
          showMsg("No se pudo eliminar. Revisa consola.", "error");
        }
      }
    }
  }

  async function init(){
    if (typeof setPill === "function"){
      setPill(window.db ? "Estado: conectado" : "Estado: sin DB");
    }

    const form = $("eventForm");
    const btnClear = $("btnClear");
    const btnReload = $("btnReload");
    const listHost = $("eventsList");
    const q = $("q");
    const type = $("type");

    if (form) form.addEventListener("submit", onSubmit);

    if (btnClear){
      btnClear.addEventListener("click", () => {
        clearForm();
        if (typeof showMsg === "function") showMsg("");
      });
    }

    if (btnReload){
      btnReload.addEventListener("click", reload);
    }

    if (listHost){
      listHost.addEventListener("click", onListClick);
    }

    if (q){
      q.addEventListener("input", () => {
        if (typeof renderList === "function"){
          renderList(filterRows(q.value));
        }
      });
    }

    if (type){
      type.addEventListener("change", applyTypeUi);
    }

    applyTypeUi();
    await loadFamilies();
    await reload();
  }

  document.addEventListener("DOMContentLoaded", init);
})();