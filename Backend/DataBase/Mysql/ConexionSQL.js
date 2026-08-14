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

export const getSolicitudTypeLetter = (tipo_solicitud = 'Compra') => {
  const normalized = String(tipo_solicitud || 'Compra').trim().toLowerCase();
  if (normalized === 'obra') return 'O';
  if (normalized === 'servicio') return 'S';
  return 'C';
};

export const getCurrentSolicitudYear = () => new Date().getFullYear();

export const buildSolicitudCode = (tipo_solicitud = 'Compra', year = getCurrentSolicitudYear(), counter = 0) => {
  return `${getSolicitudTypeLetter(tipo_solicitud)}-${year}-${counter}`;
};

export async function getNextSolicitudCounter(tipo_solicitud = 'Compra') {
  const year = getCurrentSolicitudYear();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT contador FROM solicitud_counters WHERE tipo_solicitud = ? AND anio = ? LIMIT 1 FOR UPDATE`,
      [tipo_solicitud, year]
    );

    if (rows.length === 0) {
      await connection.query(
        `INSERT INTO solicitud_counters (tipo_solicitud, anio, contador) VALUES (?, ?, 1)`,
        [tipo_solicitud, year]
      );
      await connection.commit();
      return { counter: 1, codigo: buildSolicitudCode(tipo_solicitud, year, 1) };
    }

    const nextCounter = Number(rows[0].contador || 0) + 1;
    await connection.query(
      `UPDATE solicitud_counters SET contador = ?, actualizado_en = CURRENT_TIMESTAMP WHERE tipo_solicitud = ? AND anio = ?`,
      [nextCounter, tipo_solicitud, year]
    );

    await connection.commit();
    return { counter: nextCounter, codigo: buildSolicitudCode(tipo_solicitud, year, nextCounter) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

try {
  const connection = await pool.getConnection();
  statusconnectionsql = true
  console.log(green("Conexión a la base de datos exitosa."));

  await connection.query(`
    CREATE TABLE IF NOT EXISTS solicitud_counters (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tipo_solicitud ENUM('Compra','Servicio','Obra') NOT NULL,
      anio INT NOT NULL,
      contador INT NOT NULL DEFAULT 0,
      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_solicitud_counter (tipo_solicitud, anio)
    ) ENGINE=InnoDB;
  `);
  console.log(green("Tabla solicitud_counters verificada/creada."));

  await connection.query(`
    CREATE TABLE IF NOT EXISTS sistema_configuracion (
      clave VARCHAR(100) PRIMARY KEY,
      valor TEXT NOT NULL,
      descripcion TEXT NULL,
      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await connection.query(`
    INSERT INTO sistema_configuracion (clave, valor, descripcion)
    VALUES ('solicitudes_auto_reset', '1', 'Reinicia el contador anual automáticamente al cambiar de año.')
    ON DUPLICATE KEY UPDATE valor = VALUES(valor), descripcion = VALUES(descripcion)
  `);
  console.log(green("Tabla sistema_configuracion verificada/creada."));

  try {
    await connection.query(`ALTER TABLE solicitudes_compra ADD COLUMN codigo_solicitud VARCHAR(40) NULL AFTER tipo_solicitud`);
    console.log(green("Columna codigo_solicitud en solicitudes_compra verificada/añadida."));
  } catch (e) {
    // Ignorar si la columna ya existe
  }

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

  // Crear columna cedula si no existe en la tabla usuarios
  try {
    await connection.query(`ALTER TABLE usuarios ADD COLUMN cedula VARCHAR(30) NULL AFTER email`);
    console.log(green("Columna cedula en tabla usuarios verificada/añadida."));
  } catch (e) {
    // Ignorar si la columna ya existe
  }
  
  connection.release();
}
catch (err) {
  console.error(red("Error al conectar a la base de datos:", err.message));
}


export default pool;