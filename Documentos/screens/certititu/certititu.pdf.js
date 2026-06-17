// Archivo: screens/certititu/certititu.pdf.js
(function() {
  // Asegurar namespace
  window.CERTITITU = window.CERTITITU || {};

  // --- Helpers de Utilidad ---

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
      console.error("Error cargando fondo:", error);
      return null;
    }
  }

  // Lógica para formatear la carrera según reglas institucionales (se mantiene intacta)
  function formatearCarrera(carreraRaw) {
    if (!carreraRaw) return "";

    // 1. Todo a mayúsculas y limpieza inicial
    let c = carreraRaw.toString().toUpperCase().trim();

    // 2. Eliminar la palabra "ONLINE" (y espacios extra que deje)
    c = c.replace(/\s*ONLINE\b/g, "").trim();
    // Limpiar dobles espacios si quedaron
    c = c.replace(/\s+/g, " ");

    // 3. Determinar prefijo
    // Regla: Enfermería -> TECNICATURA SUPERIOR
    // Resto -> TECNOLOGÍA SUPERIOR
    let prefijo = "TECNOLOGÍA SUPERIOR";

    if (c.includes("ENFERMERÍA") || c.includes("ENFERMERIA")) {
      prefijo = "TECNICATURA SUPERIOR";
    }

    // 4. Construir string final
    // Verificamos si el dato de la BD ya trae el prefijo para no duplicarlo
    if (c.startsWith(prefijo)) {
      return c;
    } else {
      return prefijo + " " + c;
    }
  }

  // --- Generador PDF Principal ---

  window.CERTITITU.pdf = {
    generatePdfBytes: async function(data) {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        throw new Error("jsPDF no cargado.");
      }

      const { jsPDF } = window.jspdf;

      // Configuración A4
      const doc = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4"
      });

      const width = doc.internal.pageSize.getWidth(); // 210mm
      const centerX = width / 2;

      // Fondo
      const imgData = await getBase64ImageFromUrl("./fondo.png");
      if (imgData) {
        doc.addImage(imgData, "PNG", 0, 0, 210, 297);
      }

      // =========================
      // DATOS (robustos)
      // =========================
      // Comentario técnico: se priorizan los nuevos campos del payload y se deja fallback a los antiguos.
      const nombre = (((data && (data.nombreCompletoEstudiante ?? data.estudiante)) || "NOMBRE DESCONOCIDO").toString().trim()).toUpperCase();
      const cedula = ((data && (data.numeroCedula ?? data.cedula)) || "S/N").toString().trim();

      const carreraRaw = (data && (data.nombreCarrera ?? data.carrera)) || "TITULACIÓN";
      const carrera = formatearCarrera(carreraRaw);

      const modalidad = ((data && data.modalidad) || "").toString().trim();
      const jornada = ((data && data.jornada) || "").toString().trim();
      const periodoAcademico = ((data && (data.periodoAcademico ?? data.periodo)) || "").toString().trim();

      // Fecha: usa (dia/mes/anio) si vienen en data; caso contrario toma la fecha actual.
      const fechaHoy = new Date();
      const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

      const dia = (data && data.dia != null && String(data.dia).trim() !== "") ? String(data.dia).trim() : String(fechaHoy.getDate());
      const mes = (data && data.mes != null && String(data.mes).trim() !== "") ? String(data.mes).trim() : meses[fechaHoy.getMonth()];
      const anio = (data && data.anio != null && String(data.anio).trim() !== "") ? String(data.anio).trim() : String(fechaHoy.getFullYear());

      const ciudad = ((data && data.ciudad) || "Quito").toString().trim();

      // Estilos globales
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);

      // =========================
      // ENCABEZADO / TÍTULO
      // =========================
      // Ajuste de layout: sube el bloque para aprovechar el espacio superior del fondo.
      let cursorY = 50;

      doc.setFontSize(12);
      doc.text("INSTITUTO SUPERIOR TECNOLÓGICO QUITO METROPOLITANO – ITSQMET", centerX, cursorY, { align: "center" });

      cursorY += 10;
      doc.setFontSize(16);
      doc.text("CERTIFICADO DE TÍTULO DE TERCER NIVEL", centerX, cursorY, { align: "center" });

      // =========================
      // CUERPO
      // =========================
      cursorY += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);

      const margenIzq = 30;
      const anchoTexto = 150;

      // Párrafo 1
      const t1 = "El suscrito, en calidad de coordinador de titulación del Instituto Superior Tecnológico Quito Metropolitano – ITSQMET,";
      doc.text(t1, margenIzq, cursorY, { maxWidth: anchoTexto, align: "justify" });
      cursorY += doc.getTextDimensions(t1, { maxWidth: anchoTexto }).h + 8;

      // CERTIFICA:
      doc.setFont("helvetica", "bold");
      doc.text("CERTIFICA:", margenIzq, cursorY);
      cursorY += 10;

      // Párrafo 2 (sin repetir carrera; modalidad/jornada/periodo son opcionales)
      doc.setFont("helvetica", "normal");

      const modalidadTxt = modalidad ? (", modalidad " + modalidad) : "";
      const jornadaTxt = jornada ? (", jornada " + jornada) : "";
      const periodoTxt = periodoAcademico ? (", durante el período académico " + periodoAcademico + ".") : ".";

      // Comentario técnico: se evita repetir "carrera" aquí; la carrera se presenta más adelante en bloque.
      const t2 =
        `Que la señor(a) ${nombre}, portador(a) de la cédula de ciudadanía N.° ${cedula}, ` +
        `ha cumplido satisfactoriamente con todos los requisitos académicos y administrativos establecidos por la institución, ` +
        `correspondientes al plan de estudios y obligaciones académicas y administrativas de la institución` +
        `${modalidadTxt}${jornadaTxt}${periodoTxt}`;
      doc.text(t2, margenIzq, cursorY, { maxWidth: anchoTexto, align: "justify" });
      cursorY += doc.getTextDimensions(t2, { maxWidth: anchoTexto }).h + 8;

      // Párrafo 3
      const t3 =
        "Asimismo, ha aprobado el proceso de titulación conforme a la normativa institucional vigente, encontrándose actualmente a la espera del registro oficial de su título en las instancias correspondientes.";
      doc.text(t3, margenIzq, cursorY, { maxWidth: anchoTexto, align: "justify" });
      cursorY += doc.getTextDimensions(t3, { maxWidth: anchoTexto }).h + 8;

      // Sección (sin género / sin “título obtenido”)
      const t4 = "En virtud de lo expuesto, se deja constancia de la graduación en la carrera de:";
      doc.text(t4, margenIzq, cursorY, { maxWidth: anchoTexto, align: "left" });
      cursorY += doc.getTextDimensions(t4, { maxWidth: anchoTexto }).h + 8;

      // Carrera (centrada y destacada; con salto de línea si es larga)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);

      const carreraTxt = (carrera || "").toString().trim();
      const carreraLines = carreraTxt ? doc.splitTextToSize(carreraTxt, anchoTexto) : [""];
      doc.text(carreraLines, centerX, cursorY, { align: "center" });
      cursorY += (carreraLines.length * 6) + 4;

      // Párrafo 5 (ajustado: no habla de “título”, sino de formación)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      const t5 =
        "Formación correspondiente al Tercer Nivel de Formación Tecnológica, conforme a la normativa vigente del Sistema de Educación Superior del Ecuador.";
      doc.text(t5, margenIzq, cursorY, { maxWidth: anchoTexto, align: "justify" });
      cursorY += doc.getTextDimensions(t5, { maxWidth: anchoTexto }).h + 8;

      // Párrafo 6
      const t6 =
        "El presente certificado se expide a petición del interesado(a), para los fines legales que estime pertinentes.";
      doc.text(t6, margenIzq, cursorY, { maxWidth: anchoTexto, align: "justify" });
      cursorY += doc.getTextDimensions(t6, { maxWidth: anchoTexto }).h + 10;

      // Fecha / ciudad
      const tFecha = `Dado y firmado en la ciudad de ${ciudad}, a los ${dia} días del mes de ${mes} del año ${anio}.`;
      doc.text(tFecha, margenIzq, cursorY, { maxWidth: anchoTexto, align: "left" });

      // =========================
      // FIRMA (evita footer del fondo)
      // =========================
      const dimFecha = doc.getTextDimensions(tFecha, { maxWidth: anchoTexto });

      // Comentario técnico: se limita para no superponer el pie impreso del fondo.
      const FIRMA_MAX_Y = 235;                       // límite para no tocar el footer del fondo
      const FIRMA_MIN_Y = cursorY + dimFecha.h + 18; // mínimo para no pegar la firma a la fecha
      let firmaY = cursorY + dimFecha.h + 28;        // aire para firmar encima de la línea

      if (firmaY > FIRMA_MAX_Y) firmaY = FIRMA_MAX_Y;
      if (firmaY < FIRMA_MIN_Y) firmaY = FIRMA_MIN_Y;

      doc.setLineWidth(0.5);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");

      // Línea centrada (firma)
      doc.line(centerX - 40, firmaY, centerX + 40, firmaY);

      // Texto centrado
      doc.text("Magister Jefferson Villarreal", centerX, firmaY + 5, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Coordinador de titulación y eficiencia terminal", centerX, firmaY + 10, { align: "center" });
      doc.text("Instituto Superior Tecnológico Quito Metropolitano", centerX, firmaY + 14, { align: "center" });

      return doc.output("arraybuffer");
    }
  };
})();