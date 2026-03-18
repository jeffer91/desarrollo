/* =========================================================
Nombre del archivo: prioridad.family.modal.render.js
Ruta: /prioridad/prioridad.family.modal.render.js
Función:
- Construir HTML del modal para crear familia
- Exponer: window.PrioridadFamilyModalRender
========================================================= */
(function(){
  const T = window.PrioridadText || {
    esc: (s)=> String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;")
  };

  function buildCreate(){
    return `
      <div class="modalCard">
        <div class="modalHead">
          <div class="modalTitle">Crear familia</div>
          <button class="btn ghost" type="button" data-action="familyClose">Cerrar</button>
        </div>

        <div class="modalBody">
          <div class="field">
            <label class="lbl">Nombre de la familia</label>
            <input id="familyLabel" type="text" placeholder="Ejemplo: Ago25-Ene26" autocomplete="off" />
            <div class="hint muted" style="margin-top:10px;">
              La familia agrupa eventos dentro del tablero.
              Puedes asignar eventos por selección múltiple o arrastrando un evento sobre la familia.
            </div>
          </div>
        </div>

        <div class="modalActions">
          <button class="btn ghost" type="button" data-action="familyClose">Cancelar</button>
          <button class="btn" type="button" data-action="familySave">Guardar</button>
        </div>
      </div>
    `;
  }

  window.PrioridadFamilyModalRender = { buildCreate };
})();