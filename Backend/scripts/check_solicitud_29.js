import pool from '../DataBase/Mysql/ConexionSQL.js';

async function check() {
    try {
        const [soliRows] = await pool.query('SELECT * FROM solicitudes_compra WHERE id_solicitud = 29');
        console.log('Solicitud 29:', soliRows[0]);
        const [detailRows] = await pool.query('SELECT * FROM detalles_solicitud WHERE id_solicitud = 29');
        console.log('Detalles:', detailRows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();
