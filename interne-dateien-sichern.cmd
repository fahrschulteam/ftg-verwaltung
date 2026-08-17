@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo.
echo ==========================================
echo   FTG Verwaltung - interne Dateien sichern
echo ==========================================
echo.
echo   Der Ordner "import" enthaelt echte Teilnehmer- und Firmendaten.
echo   Er liegt im veroeffentlichten Projektordner und koennte darum
echo   im Internet abrufbar sein.
echo.
echo   Die Skripte sind in Supabase laengst eingespielt und werden
echo   hier nicht mehr gebraucht. Dieses Programm verschiebt sie nach:
echo       %USERPROFILE%\Documents\FTG-Intern
echo   Geloescht wird nichts.
echo.

if not exist "schulung.html" (
  echo   [!] Diese Datei liegt im falschen Ordner.
  echo       Sie muss dort liegen, wo auch schulung.html liegt.
  echo.
  pause
  exit /b 1
)

if not exist "import" (
  echo   [i] Es gibt keinen Ordner "import" - nichts zu tun.
  echo.
  pause
  exit /b 0
)

set /p WEITER=Jetzt verschieben? (j/n):
if /i not "%WEITER%"=="j" (
  echo   Abgebrochen.
  pause
  exit /b 0
)

if not exist "%USERPROFILE%\Documents\FTG-Intern" mkdir "%USERPROFILE%\Documents\FTG-Intern"
move "import" "%USERPROFILE%\Documents\FTG-Intern\import"
if errorlevel 1 (
  echo.
  echo   [!] Verschieben fehlgeschlagen. Meist synchronisiert OneDrive gerade.
  echo       OneDrive pausieren und erneut starten.
) else (
  echo.
  echo   [ok] Verschoben nach %USERPROFILE%\Documents\FTG-Intern\import
  echo        Bitte anschliessend update.cmd starten, damit die
  echo        Aenderung auch im Internet ankommt.
)

echo.
pause
