/*
Nombre del archivo: cale.calendar.pager.js
Ruta: C:\Users\ITSQMET\Desktop\eventos\cale\cale.calendar.pager.js
Función:
- Construye y controla el modal paginado de eventos
- Muestra todos los eventos de una fecha
- Envía el evento elegido al panel de detalle
*/

(function (window) {
  "use strict";

  window.CALE = window.CALE || {};

  function ensurePagerModal() {
    var shared = window.CALE.calendarShared;
    var store = window.CALE.calendarStore;
    var pagerState = store.pagerState;

    if (pagerState.refs) {
      return pagerState.refs;
    }

    var overlay = shared.createNode("div", "cale-pager-overlay");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(15, 23, 42, 0.38)";
    overlay.style.zIndex = "9999";
    overlay.style.display = "none";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "20px";
    overlay.style.boxSizing = "border-box";

    var modal = shared.createNode("div", "cale-pager-modal");
    modal.style.width = "min(920px, 96vw)";
    modal.style.maxHeight = "min(78vh, 760px)";
    modal.style.background = "#ffffff";
    modal.style.border = "1px solid #d9e2ef";
    modal.style.borderRadius = "16px";
    modal.style.boxShadow = "0 18px 55px rgba(15, 23, 42, 0.22)";
    modal.style.display = "flex";
    modal.style.flexDirection = "column";
    modal.style.overflow = "hidden";

    var header = shared.createNode("div", "cale-pager-head");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.gap = "12px";
    header.style.padding = "14px 16px";
    header.style.borderBottom = "1px solid #e5edf7";
    header.style.background = "#f8fafc";

    var titleWrap = shared.createNode("div", "cale-pager-title-wrap");
    titleWrap.style.display = "flex";
    titleWrap.style.flexDirection = "column";
    titleWrap.style.gap = "2px";
    titleWrap.style.minWidth = "0";

    var title = shared.createNode("div", "cale-pager-title", "Eventos");
    title.style.fontSize = "18px";
    title.style.fontWeight = "800";
    title.style.lineHeight = "1.2";
    title.style.color = "#0f172a";

    var subtitle = shared.createNode("div", "cale-pager-subtitle", "");
    subtitle.style.fontSize = "12px";
    subtitle.style.color = "#64748b";

    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);

    var closeBtn = shared.createNode("button", "cale-pager-close", "Cerrar");
    closeBtn.type = "button";
    closeBtn.style.border = "1px solid #c8d4e5";
    closeBtn.style.background = "#ffffff";
    closeBtn.style.color = "#0f172a";
    closeBtn.style.borderRadius = "10px";
    closeBtn.style.padding = "8px 12px";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.fontWeight = "700";

    header.appendChild(titleWrap);
    header.appendChild(closeBtn);

    var body = shared.createNode("div", "cale-pager-body");
    body.style.padding = "14px 16px";
    body.style.overflow = "auto";
    body.style.flex = "1 1 auto";
    body.style.background = "#ffffff";

    var grid = shared.createNode("div", "cale-pager-grid");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
    grid.style.gap = "12px";
    grid.style.alignItems = "start";

    body.appendChild(grid);

    var footer = shared.createNode("div", "cale-pager-foot");
    footer.style.display = "flex";
    footer.style.alignItems = "center";
    footer.style.justifyContent = "space-between";
    footer.style.gap = "12px";
    footer.style.padding = "12px 16px";
    footer.style.borderTop = "1px solid #e5edf7";
    footer.style.background = "#f8fafc";

    var left = shared.createNode("div", "cale-pager-foot-left");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "8px";

    var prevBtn = shared.createNode("button", "cale-pager-prev", "Anterior");
    prevBtn.type = "button";
    prevBtn.style.border = "1px solid #c8d4e5";
    prevBtn.style.background = "#ffffff";
    prevBtn.style.color = "#0f172a";
    prevBtn.style.borderRadius = "10px";
    prevBtn.style.padding = "8px 12px";
    prevBtn.style.cursor = "pointer";
    prevBtn.style.fontWeight = "700";

    var nextBtn = shared.createNode("button", "cale-pager-next", "Siguiente");
    nextBtn.type = "button";
    nextBtn.style.border = "1px solid #c8d4e5";
    nextBtn.style.background = "#ffffff";
    nextBtn.style.color = "#0f172a";
    nextBtn.style.borderRadius = "10px";
    nextBtn.style.padding = "8px 12px";
    nextBtn.style.cursor = "pointer";
    nextBtn.style.fontWeight = "700";

    left.appendChild(prevBtn);
    left.appendChild(nextBtn);

    var pageInfo = shared.createNode("div", "cale-pager-page-info", "Página 1 de 1");
    pageInfo.style.fontSize = "13px";
    pageInfo.style.fontWeight = "700";
    pageInfo.style.color = "#475569";

    footer.appendChild(left);
    footer.appendChild(pageInfo);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (ev) {
      if (ev.target === overlay) {
        closePendingPager();
      }
    });

    closeBtn.addEventListener("click", function () {
      closePendingPager();
    });

    prevBtn.addEventListener("click", function () {
      if (!pagerState.isOpen) return;
      pagerState.page = Math.max(1, Number(pagerState.page || 1) - 1);
      renderPendingPagerPage();
    });

    nextBtn.addEventListener("click", function () {
      if (!pagerState.isOpen) return;
      var totalPages = Math.max(1, Math.ceil((pagerState.events || []).length / pagerState.pageSize));
      pagerState.page = Math.min(totalPages, Number(pagerState.page || 1) + 1);
      renderPendingPagerPage();
    });

    document.addEventListener("keydown", function (ev) {
      if (!pagerState.isOpen) return;

      if (ev.key === "Escape") {
        closePendingPager();
      } else if (ev.key === "ArrowLeft") {
        pagerState.page = Math.max(1, Number(pagerState.page || 1) - 1);
        renderPendingPagerPage();
      } else if (ev.key === "ArrowRight") {
        var totalPages = Math.max(1, Math.ceil((pagerState.events || []).length / pagerState.pageSize));
        pagerState.page = Math.min(totalPages, Number(pagerState.page || 1) + 1);
        renderPendingPagerPage();
      }
    });

    pagerState.refs = {
      overlay: overlay,
      modal: modal,
      title: title,
      subtitle: subtitle,
      grid: grid,
      prevBtn: prevBtn,
      nextBtn: nextBtn,
      pageInfo: pageInfo
    };

    return pagerState.refs;
  }

  function closePendingPager() {
    var refs = ensurePagerModal();
    var pagerState = window.CALE.calendarStore.pagerState;

    pagerState.isOpen = false;
    refs.overlay.style.display = "none";
  }

  function renderPendingPagerPage() {
    var shared = window.CALE.calendarShared;
    var collect = window.CALE.calendarCollect;
    var pagerState = window.CALE.calendarStore.pagerState;
    var refs = ensurePagerModal();

    var list = pagerState.events || [];
    var pageSize = Math.max(1, Number(pagerState.pageSize || 10));
    var totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    var currentPage = Number(pagerState.page || 1);

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    pagerState.page = currentPage;

    refs.title.textContent = pagerState.title || "Eventos";
    refs.subtitle.textContent = list.length + " evento" + (list.length === 1 ? "" : "s") + " · " + shared.formatDateLabel(pagerState.date);

    refs.grid.innerHTML = "";

    if (!list.length) {
      var empty = shared.createNode("div", "cale-pager-empty", "No hay eventos para mostrar en esta fecha.");
      empty.style.gridColumn = "1 / -1";
      empty.style.padding = "16px";
      empty.style.border = "1px dashed #c8d4e5";
      empty.style.borderRadius = "12px";
      empty.style.background = "#f8fafc";
      empty.style.color = "#64748b";
      empty.style.fontSize = "13px";
      refs.grid.appendChild(empty);
    } else {
      var startIndex = (currentPage - 1) * pageSize;
      var endIndex = startIndex + pageSize;
      var pageItems = list.slice(startIndex, endIndex);

      pageItems.forEach(function (eventApi) {
        var ext = (eventApi && eventApi.extendedProps) || {};

        var card = shared.createNode("button", "cale-pager-card");
        card.type = "button";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.alignItems = "stretch";
        card.style.gap = "6px";
        card.style.width = "100%";
        card.style.textAlign = "left";
        card.style.padding = "12px";
        card.style.border = "1px solid #d9e2ef";
        card.style.borderLeft = "4px solid " + String(eventApi.borderColor || "#334155");
        card.style.borderRadius = "12px";
        card.style.background = String(eventApi.backgroundColor || "#ffffff");
        card.style.cursor = "pointer";
        card.style.boxSizing = "border-box";
        card.style.overflow = "hidden";

        var top = shared.createNode("div", "cale-pager-card-top");
        top.style.display = "flex";
        top.style.alignItems = "center";
        top.style.gap = "8px";

        var accent = shared.createNode("span", "cale-pager-card-accent");
        accent.style.display = "inline-block";
        accent.style.width = "8px";
        accent.style.height = "8px";
        accent.style.borderRadius = "999px";
        accent.style.flex = "0 0 auto";
        accent.style.background = String(ext.accentColor || eventApi.borderColor || "#334155");

        var title = shared.createNode("div", "cale-pager-card-title", eventApi.title || "Sin título");
        title.style.fontSize = "13px";
        title.style.fontWeight = "800";
        title.style.lineHeight = "1.25";
        title.style.color = "#0f172a";
        title.style.minWidth = "0";
        title.style.flex = "1 1 auto";
        title.style.whiteSpace = "nowrap";
        title.style.overflow = "hidden";
        title.style.textOverflow = "ellipsis";

        top.appendChild(accent);
        top.appendChild(title);

        var metaText = collect.buildCardMeta(eventApi);
        var meta = shared.createNode("div", "cale-pager-card-meta", metaText || "Evento");
        meta.style.fontSize = "11px";
        meta.style.color = "#475569";
        meta.style.lineHeight = "1.3";
        meta.style.whiteSpace = "nowrap";
        meta.style.overflow = "hidden";
        meta.style.textOverflow = "ellipsis";

        var descText = String(ext.desc || ext.place || "");
        if (descText.length > 90) {
          descText = descText.slice(0, 87) + "...";
        }

        var desc = shared.createNode("div", "cale-pager-card-desc", descText || "Haz clic para ver el detalle completo.");
        desc.style.fontSize = "11px";
        desc.style.color = "#64748b";
        desc.style.lineHeight = "1.35";
        desc.style.minHeight = "28px";
        desc.style.display = "-webkit-box";
        desc.style.webkitLineClamp = "2";
        desc.style.webkitBoxOrient = "vertical";
        desc.style.overflow = "hidden";

        card.appendChild(top);
        card.appendChild(meta);
        card.appendChild(desc);

        card.addEventListener("click", function () {
          if (window.CALE.detail && typeof window.CALE.detail.showEvent === "function") {
            window.CALE.detail.showEvent(collect.normalizeForDetail(eventApi));
          }
          closePendingPager();
        });

        refs.grid.appendChild(card);
      });
    }

    refs.pageInfo.textContent = "Página " + currentPage + " de " + totalPages;

    refs.prevBtn.disabled = currentPage <= 1;
    refs.nextBtn.disabled = currentPage >= totalPages;

    refs.prevBtn.style.opacity = refs.prevBtn.disabled ? "0.55" : "1";
    refs.nextBtn.style.opacity = refs.nextBtn.disabled ? "0.55" : "1";
    refs.prevBtn.style.cursor = refs.prevBtn.disabled ? "not-allowed" : "pointer";
    refs.nextBtn.style.cursor = refs.nextBtn.disabled ? "not-allowed" : "pointer";
  }

  function openPendingPager(arg) {
    var shared = window.CALE.calendarShared;
    var collect = window.CALE.calendarCollect;
    var pagerState = window.CALE.calendarStore.pagerState;

    var targetDate = shared.cloneDay(arg && arg.date) || shared.cloneDay(new Date());
    var refs = ensurePagerModal();
    var events = collect.collectEventsForDate(targetDate);

    pagerState.isOpen = true;
    pagerState.date = targetDate;
    pagerState.title = "Eventos del " + shared.formatDateLabel(targetDate);
    pagerState.events = events;
    pagerState.page = 1;
    pagerState.pageSize = shared.getConfiguredPagerPageSize();

    renderPendingPagerPage();
    refs.overlay.style.display = "flex";
  }

  window.CALE.calendarPager = {
    ensurePagerModal: ensurePagerModal,
    closePendingPager: closePendingPager,
    renderPendingPagerPage: renderPendingPagerPage,
    openPendingPager: openPendingPager
  };

})(window);