/* =========================================================
Nombre completo: scan.selftest.js
Ruta o ubicación: /audit/scan/scan.selftest.js
Función o funciones:
- Generar ZIP mínimos válidos completamente en memoria.
- Verificar lectura de archivos, carpetas, Unicode y rutas inseguras.
- Confirmar que un archivo dañado sea rechazado.
- Ejecutarse una sola vez al cargar SCAN.
- Exponer una promesa y un reporte técnico sin modificar el motor.
========================================================= */

(function attachScanSelfTest(window) {
  "use strict";

  window.AuditScan = window.AuditScan || {};

  var report = {
    status: "pending",
    startedAt: null,
    finishedAt: null,
    durationMs: 0,
    checks: [],
    error: ""
  };
  var readyPromise = null;

  function utf8(value) {
    var text = String(value == null ? "" : value);
    if (typeof TextEncoder === "function") return new TextEncoder().encode(text);

    var encoded = unescape(encodeURIComponent(text));
    var bytes = new Uint8Array(encoded.length);
    for (var index = 0; index < encoded.length; index += 1) {
      bytes[index] = encoded.charCodeAt(index);
    }
    return bytes;
  }

  function crc32(bytes) {
    var crc = 0xffffffff;

    for (var index = 0; index < bytes.length; index += 1) {
      crc ^= bytes[index];
      for (var bit = 0; bit < 8; bit += 1) {
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
      }
    }

    return (crc ^ 0xffffffff) >>> 0;
  }

  function write16(target, offset, value) {
    target[offset] = value & 0xff;
    target[offset + 1] = (value >>> 8) & 0xff;
  }

  function write32(target, offset, value) {
    target[offset] = value & 0xff;
    target[offset + 1] = (value >>> 8) & 0xff;
    target[offset + 2] = (value >>> 16) & 0xff;
    target[offset + 3] = (value >>> 24) & 0xff;
  }

  function concat(parts) {
    var size = parts.reduce(function total(sum, part) {
      return sum + part.length;
    }, 0);
    var result = new Uint8Array(size);
    var offset = 0;

    parts.forEach(function append(part) {
      result.set(part, offset);
      offset += part.length;
    });

    return result;
  }

  function localHeader(nameBytes, contentBytes, checksum) {
    var header = new Uint8Array(30);
    write32(header, 0, 0x04034b50);
    write16(header, 4, 20);
    write16(header, 6, 0x0800);
    write16(header, 8, 0);
    write16(header, 10, 0);
    write16(header, 12, 0);
    write32(header, 14, checksum);
    write32(header, 18, contentBytes.length);
    write32(header, 22, contentBytes.length);
    write16(header, 26, nameBytes.length);
    write16(header, 28, 0);
    return concat([header, nameBytes, contentBytes]);
  }

  function centralHeader(entry, localOffset) {
    var nameBytes = entry.nameBytes;
    var contentBytes = entry.contentBytes;
    var header = new Uint8Array(46);
    var isFolder = /\/$/.test(entry.name);

    write32(header, 0, 0x02014b50);
    write16(header, 4, 0x0314);
    write16(header, 6, 20);
    write16(header, 8, 0x0800);
    write16(header, 10, 0);
    write16(header, 12, 0);
    write16(header, 14, 0);
    write32(header, 16, entry.checksum);
    write32(header, 20, contentBytes.length);
    write32(header, 24, contentBytes.length);
    write16(header, 28, nameBytes.length);
    write16(header, 30, 0);
    write16(header, 32, 0);
    write16(header, 34, 0);
    write16(header, 36, 0);
    write32(header, 38, isFolder ? 0x41ed0010 : 0x81a40000);
    write32(header, 42, localOffset);

    return concat([header, nameBytes]);
  }

  function buildZip(sourceEntries) {
    var entries = sourceEntries.map(function prepare(item) {
      var name = String(item.name || "");
      var nameBytes = utf8(name);
      var contentBytes = utf8(item.content || "");
      return {
        name: name,
        nameBytes: nameBytes,
        contentBytes: contentBytes,
        checksum: crc32(contentBytes)
      };
    });

    var localParts = [];
    var centralParts = [];
    var localOffset = 0;

    entries.forEach(function addEntry(entry) {
      var local = localHeader(entry.nameBytes, entry.contentBytes, entry.checksum);
      localParts.push(local);
      centralParts.push(centralHeader(entry, localOffset));
      localOffset += local.length;
    });

    var central = concat(centralParts);
    var end = new Uint8Array(22);
    write32(end, 0, 0x06054b50);
    write16(end, 4, 0);
    write16(end, 6, 0);
    write16(end, 8, entries.length);
    write16(end, 10, entries.length);
    write32(end, 12, central.length);
    write32(end, 16, localOffset);
    write16(end, 20, 0);

    return new Blob([concat(localParts), central, end], { type: "application/zip" });
  }

  function check(name, condition, detail) {
    var passed = Boolean(condition);
    report.checks.push({
      name: name,
      passed: passed,
      detail: passed ? "" : String(detail || "Comprobación no superada.")
    });

    if (!passed) {
      var error = new Error(name + ": " + (detail || "comprobación no superada"));
      error.name = "ScanSelfTestError";
      throw error;
    }
  }

  async function runInternal() {
    var reader = window.AuditScan.ArchiveReader;
    var model = window.AuditScan.Model;

    if (!reader || typeof reader.read !== "function" || !model) {
      throw new Error("No están disponibles el lector o el modelo de SCAN.");
    }

    var zip = buildZip([
      { name: "carpeta/", content: "" },
      { name: "carpeta/archivo á.txt", content: "hola" },
      { name: "../riesgo.txt", content: "" },
      { name: "vacío.txt", content: "" }
    ]);

    var result = await reader.read(zip, {
      maxEntries: 50,
      maxCentralDirectoryBytes: 1024 * 1024
    }, {
      isCancelled: function notCancelled() { return false; }
    });

    var entries = result.entries || [];
    var unicodeEntry = entries.find(function findUnicode(entry) {
      return entry.sourcePath === "carpeta/archivo á.txt";
    });
    var unsafeEntry = entries.find(function findUnsafe(entry) {
      return entry.sourcePath === "../riesgo.txt";
    });

    check("ZIP válido leído", result.summary && result.summary.files === 3, "No se contabilizaron los tres archivos.");
    check("Carpeta identificada", result.summary && result.summary.folders >= 1, "No se identificó la carpeta declarada.");
    check("Nombre Unicode preservado", unicodeEntry && unicodeEntry.sourceName === "archivo á.txt", "El nombre Unicode cambió.");
    check("Ruta exacta preservada", unsafeEntry && unsafeEntry.sourcePath === "../riesgo.txt", "No se conservó la ruta fuente.");
    check("Ruta insegura normalizada", unsafeEntry && unsafeEntry.unsafePath && unsafeEntry.path === "riesgo.txt", "La ruta relativa no fue controlada.");
    check("Archivos vacíos detectados", result.summary && result.summary.emptyFiles === 2, "El conteo de archivos vacíos no coincide.");

    var damagedRejected = false;
    try {
      await reader.read(new Blob([new Uint8Array([1, 2, 3, 4])]), {}, {
        isCancelled: function notCancelled() { return false; }
      });
    } catch (error) {
      damagedRejected = error && error.name === "ScanArchiveCorruptError";
    }

    check("ZIP dañado rechazado", damagedRejected, "El lector aceptó un archivo que no era ZIP.");

    return {
      files: result.summary.files,
      folders: result.summary.folders,
      checks: report.checks.length
    };
  }

  function run() {
    if (readyPromise) return readyPromise;

    report.startedAt = new Date().toISOString();
    report.status = "running";
    report.checks = [];
    report.error = "";
    var started = Date.now();

    readyPromise = runInternal()
      .then(function selfTestPassed(details) {
        report.status = "passed";
        report.finishedAt = new Date().toISOString();
        report.durationMs = Date.now() - started;
        report.details = details;
        return Object.assign({}, report);
      })
      .catch(function selfTestFailed(error) {
        report.status = "failed";
        report.finishedAt = new Date().toISOString();
        report.durationMs = Date.now() - started;
        report.error = error && error.message ? error.message : String(error);

        var wrapped = new Error("La autoprueba interna de SCAN falló: " + report.error);
        wrapped.name = "ScanSelfTestError";
        throw wrapped;
      });

    readyPromise.catch(function logSelfTestFailure(error) {
      console.error(error);
    });

    return readyPromise;
  }

  function getReport() {
    return JSON.parse(JSON.stringify(report));
  }

  window.AuditScan.SelfTest = {
    run: run,
    ensure: run,
    getReport: getReport
  };

  run();
})(window);
