/* =========================================================
Nombre del archivo: cap.manage.validate.js
Ruta - Ubicación: /cap.manage/cap.manage.validate.js
Función o funciones:
- validateCapForm(): valida nombre/periodo/fechas
- validateHours(): valida horas (opcional)
========================================================= */
import { cleanSpaces } from "./cap.manage.utils.js";

export function validateHours(horasRaw){
 const raw = cleanSpaces(horasRaw);
 if (!raw) return { ok:true, value:0 }; // opcional
 const n = Number(raw);
 if (!Number.isFinite(n) || n <= 0) return { ok:false, value:0, err:"Horas debe ser un número mayor a 0." };
 return { ok:true, value: Math.floor(n) };
}

export function validateCapForm({
 nombre, mesIni, anioIni, mesFin, anioFin, fechaIni, fechaFin,
 // ✅ NUEVO
 modalidad, tipoCapacitacion, tipoEvento, ambito, imparte
}){
 const errors = [];

 const nom = cleanSpaces(nombre);
 if (!nom) errors.push("Nombre es obligatorio.");

 const mi = cleanSpaces(mesIni);
 const mf = cleanSpaces(mesFin);
 const yi = Number(cleanSpaces(anioIni));
 const yf = Number(cleanSpaces(anioFin));

 if (!mi || mi.length !== 2) errors.push("Mes inicio inválido.");
 if (!mf || mf.length !== 2) errors.push("Mes fin inválido.");
 if (!Number.isFinite(yi)) errors.push("Año inicio inválido.");
 if (!Number.isFinite(yf)) errors.push("Año fin inválido.");

 // Periodo lógico: (yi,mi) <= (yf,mf)
 const pi = yi * 100 + Number(mi);
 const pf = yf * 100 + Number(mf);
 if (Number.isFinite(pi) && Number.isFinite(pf) && pi > pf){
 errors.push("El periodo inicio no puede ser mayor que el periodo fin.");
 }

 // Fechas (opcionales pero si existen, deben ser coherentes)
 const fi = cleanSpaces(fechaIni);
 const ff = cleanSpaces(fechaFin);
 if (fi && !isValidISODate(fi)) errors.push("Fecha inicio inválida.");
 if (ff && !isValidISODate(ff)) errors.push("Fecha fin inválida.");
 if (fi && ff){
 const d1 = new Date(fi + "T00:00:00");
 const d2 = new Date(ff + "T00:00:00");
 if (d1.getTime() > d2.getTime()){
 errors.push("Fecha inicio no puede ser mayor que fecha fin.");
 }
 }

 // ✅ NUEVO: validación de selects / campos adicionales (valores permitidos)
 const MODS = ["presencial","semipresencial","virtual","hibrida"];
 const TIPCAP = ["generica","especifica"];
 const TIPEVT = ["curso","taller","seminario","diplomado","conferencia"];
 const AMB = ["nacional","internacional"];

 const mod = cleanSpaces(modalidad).toLowerCase();
 const tc = cleanSpaces(tipoCapacitacion).toLowerCase();
 const te = cleanSpaces(tipoEvento).toLowerCase();
 const am = cleanSpaces(ambito).toLowerCase();
const imp = cleanSpaces(imparte);

// Comentario: al ser selects, se espera que siempre tengan valor.
if (!MODS.includes(mod)) errors.push("Modalidad inválida.");
if (!TIPCAP.includes(tc)) errors.push("Tipo de capacitación inválido.");
if (!TIPEVT.includes(te)) errors.push("Tipo (curso/taller/...) inválido.");
if (!AMB.includes(am)) errors.push("Ámbito (nacional/internacional) inválido.");

// ✅ "imparte" es opcional: si viene vacío, se permite guardar.
// Si viene con texto, se guarda tal cual (sin validar más aquí).
 return { ok: errors.length === 0, errors };
}

function isValidISODate(s){
 // Espera YYYY-MM-DD
 return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}
