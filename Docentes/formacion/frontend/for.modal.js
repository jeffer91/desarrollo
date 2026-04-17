/*
Nombre completo: for.modal.js
Ruta o ubicación: formacion/frontend/for.modal.js
Función o funciones: Controlar el pop up del módulo Formación, montar el formulario completo,
administrar apertura y cierre, leer valores editados, validar antes de guardar y devolver el
registro listo al controlador principal
*/

import { forBuildFormSections } from "./for.form.sections.js";
import {
  forBindFormInteractions,
  forReadFormValues,
  forRenderValidationErrors,
  forClearValidationErrors
} from "./for.form.bindings.js";
import { forMountAttachmentsUI } from "./for.attachments.ui.js";
import {
  forPrepareRecordForModal,
  forBuildRecordFromForm,
  forValidateSave
} from "../backend/for.service.js"; // Corrige la ruta relativa para que el controlador cargue completo y no deje la vista estática en 0 registros.

function forNormalizeErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return "No se pudo guardar el registro.";
}

export function forCreateModalController({
  overlayId = "forModalOverlay",
  titleId = "forModalTitle",
  bodyId = "forModalBody",
  saveBtnId = "forSaveModalBtn",
  closeBtnIds = ["forCloseModalBtn", "forCancelModalBtn"],
  onSave = async () => {},
  onClose = () => {}
} = {}) {
  const overlay = document.getElementById(overlayId);
  const titleNode = document.getElementById(titleId);
  const bodyNode = document.getElementById(bodyId);
  const saveBtn = document.getElementById(saveBtnId);
  const closeButtons = closeBtnIds
    .map(id => document.getElementById(id))
    .filter(Boolean);

  let currentRecord = null;
  let attachmentsController = null;
  let unsubscribeBindings = null;
  let isSaving = false;
  let defaultSaveBtnLabel = "";

  function forEnsureNodes() {
    if (!overlay || !titleNode || !bodyNode || !saveBtn) {
      throw new Error("No se encontraron los nodos base del modal de formación.");
    }
  }

  function forRememberDefaultSaveBtnLabel() {
    if (!defaultSaveBtnLabel) {
      defaultSaveBtnLabel = saveBtn?.textContent?.trim() || "Guardar cambios";
    }
  }

  function forSetSavingState(nextState) {
    isSaving = Boolean(nextState);
    forRememberDefaultSaveBtnLabel();

    if (saveBtn) {
      saveBtn.disabled = isSaving;
      saveBtn.textContent = isSaving ? "Guardando..." : defaultSaveBtnLabel;
    }

    closeButtons.forEach(btn => {
      btn.disabled = isSaving;
    });
  }

  function forScrollToErrors() {
    const errorBox = bodyNode?.querySelector(`[data-role="for-form-errors"]`);
    if (!errorBox || errorBox.classList.contains("isHidden")) return;

    requestAnimationFrame(() => {
      errorBox.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    });
  }

  function forClose() {
    if (isSaving) return;

    overlay.classList.add("isHidden");
    bodyNode.innerHTML = "";
    currentRecord = null;
    attachmentsController = null;

    if (typeof unsubscribeBindings === "function") {
      unsubscribeBindings();
      unsubscribeBindings = null;
    }

    forSetSavingState(false);
    onClose();
  }

  function forOpen(record = {}) {
    forEnsureNodes();
    currentRecord = forPrepareRecordForModal(record);
    titleNode.textContent = currentRecord.docente || "Nuevo registro";
    bodyNode.innerHTML = forBuildFormSections(currentRecord);

    attachmentsController = forMountAttachmentsUI(bodyNode, currentRecord.anexos ?? [], {
      onChange: () => {
        forClearValidationErrors(bodyNode);
      }
    });

    unsubscribeBindings = forBindFormInteractions(bodyNode, {
      onChange: () => {
        forClearValidationErrors(bodyNode);
      }
    });

    forSetSavingState(false);
    overlay.classList.remove("isHidden");
  }

  async function forHandleSave() {
    if (!currentRecord || isSaving) return;

    const formValues = forReadFormValues(bodyNode, {
      attachments: attachmentsController?.getValue?.() ?? []
    });

    const nextRecord = forBuildRecordFromForm(currentRecord, formValues);
    const validation = forValidateSave(nextRecord);

    if (!validation.isValid) {
      forRenderValidationErrors(bodyNode, validation.errors);
      forScrollToErrors();
      return;
    }

    try {
      forSetSavingState(true);
      forClearValidationErrors(bodyNode);

      await onSave(nextRecord, currentRecord);

      // Restablece el estado antes de cerrar para que forClose()
      // no salga por la protección de isSaving y no deje el botón bloqueado.
      forSetSavingState(false);
      forClose();
    } catch (error) {
      console.error(error);
      forRenderValidationErrors(bodyNode, [forNormalizeErrorMessage(error)]);
      forScrollToErrors();
      forSetSavingState(false);
    }
  }

  function forBindStaticEvents() {
    closeButtons.forEach(btn => {
      btn.addEventListener("click", forClose);
    });

    overlay?.addEventListener("click", event => {
      if (event.target === overlay) {
        forClose();
      }
    });

    saveBtn?.addEventListener("click", () => {
      void forHandleSave();
    });
  }

  function forGetCurrentRecord() {
    return currentRecord ? structuredClone(currentRecord) : null;
  }

  forBindStaticEvents();

  return {
    open: forOpen,
    close: forClose,
    getCurrentRecord: forGetCurrentRecord
  };
}