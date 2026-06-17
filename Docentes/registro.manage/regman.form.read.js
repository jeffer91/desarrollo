/* =========================================================
Nombre del archivo: regman.form.read.js
Ruta - Ubicación: /registro.manage/regman.form.read.js
Función o funciones:
- readForm({ careersIndex }): retorna docente normalizado
========================================================= */

import { DOM } from "./regman.dom.js";

function s(x){ return (x === null || x === undefined) ? "" : String(x); }
function clean(x){ return s(x).replace(/\s+/g, " ").trim(); }

export function readForm({ careersIndex }){
  const cedula = clean(DOM.cedula()?.value);
  const nombres = clean(DOM.nombres()?.value);
  const apellidos = clean(DOM.apellidos()?.value);
  const carreraId = clean(DOM.carrera()?.value);
  const celular = clean(DOM.celular()?.value);
  const titulo = clean(DOM.titulo()?.value);
  const sexo = clean(DOM.sexo()?.value); // FIX: incluir sexo (F/M) para persistir en DB

  const carreraNombre = careersIndex && carreraId ? (careersIndex[carreraId] || "") : "";

  return { cedula, nombres, apellidos, carreraId, carreraNombre, celular, titulo, sexo };

}
