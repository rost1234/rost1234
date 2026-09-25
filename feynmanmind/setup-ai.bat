@echo off
REM ==========================================================================
REM  FeynmanMind - one-time AI setup (Supabase + Gemini) for Windows cmd.
REM  Run it from the feynmanmind folder:   setup-ai.bat
REM  You need: Node.js, a Supabase project, and a Gemini API key.
REM  Full guide (Hebrew): docs\AI-SETUP.md
REM ==========================================================================
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js is not installed. Install it from https://nodejs.org and run this again.
  goto :end
)
if not exist "supabase\functions\feynman-evaluate" (
  echo [X] Run this file from the feynmanmind folder.
  goto :end
)

echo.
echo  FeynmanMind AI setup
echo  --------------------
echo  1. Supabase Reference ID: Project Settings ^> General (e.g. abcdefghijklmnop)
echo  2. Gemini API key: https://aistudio.google.com/apikey (starts with AIza)
echo.
set /p REF=Supabase Reference ID: 
set /p GEMINI=Gemini API key: 
if "%REF%"=="" ( echo [X] Reference ID is required. & goto :end )
if "%GEMINI%"=="" ( echo [X] Gemini API key is required. & goto :end )

echo.
echo [1/4] Logging in to Supabase (a browser window will open)...
call npx --yes supabase@latest login || goto :fail

echo.
echo [2/4] Saving the Gemini key on your server (it never goes into the app)...
call npx --yes supabase@latest secrets set --project-ref %REF% LLM_PROVIDER=gemini "GEMINI_API_KEY=%GEMINI%" || goto :fail

echo.
echo [3/4] Deploying the AI functions...
for %%F in (feynman-evaluate generate-flashcards generate-course generate-lesson) do (
  echo   - %%F
  call npx --yes supabase@latest functions deploy %%F --project-ref %REF% --use-api --no-verify-jwt || goto :fail
)

echo.
echo [4/4] Done! Paste these two values in the app:
echo       Settings ^> AI connection ^> Save and test connection
echo.
echo   Server URL:       https://%REF%.supabase.co
echo   Publishable key:  (the sb_publishable_... key below)
echo.
call npx --yes supabase@latest projects api-keys --project-ref %REF%
goto :end

:fail
echo.
echo [X] Something failed above. Check the Reference ID and the key, then run setup-ai.bat again.

:end
echo.
pause
endlocal
