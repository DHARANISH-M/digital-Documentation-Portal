@echo off
echo Pushing changes to GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo Error: Failed to push changes. Please check your internet connection and GitHub credentials.
) else (
    echo.
    echo Success: Changes pushed to GitHub! Vercel should update automatically in a few minutes.
)
pause
