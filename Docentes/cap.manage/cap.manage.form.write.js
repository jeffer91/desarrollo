/* =========================================================
Nombre del archivo: cap.manage.form.write.js
Ruta - Ubicación: /cap.manage/cap.manage.form.write.js
Función o funciones:
- clearCapForm(state)
- fillCapFormFromRow(state, row)
- setFormMode(state, isEdit, editId)
========================================================= */
import { $ } from "./cap.manage.dom.js";
import { setFormModeTitle, msg, clampYear } from "./cap.manage.utils.js";

export function setFormMode(state, isEdit, editId){
 if (isEdit){
 state.setEditId(editId || "");
 setFormModeTitle(true);
 } else {
 state.setEditId("");
 setFormModeTitle(false);
 }
}

export function clearCapForm(state){
 $("capNombre").value = "";
 $("capFechaIni").value = "";
 $("capFechaFin").value = "";
 $("capHoras").value = "";

 // ✅ NUEVO: resetea selects / input nuevos a valores por defecto
 if ($("capModalidad")) $("capModalidad").value = "presencial";
 if ($("capTipoCap")) $("capTipoCap").value = "generica";
 if ($("capTipoEvento")) $("capTipoEvento").value = "curso";
 if ($("capAmbito")) $("capAmbito").value = "nacional";
 if ($("capImparte")) $("capImparte").value = "";

 // no forzamos meses, pero sí normalizamos años
 $("capYearIni").value = String(clampYear($("capYearIni").value));
 $("capYearFin").value = String(clampYear($("capYearFin").value));

 setFormMode(state, false, "");
 msg("Formulario limpio. Listo para crear.", "info");
}

export function fillCapFormFromRow(state, row){
 if (!row) return;

 $("capNombre").value = row.nombre || "";
 const p = row.periodo || {};

 // ✅ Firestore real: periodo.mesIni/anioIni/mesFin/anioFin (evita que edición quede en blanco)
 if ($("capMesIni")) $("capMesIni").value = (p.mesIni || "01");
 if ($("capYearIni")) $("capYearIni").value = String(clampYear(p.anioIni || new Date().getFullYear()));
 if ($("capMesFin")) $("capMesFin").value = (p.mesFin || "01");
 if ($("capYearFin")) $("capYearFin").value = String(clampYear(p.anioFin || new Date().getFullYear()));

 // ✅ Firestore real: fechaInicio/fechaFin (no row.fechas.inicio/fin)
 $("capFechaIni").value = row.fechaInicio || "";
 $("capFechaFin").value = row.fechaFin || "";

 // ✅ Horas: tolerante a nombres comunes (evita mostrar vacío si no se llama "horas")
 const h = (row.horas ?? row.duracionHoras ?? row.duracion);
 $("capHoras").value = (h != null ? String(h) : "");

 // ✅ NUEVO: carga campos adicionales (fallback a defaults para no dejar select “sin valor”)
 if ($("capModalidad")) $("capModalidad").value = (row.modalidad || "presencial");
 if ($("capTipoCap")) $("capTipoCap").value = (row.tipoCapacitacion || "generica");
 if ($("capTipoEvento")) $("capTipoEvento").value = (row.tipoEvento || "curso");
 if ($("capAmbito")) $("capAmbito").value = (row.ambito || "nacional");
 if ($("capImparte")) $("capImparte").value = (row.imparte || "");

 setFormMode(state, true, row.id);
 msg("Modo edición: actualiza y guarda cambios.", "warn");
}
