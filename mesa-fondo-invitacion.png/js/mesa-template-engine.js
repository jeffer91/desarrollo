/*
=========================================================
Nombre completo: mesa-template-engine.js
Ruta o ubicación: /js/mesa-template-engine.js
Función o funciones:
- Construir la invitación institucional.
- Soportar formato simple y formato múltiple.
- Agrupar cargos repetidos correctamente.
- Preparar HTML para vista previa e impresión.
=========================================================
*/
"use strict";

(function attachMesaTemplateEngine(global) {
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getCargoMeta(cargoKey) {
    const all = global.MesaConstants?.CARGO_OPTIONS || [];
    return all.find((item) => item.value === cargoKey) || null;
  }

  function getValidAssignments(invitation) {
    return (invitation?.assignments || []).filter((item) => {
      return item.cargoKey && Array.isArray(item.schedules) && item.schedules.filter(Boolean).length;
    });
  }

  function groupAssignments(invitation) {
    const grouped = new Map();

    getValidAssignments(invitation).forEach((assignment) => {
      const meta = getCargoMeta(assignment.cargoKey);
      const groupLabel = meta?.groupedLabel || meta?.label || assignment.cargoKey;

      if (!grouped.has(groupLabel)) {
        grouped.set(groupLabel, []);
      }

      assignment.schedules.forEach((schedule) => {
        const clean = String(schedule || "").trim();
        if (clean) {
          grouped.get(groupLabel).push(clean);
        }
      });
    });

    return Array.from(grouped.entries()).map(([label, schedules]) => ({
      label,
      schedules: Array.from(new Set(schedules))
    }));
  }

  function buildSimpleBody(invitation) {
    const displayName = global.MesaInvitationSchema.getDisplayName(invitation);
    const assignment = getValidAssignments(invitation)[0];
    const meta = getCargoMeta(assignment.cargoKey);
    const schedule = assignment.schedules[0];

    return `
      <p class="mesa-letter__paragraph">
        El Órgano Colegiado Superior del Instituto Superior Universitario Quito Metropolitano, en
        reunión realizada el día ${escapeHtml(invitation.sessionDate)}, <strong>RESOLVIÓ</strong>:
      </p>

      <div class="mesa-letter__designation">
        Designar ${escapeHtml(invitation.article)} ${escapeHtml(displayName)}
        para participar en el evento de incorporación correspondiente a la promoción
        ${escapeHtml(invitation.promotion)}.
      </div>

      <p class="mesa-letter__paragraph">
        Su presencia será requerida ${escapeHtml(schedule)}, en calidad de
        ${escapeHtml(meta?.simpleLabel || meta?.label || "")}.
      </p>

      <p class="mesa-letter__closing">
        Agradecemos profundamente su valiosa participación y su compromiso con la excelencia
        académica en este acto solemne de incorporación.
      </p>
    `;
  }

  function buildMultipleBody(invitation) {
    const displayName = global.MesaInvitationSchema.getDisplayName(invitation);
    const groups = groupAssignments(invitation);

    const groupsHtml = groups.map((group, index) => {
      const items = group.schedules.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

      return `
        <div class="mesa-letter__group">
          <div class="mesa-letter__group-title">${index + 1}. ${escapeHtml(group.label)}:</div>
          <ul class="mesa-letter__times">${items}</ul>
        </div>
      `;
    }).join("");

    return `
      <p class="mesa-letter__paragraph">
        El Órgano Colegiado Superior del Instituto Superior Universitario Quito Metropolitano, en
        reunión realizada el día ${escapeHtml(invitation.sessionDate)}, <strong>RESOLVIÓ</strong> lo siguiente:
      </p>

      <div class="mesa-letter__designation">
        Designar ${escapeHtml(invitation.article)} ${escapeHtml(displayName)}
        para participar en los eventos de incorporación de la promoción
        ${escapeHtml(invitation.promotion)}.
      </div>

      <p class="mesa-letter__responsibilities-intro">
        ${escapeHtml(displayName)} tendrá las siguientes responsabilidades en los eventos:
      </p>

      <div class="mesa-letter__groups">
        ${groupsHtml}
      </div>

      <p class="mesa-letter__closing">
        Agradecemos de antemano su valiosa participación y compromiso en este importante acto de
        incorporación.
      </p>
    `;
  }

  function buildLetterHtml(invitation) {
    const mode = global.MesaInvitationSchema.getInvitationMode(invitation);
    const body = mode === "simple" ? buildSimpleBody(invitation) : buildMultipleBody(invitation);

    return `
      <article class="mesa-letter">
        <div class="mesa-letter__watermark-left" aria-hidden="true"></div>
        <div class="mesa-letter__leaf-right" aria-hidden="true"></div>

        <div class="mesa-letter__logos">
          <div class="mesa-letter__corner" aria-hidden="true"></div>
          <div class="mesa-letter__shield" aria-hidden="true"></div>
          <div class="mesa-letter__logo-text" aria-hidden="true">
            <strong>ITSQMET</strong>
            <span>INSTITUTO SUPERIOR</span>
            <span>UNIVERSITARIO</span>
            <span>QUITO METROPOLITANO</span>
          </div>
        </div>

        <div class="mesa-letter__date">
          ${escapeHtml(invitation.city)}, ${escapeHtml(invitation.documentDate)}
        </div>

        ${body}

        <div class="mesa-letter__signature">
          <div>Atentamente,</div>
          <div class="mesa-letter__signature-name">${escapeHtml(global.MesaConstants.DEFAULT_SIGNATURE_NAME)}</div>
          <div class="mesa-letter__signature-role">${escapeHtml(global.MesaConstants.DEFAULT_SIGNATURE_ROLE)}</div>
        </div>
      </article>
    `;
  }

  function buildPrintableDocument(invitation) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Invitación institucional</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
    }

    .mesa-preview-document {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #fff;
    }

    .mesa-letter {
      position: relative;
      min-height: 297mm;
      padding: 28mm 22mm 26mm 22mm;
      font-family: Georgia, "Times New Roman", serif;
      color: #171717;
      background: #fff;
      overflow: hidden;
      box-sizing: border-box;
    }

    .mesa-letter__watermark-left {
      position: absolute;
      left: -10mm;
      bottom: 18mm;
      width: 62mm;
      height: 120mm;
      border: 3px solid rgba(148, 163, 184, 0.14);
      border-radius: 18px;
      opacity: 0.6;
    }

    .mesa-letter__leaf-right {
      position: absolute;
      right: 10mm;
      bottom: 18mm;
      width: 34mm;
      height: 54mm;
      border-radius: 100px 100px 0 100px;
      border: 2px solid rgba(161, 98, 7, 0.22);
      transform: rotate(22deg);
      opacity: 0.55;
    }

    .mesa-letter__logos {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: start;
      gap: 12px;
      margin-bottom: 24mm;
    }

    .mesa-letter__corner {
      width: 44px;
      height: 44px;
      border-top: 6px solid #b08b45;
      border-left: 6px solid #b08b45;
      border-top-left-radius: 4px;
    }

    .mesa-letter__shield {
      justify-self: center;
      width: 82px;
      height: 102px;
      border: 2px solid #4b5563;
      border-radius: 40px 40px 30px 30px;
      position: relative;
      background:
        linear-gradient(to bottom, #111827 0 18%, transparent 18% 82%, #111827 82% 100%);
    }

    .mesa-letter__shield::after {
      content: "";
      position: absolute;
      left: 50%;
      bottom: 8px;
      width: 14px;
      height: 14px;
      transform: translateX(-50%);
      border-radius: 50%;
      background: #d4af37;
    }

    .mesa-letter__logo-text {
      justify-self: end;
      text-align: right;
      line-height: 1.05;
      font-family: Georgia, "Times New Roman", serif;
    }

    .mesa-letter__logo-text strong {
      display: block;
      font-size: 22px;
      letter-spacing: 0.03em;
    }

    .mesa-letter__logo-text span {
      display: block;
      font-size: 10px;
      color: #374151;
    }

    .mesa-letter__date {
      text-align: right;
      font-size: 11pt;
      font-weight: 700;
      margin-bottom: 16mm;
    }

    .mesa-letter__paragraph {
      margin: 0 0 12px;
      font-size: 11pt;
      line-height: 1.45;
      text-align: justify;
    }

    .mesa-letter__designation {
      margin: 16px 0;
      text-align: center;
      font-weight: 700;
      font-size: 13pt;
      line-height: 1.28;
    }

    .mesa-letter__responsibilities-intro {
      margin: 14px 0 12px;
      font-size: 11pt;
    }

    .mesa-letter__groups {
      margin: 0 0 14px 34px;
      font-size: 11pt;
    }

    .mesa-letter__group + .mesa-letter__group {
      margin-top: 12px;
    }

    .mesa-letter__group-title {
      font-weight: 700;
      margin-bottom: 5px;
    }

    .mesa-letter__times {
      margin: 0;
      padding-left: 24px;
    }

    .mesa-letter__times li {
      margin: 2px 0;
    }

    .mesa-letter__closing {
      margin-top: 14px;
      font-size: 11pt;
      text-align: justify;
    }

    .mesa-letter__signature {
      margin-top: 28mm;
      text-align: center;
      font-size: 11pt;
    }

    .mesa-letter__signature-name {
      margin-top: 30px;
      font-weight: 700;
    }

    .mesa-letter__signature-role {
      margin-top: 2px;
    }

    @page {
      size: A4;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="mesa-preview-document">
    ${buildLetterHtml(invitation)}
  </div>
</body>
</html>
    `;
  }

  global.MesaTemplateEngine = {
    buildLetterHtml,
    buildPrintableDocument
  };
})(window);