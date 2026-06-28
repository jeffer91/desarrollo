/*
  Nombre completo: ta-titulo-articulo-admin-periodos-normalizados.app.js
  Ruta o ubicación: /Requisitos/Titulos/src/admin/ta-titulo-articulo-admin-periodos-normalizados.app.js
  Función o funciones:
  - Normalizar visualmente los períodos del panel administrador.
  - Unificar opciones repetidas del selector de períodos sin borrar datos de Firestore.
  - Mantener una sola opción por período académico equivalente.
  - Corregir mayúsculas de meses para que el selector se vea limpio.
  Se conecta con:
  - Requisitos/Titulos/public/ta-titulo-articulo-admin.html
  - Requisitos/Titulos/electron/admin/ta-titulo-articulo-administrador.html
  - Requisitos/Titulos/src/admin/ta-titulo-articulo-admin.app.js
*/

const SELECT_ID = "ta-admin-periodo-select";

const MESES = Object.freeze({
  enero: "Enero",
  febrero: "Febrero",
  marzo: "Marzo",
  abril: "Abril",
  mayo: "Mayo",
  junio: "Junio",
  julio: "Julio",
  agosto: "Agosto",
  septiembre: "Septiembre",
  setiembre: "Septiembre",
  octubre: "Octubre",
  noviembre: "Noviembre",
  diciembre: "Diciembre"
});

let normalizando = false;

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizarTexto(value) {
  return clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function formatearMeses(value) {
  return clean(value).replace(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/gi, (match) => {
    const key = normalizarTexto(match);
    return MESES[key] || match;
  });
}

function extraerMesAnio(value) {
  const texto = normalizarTexto(value);
  const patron = /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(20\d{2})\b/g;
  const salida = [];
  let match = patron.exec(texto);
  while (match) {
    const mes = match[1] === "setiembre" ? "septiembre" : match[1];
    salida.push(`${match[2]}-${mes}`);
    match = patron.exec(texto);
  }
  return salida;
}

function crearClavePeriodo(option) {
  const texto = normalizarTexto(option.textContent || option.label || option.value);
  const partes = extraerMesAnio(texto);
  if (partes.length >= 2) return `${partes[0]}__${partes[1]}`;
  if (partes.length === 1) return partes[0];
  return texto.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function optionEsPlaceholder(option) {
  return !clean(option.value) || normalizarTexto(option.textContent).includes("seleccione periodo") || normalizarTexto(option.textContent).includes("no hay periodos");
}

function normalizarSelectorPeriodos(select) {
  if (!select || normalizando) return;

  normalizando = true;
  try {
    const selectedValue = clean(select.value);
    const options = Array.from(select.options);
    const placeholder = options.find(optionEsPlaceholder) || null;
    const mapa = new Map();

    options.filter((option) => !optionEsPlaceholder(option)).forEach((option) => {
      const key = crearClavePeriodo(option);
      const label = formatearMeses(option.textContent || option.label || option.value);
      const value = clean(option.value);
      if (!key) return;

      if (!mapa.has(key)) {
        mapa.set(key, { key, label, value, selected: value === selectedValue });
        return;
      }

      const actual = mapa.get(key);
      if (value === selectedValue) {
        mapa.set(key, { key, label, value, selected: true });
      } else if (!actual.value && value) {
        mapa.set(key, { ...actual, value, label });
      }
    });

    const unificados = Array.from(mapa.values()).sort((a, b) => b.label.localeCompare(a.label, "es"));
    select.replaceChildren();

    if (placeholder) {
      const cleanPlaceholder = document.createElement("option");
      cleanPlaceholder.value = "";
      cleanPlaceholder.textContent = clean(placeholder.textContent) || "Seleccione período";
      select.appendChild(cleanPlaceholder);
    }

    unificados.forEach((periodo) => {
      const option = document.createElement("option");
      option.value = periodo.value;
      option.textContent = periodo.label;
      select.appendChild(option);
      if (periodo.selected) select.value = periodo.value;
    });
  } finally {
    normalizando = false;
  }
}

function observarSelector() {
  const select = document.getElementById(SELECT_ID);
  if (!select) return;

  normalizarSelectorPeriodos(select);

  const observer = new MutationObserver(() => normalizarSelectorPeriodos(select));
  observer.observe(select, { childList: true });

  select.addEventListener("focus", () => normalizarSelectorPeriodos(select));
  select.addEventListener("mousedown", () => normalizarSelectorPeriodos(select));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", observarSelector);
} else {
  observarSelector();
}
