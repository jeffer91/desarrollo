/*
=========================================================
Nombre completo: certi.periodos.js
Ruta o ubicación: /incorporaciones/sedes/certi/certi.periodos.js
Función o funciones:
- Cargar los períodos disponibles para la pantalla Certi.
- Intentar leer períodos desde gestores existentes de Incorporaciones.
- Usar períodos de respaldo si no encuentra una fuente activa.
Con qué se une:
- certi.app.js
- certi.render.js
- certi.storage.js
=========================================================
*/

(function () {
  "use strict";

  const periodosRespaldo = [
    {
      id: "OCTUBRE 2025 - MARZO 2026",
      texto: "OCTUBRE 2025 - MARZO 2026"
    },
    {
      id: "ABRIL 2025 - SEPTIEMBRE 2025",
      texto: "ABRIL 2025 - SEPTIEMBRE 2025"
    },
    {
      id: "OCTUBRE 2024 - MARZO 2025",
      texto: "OCTUBRE 2024 - MARZO 2025"
    }
  ];

  async function cargarPeriodos() {
    const desdeGestor = await intentarDesdeGestores();
    if (desdeGestor.length) return normalizarPeriodos(desdeGestor);

    const desdeLocal = intentarDesdeLocalStorage();
    if (desdeLocal.length) return normalizarPeriodos(desdeLocal);

    return periodosRespaldo;
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

  function intentarDesdeLocalStorage() {
    const claves = [
      "incorporaciones.periodos",
      "periodos",
      "certi.periodos",
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
    return (lista || [])
      .map(function (item) {
        if (typeof item === "string") {
          return {
            id: item,
            texto: item
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

        return {
          id: String(id || "").trim(),
          texto: String(texto || id || "").trim()
        };
      })
      .filter(function (item) {
        return item.id && item.texto;
      });
  }

  window.CertiPeriodos = {
    cargarPeriodos,
    normalizarPeriodos
  };
})();