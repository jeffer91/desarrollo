/*
=========================================================
Nombre completo: certi.validate.js
Ruta o ubicación: /incorporaciones/sedes/certi/certi.validate.js
Función o funciones:
- Validar condiciones generales antes de procesar y generar certificados.
- Separar reglas de validación para mantener certi.app.js más limpio.
- Retornar errores claros para el usuario.
Con qué se une:
- certi.app.js
- certi.logic.js
- certi.render.js
=========================================================
*/

(function () {
  "use strict";

  const U = window.CertiUtils;

  function validarFormularioInicial(estado) {
    const errores = [];

    if (U.esVacio(estado.periodoSeleccionado)) {
      errores.push("Debe seleccionar un período.");
    }

    if (U.esVacio(estado.fechaCertificado)) {
      errores.push("Debe seleccionar la fecha del certificado.");
    }

    if (!estado.archivoExcel) {
      errores.push("Debe cargar el Excel de mejores egresados.");
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  function validarResultadoParaDescarga(estado) {
    const errores = [];

    if (!estado.resultado) {
      errores.push("Primero debe procesar el Excel.");
      return {
        valido: false,
        errores
      };
    }

    if (estado.resultado.carrerasNoReconocidas.length > 0) {
      errores.push("Debe emparejar todas las carreras no reconocidas.");
    }

    const empatesPendientes = estado.resultado.empates.filter(function (empate) {
      return !empate.resuelto;
    });

    if (empatesPendientes.length > 0) {
      errores.push("Debe resolver todos los empates antes de descargar.");
    }

    if (!estado.resultado.mejores.some(function (item) {
      return item.estadoCertificado === "listo";
    })) {
      errores.push("No hay certificados listos para descargar.");
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  function validarArchivoExcel(archivo) {
    const errores = [];

    if (!archivo) {
      errores.push("Debe seleccionar un archivo Excel.");
    }

    if (archivo && !/\.(xlsx|xls)$/i.test(archivo.name)) {
      errores.push("El archivo debe tener extensión .xlsx o .xls.");
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  window.CertiValidate = {
    validarFormularioInicial,
    validarResultadoParaDescarga,
    validarArchivoExcel
  };
})();