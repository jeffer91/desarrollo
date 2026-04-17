/* =========================================================
Nombre del archivo: regman.form.write.js
Ruta - Ubicación: /registro.manage/regman.form.write.js
Función o funciones:
- clearForm()
- fillForm(docente)
========================================================= */

import { DOM } from "./regman.dom.js";

export function clearForm(){
  if (DOM.cedula()) DOM.cedula().value = "";
  if (DOM.nombres()) DOM.nombres().value = "";
  if (DOM.apellidos()) DOM.apellidos().value = "";
  if (DOM.carrera()) DOM.carrera().value = "";
  if (DOM.celular()) DOM.celular().value = "";
  if (DOM.sexo()) DOM.sexo().value = ""; // FIX: limpiar sexo para evitar que quede “pegado” al crear nuevo
  if (DOM.titulo()) DOM.titulo().value = "";
}

export function fillForm(d){
  const x = d || {};
  if (DOM.cedula()) DOM.cedula().value = x.cedula || "";
  if (DOM.nombres()) DOM.nombres().value = x.nombres || "";
  if (DOM.apellidos()) DOM.apellidos().value = x.apellidos || "";
  if (DOM.carrera()) DOM.carrera().value = x.carreraId || "";
  if (DOM.celular()) DOM.celular().value = x.celular || "";
  if (DOM.sexo()) DOM.sexo().value = x.sexo || ""; // FIX: cargar sexo (F/M) al editar/seleccionar
  if (DOM.titulo()) DOM.titulo().value = x.titulo || "";
}

