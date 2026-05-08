(function (window) {
    "use strict";

    window.MEMCOM = window.MEMCOM || {};

    var $ = function (id) {
        return document.getElementById(id);
    };

    // Referencias
    var elPeriodo = $("mc-periodo");
    var elTipo = $("mc-tipo");
    var elInputTable = $("mc-input-table");
    var elStatus = $("mc-status");
    var btnPdf = $("mc-btn-pdf");
    var btnPreview = $("mc-btn-preview");
    var btnVolver = $("mc-btn-volver");
    var btnRefrescar = $("mc-btn-refrescar");
    var tablePreviewDiv = $("mc-table-preview");
    var tHead = $("mc-table-head");
    var tBody = $("mc-table-body");

    var state = {
        periodos: [],
        periodoSeleccionado: "",
        cronogramaData: []
    };

    // --- MEMORIA LOCAL DEL FORMULARIO ---
    function saveState() {
        try {
            var dataToSave = {
                tipo: elTipo ? elTipo.value : "",
                inputTable: elInputTable ? elInputTable.value : "",
                periodoVal: elPeriodo ? elPeriodo.value : ""
            };

            localStorage.setItem("MEMCOM_STATE", JSON.stringify(dataToSave));
        } catch (e) {
            console.error("Error guardando estado", e);
        }
    }

    function restoreState() {
        try {
            var saved = localStorage.getItem("MEMCOM_STATE");

            if (saved) {
                var d = JSON.parse(saved);

                if (d.tipo && elTipo) {
                    elTipo.value = d.tipo;
                }

                if (d.inputTable && elInputTable) {
                    elInputTable.value = d.inputTable;
                }

                return d.periodoVal;
            }
        } catch (e) {
            console.error("Error restaurando estado", e);
        }

        return null;
    }

    function setStatus(msg, type) {
        if (!elStatus) return;

        elStatus.textContent = msg;

        if (type === "err") {
            elStatus.style.color = "#9f1239";
            elStatus.style.background = "#fee2e2";
            elStatus.style.borderColor = "#fecdd3";
            return;
        }

        if (type === "info") {
            elStatus.style.color = "#1d4ed8";
            elStatus.style.background = "#dbeafe";
            elStatus.style.borderColor = "#bfdbfe";
            return;
        }

        elStatus.style.color = "#166534";
        elStatus.style.background = "#dcfce7";
        elStatus.style.borderColor = "#bbf7d0";
    }

    // --- PARSER DE EXCEL ---
    function parseExcelData() {
        var raw = elInputTable ? elInputTable.value.trim() : "";

        saveState();

        if (!raw) return [];

        var lines = raw.split(/\r?\n/);
        var data = [];

        lines.forEach(function(line) {
            var cols = line.split("\t");

            cols = cols.map(function(c) {
                return String(c || "").trim();
            });

            if (cols.some(function(c) { return c !== ""; })) {
                data.push(cols);
            }
        });

        return data;
    }

    function renderTablePreview() {
        var data = parseExcelData();

        state.cronogramaData = data;

        if (tHead) tHead.innerHTML = "";
        if (tBody) tBody.innerHTML = "";

        if (data.length === 0) {
            if (tablePreviewDiv) tablePreviewDiv.hidden = true;
            if (btnPdf) btnPdf.disabled = true;
            return;
        }

        // Encabezados
        var headers = data[0];
        var rows = data.slice(1);

        if (tHead) {
            var trH = document.createElement("tr");

            headers.forEach(function(h) {
                var th = document.createElement("th");
                th.textContent = h;
                trH.appendChild(th);
            });

            tHead.appendChild(trH);
        }

        // Cuerpo
        if (tBody) {
            rows.forEach(function(r) {
                var tr = document.createElement("tr");

                r.forEach(function(c) {
                    var td = document.createElement("td");
                    td.textContent = c;
                    tr.appendChild(td);
                });

                tBody.appendChild(tr);
            });
        }

        if (tablePreviewDiv) {
            tablePreviewDiv.hidden = false;
        }

        checkPdfButton();
    }

    function checkPdfButton() {
        if (!elPeriodo || !btnPdf) return;

        state.periodoSeleccionado = elPeriodo.value
            ? elPeriodo.options[elPeriodo.selectedIndex].text
            : "";

        saveState();

        if (state.periodoSeleccionado && state.cronogramaData.length > 0) {
            btnPdf.disabled = false;
        } else {
            btnPdf.disabled = true;
        }
    }

    function getSequenceManager() {
        if (!window.MEMCOM || !window.MEMCOM.sequence) {
            throw new Error("No está cargado memcom.sequence.js.");
        }

        return window.MEMCOM.sequence;
    }

    function limpiarArchivo(nombre) {
        return String(nombre || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\w\-]+/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    function getNextMemoText() {
        try {
            var sequence = getSequenceManager();
            var next = sequence.getNextInfo();

            return "Próximo memorando: " + next.codigoCompleto;
        } catch (e) {
            return "Próximo memorando: pendiente";
        }
    }

    // --- EVENTOS ---
    if (elPeriodo) {
        elPeriodo.addEventListener("change", checkPdfButton);
    }

    if (elTipo) {
        elTipo.addEventListener("change", function() {
            saveState();
            setStatus("Tipo actualizado. " + getNextMemoText(), "ok");
        });
    }

    if (elInputTable) {
        elInputTable.addEventListener("input", saveState);
    }

    if (btnPreview) {
        btnPreview.addEventListener("click", function() {
            renderTablePreview();

            if (state.cronogramaData.length === 0) {
                setStatus("No se detectaron datos válidos en la tabla.", "err");
                return;
            }

            setStatus("Datos procesados. Listo para generar. " + getNextMemoText(), "ok");
        });
    }

    if (btnRefrescar) {
        btnRefrescar.addEventListener("click", load);
    }

    if (btnPdf) {
        btnPdf.addEventListener("click", async function() {
            if (!state.periodoSeleccionado || state.cronogramaData.length === 0) return;

            var sequenceInfo = null;

            try {
                btnPdf.innerHTML = "Generando...";
                btnPdf.disabled = true;

                var sequence = getSequenceManager();

                sequenceInfo = sequence.reserve();

                var payload = {
                    periodo: state.periodoSeleccionado,
                    cronograma: state.cronogramaData,
                    tipo: elTipo ? elTipo.value : "EXAMEN COMPLEXIVO",

                    // Datos nuevos para el memorando
                    memo: sequenceInfo,
                    memoCorrelativoMensual: sequenceInfo.correlativo,
                    memoCodigoMes: sequenceInfo.codigoMes,
                    memoCodigoCompleto: sequenceInfo.codigoCompleto,
                    fechaDocumento: sequenceInfo.fechaHumana
                };

                var pdfBytes = await window.MEMCOM.pdf.generatePdfBytes(payload);

                // Descargar
                var blob = new Blob([pdfBytes], {
                    type: "application/pdf"
                });

                var link = document.createElement("a");

                link.href = URL.createObjectURL(blob);

                link.download = (
                    "MEMO_" +
                    limpiarArchivo(sequenceInfo.codigoCompleto) +
                    "_" +
                    limpiarArchivo(payload.tipo) +
                    "_" +
                    limpiarArchivo(state.periodoSeleccionado) +
                    ".pdf"
                );

                document.body.appendChild(link);
                link.click();
                link.remove();

                setStatus("Memo descargado correctamente. " + getNextMemoText(), "ok");
            } catch (e) {
                console.error(e);

                if (sequenceInfo && window.MEMCOM && window.MEMCOM.sequence) {
                    window.MEMCOM.sequence.release(sequenceInfo.token);
                }

                setStatus("Error: " + e.message, "err");
            } finally {
                btnPdf.innerHTML = `<span class="icon">⬇</span> Generar Memo PDF`;
                checkPdfButton();
            }
        });
    }

    if (btnVolver) {
        btnVolver.addEventListener("click", function() {
            window.location.href = "../screen-lista/list.ui.html";
        });
    }

    // --- CARGA INICIAL ---
    async function load() {
        setStatus("Cargando...", "info");

        try {
            if (!window.MEMCOM || !window.MEMCOM.data) {
                throw new Error("Faltan librerías");
            }

            var data = await window.MEMCOM.data.getAll();
            var periodos = data.periodos || [];

            state.periodos = periodos;

            // Restaurar memoria si existe
            var savedPeriodo = restoreState();

            if (elPeriodo) {
                elPeriodo.innerHTML = "<option value=''>Selecciona periodo...</option>";

                periodos.forEach(function(p) {
                    var opt = document.createElement("option");
                    opt.value = p.value;
                    opt.textContent = p.label;

                    if (p.value === savedPeriodo) {
                        opt.selected = true;
                    }

                    elPeriodo.appendChild(opt);
                });
            }

            // Si hay datos restaurados, procesar tabla automáticamente
            if (elInputTable && elInputTable.value) {
                renderTablePreview();
            } else {
                checkPdfButton();
            }

            setStatus("Listo. Selecciona opciones y pega Excel. " + getNextMemoText(), "ok");
        } catch (err) {
            console.error(err);
            setStatus("Error de conexión", "err");
        }
    }

    load();
})(window);