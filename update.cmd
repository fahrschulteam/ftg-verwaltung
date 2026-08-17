@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo.
echo ==========================================
echo   FTG Verwaltung aktualisieren
echo ==========================================
echo.

rem --- 1) Neue Dateien aus dem Downloads-Ordner uebernehmen -----------------
set GEFUNDEN=0
if exist "%USERPROFILE%\Downloads\ki.js" (
  copy /Y "%USERPROFILE%\Downloads\ki.js" "functions\ki.js" >nul
  echo   [ok] ki.js uebernommen
  set GEFUNDEN=1
)
if exist "%USERPROFILE%\Downloads\monitor-check.ts" (
  copy /Y "%USERPROFILE%\Downloads\monitor-check.ts" "supabase\functions\monitor-check\index.ts" >nul
  echo   [ok] monitor-check.ts uebernommen
  set GEFUNDEN=1
)
if exist "%USERPROFILE%\Downloads\wettbewerb-recherche.ts" (
  if not exist "supabase\functions\wettbewerb-recherche" mkdir "supabase\functions\wettbewerb-recherche"
  copy /Y "%USERPROFILE%\Downloads\wettbewerb-recherche.ts" "supabase\functions\wettbewerb-recherche\index.ts" >nul
  echo   [ok] wettbewerb-recherche.ts uebernommen
  set GEFUNDEN=1
)
if exist "%USERPROFILE%\Downloads\schulung.html" (
  copy /Y "%USERPROFILE%\Downloads\schulung.html" "schulung.html" >nul
  echo   [ok] schulung.html uebernommen
  set GEFUNDEN=1
)
if "%GEFUNDEN%"=="0" echo   [i] Keine neuen Dateien in Downloads - es wird der aktuelle Stand veroeffentlicht.

rem --- 2) Website und Netlify-Functions veroeffentlichen --------------------
echo.
echo --- Netlify (Verwaltung) -----------------------------------------------
call netlify deploy --prod
if errorlevel 1 (
  echo.
  echo   [!] Netlify-Deploy fehlgeschlagen. Bitte Meldung oben pruefen.
  goto ende
)

rem --- 3) Supabase Edge Functions veroeffentlichen --------------------------
echo.
echo --- Supabase (monitor-check) -------------------------------------------
call npx --yes supabase functions deploy monitor-check --project-ref ejuhpgcwskyqwheinlub
echo.
echo --- Supabase (wettbewerb-recherche) ------------------------------------
if exist "supabase\functions\wettbewerb-recherche\index.ts" (
  call npx --yes supabase functions deploy wettbewerb-recherche --project-ref ejuhpgcwskyqwheinlub
)
if errorlevel 1 (
  echo.
  echo   [!] Supabase-Deploy fehlgeschlagen.
  echo       Beim ersten Mal ist eine einmalige Anmeldung noetig:
  echo       npx --yes supabase login
)

:ende
echo.
echo ==========================================
echo   Fertig.
echo ==========================================
pause
