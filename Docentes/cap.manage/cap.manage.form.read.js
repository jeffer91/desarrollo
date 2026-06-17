/* =========================================================
Nombre del archivo: cap.manage.form.read.js
Ruta - Ubicación: /cap.manage/cap.manage.form.read.js
Función o funciones:
- readCapForm(): lee valores del formulario y normaliza
- buildPayload(): arma payload para Firestore
========================================================= */
import { val } from "./cap.manage.dom.js";
import { cleanSpaces, clampYear } from "./cap.manage.utils.js";
import { validateHours } from "./cap.manage.validate.js";

export function readCapForm(){
 const nombre = cleanSpaces(val("capNombre"));
 const mesIni = cleanSpaces(val("capMesIni"));
 const anioIni = String(clampYear(val("capYearIni")));
 const mesFin = cleanSpaces(val("capMesFin"));
 const anioFin = String(clampYear(val("capYearFin")));
 const fechaIni = cleanSpaces(val("capFechaIni"));
 const fechaFin = cleanSpaces(val("capFechaFin"));

 // ✅ NUEVO: campos adicionales (se guardan como strings normalizados)
 const modalidad = cleanSpaces(val("capModalidad")).toLowerCase();
 const tipoCapacitacion = cleanSpaces(val("capTipoCap")).toLowerCase();
 const tipoEvento = cleanSpaces(val("capTipoEvento")).toLowerCase();
 const ambito = cleanSpaces(val("capAmbito")).toLowerCase();
 const imparte = cleanSpaces(val("capImparte"));

 const horasRes = validateHours(val("capHoras"));
 if (!horasRes.ok) {
 return { ok:false, err: horasRes.err, payload: null };
 }

 const payload = buildPayload({
 nombre, mesIni, anioIni, mesFin, anioFin, fechaIni, fechaFin, horas: horasRes.value,
 // ✅ NUEVO
 modalidad, tipoCapacitacion, tipoEvento, ambito, imparte
 });

 return { ok:true, err:"", payload };
}

export function buildPayload({
 nombre, mesIni, anioIni, mesFin, anioFin, fechaIni, fechaFin, horas,
 modalidad, tipoCapacitacion, tipoEvento, ambito, imparte
}){
 // ✅ Ajuste a tu Firestore real:
 // - periodo: { mesIni, anioIni, mesFin, anioFin, periodoLabel }
 // - fechaInicio / fechaFin (strings ISO)
 const mi = String(mesIni || "").padStart(2, "0");
 const mf = String(mesFin || "").padStart(2, "0");
 const yi = String(anioIni || "");
 const yf = String(anioFin || "");

 return {
 nombre,
 periodo: {
 mesIni: mi, anioIni: Number(yi),
 mesFin: mf, anioFin: Number(yf),
 // mantiene tu campo existente para búsquedas/tabla (pero coherente con los valores)
 periodoLabel: `${mi}/${yi} - ${mf}/${yf}`
 },
 fechaInicio: fechaIni || "",
 fechaFin: fechaFin || "",
 horas: Number(horas || 0),

 // ✅ NUEVO: metadatos de la capacitación
 // Comentario: se guardan planos para facilitar búsqueda/tabla y edición.
 modalidad: String(modalidad || "").trim(),
 tipoCapacitacion: String(tipoCapacitacion || "").trim(),
 tipoEvento: String(tipoEvento || "").trim(),
 ambito: String(ambito || "").trim(),
 imparte: String(imparte || "").trim()
 };
}
