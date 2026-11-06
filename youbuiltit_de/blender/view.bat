@echo off
chcp 65001 >nul
rem Open a scene in the Blender window and keep it in sync with the file.
rem Usage: view.bat [scene.py] [engine] [samples] [GPU|CPU]   -- or just double-click.
cd /d "%~dp0"
set BL=
for /d %%D in ("C:\Program Files\Blender Foundation\Blender*") do if exist "%%D\blender.exe" set BL=%%D\blender.exe
if "%BL%"=="" ( echo Blender ne najden. & pause & exit /b 1 )
set SCENE=%1
if "%SCENE%"=="" set SCENE=castle_test.py
start "" "%BL%" --python view.py -- %SCENE% %2 %3 %4
