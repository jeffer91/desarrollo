window.ReconPreview = (() => {
  function renderRecordsTable(records) {
    const tbody = document.querySelector("#recordsTable tbody");
    tbody.innerHTML = "";

    records.forEach((record, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${record.carrera}</td>
        <td>${record.nombre}</td>
        <td>${record.promedio}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function fillRecordSelect(records) {
    const select = document.getElementById("recordSelect");
    select.innerHTML = "";

    if (!records.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Sin registros";
      select.appendChild(option);
      return;
    }

    records.forEach((record, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `${index + 1}. ${record.nombre}`;
      select.appendChild(option);
    });
  }

  function updateRecordsInfo(total) {
    const info = document.getElementById("recordsInfo");
    info.textContent = total > 0 ? `${total} registro(s)` : "Sin procesar";
  }

  function fillEditor(record) {
    document.getElementById("editCarrera").value = record?.carrera || "";
    document.getElementById("editNombre").value = record?.nombre || "";
    document.getElementById("editPromedio").value = record?.promedio || "";
  }

  function drawEmptyState(canvas) {
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f7f9fd";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#44516e";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "600 30px Inter, Arial, sans-serif";
    ctx.fillText("No hay vista previa disponible", canvas.width / 2, canvas.height / 2 - 18);

    ctx.font = "400 18px Inter, Arial, sans-serif";
    ctx.fillText(
      "Procesa los registros para generar el certificado",
      canvas.width / 2,
      canvas.height / 2 + 24
    );
  }

  async function renderPreview(records, currentIndex, settings) {
    const canvas = document.getElementById("previewCanvas");
    const cfg = window.ReconConfig;

    canvas.width = cfg.canvas.width;
    canvas.height = cfg.canvas.height;

    if (!records.length || currentIndex < 0 || currentIndex >= records.length) {
      drawEmptyState(canvas);
      return;
    }

    await window.ReconGenerator.renderRecognition(canvas, records[currentIndex], settings);
  }

  return {
    renderRecordsTable,
    fillRecordSelect,
    updateRecordsInfo,
    fillEditor,
    renderPreview
  };
})();