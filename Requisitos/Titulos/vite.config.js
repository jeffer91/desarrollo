/*
  Nombre completo: vite.config.js
  Ruta o ubicación: /Requisitos/Titulos/vite.config.js
  Función o funciones:
  - Configurar Vite para compilar las pantallas públicas de estudiante y coordinador.
  - Mantener fuera del build público la pantalla privada/local del administrador.
  - Preparar la salida de producción para Netlify en la carpeta dist.
  - Copiar los assets públicos del módulo, incluido el logo institucional.
  - Mantener rutas relativas y limpias para publicación en subcarpeta o dominio Netlify.
  Se conecta con:
  - package.json
  - netlify.toml
  - public/ta-titulo-articulo-estudiante.html
  - public/ta-titulo-articulo-coordinador.html
  - public/assets/logo-itsqmet.svg
*/

import { defineConfig } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  appType: "mpa",
  base: "/",
  publicDir: "public",
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: false,
    open: false
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: false
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    target: "es2020",
    modulePreload: {
      polyfill: true
    },
    rollupOptions: {
      input: {
        estudiante: resolve(rootDir, "public/ta-titulo-articulo-estudiante.html"),
        coordinador: resolve(rootDir, "public/ta-titulo-articulo-coordinador.html")
      },
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});
