/*
=========================================================
Nombre completo: certi.utils.js
Ruta o ubicación: /incorporaciones/sedes/certi/certi.utils.js
Función o funciones:
- Proveer funciones auxiliares para normalizar texto, fechas, nombres y promedios.
- Convertir promedios del Excel al formato institucional de tres decimales.
- Normalizar nombres propios con primera letra en mayúscula y resto en minúscula.
- Crear nombres de archivo seguros para PDF.
Con qué se une:
- certi.excel.js
- certi.logic.js
- certi.catalogo.js
- certi.render.js
- certi.pdf.js
- certi.storage.js
=========================================================
*/

(function () {
  "use strict";

  const meses = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre"
  ];

  const CONECTORES_MINUSCULA = new Set([
    "de",
    "del",
    "la",
    "las",
    "los",
    "y",
    "e",
    "da",
    "das",
    "do",
    "dos"
  ]);

  const TITULOS_CORTOS = {
    dr: "Dr.",
    dra: "Dra.",
    mgs: "Mgs.",
    mgtr: "Mgtr.",
    ing: "Ing.",
    lic: "Lic.",
    abg: "Abg.",
    eco: "Eco.",
    phd: "PhD"
  };

  function esVacio(valor) {
    return valor === null || valor === undefined || String(valor).trim() === "";
  }

  function limpiarEspacios(valor) {
    return String(valor || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizarTexto(valor) {
    return limpiarEspacios(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,;:()[\]{}]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function claveTexto(valor) {
    return normalizarTexto(valor)
      .replace(/[^A-Z0-9Ñ ]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function limpiarNombrePropio(valor) {
    const texto = limpiarEspacios(valor);
    if (!texto) return "";

    return texto
      .toLocaleLowerCase("es-EC")
      .split(" ")
      .map(function (palabra, index) {
        return normalizarPalabraNombre(palabra, index);
      })
      .join(" ")
      .replace(/\s+([.,])/g, "$1")
      .trim();
  }

  function normalizarPalabraNombre(palabra, index) {
    const limpia = String(palabra || "").trim();
    if (!limpia) return "";

    const sinPunto = limpia.replace(/\.+$/g, "");
    const titulo = TITULOS_CORTOS[sinPunto];
    if (titulo) return titulo;

    if (index > 0 && CONECTORES_MINUSCULA.has(sinPunto)) {
      return sinPunto;
    }

    return sinPunto
      .split("-")
      .map(function (parte) {
        return parte ? parte.charAt(0).toLocaleUpperCase("es-EC") + parte.slice(1) : parte;
      })
      .join("-");
  }

  function convertirPromedio(valor) {
    if (esVacio(valor)) return null;

    let texto = String(valor).trim();

    if (texto.includes(",") && !texto.includes(".")) {
      texto = texto.replace(",", ".");
    }

    texto = texto.replace(/[^0-9.-]/g, "");

    let numero = Number(texto);

    if (!Number.isFinite(numero)) return null;

    if (numero >= 1000000) {
      numero = numero / 1000000;
    } else if (numero > 100 && numero < 1000000) {
      numero = numero / 1000;
    }

    if (numero < 0 || numero > 10) return null;

    return Number(numero.toFixed(3));
  }

  function formatearPromedio(valor) {
    const numero = convertirPromedio(valor);

    if (numero === null) return "";

    return numero.toFixed(3);
  }

  function fechaActualInput() {
    const fecha = new Date();
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    const dd = String(fecha.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  }

  function formatearFechaLarga(fechaInput) {
    if (esVacio(fechaInput)) return "";

    const partes = String(fechaInput).split("-");

    if (partes.length !== 3) return fechaInput;

    const anio = Number(partes[0]);
    const mes = Number(partes[1]) - 1;
    const dia = Number(partes[2]);

    if (!anio || mes < 0 || mes > 11 || !dia) return fechaInput;

    return `${dia} de ${meses[mes]} de ${anio}`;
  }

  function formatearFechaArchivo(fechaInput) {
    if (esVacio(fechaInput)) return "";

    const partes = String(fechaInput).split("-");

    if (partes.length !== 3) return fechaInput;

    return `${partes[2]}-${partes[1]}-${partes[0]}`;
  }

  function escaparHtml(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function crearNombreArchivo(texto) {
    return normalizarTexto(texto)
      .replace(/Ñ/g, "N")
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase();
  }

  function ordenarPorCampo(lista, campo) {
    return [...(lista || [])].sort(function (a, b) {
      return String(a[campo] || "").localeCompare(String(b[campo] || ""), "es");
    });
  }

  function agruparPor(lista, obtenerClave) {
    return (lista || []).reduce(function (acc, item) {
      const clave = obtenerClave(item);

      if (!acc[clave]) acc[clave] = [];

      acc[clave].push(item);

      return acc;
    }, {});
  }

  function descargarBlob(blob, nombreArchivo) {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    URL.revokeObjectURL(url);
  }

  function safeJsonParse(valor, fallback) {
    try {
      return JSON.parse(valor);
    } catch (error) {
      return fallback;
    }
  }

  window.CertiUtils = {
    esVacio,
    limpiarEspacios,
    normalizarTexto,
    claveTexto,
    limpiarNombrePropio,
    convertirPromedio,
    formatearPromedio,
    fechaActualInput,
    formatearFechaLarga,
    formatearFechaArchivo,
    escaparHtml,
    crearNombreArchivo,
    ordenarPorCampo,
    agruparPor,
    descargarBlob,
    safeJsonParse
  };
})();