/*
Nombre del archivo: cale.calendar.render.js
Ruta: C:\Users\ITSQMET\Desktop\eventos\cale\cale.calendar.render.js
Función:
- Renderiza el contenido visual de los eventos
- Define tarjetas compactas y expandidas
- Controla la apariencia al montar eventos
*/

(function (window) {
  "use strict";

  window.CALE = window.CALE || {};

  function renderCompactAllDayContent(info) {
    var shared = window.CALE.calendarShared;
    var ext = info.event.extendedProps || {};
    var wrap = shared.createNode("div", "cale-evt-wrap cale-evt-wrap--compact");

    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "5px";
    wrap.style.padding = "0";
    wrap.style.minHeight = "16px";
    wrap.style.width = "100%";
    wrap.style.overflow = "hidden";

    var accent = shared.createNode("span", "cale-evt-accent");
    accent.style.display = "inline-block";
    accent.style.width = "6px";
    accent.style.height = "6px";
    accent.style.borderRadius = "999px";
    accent.style.flex = "0 0 auto";
    accent.style.background = String(ext.accentColor || info.event.borderColor || "#334155");

    var title = shared.createNode("span", "cale-evt-title", info.event.title || "Sin título");
    title.style.fontSize = "11px";
    title.style.fontWeight = "600";
    title.style.lineHeight = "1.1";
    title.style.whiteSpace = "nowrap";
    title.style.overflow = "hidden";
    title.style.textOverflow = "ellipsis";
    title.style.display = "block";
    title.style.minWidth = "0";
    title.style.flex = "1 1 auto";

    wrap.appendChild(accent);
    wrap.appendChild(title);

    return { domNodes: [wrap] };
  }

  function renderExpandedAllDayContent(info) {
    var shared = window.CALE.calendarShared;
    var ext = info.event.extendedProps || {};
    var wrap = shared.createNode("div", "cale-evt-wrap cale-evt-wrap--allday-open");

    wrap.style.display = "flex";
    wrap.style.alignItems = "flex-start";
    wrap.style.gap = "6px";
    wrap.style.padding = "1px 0";
    wrap.style.width = "100%";
    wrap.style.overflow = "hidden";

    var accent = shared.createNode("span", "cale-evt-accent");
    accent.style.display = "inline-block";
    accent.style.width = "8px";
    accent.style.height = "8px";
    accent.style.marginTop = "3px";
    accent.style.borderRadius = "999px";
    accent.style.flex = "0 0 auto";
    accent.style.background = String(ext.accentColor || info.event.borderColor || "#334155");

    var body = shared.createNode("div", "cale-evt-body");
    body.style.display = "flex";
    body.style.flexDirection = "column";
    body.style.gap = "2px";
    body.style.minWidth = "0";
    body.style.flex = "1 1 auto";

    var title = shared.createNode("div", "cale-evt-title", info.event.title || "Sin título");
    title.style.fontSize = "11px";
    title.style.fontWeight = "700";
    title.style.lineHeight = "1.2";
    title.style.color = "#0f172a";
    title.style.display = "-webkit-box";
    title.style.webkitLineClamp = "2";
    title.style.webkitBoxOrient = "vertical";
    title.style.overflow = "hidden";
    title.style.wordBreak = "break-word";

    var metaParts = [];
    if (ext.priority) metaParts.push(ext.priority);
    if (ext.status) metaParts.push(ext.status);

    body.appendChild(title);

    if (metaParts.length) {
      var meta = shared.createNode("div", "cale-evt-meta", metaParts.join(" · "));
      meta.style.fontSize = "10px";
      meta.style.lineHeight = "1.15";
      meta.style.color = "#64748b";
      meta.style.whiteSpace = "nowrap";
      meta.style.overflow = "hidden";
      meta.style.textOverflow = "ellipsis";
      body.appendChild(meta);
    }

    wrap.appendChild(accent);
    wrap.appendChild(body);

    return { domNodes: [wrap] };
  }

  function renderRegularContent(info) {
    var shared = window.CALE.calendarShared;
    var ext = info.event.extendedProps || {};
    var wrap = shared.createNode("div", "cale-evt-wrap");

    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = "2px";
    wrap.style.padding = "2px 0";

    var top = shared.createNode("div", "cale-evt-top");
    top.style.display = "flex";
    top.style.alignItems = "center";
    top.style.gap = "6px";

    var accent = shared.createNode("span", "cale-evt-accent");
    accent.style.display = "inline-block";
    accent.style.width = "8px";
    accent.style.height = "8px";
    accent.style.borderRadius = "999px";
    accent.style.flex = "0 0 auto";
    accent.style.background = String(ext.accentColor || info.event.borderColor || "#334155");

    top.appendChild(accent);

    var hourText = shared.formatHourLine(info);
    if (hourText) {
      var hour = shared.createNode("span", "cale-evt-hour", hourText);
      hour.style.fontSize = "11px";
      hour.style.fontWeight = "700";
      hour.style.opacity = "0.9";
      top.appendChild(hour);
    }

    wrap.appendChild(top);

    var title = shared.createNode("div", "cale-evt-title", info.event.title || "Sin título");
    title.style.fontSize = "12px";
    title.style.fontWeight = "700";
    title.style.lineHeight = "1.25";
    title.style.whiteSpace = "nowrap";
    title.style.overflow = "hidden";
    title.style.textOverflow = "ellipsis";
    wrap.appendChild(title);

    var metaParts = [];
    if (ext.priority) metaParts.push(ext.priority);
    if (ext.status) metaParts.push(ext.status);

    if (metaParts.length) {
      var meta = shared.createNode("div", "cale-evt-meta", metaParts.join(" · "));
      meta.style.fontSize = "10px";
      meta.style.opacity = "0.85";
      meta.style.whiteSpace = "nowrap";
      meta.style.overflow = "hidden";
      meta.style.textOverflow = "ellipsis";
      wrap.appendChild(meta);
    }

    return { domNodes: [wrap] };
  }

  function renderEventCardContent(info) {
    var shared = window.CALE.calendarShared;

    if (info && info.event && info.event.allDay) {
      var viewType = String((info.view && info.view.type) || "");
      if (shared.isDayViewName(viewType)) {
        return renderExpandedAllDayContent(info);
      }
      return renderCompactAllDayContent(info);
    }

    return renderRegularContent(info);
  }

  function eventDidMount(info) {
    var shared = window.CALE.calendarShared;
    var ext = info.event.extendedProps || {};
    var root = info.el;
    var viewType = String((info.view && info.view.type) || "");

    if (!root) return;

    root.style.cursor = "pointer";
    root.style.borderLeftWidth = "4px";
    root.style.borderLeftStyle = "solid";
    root.style.borderLeftColor = String(info.event.borderColor || "#334155");
    root.style.overflow = "hidden";

    if (info.event.allDay) {
      if (shared.isDayViewName(viewType)) {
        root.style.minHeight = "34px";
        root.style.paddingTop = "2px";
        root.style.paddingBottom = "2px";
        root.style.borderRadius = "8px";

        // Corrección: NO forzar columnas por inline-style en cada evento.
        // El layout (2 columnas) lo controla el CSS de la vista Día; aquí solo dejamos estilos de tarjeta.
        root.style.display = "";
        root.style.verticalAlign = "";
        root.style.width = "";
        root.style.margin = "";
        root.style.boxSizing = "border-box";
      } else {
        root.style.minHeight = "18px";
        root.style.paddingTop = "1px";
        root.style.paddingBottom = "1px";
        root.style.borderRadius = "6px";
      }
    }

    if (ext.accentColor) {
      root.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,0.25)";
    }
  }

  window.CALE.calendarRender = {
    renderCompactAllDayContent: renderCompactAllDayContent,
    renderExpandedAllDayContent: renderExpandedAllDayContent,
    renderRegularContent: renderRegularContent,
    renderEventCardContent: renderEventCardContent,
    eventDidMount: eventDidMount
  };

})(window);