@echo off
echo ============================================================
echo  Iniciando servidor local para Digital Space Roll Book...
echo  Cuando abra el navegador, NO cierres esta ventana negra.
echo  Para detener el servidor, cierra esta ventana.
echo ============================================================
cd /d "%~dp0"
start http://localhost:8000
python -m http.server 8000
pause
