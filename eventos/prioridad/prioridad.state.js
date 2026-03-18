/* =========================================================
Nombre del archivo: prioridad.state.js
Ruta: /prioridad/prioridad.state.js
Función:
- Estado central cache + selectedId
- Selección múltiple selectedIds
- ✅ NUEVO: familias cache + colapsado de familias
========================================================= */
(function(){
  const state = {
    cache: [],
    selectedId: "",
    selectedIds: new Set(),

    // ✅ NUEVO: familias
    families: [],
    familiesById: {},

    // ✅ NUEVO: colapsar familia en UI
    collapsedFamilyIds: new Set()
  };

  function setCache(rows){ state.cache = rows || []; }
  function getCache(){ return state.cache || []; }

  function setSelectedId(id){ state.selectedId = String(id || ""); }
  function getSelectedId(){ return state.selectedId || ""; }

  // =========================
  // Selección múltiple
  // =========================
  function getSelectedIds(){ return Array.from(state.selectedIds); }
  function isSelectedId(id){ return state.selectedIds.has(String(id || "")); }

  function toggleSelectedId(id){
    const key = String(id || "");
    if (!key) return getSelectedIds();
    if (state.selectedIds.has(key)) state.selectedIds.delete(key);
    else state.selectedIds.add(key);
    return getSelectedIds();
  }

  function setSelectedIds(ids){
    state.selectedIds = new Set((ids || []).map(x => String(x || "")).filter(Boolean));
    return getSelectedIds();
  }

  function clearSelectedIds(){
    state.selectedIds.clear();
    return [];
  }

  function selectedCount(){ return state.selectedIds.size || 0; }

  // =========================
  // ✅ Familias
  // =========================
  function setFamilies(list){
    const fams = Array.isArray(list) ? list : [];
    state.families = fams;

    const map = {};
    for (const f of fams){
      const id = String(f?.id || "");
      if (!id) continue;
      map[id] = f;
    }
    state.familiesById = map;
  }

  function getFamilies(){ return state.families || []; }

  function getFamilyById(id){
    const key = String(id || "");
    if (!key) return null;
    return state.familiesById[key] || null;
  }

  // =========================
  // ✅ Colapsado de familias
  // =========================
  function isFamilyCollapsed(id){
    const key = String(id || "");
    if (!key) return false;
    return state.collapsedFamilyIds.has(key);
  }

  function toggleFamilyCollapsed(id){
    const key = String(id || "");
    if (!key) return false;
    if (state.collapsedFamilyIds.has(key)) state.collapsedFamilyIds.delete(key);
    else state.collapsedFamilyIds.add(key);
    return isFamilyCollapsed(key);
  }

  function clearFamilyCollapsed(){
    state.collapsedFamilyIds.clear();
  }

  window.PrioridadState = {
    setCache, getCache,
    setSelectedId, getSelectedId,

    getSelectedIds,
    isSelectedId,
    toggleSelectedId,
    setSelectedIds,
    clearSelectedIds,
    selectedCount,

    // ✅ Familias
    setFamilies,
    getFamilies,
    getFamilyById,

    // ✅ Colapsado
    isFamilyCollapsed,
    toggleFamilyCollapsed,
    clearFamilyCollapsed
  };
})();