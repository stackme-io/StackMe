@echo off
title StackMe - Build and Push

echo.
echo ======================================
echo   StackMe - Build and Push
echo ======================================

:ask
echo.
set COMMIT_MSG=
set /p COMMIT_MSG=Commit message (or "q" to quit):

if /i "%COMMIT_MSG%"=="q" exit /b 0
if "%COMMIT_MSG%"=="" (
  echo [ERROR] Commit message cannot be empty.
  goto ask
)

echo.
echo [0/3] Checking for changes...
echo --------------------------------------

cd /d "D:\My projects\StackMe"
git status --porcelain > "%TEMP%\gitstatus.txt" 2>&1
set /p GIT_STATUS=<"%TEMP%\gitstatus.txt"

if "%GIT_STATUS%"=="" (
  echo [SKIP] Nothing to commit. No build needed.
  goto ask
)

echo [OK] Changes detected. Starting build...

echo.
echo [1/3] Building hub...
echo --------------------------------------

cd /d "D:\My projects\StackMe\apps\hub"
call npm run build

if %ERRORLEVEL% neq 0 (
  echo.
  echo [FAIL] Build failed. Fix errors and try again.
  goto ask
)

echo.
echo [2/3] Build OK. Committing...
echo --------------------------------------

cd /d "D:\My projects\StackMe"
git add .
git commit -m "%COMMIT_MSG%"

if %ERRORLEVEL% neq 0 (
  echo [WARN] Commit failed.
  goto ask
)

echo.
echo [3/3] Pushing...
echo --------------------------------------

git push

if %ERRORLEVEL% neq 0 (
  echo [FAIL] Push failed.
  goto ask
)

echo.
echo [OK] Done! Ready for next commit.
goto ask
