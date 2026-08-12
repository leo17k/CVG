import mysql from "mysql2/promise";
import picocolors from "picocolors";
import dotenv from "dotenv";
dotenv.config();
const { red, green, bold, yellow, blueBright } = picocolors;
export let statusconnectionsql = false
const conexionDATA = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  supportBigNumbers: true,
  bigNumberStrings: false,
  multipleStatements: true

}

const pool = mysql.createPool(conexionDATA)

try {
  const connection = await pool.getConnection();
  statusconnectionsql = true
  console.log(green("Conexión a la base de datos exitosa."));

  // Crear tabla de permisos de edición temporal si no existe
  await connection.query(`
    CREATE TABLE IF NOT EXISTS solicitudes_edicion_permisos (
      id_solicitud INT NOT NULL,
      id_usuario INT UNSIGNED NOT NULL,
      fecha_concedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id_solicitud, id_usuario),
      FOREIGN KEY (id_solicitud) REFERENCES solicitudes_compra(id_solicitud) ON DELETE CASCADE,
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);
  console.log(green("Tabla solicitudes_edicion_permisos verificada/creada."));

  // Crear columna activo si no existe en la tabla usuarios
  try {
    await connection.query(`ALTER TABLE usuarios ADD COLUMN activo TINYINT(1) DEFAULT 1`);
    console.log(green("Columna activo en tabla usuarios verificada/añadida."));
  } catch (e) {
    // Ignorar si la columna ya existe
  }
  
  connection.release();
}
catch (err) {
  console.error(red("Error al conectar a la base de datos:", err.message));
}


export default pool;