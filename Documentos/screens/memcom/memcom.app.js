(function (window) {
    "use strict";

    var $ = function (id) { return document.getElementById(id); };

    // Referencias
    var elPeriodo = $("mc-periodo");
    var elTipo = $("mc-tipo"); // Nuevo selector
    var elInputTable = $("mc-input-table");
    var elStatus = $("mc-status");
    var btnPdf = $("mc-btn-pdf");
    var btnPreview = $("mc-btn-preview");
    var btnVolver = $("mc-btn-volver");
    var tablePreviewDiv = $("mc-table-preview");
    var tHead = $("mc-table-head");
    var tBody = $("mc-table-body");

    var state = {
        periodos: [],
        periodoSeleccionado: "",
        cronogramaData: []
    };

    // --- MEMORIA (LOCAL STORAGE) ---
    function saveState() {
        var dataToSave = {
            tipo: elTipo.value,
            inputTable: elInputTable.value,
            periodoVal: elPeriodo.value
        };
        localStorage.setItem("MEMCOM_STATE", JSON.stringify(dataToSave));
    }

    function restoreState() {
        try {
            var saved = localStorage.getItem("MEMCOM_STATE");
            if (saved) {
                var d = JSON.parse(saved);
                if (d.tipo) elTipo.value = d.tipo;
                if (d.inputTable) elInputTable.value = d.inputTable;
                // El periodo se setea después de cargar las opciones
                return d.periodoVal; 
            }
        } catch(e) { console.error("Error restaurando estado", e); }
        return null;
    }

    function setStatus(msg, type) {
        if (!elStatus) return;
        elStatus.textContent = msg;
        elStatus.style.color = type === "err" ? "#9f1239" : "#166534";
        elStatus.style.background = type === "err" ? "#fee2e2" : "#dcfce7";
    }

    // --- PARSER DE EXCEL ---
    function parseExcelData() {
        var raw = elInputTable.value.trim();
        saveState(); // Guardamos cada vez que se usa
        if (!raw) return [];
        var lines = raw.split("\n");
        var data = [];
        lines.forEach(function(line) {
            var cols = line.split("\t");
            cols = cols.map(c => c.trim());
            if (cols.some(c => c !== "")) {
                data.push(cols);
            }
        });
        return data;
    }

    function renderTablePreview() {
        var data = parseExcelData();
        state.cronogramaData = data;

        tHead.innerHTML = "";
        tBody.innerHTML = "";

        if (data.length === 0) {
            tablePreviewDiv.hidden = true;
            btnPdf.disabled = true;
            return;
        }

        // Encabezados (Fila 0)
        var headers = data[0];
        var rows = data.slice(1);

        var trH = document.createElement("tr");
        headers.forEach(h => {
            var th = document.createElement("th");
            th.textContent = h;
            trH.appendChild(th);
        });
        tHead.appendChild(trH);

        // Cuerpo
        rows.forEach(r => {
            var tr = document.createElement("tr");
            r.forEach(c => {
                var td = document.createElement("td");
                td.textContent = c;
                tr.appendChild(td);
            });
            tBody.appendChild(tr);
        });

        tablePreviewDiv.hidden = false;
        
        // Habilitar PDF si hay periodo
        checkPdfButton();
    }

    function checkPdfButton() {
        state.periodoSeleccionado = elPeriodo.value ? elPeriodo.options[elPeriodo.selectedIndex].text : "";
        saveState(); // Guardamos selección

        if (state.periodoSeleccionado && state.cronogramaData.length > 0) {
            btnPdf.disabled = false;
        } else {
            btnPdf.disabled = true;
        }
    }

    // --- EVENTOS ---

    elPeriodo.addEventListener("change", checkPdfButton);
    elTipo.addEventListener("change", saveState); // Guardar cambio de tipo
    elInputTable.addEventListener("input", saveState); // Guardar mientras escribe

    btnPreview.addEventListener("click", function() {
        renderTablePreview();
        setStatus("Datos procesados. Listo para generar.", "ok");
    });

    $("mc-btn-refrescar").addEventListener("click", load);

    btnPdf.addEventListener("click", async function() {
        if (!state.periodoSeleccionado || state.cronogramaData.length === 0) return;
        
        try {
            btnPdf.innerHTML = "Generando...";
            btnPdf.disabled = true;

            var payload = {
                periodo: state.periodoSeleccionado,
                cronograma: state.cronogramaData,
                tipo: elTipo.value // Enviamos el tipo seleccionado (Complexivo, Trabajo, etc)
            };
            
            var pdfBytes = await window.MEMCOM.pdf.generatePdfBytes(payload);
            
            // Descargar
            var blob = new Blob([pdfBytes], { type: "application/pdf" });
            var link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `MEMO_${payload.tipo}_${state.periodoSeleccionado}.pdf`.replace(/\s+/g, "_");
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            setStatus("Memo descargado correctamente", "ok");
        } catch (e) {
            console.error(e);
            setStatus("Error: " + e.message, "err");
        } finally {
            btnPdf.innerHTML = `<span class="icon">⬇</span> Generar Memo PDF`;
            btnPdf.disabled = false;
        }
    });

    if (btnVolver) {
        btnVolver.addEventListener("click", function() {
            window.location.href = "../screen-lista/list.ui.html";
        });
    }

    // --- CARGA INICIAL ---
    async function load() {
        setStatus("Cargando...", "info");
        try {
            if (!window.MEMCOM || !window.MEMCOM.data) throw new Error("Faltan librerías");
            
            var data = await window.MEMCOM.data.getAll();
            var periodos = data.periodos || [];

            // Restaurar memoria si existe
            var savedPeriodo = restoreState();

            elPeriodo.innerHTML = "<option value=''>Selecciona periodo...</option>";
            periodos.forEach(p => {
                var opt = document.createElement("option");
                opt.value = p.value;
                opt.textContent = p.label;
                if (p.value === savedPeriodo) opt.selected = true; // Auto-seleccionar
                elPeriodo.appendChild(opt);
            });
            
            // Si hay datos restaurados, procesar tabla automáticamente
            if (elInputTable.value) {
                renderTablePreview();
            }

            setStatus("Listo. Selecciona opciones y pega Excel.", "ok");

        } catch (err) {
            console.error(err);
            setStatus("Error de conexión", "err");
        }
    }

    load();

})(window);