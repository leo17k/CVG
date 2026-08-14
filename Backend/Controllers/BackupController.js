/**
 * BackupController.js — Versión portable unificada sin dependencias globales
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysqldump from 'mysqldump';
// Importamos mysql2 para ejecutar la restauración de forma directa por código
import mysql from 'mysql2/promise';
import pool from '../DataBase/Mysql/ConexionSQL.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '..');
const BACKUPS_DIR = path.resolve(projectRoot, 'backups');
const DB_NAME = process.env.DB_NAME || 'cvg-p'; // Ajustado a 'cvg' basado en tu esquema actual
const DB_USER = process.env.DB_USER || 'root';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PASS = process.env.DB_PASS || '';

// Middleware interno de protección de roles
const esAdmin = (req) => {
  if (!req.session?.isLoggedIn) return false;
  const idRol = Number(req.session.rol);
  return idRol === 5 || idRol === 11;
};

const ensureDir = () => {
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
};

// =========================================================================
// 1. GET /api/backup/list
// =========================================================================
export const listBackups = (req, res) => {
  if (!esAdmin(req)) return res.status(403).json({ error: 'No autorizado.' });

  ensureDir();

  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.sql'))
      .map(f => {
        const stats = fs.statSync(path.join(BACKUPS_DIR, f));
        return {
          name: f,
          size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          date: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.json({ ok: true, backups: files });
  } catch (err) {
    console.error('[BackupController] Error listando:', err.message);
    return res.status(500).json({ error: 'No se pudieron leer los puntos de restauración.' });
  }
};

// =========================================================================
// 2. GET /api/backup/export?destino=server|download
// =========================================================================
export const exportBackup = async (req, res) => {
  if (!esAdmin(req)) return res.status(403).json({ error: 'No autorizado.' });

  const destino = (req.query.destino || 'server').toLowerCase();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `CVG_Backup_${timestamp}.sql`;

  ensureDir();
  const filePath = path.join(BACKUPS_DIR, fileName);

  try {
    await mysqldump({
      connection: {
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASS,
        database: DB_NAME,
      },
      dumpToFile: filePath,
    });

    if (destino === 'download') {
      return res.download(filePath, `Seguridad_CVG_${timestamp}.sql`, (err) => {
        if (err) console.error('[BackupController] Error descarga:', err.message);
        try { fs.unlinkSync(filePath); } catch (e) { }
      });
    }

    const stats = fs.statSync(filePath);
    return res.status(200).json({
      ok: true,
      message: `Backup guardado en servidor: ${fileName}`,
      file: { name: fileName, size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB' },
    });

  } catch (err) {
    console.error('[BackupController] Error en volcado JS:', err.message);
    return res.status(500).json({ error: 'No se pudo generar el backup portable.', detail: err.message });
  }
};

// =========================================================================
// 3. POST /api/backup/restore
// =========================================================================
export const restoreBackup = async (req, res) => {
  if (!esAdmin(req)) return res.status(403).json({ error: 'No autorizado.' });

  const { fileName } = req.body;
  if (!fileName) return res.status(400).json({ error: 'Nombre de archivo requerido.' });

  const filePath = path.join(BACKUPS_DIR, fileName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'El archivo de respaldo no existe.' });

  let connection;
  try {
    // 1. Conexión directa al servidor (sin especificar DB inicial por si requiere recrearse)
    connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASS,
      multipleStatements: true // CRUCIAL: Permite procesar el archivo entero en bloques
    });

    console.log(`[Restore] Limpiando base de datos '${DB_NAME}' para evitar bloqueos Tablespace...`);

    // 2. Forzar eliminación y recreación limpia para evitar errores físicos de InnoDB (Error 1813)
    await connection.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\`;`);
    await connection.query(`CREATE DATABASE \`${DB_NAME}\`;`);
    await connection.query(`USE \`${DB_NAME}\`;`);

    // 3. Leer el script SQL desde el disco
    console.log(`[Restore] Ejecutando lectura del archivo: ${fileName}`);
    const sqlScript = fs.readFileSync(filePath, 'utf8');

    // 4. Inyectar el script directamente mediante el driver de Node
    await connection.query(sqlScript);

    return res.status(200).json({
      ok: true,
      message: `Base de datos restaurada exitosamente desde: ${fileName}`
    });

  } catch (err) {
    console.error('[BackupController] Error crítico durante la restauración:', err.message);
    return res.status(500).json({
      error: 'Falló la restauración portable de la base de datos.',
      detail: err.message
    });
  } finally {
    if (connection) await connection.end();
  }
};

export const getSystemConfig = async (req, res) => {
  if (!esAdmin(req)) return res.status(403).json({ error: 'No autorizado.' });

  try {
    const [rows] = await pool.query(
      'SELECT clave, valor, descripcion, actualizado_en FROM sistema_configuracion ORDER BY clave ASC'
    );
    return res.status(200).json({ ok: true, data: rows });
  } catch (error) {
    console.error('[BackupController] Error leyendo sistema_configuracion:', error.message);
    return res.status(500).json({ error: 'No se pudo leer la configuración del sistema.' });
  }
};

export const updateSystemConfig = async (req, res) => {
  if (!esAdmin(req)) return res.status(403).json({ error: 'No autorizado.' });

  const { clave, valor, descripcion } = req.body || {};
  if (!clave || typeof valor === 'undefined') {
    return res.status(400).json({ error: 'Faltan clave o valor.' });
  }

  try {
    await pool.query(
      `INSERT INTO sistema_configuracion (clave, valor, descripcion)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE valor = VALUES(valor), descripcion = VALUES(descripcion)`,
      [clave, String(valor), descripcion || null]
    );

    return res.status(200).json({ ok: true, message: 'Configuración actualizada.' });
  } catch (error) {
    console.error('[BackupController] Error guardando sistema_configuracion:', error.message);
    return res.status(500).json({ error: 'No se pudo guardar la configuración.' });
  }
};

export const getSolicitudCounters = async (req, res) => {
  if (!esAdmin(req)) return res.status(403).json({ error: 'No autorizado.' });

  try {
    const [rows] = await pool.query(
      `SELECT tipo_solicitud, anio, contador, actualizado_en
       FROM solicitud_counters
       ORDER BY anio DESC, FIELD(tipo_solicitud, 'Compra','Servicio','Obra') ASC`
    );
    return res.status(200).json({ ok: true, data: rows });
  } catch (error) {
    console.error('[BackupController] Error leyendo contador de solicitudes:', error.message);
    return res.status(500).json({ error: 'No se pudo leer el contador de solicitudes.' });
  }
};

export const setSolicitudCounter = async (req, res) => {
  if (!esAdmin(req)) return res.status(403).json({ error: 'No autorizado.' });

  const { tipo_solicitud = 'Compra', anio = new Date().getFullYear(), contador = 0 } = req.body || {};

  if (!tipo_solicitud || !anio) {
    return res.status(400).json({ error: 'Tipo de solicitud y año son obligatorios.' });
  }

  try {
    await pool.query(
      `INSERT INTO solicitud_counters (tipo_solicitud, anio, contador)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE contador = VALUES(contador), actualizado_en = CURRENT_TIMESTAMP`,
      [tipo_solicitud, Number(anio), Number(contador)]
    );

    return res.status(200).json({
      ok: true,
      message: `Contador de ${tipo_solicitud} para ${anio} ajustado a ${contador}.`
    });
  } catch (error) {
    console.error('[BackupController] Error configurando contador:', error.message);
    return res.status(500).json({ error: 'No se pudo configurar el contador.' });
  }
};

export const resetSolicitudCounter = async (req, res) => {
  if (!esAdmin(req)) return res.status(403).json({ error: 'No autorizado.' });

  const { tipo_solicitud = 'Compra', anio = new Date().getFullYear() } = req.body || {};

  try {
    await pool.query(
      `INSERT INTO solicitud_counters (tipo_solicitud, anio, contador)
       VALUES (?, ?, 0)
       ON DUPLICATE KEY UPDATE contador = 0, actualizado_en = CURRENT_TIMESTAMP`,
      [tipo_solicitud, Number(anio)]
    );

    return res.status(200).json({
      ok: true,
      message: `Contador de ${tipo_solicitud} reiniciado para ${anio}.`
    });
  } catch (error) {
    console.error('[BackupController] Error reiniciando contador:', error.message);
    return res.status(500).json({ error: 'No se pudo reiniciar el contador.' });
  }
};