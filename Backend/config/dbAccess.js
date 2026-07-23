/**
 * config/dbAccess.js
 * Configuración de conexión a la base de datos Microsoft Access.
 *
 * Instrucciones:
 *  1. Instala el driver ODBC de Access de 32 bits en el servidor Windows.
 *  2. Instala el paquete: npm install node-adodb
 *  3. Ajusta DBQ con la ruta absoluta a tu archivo .accdb / .mdb
 *  4. Si requieres contraseña: añade PWD=TuPassword; al DSN.
 */

// Ruta a tu base de datos Access (cambia esto)
const ACCESS_DB_PATH = process.env.ACCESS_DB_PATH || 'C:\\ruta\\a\\tu\\base_datos.accdb';

export const ACCESS_DSN = `Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${ACCESS_DB_PATH};Persist Security Info=False;`;

// Para archivos .mdb más antiguos usa:
// export const ACCESS_DSN = `Driver={Microsoft Access Driver (*.mdb)};DBQ=${ACCESS_DB_PATH};`;

export default { ACCESS_DSN, ACCESS_DB_PATH };
