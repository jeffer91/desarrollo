/* =========================================================
Nombre completo: repo-pdf-ishikawa-template.js
Ruta: /Reportes/repo-export/repo-pdf-ishikawa-template.js
Función:
- Generar un diagrama Ishikawa en SVG puro con apariencia real
  de espina de pescado.
- Convertir el SVG a PNG dataURL listo para pdfMake.
- Eliminar dependencia de plantillas PNG y overlays manuales.
- Mantener compatibilidad con:
  window.RepoPdfIshikawaTemplate.render(payload, results)
========================================================= */
(function (window) {
  "use strict";

  // CORRECCIÓN: lienzo amplio y estable para hoja horizontal.
  // Evita compresión visual cuando pdfMake incrusta el gráfico como imagen.
  var SVG_W = 1900;
  var SVG_H = 1080;

  function safeArr(x) {
    return Array.isArray(x) ? x : [];
  }

  function n(x) {
    var v = Number(x);
    return Number.isFinite(v) ? v : 0;
  }

  function escStr(s) {
    return String(s || "").trim();
  }

  function escXml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function pctTxt(p) {
    var x = n(p);
    var r = Math.round(x * 10) / 10;
    return String(r).replace(".", ",") + "%";
  }

  function shortLabel(s, max) {
    var t = escStr(s).replace(/\s+/g, " ");
    if (!t) return "";
    if (t.length <= max) return t;
    return t.slice(0, Math.max(0, max - 1)) + "…";
  }

  function wrapText(text, maxChars, maxLines) {
    var src = escStr(text).replace(/\s+/g, " ");
    if (!src) return [];

    var words = src.split(" ");
    var lines = [];
    var line = "";
    var i;

    for (i = 0; i < words.length; i++) {
      var next = line ? (line + " " + words[i]) : words[i];

      if (next.length <= maxChars) {
        line = next;
      } else {
        if (line) lines.push(line);
        line = words[i];
        if (lines.length >= maxLines) break;
      }
    }

    if (lines.length < maxLines && line) lines.push(line);

    if (i < words.length && lines.length) {
      var last = lines[lines.length - 1];

      if (last.length >= maxChars) {
        lines[lines.length - 1] = last.slice(0, Math.max(0, maxChars - 1)) + "…";
      } else {
        lines[lines.length - 1] = last + "…";
      }
    }

    return lines.slice(0, maxLines);
  }

  function makeTextBlock(lines, x, y, opts) {
    opts = opts || {};

    var fontSize = opts.fontSize || 22;
    var lineHeight = opts.lineHeight || Math.round(fontSize * 1.2);
    var weight = opts.weight || "400";
    var color = opts.color || "#111827";
    var anchor = opts.anchor || "start";
    var family = opts.family || "Arial, sans-serif";

    var out = [
      '<text font-family="', family,
      '" font-size="', fontSize,
      '" font-weight="', weight,
      '" fill="', color,
      '" text-anchor="', anchor,
      '">'
    ].join("");

    for (var i = 0; i < lines.length; i++) {
      out += [
        '<tspan x="', x,
        '" y="', (y + (i * lineHeight)),
        '">', escXml(lines[i]), '</tspan>'
      ].join("");
    }

    out += "</text>";
    return out;
  }

  function buildCtx(payload, results) {
    var reqs = (results && Array.isArray(results.requirements)) ? results.requirements : [];
    if (!reqs.length) return null;

    var min = reqs[0];

    for (var i = 1; i < reqs.length; i++) {
      if (n(reqs[i].pct) < n(min.pct)) min = reqs[i];
    }

    var reqKey = String(min.key || "").trim();
    var byCareer = (results && results.byCareer && results.byCareer[reqKey])
      ? results.byCareer[reqKey]
      : [];

    var maxPend = -1;
    var maxCarr = "SIN CARRERA";
    var pendCarr = 0;

    safeArr(byCareer).forEach(function (r) {
      var p = n(r && r.noCumple);

      if (p > maxPend) {
        maxPend = p;
        maxCarr = String(r && r.career || "SIN CARRERA");
        pendCarr = p;
      }
    });

    return {
      PERIODO: String(payload && payload.periodLabel || "").trim() || "—",
      REQ_LABEL: String(min.label || min.key || "Requisito"),
      REQ_PCT: n(min.pct),
      REQ_PEND: n(min.noCumple),
      CARRERA_MAX: maxCarr,
      PEND_CARRERA_MAX: pendCarr
    };
  }

  function makeCategoryBox(cfg) {
    return [
      '<g>',

      // CORRECCIÓN: solo las categorías principales van en cajas.
      // Evita saturar el Ishikawa con tarjetas pequeñas y mejora la lectura.
      '<rect x="', (cfg.x + 5), '" y="', (cfg.y + 7), '" width="', cfg.w, '" height="', cfg.h,
      '" rx="16" fill="#0f172a" fill-opacity="0.08"/>',

      '<rect x="', cfg.x, '" y="', cfg.y, '" width="', cfg.w, '" height="', cfg.h,
      '" rx="16" fill="url(#', cfg.gradId, ')" stroke="', cfg.stroke, '" stroke-width="3"/>',

      '<rect x="', (cfg.x + 12), '" y="', (cfg.y + 10), '" width="', (cfg.w - 24),
      '" height="34" rx="10" fill="#ffffff" fill-opacity="0.62"/>',

      makeTextBlock(wrapText(cfg.title, 28, 1), cfg.x + (cfg.w / 2), cfg.y + 37, {
        fontSize: 24,
        lineHeight: 26,
        anchor: "middle",
        weight: "800",
        color: "#1f2937"
      }),

      '</g>'
    ].join("");
  }

  function makeBulletList(cfg) {
    var items = safeArr(cfg.items);
    var out = ["<g>"];
    var gap = cfg.gap || 68;
    var color = cfg.color || "#334155";
    var bgW = cfg.bgW || 360;

    for (var i = 0; i < items.length; i++) {
      var y = cfg.y + (i * gap);
      var lines = wrapText(shortLabel(items[i], cfg.maxLabel || 72), cfg.maxChars || 34, 2);
      var bgH = lines.length > 1 ? 50 : 34;

      // CORRECCIÓN: fondo plomo semitransparente para textos libres.
      // Mejora la legibilidad sin convertir las causas en tarjetas pesadas.
      out.push(
        '<rect x="', (cfg.x - 34), '" y="', (y - 24), '" width="', bgW,
        '" height="', bgH, '" rx="10" fill="#64748b" fill-opacity="0.14"/>'
      );

      // CORRECCIÓN: punto de color conservado como identificador visual de categoría.
      // Mantiene la relación entre causa y rama sin agregar líneas cruzadas.
      out.push(
        '<circle cx="', (cfg.x - 20), '" cy="', (y - 7),
        '" r="5" fill="', cfg.dot || color, '" fill-opacity="0.90"/>'
      );

      out.push(makeTextBlock(lines, cfg.x, y, {
        fontSize: cfg.fontSize || 20,
        lineHeight: cfg.lineHeight || 22,
        anchor: "start",
        weight: "650",
        color: color
      }));
    }

    out.push("</g>");
    return out.join("");
  }

  function makeBone(cfg) {
    var out = [];
    var shadowOffset = 5;

    // CORRECCIÓN: unión corta entre caja y rama.
    // Evita que las categorías parezcan flotantes dentro del diagrama.
    if (cfg.boxLinkY !== undefined) {
      out.push(
        '<line x1="', cfg.tipX, '" y1="', cfg.boxLinkY,
        '" x2="', cfg.tipX, '" y2="', cfg.tipY,
        '" stroke="', cfg.color, '" stroke-width="5" stroke-linecap="round" stroke-opacity="0.88"/>'
      );
    }

    // CORRECCIÓN: rama principal limpia sin líneas de causa cruzadas.
    // La lectura queda organizada por columnas y el eje central queda despejado.
    out.push(
      '<line x1="', (cfg.tipX + shadowOffset), '" y1="', (cfg.tipY + shadowOffset),
      '" x2="', (cfg.joinX + shadowOffset), '" y2="', (cfg.joinY + shadowOffset),
      '" stroke="#0f172a" stroke-opacity="0.09" stroke-width="12" stroke-linecap="round"/>'
    );

    out.push(
      '<line x1="', cfg.tipX, '" y1="', cfg.tipY,
      '" x2="', cfg.joinX, '" y2="', cfg.joinY,
      '" stroke="', cfg.color, '" stroke-width="7" stroke-linecap="round"/>'
    );

    out.push(
      '<circle cx="', cfg.joinX, '" cy="', cfg.joinY,
      '" r="5.5" fill="', cfg.color, '"/>'
    );

    out.push(makeCategoryBox({
      x: cfg.boxX,
      y: cfg.boxY,
      w: cfg.boxW,
      h: cfg.boxH,
      title: cfg.title,
      gradId: cfg.gradId,
      stroke: cfg.color
    }));

    return out.join("");
  }

  function makeHead(ctx) {
    var panelX = 1468;
    var panelY = 388;
    var panelW = 300;
    var panelH = 292;
    var reqLines = wrapText(ctx.REQ_LABEL, 20, 2);

    return [
      '<g>',

      // CORRECCIÓN: cabeza integrada al eje central.
      // Refuerza la lectura causa → efecto.
      '<polygon points="1348,540 1468,468 1468,612" fill="#2563eb" opacity="0.98"/>',

      '<rect x="', (panelX + 6), '" y="', (panelY + 8), '" width="', panelW, '" height="', panelH,
      '" rx="18" fill="#0f172a" fill-opacity="0.14"/>',

      '<rect x="', panelX, '" y="', panelY, '" width="', panelW, '" height="', panelH,
      '" rx="18" fill="url(#gHead)" stroke="#0f5f99" stroke-width="3"/>',

      '<rect x="', (panelX + 24), '" y="', (panelY + 20), '" width="', (panelW - 48),
      '" height="46" rx="12" fill="#1d9bd7"/>',

      makeTextBlock(["EFECTO"], panelX + (panelW / 2), panelY + 53, {
        fontSize: 31,
        lineHeight: 32,
        anchor: "middle",
        weight: "900",
        color: "#ffffff"
      }),

      makeTextBlock(["Requisito crítico"], panelX + (panelW / 2), panelY + 112, {
        fontSize: 22,
        lineHeight: 24,
        anchor: "middle",
        weight: "800",
        color: "#1f2937"
      }),

      makeTextBlock(reqLines, panelX + (panelW / 2), panelY + 150, {
        fontSize: 23,
        lineHeight: 26,
        anchor: "middle",
        weight: "800",
        color: "#0f172a"
      }),

      makeTextBlock([pctTxt(ctx.REQ_PCT)], panelX + (panelW / 2), panelY + 216, {
        fontSize: 35,
        lineHeight: 36,
        anchor: "middle",
        weight: "900",
        color: "#1e3a8a"
      }),

      makeTextBlock(["Pendientes: " + String(ctx.REQ_PEND)], panelX + (panelW / 2), panelY + 253, {
        fontSize: 21,
        lineHeight: 23,
        anchor: "middle",
        weight: "800",
        color: "#111827"
      }),

      makeTextBlock(["Cumplimiento parcial"], panelX + (panelW / 2), panelY + 281, {
        fontSize: 20,
        lineHeight: 22,
        anchor: "middle",
        weight: "700",
        color: "#111827"
      }),

      '</g>'
    ].join("");
  }

  function buildSvg(ctx) {
    var proceso = [
      "Pendientes del requisito: " + String(ctx.REQ_PEND),
      "Cumplimiento actual: " + pctTxt(ctx.REQ_PCT),
      "Validaciones finales concentradas"
    ];

    var sistema = [
      "Actualizaciones tardías",
      "Brecha entre avance y registro",
      "Validación institucional pendiente"
    ];

    var coordinacion = [
      "Articulación interáreas",
      "Cortes intermedios insuficientes",
      "Seguimiento previo al cierre"
    ];

    var personas = [
      "Carrera crítica: " + shortLabel(ctx.CARRERA_MAX, 28),
      "Pendientes en carrera: " + String(ctx.PEND_CARRERA_MAX),
      "Acompañamiento individual requerido"
    ];

    var tiempo = [
      "Ventana de regularización reducida",
      "Cierre del período",
      "Riesgo en habilitación final"
    ];

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="', SVG_W, '" height="', SVG_H,
      '" viewBox="0 0 ', SVG_W, ' ', SVG_H, '">',

      '<defs>',

      '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">',
      '<stop offset="0%" stop-color="#f8fafc"/>',
      '<stop offset="62%" stop-color="#eff6ff"/>',
      '<stop offset="100%" stop-color="#ffffff"/>',
      '</linearGradient>',

      '<linearGradient id="gProceso" x1="0" y1="0" x2="1" y2="1">',
      '<stop offset="0%" stop-color="#dbeafe"/>',
      '<stop offset="100%" stop-color="#bfdbfe"/>',
      '</linearGradient>',

      '<linearGradient id="gSistema" x1="0" y1="0" x2="1" y2="1">',
      '<stop offset="0%" stop-color="#ccfbf1"/>',
      '<stop offset="100%" stop-color="#99f6e4"/>',
      '</linearGradient>',

      '<linearGradient id="gCoordinacion" x1="0" y1="0" x2="1" y2="1">',
      '<stop offset="0%" stop-color="#ffedd5"/>',
      '<stop offset="100%" stop-color="#fed7aa"/>',
      '</linearGradient>',

      '<linearGradient id="gPersonas" x1="0" y1="0" x2="1" y2="1">',
      '<stop offset="0%" stop-color="#ffe4e6"/>',
      '<stop offset="100%" stop-color="#fecdd3"/>',
      '</linearGradient>',

      '<linearGradient id="gTiempo" x1="0" y1="0" x2="1" y2="1">',
      '<stop offset="0%" stop-color="#fef9c3"/>',
      '<stop offset="100%" stop-color="#fde68a"/>',
      '</linearGradient>',

      '<linearGradient id="gHead" x1="0" y1="0" x2="1" y2="1">',
      '<stop offset="0%" stop-color="#e0f2fe"/>',
      '<stop offset="100%" stop-color="#bfdbfe"/>',
      '</linearGradient>',

      '</defs>',

      '<rect x="0" y="0" width="', SVG_W, '" height="', SVG_H, '" fill="url(#bg)"/>',

      // CORRECCIÓN: marco institucional con aire suficiente.
      // Evita que textos y ramas queden pegados al borde.
      '<rect x="42" y="42" width="1816" height="948" rx="22" fill="#ffffff" fill-opacity="0.60" stroke="#93c5fd" stroke-width="3"/>',

      makeTextBlock(["Análisis causa–efecto del requisito crítico"], 950, 84, {
        fontSize: 37,
        lineHeight: 39,
        anchor: "middle",
        weight: "900",
        color: "#0f172a"
      }),

      makeTextBlock(["Período: " + ctx.PERIODO], 950, 122, {
        fontSize: 20,
        lineHeight: 22,
        anchor: "middle",
        weight: "600",
        color: "#64748b"
      }),

      // Cola del pez
      '<polyline points="195,540 112,466 112,614 195,540" fill="none" stroke="#2563eb" stroke-width="5"/>',
      '<line x1="195" y1="540" x2="112" y2="466" stroke="#2563eb" stroke-width="5"/>',
      '<line x1="195" y1="540" x2="112" y2="614" stroke="#2563eb" stroke-width="5"/>',
      '<line x1="112" y1="466" x2="112" y2="614" stroke="#2563eb" stroke-width="5"/>',

      // Espina principal
      '<line x1="195" y1="540" x2="1348" y2="540" stroke="#0f172a" stroke-opacity="0.12" stroke-width="21" stroke-linecap="round"/>',
      '<line x1="195" y1="540" x2="1348" y2="540" stroke="#2563eb" stroke-width="9" stroke-linecap="round"/>',

      makeTextBlock(["Proceso institucional de titulación"], 505, 578, {
        fontSize: 21,
        lineHeight: 23,
        anchor: "middle",
        weight: "800",
        color: "#1e3a8a"
      }),

      // Ramas superiores
      makeBone({
        title: "Proceso",
        color: "#2563eb",
        gradId: "gProceso",
        tipX: 360,
        tipY: 250,
        joinX: 650,
        joinY: 540,
        boxX: 200,
        boxY: 145,
        boxW: 320,
        boxH: 86,
        boxLinkY: 231
      }),

      makeBone({
        title: "Sistema / Registro",
        color: "#0f766e",
        gradId: "gSistema",
        tipX: 770,
        tipY: 250,
        joinX: 960,
        joinY: 540,
        boxX: 600,
        boxY: 145,
        boxW: 340,
        boxH: 86,
        boxLinkY: 231
      }),

      makeBone({
        title: "Coordinación",
        color: "#ea580c",
        gradId: "gCoordinacion",
        tipX: 1205,
        tipY: 250,
        joinX: 1215,
        joinY: 540,
        boxX: 1030,
        boxY: 145,
        boxW: 350,
        boxH: 86,
        boxLinkY: 231
      }),

      // Causas superiores organizadas por columna
      makeBulletList({
        items: proceso,
        x: 110,
        y: 292,
        gap: 68,
        maxChars: 30,
        fontSize: 19,
        lineHeight: 21,
        color: "#334155",
        dot: "#2563eb",
        bgW: 360
      }),

      makeBulletList({
        items: sistema,
        x: 555,
        y: 292,
        gap: 68,
        maxChars: 31,
        fontSize: 19,
        lineHeight: 21,
        color: "#334155",
        dot: "#0f766e",
        bgW: 365
      }),

      makeBulletList({
        items: coordinacion,
        x: 980,
        y: 292,
        gap: 68,
        maxChars: 31,
        fontSize: 19,
        lineHeight: 21,
        color: "#334155",
        dot: "#ea580c",
        bgW: 365
      }),

      // Ramas inferiores
      makeBone({
        title: "Personas",
        color: "#e11d48",
        gradId: "gPersonas",
        tipX: 520,
        tipY: 835,
        joinX: 720,
        joinY: 540,
        boxX: 340,
        boxY: 855,
        boxW: 360,
        boxH: 86,
        boxLinkY: 855
      }),

      makeBone({
        title: "Tiempo / Cronograma",
        color: "#ca8a04",
        gradId: "gTiempo",
        tipX: 990,
        tipY: 835,
        joinX: 1045,
        joinY: 540,
        boxX: 780,
        boxY: 855,
        boxW: 430,
        boxH: 86,
        boxLinkY: 855
      }),

      // Causas inferiores organizadas por columna
      makeBulletList({
        items: personas,
        x: 110,
        y: 668,
        gap: 68,
        maxChars: 33,
        fontSize: 19,
        lineHeight: 21,
        color: "#334155",
        dot: "#e11d48",
        bgW: 405
      }),

      makeBulletList({
        items: tiempo,
        x: 660,
        y: 668,
        gap: 68,
        maxChars: 34,
        fontSize: 19,
        lineHeight: 21,
        color: "#334155",
        dot: "#ca8a04",
        bgW: 420
      }),

      makeHead(ctx),

      '</svg>'
    ].join("");
  }

  function svgToPngDataUrl(svg) {
    return new Promise(function (resolve, reject) {
      try {
        var img = new Image();

        img.onload = function () {
          try {
            var c = window.document.createElement("canvas");
            c.width = SVG_W;
            c.height = SVG_H;

            var g = c.getContext("2d");

            if (!g) {
              reject(new Error("Canvas no disponible para convertir SVG Ishikawa."));
              return;
            }

            // CORRECCIÓN: fondo blanco explícito.
            // Evita transparencias o tonos extraños al incrustar en el PDF.
            g.fillStyle = "#ffffff";
            g.fillRect(0, 0, SVG_W, SVG_H);
            g.drawImage(img, 0, 0, SVG_W, SVG_H);

            resolve(c.toDataURL("image/png"));
          } catch (e) {
            reject(e);
          }
        };

        img.onerror = reject;

        // CORRECCIÓN: codificación segura del SVG.
        // Evita fallos por tildes, eñes y caracteres especiales.
        var encoded = window.btoa(unescape(encodeURIComponent(svg)));
        img.src = "data:image/svg+xml;base64," + encoded;
      } catch (e) {
        reject(e);
      }
    });
  }

  async function render(payload, results) {
    try {
      if (!window.document || !window.document.createElement) return null;

      var ctx = buildCtx(payload, results);
      if (!ctx) return null;

      // CORRECCIÓN: se genera un Ishikawa limpio y legible:
      // categorías en cajas, causas por columnas, fondo suave y datos críticos visibles.
      var svg = buildSvg(ctx);

      return await svgToPngDataUrl(svg);
    } catch (e) {
      console.warn("[RepoPdfIshikawaTemplate] No se pudo generar el Ishikawa SVG:", e);
      return null;
    }
  }

  window.RepoPdfIshikawaTemplate = {
    render: render
  };
})(window);