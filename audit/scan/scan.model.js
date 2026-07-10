/* =========================================================
Nombre completo: scan.model.js
Ruta o ubicación: /audit/scan/scan.model.js
Función o funciones:
- Normalizar rutas encontradas dentro de archivos ZIP.
- Preservar nombres originales, espacios y metadatos técnicos.
- Crear registros uniformes de archivos y carpetas.
- Detectar carpetas implícitas, extensiones, niveles y rutas inseguras.
- Ordenar colecciones en el mismo arreglo para reducir memoria.
- Funcionar en ventana principal y Web Worker.
========================================================= */

(function attachScanModel(root) {
  "use strict";

  root.AuditScan = root.AuditScan || {};

  function raw(value) {
    return String(value == null ? "" : value);
  }

  function text(value) {
    return raw(value).trim();
  }

  function normalizeSlashes(value) {
    return raw(value)
      .replace(/\\+/g, "/")
      .replace(/\/{2,}/g, "/");
  }

  function hasUnsafeSegments(path) {
    var value = normalizeSlashes(path);
    return /(^|\/)\.\.(\/|$)/.test(value) || /^[A-Za-z]:\//.test(value) || /^\//.test(value);
  }

  function sanitizePath(value, isFolder) {
    var original = normalizeSlashes(value);
    var pieces = original.split("/");
    var safe = [];

    pieces.forEach(function keepPiece(piece) {
      var current = raw(piece);
      if (current === "" || current === ".") return;
      if (current === "..") {
        if (safe.length) safe.pop();
        return;
      }

      current = current.replace(/[\u0000-\u001f\u007f]/g, "");
      if (current !== "") safe.push(current);
    });

    var result = safe.join("/");
    if (isFolder && result && !result.endsWith("/")) result += "/";
    return result;
  }

  function withoutTrailingSlash(value) {
    return normalizeSlashes(value).replace(/\/+$/, "");
  }

  function getName(path, isFolder) {
    var clean = isFolder ? withoutTrailingSlash(path) : normalizeSlashes(path);
    var parts = clean.split("/").filter(function keepPart(part) {
      return part !== "";
    });
    return parts.length ? parts[parts.length - 1] : "";
  }

  function getParent(path, isFolder) {
    var clean = isFolder ? withoutTrailingSlash(path) : normalizeSlashes(path);
    var parts = clean.split("/").filter(function keepPart(part) {
      return part !== "";
    });
    parts.pop();
    return parts.join("/");
  }

  function getDepth(path, isFolder) {
    var clean = isFolder ? withoutTrailingSlash(path) : normalizeSlashes(path);
    if (!clean) return 0;
    return clean.split("/").filter(function keepPart(part) {
      return part !== "";
    }).length;
  }

  function getExtension(name, isFolder) {
    if (isFolder) return "";
    var value = raw(name);
    var index = value.lastIndexOf(".");
    if (index <= 0 || index === value.length - 1) return "";
    return value.slice(index + 1).toLowerCase();
  }

  function numberOrZero(value) {
    var result = Number(value);
    return Number.isFinite(result) && result > 0 ? result : 0;
  }

  function buildEntry(data) {
    data = data || {};

    var isFolder = Boolean(data.isFolder || data.dir);
    var originalPath = normalizeSlashes(data.originalPath || data.path || data.name);
    var path = sanitizePath(data.path || originalPath, isFolder);
    var name = getName(path, isFolder);
    var unsafePath = Boolean(data.unsafePath || hasUnsafeSegments(originalPath));

    return {
      id: text(data.id) || "scan_entry_" + Math.random().toString(16).slice(2),
      type: isFolder ? "folder" : "file",
      path: path,
      originalPath: originalPath || path,
      name: name,
      extension: getExtension(name, isFolder),
      parent: getParent(path, isFolder),
      depth: getDepth(path, isFolder),
      size: isFolder ? 0 : numberOrZero(data.size || data.uncompressedSize),
      compressedSize: isFolder ? 0 : numberOrZero(data.compressedSize),
      modifiedAt: data.modifiedAt || null,
      comment: raw(data.comment),
      crc32: data.crc32 == null ? null : data.crc32,
      compressionMethod: data.compressionMethod == null ? null : Number(data.compressionMethod),
      localOffset: data.localOffset == null ? null : Number(data.localOffset),
      versionMadeBy: data.versionMadeBy == null ? null : Number(data.versionMadeBy),
      encrypted: Boolean(data.encrypted),
      unsafePath: unsafePath,
      implicit: Boolean(data.implicit),
      empty: !isFolder && numberOrZero(data.size || data.uncompressedSize) === 0
    };
  }

  function buildImplicitFolders(entries) {
    var existing = new Set();
    var folders = [];

    (entries || []).forEach(function rememberExisting(entry) {
      if (!entry || !entry.path) return;
      if (entry.type === "folder") existing.add(entry.path);
    });

    (entries || []).forEach(function addParents(entry) {
      if (!entry || !entry.path) return;

      var clean = entry.type === "folder"
        ? withoutTrailingSlash(entry.path)
        : normalizeSlashes(entry.path);
      var parts = clean.split("/").filter(function keepPart(part) {
        return part !== "";
      });
      if (entry.type === "file") parts.pop();

      var current = [];
      parts.forEach(function addPart(part) {
        current.push(part);
        var folderPath = current.join("/") + "/";
        if (existing.has(folderPath)) return;

        existing.add(folderPath);
        folders.push(buildEntry({
          id: "scan_folder_" + folderPath,
          path: folderPath,
          originalPath: folderPath,
          isFolder: true,
          implicit: true
        }));
      });
    });

    return folders;
  }

  function appendEntries(target, additions) {
    var destination = Array.isArray(target) ? target : [];
    var source = Array.isArray(additions) ? additions : [];

    for (var index = 0; index < source.length; index += 1) {
      destination.push(source[index]);
    }

    return destination;
  }

  function sortEntries(entries) {
    var list = Array.isArray(entries) ? entries : [];

    list.sort(function compareEntries(a, b) {
      var pathA = raw(a && a.path).toLocaleLowerCase("es");
      var pathB = raw(b && b.path).toLocaleLowerCase("es");
      return pathA.localeCompare(pathB, "es", { numeric: true, sensitivity: "base" });
    });

    return list;
  }

  function createSummary(entries, zipMeta) {
    var files = 0;
    var folders = 0;
    var totalSize = 0;
    var compressedSize = 0;
    var emptyFiles = 0;
    var unsafePaths = 0;
    var maxDepth = 0;
    var extensionCounts = Object.create(null);
    var pathCounts = Object.create(null);
    var duplicatePaths = 0;

    (entries || []).forEach(function summarizeEntry(entry) {
      if (!entry) return;

      if (entry.type === "folder") {
        folders += 1;
      } else {
        files += 1;
        totalSize += numberOrZero(entry.size);
        compressedSize += numberOrZero(entry.compressedSize);

        if (entry.empty) emptyFiles += 1;
        if (entry.extension) {
          extensionCounts[entry.extension] = (extensionCounts[entry.extension] || 0) + 1;
        }
      }

      if (entry.unsafePath) unsafePaths += 1;
      maxDepth = Math.max(maxDepth, Number(entry.depth) || 0);

      var key = raw(entry.path).toLocaleLowerCase("es");
      if (key) {
        pathCounts[key] = (pathCounts[key] || 0) + 1;
        if (pathCounts[key] === 2) duplicatePaths += 1;
      }
    });

    return {
      files: files,
      folders: folders,
      totalSize: totalSize,
      compressedSize: compressedSize,
      alerts: emptyFiles + unsafePaths + duplicatePaths,
      emptyFiles: emptyFiles,
      unsafePaths: unsafePaths,
      duplicatePaths: duplicatePaths,
      maxDepth: maxDepth,
      extensions: extensionCounts,
      zipName: raw(zipMeta && zipMeta.name),
      zipSize: numberOrZero(zipMeta && zipMeta.size),
      scannedAt: new Date().toISOString()
    };
  }

  root.AuditScan.Model = {
    raw: raw,
    text: text,
    normalizeSlashes: normalizeSlashes,
    sanitizePath: sanitizePath,
    hasUnsafeSegments: hasUnsafeSegments,
    buildEntry: buildEntry,
    buildImplicitFolders: buildImplicitFolders,
    appendEntries: appendEntries,
    sortEntries: sortEntries,
    createSummary: createSummary
  };
})(typeof self !== "undefined" ? self : globalThis);
