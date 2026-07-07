/*
=========================================================
Nombre completo: certi.periodos.autoload.js
Ruta o ubicación: /incorporaciones/certificados/certi.periodos.autoload.js
Función o funciones:
- Reconstruir automáticamente el selector de períodos al abrir Certi.
- Leer períodos guardados en localStorage sin necesidad de abrir el modal.
- Restaurar el último período seleccionado cuando exista.
- Reintentar durante el arranque para evitar que otro render deje el selector vacío.
Con qué se une:
- certi.index.html
- certi.periodos.js
- certi.periodos.modal.js
- certi.storage.js
- certi.state.js
=========================================================
*/

(function () {
  "use strict";

  const STORAGE_PERIODOS = "certi.periodos";
  const STORAGE_FORM = "certi.ultimoFormulario";

  iniciar();

  function iniciar() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", programarCargaAutomatica);
      return;
    }

    programarCargaAutomatica();
  }

  function programarCargaAutomatica() {
    cargarSelectorPeriodos();
    setTimeout(cargarSelectorPeriodos, 80);
    setTimeout(cargarSelectorPeriodos, 250);
    setTimeout(cargarSelectorPeriodos, 700);
  }

  async function cargarSelectorPeriodos() {
    const select = document.getElementById("certiPeriodo");
    if (!select) return;

    const periodos = await obtenerPeriodosDisponibles();
    if (!periodos.length) return;

    const valorActual = select.value || "";
    const ultimo = obtenerUltimoFormulario();
    const ultimoPeriodo = ultimo.periodoSeleccionado || "";
    const valorSeleccionado = existePeriodo(periodos, valorActual)
      ? valorActual
      : existePeriodo(periodos, ultimoPeriodo)
        ? ultimoPeriodo
        : "";

    reconstruirSelector(select, periodos, valorSeleccionado);
    sincronizarEstadoPeriodo(select, valorSeleccionado);
  }

  async function obtenerPeriodosDisponibles() {
    const propios = leerPeriodosLocal();
    if (propios.length) return ordenarPeriodos(propios);

    if (window.CertiPeriodos && typeof window.CertiPeriodos.cargarPeriodos === "function") {
      try {
        const desdeModulo = await window.CertiPeriodos.cargarPeriodos();
        const normalizados = normalizarPeriodos(desdeModulo);
        if (normalizados.length) return ordenarPeriodos(normalizados);
      } catch (error) {
        console.warn("No se pudieron cargar períodos desde CertiPeriodos:", error);
      }
    }

    return [];
  }

  function leerPeriodosLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_PERIODOS);
      if (!raw) return [];
      const parseado = JSON.parse(raw);
      return normalizarPeriodos(Array.isArray(parseado) ? parseado : []);
    } catch (error) {
      console.warn("No se pudieron leer períodos guardados:", error);
      return [];
    }
  }

  function obtenerUltimoFormulario() {
    if (window.CertiStorage && typeof window.CertiStorage.obtenerUltimoFormulario === "function") {
      try {
        return window.CertiStorage.obtenerUltimoFormulario() || {};
      } catch (error) {
        console.warn("No se pudo leer último formulario desde CertiStorage:", error);
      }
    }

    try {
      const raw = localStorage.getItem(STORAGE_FORM);
      return raw ? JSON.parse(raw) || {} : {};
    } catch (error) {
      return {};
    }
  }

  function reconstruirSelector(select, periodos, valorSeleccionado) {
    const opciones = ['<option value="">Seleccione un período</option>'];

    periodos.forEach(function (periodo) {
      const selected = periodo.id === valorSeleccionado ? "selected" : "";
      opciones.push(`<option value="${escaparHtml(periodo.id)}" ${selected}>${escaparHtml(periodo.texto)}</option>`);
    });

    const htmlNuevo = opciones.join("");
    if (select.innerHTML !== htmlNuevo) {
      select.innerHTML = htmlNuevo;
    }

    select.value = valorSeleccionado || "";
  }

  function sincronizarEstadoPeriodo(select, valorSeleccionado) {
    const option = select.options[select.selectedIndex];
    const texto = option ? option.textContent : valorSeleccionado || "";

    if (window.CertiState && typeof window.CertiState.establecerPeriodo === "function") {
      window.CertiState.establecerPeriodo(valorSeleccionado || "", texto || "");
    }
  }

  function normalizarPeriodos(lista) {
    const mapa = {};

    return (lista || [])
      .map(function (item) {
        if (typeof item === "string") {
          const parseado = parsearPeriodoTexto(item);
          return {
            id: item,
            texto: item,
            nombre: item,
            ...parseado
          };
        }

        const texto = item.texto || item.nombre || item.label || item.periodo || item.id || "";
        const id = item.id || item.value || item.periodo || texto;
        const parseado = parsearPeriodoTexto(texto || id);

        return {
          ...item,
          id: String(id || "").trim(),
          texto: String(texto || id || "").trim(),
          nombre: String(texto || id || "").trim(),
          inicioMes: Number(item.inicioMes || parseado.inicioMes || 0),
          inicioAnio: Number(item.inicioAnio || parseado.inicioAnio || 0),
          finMes: Number(item.finMes || parseado.finMes || 0),
          finAnio: Number(item.finAnio || parseado.finAnio || 0)
        };
      })
      .filter(function (item) {
        if (!item.id || !item.texto) return false;
        if (mapa[item.id]) return false;
        mapa[item.id] = true;
        return true;
      });
  }

  function ordenarPeriodos(lista) {
    return normalizarPeriodos(lista).sort(function (a, b) {
      const aOrden = (Number(a.inicioAnio) || 0) * 12 + (Number(a.inicioMes) || 0);
      const bOrden = (Number(b.inicioAnio) || 0) * 12 + (Number(b.inicioMes) || 0);
      return bOrden - aOrden;
    });
  }

  function existePeriodo(periodos, id) {
    if (!id) return false;
    return periodos.some(function (periodo) {
      return periodo.id === id;
    });
  }

  function parsearPeriodoTexto(texto) {
    const limpio = String(texto || "").toUpperCase().trim();
    const partes = limpio.split("-").map(function (parte) {
      return parte.trim();
    });

    if (partes.length !== 2) return {};

    const inicio = parsearMesAnio(partes[0]);
    const fin = parsearMesAnio(partes[1]);

    return {
      inicioMes: inicio.mes || 0,
      inicioAnio: inicio.anio || 0,
      finMes: fin.mes || 0,
      finAnio: fin.anio || 0
    };
  }

  function parsearMesAnio(texto) {
    const meses = [
      "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
      "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
    ];

    const limpio = String(texto || "").toUpperCase().trim();
    const anioMatch = limpio.match(/(20\d{2}|21\d{2})/);
    const anio = anioMatch ? Number(anioMatch[1]) : 0;
    const indiceMes = meses.findIndex(function (mes) {
      return limpio.includes(mes);
    });

    return {
      mes: indiceMes >= 0 ? indiceMes + 1 : 0,
      anio
    };
  }

  function escaparHtml(valor) {
    return String(valor == null ? "" : valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  window.CertiPeriodosAutoload = {
    cargarSelectorPeriodos
  };
})();
