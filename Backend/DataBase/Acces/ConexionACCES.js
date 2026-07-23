import ADODB from 'node-adodb'
import picocolors from 'picocolors';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { red, green } = picocolors;

const almacenPath = process.env.ACCESS_ALMACEN_PATH;
const comprasPath = process.env.ACCESS_COMPRAS_PATH;

function buildConnection(filePath, label) {
    if (!filePath) {
        console.error(red(`[ACCES] Variable de entorno no definida para: ${label}`));
        return null;
    }
    if (!fs.existsSync(filePath)) {
        console.error(red(`[ACCES] Archivo no encontrado: ${filePath}`));
        return null;
    }
    return ADODB.open(`Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${filePath};`);
}

const connection = buildConnection(almacenPath, 'ACCESS_ALMACEN_PATH');
const connectionCompras = buildConnection(comprasPath, 'ACCESS_COMPRAS_PATH');

async function statusconnection() {
    if (!connection) return false;
    try {
        await connection.query('SELECT * FROM tiporepuesto');
        console.log(green('[ACCES] Conexión Almacén exitosa'));
        return true;
    } catch (error) {
        console.error(red('[ACCES] Error al conectar Almacén:'), error?.message ?? error);
        return false;
    }
}

async function statusconnectionCompras() {
    if (!connectionCompras) return false;
    try {
        await connectionCompras.query('SELECT * FROM REQCOMPRA');
        console.log(green('[ACCES] Conexión Compras exitosa'));
        return true;
    } catch (error) {
        console.error(red('[ACCES] Error al conectar Compras:'), error?.message ?? error);
        return false;
    }
}

statusconnection();
statusconnectionCompras();

export { connection, statusconnection, connectionCompras, statusconnectionCompras };
