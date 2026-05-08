/* =========================================================
Nombre completo: supabase.storage.js
Ruta: /Titulacion/basedatos/supabase/supabase.storage.js
Función o funciones:
- Subir archivos a Supabase Storage.
- Obtener URL pública o firmada de archivos.
- Listar archivos y carpetas de forma recursiva.
- Eliminar archivos remotos.
- Mantener una API general para anexos de titulación.
========================================================= */

(function (window) {
  "use strict";

  function getConfig() {
    return window.SUPABASE_CONFIG || {};
  }

  function getStorageConfig() {
    var cfg = getConfig();
    return cfg.storage || {};
  }

  function getBucketName(customBucket) {
    var storageCfg = getStorageConfig();
    return String(customBucket || storageCfg.bucket || "anexos").trim();
  }

  function getClient() {
    if (
      !window.SupabaseClientApp ||
      typeof window.SupabaseClientApp.getClient !== "function"
    ) {
      return null;
    }

    return window.SupabaseClientApp.getClient();
  }

  function isReady() {
    var client = getClient();
    return !!(client && client.storage);
  }

  function sanitizeFileName(value) {
    if (
      window.TITULACION_UTILS &&
      typeof window.TITULACION_UTILS.sanitizeFileName === "function"
    ) {
      return window.TITULACION_UTILS.sanitizeFileName(value);
    }

    return String(value || "archivo")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\\/:*?"<>|#%{}[\]^~`]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^\.+/g, "")
      .replace(/^_+/g, "")
      .replace(/^-+/g, "")
      .trim() || "archivo";
  }

  function sanitizeFolder(value) {
    if (
      window.TITULACION_UTILS &&
      typeof window.TITULACION_UTILS.sanitizeFolder === "function"
    ) {
      return window.TITULACION_UTILS.sanitizeFolder(value);
    }

    return String(value || "sin-periodo")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[\\/:*?"<>|#%{}[\]^~`]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^\.+/g, "")
      .replace(/^_+/g, "")
      .replace(/^-+/g, "")
      .trim() || "sin-periodo";
  }

  function normalizePath(parts) {
    return (Array.isArray(parts) ? parts : [])
      .map(function (part) {
        return sanitizeFolder(part);
      })
      .filter(Boolean)
      .join("/");
  }

  async function uploadFile(args) {
    var options = args || {};
    var file = options.file;
    var bucket = getBucketName(options.bucket);
    var path = String(options.path || "").trim();

    if (!file) {
      return {
        ok: false,
        error: "No se recibió archivo para subir.",
        bucket: bucket,
        path: path
      };
    }

    if (!path) {
      return {
        ok: false,
        error: "No se recibió ruta de almacenamiento.",
        bucket: bucket,
        path: path
      };
    }

    var client = getClient();

    if (!client || !client.storage) {
      return {
        ok: false,
        error: "Supabase Storage no está disponible.",
        bucket: bucket,
        path: path
      };
    }

    try {
      var uploadOptions = {
        cacheControl: String(options.cacheControl || "3600"),
        upsert: options.upsert !== false,
        contentType: file.type || "application/octet-stream"
      };

      var result = await client.storage
        .from(bucket)
        .upload(path, file, uploadOptions);

      if (result.error) {
        return {
          ok: false,
          error: result.error.message || String(result.error),
          bucket: bucket,
          path: path,
          data: result.data || null
        };
      }

      var publicUrl = getPublicUrl({
        bucket: bucket,
        path: path
      });

      var readableUrl = await getReadableUrl({
        bucket: bucket,
        path: path,
        expiresIn: options.expiresIn || 60 * 60
      });

      return {
        ok: true,
        bucket: bucket,
        path: path,
        fullPath: bucket + "/" + path,
        publicUrl: publicUrl,
        readableUrl: readableUrl,
        data: result.data || null,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        ok: false,
        error: error && error.message ? error.message : String(error),
        bucket: bucket,
        path: path
      };
    }
  }

  async function removeFile(args) {
    var options = args || {};
    var bucket = getBucketName(options.bucket);
    var path = String(options.path || "").trim();

    if (!path) {
      return {
        ok: false,
        error: "No se recibió ruta para eliminar.",
        bucket: bucket,
        path: path
      };
    }

    var client = getClient();

    if (!client || !client.storage) {
      return {
        ok: false,
        error: "Supabase Storage no está disponible.",
        bucket: bucket,
        path: path
      };
    }

    try {
      var result = await client.storage
        .from(bucket)
        .remove([path]);

      if (result.error) {
        return {
          ok: false,
          error: result.error.message || String(result.error),
          bucket: bucket,
          path: path
        };
      }

      return {
        ok: true,
        bucket: bucket,
        path: path,
        data: result.data || null
      };
    } catch (error) {
      return {
        ok: false,
        error: error && error.message ? error.message : String(error),
        bucket: bucket,
        path: path
      };
    }
  }

  function getPublicUrl(args) {
    var options = args || {};
    var bucket = getBucketName(options.bucket);
    var path = String(options.path || "").trim();
    var client = getClient();

    if (!client || !client.storage || !path) {
      return "";
    }

    try {
      var result = client.storage
        .from(bucket)
        .getPublicUrl(path);

      return result && result.data && result.data.publicUrl
        ? result.data.publicUrl
        : "";
    } catch (error) {
      console.warn("[SupabaseStorage] No se pudo obtener URL pública:", error);
      return "";
    }
  }

  async function createSignedUrl(args) {
    var options = args || {};
    var bucket = getBucketName(options.bucket);
    var path = String(options.path || "").trim();
    var expiresIn = Number(options.expiresIn || 60 * 60);
    var client = getClient();

    if (!client || !client.storage || !path) {
      return "";
    }

    try {
      var result = await client.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (result.error) {
        console.warn("[SupabaseStorage] No se pudo crear URL firmada:", result.error);
        return "";
      }

      return result && result.data && result.data.signedUrl
        ? result.data.signedUrl
        : "";
    } catch (error) {
      console.warn("[SupabaseStorage] Error creando URL firmada:", error);
      return "";
    }
  }

  async function getReadableUrl(args) {
    var options = args || {};
    var storageCfg = getStorageConfig();

    if (storageCfg.publicBucket === true) {
      return getPublicUrl(options);
    }

    return createSignedUrl(options);
  }

  async function listFiles(args) {
    var options = args || {};
    var bucket = getBucketName(options.bucket);
    var path = String(options.path || "").replace(/^\/+|\/+$/g, "");
    var limit = Number(options.limit || 100);
    var offset = Number(options.offset || 0);
    var client = getClient();

    if (!client || !client.storage) {
      return {
        ok: false,
        error: "Supabase Storage no está disponible.",
        bucket: bucket,
        path: path,
        items: []
      };
    }

    try {
      var result = await client.storage
        .from(bucket)
        .list(path, {
          limit: limit,
          offset: offset,
          sortBy: options.sortBy || {
            column: "name",
            order: "asc"
          }
        });

      if (result.error) {
        return {
          ok: false,
          error: result.error.message || String(result.error),
          bucket: bucket,
          path: path,
          items: []
        };
      }

      var items = (result.data || []).map(function (item) {
        var name = String(item && item.name || "");
        var fullPath = path ? path + "/" + name : name;

        return Object.assign({}, item, {
          bucket: bucket,
          path: fullPath,
          fullPath: bucket + "/" + fullPath
        });
      });

      return {
        ok: true,
        bucket: bucket,
        path: path,
        items: items
      };
    } catch (error) {
      return {
        ok: false,
        error: error && error.message ? error.message : String(error),
        bucket: bucket,
        path: path,
        items: []
      };
    }
  }

  async function listFilesRecursive(args) {
    var options = args || {};
    var bucket = getBucketName(options.bucket);
    var rootPath = String(options.path || "").replace(/^\/+|\/+$/g, "");
    var out = [];

    async function walk(folderPath) {
      var result = await listFiles({
        bucket: bucket,
        path: folderPath,
        limit: options.limit || 100,
        sortBy: options.sortBy
      });

      if (!result.ok) {
        return result;
      }

      for (var i = 0; i < result.items.length; i += 1) {
        var item = result.items[i];
        var metadata = item && item.metadata ? item.metadata : null;
        var isFile = !!(item && item.id) || !!metadata;

        if (isFile) {
          var readableUrl = await getReadableUrl({
            bucket: bucket,
            path: item.path,
            expiresIn: options.expiresIn || 60 * 60
          });

          out.push(Object.assign({}, item, {
            readableUrl: readableUrl,
            publicUrl: getPublicUrl({
              bucket: bucket,
              path: item.path
            })
          }));
        } else if (item && item.name) {
          var nextPath = folderPath ? folderPath + "/" + item.name : item.name;
          var childResult = await walk(nextPath);

          if (!childResult.ok) {
            return childResult;
          }
        }
      }

      return {
        ok: true,
        bucket: bucket,
        path: rootPath,
        items: out
      };
    }

    return walk(rootPath);
  }

  window.SupabaseStorage = {
    isReady: isReady,
    uploadFile: uploadFile,
    removeFile: removeFile,
    getPublicUrl: getPublicUrl,
    createSignedUrl: createSignedUrl,
    getReadableUrl: getReadableUrl,
    listFiles: listFiles,
    listFilesRecursive: listFilesRecursive,
    sanitizeFileName: sanitizeFileName,
    sanitizeFolder: sanitizeFolder,
    normalizePath: normalizePath
  };
})(window);