// Archivo: screens/certititu/certititu.template.js
(function(){
  window.CERTITITU = window.CERTITITU || {};

  // Plantilla actualizada: se reemplaza “ha obtenido el título de” por “constancia de graduación en la carrera de”
  // y se evita repetir la carrera en el párrafo principal.
  const TEMPLATE_HTML = `
    <div style="text-align:center;">
      <div style="font-weight:900;font-size:14px;">
        INSTITUTO SUPERIOR TECNOLÓGICO QUITO METROPOLITANO – ITSQMET
      </div>
      <div style="margin-top:6px;font-weight:900;font-size:16px;">
        CERTIFICADO DE TÍTULO DE TERCER NIVEL
      </div>
    </div>

    <div style="margin-top:14px;border-top:1px solid #e2e8f0;padding-top:14px;font-size:13px;line-height:1.6;">
      El suscrito, en calidad de coordinador de titulación del Instituto Superior Tecnológico Quito Metropolitano – ITSQMET,
    </div>

    <div style="margin-top:10px;font-size:13px;line-height:1.6;">
      <b>CERTIFICA:</b>
    </div>

    <div style="margin-top:10px;font-size:13px;line-height:1.6;">
      Que la señor(a) <b>[NOMBRE_COMPLETO_ESTUDIANTE]</b>, portador(a) de la cédula de ciudadanía N.° <b>[NUMERO_CEDULA]</b>,
      ha cumplido satisfactoriamente con todos los requisitos académicos y administrativos establecidos por la institución,
      correspondientes al plan de estudios y obligaciones académicas y administrativas de la institución,
      modalidad <b>[MODALIDAD]</b>, jornada <b>[JORNADA]</b>, durante el período académico <b>[PERIODO_ACADEMICO]</b>.
    </div>

    <div style="margin-top:10px;font-size:13px;line-height:1.6;">
      Asimismo, ha aprobado el proceso de titulación conforme a la normativa institucional vigente, encontrándose actualmente
      a la espera del registro oficial de su título en las instancias correspondientes.
    </div>

    <div style="margin-top:10px;font-size:13px;line-height:1.6;">
      En virtud de lo expuesto, se deja constancia de la graduación en la carrera de:
    </div>

    <div style="margin-top:10px;text-align:center;font-weight:900;font-size:14px;line-height:1.6;">
      [NOMBRE_CARRERA]
    </div>

    <div style="margin-top:10px;font-size:13px;line-height:1.6;">
      Formación correspondiente al Tercer Nivel de Formación Tecnológica, conforme a la normativa vigente del Sistema de Educación Superior del Ecuador.
    </div>

    <div style="margin-top:10px;font-size:13px;line-height:1.6;">
      El presente certificado se expide a petición del interesado(a), para los fines legales que estime pertinentes.
    </div>

    <div style="margin-top:14px;font-size:13px;line-height:1.6;">
      Dado y firmado en la ciudad de <b>[CIUDAD]</b>, a los <b>[DIA]</b> días del mes de <b>[MES]</b> del año <b>[ANIO]</b>.
    </div>

    <div style="margin-top:22px;display:grid;grid-template-columns:1fr;gap:12px;">
      <div style="border-top:1px solid #0f172a;padding-top:10px;text-align:center;font-size:12px;">
        <b>Magister Jefferson Villarreal</b><br>
        Coordinador de titulación y eficiencia terminal<br>
        Instituto Superior Tecnológico Quito Metropolitano
      </div>
    </div>
  `;

  function fill(html, data){
    const map = {
      // Placeholders oficiales
      "[NOMBRE_COMPLETO_ESTUDIANTE]": data.nombreCompletoEstudiante ?? data.estudiante ?? "",
      "[NUMERO_CEDULA]": data.numeroCedula ?? data.cedula ?? "",
      "[NOMBRE_CARRERA]": data.nombreCarrera ?? data.carrera ?? "",
      "[MODALIDAD]": data.modalidad ?? "",
      "[JORNADA]": data.jornada ?? "",
      "[PERIODO_ACADEMICO]": data.periodoAcademico ?? data.periodo ?? "",
      "[CIUDAD]": data.ciudad ?? "Quito",
      "[DIA]": data.dia ?? "",
      "[MES]": data.mes ?? "",
      "[ANIO]": data.anio ?? "",

      // Aliases antiguos (por compatibilidad si algún módulo aún los usa en otras pantallas)
      "[PERIODO]": data.periodo ?? data.periodoAcademico ?? "",
      "[ESTUDIANTE]": data.estudiante ?? data.nombreCompletoEstudiante ?? "",
      "[CEDULA]": data.cedula ?? data.numeroCedula ?? "",
      "[CARRERA]": data.carrera ?? data.nombreCarrera ?? "",
      "[FECHA]": data.fecha ?? "",
      "[FIRMANTE]": data.firmante ?? ""
    };

    let out = html;
    for(const k of Object.keys(map)){
      out = out.split(k).join(String(map[k]));
    }
    return out;
  }

  window.CERTITITU.template = {
    getHtml(){ return TEMPLATE_HTML; },
    render(data){ return fill(TEMPLATE_HTML, data); }
  };
})();