/*
Nombre completo: for.form.bindings.js
Ruta o ubicación: formacion/frontend/for.form.bindings.js
Función o funciones: Gestionar interacciones del formulario del pop up, sincronizar avance y
restante, habilitar o deshabilitar campos relacionados y leer todos los valores editados para
el guardado
*/

function forGetInput(root, selector) {
  return root.querySelector(selector);
}

function forReadInputValue(root, name) {
  const node = forGetInput(root, `[name="${name}"]`);
  return node ? node.value : "";
}

function forReadRadioValue(root, name) {
  const node = root.querySelector(`input[name="${name}"]:checked`);
  return node ? node.value : "";
}

function forParseNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function forComputeRemaining(avance) {
  const next = 100 - forParseNumber(avance);
  return Math.max(0, Math.min(100, Number(next.toFixed(2))));
}

function forToggleSupportFields(root) {
  const financiamiento = forReadRadioValue(root, "financiamientoItsqmet");
  const tipoApoyo = forGetInput(root, `[name="tipoApoyo"]`);
  const montoApoyo = forGetInput(root, `[name="montoApoyo"]`);
  const horasApoyo = forGetInput(root, `[name="horasApoyo"]`);
  const patrocinioRadios = root.querySelectorAll(`input[name="patrocinio"]`);

  const isDisabled =
    financiamiento === "No" ||
    financiamiento === "No aplica" ||
    !financiamiento;

  [tipoApoyo, montoApoyo, horasApoyo].forEach(node => {
    if (!node) return;
    node.disabled = isDisabled;
  });

  patrocinioRadios.forEach(node => {
    node.disabled = isDisabled;
  });

  if (isDisabled) {
    if (tipoApoyo) {
      tipoApoyo.value = "No aplica";
    }

    if (montoApoyo) {
      montoApoyo.value = "0";
    }

    if (horasApoyo) {
      horasApoyo.value = "0";
    }

    patrocinioRadios.forEach(node => {
      node.checked = false;
    });
  }
}

function forBindAdvanceSync(root) {
  const avanceInput = forGetInput(root, `[name="avance"]`);
  const restanteInput = forGetInput(root, `[name="restante"]`);

  if (!avanceInput || !restanteInput) return () => {};

  const handler = () => {
    const currentAdvance = forParseNumber(avanceInput.value);
    const safeAdvance = Math.max(0, Math.min(100, currentAdvance));
    avanceInput.value = String(safeAdvance);
    restanteInput.value = String(forComputeRemaining(safeAdvance));
  };

  avanceInput.addEventListener("input", handler);
  avanceInput.addEventListener("change", handler);
  handler();

  return () => {
    avanceInput.removeEventListener("input", handler);
    avanceInput.removeEventListener("change", handler);
  };
}

function forBindFinancingSync(root) {
  const radios = root.querySelectorAll(`input[name="financiamientoItsqmet"]`);

  const handler = () => {
    forToggleSupportFields(root);
  };

  radios.forEach(node => node.addEventListener("change", handler));
  handler();

  return () => {
    radios.forEach(node => node.removeEventListener("change", handler));
  };
}

function forBindGenericChange(root, onChange = () => {}) {
  const handler = () => onChange();

  root.addEventListener("input", handler);
  root.addEventListener("change", handler);

  return () => {
    root.removeEventListener("input", handler);
    root.removeEventListener("change", handler);
  };
}

export function forBindFormInteractions(root, { onChange = () => {} } = {}) {
  const cleanups = [
    forBindAdvanceSync(root),
    forBindFinancingSync(root),
    forBindGenericChange(root, onChange)
  ];

  return () => {
    cleanups.forEach(fn => {
      if (typeof fn === "function") {
        fn();
      }
    });
  };
}

export function forReadFormValues(root, { attachments = [] } = {}) {
  return {
    docente: forReadInputValue(root, "docente"),
    cedula: forReadInputValue(root, "cedula"),
    cargo: forReadInputValue(root, "cargo"),
    carrera: forReadInputValue(root, "carrera"),
    tituloActual: forReadInputValue(root, "tituloActual"),
    nivelFormacion: forReadInputValue(root, "nivelFormacion"),
    formacion: forReadInputValue(root, "formacion"),
    carreraCursa: forReadInputValue(root, "carreraCursa"),
    institucion: forReadInputValue(root, "institucion"),
    modalidad: forReadRadioValue(root, "modalidad"),
    fechaInicio: forReadInputValue(root, "fechaInicio"),
    fechaFinPrevista: forReadInputValue(root, "fechaFinPrevista"),
    financiamientoItsqmet: forReadRadioValue(root, "financiamientoItsqmet"),
    patrocinio: forReadRadioValue(root, "patrocinio"),
    tipoApoyo: forReadInputValue(root, "tipoApoyo"),
    montoApoyo: forReadInputValue(root, "montoApoyo"),
    horasApoyo: forReadInputValue(root, "horasApoyo"),
    estado: forReadInputValue(root, "estado"),
    avance: forReadInputValue(root, "avance"),
    restante: forReadInputValue(root, "restante"),
    observacionesAvance: forReadInputValue(root, "observacionesAvance"),
    evidencias: forReadInputValue(root, "evidencias"),
    observacionesFinales: forReadInputValue(root, "observacionesFinales"),
    codigoFormato: forReadInputValue(root, "codigoFormato"),
    elaboradoPor: forReadInputValue(root, "elaboradoPor"),
    elaboradoCargo: forReadInputValue(root, "elaboradoCargo"),
    aprobadoPor: forReadInputValue(root, "aprobadoPor"),
    aprobadoCargo: forReadInputValue(root, "aprobadoCargo"),
    anexos: structuredClone(Array.isArray(attachments) ? attachments : [])
  };
}

export function forRenderValidationErrors(root, errors = []) {
  const box = root.querySelector(`[data-role="for-form-errors"]`);
  if (!box) return;

  if (!Array.isArray(errors) || !errors.length) {
    box.classList.add("isHidden");
    box.innerHTML = "";
    return;
  }

  box.classList.remove("isHidden");
  box.innerHTML = `
    <strong>Revise la información antes de guardar:</strong>
    <ul>
      ${errors.map(error => `<li>${String(error)}</li>`).join("")}
    </ul>
  `;
}

export function forClearValidationErrors(root) {
  const box = root.querySelector(`[data-role="for-form-errors"]`);
  if (!box) return;

  box.classList.add("isHidden");
  box.innerHTML = "";
}