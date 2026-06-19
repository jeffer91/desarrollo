@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

REM =========================================================
REM Nombre completo: de_Visual_a_GitHub.bat
REM Ruta o ubicación: /desarrollo/de_Visual_a_GitHub.bat
REM Función:
REM - Subir el proyecto local completo a GitHub.
REM - Corregir Requisitos si Git lo tiene como submodulo.
REM - Forzar que Requisitos suba como carpeta real con sus archivos.
REM - Detenerse si Requisitos queda fuera del commit.
REM =========================================================

set "REPO_URL=https://github.com/jeffer91/desarrollo.git"
set "BRANCH=main"
set "CARPETA_CRITICA=Requisitos"

REM NO = respeta .gitignore para el resto del proyecto.
REM SI = intenta subir tambien archivos ignorados de todo el proyecto.
set "SUBIR_ARCHIVOS_IGNORADOS=NO"

REM Requisitos se fuerza siempre porque es la carpeta critica.
set "FORZAR_CARPETA_CRITICA=SI"

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

cd /d "%~dp0"

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: Git no esta instalado o no esta agregado al PATH.
  echo Instala Git para Windows y vuelve a intentar.
  echo.
  pause
  exit /b 1
)

if not exist ".git" (
  echo Inicializando repositorio Git local...
  git init
  if errorlevel 1 goto ERROR_GENERAL
)

if not exist "%CARPETA_CRITICA%\" (
  echo ERROR: No existe la carpeta critica:
  echo %CARPETA_CRITICA%
  echo.
  echo Este BAT debe estar en la raiz real del proyecto desarrollo.
  echo.
  pause
  exit /b 1
)

echo Activando soporte para rutas largas...
git config core.longpaths true

echo.
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
echo Revisando carpeta critica: %CARPETA_CRITICA%
call :CONTAR_ARCHIVOS "%CARPETA_CRITICA%" TOTAL_CRITICO

echo Archivos detectados dentro de %CARPETA_CRITICA%:
echo %TOTAL_CRITICO%
echo.

if "%TOTAL_CRITICO%"=="0" (
  echo ERROR: La carpeta %CARPETA_CRITICA% existe, pero no tiene archivos.
  echo Git no sube carpetas vacias.
  echo.
  pause
  exit /b 1
)

git ls-files -s -- "%CARPETA_CRITICA%" | findstr /B "160000" >nul
if not errorlevel 1 (
  echo ADVERTENCIA IMPORTANTE:
  echo Git tiene %CARPETA_CRITICA% como SUBMODULO.
  echo Por eso antes no subieron sus archivos reales.
  echo.
  echo Este BAT quitara solamente la metadata Git interna de esa carpeta,
  echo pero NO borrara los documentos de %CARPETA_CRITICA%.
  echo.
) else (
  echo %CARPETA_CRITICA% no aparece como submodulo en el indice actual.
  echo.
)

echo ========================================================
echo CONFIRMACION OBLIGATORIA
echo ========================================================
echo Para continuar escribe exactamente:
echo SUBIR
echo.
echo ADVERTENCIA:
echo Este proceso reemplazara la rama %BRANCH% en GitHub
echo con el contenido actual de esta carpeta local.
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
echo ========================================================
echo CORRIGIENDO ESTADO DE %CARPETA_CRITICA%
echo ========================================================

call :QUITAR_SUBMODULO "%CARPETA_CRITICA%"
if errorlevel 1 goto ERROR_GENERAL

call :QUITAR_GIT_INTERNO "%CARPETA_CRITICA%"
if errorlevel 1 goto ERROR_GENERAL

call :CONTAR_ARCHIVOS "%CARPETA_CRITICA%" TOTAL_CRITICO_FINAL

echo Archivos finales detectados dentro de %CARPETA_CRITICA%:
echo %TOTAL_CRITICO_FINAL%
echo.

if "%TOTAL_CRITICO_FINAL%"=="0" (
  echo ERROR: Despues de la correccion no se detectaron archivos en %CARPETA_CRITICA%.
  echo No se subira nada para evitar una publicacion incompleta.
  echo.
  pause
  exit /b 1
)

echo.
echo ========================================================
echo CREANDO PUBLICACION LIMPIA
echo ========================================================

set "TEMP_BRANCH=publicacion-total-%RANDOM%%RANDOM%"

echo Creando rama temporal limpia...
git checkout --orphan "%TEMP_BRANCH%"
if errorlevel 1 goto ERROR_GENERAL

echo Limpiando indice Git...
git rm -r --cached . >nul 2>&1

echo.
echo Agregando archivos del proyecto local...

if /I "%SUBIR_ARCHIVOS_IGNORADOS%"=="SI" (
  echo Modo general: subiendo tambien archivos ignorados.
  git add -A -f
) else (
  echo Modo general: respetando .gitignore.
  git add -A
)

if errorlevel 1 goto ERROR_GENERAL

if /I "%FORZAR_CARPETA_CRITICA%"=="SI" (
  echo Forzando subida completa de %CARPETA_CRITICA%...
  git add -A -f -- "%CARPETA_CRITICA%"
  if errorlevel 1 goto ERROR_GENERAL
)

echo.
echo Verificando que %CARPETA_CRITICA% NO siga como submodulo...
git ls-files -s -- "%CARPETA_CRITICA%" | findstr /B "160000" >nul
if not errorlevel 1 (
  echo ERROR: %CARPETA_CRITICA% todavia aparece como submodulo.
  echo No se subira para evitar repetir el error.
  echo.
  pause
  exit /b 1
)

call :CONTAR_ARCHIVOS_GIT "%CARPETA_CRITICA%" TOTAL_GIT_CRITICO

echo.
echo Archivos reales detectados en %CARPETA_CRITICA%:
echo %TOTAL_CRITICO_FINAL%
echo.
echo Archivos de %CARPETA_CRITICA% agregados al commit:
echo %TOTAL_GIT_CRITICO%
echo.

if %TOTAL_GIT_CRITICO% LSS %TOTAL_CRITICO_FINAL% (
  echo ERROR: No todos los archivos de %CARPETA_CRITICA% entraron al commit.
  echo Se cancela la subida para evitar GitHub incompleto.
  echo.
  echo Creando diagnostico_requisitos_no_agregados.txt...
  (
    echo === ESTADO DE %CARPETA_CRITICA% ===
    git status --short --ignored -uall -- "%CARPETA_CRITICA%"
    echo.
    echo === ARCHIVOS EN GIT ===
    git ls-files -- "%CARPETA_CRITICA%"
    echo.
    echo === IGNORADOS ===
    git check-ignore -v -n -- "%CARPETA_CRITICA%" "%CARPETA_CRITICA%/*" "%CARPETA_CRITICA%/**/*"
  ) > diagnostico_requisitos_no_agregados.txt 2>&1
  echo.
  pause
  exit /b 1
)

echo.
echo Creando commit limpio...
git commit -m "Subida completa desde Visual Studio Code - %DATE% %TIME%"
if errorlevel 1 (
  echo.
  echo No se pudo crear el commit.
  echo Puede que Git no tenga usuario configurado.
  echo.
  echo Ejecuta estos comandos una sola vez:
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
echo.
echo Verificacion importante:
echo %CARPETA_CRITICA% fue agregada como carpeta normal.
echo Archivos subidos desde %CARPETA_CRITICA%:
echo %TOTAL_GIT_CRITICO%
echo.
echo Repositorio:
echo %REPO_URL%
echo.
echo Rama:
echo %BRANCH%
echo.
pause
exit /b 0

:QUITAR_SUBMODULO
set "P=%~1"

echo Revisando enlace de submodulo en Git...

git ls-files -s -- "%P%" | findstr /B "160000" >nul
if not errorlevel 1 (
  echo Quitando %P% del indice como submodulo...
  git rm --cached -f -- "%P%" >nul 2>&1
)

if exist ".gitmodules" (
  echo Revisando .gitmodules...

  for /f "tokens=1,*" %%A in ('git config -f .gitmodules --get-regexp "submodule\..*\.path" 2^>nul') do (
    set "KEY=%%A"
    set "VAL=%%B"
    set "BORRAR_SECCION="

    if /I "!VAL!"=="%P%" set "BORRAR_SECCION=SI"
    if /I "!VAL!"=="./%P%" set "BORRAR_SECCION=SI"
    if /I "!VAL!"==".\%P%" set "BORRAR_SECCION=SI"

    if defined BORRAR_SECCION (
      set "SECTION=!KEY:.path=!"
      echo Quitando seccion !SECTION! de .gitmodules...
      git config -f .gitmodules --remove-section "!SECTION!" >nul 2>&1
    )
  )

  git config -f .gitmodules --get-regexp "submodule\..*\.path" >nul 2>&1
  if errorlevel 1 (
    echo Eliminando .gitmodules porque ya no tiene submodulos...
    del /f /q ".gitmodules" >nul 2>&1
  )
)

git config --remove-section "submodule.%P%" >nul 2>&1

exit /b 0

:QUITAR_GIT_INTERNO
set "P=%~1"

if exist "%P%\.git" (
  echo Separando metadata Git interna de %P%...

  set "STAMP=%DATE%_%TIME%"
  set "STAMP=!STAMP:/=-!"
  set "STAMP=!STAMP::=-!"
  set "STAMP=!STAMP: =_!"
  set "STAMP=!STAMP:,=-!"

  set "BACKUP_DIR=.git\backup_%P%_metadata_!STAMP!"
  mkdir "!BACKUP_DIR!" >nul 2>&1

  attrib -h -s -r "%P%\.git" /s /d >nul 2>&1
  move "%P%\.git" "!BACKUP_DIR!\dotgit" >nul 2>&1

  if errorlevel 1 (
    echo ERROR: No se pudo separar la metadata Git interna de %P%.
    echo Cierra VS Code y cualquier ventana que tenga abierta esa carpeta.
    echo Luego vuelve a ejecutar este BAT.
    echo.
    exit /b 1
  )

  echo Metadata Git interna movida a:
  echo !BACKUP_DIR!
  echo.
) else (
  echo No se encontro metadata Git interna dentro de %P%.
)

exit /b 0

:CONTAR_ARCHIVOS
set "RUTA=%~1"
set "%~2=0"

for /f %%C in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='%RUTA%'; if(Test-Path -LiteralPath $p){$files=Get-ChildItem -LiteralPath $p -Recurse -File -Force; @($files | Where-Object { $_.FullName -notmatch '\\.git(\\|$)' }).Count}else{0}"') do (
  set "%~2=%%C"
)

exit /b 0

:CONTAR_ARCHIVOS_GIT
set "RUTA=%~1"
set "%~2=0"

for /f %%C in ('git ls-files -- "%RUTA%" ^| find /c /v ""') do (
  set "%~2=%%C"
)

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
echo 6. Que ningun archivo de Requisitos este abierto o bloqueado.
echo.
pause
exit /b 1