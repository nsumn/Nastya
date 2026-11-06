@echo off
chcp 65001 >nul
rem Test render of the castle scene on this computer's video card. Double-click to run.
cd /d "%~dp0"
set BL=
for /d %%D in ("C:\Program Files\Blender Foundation\Blender*") do if exist "%%D\blender.exe" set BL=%%D\blender.exe
if "%BL%"=="" ( echo Blender ne najden. Ustanovi Blender 4.2 LTS s blender.org i zapusti snova. & pause & exit /b 1 )
echo Blender: %BL%
echo.
echo === 1/2 Cycles na videokarte, 64 samples ===
"%BL%" -b -P castle_test.py -- CYCLES 64 "%CD%\gpu_cycles.png" GPU 2>&1 | findstr /C:"GPU_BACKEND" /C:"RENDER_SECONDS" /C:"Error"
echo.
echo === 2/2 Eevee, 32 samples ===
"%BL%" -b -P castle_test.py -- BLENDER_EEVEE_NEXT 32 "%CD%\gpu_eevee.png" 2>&1 | findstr /C:"RENDER_SECONDS" /C:"Error"
echo.
echo Gotovo. Kartinki: gpu_cycles.png i gpu_eevee.png v etoj papke. Prishli Claude stroki RENDER_SECONDS i GPU_BACKEND.
pause
