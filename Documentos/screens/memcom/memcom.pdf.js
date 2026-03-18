(function() {
    window.MEMCOM = window.MEMCOM || {};

    // --- Helpers ---
    async function getBase64ImageFromUrl(imageUrl) {
        try {
            const res = await fetch(imageUrl);
            const blob = await res.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error("Falta logo.png", error);
            return null;
        }
    }

    function formatearPeriodoHumano(p) {
        if (!p) return "";
        var s = p.trim();
        if (s.toLowerCase().includes(" a ") && s.length > 15) return s;
        var m = /^(\d{4})\D+(\d{1,2})\D+(\d{4})\D+(\d{1,2})$/.exec(s);
        if (m) {
            const map = { "01":"Enero", "02":"Febrero", "03":"Marzo", "04":"Abril", "05":"Mayo", "06":"Junio", "07":"Julio", "08":"Agosto", "09":"Septiembre", "10":"Octubre", "11":"Noviembre", "12":"Diciembre" };
            var m1 = map[(parseInt(m[2]) < 10 ? '0' : '') + parseInt(m[2])];
            var m2 = map[(parseInt(m[4]) < 10 ? '0' : '') + parseInt(m[4])];
            if (m1 && m2) return `${m1} ${m[1]} a ${m2} ${m[3]}`;
        }
        return s;
    }

    // DICCIONARIO PARA CORREGIR TEXTOS (Resuelve el problema de la "N")
    function obtenerNombreProceso(codigo) {
        const mapa = {
            "EXAMEN COMPLEXIVO": "Examen Complexivo",
            "TRABAJO DE TITULACIÓN": "Trabajo de Titulación", // Aquí forzamos la ortografía correcta
            "ARTÍCULO ACADÉMICO": "Artículo Académico"
        };
        return mapa[codigo] || codigo; // Si no encuentra, devuelve el original
    }

    // --- Generador PDF ---
    window.MEMCOM.pdf = {
        generatePdfBytes: async function(data) {
            if (!window.jspdf || !window.jspdf.jsPDF) throw new Error("jsPDF no cargado.");
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

            const margin = 25.4; 
            const width = 210;
            const contentWidth = width - (margin * 2);
            let cursorY = margin;
            
            // Fuentes
            doc.setFont("times", "normal");
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);

            // LOGO
            const imgData = await getBase64ImageFromUrl('./logo.png');
            if (imgData) {
                doc.addImage(imgData, 'PNG', margin, 10, 40, 15);
            }
            cursorY = 40; 

            // --- VARIABLES DINÁMICAS ---
            const fechaFija = "23 de enero de 2026";
            const memoDateCode = "2026-01-23";
            const periodoHumano = formatearPeriodoHumano(data.periodo);
            
            // Usamos el diccionario para obtener el texto perfecto
            const tipoProcesoCodigo = data.tipo || "EXAMEN COMPLEXIVO";
            const tipoProcesoTexto = obtenerNombreProceso(tipoProcesoCodigo);

            // 1. MEMORANDO CENTRADO
            doc.setFont("times", "bold");
            doc.text(`MEMORANDO No.: MEM-ITSQMET-UTET-${memoDateCode}`, width / 2, cursorY, { align: "center" });
            cursorY += 15;

            // 2. CABECERA ALINEADA
            const startX = margin; 
            const dataX = margin + 25; 
            
            function drawHeaderLine(label, content) {
                doc.setFont("times", "bold");
                doc.text(label, startX, cursorY);
                doc.setFont("times", "normal");
                const contentLines = doc.splitTextToSize(content, contentWidth - 25);
                doc.text(contentLines, dataX, cursorY);
                return (contentLines.length * 6) + 4;
            }

            cursorY += drawHeaderLine("PARA:", `Estudiantes del proceso de titulación - Período ${periodoHumano}`);
            cursorY += drawHeaderLine("DE:", "Magíster Jefferson Villarreal - Coordinador de Titulación y Eficiencia Terminal");
            cursorY += drawHeaderLine("ASUNTO:", `CRONOGRAMA DEL ${tipoProcesoTexto.toUpperCase()} PERÍODO ${periodoHumano.toUpperCase()}`);
            cursorY += drawHeaderLine("FECHA:", fechaFija);

            cursorY += 8; 

            // 3. CUERPO
            doc.setFont("times", "normal");
            const parrafos = [
                "A quien corresponda:",
                `Por medio del presente memorando, se informa a los estudiantes matriculados en el proceso de titulación, modalidad ${tipoProcesoTexto}, correspondiente al período ${periodoHumano}, sobre el cronograma oficial establecido para el desarrollo del mencionado proceso, conforme a la normativa institucional vigente del Instituto Tecnológico Superior Quito Metropolitano.`,
                `El ${tipoProcesoTexto} constituye un mecanismo de evaluación integradora, mediante el cual se verifica el cumplimiento de los resultados de aprendizaje de la carrera, por lo que es de carácter obligatorio el cumplimiento de las fechas y actividades aquí establecidas.`,
                `A continuación, se detalla el cronograma del ${tipoProcesoTexto}, el cual deberá ser observado y cumplido por todos los estudiantes habilitados para este proceso:`
            ];

            parrafos.forEach((p) => {
                const lines = doc.splitTextToSize(p, contentWidth);
                doc.text(lines, margin, cursorY, { align: "justify", maxWidth: contentWidth });
                cursorY += (lines.length * 5) + 5; 
            });

            cursorY += 5;

            // 4. TABLA MEJORADA
            // Título Tabla
            doc.setFont("times", "bold");
            doc.text(`CRONOGRAMA DEL ${tipoProcesoTexto.toUpperCase()}`, width/2, cursorY, { align: "center" });
            cursorY += 6;
            
            const tableData = data.cronograma; 
            if (tableData && tableData.length > 0) {
                const colWidths = [90, 35, 34]; 
                const rowHeight = 8;
                const headerHeight = 10;
                
                // --- ENCABEZADO (AZUL INSTITUCIONAL) ---
                doc.setFillColor(37, 99, 235); // Azul ITSQMET
                doc.setTextColor(255, 255, 255); // Blanco
                doc.rect(margin, cursorY, 159, headerHeight, "F"); 
                
                let hX = margin;
                const headers = tableData[0];
                headers.forEach((h, i) => {
                    const w = colWidths[i] || 30;
                    doc.text(String(h), hX + 2, cursorY + 6.5);
                    hX += w;
                });
                
                cursorY += headerHeight;
                doc.setTextColor(0, 0, 0); 
                
                // --- FILAS (ZEBRA STRIPING) ---
                doc.setFont("times", "normal");
                const rows = tableData.slice(1);
                
                rows.forEach((row, rowIndex) => {
                    if (cursorY + rowHeight > 270) {
                        doc.addPage();
                        cursorY = margin;
                    }

                    if (rowIndex % 2 === 1) {
                        doc.setFillColor(245, 247, 250); 
                        doc.rect(margin, cursorY, 159, rowHeight, "F");
                    }
                    
                    doc.setDrawColor(200, 200, 200); 
                    doc.rect(margin, cursorY, 159, rowHeight, "S"); 
                    
                    doc.line(margin + colWidths[0], cursorY, margin + colWidths[0], cursorY + rowHeight);
                    doc.line(margin + colWidths[0] + colWidths[1], cursorY, margin + colWidths[0] + colWidths[1], cursorY + rowHeight);

                    let rX = margin;
                    row.forEach((cell, i) => {
                        const w = colWidths[i] || 30;
                        doc.text(String(cell), rX + 2, cursorY + 5.5);
                        rX += w;
                    });
                    cursorY += rowHeight;
                });
            }

            cursorY += 10;

            // 5. CIERRE
            const cierre = [
                "Se recuerda a los estudiantes que el cumplimiento del cronograma está sujeto a la entrega oportuna de actividades, asistencia a las evaluaciones programadas y observancia de los requisitos académicos y administrativos establecidos para el proceso de titulación.",
                "Cualquier modificación al cronograma será comunicada oportunamente a través de los canales institucionales oficiales.",
                "Sin otro particular, se solicita tomar en cuenta la presente información."
            ];

            cierre.forEach(p => {
                if (cursorY + 15 > 270) { doc.addPage(); cursorY = margin; }
                const lines = doc.splitTextToSize(p, contentWidth);
                doc.text(lines, margin, cursorY, { align: "justify", maxWidth: contentWidth });
                cursorY += (lines.length * 5) + 4;
            });

            // 6. FIRMA
            if (cursorY + 35 > 270) { doc.addPage(); cursorY = margin; }
            else { cursorY += 10; }

            doc.text("Atentamente,", margin, cursorY);
            cursorY += 25; 

            doc.setFont("times", "bold");
            doc.text("Magíster Jefferson Villarreal", margin, cursorY);
            cursorY += 5;
            doc.setFont("times", "normal");
            doc.text("Coordinador de Titulación y Eficiencia Terminal", margin, cursorY);
            cursorY += 5;
            doc.text("Instituto Tecnológico Superior Quito Metropolitano", margin, cursorY);

            return doc.output('arraybuffer');
        }
    };
})();