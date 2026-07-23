import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const sqlFile = path.join(process.cwd(), 'Backend', 'DataBase', 'Migracion', 'crear_usuario_permisos_y_seed.sql');

if (!fs.existsSync(sqlFile)) {
  console.error('No se encontró el archivo de migración:', sqlFile);
  process.exit(1);
}

const sql = fs.readFileSync(sqlFile, 'utf8');

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'proyecto-cvg',
  multipleStatements: true,
};

(async () => {
  try {
    const conn = await mysql.createConnection(config);
    console.log('Conectado a MySQL. Ejecutando migración...');
    const [result] = await conn.query(sql);
    console.log('Migración ejecutada correctamente.');
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('Error ejecutando migración:', err);
    process.exit(1);
  }
})();
