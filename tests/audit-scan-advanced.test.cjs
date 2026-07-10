/* =========================================================
Nombre completo: audit-scan-advanced.test.cjs
Ruta o ubicación: /tests/audit-scan-advanced.test.cjs
Función o funciones:
- Validar inventario de ZIP64.
- Validar desplazamientos reales y declarados en ZIP autoextraíbles.
- Validar entradas con nombre vacío.
- Evitar confundir atributos Unix cuando el sistema creador es DOS.
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

function write64(target, offset, value) {
  let current = BigInt(value);
  for (let index = 0; index < 8; index += 1) {
    target[offset + index] = Number(current & 0xffn);
    current >>= 8n;
  }
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

function buildSingleEntryZip(options = {}) {
  const sourceName = Object.prototype.hasOwnProperty.call(options, "name")
    ? String(options.name)
    : "archivo.txt";
  const name = utf8(sourceName);
  const content = utf8(options.content || "ok");
  const checksum = crc32(content);
  const versionMadeBy = options.versionMadeBy == null ? 0x0314 : options.versionMadeBy;
  const externalAttributes = options.externalAttributes == null ? 0x81a40000 : options.externalAttributes;

  const localHeader = new Uint8Array(30);
  write32(localHeader, 0, 0x04034b50);
  write16(localHeader, 4, 20);
  write16(localHeader, 6, 0x0800);
  write16(localHeader, 8, 0);
  write16(localHeader, 10, 0);
  write16(localHeader, 12, 0);
  write32(localHeader, 14, checksum);
  write32(localHeader, 18, content.length);
  write32(localHeader, 22, content.length);
  write16(localHeader, 26, name.length);
  write16(localHeader, 28, 0);
  const local = concat([localHeader, name, content]);

  const centralHeader = new Uint8Array(46);
  write32(centralHeader, 0, 0x02014b50);
  write16(centralHeader, 4, versionMadeBy);
  write16(centralHeader, 6, 20);
  write16(centralHeader, 8, 0x0800);
  write16(centralHeader, 10, 0);
  write16(centralHeader, 12, 0);
  write16(centralHeader, 14, 0);
  write32(centralHeader, 16, checksum);
  write32(centralHeader, 20, content.length);
  write32(centralHeader, 24, content.length);
  write16(centralHeader, 28, name.length);
  write16(centralHeader, 30, 0);
  write16(centralHeader, 32, 0);
  write16(centralHeader, 34, 0);
  write16(centralHeader, 36, 0);
  write32(centralHeader, 38, externalAttributes);
  write32(centralHeader, 42, 0);
  const central = concat([centralHeader, name]);

  const end = new Uint8Array(22);
  write32(end, 0, 0x06054b50);
  write16(end, 4, 0);
  write16(end, 6, 0);
  write16(end, 8, 1);
  write16(end, 10, 1);
  write32(end, 12, central.length);
  write32(end, 16, local.length);
  write16(end, 20, 0);

  const prefix = options.prefix instanceof Uint8Array ? options.prefix : new Uint8Array(0);
  return new Blob([prefix, local, central, end], { type: "application/zip" });
}

function buildZip64() {
  const name = utf8("zip64.txt");
  const content = utf8("ok");
  const checksum = crc32(content);

  const localHeader = new Uint8Array(30);
  write32(localHeader, 0, 0x04034b50);
  write16(localHeader, 4, 45);
  write16(localHeader, 6, 0x0800);
  write16(localHeader, 8, 0);
  write32(localHeader, 14, checksum);
  write32(localHeader, 18, content.length);
  write32(localHeader, 22, content.length);
  write16(localHeader, 26, name.length);
  const local = concat([localHeader, name, content]);

  const centralHeader = new Uint8Array(46);
  write32(centralHeader, 0, 0x02014b50);
  write16(centralHeader, 4, 0x032d);
  write16(centralHeader, 6, 45);
  write16(centralHeader, 8, 0x0800);
  write16(centralHeader, 10, 0);
  write32(centralHeader, 16, checksum);
  write32(centralHeader, 20, content.length);
  write32(centralHeader, 24, content.length);
  write16(centralHeader, 28, name.length);
  write32(centralHeader, 38, 0x81a40000);
  write32(centralHeader, 42, 0);
  const central = concat([centralHeader, name]);

  const zip64Offset = local.length + central.length;
  const zip64End = new Uint8Array(56);
  write32(zip64End, 0, 0x06064b50);
  write64(zip64End, 4, 44n);
  write16(zip64End, 12, 45);
  write16(zip64End, 14, 45);
  write32(zip64End, 16, 0);
  write32(zip64End, 20, 0);
  write64(zip64End, 24, 1n);
  write64(zip64End, 32, 1n);
  write64(zip64End, 40, BigInt(central.length));
  write64(zip64End, 48, BigInt(local.length));

  const locator = new Uint8Array(20);
  write32(locator, 0, 0x07064b50);
  write32(locator, 4, 0);
  write64(locator, 8, BigInt(zip64Offset));
  write32(locator, 16, 1);

  const classicEnd = new Uint8Array(22);
  write32(classicEnd, 0, 0x06054b50);
  write16(classicEnd, 4, 0);
  write16(classicEnd, 6, 0);
  write16(classicEnd, 8, 0xffff);
  write16(classicEnd, 10, 0xffff);
  write32(classicEnd, 12, 0xffffffff);
  write32(classicEnd, 16, 0xffffffff);
  write16(classicEnd, 20, 0);

  return new Blob([local, central, zip64End, locator, classicEnd], { type: "application/zip" });
}

async function read(blob) {
  return ArchiveReader.read(blob, {
    maxEntries: 100,
    maxCentralDirectoryBytes: 4 * 1024 * 1024
  }, {
    isCancelled: () => false
  });
}

test("lee un ZIP64 y conserva sus metadatos", async () => {
  const result = await read(buildZip64());
  assert.equal(result.metadata.zip64, true);
  assert.equal(result.summary.files, 1);
  assert.equal(result.entries[0].sourcePath, "zip64.txt");
});

test("corrige el desplazamiento local de un ZIP autoextraíble", async () => {
  const prefix = utf8("PREFIJO-SFX");
  const result = await read(buildSingleEntryZip({ prefix }));
  const entry = result.entries.find((item) => item.type === "file");

  assert.equal(result.metadata.prependedBytes, prefix.length);
  assert.equal(entry.declaredLocalOffset, 0);
  assert.equal(entry.localOffset, prefix.length);
});

test("marca una entrada sin nombre como ruta inválida", async () => {
  const result = await read(buildSingleEntryZip({ name: "" }));
  const entry = result.entries[0];

  assert.equal(entry.sourcePath, "");
  assert.equal(entry.invalidPath, true);
  assert.equal(entry.unsafePath, true);
  assert.equal(entry.path, "[ruta-invalida]");
});

test("no interpreta atributos Unix cuando el sistema creador es DOS", async () => {
  const result = await read(buildSingleEntryZip({
    name: "archivo-dos.txt",
    versionMadeBy: 0x0014,
    externalAttributes: 0x40000020
  }));

  assert.equal(result.summary.files, 1);
  assert.equal(result.summary.folders, 0);
  assert.equal(result.entries[0].type, "file");
});
