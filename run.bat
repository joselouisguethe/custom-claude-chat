@echo off
setlocal EnableExtensions
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install it from https://nodejs.org/ and add it to your PATH.
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)

if /i "%~1"=="prod" (
  echo Building for production...
  call npm run build
  if errorlevel 1 exit /b 1
  echo.
  echo Starting production server...
  call npm run start
) else (
  echo Starting development server ^(http://localhost:3000^)...
  echo Pass "prod" as an argument to build and run in production mode.
  echo.
  call npm run dev
)

endlocal
