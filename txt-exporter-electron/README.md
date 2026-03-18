# TXT Exporter (Electron)

## Qué hace
- Eliges una carpeta raíz
- Escanea recursivamente
- Incluye solo: .html .js .css .json
- Excluye: node_modules, .git, dist, build, txt_convertidos
- Genera dentro de la raíz:
  - /txt_convertidos/
    - un .txt por archivo: archivo.ext.txt
    - todo.txt con separadores + nombre/ruta/código completo

## Ejecutar
1) Instalar dependencias:
   npm install

2) Ejecutar:
   npm start
