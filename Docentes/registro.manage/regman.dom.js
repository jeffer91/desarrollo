/* =========================================================
Nombre del archivo: regman.dom.js
Ruta - Ubicación: /registro.manage/regman.dom.js
Función:
- DOM refs
========================================================= */
export function $(id){ return document.getElementById(id); }

export const DOM = {
  msg: () => $("regmanMsg"),

  btnNew: () => $("regmanBtnNew"),
  btnSave: () => $("regmanBtnSave"),
  btnDelete: () => $("regmanBtnDelete"),

  btnLoad: () => $("regmanBtnLoad"),
  btnFile: () => $("regmanBtnFile"),
  fileInput: () => $("regmanFileInput"),

  cedula: () => $("regmanCedula"),
  nombres: () => $("regmanNombres"),
  apellidos: () => $("regmanApellidos"),
  carrera: () => $("regmanCarrera"),
  celular: () => $("regmanCelular"),
  sexo: () => $("regmanSexo"),
  titulo: () => $("regmanTitulo"),

  // Modal carga masiva
  bulkModal: () => $("regmanBulkModal"),
  bulkText: () => $("regmanBulkText"),
  bulkPreview: () => $("regmanBulkPreview"),
  bulkStats: () => $("regmanBulkStats"),
  bulkBtnClose: () => $("regmanBulkBtnClose"),
  bulkBtnProcess: () => $("regmanBulkBtnProcess"),
  bulkBtnAdd: () => $("regmanBulkBtnAdd"),

  // Buscador del formulario
  search: () => $("regmanSearch"),

  // Tabla: buscador predictor + filtros
  tableSearch: () => $("regmanTableSearch"),
  tableSearchList: () => $("regmanTableSearchList"),
  filterSexo: () => $("regmanFilterSexo"),
  filterCarrera: () => $("regmanFilterCarrera"),
  filterClear: () => $("regmanFilterClear"),
  tableHost: () => $("regmanTableHost"),

  // ✅ Errores
  btnErrors: () => $("regmanBtnErrors"),
  errBadge: () => $("regmanErrBadge"),
  errModal: () => $("regmanErrModal"),
  errBtnClose: () => $("regmanErrBtnClose"),
  errCount: () => $("regmanErrCount"),
  errList: () => $("regmanErrList")
};
