window.ReconApp = (() => {
  const STORAGE_KEY = "itsqmet_recon_pdf_editable_v2";

  const MONTHS = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre"
  ];

  const state = {
    records: [],
    currentIndex: 0
  };

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function getMonthName(monthNumber) {
    return MONTHS[(Number(monthNumber) || 1) - 1] || "Diciembre";
  }

  function buildIsoDate(year, month, day = 1) {
    const safeYear = Number(year) || 2025;
    const safeMonth = Number(month) || 12;
    const safeDay = Number(day) || 1;
    return `${safeYear}-${pad(safeMonth)}-${pad(safeDay)}`;
  }

  function getSettings() {
    const mesNumero = Number(document.getElementById("mesSelect").value || 12);
    const anio = String(document.getElementById("anioInput").value || "2025").trim();
    const certificateDate = document.getElementById("certificateDateInput").value;

    return {
      cohorte: document.getElementById("cohorteInput").value.trim(),
      mesNumero,
      mesNombre: getMonthName(mesNumero),
      anio,
      certificateDate
    };
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getSettings()));
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const data = JSON.parse(raw);

      if (data.cohorte) document.getElementById("cohorteInput").value = data.cohorte;
      if (data.mesNumero) document.getElementById("mesSelect").value = String(data.mesNumero);
      if (data.anio) document.getElementById("anioInput").value = data.anio;
      if (data.certificateDate) {
        document.getElementById("certificateDateInput").value = data.certificateDate;
      }
    } catch (error) {
      console.error("No se pudo cargar la configuración.", error);
    }
  }

  function sanitizeFileName(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_");
  }

  function updateUiLists() {
    window.ReconPreview.renderRecordsTable(state.records);
    window.ReconPreview.fillRecordSelect(state.records);
    window.ReconPreview.updateRecordsInfo(state.records.length);

    const select = document.getElementById("recordSelect");
    if (state.records.length) {
      select.value = String(state.currentIndex);
    }
  }

  function fillCurrentEditor() {
    const record = state.records[state.currentIndex] || null;
    window.ReconPreview.fillEditor(record);
  }

  async function refreshPreview() {
    await window.ReconPreview.renderPreview(
      state.records,
      state.currentIndex,
      getSettings()
    );
  }

  function syncMonthYearFromCalendar() {
    const dateValue = document.getElementById("certificateDateInput").value;
    if (!dateValue) return;

    const [year, month] = dateValue.split("-").map(Number);
    document.getElementById("mesSelect").value = String(month);
    document.getElementById("anioInput").value = String(year);
  }

  function syncCalendarFromMonthYear() {
    const month = Number(document.getElementById("mesSelect").value || 12);
    const year = Number(document.getElementById("anioInput").value || 2025);
    const currentDate = document.getElementById("certificateDateInput").value;

    let day = 1;

    if (currentDate) {
      const [, , currentDay] = currentDate.split("-").map(Number);
      day = currentDay || 1;
    }

    document.getElementById("certificateDateInput").value = buildIsoDate(year, month, day);
  }

  async function processInput() {
    const rawText = document.getElementById("inputData").value;
    const parsed = window.ReconParser.parseRawText(rawText);

    state.records = parsed;
    state.currentIndex = 0;

    updateUiLists();
    fillCurrentEditor();
    await refreshPreview();

    if (!parsed.length) {
      alert("No se detectaron registros válidos.");
    }
  }

  async function clearAll() {
    document.getElementById("inputData").value = "";
    state.records = [];
    state.currentIndex = 0;

    updateUiLists();
    fillCurrentEditor();
    await refreshPreview();
  }

  async function handleSelectChange() {
    state.currentIndex = Number(document.getElementById("recordSelect").value || 0);
    fillCurrentEditor();
    await refreshPreview();
  }

  async function saveCurrentRecord() {
    if (!state.records.length) {
      alert("Primero procesa la información.");
      return;
    }

    state.records[state.currentIndex] = {
      carrera: document.getElementById("editCarrera").value.trim(),
      nombre: document.getElementById("editNombre").value.trim().toUpperCase(),
      promedio: document.getElementById("editPromedio").value.trim()
    };

    updateUiLists();
    fillCurrentEditor();
    await refreshPreview();
  }

  function downloadBytes(bytes, filename, mimeType) {
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function downloadCurrentPdf() {
    if (!state.records.length) {
      alert("Primero procesa la información.");
      return;
    }

    const record = state.records[state.currentIndex];
    const pdfBytes = await window.ReconGenerator.buildEditablePdf(record, getSettings());
    const fileName = `${String(state.currentIndex + 1).padStart(2, "0")}_${sanitizeFileName(record.nombre)}.pdf`;

    downloadBytes(pdfBytes, fileName, "application/pdf");
  }

  async function downloadAllPdf() {
    if (!state.records.length) {
      alert("Primero procesa la información.");
      return;
    }

    for (let i = 0; i < state.records.length; i++) {
      const record = state.records[i];
      const pdfBytes = await window.ReconGenerator.buildEditablePdf(record, getSettings());
      const fileName = `${String(i + 1).padStart(2, "0")}_${sanitizeFileName(record.nombre)}.pdf`;

      downloadBytes(pdfBytes, fileName, "application/pdf");
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  async function handleGeneralSettingsChange() {
    saveSettings();
    await refreshPreview();
  }

  async function handleCalendarChange() {
    syncMonthYearFromCalendar();
    saveSettings();
    await refreshPreview();
  }

  async function handleMonthYearChange() {
    syncCalendarFromMonthYear();
    saveSettings();
    await refreshPreview();
  }

  function bindEvents() {
    document.getElementById("processBtn").addEventListener("click", processInput);
    document.getElementById("clearBtn").addEventListener("click", clearAll);
    document.getElementById("recordSelect").addEventListener("change", handleSelectChange);
    document.getElementById("saveRecordBtn").addEventListener("click", saveCurrentRecord);
    document.getElementById("downloadCurrentBtn").addEventListener("click", downloadCurrentPdf);
    document.getElementById("downloadAllBtn").addEventListener("click", downloadAllPdf);

    document.getElementById("cohorteInput").addEventListener("input", handleGeneralSettingsChange);
    document.getElementById("mesSelect").addEventListener("change", handleMonthYearChange);
    document.getElementById("anioInput").addEventListener("input", handleMonthYearChange);
    document.getElementById("certificateDateInput").addEventListener("change", handleCalendarChange);
  }

  async function init() {
    loadSettings();

    if (!document.getElementById("certificateDateInput").value) {
      syncCalendarFromMonthYear();
    } else {
      syncMonthYearFromCalendar();
    }

    bindEvents();
    updateUiLists();
    fillCurrentEditor();
    await refreshPreview();
  }

  document.addEventListener("DOMContentLoaded", init);

  return {
    init
  };
})();