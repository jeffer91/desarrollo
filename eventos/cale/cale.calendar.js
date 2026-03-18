/* 
Nombre del archivo: cale.calendar.js
Ruta: C:\Users\ITSQMET\Desktop\eventos\cale\cale.calendar.js
Función:
- Orquesta FullCalendar
- Expone la API pública del módulo
- Mantiene el archivo principal pequeño y claro
*/

(function (window) {
  "use strict";

  window.CALE = window.CALE || {};

  function ensureDependencies() {
    if (!window.CALE.calendarShared) {
      throw new Error("Falta cargar cale.calendar.shared.js");
    }
    if (!window.CALE.calendarRender) {
      throw new Error("Falta cargar cale.calendar.render.js");
    }
    if (!window.CALE.calendarCollect) {
      throw new Error("Falta cargar cale.calendar.collect.js");
    }
    if (!window.CALE.calendarPager) {
      throw new Error("Falta cargar cale.calendar.pager.js");
    }
  }

  function handleDatesSet(info) {
    var shared = window.CALE.calendarShared;
    var store = window.CALE.calendarStore;

    if (!info || !info.view) return;

    var rangeInfo = shared.buildRangeInfoFromView(info.view);

    window.CALE.setCurrentView(info.view.type);
    window.CALE.setCurrentDate(
      (rangeInfo && rangeInfo.start) ||
      info.view.currentStart ||
      new Date()
    );

    shared.setCurrentRangeText(info.view.title || "");
    shared.setActiveViewButton(info.view.type);

    if (typeof store.rangeChangeHandler === "function") {
      store.rangeChangeHandler(rangeInfo);
    }
  }

  function handleEventClick(info) {
    var collect = window.CALE.calendarCollect;

    if (!info || !info.event) return;

    if (window.CALE.detail && typeof window.CALE.detail.showEvent === "function") {
      window.CALE.detail.showEvent(collect.normalizeForDetail(info.event));
    }
  }

  function handleMoreLinkClick(arg) {
    window.CALE.calendarPager.openPendingPager(arg);
    return "none";
  }

  function buildCalendarOptions(initialEvents) {
    var state = window.CALE.getState();
    var render = window.CALE.calendarRender;
    var shared = window.CALE.calendarShared; // Corrección: usamos el pageSize configurado para definir cuántos eventos mostrar antes del “+N más”.

    return {
      initialView: state.currentView || window.CALE.config.defaultView,
      initialDate: state.currentDate || new Date(),
      locale: "es",
      firstDay: 1,
      headerToolbar: false,
      height: "100%",
      nowIndicator: true,
      navLinks: false,
      editable: false,
      selectable: false,
      stickyHeaderDates: true,
      eventOrder: "allDay,start,title",

      // Corrección: evitamos dayMax* global porque puede sobreescribir los límites por vista.
      // Cada vista (month/week/day) define su propio dayMaxEventRows y el "+N más" sigue usando el pager.
      moreLinkClick: handleMoreLinkClick,

      views: {
        dayGridMonth: {
          dayMaxEvents: true,
          dayMaxEventRows: 4
        },
        timeGridWeek: {
          dayMaxEvents: true,
          dayMaxEventRows: 4
        },
        timeGridDay: {
          // Corrección: la vista "Día" debe mostrar solo la fecha activa.
          // Quitamos la duración de 3 días porque estaba abriendo fechas consecutivas en paralelo.
          dayMaxEvents: false,
          dayMaxEventRows: false
        }
      },

      weekends: true,
      allDaySlot: true,
      slotMinTime: "06:00:00",
      slotMaxTime: "22:00:00",
      expandRows: true,
      slotEventOverlap: false,

      events: initialEvents || [],

      eventContent: render.renderEventCardContent,
      eventDidMount: render.eventDidMount,
      eventClick: handleEventClick,
      datesSet: handleDatesSet
    };
  }

  function init(initialEvents) {
    ensureDependencies();

    var shared = window.CALE.calendarShared;
    var pager = window.CALE.calendarPager;
    var store = window.CALE.calendarStore;

    if (store.calendarApi) return store.calendarApi;

    if (!shared.hasCalendarLibrary()) {
      throw new Error("No se encontró FullCalendar en esta pantalla.");
    }

    var el = shared.getCalendarEl();
    if (!el) {
      throw new Error("No se encontró el contenedor del calendario.");
    }

    store.pagerState.pageSize = shared.getConfiguredPagerPageSize();

    store.calendarApi = new window.FullCalendar.Calendar(
      el,
      buildCalendarOptions(initialEvents || [])
    );

    store.calendarApi.render();
    pager.ensurePagerModal();

    return store.calendarApi;
  }

  function getApi() {
    return window.CALE.calendarStore.calendarApi;
  }

  function ensureApi() {
    var api = getApi();
    if (!api) {
      throw new Error("El calendario todavía no ha sido inicializado.");
    }
    return api;
  }

  function getVisibleRange() {
    var shared = window.CALE.calendarShared;
    var api = ensureApi();
    return shared.buildRangeInfoFromView(api.view);
  }

  function replaceEvents(eventsList) {
    var api = ensureApi();
    var pagerState = window.CALE.calendarStore.pagerState;

    if (pagerState.isOpen) {
      window.CALE.calendarPager.closePendingPager();
    }

    api.removeAllEvents();

    (eventsList || []).forEach(function (item) {
      api.addEvent(item);
    });
  }

  function changeView(viewName) {
    var api = ensureApi();
    if (!viewName) return;
    api.changeView(String(viewName));
  }

  function goToday() {
    ensureApi().today();
  }

  function goPrev() {
    ensureApi().prev();
  }

  function goNext() {
    ensureApi().next();
  }

  function setRangeChangeHandler(handler) {
    window.CALE.calendarStore.rangeChangeHandler = typeof handler === "function" ? handler : null;
  }

  window.CALE.calendar = {
    init: init,
    getApi: getApi,
    getVisibleRange: getVisibleRange,
    replaceEvents: replaceEvents,
    changeView: changeView,
    goToday: goToday,
    goPrev: goPrev,
    goNext: goNext,
    setActiveViewButton: window.CALE.calendarShared.setActiveViewButton,
    setCurrentRangeText: window.CALE.calendarShared.setCurrentRangeText,
    setRangeChangeHandler: setRangeChangeHandler,
    closePendingPager: window.CALE.calendarPager.closePendingPager
  };

})(window);