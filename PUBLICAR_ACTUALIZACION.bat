@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul

title Publicar actualización - Desarrollo

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "ELECTRON_DIR=%ROOT_DIR%\electron"

echo.
echo =====================================================
echo   PUBLICAR ACTUALIZACION - DESARROLLO
echo =====================================================
echo.
echo Este proceso hará lo siguiente:
echo.
echo 1. Entrar a la carpeta electron.
echo 2. Revisar Node y npm.
echo 3. Leer GH_TOKEN desde Windows.
echo 4. Si no existe, pedirlo una sola vez y guardarlo.
echo 5. Subir automáticamente la versión PATCH.
echo 6. Compilar el instalador.
echo 7. Publicar la actualización en GitHub Releases.
echo.
echo Las apps instaladas se actualizarán cuando detecten esta nueva versión.
echo.

if not exist "%ELECTRON_DIR%\package.json" (
  echo ERROR: No se encontró este archivo:
  echo %ELECTRON_DIR%\package.json
  echo.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js no está instalado o no está agregado al PATH.
  echo Instala Node.js y vuelve a ejecutar este BAT.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm no está instalado o no está agregado al PATH.
  echo Instala Node.js y vuelve a ejecutar este BAT.
  echo.
  pause
  exit /b 1
)

where powershell >nul 2>nul
if errorlevel 1 (
  echo ERROR: PowerShell no está disponible en Windows.
  echo.
  pause
  exit /b 1
)

call :CARGAR_TOKEN

if not defined GH_TOKEN (
  call :PEDIR_Y_GUARDAR_TOKEN
)

if not defined GH_TOKEN (
  echo.
  echo ERROR: No se recibió GH_TOKEN.
  echo No se puede publicar en GitHub Releases sin token.
  echo.
  pause
  exit /b 1
)

set "GITHUB_TOKEN=%GH_TOKEN%"

cd /d "%ELECTRON_DIR%"

echo.
echo Carpeta actual:
cd
echo.

if not exist "node_modules" (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR: Falló npm install.
    echo.
    pause
    exit /b 1
  )
) else (
  echo Dependencias encontradas.
)

echo.
echo Subiendo versión automáticamente...
echo.

for /f "usebackq delims=" %%v in (`node -e "const fs=require('fs'); const p='package.json'; const pkg=JSON.parse(fs.readFileSync(p,'utf8')); const old=String(pkg.version||'1.0.0'); const a=old.split('.').map(n=>parseInt(n,10)||0); while(a.length<3)a.push(0); a[2]+=1; pkg.version=a.slice(0,3).join('.'); fs.writeFileSync(p, JSON.stringify(pkg,null,2)+String.fromCharCode(10)); console.log(pkg.version);"`) do set "NEW_VERSION=%%v"

if not defined NEW_VERSION (
  echo ERROR: No se pudo subir la versión en package.json.
  echo.
  pause
  exit /b 1
)

echo Nueva versión: %NEW_VERSION%

echo.
echo Limpiando compilación anterior...
if exist "dist" (
  rmdir /s /q "dist"
)

echo.
echo Compilando y publicando actualización...
echo.

call npx electron-builder --config builder.json --win nsis --x64 --publish always

if errorlevel 1 (
  echo.
  echo ERROR: No se pudo compilar o publicar la actualización.
  echo.
  echo Revisa:
  echo 1. Que tengas internet.
  echo 2. Que GH_TOKEN sea válido.
  echo 3. Que el repositorio GitHub exista.
  echo 4. Que no exista ya una release con esta misma versión.
  echo.
  pause
  exit /b 1
)

echo.
echo =====================================================
echo   ACTUALIZACION PUBLICADA CORRECTAMENTE
echo =====================================================
echo.
echo Versión publicada: %NEW_VERSION%
echo.
echo Las apps instaladas revisarán la actualización solas.
echo Si una app está abierta, descargará la actualización y la instalará al cerrar.
echo.
pause
exit /b 0

:CARGAR_TOKEN
if defined GH_TOKEN (
  exit /b 0
)

if defined GITHUB_TOKEN (
  set "GH_TOKEN=%GITHUB_TOKEN%"
  exit /b 0
)

for /f "usebackq delims=" %%t in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "[Environment]::GetEnvironmentVariable('GH_TOKEN','User')"`) do set "GH_TOKEN=%%t"

if defined GH_TOKEN (
  exit /b 0
)

for /f "usebackq delims=" %%t in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "[Environment]::GetEnvironmentVariable('GITHUB_TOKEN','User')"`) do set "GH_TOKEN=%%t"

exit /b 0

:PEDIR_Y_GUARDAR_TOKEN
echo.
echo No se encontró GH_TOKEN guardado en Windows.
echo.
echo Pega tu token nuevo de GitHub.
echo No se mostrará en pantalla mientras lo escribes.
echo Se guardará automáticamente para las próximas veces.
echo.

for /f "usebackq delims=" %%t in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=Read-Host 'GH_TOKEN' -AsSecureString; $b=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)} finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b)}"`) do set "GH_TOKEN=%%t"

if not defined GH_TOKEN (
  exit /b 1
)

set "GITHUB_TOKEN=%GH_TOKEN%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "[Environment]::SetEnvironmentVariable('GH_TOKEN', $env:GH_TOKEN, 'User'); [Environment]::SetEnvironmentVariable('GITHUB_TOKEN', $env:GH_TOKEN, 'User')"

echo.
echo GH_TOKEN guardado correctamente en Windows.
echo En próximas publicaciones ya no debería pedirlo.
echo.

exit /b 0