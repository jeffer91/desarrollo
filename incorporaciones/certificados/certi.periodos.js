/*
=========================================================
Nombre completo: certi.periodos.js
Ruta o ubicación: /incorporaciones/certificados/certi.periodos.js
Función o funciones:
- Cargar los períodos disponibles para la pantalla Certi.
- Leer primero los períodos administrados desde el modal propio de Certi.
- Intentar leer períodos desde gestores existentes de Incorporaciones.
- Usar períodos de respaldo solo si no existe una lista propia guardada.
- Exponer funciones para listar, guardar y normalizar períodos.
Con qué se une:
- certi.app.js
- certi.render.js
- certi.storage.js
- certi.periodos.modal.js
=========================================================
*/

(function () {
  "use strict";

  const STORAGE_KEY = "certi.periodos";

  const periodosRespaldo = [
    {
      id: "OCTUBRE 2025 - MARZO 2026",
      texto: "OCTUBRE 2025 - MARZO 2026",
      inicioMes: 10,
      inicioAnio: 2025,
      finMes: 3,
      finAnio: 2026,
      fuente: "respaldo"
    },
    {
      id: "ABRIL 2025 - SEPTIEMBRE 2025",
      texto: "ABRIL 2025 - SEPTIEMBRE 2025",
      inicioMes: 4,
      inicioAnio: 2025,
      finMes: 9,
      finAnio: 2025,
      fuente: "respaldo"
    },
    {
      id: "OCTUBRE 2024 - MARZO 2025",
      texto: "OCTUBRE 2024 - MARZO 2025",
      inicioMes: 10,
      inicioAnio: 2024,
      finMes: 3,
      finAnio: 2025,
      fuente: "respaldo"
    }
  ];

  async function cargarPeriodos() {
    const propios = leerPeriodosPropios();

    if (propios.existe) {
      return normalizarPeriodos(propios.lista);
    }

    const desdeGestor = await intentarDesdeGestores();
    if (desdeGestor.length) return normalizarPeriodos(desdeGestor);

    const desdeLocal = intentarDesdeLocalStorageSecundario();
    if (desdeLocal.length) return normalizarPeriodos(desdeLocal);

    return normalizarPeriodos(periodosRespaldo);
  }

  function leerPeriodosPropios() {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw === null) {
      return {
        existe: false,
        lista: []
      };
    }

    try {
      const parseado = JSON.parse(raw);
      return {
        existe: true,
        lista: Array.isArray(parseado) ? parseado : []
      };
    } catch (error) {
      console.warn("No se pudieron leer períodos propios de Certi:", error);
      return {
        existe: true,
        lista: []
      };
    }
  }

  function guardarPeriodosPropios(lista) {
    const normalizados = normalizarPeriodos(lista);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizados));
    return normalizados;
  }

  async function intentarDesdeGestores() {
    try {
      if (
        window.PeriodosManager &&
        typeof window.PeriodosManager.listar === "function"
      ) {
        const lista = await window.PeriodosManager.listar();
        if (Array.isArray(lista)) return lista;
      }

      if (
        window.IncorporacionesPeriodos &&
        typeof window.IncorporacionesPeriodos.obtenerPeriodos === "function"
      ) {
        const lista = await window.IncorporacionesPeriodos.obtenerPeriodos();
        if (Array.isArray(lista)) return lista;
      }

      if (
        window.periodosManager &&
        typeof window.periodosManager.listar === "function"
      ) {
        const lista = await window.periodosManager.listar();
        if (Array.isArray(lista)) return lista;
      }
    } catch (error) {
      console.warn("No se pudieron cargar períodos desde gestores existentes:", error);
    }

    return [];
  }

  function intentarDesdeLocalStorageSecundario() {
    const claves = [
      "incorporaciones.periodos",
      "periodos",
      "periodos-manager"
    ];

    for (const clave of claves) {
      const valor = localStorage.getItem(clave);

      if (!valor) continue;

      try {
        const parseado = JSON.parse(valor);

        if (Array.isArray(parseado)) return parseado;

        if (parseado && Array.isArray(parseado.periodos)) {
          return parseado.periodos;
        }

        if (parseado && Array.isArray(parseado.items)) {
          return parseado.items;
        }
      } catch (error) {
        console.warn("No se pudo leer período desde localStorage:", clave);
      }
    }

    return [];
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
            ...parseado,
            fuente: "certi"
          };
        }

        const texto =
          item.texto ||
          item.nombre ||
          item.label ||
          item.periodo ||
          item.descripcion ||
          item.id ||
          "";

        const id =
          item.id ||
          item.value ||
          item.periodo ||
          texto;

        const parseado = parsearPeriodoTexto(texto || id);

        return {
          ...item,
          id: String(id || "").trim(),
          texto: String(texto || id || "").trim(),
          nombre: String(texto || id || "").trim(),
          inicioMes: Number(item.inicioMes || parseado.inicioMes || 0),
          inicioAnio: Number(item.inicioAnio || parseado.inicioAnio || 0),
          finMes: Number(item.finMes || parseado.finMes || 0),
          finAnio: Number(item.finAnio || parseado.finAnio || 0),
          fuente: item.fuente || "externo"
        };
      })
      .filter(function (item) {
        if (!item.id || !item.texto) return false;
        if (mapa[item.id]) return false;
        mapa[item.id] = true;
        return true;
      })
      .sort(function (a, b) {
        const aOrden = (Number(a.inicioAnio) || 0) * 12 + (Number(a.inicioMes) || 0);
        const bOrden = (Number(b.inicioAnio) || 0) * 12 + (Number(b.inicioMes) || 0);
        return bOrden - aOrden;
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
      "ENERO",
      "FEBRERO",
      "MARZO",
      "ABRIL",
      "MAYO",
      "JUNIO",
      "JULIO",
      "AGOSTO",
      "SEPTIEMBRE",
      "OCTUBRE",
      "NOVIEMBRE",
      "DICIEMBRE"
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

  window.CertiPeriodos = {
    STORAGE_KEY,
    cargarPeriodos,
    normalizarPeriodos,
    leerPeriodosPropios,
    guardarPeriodosPropios
  };
})();
