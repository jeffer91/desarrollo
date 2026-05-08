/* =========================================================
Nombre completo: supabase.anexos.js
Ruta: /Titulacion/basedatos/supabase/supabase.anexos.js
Función o funciones:
- Subir anexos del módulo Titulación a Supabase Storage.
- Separar anexos por período, modalidad y tipo de evidencia.
- Generar rutas ordenadas para imágenes, PDF y documentos de respaldo.
- Listar anexos ya subidos por período.
- Devolver metadatos listos para insertar en el PDF.
========================================================= */

(function (window) {
  "use strict";

  function getStorageConfig() {
    var cfg = window.SUPABASE_CONFIG || {};
    return cfg.storage || {};
  }

  function getStorage() {
    return window.SupabaseStorage || null;
  }

  function asText(value) {
    if (
      window.TITULACION_UTILS &&
      typeof window.TITULACION_UTILS.asText === "function"
    ) {
      return window.TITULACION_UTILS.asText(value);
    }

    return String(value === null || value === undefined ? "" : value).trim();
  }

  function sanitizeFolder(value) {
    var storage = getStorage();

    if (storage && typeof storage.sanitizeFolder === "function") {
      return storage.sanitizeFolder(value);
    }

    return asText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "sin-periodo";
  }

  function sanitizeFileName(value) {
    var storage = getStorage();

    if (storage && typeof storage.sanitizeFileName === "function") {
      return storage.sanitizeFileName(value);
    }

    return asText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\\/:*?"<>|#%{}[\]^~`]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "archivo";
  }

  function nowParts() {
    var d = new Date();

    return {
      year: String(d.getFullYear()),
      month: String(d.getMonth() + 1).padStart(2, "0"),
      day: String(d.getDate()).padStart(2, "0"),
      stamp:
        String(d.getFullYear()) +
        String(d.getMonth() + 1).padStart(2, "0") +
        String(d.getDate()).padStart(2, "0") +
        "-" +
        String(d.getHours()).padStart(2, "0") +
        String(d.getMinutes()).padStart(2, "0") +
        String(d.getSeconds()).padStart(2, "0")
    };
  }

  function randomSuffix() {
    return Math.random().toString(36).slice(2, 8);
  }

  function getContextPeriod(context) {
    var ctx = context || {};
    var id = asText(ctx.periodId);
    var label = asText(ctx.periodLabel || ctx.periodo);

    if (id) return id;
    if (label) return label;

    return "sin-periodo";
  }

  function getContextModalidad(context) {
    var ctx = context || {};
    var modalidad = asText(ctx.modalidad || ctx.tipoDocumento);

    if (modalidad) return modalidad;

    return "general";
  }

  function normalizeType(type) {
    var raw = asText(type).toLowerCase();

    if (raw === "sisacad") return "sisacad";
    if (raw === "correo") return "correos";
    if (raw === "correos") return "correos";
    if (raw === "email") return "correos";
    if (raw === "emails") return "correos";
    if (raw === "cronograma") return "cronograma";
    if (raw === "resultado") return "resultados";
    if (raw === "resultados") return "resultados";
    if (raw === "evidencia") return "evidencias";
    if (raw === "evidencias") return "evidencias";
    if (raw === "portada") return "portada";

    return "otros";
  }

  function getPeriodRoot(context) {
    var storageCfg = getStorageConfig();
    var baseFolder = sanitizeFolder(storageCfg.baseFolder || "titulacion");
    var periodFolder = sanitizeFolder(getContextPeriod(context));
    var modalidadFolder = sanitizeFolder(getContextModalidad(context));

    return [
      baseFolder,
      periodFolder,
      modalidadFolder
    ].join("/");
  }

  function buildPath(file, type, context) {
    var tipo = normalizeType(type);
    var date = nowParts();
    var originalName = sanitizeFileName(file && file.name ? file.name : "archivo");
    var finalName = date.stamp + "-" + randomSuffix() + "-" + originalName;

    return [
      getPeriodRoot(context),
      date.year,
      date.month,
      tipo,
      finalName
    ].join("/");
  }

  function getOriginalNameFromPath(path) {
    var fileName = asText(path).split("/").pop() || "archivo";
    var match = fileName.match(/^\d{8}-\d{6}-[a-z0-9]+-(.+)$/i);

    return match && match[1] ? match[1] : fileName;
  }

  function getMimeFromStorageItem(item) {
    var meta = item && item.metadata ? item.metadata : {};

    return asText(
      meta.mimetype ||
      meta.mimeType ||
      meta.contentType ||
      meta.type ||
      ""
    );
  }

  function isImageNameOrMime(name, mime) {
    if (
      window.TITULACION_UTILS &&
      typeof window.TITULACION_UTILS.isImageNameOrMime === "function"
    ) {
      return window.TITULACION_UTILS.isImageNameOrMime(name, mime);
    }

    var cleanMime = asText(mime).toLowerCase();
    var cleanName = asText(name).toLowerCase();

    return (
      cleanMime.indexOf("image/") === 0 ||
      /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(cleanName)
    );
  }

  function pathMatchesType(path, type) {
    var normalized = normalizeType(type);
    var cleanPath = "/" + asText(path).replace(/^\/+/, "");

    return cleanPath.indexOf("/" + normalized + "/") >= 0;
  }

  function storageItemToAnexo(item, source) {
    var path = asText(item && item.path);
    var bucket = asText(item && item.bucket);
    var name = getOriginalNameFromPath(path);
    var mime = getMimeFromStorageItem(item);
    var readableUrl = asText(item && item.readableUrl);
    var publicUrl = asText(item && item.publicUrl);
    var url = readableUrl || publicUrl;
    var meta = item && item.metadata ? item.metadata : {};

    return {
      id: "online-" + path,
      source: source,
      name: name,
      type: mime || "application/octet-stream",
      size: Number(meta.size || 0),
      dataUrl: isImageNameOrMime(name, mime) ? url : "",
      uploadStatus: "subido",
      uploadError: "",
      bucket: bucket,
      path: path,
      fullPath: bucket && path ? bucket + "/" + path : path,
      publicUrl: publicUrl,
      readableUrl: readableUrl,
      uploadedAt: asText(item && (item.updated_at || item.created_at || item.createdAt)),
      online: true
    };
  }

  async function uploadAnexo(file, type, context) {
    var storage = getStorage();
    var storageCfg = getStorageConfig();
    var bucket = storageCfg.bucket || "anexos";

    if (!storage || typeof storage.uploadFile !== "function" || !storage.isReady()) {
      return {
        ok: false,
        error: "Supabase Storage no está disponible.",
        bucket: bucket,
        path: "",
        publicUrl: "",
        readableUrl: ""
      };
    }

    var path = buildPath(file, type, context);

    var result = await storage.uploadFile({
      bucket: bucket,
      path: path,
      file: file,
      upsert: true
    });

    return Object.assign({}, result, {
      type: normalizeType(type),
      originalName: file && file.name ? String(file.name) : "archivo",
      mimeType: file && file.type ? String(file.type) : "application/octet-stream",
      size: file && file.size ? Number(file.size) : 0
    });
  }

  async function uploadSisacad(file, context) {
    return uploadAnexo(file, "sisacad", context);
  }

  async function uploadCorreo(file, context) {
    return uploadAnexo(file, "correos", context);
  }

  async function uploadCronograma(file, context) {
    return uploadAnexo(file, "cronograma", context);
  }

  async function uploadResultados(file, context) {
    return uploadAnexo(file, "resultados", context);
  }

  async function listAnexos(context) {
    var storage = getStorage();
    var storageCfg = getStorageConfig();
    var bucket = storageCfg.bucket || "anexos";
    var rootPath = getPeriodRoot(context);

    if (!storage || typeof storage.listFilesRecursive !== "function" || !storage.isReady()) {
      return {
        ok: false,
        error: "Supabase Storage no permite listar archivos. Revisa supabase.storage.js.",
        bucket: bucket,
        path: rootPath,
        items: [],
        sisacad: [],
        correos: [],
        cronograma: [],
        resultados: [],
        evidencias: [],
        otros: []
      };
    }

    var result = await storage.listFilesRecursive({
      bucket: bucket,
      path: rootPath,
      expiresIn: 60 * 60
    });

    if (!result || !result.ok) {
      return {
        ok: false,
        error: result && result.error ? result.error : "No se pudieron listar anexos.",
        bucket: bucket,
        path: rootPath,
        items: [],
        sisacad: [],
        correos: [],
        cronograma: [],
        resultados: [],
        evidencias: [],
        otros: []
      };
    }

    var files = Array.isArray(result.items) ? result.items : [];

    var sisacad = files
      .filter(function (item) {
        return pathMatchesType(item && item.path, "sisacad");
      })
      .map(function (item) {
        return storageItemToAnexo(item, "sisacad");
      });

    var correos = files
      .filter(function (item) {
        return pathMatchesType(item && item.path, "correos");
      })
      .map(function (item) {
        return storageItemToAnexo(item, "correos");
      });

    var cronograma = files
      .filter(function (item) {
        return pathMatchesType(item && item.path, "cronograma");
      })
      .map(function (item) {
        return storageItemToAnexo(item, "cronograma");
      });

    var resultados = files
      .filter(function (item) {
        return pathMatchesType(item && item.path, "resultados");
      })
      .map(function (item) {
        return storageItemToAnexo(item, "resultados");
      });

    var evidencias = files
      .filter(function (item) {
        return pathMatchesType(item && item.path, "evidencias");
      })
      .map(function (item) {
        return storageItemToAnexo(item, "evidencias");
      });

    var otros = files
      .filter(function (item) {
        var path = item && item.path;
        return !(
          pathMatchesType(path, "sisacad") ||
          pathMatchesType(path, "correos") ||
          pathMatchesType(path, "cronograma") ||
          pathMatchesType(path, "resultados") ||
          pathMatchesType(path, "evidencias")
        );
      })
      .map(function (item) {
        return storageItemToAnexo(item, "otros");
      });

    return {
      ok: true,
      bucket: bucket,
      path: rootPath,
      sisacad: sisacad,
      correos: correos,
      cronograma: cronograma,
      resultados: resultados,
      evidencias: evidencias,
      otros: otros,
      items: sisacad.concat(correos, cronograma, resultados, evidencias, otros)
    };
  }

  async function listByType(context, type) {
    var result = await listAnexos(context);
    var normalized = normalizeType(type);

    return Object.assign({}, result, {
      items: result && result.ok && Array.isArray(result[normalized])
        ? result[normalized]
        : []
    });
  }

  async function deleteAnexo(item) {
    var storage = getStorage();
    var storageCfg = getStorageConfig();
    var bucket = asText(item && item.bucket) || storageCfg.bucket || "anexos";
    var path = asText(item && item.path);

    if (!path) {
      return {
        ok: false,
        error: "El anexo no tiene ruta online para eliminar."
      };
    }

    if (!storage || typeof storage.removeFile !== "function" || !storage.isReady()) {
      return {
        ok: false,
        error: "Supabase Storage no está disponible."
      };
    }

    return storage.removeFile({
      bucket: bucket,
      path: path
    });
  }

  function buildOnlineMeta(uploadResult) {
    var r = uploadResult || {};

    return {
      bucket: asText(r.bucket),
      path: asText(r.path),
      fullPath: asText(r.fullPath),
      publicUrl: asText(r.publicUrl),
      readableUrl: asText(r.readableUrl),
      uploadedAt: asText(r.uploadedAt),
      online: !!r.ok
    };
  }

  window.SupabaseAnexos = {
    uploadAnexo: uploadAnexo,
    uploadSisacad: uploadSisacad,
    uploadCorreo: uploadCorreo,
    uploadCronograma: uploadCronograma,
    uploadResultados: uploadResultados,
    listAnexos: listAnexos,
    listByType: listByType,
    deleteAnexo: deleteAnexo,
    buildPath: buildPath,
    buildOnlineMeta: buildOnlineMeta,
    getPeriodRoot: getPeriodRoot,
    normalizeType: normalizeType
  };
})(window);