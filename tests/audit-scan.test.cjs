/* =========================================================
Nombre completo: audit-scan.test.cjs
Ruta o ubicación: /tests/audit-scan.test.cjs
Función o funciones:
- Probar el lector ZIP progresivo con Node.js.
- Validar rutas exactas, Unicode, normalización y alertas.
- Validar ZIP vacío, autoextraíble, límites, cancelación y daño.
- Validar marcas de cifrado y caracteres de control.
- Ejecutar también la autoprueba usada dentro de la pantalla SCAN.
========================================================= */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

require("../audit/scan/scan.model.js");
require("../audit/scan/scan.archive.js");

const { ArchiveReader } = globalThis.AuditScan;

function utf8(value) {
  return new TextEncoder().encode(String(value == null ? "" : value));
}

function crc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
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
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

function localRecord(entry) {
  const header = new Uint8Array(30);
  write32(header, 0, 0x04034b50);
  write16(header, 4, 20);
  write16(header, 6, entry.flags);
  write16(header, 8, 0);
  write16(header, 10, 0);
  write16(header, 12, 0);
  write32(header, 14, entry.checksum);
  write32(header, 18, entry.content.length);
  write32(header, 22, entry.content.length);
  write16(header, 26, entry.name.length);
  write16(header, 28, 0);
  return concat([header, entry.name, entry.content]);
}

function centralRecord(entry, localOffset) {
  const header = new Uint8Array(46);
  const isFolder = /\/$/.test(entry.sourceName);

  write32(header, 0, 0x02014b50);
  write16(header, 4, 0x0314);
  write16(header, 6, 20);
  write16(header, 8, entry.flags);
  write16(header, 10, 0);
  write16(header, 12, 0);
  write16(header, 14, 0);
  write32(header, 16, entry.checksum);
  write32(header, 20, entry.content.length);
  write32(header, 24, entry.content.length);
  write16(header, 28, entry.name.length);
  write16(header, 30, 0);
  write16(header, 32, 0);
  write16(header, 34, 0);
  write16(header, 36, 0);
  write32(header, 38, isFolder ? 0x41ed0010 : 0x81a40000);
  write32(header, 42, localOffset);

  return concat([header, entry.name]);
}

function buildZip(items, options = {}) {
  const entries = items.map((item) => {
    const name = utf8(item.name);
    const content = utf8(item.content || "");
    return {
      sourceName: String(item.name),
      name,
      content,
      flags: 0x0800 | (item.encrypted ? 0x0001 : 0),
      checksum: crc32(content)
    };
  });

  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const entry of entries) {
    const local = localRecord(entry);
    localParts.push(local);
    centralParts.push(centralRecord(entry, localOffset));
    localOffset += local.length;
  }

  const central = concat(centralParts);
  const comment = options.comment instanceof Uint8Array
    ? options.comment
    : utf8(options.comment || "");
  const end = new Uint8Array(22);

  write32(end, 0, 0x06054b50);
  write16(end, 4, 0);
  write16(end, 6, 0);
  write16(end, 8, entries.length);
  write16(end, 10, entries.length);
  write32(end, 12, central.length);
  write32(end, 16, localOffset);
  write16(end, 20, comment.length);

  const zipBytes = concat([concat(localParts), central, end, comment]);
  const prefix = options.prefix instanceof Uint8Array ? options.prefix : new Uint8Array(0);

  return new Blob([prefix, zipBytes], { type: "application/zip" });
}

function activeControl() {
  return { isCancelled: () => false };
}

async function read(zip, options = {}) {
  return ArchiveReader.read(zip, {
    maxEntries: 1000,
    maxCentralDirectoryBytes: 8 * 1024 * 1024,
    ...options
  }, activeControl());
}

test("lee ZIP normal y conserva Unicode", async () => {
  const result = await read(buildZip([
    { name: "carpeta/", content: "" },
    { name: "carpeta/archivo á.txt", content: "hola" }
  ]));

  assert.equal(result.summary.files, 1);
  assert.equal(result.summary.folders, 1);
  const file = result.entries.find((entry) => entry.type === "file");
  assert.equal(file.sourcePath, "carpeta/archivo á.txt");
  assert.equal(file.sourceName, "archivo á.txt");
  assert.equal(file.path, "carpeta/archivo á.txt");
  assert.equal(file.size, 4);
});

test("preserva ruta fuente y normaliza recorridos inseguros", async () => {
  const backslashName = "raro" + String.fromCharCode(92) + "archivo.txt";
  const result = await read(buildZip([
    { name: "../riesgo.txt", content: "" },
    { name: backslashName, content: "x" }
  ]));

  const traversal = result.entries.find((entry) => entry.sourcePath === "../riesgo.txt");
  const backslash = result.entries.find((entry) => entry.sourcePath === backslashName);

  assert.ok(traversal);
  assert.equal(traversal.path, "riesgo.txt");
  assert.equal(traversal.unsafePath, true);
  assert.ok(backslash);
  assert.equal(backslash.path, "raro/archivo.txt");
  assert.equal(backslash.unsafePath, true);
  assert.ok(result.summary.unsafePaths >= 2);
});

test("detecta caracteres de control en rutas", async () => {
  const controlledName = "malo" + String.fromCharCode(1) + ".txt";
  const result = await read(buildZip([
    { name: controlledName, content: "x" }
  ]));

  const entry = result.entries.find((item) => item.sourcePath === controlledName);
  assert.ok(entry);
  assert.equal(entry.unsafePath, true);
  assert.equal(entry.path, "malo.txt");
});

test("detecta archivos vacíos y elementos cifrados declarados", async () => {
  const result = await read(buildZip([
    { name: "vacío.txt", content: "" },
    { name: "protegido.txt", content: "contenido", encrypted: true }
  ]));

  assert.equal(result.summary.emptyFiles, 1);
  assert.equal(result.summary.encryptedEntries, 1);
  assert.equal(result.summary.files, 2);
});

test("acepta ZIP vacío válido", async () => {
  const result = await read(buildZip([]));
  assert.equal(result.summary.files, 0);
  assert.equal(result.summary.folders, 0);
  assert.equal(result.entries.length, 0);
});

test("acepta ZIP autoextraíble con prefijo", async () => {
  const prefix = utf8("CABECERA-EJECUTABLE-SIMULADA");
  const result = await read(buildZip([
    { name: "archivo.txt", content: "ok" }
  ], { prefix }));

  assert.equal(result.summary.files, 1);
  assert.equal(result.metadata.prependedBytes, prefix.length);
});

test("ignora firmas EOCD falsas dentro del comentario", async () => {
  const fakeSignature = new Uint8Array([0x50, 0x4b, 0x05, 0x06, 1, 2, 3, 4, 5, 6]);
  const result = await read(buildZip([
    { name: "archivo.txt", content: "ok" }
  ], { comment: fakeSignature }));

  assert.equal(result.summary.files, 1);
  assert.equal(result.metadata.totalEntries, 1);
});

test("rechaza archivo dañado", async () => {
  await assert.rejects(
    () => read(new Blob([new Uint8Array([1, 2, 3, 4])])),
    (error) => error && error.name === "ScanArchiveCorruptError"
  );
});

test("respeta el límite máximo de entradas", async () => {
  const zip = buildZip([
    { name: "a.txt", content: "a" },
    { name: "b.txt", content: "b" },
    { name: "c.txt", content: "c" }
  ]);

  await assert.rejects(
    () => read(zip, { maxEntries: 2 }),
    (error) => error && error.name === "ScanArchiveEntryLimitError"
  );
});

test("respeta cancelación antes de iniciar", async () => {
  const zip = buildZip([{ name: "a.txt", content: "a" }]);

  await assert.rejects(
    () => ArchiveReader.read(zip, {}, { isCancelled: () => true }),
    (error) => error && error.name === "ScanCancelledError"
  );
});

test("la autoprueba integrada finaliza correctamente", async () => {
  globalThis.window = globalThis;
  globalThis.AuditScan.Engine = {
    scan: async () => ({ entries: [], summary: {}, metadata: {} })
  };

  require("../audit/scan/scan.selftest.js");
  const report = await globalThis.AuditScan.SelfTest.ensure();

  assert.equal(report.status, "passed");
  assert.ok(report.checks.every((item) => item.passed));
});
