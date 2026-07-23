import { connectionCompras, statusconnectionCompras } from '../DataBase/Acces/ConexionACCES.js';

async function check() {
    try {
        console.log('Comprobando conexión a Access (Compras)...');
        const ok = await statusconnectionCompras();
        if (!ok) return;

        console.log('Querying REQCOMPRA...');
        const headerRows = await connectionCompras.query('SELECT TOP 1 * FROM REQCOMPRA');
        if (headerRows.length > 0) {
            const row = headerRows[0];
            console.log('REQCOMPRA row:', row);
            for (const key of Object.keys(row)) {
                console.log(`Field: ${key}, Value: ${row[key]}, Type: ${typeof row[key]}`);
            }
        } else {
            console.log('REQCOMPRA is empty');
        }

        console.log('\nQuerying REQCOMPRADETALLE...');
        const detailRows = await connectionCompras.query('SELECT TOP 1 * FROM REQCOMPRADETALLE');
        if (detailRows.length > 0) {
            const row = detailRows[0];
            console.log('REQCOMPRADETALLE row:', row);
            for (const key of Object.keys(row)) {
                console.log(`Field: ${key}, Value: ${row[key]}, Type: ${typeof row[key]}`);
            }
        } else {
            console.log('REQCOMPRADETALLE is empty');
        }
    } catch (e) {
        console.error('Error querying Access:', e);
    }
}
check();
