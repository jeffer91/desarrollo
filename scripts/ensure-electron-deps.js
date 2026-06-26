#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const electronDir = path.join(rootDir, 'electron');
const electronPackage = path.join(electronDir, 'package.json');
const electronModule = path.join(electronDir, 'node_modules', 'electron', 'package.json');
const electronBin = path.join(
  electronDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron.cmd' : 'electron'
);

function exists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function runNpmInstall() {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmCommand, ['install'], {
    cwd: electronDir,
    stdio: 'inherit'
  });

  if (result.error) {
    console.error('[desarrollo] No se pudo ejecutar npm install dentro de electron.');
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error('[desarrollo] Fallo la instalacion de dependencias de Electron.');
    process.exit(result.status || 1);
  }
}

if (!exists(electronPackage)) {
  console.error('[desarrollo] No existe electron/package.json. Revisa que la carpeta electron este completa.');
  process.exit(1);
}

if (exists(electronBin) || exists(electronModule)) {
  console.log('[desarrollo] Dependencias de Electron listas.');
  process.exit(0);
}

console.log('[desarrollo] Electron no esta instalado todavia dentro de la carpeta electron.');
console.log('[desarrollo] Instalando dependencias automaticamente...');
runNpmInstall();
console.log('[desarrollo] Electron listo. Continuando...');
