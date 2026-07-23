import pool from '../DataBase/Mysql/ConexionSQL.js';

async function check() {
    try {
        const [rows] = await pool.query('SELECT * FROM productos_almacen ORDER BY id_producto DESC LIMIT 3');
        console.log('Last products in MySQL:', rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();
