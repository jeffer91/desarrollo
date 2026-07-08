/*
=========================================================
Nombre completo: certi.template.smart.js
Ruta o ubicación: /incorporaciones/certificados/certi.template.smart.js
Función o funciones:
- Analizar visualmente la imagen de una plantilla usando canvas.
- Detectar zonas ocupadas por logos, bordes, franjas, líneas y adornos.
- Buscar zonas libres reales antes de escribir texto o firmas.
- Ajustar automáticamente tamaño de letra, interlineado y separación entre bloques.
- Mantener zonas de respaldo cuando la plantilla no pueda analizarse.
- Permitir que una plantilla nueva pueda definir zonas manuales desde CertiConfig.zonasTexto si hace falta.
Con qué se une:
- certi.template.js
- certi.capacitacion.template.js
- certi.config.js
- certi.utils.js
=========================================================
*/

(function () {
  "use strict";

  const CACHE = new Map();

  const ZONAS_RESPALDO = {
    reconocimiento: {
      contenido: { x: 28, y: 54, w: 241, h: 105 },
      firma: { x: 86, y: 169, w: 125, h: 28 }
    },
    capacitacion: {
      contenido: { x: 30, y: 54, w: 237, h: 96 },
      firmas: { x: 22, y: 162, w: 253, h: 34 },
      firmaBoxes: [
        { x: 36, y: 162, w: 62, h: 24, centroX: 67 },
        { x: 118, y: 162, w: 62, h: 24, centroX: 149 },
        { x: 199, y: 162, w: 62, h: 24, centroX: 230 }
      ]
    }
  };

  async function analizarPlantilla(tipo, plantillaDataUrl, ancho, alto) {
    const tipoSeguro = tipo || "reconocimiento";
    const w = numero(ancho, 297);
    const h = numero(alto, 210);
    const zonasManual = obtenerZonasManual(tipoSeguro, w, h);

    if (zonasManual) {
      return clonar({ tipo: tipoSeguro, origen: "manual", zonas: zonasManual });
    }

    if (!plantillaDataUrl) {
      return crearLayoutRespaldo(tipoSeguro, w, h, "sin_plantilla");
    }

    const clave = crearClaveCache(tipoSeguro, plantillaDataUrl, w, h);
    if (CACHE.has(clave)) {
      return clonar(CACHE.get(clave));
    }

    try {
      const analisis = await crearMapaDesdeImagen(plantillaDataUrl, w, h);
      const layout = calcularLayoutDesdeMapa(tipoSeguro, analisis.mapa, w, h);
      CACHE.set(clave, layout);
      return clonar(layout);
    } catch (error) {
      console.warn("[CertiTemplateSmart] No se pudo analizar visualmente la plantilla:", error);
      return crearLayoutRespaldo(tipoSeguro, w, h, "error_analisis");
    }
  }

  function obtenerZona(tipo, nombre, ancho, alto) {
    const layout = crearLayoutRespaldo(tipo || "reconocimiento", numero(ancho, 297), numero(alto, 210), "respaldo_directo");
    return layout.zonas[nombre] || layout.zonas.contenido;
  }

  function obtenerZonasManual(tipo, ancho, alto) {
    const config = window.CertiConfig || {};
    const zonasConfig = config.zonasTexto || {};
    const zonasTipo = zonasConfig[tipo];

    if (!zonasTipo || typeof zonasTipo !== "object") {
      return null;
    }

    const salida = {};
    Object.keys(zonasTipo).forEach(function (nombre) {
      salida[nombre] = normalizarZona(zonasTipo[nombre], ancho, alto);
    });

    return salida;
  }

  function crearMapaDesdeImagen(src, ancho, alto) {
    return new Promise(function (resolve, reject) {
      const imagen = new Image();

      imagen.onload = function () {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(ancho);
          canvas.height = Math.round(alto);

          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height);

          const datos = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          const mapa = construirMapaOcupacion(datos, canvas.width, canvas.height);

          resolve({ mapa, canvas });
        } catch (error) {
          reject(error);
        }
      };

      imagen.onerror = function () {
        reject(new Error("No se pudo cargar la plantilla para analizarla."));
      };

      imagen.src = src;
    });
  }

  function construirMapaOcupacion(datos, ancho, alto) {
    const total = ancho * alto;
    const crudo = new Uint8Array(total);
    const mapa = new Uint8Array(total);

    for (let y = 0; y < alto; y += 1) {
      for (let x = 0; x < ancho; x += 1) {
        const i = (y * ancho + x) * 4;
        const r = datos[i];
        const g = datos[i + 1];
        const b = datos[i + 2];
        const a = datos[i + 3];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const brillo = (r + g + b) / 3;
        const saturacion = max - min;

        const bordeDocumento = x < 8 || y < 8 || x > ancho - 9 || y > alto - 9;
        const colorDecorativo = a > 12 && (
          brillo < 214 ||
          (brillo < 238 && saturacion > 10) ||
          saturacion > 38
        );

        if (bordeDocumento || colorDecorativo) {
          crudo[y * ancho + x] = 1;
        }
      }
    }

    dilatarMapa(crudo, mapa, ancho, alto, 4);
    return { ancho, alto, datos: mapa };
  }

  function dilatarMapa(origen, destino, ancho, alto, radio) {
    for (let y = 0; y < alto; y += 1) {
      for (let x = 0; x < ancho; x += 1) {
        let ocupado = 0;

        for (let dy = -radio; dy <= radio && !ocupado; dy += 1) {
          const yy = y + dy;
          if (yy < 0 || yy >= alto) continue;

          for (let dx = -radio; dx <= radio; dx += 1) {
            const xx = x + dx;
            if (xx < 0 || xx >= ancho) continue;

            if (origen[yy * ancho + xx]) {
              ocupado = 1;
              break;
            }
          }
        }

        destino[y * ancho + x] = ocupado;
      }
    }
  }

  function calcularLayoutDesdeMapa(tipo, mapa, ancho, alto) {
    if (tipo === "capacitacion") {
      return calcularLayoutCapacitacion(mapa, ancho, alto);
    }

    return calcularLayoutReconocimiento(mapa, ancho, alto);
  }

  function calcularLayoutCapacitacion(mapa, ancho, alto) {
    const firmaBoxes = buscarFirmaBoxes(mapa, ancho, alto);
    const firmaY = firmaBoxes.length ? firmaBoxes[0].y : 162;
    const contenido = buscarZonaContenido(mapa, ancho, alto, {
      yMin: 42,
      yMax: Math.max(118, firmaY - 18),
      xMin: 18,
      xMax: ancho - 18,
      hMin: 72,
      hMax: 104
    });

    const firmas = crearZonaDesdeBoxes(firmaBoxes, ancho, alto);

    return {
      tipo: "capacitacion",
      origen: "analisis_visual",
      zonas: {
        contenido,
        firmas,
        firmaBoxes
      }
    };
  }

  function calcularLayoutReconocimiento(mapa, ancho, alto) {
    const firma = buscarZonaFirmaUnica(mapa, ancho, alto);
    const contenido = buscarZonaContenido(mapa, ancho, alto, {
      yMin: 44,
      yMax: Math.max(120, firma.y - 16),
      xMin: 20,
      xMax: ancho - 20,
      hMin: 78,
      hMax: 112
    });

    return {
      tipo: "reconocimiento",
      origen: "analisis_visual",
      zonas: {
        contenido,
        firma
      }
    };
  }

  function buscarZonaContenido(mapa, ancho, alto, opciones) {
    const cfg = opciones || {};
    const yMin = Math.round(numero(cfg.yMin, 40));
    const yMax = Math.round(numero(cfg.yMax, alto * 0.74));
    const xMin = Math.round(numero(cfg.xMin, ancho * 0.08));
    const xMax = Math.round(numero(cfg.xMax, ancho * 0.92));
    const hMin = Math.round(numero(cfg.hMin, 70));
    const hMax = Math.round(numero(cfg.hMax, 108));

    let yInicio = yMin;
    for (let y = yMin; y <= Math.min(yMax - hMin, yMin + 45); y += 1) {
      const ratio = ratioOcupacion(mapa, { x: xMin, y, w: xMax - xMin, h: 8 });
      if (ratio < 0.035) {
        yInicio = y + 4;
        break;
      }
    }

    let yFin = yMax;
    for (let y = yMax; y >= yInicio + hMin; y -= 1) {
      const ratio = ratioOcupacion(mapa, { x: xMin, y: y - 8, w: xMax - xMin, h: 8 });
      if (ratio < 0.055) {
        yFin = y;
        break;
      }
    }

    const altoZona = limitar(yFin - yInicio, hMin, hMax);
    const segmentoX = buscarSegmentoHorizontalLibre(mapa, xMin, xMax, yInicio, altoZona);
    const zona = normalizarZona({
      x: segmentoX.x + 4,
      y: yInicio,
      w: segmentoX.w - 8,
      h: altoZona
    }, ancho, alto);

    if (zona.w < 180) {
      return normalizarZona({ x: 30, y: yInicio, w: ancho - 60, h: altoZona }, ancho, alto);
    }

    return zona;
  }

  function buscarSegmentoHorizontalLibre(mapa, xMin, xMax, y, h) {
    let mejor = { x: xMin, w: xMax - xMin };
    let actual = null;

    for (let x = xMin; x <= xMax; x += 1) {
      const ratio = ratioOcupacion(mapa, { x, y, w: 1, h });
      const libre = ratio < 0.08;

      if (libre && !actual) {
        actual = { x, w: 1 };
      } else if (libre && actual) {
        actual.w += 1;
      } else if (!libre && actual) {
        if (actual.w > mejor.w) mejor = actual;
        actual = null;
      }
    }

    if (actual && actual.w > mejor.w) mejor = actual;
    return mejor;
  }

  function buscarFirmaBoxes(mapa, ancho, alto) {
    const objetivos = [0.18, 0.5, 0.82];
    const boxW = 62;
    const boxH = 24;
    const yMin = Math.round(alto * 0.61);
    const yMax = Math.round(alto * 0.87);

    for (let y = yMax; y >= yMin; y -= 1) {
      const boxes = objetivos.map(function (factor) {
        return buscarCajaFirmaCerca(mapa, ancho, alto, ancho * factor, y, boxW, boxH);
      });

      if (boxes.every(Boolean)) {
        return boxes;
      }
    }

    return clonar(ZONAS_RESPALDO.capacitacion.firmaBoxes);
  }

  function buscarCajaFirmaCerca(mapa, ancho, alto, centroDeseado, yLinea, boxW, boxH) {
    const limiteMovimiento = 30;
    const pasos = [0];

    for (let d = 2; d <= limiteMovimiento; d += 2) {
      pasos.push(-d, d);
    }

    for (let i = 0; i < pasos.length; i += 1) {
      const centro = centroDeseado + pasos[i];
      const x = centro - boxW / 2;
      const y = yLinea - 4;
      const rect = { x, y, w: boxW, h: boxH };

      if (x < 14 || x + boxW > ancho - 14) continue;
      if (y < 0 || y + boxH > alto - 10) continue;

      const ratio = ratioOcupacion(mapa, rect);
      const baseLibre = ratioOcupacion(mapa, { x, y: yLinea + 12, w: boxW, h: 8 });
      if (ratio < 0.028 && baseLibre < 0.02) {
        return normalizarZona({ x, y: yLinea, w: boxW, h: boxH }, ancho, alto);
      }
    }

    return null;
  }

  function buscarZonaFirmaUnica(mapa, ancho, alto) {
    const boxW = 124;
    const boxH = 28;
    const centro = ancho / 2;
    const yMin = Math.round(alto * 0.62);
    const yMax = Math.round(alto * 0.86);

    for (let y = yMax; y >= yMin; y -= 1) {
      const rect = { x: centro - boxW / 2, y: y - 4, w: boxW, h: boxH };
      if (ratioOcupacion(mapa, rect) < 0.03) {
        return normalizarZona({ x: centro - boxW / 2, y, w: boxW, h: boxH }, ancho, alto);
      }
    }

    return normalizarZona(ZONAS_RESPALDO.reconocimiento.firma, ancho, alto);
  }

  function crearZonaDesdeBoxes(boxes, ancho, alto) {
    if (!Array.isArray(boxes) || !boxes.length) {
      return normalizarZona(ZONAS_RESPALDO.capacitacion.firmas, ancho, alto);
    }

    const x1 = Math.min.apply(null, boxes.map(function (b) { return b.x; }));
    const x2 = Math.max.apply(null, boxes.map(function (b) { return b.x + b.w; }));
    const y1 = Math.min.apply(null, boxes.map(function (b) { return b.y; }));
    const y2 = Math.max.apply(null, boxes.map(function (b) { return b.y + b.h; }));

    const zona = normalizarZona({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 }, ancho, alto);
    zona.boxes = boxes;
    return zona;
  }

  function ratioOcupacion(mapa, rectEntrada) {
    const rect = normalizarRectMapa(rectEntrada, mapa.ancho, mapa.alto);
    let total = 0;
    let ocupados = 0;

    for (let y = rect.y; y < rect.y + rect.h; y += 1) {
      for (let x = rect.x; x < rect.x + rect.w; x += 1) {
        total += 1;
        if (mapa.datos[y * mapa.ancho + x]) ocupados += 1;
      }
    }

    return total ? ocupados / total : 1;
  }

  function prepararBloques(doc, bloquesEntrada, anchoMaximo, altoMaximo) {
    let bloques = clonarBloques(bloquesEntrada);
    let layout = medirBloques(doc, bloques, anchoMaximo);

    for (let intento = 0; intento < 28 && layout.altoTotal > altoMaximo; intento += 1) {
      const exceso = layout.altoTotal / altoMaximo;
      const factorTamano = exceso > 1.18 ? 0.92 : 0.96;
      const factorLinea = exceso > 1.18 ? 0.94 : 0.97;

      bloques = bloques.map(function (bloque) {
        const minSize = numero(bloque.minSize, 7.4);
        const minLineHeight = numero(bloque.minLineHeight, 3.4);
        const minGap = numero(bloque.minGapAfter, 1.4);

        return Object.assign({}, bloque, {
          size: Math.max(minSize, numero(bloque.size, 10) * factorTamano),
          lineHeight: Math.max(minLineHeight, numero(bloque.lineHeight, 4.8) * factorLinea),
          gapAfter: Math.max(minGap, numero(bloque.gapAfter, 3) * 0.9)
        });
      });

      layout = medirBloques(doc, bloques, anchoMaximo);
    }

    return layout;
  }

  function medirBloques(doc, bloques, anchoMaximo) {
    let altoTotal = 0;

    const medidos = (bloques || []).map(function (bloque) {
      const seguro = Object.assign({}, bloque);
      aplicarFormato(doc, seguro);

      const lineas = dividirLineas(doc, seguro.texto, anchoMaximo);
      const lineHeight = numero(seguro.lineHeight, 4.8);
      const gapAfter = numero(seguro.gapAfter, 0);
      const altoBloque = Math.max(lineHeight, lineas.length * lineHeight);

      altoTotal += altoBloque + gapAfter;

      return Object.assign({}, seguro, {
        lineas,
        altoBloque,
        altoConSeparacion: altoBloque + gapAfter
      });
    });

    return {
      bloques: medidos,
      altoTotal
    };
  }

  function dibujarBloques(doc, bloques, zona, opciones) {
    const config = opciones || {};
    const alineacion = config.align || "center";
    let y = zona.y;

    (bloques || []).forEach(function (bloque) {
      const lineas = bloque.lineas || [];
      const lineHeight = numero(bloque.lineHeight, 4.8);
      const gapAfter = numero(bloque.gapAfter, 0);
      const xTexto = alineacion === "left" ? zona.x : zona.centroX;

      aplicarFormato(doc, bloque);

      lineas.forEach(function (linea, index) {
        doc.text(String(linea || ""), xTexto, y + index * lineHeight, {
          align: alineacion
        });
      });

      dibujarLineaPosterior(doc, bloque, zona, y, lineas, lineHeight);
      y += Math.max(lineHeight, lineas.length * lineHeight) + gapAfter;
    });

    return y;
  }

  function escribirCaja(doc, texto, zona, opciones) {
    const config = opciones || {};
    const layout = prepararBloques(doc, [
      {
        texto,
        font: config.font || "times",
        style: config.style || "normal",
        size: config.size || 11,
        minSize: config.minSize || 8,
        lineHeight: config.lineHeight || 4.8,
        minLineHeight: config.minLineHeight || 3.4,
        color: config.color || [20, 20, 20],
        gapAfter: 0
      }
    ], zona.w, zona.h);

    return dibujarBloques(doc, layout.bloques, zona, {
      align: config.align || "center"
    });
  }

  function dibujarLineaPosterior(doc, bloque, zona, y, lineas, lineHeight) {
    const linea = bloque.lineAfter;
    if (!linea) return;

    const ancho = numero(linea.w || linea.width, zona.w * 0.68);
    const offset = numero(linea.offset, 3.8);
    const yLinea = y + Math.max(0, lineas.length - 1) * lineHeight + offset;
    const color = Array.isArray(linea.color) ? linea.color : [7, 29, 76];
    const width = numero(linea.lineWidth, 0.4);

    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(width);
    doc.line(zona.centroX - ancho / 2, yLinea, zona.centroX + ancho / 2, yLinea);

    if (linea.secondary) {
      const segunda = linea.secondary;
      const ancho2 = numero(segunda.w || segunda.width, ancho * 0.65);
      const offset2 = numero(segunda.offset, offset + 1.3);
      const color2 = Array.isArray(segunda.color) ? segunda.color : [196, 155, 57];
      const width2 = numero(segunda.lineWidth, 0.18);

      doc.setDrawColor(color2[0], color2[1], color2[2]);
      doc.setLineWidth(width2);
      doc.line(
        zona.centroX - ancho2 / 2,
        y + Math.max(0, lineas.length - 1) * lineHeight + offset2,
        zona.centroX + ancho2 / 2,
        y + Math.max(0, lineas.length - 1) * lineHeight + offset2
      );
    }
  }

  function aplicarFormato(doc, bloque) {
    const color = Array.isArray(bloque.color) ? bloque.color : [20, 20, 20];
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont(bloque.font || "times", bloque.style || "normal");
    doc.setFontSize(numero(bloque.size, 10));
  }

  function dividirLineas(doc, texto, anchoMaximo) {
    const salida = [];

    String(texto || "")
      .split("\n")
      .forEach(function (bloque) {
        const partes = doc.splitTextToSize(bloque, anchoMaximo);
        partes.forEach(function (parte) {
          salida.push(parte);
        });
      });

    return salida.length ? salida : [""];
  }

  function crearLayoutRespaldo(tipo, ancho, alto, origen) {
    const base = clonar(ZONAS_RESPALDO[tipo] || ZONAS_RESPALDO.reconocimiento);
    const zonas = {};

    Object.keys(base).forEach(function (nombre) {
      if (Array.isArray(base[nombre])) {
        zonas[nombre] = base[nombre].map(function (zona) {
          return normalizarZona(zona, ancho, alto);
        });
      } else {
        zonas[nombre] = normalizarZona(base[nombre], ancho, alto);
      }
    });

    return { tipo, origen: origen || "respaldo", zonas };
  }

  function normalizarZona(zona, ancho, alto) {
    const z = zona || {};
    const salida = {
      x: numero(z.x, ancho * 0.1),
      y: numero(z.y, alto * 0.25),
      w: numero(z.w, ancho * 0.8),
      h: numero(z.h, alto * 0.48)
    };

    salida.x = limitar(salida.x, 0, ancho);
    salida.y = limitar(salida.y, 0, alto);
    salida.w = limitar(salida.w, 10, ancho - salida.x);
    salida.h = limitar(salida.h, 10, alto - salida.y);
    salida.centroX = salida.x + salida.w / 2;
    salida.finY = salida.y + salida.h;

    return salida;
  }

  function normalizarRectMapa(rect, ancho, alto) {
    const x = limitar(Math.round(numero(rect.x, 0)), 0, ancho - 1);
    const y = limitar(Math.round(numero(rect.y, 0)), 0, alto - 1);
    const w = limitar(Math.round(numero(rect.w, 1)), 1, ancho - x);
    const h = limitar(Math.round(numero(rect.h, 1)), 1, alto - y);
    return { x, y, w, h };
  }

  function crearClaveCache(tipo, dataUrl, ancho, alto) {
    return [tipo, ancho, alto, dataUrl.length, dataUrl.slice(0, 80), dataUrl.slice(-80)].join("|");
  }

  function clonarBloques(bloques) {
    return (bloques || []).map(function (bloque) {
      return Object.assign({}, bloque);
    });
  }

  function clonar(valor) {
    return JSON.parse(JSON.stringify(valor));
  }

  function numero(valor, defecto) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : defecto;
  }

  function limitar(valor, min, max) {
    return Math.max(min, Math.min(max, valor));
  }

  window.CertiTemplateSmart = {
    analizarPlantilla,
    obtenerZona,
    prepararBloques,
    medirBloques,
    dibujarBloques,
    escribirCaja
  };
})();