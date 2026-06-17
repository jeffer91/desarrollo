/*
Nombre completo: admin-table-tools.js
Ruta o ubicación: /incorporaciones-app/js/admin-table-tools.js

Función o funciones:
1. Centralizar las herramientas de la tabla del administrador.
2. Activar el ordenamiento al hacer click en cualquier encabezado con data-sort.
3. Alternar orden ascendente y descendente por columna.
4. Mantener los filtros activos al ordenar.
5. Llenar el buscador predictivo mediante datalist.
6. Llenar el selector directo de estudiantes.
7. Sincronizar el buscador superior con el buscador del bloque Listado de estudiantes.
8. Permitir limpiar la búsqueda sin alterar período, estado ni sede.
9. Resaltar temporalmente el estudiante seleccionado.
*/

window.AdminTableTools = (function () {
  const estado = {
    campoOrden: "",
    direccionOrden: "asc",
    configuracion: null,
    inicializado: false
  };

  function $(id) {
    return document.getElementById(id);
  }

  function normalizar(valor) {
    return String(valor || "")
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function limpiarTexto(valor) {
    return String(valor || "").trim();
  }

  function escaparHTML(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function obtenerConfiguracion() {
    return estado.configuracion || {};
  }

  function llamarRender() {
    const config = obtenerConfiguracion();

    if (typeof config.renderizar === "function") {
      config.renderizar();
    }
  }

  function obtenerBusqueda() {
    const config = obtenerConfiguracion();
    const inputPrincipal = $(config.busquedaPrincipalId);

    if (inputPrincipal) {
      return inputPrincipal.value || "";
    }

    return "";
  }

  function establecerBusqueda(valor, opciones) {
    const config = obtenerConfiguracion();
    const texto = limpiarTexto(valor);
    const ids = [
      config.busquedaPrincipalId,
      config.busquedaListadoId
    ].filter(Boolean);

    ids.forEach(function (id) {
      const input = $(id);

      if (input && input.value !== texto) {
        input.value = texto;
      }
    });

    if (!opciones || opciones.renderizar !== false) {
      llamarRender();
    }
  }

  function limpiarBusqueda() {
    const config = obtenerConfiguracion();
    const selector = $(config.selectorEstudianteId);

    if (selector) {
      selector.value = "";
    }

    establecerBusqueda("");
  }

  function obtenerValorOrden(item, campo) {
    const config = obtenerConfiguracion();

    if (typeof config.obtenerValorOrden === "function") {
      return config.obtenerValorOrden(item, campo);
    }

    return item && item[campo] !== undefined ? item[campo] : "";
  }

  function ordenar(lista) {
    const datos = Array.isArray(lista) ? lista.slice() : [];

    if (!estado.campoOrden) {
      return datos;
    }

    const factor = estado.direccionOrden === "desc" ? -1 : 1;

    return datos.sort(function (a, b) {
      const valorA = String(obtenerValorOrden(a, estado.campoOrden) || "");
      const valorB = String(obtenerValorOrden(b, estado.campoOrden) || "");

      return valorA.localeCompare(valorB, "es", {
        numeric: true,
        sensitivity: "base"
      }) * factor;
    });
  }

  function actualizarIndicadoresOrden() {
    const config = obtenerConfiguracion();
    const tabla = document.querySelector(config.tablaSelector || "#tablaEstudiantesAdmin");

    if (!tabla) {
      return;
    }

    tabla.querySelectorAll("th[data-sort]").forEach(function (th) {
      const labelOriginal = th.getAttribute("data-label-original") || th.textContent.trim();
      const campo = th.getAttribute("data-sort");

      th.setAttribute("data-label-original", labelOriginal);
      th.classList.add("sortable-th");
      th.classList.remove("sort-asc", "sort-desc");
      th.innerHTML = `<span>${escaparHTML(labelOriginal)}</span><span class="sort-icon">↕</span>`;

      if (campo === estado.campoOrden) {
        th.classList.add(estado.direccionOrden === "asc" ? "sort-asc" : "sort-desc");
        th.innerHTML = `<span>${escaparHTML(labelOriginal)}</span><span class="sort-icon">${estado.direccionOrden === "asc" ? "▲" : "▼"}</span>`;
      }
    });
  }

  function configurarOrdenamiento() {
    const config = obtenerConfiguracion();
    const tabla = document.querySelector(config.tablaSelector || "#tablaEstudiantesAdmin");

    if (!tabla) {
      return;
    }

    tabla.querySelectorAll("th[data-sort]").forEach(function (th) {
      if (th.dataset.adminSortReady === "true") {
        return;
      }

      th.dataset.adminSortReady = "true";

      if (!th.getAttribute("data-label-original")) {
        th.setAttribute("data-label-original", th.textContent.trim());
      }

      th.addEventListener("click", function () {
        const campo = th.getAttribute("data-sort");

        if (!campo) {
          return;
        }

        if (estado.campoOrden === campo) {
          estado.direccionOrden = estado.direccionOrden === "asc" ? "desc" : "asc";
        } else {
          estado.campoOrden = campo;
          estado.direccionOrden = "asc";
        }

        llamarRender();
      });
    });

    actualizarIndicadoresOrden();
  }

  function agregarOptionDatalist(datalist, usados, valor, etiqueta) {
    const texto = limpiarTexto(valor);

    if (!datalist || !texto || usados.has(normalizar(texto))) {
      return;
    }

    usados.add(normalizar(texto));

    const option = document.createElement("option");
    option.value = texto;

    if (etiqueta) {
      option.label = limpiarTexto(etiqueta);
    }

    datalist.appendChild(option);
  }

  function actualizarPredictor(lista) {
    const config = obtenerConfiguracion();
    const datalist = $(config.datalistId);
    const selector = $(config.selectorEstudianteId);
    const estudiantes = Array.isArray(lista) ? lista : [];

    if (datalist) {
      datalist.innerHTML = "";
    }

    if (selector) {
      selector.innerHTML = `<option value="">Seleccionar estudiante...</option>`;
    }

    const usadosDatalist = new Set();
    const usadosCarreras = new Set();

    estudiantes.forEach(function (estudiante) {
      const cedula = limpiarTexto(config.obtenerCedula ? config.obtenerCedula(estudiante) : estudiante.cedula);
      const nombres = limpiarTexto(config.obtenerNombres ? config.obtenerNombres(estudiante) : estudiante.Nombres);
      const carrera = limpiarTexto(config.obtenerCarrera ? config.obtenerCarrera(estudiante) : estudiante.NombreCarrera);
      const periodo = limpiarTexto(config.obtenerPeriodo ? config.obtenerPeriodo(estudiante) : estudiante.periodoId);
      const label = [cedula, nombres, carrera].filter(Boolean).join(" | ");

      agregarOptionDatalist(datalist, usadosDatalist, cedula, [nombres, carrera].filter(Boolean).join(" | "));
      agregarOptionDatalist(datalist, usadosDatalist, nombres, [cedula, carrera].filter(Boolean).join(" | "));

      if (carrera && !usadosCarreras.has(normalizar(carrera))) {
        usadosCarreras.add(normalizar(carrera));
        agregarOptionDatalist(datalist, usadosDatalist, carrera, "Carrera");
      }

      if (selector && cedula) {
        const option = document.createElement("option");
        option.value = cedula;
        option.textContent = label || cedula;
        option.dataset.busqueda = [cedula, nombres, carrera, periodo].join(" ");
        selector.appendChild(option);
      }
    });
  }

  function sincronizarInputs(origen) {
    const config = obtenerConfiguracion();
    const principal = $(config.busquedaPrincipalId);
    const listado = $(config.busquedaListadoId);
    const valor = origen ? origen.value : obtenerBusqueda();

    if (principal && principal !== origen) {
      principal.value = valor;
    }

    if (listado && listado !== origen) {
      listado.value = valor;
    }
  }

  function configurarBuscadores() {
    const config = obtenerConfiguracion();
    const ids = [config.busquedaPrincipalId, config.busquedaListadoId].filter(Boolean);

    ids.forEach(function (id) {
      const input = $(id);

      if (!input || input.dataset.adminSearchReady === "true") {
        return;
      }

      input.dataset.adminSearchReady = "true";

      input.addEventListener("input", function () {
        sincronizarInputs(input);

        const selector = $(config.selectorEstudianteId);
        if (selector) {
          selector.value = "";
        }

        llamarRender();
      });
    });

    const selector = $(config.selectorEstudianteId);

    if (selector && selector.dataset.adminSelectorReady !== "true") {
      selector.dataset.adminSelectorReady = "true";

      selector.addEventListener("change", function () {
        const cedula = selector.value;

        establecerBusqueda(cedula, { renderizar: true });

        if (cedula) {
          setTimeout(function () {
            enfocarFila(cedula);
          }, 60);
        }
      });
    }

    const btnLimpiar = $(config.botonLimpiarBusquedaId);

    if (btnLimpiar && btnLimpiar.dataset.adminClearReady !== "true") {
      btnLimpiar.dataset.adminClearReady = "true";
      btnLimpiar.addEventListener("click", limpiarBusqueda);
    }
  }

  function enfocarFila(cedula) {
    const config = obtenerConfiguracion();
    const valor = normalizar(cedula);
    const tabla = document.querySelector(config.tablaSelector || "#tablaEstudiantesAdmin");

    if (!tabla || !valor) {
      return;
    }

    tabla.querySelectorAll("tbody tr").forEach(function (tr) {
      tr.classList.remove("fila-seleccionada-admin");
    });

    const fila = Array.from(tabla.querySelectorAll("tbody tr[data-cedula]")).find(function (tr) {
      return normalizar(tr.getAttribute("data-cedula")) === valor;
    });

    if (!fila) {
      return;
    }

    fila.classList.add("fila-seleccionada-admin");
    fila.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    setTimeout(function () {
      fila.classList.remove("fila-seleccionada-admin");
    }, 2600);
  }

  function inicializar(configuracion) {
    estado.configuracion = configuracion || {};
    estado.inicializado = true;

    configurarOrdenamiento();
    configurarBuscadores();
  }

  function resetearOrden() {
    estado.campoOrden = "";
    estado.direccionOrden = "asc";
    actualizarIndicadoresOrden();
  }

  return {
    inicializar: inicializar,
    configurarOrdenamiento: configurarOrdenamiento,
    configurarBuscadores: configurarBuscadores,
    ordenar: ordenar,
    actualizarPredictor: actualizarPredictor,
    actualizarIndicadoresOrden: actualizarIndicadoresOrden,
    obtenerBusqueda: obtenerBusqueda,
    establecerBusqueda: establecerBusqueda,
    limpiarBusqueda: limpiarBusqueda,
    enfocarFila: enfocarFila,
    resetearOrden: resetearOrden
  };
})();