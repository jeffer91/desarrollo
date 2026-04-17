/*
=========================================================
Nombre completo: mesa-popup.js
Ruta o ubicación: /js/mesa-popup.js
Función o funciones:
- Gestionar apertura y cierre de modales.
- Soportar editor, vista previa y precarga global.
- Mantener el estado visual general sin repetir lógica.
=========================================================
*/
"use strict";

(function attachMesaPopup(global) {
  const dom = {
    editorModal: null,
    previewModal: null,
    globalPreviewModal: null,
    closeEditorBtn: null,
    closePreviewBtn: null,
    closeGlobalPreviewBtn: null,
    cancelGlobalPreviewBtn: null
  };

  function cacheDom() {
    dom.editorModal = document.getElementById("mesa-editor-modal");
    dom.previewModal = document.getElementById("mesa-preview-modal");
    dom.globalPreviewModal = document.getElementById("mesa-global-preview-modal");

    dom.closeEditorBtn = document.getElementById("mesa-close-editor-btn");
    dom.closePreviewBtn = document.getElementById("mesa-close-preview-btn");
    dom.closeGlobalPreviewBtn = document.getElementById("mesa-close-global-preview-btn");
    dom.cancelGlobalPreviewBtn = document.getElementById("mesa-global-preview-cancel-btn");
  }

  function getModalByKey(key) {
    if (key === "editor") {
      return dom.editorModal;
    }

    if (key === "preview") {
      return dom.previewModal;
    }

    if (key === "globalPreview") {
      return dom.globalPreviewModal;
    }

    return null;
  }

  function refreshBodyOverflow() {
    const modals = [dom.editorModal, dom.previewModal, dom.globalPreviewModal].filter(Boolean);
    const hasOpenModal = modals.some((item) => item.classList.contains("is-open"));
    document.body.style.overflow = hasOpenModal ? "hidden" : "";
  }

  function open(key) {
    const modal = getModalByKey(key);
    if (!modal) {
      return;
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    refreshBodyOverflow();
  }

  function close(key) {
    const modal = getModalByKey(key);
    if (!modal) {
      return;
    }

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    refreshBodyOverflow();
  }

  function openEditor() {
    open("editor");
  }

  function closeEditor() {
    close("editor");
  }

  function openPreview() {
    open("preview");
  }

  function closePreview() {
    close("preview");
  }

  function openGlobalPreview() {
    open("globalPreview");
  }

  function closeGlobalPreview() {
    close("globalPreview");
  }

  function bindEvents() {
    dom.closeEditorBtn?.addEventListener("click", closeEditor);
    dom.closePreviewBtn?.addEventListener("click", closePreview);
    dom.closeGlobalPreviewBtn?.addEventListener("click", closeGlobalPreview);
    dom.cancelGlobalPreviewBtn?.addEventListener("click", closeGlobalPreview);

    document.addEventListener("click", (event) => {
      const closeTarget = event.target?.getAttribute?.("data-close-modal");

      if (closeTarget === "editor") {
        closeEditor();
      }

      if (closeTarget === "preview") {
        closePreview();
      }

      if (closeTarget === "globalPreview") {
        closeGlobalPreview();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (dom.globalPreviewModal?.classList.contains("is-open")) {
        closeGlobalPreview();
        return;
      }

      if (dom.previewModal?.classList.contains("is-open")) {
        closePreview();
        return;
      }

      if (dom.editorModal?.classList.contains("is-open")) {
        closeEditor();
      }
    });
  }

  global.MesaPopup = {
    cacheDom,
    bindEvents,
    open,
    close,
    openEditor,
    closeEditor,
    openPreview,
    closePreview,
    openGlobalPreview,
    closeGlobalPreview
  };
})(window);