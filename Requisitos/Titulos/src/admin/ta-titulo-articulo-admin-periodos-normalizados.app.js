/*
  Nombre completo: ta-titulo-articulo-admin-periodos-normalizados.app.js
  Ruta o ubicación: /Requisitos/Titulos/src/admin/ta-titulo-articulo-admin-periodos-normalizados.app.js
  Función o funciones:
  - Normalizar visualmente los períodos del panel administrador.
  - Unificar opciones repetidas del selector de períodos sin borrar datos de Firestore.
  - Mantener una sola opción por período académico equivalente.
  - Corregir mayúsculas de meses para que el selector se vea limpio.
  - Ordenar períodos por fecha de inicio descendente cuando el texto lo permite.
  Se conecta con:
  - Requisitos/Titulos/public/ta-titulo-articulo-admin.html
  - Requisitos/Titulos/electron/admin/ta-titulo-articulo-administrador.html
  - Requisitos/Titulos/src/admin/ta-titulo-articulo-admin.app.js
*/

const SELECT_ID = "ta-admin-periodo-select";

const MESES = Object.freeze({
  enero: { label: "Enero", orden: 1 },
  febrero: { label: "Febrero", orden: 2 },
  marzo: { label: "Marzo", orden: 3 },
  abril: { label: "Abril", orden: 4 },
  mayo: { label: "Mayo", orden: 5 },
  junio: { label: "Junio", orden: 6 },
  julio: { label: "Julio", orden: 7 },
  agosto: { label: "Agosto", orden: 8 },
  septiembre: { label: "Septiembre", orden: 9 },
  setiembre: { label: "Septiembre", orden: 9 },
  octubre: { label: "Octubre", orden: 10 },
  noviembre: { label: "Noviembre", orden: 11 },
  diciembre: { label: "Diciembre", orden: 12 }
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
    return MESES[key]?.label || match;
  });
}

function extraerMesAnio(value) {
  const texto = normalizarTexto(value);
  const patron = /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(20\d{2})\b/g;
  const salida = [];
  let match = patron.exec(texto);
  while (match) {
    const mesKey = match[1] === "setiembre" ? "septiembre" : match[1];
    salida.push({ anio: Number(match[2]), mes: MESES[mesKey]?.orden || 0, key: `${match[2]}-${String(MESES[mesKey]?.orden || 0).padStart(2, "0")}` });
    match = patron.exec(texto);
  }
  return salida;
}

function crearClavePeriodo(option) {
  const texto = normalizarTexto(option.textContent || option.label || option.value);
  const partes = extraerMesAnio(texto);
  if (partes.length >= 2) return `${partes[0].key}__${partes[1].key}`;
  if (partes.length === 1) return partes[0].key;
  return texto.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function calcularOrdenPeriodo(option) {
  const partes = extraerMesAnio(option.textContent || option.label || option.value);
  if (!partes.length) return 0;
  return (partes[0].anio * 100) + partes[0].mes;
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

    options.filter((option) => !optionEsPlaceholder(option)).forEach((option, index) => {
      const key = crearClavePeriodo(option);
      const label = formatearMeses(option.textContent || option.label || option.value);
      const value = clean(option.value);
      const orden = calcularOrdenPeriodo(option);
      if (!key) return;

      if (!mapa.has(key)) {
        mapa.set(key, { key, label, value, selected: value === selectedValue, orden, index });
        return;
      }

      const actual = mapa.get(key);
      if (value === selectedValue) {
        mapa.set(key, { ...actual, label, value, selected: true, orden: actual.orden || orden });
      } else if (!actual.value && value) {
        mapa.set(key, { ...actual, value, label, orden: actual.orden || orden });
      }
    });

    const unificados = Array.from(mapa.values()).sort((a, b) => {
      if (a.orden !== b.orden) return b.orden - a.orden;
      return a.index - b.index;
    });
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
