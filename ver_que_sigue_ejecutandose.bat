@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Diagnostico completo segundo plano

set "PROJECT_ROOT=%~dp0"
set "DOWNLOADS=%USERPROFILE%\Downloads"

if not exist "%DOWNLOADS%" (
  set "DOWNLOADS=%~dp0"
)

for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "STAMP=%%I"

set "REPORT=%DOWNLOADS%\reporte_segundo_plano_COMPLETO_%STAMP%.txt"
set "PSFILE=%TEMP%\diagnostico_segundo_plano_%STAMP%.ps1"

echo Creando diagnostico...
echo.

> "%PSFILE%" echo $ErrorActionPreference = "Continue"
>> "%PSFILE%" echo $projectRoot = $env:PROJECT_ROOT
>> "%PSFILE%" echo $report = $env:REPORT
>> "%PSFILE%" echo function Add-Line($text = "") { Add-Content -Path $report -Value $text -Encoding UTF8 }
>> "%PSFILE%" echo function Add-Title($text) {
>> "%PSFILE%" echo   Add-Line ""
>> "%PSFILE%" echo   Add-Line "========================================================="
>> "%PSFILE%" echo   Add-Line $text
>> "%PSFILE%" echo   Add-Line "========================================================="
>> "%PSFILE%" echo }
>> "%PSFILE%" echo function Safe($value) {
>> "%PSFILE%" echo   if ($null -eq $value) { return "" }
>> "%PSFILE%" echo   return [string]$value
>> "%PSFILE%" echo }
>> "%PSFILE%" echo if (Test-Path $report) { Remove-Item $report -Force }
>> "%PSFILE%" echo Add-Line "========================================================="
>> "%PSFILE%" echo Add-Line "REPORTE COMPLETO DE SEGUNDO PLANO"
>> "%PSFILE%" echo Add-Line "========================================================="
>> "%PSFILE%" echo Add-Line ("Fecha y hora: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
>> "%PSFILE%" echo Add-Line ("Carpeta del proyecto: " + $projectRoot)
>> "%PSFILE%" echo Add-Line ("Reporte creado en: " + $report)
>> "%PSFILE%" echo Add-Line ("Usuario Windows: " + $env:USERNAME)
>> "%PSFILE%" echo Add-Line ("Equipo: " + $env:COMPUTERNAME)
>> "%PSFILE%" echo Add-Line ""

>> "%PSFILE%" echo Add-Title "1) PROCESOS DIRECTAMENTE RELACIONADOS CON LA APP"
>> "%PSFILE%" echo $keywords = @(
>> "%PSFILE%" echo   "desarrollo",
>> "%PSFILE%" echo   "titulacion",
>> "%PSFILE%" echo   "electron",
>> "%PSFILE%" echo   "electron-main.js",
>> "%PSFILE%" echo   "titulacion.html",
>> "%PSFILE%" echo   "eventos",
>> "%PSFILE%" echo   "background.html",
>> "%PSFILE%" echo   "npm start"
>> "%PSFILE%" echo )
>> "%PSFILE%" echo $all = Get-CimInstance Win32_Process
>> "%PSFILE%" echo $related = @()
>> "%PSFILE%" echo foreach ($p in $all) {
>> "%PSFILE%" echo   $cmd = Safe $p.CommandLine
>> "%PSFILE%" echo   $path = Safe $p.ExecutablePath
>> "%PSFILE%" echo   $name = Safe $p.Name
>> "%PSFILE%" echo   $text = ($cmd + " " + $path + " " + $name).ToLower()
>> "%PSFILE%" echo   $hit = $false
>> "%PSFILE%" echo   foreach ($k in $keywords) {
>> "%PSFILE%" echo     if ($text.Contains($k.ToLower())) { $hit = $true }
>> "%PSFILE%" echo   }
>> "%PSFILE%" echo   if ($projectRoot -and $text.Contains($projectRoot.ToLower())) { $hit = $true }
>> "%PSFILE%" echo   if ($hit) { $related += $p }
>> "%PSFILE%" echo }
>> "%PSFILE%" echo if ($related.Count -eq 0) {
>> "%PSFILE%" echo   Add-Line "NO SE ENCONTRARON PROCESOS RELACIONADOS CON LA APP."
>> "%PSFILE%" echo } else {
>> "%PSFILE%" echo   foreach ($p in $related) {
>> "%PSFILE%" echo     $gp = Get-Process -Id $p.ProcessId -ErrorAction SilentlyContinue
>> "%PSFILE%" echo     $parent = Get-CimInstance Win32_Process -Filter ("ProcessId=" + $p.ParentProcessId) -ErrorAction SilentlyContinue
>> "%PSFILE%" echo     $title = ""
>> "%PSFILE%" echo     if ($gp) { $title = Safe $gp.MainWindowTitle }
>> "%PSFILE%" echo     $estado = "SIN VENTANA / POSIBLE SEGUNDO PLANO"
>> "%PSFILE%" echo     if ($title.Trim().Length -gt 0) { $estado = "VISIBLE" }
>> "%PSFILE%" echo     Add-Line "---------------------------------------------------------"
>> "%PSFILE%" echo     Add-Line ("PID: " + $p.ProcessId)
>> "%PSFILE%" echo     Add-Line ("Proceso: " + $p.Name)
>> "%PSFILE%" echo     Add-Line ("Estado: " + $estado)
>> "%PSFILE%" echo     Add-Line ("Ventana: " + $title)
>> "%PSFILE%" echo     Add-Line ("Padre PID: " + $p.ParentProcessId)
>> "%PSFILE%" echo     if ($parent) { Add-Line ("Proceso padre: " + $parent.Name) } else { Add-Line "Proceso padre: no disponible" }
>> "%PSFILE%" echo     Add-Line ("Ruta: " + (Safe $p.ExecutablePath))
>> "%PSFILE%" echo     Add-Line ("Comando: " + (Safe $p.CommandLine))
>> "%PSFILE%" echo   }
>> "%PSFILE%" echo }

>> "%PSFILE%" echo Add-Title "2) TODOS LOS PROCESOS ELECTRON / NODE / NPM / CMD ACTIVOS"
>> "%PSFILE%" echo $baseNames = @("electron.exe", "node.exe", "npm.exe", "cmd.exe", "powershell.exe", "pwsh.exe")
>> "%PSFILE%" echo $base = $all ^| Where-Object { $baseNames -contains $_.Name.ToLower() } ^| Sort-Object ProcessId
>> "%PSFILE%" echo if (($base ^| Measure-Object).Count -eq 0) {
>> "%PSFILE%" echo   Add-Line "NO HAY electron.exe, node.exe, npm.exe, cmd.exe ni powershell.exe activos."
>> "%PSFILE%" echo } else {
>> "%PSFILE%" echo   foreach ($p in $base) {
>> "%PSFILE%" echo     $gp = Get-Process -Id $p.ProcessId -ErrorAction SilentlyContinue
>> "%PSFILE%" echo     $title = ""
>> "%PSFILE%" echo     if ($gp) { $title = Safe $gp.MainWindowTitle }
>> "%PSFILE%" echo     $estado = "SIN VENTANA / SEGUNDO PLANO"
>> "%PSFILE%" echo     if ($title.Trim().Length -gt 0) { $estado = "VISIBLE" }
>> "%PSFILE%" echo     Add-Line "---------------------------------------------------------"
>> "%PSFILE%" echo     Add-Line ("PID: " + $p.ProcessId)
>> "%PSFILE%" echo     Add-Line ("Proceso: " + $p.Name)
>> "%PSFILE%" echo     Add-Line ("Estado: " + $estado)
>> "%PSFILE%" echo     Add-Line ("Ventana: " + $title)
>> "%PSFILE%" echo     Add-Line ("Ruta: " + (Safe $p.ExecutablePath))
>> "%PSFILE%" echo     Add-Line ("Comando: " + (Safe $p.CommandLine))
>> "%PSFILE%" echo   }
>> "%PSFILE%" echo }

>> "%PSFILE%" echo Add-Title "3) VENTANAS VISIBLES"
>> "%PSFILE%" echo $visible = Get-Process ^| Where-Object { $_.MainWindowTitle } ^| Sort-Object ProcessName
>> "%PSFILE%" echo if (($visible ^| Measure-Object).Count -eq 0) {
>> "%PSFILE%" echo   Add-Line "NO SE ENCONTRARON VENTANAS VISIBLES."
>> "%PSFILE%" echo } else {
>> "%PSFILE%" echo   foreach ($v in $visible) {
>> "%PSFILE%" echo     Add-Line "---------------------------------------------------------"
>> "%PSFILE%" echo     Add-Line ("PID: " + $v.Id)
>> "%PSFILE%" echo     Add-Line ("Proceso: " + $v.ProcessName)
>> "%PSFILE%" echo     Add-Line ("Ventana: " + $v.MainWindowTitle)
>> "%PSFILE%" echo   }
>> "%PSFILE%" echo }

>> "%PSFILE%" echo Add-Title "4) TAREAS DE INICIO DE WINDOWS RELACIONADAS"
>> "%PSFILE%" echo try {
>> "%PSFILE%" echo   $startup = Get-CimInstance Win32_StartupCommand
>> "%PSFILE%" echo   $startupRelated = @()
>> "%PSFILE%" echo   foreach ($s in $startup) {
>> "%PSFILE%" echo     $txt = ((Safe $s.Name) + " " + (Safe $s.Command) + " " + (Safe $s.Location)).ToLower()
>> "%PSFILE%" echo     foreach ($k in $keywords) {
>> "%PSFILE%" echo       if ($txt.Contains($k.ToLower())) { $startupRelated += $s; break }
>> "%PSFILE%" echo     }
>> "%PSFILE%" echo   }
>> "%PSFILE%" echo   if ($startupRelated.Count -eq 0) {
>> "%PSFILE%" echo     Add-Line "NO SE ENCONTRARON TAREAS DE INICIO RELACIONADAS."
>> "%PSFILE%" echo   } else {
>> "%PSFILE%" echo     foreach ($s in $startupRelated) {
>> "%PSFILE%" echo       Add-Line "---------------------------------------------------------"
>> "%PSFILE%" echo       Add-Line ("Nombre: " + (Safe $s.Name))
>> "%PSFILE%" echo       Add-Line ("Comando: " + (Safe $s.Command))
>> "%PSFILE%" echo       Add-Line ("Ubicación: " + (Safe $s.Location))
>> "%PSFILE%" echo       Add-Line ("Usuario: " + (Safe $s.User))
>> "%PSFILE%" echo     }
>> "%PSFILE%" echo   }
>> "%PSFILE%" echo } catch {
>> "%PSFILE%" echo   Add-Line ("No se pudo revisar inicio de Windows: " + $_.Exception.Message)
>> "%PSFILE%" echo }

>> "%PSFILE%" echo Add-Title "5) RESUMEN FINAL"
>> "%PSFILE%" echo Add-Line ("Procesos relacionados encontrados: " + $related.Count)
>> "%PSFILE%" echo Add-Line ("Procesos Electron/Node/NPM/CMD/PowerShell encontrados: " + (($base ^| Measure-Object).Count))
>> "%PSFILE%" echo Add-Line ""
>> "%PSFILE%" echo if ($related.Count -eq 0) {
>> "%PSFILE%" echo   Add-Line "RESULTADO: No se detecta la app funcionando en segundo plano por procesos relacionados."
>> "%PSFILE%" echo } else {
>> "%PSFILE%" echo   Add-Line "RESULTADO: Sí hay procesos relacionados que pueden explicar el segundo plano."
>> "%PSFILE%" echo   Add-Line "Pega este TXT completo en ChatGPT para revisar cuál proceso lo causa."
>> "%PSFILE%" echo }
>> "%PSFILE%" echo Add-Line ""
>> "%PSFILE%" echo Add-Line "FIN DEL REPORTE"

set "REPORT=%REPORT%"
set "PROJECT_ROOT=%PROJECT_ROOT%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%PSFILE%" >nul 2>&1

echo.
echo =========================================================
echo REPORTE CREADO
echo =========================================================
echo.
echo TXT creado en:
echo %REPORT%
echo.
echo Se abrirá ahora.
echo Verifica que al final diga: FIN DEL REPORTE
echo.

start notepad "%REPORT%"

pause