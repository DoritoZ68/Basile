@echo off
rem Double-cliquez sur ce fichier (Windows) pour lancer le serveur Vosges Velo.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js n est pas installe : https://nodejs.org & pause & exit /b 1)
node server.cjs
pause
