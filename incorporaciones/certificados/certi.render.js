/*
=========================================================
Nombre completo: certi.render.js
Ruta o ubicación: /incorporaciones/sedes/certi/certi.render.js
Función o funciones:
- Renderizar resumen, alertas, tabla de mejores egresados, empates y carreras no reconocidas.
- Activar o desactivar botones según el estado del proceso.
- Mostrar un popup para emparejar carreras no reconocidas con el catálogo oficial.
- No mostrar vista previa del certificado, solo resumen operativo.
Con qué se une:
- certi.html
- certi.index.html
- certi.state.js
- certi.dom.js
- certi.logic.js
- certi.catalogo.js
- certi.utils.js
=========================================================
*/
(function () {
 "use strict";

 const U = window.CertiUtils;
 const Dom = window.CertiDom;
 const Catalogo = window.CertiCatalogo;

 function renderizar(estado) {
  const dom = Dom.obtener();

  renderizarResumen(dom, estado);
  renderizarAlertas(dom, estado);
  renderizarCarrerasNoReconocidas(dom, estado);
  renderizarEmpates(dom, estado);
  renderizarTabla(dom, estado);
  renderizarBotones(dom, estado);
 }

 function renderizarPeriodos(periodos, valorSeleccionado) {
  const dom = Dom.obtener();

  if (!dom.periodo) return;

  const opciones = [
   '<option value="">Seleccione un período</option>'
  ];

  (periodos || []).forEach(function (periodo) {
   const valor = periodo.id || periodo.value || periodo.nombre || periodo.texto || "";
   const texto = periodo.texto || periodo.nombre || periodo.label || valor;
   const selected = valor === valorSeleccionado ? "selected" : "";

   opciones.push(
    `<option value="${U.escaparHtml(valor)}" ${selected}>${U.escaparHtml(texto)}</option>`
   );
  });

  dom.periodo.innerHTML = opciones.join("");
 }

 function renderizarResumen(dom, estado) {
  if (!dom.resumenCards) return;

  const resumen = estado.resultado && estado.resultado.resumen
   ? estado.resultado.resumen
   : {
    registrosLeidos: 0,
    carrerasDetectadas: 0,
    certificadosListos: 0,
    alertas: 0
   };

  dom.resumenCards.innerHTML = `
   <article class="certi-summary-card">
    <span>Registros leídos</span>
    <strong>${resumen.registrosLeidos || 0}</strong>
   </article>

   <article class="certi-summary-card">
    <span>Carreras detectadas</span>
    <strong>${resumen.carrerasDetectadas || 0}</strong>
   </article>

   <article class="certi-summary-card">
    <span>Certificados listos</span>
    <strong>${resumen.certificadosListos || 0}</strong>
   </article>

   <article class="certi-summary-card">
    <span>Alertas</span>
    <strong>${resumen.alertas || 0}</strong>
   </article>
  `;
 }

 function renderizarAlertas(dom, estado) {
  if (!dom.alertas) return;

  const alertasBase = [];

  if (estado.nombreArchivoExcel) {
   alertasBase.push({
    tipo: "info",
    titulo: "Excel cargado",
    mensaje: estado.nombreArchivoExcel
   });
  }

  if (estado.periodoTexto) {
   alertasBase.push({
    tipo: "info",
    titulo: "Período seleccionado",
    mensaje: estado.periodoTexto
   });
  }

  if (estado.fechaCertificado) {
   alertasBase.push({
    tipo: "info",
    titulo: "Fecha del certificado",
    mensaje: U.formatearFechaLarga(estado.fechaCertificado)
   });
  }

  const alertasResultado = estado.resultado && Array.isArray(estado.resultado.alertas)
   ? estado.resultado.alertas
   : [];

  const errores = Array.isArray(estado.errores) ? estado.errores : [];

  const alertas = [
   ...alertasBase,
   ...alertasResultado,
   ...errores
  ];

  if (!alertas.length) {
   dom.alertas.innerHTML = `
    <div class="certi-alert certi-alert-info">
     <strong>Esperando información</strong>
     Seleccione el período, fecha y cargue el Excel para iniciar.
    </div>
   `;
   return;
  }

  dom.alertas.innerHTML = alertas.map(function (alerta) {
   const tipo = alerta.tipo || "info";

   return `
    <div class="certi-alert certi-alert-${U.escaparHtml(tipo)}">
     <strong>${U.escaparHtml(alerta.titulo || "Aviso")}</strong>
     ${U.escaparHtml(alerta.mensaje || "")}
    </div>
   `;
  }).join("");
 }

 function renderizarCarrerasNoReconocidas(dom, estado) {
  if (!dom.carrerasPanel || !dom.carrerasList) return;

  const resultado = estado.resultado;

  const carrerasNoReconocidas = resultado && Array.isArray(resultado.carrerasNoReconocidas)
   ? resultado.carrerasNoReconocidas
   : [];

  if (!carrerasNoReconocidas.length) {
   Dom.ocultar(dom.carrerasPanel);
   dom.carrerasList.innerHTML = "";
   return;
  }

  Dom.mostrar(dom.carrerasPanel);

  const cantidad = carrerasNoReconocidas.length;

  dom.carrerasList.innerHTML = `
   <div class="certi-modal-carreras" style="
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: rgba(15, 23, 42, 0.58);
   ">
    <div style="
     width: min(820px, 100%);
     max-height: calc(100vh - 36px);
     overflow: auto;
     background: #ffffff;
     border: 1px solid #d9e2ef;
     border-radius: 20px;
     box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
    ">
     <div style="
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: flex-start;
      padding: 20px 22px;
      border-bottom: 1px solid #d9e2ef;
      background: #f8fbff;
     ">
      <div>
       <p style="
        margin: 0 0 4px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 11px;
        font-weight: 700;
        color: #b42318;
       ">
        Atención requerida
       </p>

       <h2 style="
        margin: 0;
        color: #0d47a1;
        font-size: 23px;
        line-height: 1.2;
       ">
        ${cantidad === 1 ? "Carrera no reconocida" : "Carreras no reconocidas"}
       </h2>

       <p style="
        margin: 7px 0 0;
        color: #667085;
        font-size: 14px;
        line-height: 1.45;
       ">
        Esta carrera viene en el Excel, pero no existe igual en el catálogo.
        Seleccione con qué carrera oficial se debe emparejar.
       </p>
      </div>

      <button class="certi-modal-cerrar-carreras" type="button" style="
       width: 36px;
       height: 36px;
       flex: 0 0 auto;
       border: 0;
       border-radius: 999px;
       cursor: pointer;
       background: #eaf2ff;
       color: #0d47a1;
       font-size: 24px;
       font-weight: 700;
       line-height: 36px;
      " aria-label="Cerrar">
       ×
      </button>
     </div>

     <div style="padding: 20px 22px;">
      ${carrerasNoReconocidas.map(function (item, index) {
       return renderizarItemCarreraNoReconocida(item, index, estado);
      }).join("")}

      <div style="
       margin-top: 18px;
       padding: 14px;
       border-radius: 14px;
       background: #eaf2ff;
       color: #08306f;
       font-size: 14px;
       line-height: 1.45;
      ">
       Después de seleccionar la carrera oficial, la pantalla se actualizará automáticamente.
      </div>
     </div>
    </div>
   </div>

   <div class="certi-alert certi-alert-warning">
    <strong>Carreras no reconocidas</strong>
    ${cantidad} carrera(s) deben emparejarse con el catálogo oficial.

    <div style="margin-top: 12px;">
     <button class="certi-btn certi-btn-primary certi-modal-abrir-carreras" type="button">
      Abrir emparejamiento
     </button>
    </div>
   </div>
  `;

  activarEventosModalCarreras(dom);
 }

 function renderizarItemCarreraNoReconocida(item, index, estado) {
  const carreraOriginal = item.carreraOriginal || "";
  const actual = estado.emparejamientosCarrera[carreraOriginal] || "";

  return `
   <article class="certi-map-item" style="
    margin-bottom: 14px;
    border-color: #ffd5d2;
    background: #fffafa;
   ">
    <p style="
     margin: 0 0 8px;
     color: #667085;
     font-size: 14px;
     line-height: 1.4;
    ">
     Carrera ${index + 1} encontrada en el Excel:
    </p>

    <h3 style="
     margin: 0 0 14px;
     color: #b42318;
     font-size: 17px;
     line-height: 1.35;
    ">
     ${U.escaparHtml(carreraOriginal)}
    </h3>

    <label class="certi-field">
     <span>Emparejar con esta carrera oficial</span>

     <select
      class="certi-select-carrera"
      data-carrera-original="${U.escaparHtml(carreraOriginal)}"
     >
      <option value="">Seleccione una carrera oficial</option>
      ${crearOpcionesCarreras(actual)}
     </select>
    </label>
   </article>
  `;
 }

 function crearOpcionesCarreras(actual) {
  if (!Catalogo || typeof Catalogo.listar !== "function") return "";

  return Catalogo.listar().map(function (carrera) {
   const nombre = carrera.nombre || "";
   const selected = nombre === actual ? "selected" : "";

   return `
    <option value="${U.escaparHtml(nombre)}" ${selected}>
     ${U.escaparHtml(nombre)}
    </option>
   `;
  }).join("");
 }

 function activarEventosModalCarreras(dom) {
  if (!dom.carrerasList) return;

  const modal = dom.carrerasList.querySelector(".certi-modal-carreras");
  const botonesCerrar = dom.carrerasList.querySelectorAll(".certi-modal-cerrar-carreras");
  const botonesAbrir = dom.carrerasList.querySelectorAll(".certi-modal-abrir-carreras");

  if (!modal) return;

  function abrirModal() {
   modal.style.display = "flex";
  }

  function cerrarModal() {
   modal.style.display = "none";
  }

  botonesCerrar.forEach(function (boton) {
   boton.addEventListener("click", cerrarModal);
  });

  botonesAbrir.forEach(function (boton) {
   boton.addEventListener("click", abrirModal);
  });

  modal.addEventListener("click", function (evento) {
   if (evento.target === modal) {
    cerrarModal();
   }
  });
 }

 function renderizarEmpates(dom, estado) {
  if (!dom.empatesPanel || !dom.empatesList) return;

  const resultado = estado.resultado;

  const empates = resultado && Array.isArray(resultado.empates)
   ? resultado.empates
   : [];

  if (!empates.length) {
   Dom.ocultar(dom.empatesPanel);
   dom.empatesList.innerHTML = "";
   return;
  }

  Dom.mostrar(dom.empatesPanel);

  dom.empatesList.innerHTML = empates.map(function (empate) {
   const seleccionado = estado.empatesSeleccionados[empate.carreraOficial];

   return `
    <article class="certi-tie-item">
     <h3>${U.escaparHtml(empate.carreraOficial)}</h3>

     <select
      class="certi-select-empate"
      data-carrera-oficial="${U.escaparHtml(empate.carreraOficial)}"
     >
      <option value="">Seleccione al mejor egresado</option>

      ${(empate.candidatos || []).map(function (candidato) {
       const selected = Number(seleccionado) === Number(candidato.indice)
        ? "selected"
        : "";

       return `
        <option value="${candidato.indice}" ${selected}>
         ${U.escaparHtml(candidato.nombre)} - ${U.formatearPromedio(candidato.promedio)}
        </option>
       `;
      }).join("")}
     </select>
    </article>
   `;
  }).join("");
 }

 function renderizarTabla(dom, estado) {
  if (!dom.tablaBody) return;

  const resultado = estado.resultado;

  const mejores = resultado && Array.isArray(resultado.mejores)
   ? resultado.mejores
   : [];

  if (!mejores.length) {
   dom.tablaBody.innerHTML = `
    <tr>
     <td colspan="4" class="certi-empty">
      Cargue y procese el Excel para ver los resultados.
     </td>
    </tr>
   `;
   return;
  }

  dom.tablaBody.innerHTML = mejores.map(function (item) {
   const estadoClase = item.estadoCertificado === "listo"
    ? "certi-status-ok"
    : "certi-status-warning";

   const estadoTexto = item.estadoCertificado === "listo"
    ? "Listo"
    : "Empate pendiente";

   return `
    <tr>
     <td>${U.escaparHtml(item.carreraOficial || item.carreraOriginal)}</td>
     <td>${U.escaparHtml(item.nombre)}</td>
     <td>${U.formatearPromedio(item.promedio)}</td>
     <td>
      <span class="certi-status ${estadoClase}">
       ${estadoTexto}
      </span>
     </td>
    </tr>
   `;
  }).join("");
 }

 function renderizarBotones(dom, estado) {
  const Logic = window.CertiLogic;

  if (!Logic || typeof Logic.validarGeneracion !== "function") {
   Dom.deshabilitar(dom.btnPdfUnico, true);
   Dom.deshabilitar(dom.btnPdfIndividuales, true);
   return;
  }

  const validacion = Logic.validarGeneracion(estado);
  const bloquear = !validacion.valido || estado.cargando;

  Dom.deshabilitar(dom.btnPdfUnico, bloquear);
  Dom.deshabilitar(dom.btnPdfIndividuales, bloquear);
  Dom.deshabilitar(dom.btnProcesar, estado.cargando);
  Dom.deshabilitar(dom.btnLimpiar, estado.cargando);
 }

 window.CertiRender = {
  renderizar,
  renderizarPeriodos
 };
})();