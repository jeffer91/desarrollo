/*
=========================================================
Nombre completo: certi.periodos.modal.js
Ruta o ubicación: /incorporaciones/certificados/certi.periodos.modal.js
Función o funciones:
- Crear el botón Gestionar períodos junto al selector principal de período.
- Mostrar modal para crear, editar y borrar períodos.
- Usar selector de mes e incremento/decremento de año para inicio y fin.
- Guardar períodos en localStorage y actualizar el selector principal de Certi.
Con qué se une:
- certi.index.html
- certi.periodos.js
- certi.render.js
- certi.state.js
- certi.storage.js
=========================================================
*/

(function () {
  "use strict";

  const STORAGE_KEY = "certi.periodos";
  const MESES = [
    { valor: 1, texto: "ENERO" },
    { valor: 2, texto: "FEBRERO" },
    { valor: 3, texto: "MARZO" },
    { valor: 4, texto: "ABRIL" },
    { valor: 5, texto: "MAYO" },
    { valor: 6, texto: "JUNIO" },
    { valor: 7, texto: "JULIO" },
    { valor: 8, texto: "AGOSTO" },
    { valor: 9, texto: "SEPTIEMBRE" },
    { valor: 10, texto: "OCTUBRE" },
    { valor: 11, texto: "NOVIEMBRE" },
    { valor: 12, texto: "DICIEMBRE" }
  ];

  let editandoId = "";
  let refs = {};

  document.addEventListener("DOMContentLoaded", iniciarModalPeriodos);

  function iniciarModalPeriodos() {
    insertarBotonGestion();
    crearModal();
    enlazarEventos();
    asegurarPeriodosIniciales();
    renderizarLista();
    actualizarPreview();
  }

  function insertarBotonGestion() {
    const selectPeriodo = document.getElementById("certiPeriodo");
    if (!selectPeriodo || document.getElementById("certiBtnGestionPeriodos")) return;

    const label = selectPeriodo.closest(".certi-field") || selectPeriodo.parentElement;
    if (!label) return;

    const wrapper = document.createElement("div");
    wrapper.className = "certi-periodo-selector-row";

    selectPeriodo.parentNode.insertBefore(wrapper, selectPeriodo);
    wrapper.appendChild(selectPeriodo);

    const boton = document.createElement("button");
    boton.id = "certiBtnGestionPeriodos";
    boton.className = "certi-periodo-manage-btn";
    boton.type = "button";
    boton.textContent = "Gestionar";
    boton.title = "Crear, editar o borrar períodos";

    wrapper.appendChild(boton);
  }

  function crearModal() {
    if (document.getElementById("certiPeriodosModal")) return;

    const modal = document.createElement("section");
    modal.id = "certiPeriodosModal";
    modal.className = "certi-periodos-modal certi-periodos-hidden";
    modal.setAttribute("aria-hidden", "true");

    modal.innerHTML = `
      <div class="certi-periodos-backdrop" data-certi-periodos-close="1"></div>

      <div class="certi-periodos-dialog" role="dialog" aria-modal="true" aria-labelledby="certiPeriodosTitulo">
        <header class="certi-periodos-header">
          <div>
            <p>Configuración</p>
            <h2 id="certiPeriodosTitulo">Gestionar períodos</h2>
            <span>Cree períodos con mes y año de inicio/fin.</span>
          </div>
          <button id="certiPeriodosCerrar" class="certi-periodos-close" type="button" aria-label="Cerrar modal">×</button>
        </header>

        <div class="certi-periodos-body">
          <form id="certiPeriodosForm" class="certi-periodos-form">
            <input type="hidden" id="certiPeriodoEditId" value="" />

            <div class="certi-periodos-section-title">
              <strong id="certiPeriodoFormTitulo">Crear período</strong>
              <span id="certiPeriodoPreview">ABRIL 2026 - SEPTIEMBRE 2026</span>
            </div>

            <div class="certi-periodos-grid">
              <div class="certi-periodos-group">
                <label for="certiPeriodoInicioMes">Mes inicio</label>
                <select id="certiPeriodoInicioMes"></select>
              </div>

              <div class="certi-periodos-group">
                <label for="certiPeriodoInicioAnio">Año inicio</label>
                <div class="certi-year-control">
                  <button type="button" data-year-step="-1" data-year-target="certiPeriodoInicioAnio">−</button>
                  <input id="certiPeriodoInicioAnio" type="number" min="2000" max="2100" step="1" />
                  <button type="button" data-year-step="1" data-year-target="certiPeriodoInicioAnio">+</button>
                </div>
              </div>

              <div class="certi-periodos-group">
                <label for="certiPeriodoFinMes">Mes fin</label>
                <select id="certiPeriodoFinMes"></select>
              </div>

              <div class="certi-periodos-group">
                <label for="certiPeriodoFinAnio">Año fin</label>
                <div class="certi-year-control">
                  <button type="button" data-year-step="-1" data-year-target="certiPeriodoFinAnio">−</button>
                  <input id="certiPeriodoFinAnio" type="number" min="2000" max="2100" step="1" />
                  <button type="button" data-year-step="1" data-year-target="certiPeriodoFinAnio">+</button>
                </div>
              </div>
            </div>

            <div id="certiPeriodoModalAlerta" class="certi-periodos-alert certi-periodos-alert-hidden"></div>

            <div class="certi-periodos-actions">
              <button id="certiPeriodoGuardar" type="submit" class="certi-btn certi-btn-primary">Guardar período</button>
              <button id="certiPeriodoCancelarEdicion" type="button" class="certi-btn certi-btn-ghost">Cancelar edición</button>
            </div>
          </form>

          <div class="certi-periodos-list-panel">
            <div class="certi-periodos-section-title">
              <strong>Períodos guardados</strong>
              <span id="certiPeriodosContador">0 períodos</span>
            </div>
            <div id="certiPeriodosLista" class="certi-periodos-list"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    refs = {
      modal,
      form: document.getElementById("certiPeriodosForm"),
      cerrar: document.getElementById("certiPeriodosCerrar"),
      editId: document.getElementById("certiPeriodoEditId"),
      formTitulo: document.getElementById("certiPeriodoFormTitulo"),
      inicioMes: document.getElementById("certiPeriodoInicioMes"),
      inicioAnio: document.getElementById("certiPeriodoInicioAnio"),
      finMes: document.getElementById("certiPeriodoFinMes"),
      finAnio: document.getElementById("certiPeriodoFinAnio"),
      preview: document.getElementById("certiPeriodoPreview"),
      alerta: document.getElementById("certiPeriodoModalAlerta"),
      cancelar: document.getElementById("certiPeriodoCancelarEdicion"),
      lista: document.getElementById("certiPeriodosLista"),
      contador: document.getElementById("certiPeriodosContador")
    };

    llenarMeses(refs.inicioMes);
    llenarMeses(refs.finMes);
    establecerValoresDefecto();
  }

  function enlazarEventos() {
    const botonAbrir = document.getElementById("certiBtnGestionPeriodos");
    if (botonAbrir) botonAbrir.addEventListener("click", abrirModal);
    if (refs.cerrar) refs.cerrar.addEventListener("click", cerrarModal);
    if (refs.cancelar) refs.cancelar.addEventListener("click", cancelarEdicion);

    if (refs.modal) {
      refs.modal.addEventListener("click", function (evento) {
        if (evento.target && evento.target.dataset.certiPeriodosClose) cerrarModal();
      });
    }

    if (refs.form) {
      refs.form.addEventListener("submit", guardarDesdeFormulario);
    }

    [refs.inicioMes, refs.inicioAnio, refs.finMes, refs.finAnio].forEach(function (control) {
      if (control) control.addEventListener("input", actualizarPreview);
      if (control) control.addEventListener("change", actualizarPreview);
    });

    document.addEventListener("click", function (evento) {
      const btnAnio = evento.target.closest("[data-year-step]");
      if (btnAnio) {
        cambiarAnio(btnAnio);
        return;
      }

      const btnAccion = evento.target.closest("[data-periodo-action]");
      if (btnAccion) {
        manejarAccionLista(btnAccion);
      }
    });

    document.addEventListener("keydown", function (evento) {
      if (evento.key === "Escape" && refs.modal && !refs.modal.classList.contains("certi-periodos-hidden")) {
        cerrarModal();
      }
    });
  }

  function abrirModal() {
    asegurarPeriodosIniciales();
    cancelarEdicion(false);
    renderizarLista();
    ocultarAlerta();

    refs.modal.classList.remove("certi-periodos-hidden");
    refs.modal.setAttribute("aria-hidden", "false");

    setTimeout(function () {
      if (refs.inicioMes) refs.inicioMes.focus();
    }, 40);
  }

  function cerrarModal() {
    if (!refs.modal) return;
    refs.modal.classList.add("certi-periodos-hidden");
    refs.modal.setAttribute("aria-hidden", "true");
  }

  function llenarMeses(select) {
    if (!select) return;

    select.innerHTML = MESES.map(function (mes) {
      return `<option value="${mes.valor}">${mes.texto}</option>`;
    }).join("");
  }

  function establecerValoresDefecto() {
    const fecha = new Date();
    const anio = fecha.getFullYear();

    refs.inicioMes.value = "4";
    refs.inicioAnio.value = String(anio);
    refs.finMes.value = "9";
    refs.finAnio.value = String(anio);
    actualizarPreview();
  }

  function cambiarAnio(boton) {
    const targetId = boton.dataset.yearTarget;
    const step = Number(boton.dataset.yearStep || 0);
    const input = document.getElementById(targetId);
    if (!input) return;

    const actual = Number(input.value || new Date().getFullYear());
    const nuevo = Math.min(2100, Math.max(2000, actual + step));
    input.value = String(nuevo);
    actualizarPreview();
  }

  function obtenerPeriodoFormulario() {
    const inicioMes = Number(refs.inicioMes.value || 0);
    const inicioAnio = Number(refs.inicioAnio.value || 0);
    const finMes = Number(refs.finMes.value || 0);
    const finAnio = Number(refs.finAnio.value || 0);
    const texto = construirTextoPeriodo(inicioMes, inicioAnio, finMes, finAnio);

    return {
      id: texto,
      texto,
      nombre: texto,
      inicioMes,
      inicioAnio,
      finMes,
      finAnio,
      actualizadoEn: new Date().toISOString(),
      fuente: "certi"
    };
  }

  function construirTextoPeriodo(inicioMes, inicioAnio, finMes, finAnio) {
    const inicio = obtenerNombreMes(inicioMes);
    const fin = obtenerNombreMes(finMes);
    return `${inicio} ${inicioAnio} - ${fin} ${finAnio}`.trim();
  }

  function obtenerNombreMes(valor) {
    const mes = MESES.find(function (item) {
      return item.valor === Number(valor);
    });

    return mes ? mes.texto : "MES";
  }

  function actualizarPreview() {
    if (!refs.preview) return;
    const periodo = obtenerPeriodoFormulario();
    refs.preview.textContent = periodo.texto;
  }

  function validarPeriodo(periodo) {
    const errores = [];

    if (!periodo.inicioMes || !periodo.finMes) {
      errores.push("Debe seleccionar mes de inicio y mes de fin.");
    }

    if (!periodo.inicioAnio || !periodo.finAnio) {
      errores.push("Debe seleccionar año de inicio y año de fin.");
    }

    if (periodo.inicioAnio < 2000 || periodo.inicioAnio > 2100 || periodo.finAnio < 2000 || periodo.finAnio > 2100) {
      errores.push("El año debe estar entre 2000 y 2100.");
    }

    const inicioOrden = periodo.inicioAnio * 12 + periodo.inicioMes;
    const finOrden = periodo.finAnio * 12 + periodo.finMes;

    if (finOrden < inicioOrden) {
      errores.push("El fin del período no puede ser anterior al inicio.");
    }

    return errores;
  }

  function guardarDesdeFormulario(evento) {
    evento.preventDefault();

    const periodo = obtenerPeriodoFormulario();
    const errores = validarPeriodo(periodo);

    if (errores.length) {
      mostrarAlerta(errores[0], "error");
      return;
    }

    const lista = leerPeriodos();
    const editId = editandoId || refs.editId.value || "";
    const existeDuplicado = lista.some(function (item) {
      return item.id === periodo.id && item.id !== editId;
    });

    if (existeDuplicado) {
      mostrarAlerta("Ese período ya existe.", "error");
      return;
    }

    let nuevaLista;

    if (editId) {
      nuevaLista = lista.map(function (item) {
        return item.id === editId ? periodo : item;
      });
    } else {
      nuevaLista = lista.concat(periodo);
    }

    guardarPeriodos(ordenarPeriodos(nuevaLista));
    seleccionarPeriodoPrincipal(periodo.id, periodo.texto);
    renderizarLista();
    recargarSelectorPrincipal(periodo.id);
    cancelarEdicion(false);
    mostrarAlerta("Período guardado correctamente.", "success");
  }

  function manejarAccionLista(boton) {
    const accion = boton.dataset.periodoAction;
    const id = boton.dataset.periodoId;

    if (!id) return;

    if (accion === "editar") {
      cargarPeriodoParaEditar(id);
      return;
    }

    if (accion === "borrar") {
      borrarPeriodo(id);
    }
  }

  function cargarPeriodoParaEditar(id) {
    const periodo = leerPeriodos().find(function (item) {
      return item.id === id;
    });

    if (!periodo) return;

    editandoId = periodo.id;
    refs.editId.value = periodo.id;
    refs.formTitulo.textContent = "Editar período";
    refs.inicioMes.value = String(periodo.inicioMes || 4);
    refs.inicioAnio.value = String(periodo.inicioAnio || new Date().getFullYear());
    refs.finMes.value = String(periodo.finMes || 9);
    refs.finAnio.value = String(periodo.finAnio || new Date().getFullYear());
    actualizarPreview();
    ocultarAlerta();
  }

  function borrarPeriodo(id) {
    const periodo = leerPeriodos().find(function (item) {
      return item.id === id;
    });

    if (!periodo) return;

    const confirmar = window.confirm(`¿Desea borrar el período ${periodo.texto || periodo.id}?`);
    if (!confirmar) return;

    const nuevaLista = leerPeriodos().filter(function (item) {
      return item.id !== id;
    });

    guardarPeriodos(nuevaLista);

    const selectPeriodo = document.getElementById("certiPeriodo");
    const eraSeleccionado = selectPeriodo && selectPeriodo.value === id;

    if (eraSeleccionado) {
      seleccionarPeriodoPrincipal("", "");
      recargarSelectorPrincipal("");
    } else {
      recargarSelectorPrincipal(selectPeriodo ? selectPeriodo.value : "");
    }

    cancelarEdicion(false);
    renderizarLista();
    mostrarAlerta("Período borrado correctamente.", "success");
  }

  function cancelarEdicion(mostrarMensaje) {
    editandoId = "";
    if (refs.editId) refs.editId.value = "";
    if (refs.formTitulo) refs.formTitulo.textContent = "Crear período";
    establecerValoresDefecto();
    if (mostrarMensaje !== false) ocultarAlerta();
  }

  function renderizarLista() {
    const lista = ordenarPeriodos(leerPeriodos());

    if (refs.contador) {
      refs.contador.textContent = `${lista.length} período${lista.length === 1 ? "" : "s"}`;
    }

    if (!refs.lista) return;

    if (!lista.length) {
      refs.lista.innerHTML = `
        <div class="certi-periodos-empty">
          No hay períodos guardados. Cree el primero con los campos superiores.
        </div>
      `;
      return;
    }

    refs.lista.innerHTML = lista.map(function (periodo) {
      return `
        <article class="certi-periodo-item">
          <div>
            <strong>${escaparHtml(periodo.texto || periodo.id)}</strong>
            <span>${escaparHtml(obtenerDetallePeriodo(periodo))}</span>
          </div>
          <div class="certi-periodo-item-actions">
            <button type="button" data-periodo-action="editar" data-periodo-id="${escaparHtml(periodo.id)}">Editar</button>
            <button type="button" data-periodo-action="borrar" data-periodo-id="${escaparHtml(periodo.id)}">Borrar</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function obtenerDetallePeriodo(periodo) {
    if (periodo.inicioMes && periodo.finMes) {
      return `${obtenerNombreMes(periodo.inicioMes)} ${periodo.inicioAnio} hasta ${obtenerNombreMes(periodo.finMes)} ${periodo.finAnio}`;
    }

    return "Período institucional";
  }

  function asegurarPeriodosIniciales() {
    if (localStorage.getItem(STORAGE_KEY) !== null) return;

    const selectPeriodo = document.getElementById("certiPeriodo");
    const desdeSelector = [];

    if (selectPeriodo) {
      Array.from(selectPeriodo.options || []).forEach(function (option) {
        if (!option.value) return;
        const parseado = parsearPeriodoTexto(option.textContent || option.value);
        desdeSelector.push({
          id: option.value,
          texto: option.textContent || option.value,
          nombre: option.textContent || option.value,
          ...parseado,
          fuente: "selector"
        });
      });
    }

    if (desdeSelector.length) {
      guardarPeriodos(ordenarPeriodos(desdeSelector));
    }
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
      inicioMes: inicio.mes || "",
      inicioAnio: inicio.anio || "",
      finMes: fin.mes || "",
      finAnio: fin.anio || ""
    };
  }

  function parsearMesAnio(texto) {
    const limpio = String(texto || "").toUpperCase().trim();
    const anioMatch = limpio.match(/(20\d{2}|21\d{2})/);
    const anio = anioMatch ? Number(anioMatch[1]) : "";
    const mes = MESES.find(function (item) {
      return limpio.includes(item.texto);
    });

    return {
      mes: mes ? mes.valor : "",
      anio
    };
  }

  function leerPeriodos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return [];
      const parseado = JSON.parse(raw);
      return normalizarPeriodos(Array.isArray(parseado) ? parseado : []);
    } catch (error) {
      console.warn("No se pudieron leer períodos de Certi:", error);
      return [];
    }
  }

  function guardarPeriodos(lista) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizarPeriodos(lista)));
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
          finAnio: Number(item.finAnio || parseado.finAnio || 0),
          fuente: item.fuente || "certi"
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

  async function recargarSelectorPrincipal(valorSeleccionado) {
    const valor = valorSeleccionado || "";
    let periodos = leerPeriodos();

    if (window.CertiPeriodos && typeof window.CertiPeriodos.cargarPeriodos === "function") {
      periodos = await window.CertiPeriodos.cargarPeriodos();
    }

    if (window.CertiRender && typeof window.CertiRender.renderizarPeriodos === "function") {
      window.CertiRender.renderizarPeriodos(periodos, valor);
    }

    const selectPeriodo = document.getElementById("certiPeriodo");
    if (selectPeriodo) {
      selectPeriodo.value = valor;
      selectPeriodo.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function seleccionarPeriodoPrincipal(id, texto) {
    const selectPeriodo = document.getElementById("certiPeriodo");

    if (selectPeriodo) {
      selectPeriodo.value = id || "";
    }

    if (window.CertiState && typeof window.CertiState.establecerPeriodo === "function") {
      window.CertiState.establecerPeriodo(id || "", texto || id || "");
    }

    if (window.CertiStorage && typeof window.CertiStorage.guardarUltimoFormulario === "function") {
      const estado = window.CertiState && typeof window.CertiState.obtener === "function"
        ? window.CertiState.obtener()
        : {};

      window.CertiStorage.guardarUltimoFormulario({
        periodoSeleccionado: id || "",
        periodoTexto: texto || id || "",
        fechaCertificado: estado.fechaCertificado || "",
        fuenteDatos: estado.fuenteDatos || "auto"
      });
    }
  }

  function mostrarAlerta(mensaje, tipo) {
    if (!refs.alerta) return;

    refs.alerta.textContent = mensaje;
    refs.alerta.className = `certi-periodos-alert certi-periodos-alert-${tipo || "info"}`;
  }

  function ocultarAlerta() {
    if (!refs.alerta) return;
    refs.alerta.textContent = "";
    refs.alerta.className = "certi-periodos-alert certi-periodos-alert-hidden";
  }

  function escaparHtml(valor) {
    return String(valor == null ? "" : valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  window.CertiPeriodosModal = {
    abrirModal,
    cerrarModal,
    leerPeriodos,
    guardarPeriodos,
    recargarSelectorPrincipal
  };
})();
