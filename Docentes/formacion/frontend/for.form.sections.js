/*
Nombre completo: for.form.sections.js
Ruta o ubicación: formacion/frontend/for.form.sections.js
Función o funciones: Construir el HTML del formulario de detalle y edición del módulo
Formación, dividido por secciones según la estructura del documento institucional de
seguimiento a la formación docente
*/

function forEscapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function forChecked(value, expected) {
  return String(value ?? "") === String(expected) ? "checked" : "";
}

function forSelected(value, expected) {
  return String(value ?? "") === String(expected) ? "selected" : "";
}

function forRadioGroup(name, currentValue, options = []) {
  return `
    <div class="forRadioGroup" data-radio-group="${forEscapeHtml(name)}">
      ${options
        .map(
          option => `
            <label class="forRadioOption">
              <input
                type="radio"
                name="${forEscapeHtml(name)}"
                value="${forEscapeHtml(option.value)}"
                ${forChecked(currentValue, option.value)}
              />
              <span>${forEscapeHtml(option.label)}</span>
            </label>
          `
        )
        .join("")}
    </div>
  `;
}

function forBuildFormationLevelOptions(currentValue) {
  const options = [
    "",
    "Tecnología Superior Universitaria",
    "Licenciatura",
    "Ingeniería",
    "Maestría",
    "Doctorado",
    "Otro"
  ];

  return options
    .map(option => {
      if (!option) {
        return `<option value="">Seleccione</option>`;
      }

      return `
        <option
          value="${forEscapeHtml(option)}"
          ${forSelected(currentValue, option)}
        >
          ${forEscapeHtml(option)}
        </option>
      `;
    })
    .join("");
}

export function forBuildFormSections(record = {}) {
  return `
    <section class="forModalSection">
      <div class="forFormErrors isHidden" data-role="for-form-errors"></div>
    </section>

    <section class="forModalSection">
      <h4>1. Información personal y académica</h4>
      <div class="forModalGrid">
        <div class="forFull">
          <label>Nombre completo</label>
          <input name="docente" value="${forEscapeHtml(record.docente)}" />
        </div>

        <div>
          <label>Cédula</label>
          <input
            name="cedula"
            inputmode="numeric"
            value="${forEscapeHtml(record.cedula)}"
          />
        </div>

        <div>
          <label>Cargo</label>
          <input name="cargo" value="${forEscapeHtml(record.cargo)}" />
        </div>

        <div class="forFull">
          <label>Unidad o carrera en la que labora</label>
          <input name="carrera" value="${forEscapeHtml(record.carrera)}" />
        </div>

        <div>
          <label>Formación actual</label>
          <select name="nivelFormacion">
            ${forBuildFormationLevelOptions(record.nivelFormacion)}
          </select>
        </div>

        <div>
          <label>Nombre del título o carrera actual</label>
          <input
            name="tituloActual"
            value="${forEscapeHtml(record.tituloActual)}"
          />
        </div>

        <div>
          <label>Formación en curso</label>
          <select name="formacion">
            ${forBuildFormationLevelOptions(record.formacion)}
          </select>
        </div>

        <div>
          <label>Nombre de la carrera o programa en curso</label>
          <input
            name="carreraCursa"
            value="${forEscapeHtml(record.carreraCursa)}"
          />
        </div>

        <div class="forFull">
          <label>Institución de estudio</label>
          <input
            name="institucion"
            value="${forEscapeHtml(record.institucion)}"
          />
        </div>
      </div>
    </section>

    <section class="forModalSection">
      <h4>2. Detalles de la formación</h4>
      <div class="forModalGrid">
        <div class="forFull">
          <label>Modalidad</label>
          ${forRadioGroup("modalidad", record.modalidad, [
            { value: "Presencial", label: "Presencial" },
            { value: "Virtual", label: "Virtual" },
            { value: "Híbrida", label: "Híbrida" }
          ])}
        </div>

        <div>
          <label>Fecha de inicio de estudios</label>
          <input
            name="fechaInicio"
            type="date"
            value="${forEscapeHtml(record.fechaInicio)}"
          />
        </div>

        <div>
          <label>Fecha prevista de finalización</label>
          <input
            name="fechaFinPrevista"
            type="date"
            value="${forEscapeHtml(record.fechaFinPrevista)}"
          />
        </div>

        <div class="forFull">
          <label>Financiamiento ITSQMET</label>
          ${forRadioGroup("financiamientoItsqmet", record.financiamientoItsqmet, [
            { value: "Sí", label: "Sí" },
            { value: "No", label: "No" },
            { value: "No aplica", label: "No aplica" }
          ])}
        </div>

        <div class="forFull">
          <label>Acuerdo de patrocinio institucional</label>
          ${forRadioGroup("patrocinio", record.patrocinio, [
            { value: "Sí", label: "Sí" },
            { value: "No", label: "No" }
          ])}
        </div>

        <div>
          <label>Tipo de apoyo</label>
          <select name="tipoApoyo">
            <option value="">Seleccione</option>
            <option
              value="Económico"
              ${forSelected(record.tipoApoyo, "Económico")}
            >
              Económico
            </option>
            <option
              value="Con tiempo"
              ${forSelected(record.tipoApoyo, "Con tiempo")}
            >
              Con tiempo
            </option>
            <option
              value="Económico y Con tiempo"
              ${forSelected(record.tipoApoyo, "Económico y Con tiempo")}
            >
              Económico y Con tiempo
            </option>
            <option
              value="No aplica"
              ${forSelected(record.tipoApoyo, "No aplica")}
            >
              No aplica
            </option>
          </select>
        </div>

        <div>
          <label>Monto de apoyo</label>
          <input
            name="montoApoyo"
            type="number"
            step="0.01"
            min="0"
            value="${forEscapeHtml(record.montoApoyo)}"
          />
        </div>

        <div>
          <label>Horas de apoyo</label>
          <input
            name="horasApoyo"
            type="number"
            step="0.01"
            min="0"
            value="${forEscapeHtml(record.horasApoyo)}"
          />
        </div>
      </div>
    </section>

    <section class="forModalSection">
      <h4>3. Avance general</h4>
      <div class="forModalGrid">
        <div>
          <label>Estado actual de la formación</label>
          <select name="estado">
            <option value="">Seleccione</option>
            <option value="En curso" ${forSelected(record.estado, "En curso")}>
              En curso
            </option>
            <option
              value="Finalizado"
              ${forSelected(record.estado, "Finalizado")}
            >
              Finalizado
            </option>
            <option
              value="Suspendido"
              ${forSelected(record.estado, "Suspendido")}
            >
              Suspendido
            </option>
            <option
              value="Pendiente"
              ${forSelected(record.estado, "Pendiente")}
            >
              Pendiente
            </option>
          </select>
        </div>

        <div>
          <label>Avance</label>
          <input
            name="avance"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value="${forEscapeHtml(record.avance)}"
          />
        </div>

        <div>
          <label>Restante</label>
          <input
            name="restante"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value="${forEscapeHtml(record.restante)}"
            readonly
          />
        </div>

        <div class="forFull">
          <label>Observaciones del avance</label>
          <textarea name="observacionesAvance">${forEscapeHtml(record.observacionesAvance)}</textarea>
        </div>
      </div>
    </section>

    <section class="forModalSection">
      <h4>4. Evidencias presentadas</h4>
      <div class="forModalGrid">
        <div class="forFull">
          <label>Detalle de evidencias</label>
          <textarea name="evidencias">${forEscapeHtml(record.evidencias)}</textarea>
        </div>
      </div>
    </section>

    <section class="forModalSection">
      <h4>5. Observaciones finales</h4>
      <div class="forModalGrid">
        <div class="forFull">
          <label>Observaciones finales</label>
          <textarea name="observacionesFinales">${forEscapeHtml(record.observacionesFinales)}</textarea>
        </div>
      </div>
    </section>

    <section class="forModalSection">
      <h4>6. Anexos</h4>
      <div class="forAttachmentsMount" data-role="for-attachments-mount"></div>
    </section>

    <section class="forModalSection">
      <h4>Datos del documento</h4>
      <div class="forModalGrid">
        <div>
          <label>Código del formato</label>
          <input
            name="codigoFormato"
            value="${forEscapeHtml(record.codigoFormato)}"
          />
        </div>

        <div>
          <label>Elaborado por</label>
          <input
            name="elaboradoPor"
            value="${forEscapeHtml(record.elaboradoPor)}"
          />
        </div>

        <div>
          <label>Cargo de quien elabora</label>
          <input
            name="elaboradoCargo"
            value="${forEscapeHtml(record.elaboradoCargo)}"
          />
        </div>

        <div>
          <label>Revisado y aprobado por</label>
          <input
            name="aprobadoPor"
            value="${forEscapeHtml(record.aprobadoPor)}"
          />
        </div>

        <div>
          <label>Cargo de quien aprueba</label>
          <input
            name="aprobadoCargo"
            value="${forEscapeHtml(record.aprobadoCargo)}"
          />
        </div>
      </div>
    </section>
  `;
}