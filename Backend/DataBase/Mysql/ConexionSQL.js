import mysql from "mysql2/promise";
import picocolors from "picocolors";
import dotenv from "dotenv";
import { connectionCompras, statusconnectionCompras } from '../Acces/ConexionACCES.js';
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

async function repairSolicitudForeignKeys() {
  const connection = await pool.getConnection();

  try {
    const [badFkRows] = await connection.query(
      `SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'solicitudes_compra'
         AND REFERENCED_TABLE_NAME IS NOT NULL`
    );

    const badFk = badFkRows.find(row => row.REFERENCED_TABLE_NAME === 'detalles_solicitud');
    if (badFk) {
      console.warn(`[DB Repair] Eliminando FK incorrecta en solicitudes_compra: ${badFk.CONSTRAINT_NAME} -> ${badFk.REFERENCED_TABLE_NAME}`);
      await connection.query(`ALTER TABLE solicitudes_compra DROP FOREIGN KEY \`${badFk.CONSTRAINT_NAME}\``);
    }

    const [goodFkRows] = await connection.query(
      `SELECT CONSTRAINT_NAME
       FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = DATABASE()
         AND TABLE_NAME = 'detalles_solicitud'
         AND REFERENCED_TABLE_NAME = 'solicitudes_compra'`
    );

    if (!goodFkRows.length) {
      console.warn('[DB Repair] Reconstruyendo FK correcta desde detalles_solicitud -> solicitudes_compra');
      await connection.query(`
        ALTER TABLE detalles_solicitud
        ADD CONSTRAINT fk_detalle_solicitud
        FOREIGN KEY (id_solicitud) REFERENCES solicitudes_compra(id_solicitud)
        ON DELETE CASCADE ON UPDATE CASCADE
      `);
    }
  } catch (error) {
    console.error('[DB Repair] Error corrigiendo foreign keys de solicitudes:', error.message || error);
  } finally {
    connection.release();
  }
}

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

const parseAccessNReqCode = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;

  const match = text.match(/^([CSO])-(\d{4})-(\d+)$/i);
  if (!match) return null;

  const prefix = match[1].toUpperCase();
  const year = Number(match[2]);
  const counter = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(counter)) return null;

  const tipoMap = { C: 'Compra', O: 'Obra', S: 'Servicio' };
  return { tipo: tipoMap[prefix] || null, year, counter };
};

async function syncSolicitudCounterWithAccess(tipo_solicitud = 'Compra', year = getCurrentSolicitudYear()) {
  try {
    const accessOk = await statusconnectionCompras();
    if (!accessOk || !connectionCompras) return 0;

    const prefix = getSolicitudTypeLetter(tipo_solicitud);
    const rows = await connectionCompras.query(
      `SELECT [NReqCompra] FROM [REQCOMPRA] WHERE [NReqCompra] LIKE '${prefix}%'`
    );

    if (!rows || rows.length === 0) return 0;

    const accessCounters = rows
      .map((row) => parseAccessNReqCode(row.NReqCompra ?? row['NReqCompra']))
      .filter((value) => value && value.tipo === tipo_solicitud && Number(value.year) === Number(year))
      .map((value) => Number(value.counter));

    if (!accessCounters.length) return 0;
    return Math.max(...accessCounters);
  } catch (error) {
    console.warn(`[Counter] No se pudo sincronizar el contador de ${tipo_solicitud} con Access: ${error.message || error}`);
    return 0;
  }
}

export async function syncSolicitudCountersFromAccess() {
  const currentYear = getCurrentSolicitudYear();
  const tipoSolicitudes = ['Compra', 'Servicio', 'Obra'];
  const updates = {};

  for (const tipo of tipoSolicitudes) {
    const accessMaxCounter = await syncSolicitudCounterWithAccess(tipo, currentYear);
    if (!accessMaxCounter) continue;

    const [rows] = await pool.query(
      `SELECT contador FROM solicitud_counters WHERE tipo_solicitud = ? AND anio = ? LIMIT 1 FOR UPDATE`,
      [tipo, currentYear]
    );

    const currentCounter = rows.length > 0 ? Number(rows[0].contador || 0) : 0;
    if (accessMaxCounter <= currentCounter) continue;

    if (rows.length > 0) {
      await pool.query(
        `UPDATE solicitud_counters SET contador = ?, actualizado_en = CURRENT_TIMESTAMP WHERE tipo_solicitud = ? AND anio = ?`,
        [accessMaxCounter, tipo, currentYear]
      );
    } else {
      await pool.query(
        `INSERT INTO solicitud_counters (tipo_solicitud, anio, contador) VALUES (?, ?, ?)`,
        [tipo, currentYear, accessMaxCounter]
      );
    }

    updates[tipo] = accessMaxCounter;
  }

  return updates;
}

export async function getNextSolicitudCounter(tipo_solicitud = 'Compra') {
  const year = getCurrentSolicitudYear();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT contador FROM solicitud_counters WHERE tipo_solicitud = ? AND anio = ? LIMIT 1 FOR UPDATE`,
      [tipo_solicitud, year]
    );

    const accessMaxCounter = await syncSolicitudCounterWithAccess(tipo_solicitud, year);
    const currentCounter = rows.length > 0 ? Number(rows[0].contador || 0) : 0;
    const baseCounter = Math.max(currentCounter, accessMaxCounter);
    const nextCounter = baseCounter + 1;

    if (rows.length === 0) {
      await connection.query(
        `INSERT INTO solicitud_counters (tipo_solicitud, anio, contador) VALUES (?, ?, ?)`,
        [tipo_solicitud, year, nextCounter]
      );
      await connection.commit();
      return { counter: nextCounter, codigo: buildSolicitudCode(tipo_solicitud, year, nextCounter) };
    }

    if (accessMaxCounter > currentCounter) {
      console.log(`[Counter] Ajustando contador ${tipo_solicitud} ${year} con Access: ${currentCounter} -> ${accessMaxCounter}. Siguiente código: ${nextCounter}`);
    }

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

  await repairSolicitudForeignKeys();

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