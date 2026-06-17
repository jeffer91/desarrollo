@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

REM =========================================================
REM Nombre completo: de_Visual_a_GitHub.bat
REM Ruta o ubicación: /de_Visual_a_GitHub.bat
REM Función o funciones:
REM - Subir toda la app local desde Visual Studio Code hacia GitHub.
REM - Reemplazar completamente el contenido de la rama main en GitHub.
REM - Crear una publicación limpia usando un commit nuevo.
REM - Forzar el push para que GitHub quede igual al proyecto local.
REM Con qué se une:
REM - Git instalado en Windows.
REM - Repositorio GitHub: jeffer91/desarrollo.
REM - Rama principal: main.
REM =========================================================

set "REPO_URL=https://github.com/jeffer91/desarrollo.git"
set "BRANCH=main"

REM =========================================================
REM CONFIGURACIÓN
REM =========================================================
REM NO = respeta .gitignore.
REM SI = intenta subir también archivos ignorados.
REM Recomendado: NO, para evitar subir node_modules, builds pesados o temporales.
set "SUBIR_ARCHIVOS_IGNORADOS=NO"

cls
echo ========================================================
echo       SUBIR TODO EL PROYECTO LOCAL A GITHUB
echo ========================================================
echo.
echo Repositorio destino:
echo %REPO_URL%
echo.
echo Rama destino:
echo %BRANCH%
echo.
echo Carpeta actual:
echo %~dp0
echo.
echo ADVERTENCIA:
echo Este proceso reemplazara el contenido actual de la rama %BRANCH%
echo en GitHub con lo que tienes ahora en esta carpeta local.
echo.
echo No borra tu carpeta local.
echo Si borra/reemplaza el contenido visible en GitHub para esta rama.
echo.

cd /d "%~dp0"

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: Git no esta instalado o no esta agregado al PATH.
  echo Instala Git para Windows y vuelve a intentar.
  echo.
  pause
  exit /b 1
)

echo Verificando carpeta del proyecto...
if not exist ".github" (
  echo ADVERTENCIA: No se encontro la carpeta .github en esta ubicacion.
  echo Asegurate de que este BAT este en la raiz real del proyecto.
  echo.
)

if not exist ".git" (
  echo Inicializando repositorio Git local...
  git init
  if errorlevel 1 goto ERROR_GENERAL
)

echo Configurando rama principal...
git branch -M %BRANCH% >nul 2>&1

echo Configurando remoto origin...
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  git remote add origin "%REPO_URL%"
) else (
  git remote set-url origin "%REPO_URL%"
)

if errorlevel 1 goto ERROR_GENERAL

echo.
echo ========================================================
echo CONFIRMACION OBLIGATORIA
echo ========================================================
echo Para continuar escribe exactamente:
echo SUBIR
echo.
set /p CONFIRMACION="Confirmacion: "

if /I not "%CONFIRMACION%"=="SUBIR" (
  echo.
  echo Proceso cancelado por el usuario.
  echo No se subio nada a GitHub.
  echo.
  pause
  exit /b 0
)

echo.
echo Activando soporte para rutas largas...
git config core.longpaths true

echo.
echo Creando rama temporal limpia...
set "TEMP_BRANCH=publicacion-total-%RANDOM%%RANDOM%"

git checkout --orphan "%TEMP_BRANCH%"
if errorlevel 1 goto ERROR_GENERAL

echo Limpiando indice Git...
git rm -r --cached . >nul 2>&1

echo.
echo Agregando archivos del proyecto local...

if /I "%SUBIR_ARCHIVOS_IGNORADOS%"=="SI" (
  echo Modo: subiendo tambien archivos ignorados.
  git add -A -f
) else (
  echo Modo: respetando .gitignore.
  git add -A
)

if errorlevel 1 goto ERROR_GENERAL

echo.
echo Creando commit limpio...
git commit -m "Subida completa desde Visual Studio Code - %DATE% %TIME%"
if errorlevel 1 (
  echo.
  echo No se pudo crear el commit.
  echo Puede que no existan cambios o que Git no tenga usuario configurado.
  echo.
  echo Si Git pide nombre y correo, ejecuta:
  echo git config --global user.name "Jefferson Villarreal"
  echo git config --global user.email "jeffersonvillarreal91@gmail.com"
  echo.
  pause
  exit /b 1
)

echo.
echo Reemplazando rama local %BRANCH%...
git branch -D "%BRANCH%" >nul 2>&1
git branch -m "%BRANCH%"
if errorlevel 1 goto ERROR_GENERAL

echo.
echo Subiendo a GitHub y reemplazando contenido remoto...
git push -u origin "%BRANCH%" --force
if errorlevel 1 goto ERROR_GENERAL

echo.
echo ========================================================
echo PROCESO COMPLETADO CORRECTAMENTE
echo ========================================================
echo GitHub fue actualizado con el contenido actual de esta carpeta.
echo Repositorio:
echo %REPO_URL%
echo.
echo Rama:
echo %BRANCH%
echo.
pause
exit /b 0

:ERROR_GENERAL
echo.
echo ========================================================
echo ERROR
echo ========================================================
echo No se pudo completar la subida.
echo.
echo Revisa:
echo 1. Que tengas internet.
echo 2. Que Git este instalado.
echo 3. Que tengas permiso sobre el repositorio jeffer91/desarrollo.
echo 4. Que GitHub te haya autenticado correctamente.
echo 5. Que la rama main permita push forzado.
echo.
pause
exit /b 1