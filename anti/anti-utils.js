/* Archivo: anti-utils.js
Ubicación: anti/anti-utils.js
Función: Utilidades + assets (detector) + helpers:
         - iniciales en mayúsculas
         - filename estándar de PDF
         - descarga segura de blobs (ZIP/PDF)
         - carga robusta de imágenes del detector desde /anti/img
         - FIX: resuelve rutas desde la carpeta real del módulo (script src), no desde maq-index.html
========================================================= */

(function (window, document) {
  "use strict";

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      try {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result || ""));
        fr.onerror = () => reject(fr.error || new Error("No se pudo leer el archivo"));
        fr.readAsDataURL(file);
      } catch (e) {
        reject(e);
      }
    });
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      try {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result || ""));
        fr.onerror = () => reject(fr.error || new Error("No se pudo leer el blob"));
        fr.readAsDataURL(blob);
      } catch (e) {
        reject(e);
      }
    });
  }

  function downloadBlob(blob, filename) {
    const name = String(filename || "archivo").trim() || "archivo";

    if (typeof window.saveAs === "function") {
      window.saveAs(blob, name);
      return;
    }

    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error("[AntiUtils] No se pudo descargar blob:", e);
      alert("No se pudo descargar el archivo. Revisa permisos del navegador.");
    }
  }

  // ===== FIX: detectar base real del módulo por el src del script anti-utils.js =====
  function stripQueryHash(url) {
    return String(url || "").split("#")[0].split("?")[0];
  }

  function getDirname(url) {
    const u = stripQueryHash(url);
    const i = u.lastIndexOf("/");
    if (i === -1) return "";
    return u.slice(0, i + 1);
  }

  function detectModuleBase() {
    try {
      // 1) currentScript si existe
      if (document.currentScript && document.currentScript.src) {
        const src = String(document.currentScript.src || "");
        if (src.indexOf("anti-utils.js") !== -1) return getDirname(src);
      }

      // 2) buscar en todos los scripts por coincidencia
      const scripts = document.scripts ? Array.from(document.scripts) : [];
      for (let i = scripts.length - 1; i >= 0; i--) {
        const s = scripts[i];
        const src = String(s && s.src ? s.src : "");
        if (!src) continue;
        if (src.indexOf("anti-utils.js") !== -1) return getDirname(src);
      }
    } catch (e) {}

    // 3) fallback: directory del location actual
    return getDirname(window.location.href);
  }

  const MODULE_BASE = detectModuleBase(); // debe terminar en "/"

  function isDataUrl(url) {
    return /^data:/i.test(String(url || "").trim());
  }

  function isAbsUrl(url) {
    const u = String(url || "").trim();
    if (!u) return false;
    if (u.startsWith("data:") || u.startsWith("blob:")) return true;
    // http:, https:, file:, etc
    return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(u);
  }

  function resolveFromModuleBase(url) {
    const raw = String(url || "").trim();
    if (!raw) return "";
    if (isDataUrl(raw)) return raw;
    if (isAbsUrl(raw)) return raw;

    try {
      return new URL(raw, MODULE_BASE).href;
    } catch (e) {
      // fallback simple
      return MODULE_BASE + raw.replace(/^\.?\//, "");
    }
  }

  function guessMimeFromUrl(url) {
    const u = String(url || "").toLowerCase();
    if (u.startsWith("data:image/jpeg") || u.endsWith(".jpg") || u.endsWith(".jpeg")) return "image/jpeg";
    if (u.startsWith("data:image/webp") || u.endsWith(".webp")) return "image/webp";
    return "image/png";
  }

  function canUseFetchForUrl(resolvedUrl) {
    if (typeof window.fetch !== "function") return false;

    const proto = String(window.location.protocol || "").toLowerCase();
    const target = String(resolvedUrl || "").toLowerCase();

    // En file://, fetch suele fallar con rutas locales
    if (proto === "file:") return false;
    if (target.startsWith("file:")) return false;

    return true;
  }

  function loadImageElement(url) {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();

        const proto = String(window.location.protocol || "").toLowerCase();
        const target = String(url || "").trim().toLowerCase();

        // crossOrigin solo en http/https
        if (proto !== "file:" && !target.startsWith("file:") && !target.startsWith("data:")) {
          img.crossOrigin = "anonymous";
        }

        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("No se pudo cargar la imagen"));

        img.src = url;
      } catch (e) {
        reject(e);
      }
    });
  }

  function imageElementToDataURL(img, mimeType) {
    const w = Number(img.naturalWidth || img.width || 0);
    const h = Number(img.naturalHeight || img.height || 0);
    if (!w || !h) throw new Error("La imagen no tiene dimensiones válidas");

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener contexto 2D");

    ctx.drawImage(img, 0, 0, w, h);

    try {
      return canvas.toDataURL(mimeType || "image/png");
    } catch (e) {
      // aquí cae cuando el canvas queda tainted por restricciones del navegador
      throw new Error("No se pudo exportar canvas a DataURL. Abre el maquetador con servidor local.");
    }
  }

  async function tryFetchAsDataURL(resolvedUrl) {
    const resp = await fetch(resolvedUrl, { cache: "no-store" });
    if (!resp.ok) throw new Error("No se pudo cargar imagen por fetch");
    const blob = await resp.blob();
    return await blobToDataURL(blob);
  }

  async function tryImageAsDataURL(resolvedUrl) {
    const img = await loadImageElement(resolvedUrl);
    const mime = guessMimeFromUrl(resolvedUrl);
    return imageElementToDataURL(img, mime);
  }

  const STOPWORDS_INICIALES = new Set([
    "DE", "DEL", "LA", "LAS", "LO", "LOS", "Y", "E",
    "DA", "DAS", "DO", "DOS",
    "VON", "VAN"
  ]);

  function initialsFromNameES(fullName) {
    const raw = String(fullName || "").trim();
    if (!raw) return "XX";

    const clean = AntiUtils.normalizeText(raw).replace(/[^\p{L}\p{N}\s]/gu, " ");
    const parts = clean.split(/\s+/).map(x => x.trim()).filter(Boolean);

    const letters = [];
    for (const p of parts) {
      const up = String(p).toUpperCase();
      if (STOPWORDS_INICIALES.has(up)) continue;
      if (/^\d+$/.test(up)) continue;

      letters.push(up[0]);
      if (letters.length >= 6) break;
    }

    return (letters.join("") || "XX").toUpperCase();
  }

  function sanitizeHumanFilename(str) {
    let s = AntiUtils.normalizeText(String(str || "")).trim();
    s = s.replace(/[\\\/:*?"<>|]/g, " ");
    s = s.replace(/[^\p{L}\p{N}\s._-]/gu, " ");
    s = s.replace(/\s+/g, " ").trim();
    return s;
  }

  const AntiUtils = {
    // expone base para debug
    ASSET_BASE: MODULE_BASE,

    resolveAssetUrl(url) {
      return resolveFromModuleBase(url);
    },

    normalizeText(str) {
      if (!str) return "";
      return String(str)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
    },

    normalizeKey(str) {
      if (!str) return "";
      const t = this.normalizeText(str);
      return t.toLowerCase().replace(/[^a-z0-9]/g, "");
    },

    normalizeCareer(str) {
      if (!str) return "";
      return this.normalizeText(str).replace(/\s+/g, " ").toUpperCase();
    },

    safe(str) {
      if (str === undefined || str === null) return "";
      return String(str).trim();
    },

    todayParts() {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");

      const meses = [
        "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
        "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
      ];
      const humanLong = `${dd} DE ${meses[d.getMonth()]} DE ${yyyy}`;

      return {
        yyyy, mm, dd,
        memo: `${yyyy}-${mm}-${dd}`,
        human: `${dd}/${mm}/${yyyy}`,
        humanLong
      };
    },

    randomBetween(min, max, decimals = 2) {
      const r = min + Math.random() * (max - min);
      return Number(r.toFixed(decimals));
    },

    formatPctES(n, decimals = 2) {
      const v = Number(n);
      if (!Number.isFinite(v)) return "0,00%";
      return v.toFixed(decimals).replace(".", ",") + "%";
    },

    initialsFromNameES,

    buildPdfFilename({ memoDateISO, estudianteNombre }) {
      const datePart = String(memoDateISO || "").trim() || this.todayParts().memo;
      const humanName = sanitizeHumanFilename(estudianteNombre);
      const safeName = humanName || "SIN NOMBRE";
      return `MEM-ITSQMET-UTET-${datePart}-${safeName}.pdf`;
    },

    downloadBlob,

    DETECTOR_COLORS: {
      plagio: { r: 255, g: 0, b: 0 },
      original: { r: 0, g: 128, b: 0 },
      citas: { r: 0, g: 0, b: 255 },
      ai: { r: 255, g: 165, b: 0 },
      okGreen: { r: 0, g: 128, b: 0 },
      violet: { r: 148, g: 0, b: 211 },
      text: { r: 20, g: 20, b: 20 },
      lightBorder: { r: 210, g: 210, b: 210 }
    },

    DETECTOR_NOTE_ASSETS: {
      wikipedia: "",
      googlebooks: "",
      ghostwriting: "",
      antitrap: ""
    },

    fileToDataURL,

    async loadImageDataURL(url) {
      const raw = String(url || "").trim();
      if (!raw) return "";
      if (isDataUrl(raw)) return raw;

      const resolvedUrl = resolveFromModuleBase(raw);

      let lastError = null;

      // intento 1 fetch
      if (canUseFetchForUrl(resolvedUrl)) {
        try {
          return await tryFetchAsDataURL(resolvedUrl);
        } catch (e) {
          lastError = e;
          console.warn("[AntiUtils] fetch falló, se intentará Image():", resolvedUrl, e);
        }
      }

      // intento 2 Image + canvas
      try {
        return await tryImageAsDataURL(resolvedUrl);
      } catch (e) {
        lastError = e;
      }

      console.warn("[AntiUtils] No se pudo cargar imagen:", raw, "->", resolvedUrl, lastError);
      return "";
    },

    async loadDetectorAssets() {
      const map = {
        wikipedia: "img/wiki.png",
        googlebooks: "img/google.png",
        ghostwriting: "img/fantasma.png",
        antitrap: "img/mano.png"
      };

      const keys = Object.keys(map);
      const out = {};

      for (const k of keys) {
        try {
          out[k] = await this.loadImageDataURL(map[k]);
        } catch (e) {
          console.warn("[AntiUtils] No se pudo cargar asset:", map[k], e);
          out[k] = "";
        }
      }

      this.DETECTOR_NOTE_ASSETS = out;
      return out;
    },

    getAssetsReport() {
      const a = this.DETECTOR_NOTE_ASSETS || {};
      return {
        assetBase: this.ASSET_BASE,
        protocol: String(window.location.protocol || ""),
        wikipedia: !!a.wikipedia,
        googlebooks: !!a.googlebooks,
        ghostwriting: !!a.ghostwriting,
        antitrap: !!a.antitrap
      };
    },

    sleep(ms) {
      return new Promise(res => setTimeout(res, ms));
    }
  };

  window.AntiUtils = AntiUtils;
})(window, document);
