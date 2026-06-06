@echo off
title StackMe - Build and Push

echo.
echo ======================================
echo   StackMe - Build and Push
echo ======================================
echo.

set /p COMMIT_MSG=Commit message:

if "%COMMIT_MSG%"=="" (
  echo [ERROR] Commit message cannot be empty.
  pause
  exit /b 1
)

echo.
echo [1/3] Building hub...
echo --------------------------------------

cd /d "D:\My projects\StackMe\apps\hub"
call npm run build

if %ERRORLEVEL% neq 0 (
  echo.
  echo ======================================
  echo [FAIL] Build failed. See errors above.
  echo ======================================
  pause
  exit /b 1
)

echo.
echo [2/3] Build OK. Committing...
echo --------------------------------------

cd /d "D:\My projects\StackMe"
git add .
git commit -m "%COMMIT_MSG%"

if %ERRORLEVEL% neq 0 (
  echo.
  echo [WARN] Nothing to commit or commit failed.
  pause
  exit /b 1
)

echo.
echo [3/3] Pushing...
echo --------------------------------------

git push

if %ERRORLEVEL% neq 0 (
  echo.
  echo [FAIL] Push failed.
  pause
  exit /b 1
)

echo.
echo ======================================
echo [OK] Built, committed and pushed!
echo ======================================
echo.
timeout /t 5
