/* =========================================================
Nombre del archivo: regman.state.js
Ruta - Ubicación: /registro.manage/regman.state.js
Función:
- Estado central (incluye sortKey/sortDir)
========================================================= */
export function createRegManageState(){
  const S = {
    docentes: [],
    carreras: [],
    careersIndex: null,

    selectedCedula: "",

    // búsqueda + filtros
    search: "",
    filterSexo: "",
    filterCarreraId: "",

    // ✅ sort
    sortKey: "apellidos",
    sortDir: "asc"
  };

  function setCarreras(carreras){
    S.carreras = carreras || [];
  }

  function setDocentes(docentes){
    S.docentes = docentes || [];
  }

  function setSelectedCedula(ced){
    S.selectedCedula = ced || "";
  }

  function setSearch(q){
    S.search = q || "";
  }

  function setFilterSexo(v){
    S.filterSexo = v || "";
  }

  function setFilterCarreraId(v){
    S.filterCarreraId = v || "";
  }

  function setCareersIndex(idx){
    S.careersIndex = idx || null;
  }

  function setSort(key, dir){
    S.sortKey = key || "";
    S.sortDir = (dir === "desc") ? "desc" : "asc";
  }

  return {
    S,
    setCarreras,
    setDocentes,
    setSelectedCedula,
    setSearch,
    setFilterSexo,
    setFilterCarreraId,
    setCareersIndex,
    setSort
  };
}
