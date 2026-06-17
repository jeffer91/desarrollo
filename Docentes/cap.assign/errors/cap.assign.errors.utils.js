/* =========================================================
Nombre del archivo: cap.assign.errors.utils.js
Ruta - Ubicación: /cap.assign/errors/cap.assign.errors.utils.js
Función:
- Utils comunes (escape, groupBy, toast, safeErr, etc.)
========================================================= */

import { cleanSpaces } from "../cap.assign.utils.js";

export function str(x){
  return (x == null) ? "" : String(x).trim();
}

export function onlyDigits(s){
  return str(s).replace(/[^\d]/g, "");
}

export function num(n){
  return Number.isFinite(Number(n)) ? Number(n) : 0;
}

export function isSet(x){
  return !!x && typeof x.has === "function" && typeof x.add === "function";
}

export function hasSet(setLike, v){
  return isSet(setLike) ? setLike.has(v) : false;
}

export function groupBy(arr, keyFn){
  const out = {};
  (arr || []).forEach(x => {
    const k = keyFn(x);
    if (!out[k]) out[k] = [];
    out[k].push(x);
  });
  return out;
}

export function safeErr(e){
  if (!e) return "desconocido";
  const m = e.message ? e.message : String(e);
  return cleanSpaces(m).slice(0, 220);
}

export function escapeHtml(s){
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttr(s){
  return escapeHtml(s).replace(/`/g, "");
}

export function toast(msg){
  try{
    const el = document.createElement("div");
    el.textContent = String(msg || "");
    el.style.position = "fixed";
    el.style.right = "14px";
    el.style.bottom = "14px";
    el.style.padding = "10px 12px";
    el.style.borderRadius = "12px";
    el.style.background = "rgba(15,23,42,.92)";
    el.style.color = "#fff";
    el.style.fontWeight = "800";
    el.style.zIndex = "999999";
    el.style.boxShadow = "0 10px 26px rgba(2,6,23,.25)";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }catch(_){}
}
