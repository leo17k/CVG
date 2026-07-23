@off
title Iniciando Entorno de Desarrollo - XAMPP
cls

echo ==================================================
echo   INICIANDO SERVICIOS DE XAMPP (Apache y MySQL)   
echo ==================================================

:: 1. Iniciar Apache en segundo plano
echo [1/3] Arrancando Apache...
start "" "C:\xampp\xampp_start.exe"
timeout /t 2 /nobreak > nul

:: 2. Iniciar MySQL de forma directa si xampp_start no lo activa
echo [2/3] Verificando base de datos MySQL...
start "" "C:\xampp\mysql\bin\mysqld.exe"
timeout /t 3 /nobreak > nul

echo ==================================================
echo   2. INICIANDO SERVIDOR NODE.JS (Backend)   
echo ==================================================
echo [Node] Ejecutando npm run server...
:: Abre una nueva ventana de comandos, va a la carpeta del proyecto y corre el servidor
start "Servidor Backend" cmd /k "npm run dev"
timeout /t 3 /nobreak > nul

echo ==================================================
echo   ABRIENDO EL NAVEGADOR
echo ==================================================

:: 3. Abrir tu navegador en el puerto de tu backend Node o tu Frontend Vite/Localhost
:: Modifica la URL de abajo por la que uses habitualmente (ej. http://localhost:5173 o http://localhost:5000)
echo [3/3] Abriendo aplicacion en el navegador...
start "" "http://localhost:4173"

echo.
echo [OK] ¡Todo listo! Puedes cerrar esta ventana.
timeout /t 3 > nul
exit