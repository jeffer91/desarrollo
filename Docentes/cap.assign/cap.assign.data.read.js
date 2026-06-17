/* =========================================================
Nombre del archivo: cap.assign.data.read.js
Ruta - Ubicación: /cap.assign/cap.assign.data.read.js
Función o funciones:
- listarCarreras()
- listarDocentes()
- listarCapacitaciones()
- Normaliza el período de cada capacitación para permitir filtro superior por período
========================================================= */
import { getDb } from "./cap.assign.firebase.js";

export async function listarCarreras(){
  const db = await getDb();
  const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
  const snap = await getDocs(collection(db, "carreras"));
  const rows = [];
  snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
  return rows;
}

export async function listarDocentes(){
  const db = await getDb();
  const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
  const snap = await getDocs(collection(db, "docentes"));
  const rows = [];

  snap.forEach((d) => {
    const data = d.data() || {};
    const nombres = (data.nombres || data.nombre || "").toString().trim();
    const apellidos = (data.apellidos || "").toString().trim();
    const nombreCompleto = [nombres, apellidos].filter(Boolean).join(" ").trim();

    rows.push({
      id: d.id,
      ...data,
      nombre: data.nombre || nombreCompleto,
      cedula: data.cedula || d.id
    });
  });

  return rows;
}

export async function listarCapacitaciones(){
  const db = await getDb();
  const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
  const snap = await getDocs(collection(db, "capacitaciones"));
  const rows = [];

  snap.forEach((d) => {
    rows.push(normalizarCapacitacion({ id: d.id, ...d.data() }));
  });

  return ordenarCapacitaciones(rows);
}

function normalizarCapacitacion(row){
  const data = row || {};
  const periodo = normalizarPeriodo(
    data.periodo || {
      mesIni: data.mesIni,
      anioIni: data.anioIni,
      mesFin: data.mesFin,
      anioFin: data.anioFin,
      periodoLabel: data.periodoLabel
    }
  );

  return {
    ...data,
    id: String(data.id || "").trim(),
    nombre: String(data.nombre || data.titulo || data.id || "").trim(),
    periodo,
    periodoKey: periodo.key,
    periodoLabel: periodo.periodoLabel
  };
}

function normalizarPeriodo(raw){
  const src = raw || {};
  const mesIni = padMonth(src.mesIni || src.mesInicio || "");
  const anioIni = toYear(src.anioIni || src.anioInicio || "");
  const mesFin = padMonth(src.mesFin || src.mesFinal || src.mesHasta || "");
  const anioFin = toYear(src.anioFin || src.anioFinal || src.anioHasta || "");

  let periodoLabel = String(src.periodoLabel || "").trim();

  if (!periodoLabel && mesIni && anioIni && mesFin && anioFin){
    periodoLabel = `${mesIni}/${anioIni} - ${mesFin}/${anioFin}`;
  } else if (!periodoLabel && mesIni && anioIni){
    periodoLabel = `${mesIni}/${anioIni}`;
  } else if (!periodoLabel){
    periodoLabel = "Sin período";
  }

  const key =
    mesIni && anioIni && mesFin && anioFin
      ? `${anioIni}-${mesIni}_${anioFin}-${mesFin}`
      : "__sin_periodo__";

  return {
    mesIni,
    anioIni: anioIni ? Number(anioIni) : "",
    mesFin,
    anioFin: anioFin ? Number(anioFin) : "",
    periodoLabel,
    key
  };
}

function ordenarCapacitaciones(rows){
  return (Array.isArray(rows) ? rows.slice() : []).sort((a, b) => {
    const byPeriodo = getPeriodoSortValue(b) - getPeriodoSortValue(a);
    if (byPeriodo !== 0) return byPeriodo;
    return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", { sensitivity: "base" });
  });
}

function getPeriodoSortValue(row){
  const p = (row && row.periodo) || {};
  const yi = Number(p.anioIni || 0);
  const mi = Number(p.mesIni || 0);
  const yf = Number(p.anioFin || 0);
  const mf = Number(p.mesFin || 0);
  return (yi * 100 + mi) * 10000 + (yf * 100 + mf);
}

function padMonth(value){
  const n = String(value || "").replace(/[^\d]/g, "");
  if (!n) return "";
  return n.padStart(2, "0").slice(-2);
}

function toYear(value){
  const n = String(value || "").replace(/[^\d]/g, "");
  if (!n) return "";
  return n.slice(0, 4);
}