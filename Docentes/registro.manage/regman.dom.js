/* =========================================================
Nombre del archivo: regman.dom.js
Ruta - Ubicación: /registro.manage/regman.dom.js
Función o funciones:
- Referencias DOM centralizadas de la pantalla Registro · Gestión
- Referencias del formulario de docentes
- Referencias de búsqueda, filtros y tabla
- Referencias de carga masiva
- Referencias de errores
- Referencia del botón Descargar Excel
========================================================= */

export function $(id){
  return document.getElementById(id);
}

export const DOM = {
  /* =========================================================
  Mensajes
  ========================================================== */
  msg: () => $("regmanMsg"),

  /* =========================================================
  Botones principales del formulario
  ========================================================== */
  btnNew: () => $("regmanBtnNew"),
  btnSave: () => $("regmanBtnSave"),
  btnDelete: () => $("regmanBtnDelete"),
  btnSwapNA: () => $("regmanBtnSwapNA"),

  /* =========================================================
  Botones de tabla / herramientas
  ========================================================== */
  btnLoad: () => $("regmanBtnLoad"),
  btnFile: () => $("regmanBtnFile"),
  btnExportExcel: () => $("regmanBtnExportExcel"),
  fileInput: () => $("regmanFileInput"),

  /* =========================================================
  Formulario de docente
  ========================================================== */
  cedula: () => $("regmanCedula"),
  nombres: () => $("regmanNombres"),
  apellidos: () => $("regmanApellidos"),
  carrera: () => $("regmanCarrera"),
  celular: () => $("regmanCelular"),
  sexo: () => $("regmanSexo"),
  titulo: () => $("regmanTitulo"),

  /* =========================================================
  Carga masiva
  ========================================================== */
  bulkModal: () => $("regmanBulkModal"),
  bulkText: () => $("regmanBulkText"),
  bulkPreview: () => $("regmanBulkPreview"),
  bulkStats: () => $("regmanBulkStats"),
  bulkBtnClose: () => $("regmanBulkBtnClose"),
  bulkBtnProcess: () => $("regmanBulkBtnProcess"),
  bulkBtnAdd: () => $("regmanBulkBtnAdd"),

  /* =========================================================
  Buscador del formulario
  ========================================================== */
  search: () => $("regmanSearch"),
  searchList: () => $("regmanSearchList"),

  /* =========================================================
  Tabla: búsqueda, filtros y contenedor
  ========================================================== */
  tableSearch: () => $("regmanTableSearch"),
  tableSearchList: () => $("regmanTableSearchList"),
  filterSexo: () => $("regmanFilterSexo"),
  filterCarrera: () => $("regmanFilterCarrera"),
  filterClear: () => $("regmanFilterClear"),
  tableHost: () => $("regmanTableHost"),

  /* =========================================================
  Errores
  ========================================================== */
  btnErrors: () => $("regmanBtnErrors"),
  errBadge: () => $("regmanErrBadge"),
  errModal: () => $("regmanErrModal"),
  errBtnClose: () => $("regmanErrBtnClose"),
  errCount: () => $("regmanErrCount"),
  errList: () => $("regmanErrList")
};