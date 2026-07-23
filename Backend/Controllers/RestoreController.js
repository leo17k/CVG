/**
 * RestoreController.js
 * Restauración de base de datos con sanitizador SQL ultra-estricto.
 *
 * SANITIZADOR: bloquea DROP DATABASE, ALTER USER, GRANT, SHUTDOWN
 *              y detecta comillas mal balanceadas antes de ejecutar.
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const BACKUPS_DIR = path.resolve(__dirname, '..', 'backups');
const DB_NAME     = process.env.DB_NAME || 'cvg-p';
const DB_USER     = process.env.DB_USER || 'root';
const DB_HOST     = process.env.DB_HOST || 'localhost';
const DB_PASS     = process.env.DB_PASS || '';

// req.session.rol = id_rol numérico: 5=SuperAdministrador, 11=Administrador
const esAdmin = (req) => {
  if (!req.session?.isLoggedIn) return false;
  const idRol = Number(req.session.rol);
  return idRol === 5 || idRol === 11;
};

const execAsync = (cmd) =>
  new Promise((resolve, reject) =>
    exec(cmd, (err, stdout, stderr) => (err ? reject(err) : resolve({ stdout, stderr })))
  );

// ═══════════════════════════════════════════════════════════════════════════
// SANITIZADOR SQL — bloque crítico de seguridad
// ═══════════════════════════════════════════════════════════════════════════
const PATRONES_PROHIBIDOS = [
  /DROP\s+DATABASE/i,
  /ALTER\s+USER/i,
  /\bGRANT\b/i,
  /\bSHUTDOWN\b/i,
  /REVOKE\s+/i,
  /DROP\s+USER/i,
  /CREATE\s+USER/i,
  /FLUSH\s+PRIVILEGES/i,
];

/**
 * sanitizarSQL — Analiza el contenido de un archivo .sql y lanza
 * una excepción controlada si detecta comandos peligrosos o
 * comillas mal balanceadas.
 *
 * @param {string} contenido - Texto completo del archivo SQL.
 * @throws {Error} Si detecta patrones prohibidos o comillas desbalanceadas.
 */
export const sanitizarSQL = (contenido) => {
  // 1. Verificar patrones de comandos destructivos/privilegiados
  for (const patron of PATRONES_PROHIBIDOS) {
    if (patron.test(contenido)) {
      throw new Error(
        `[SANITIZADOR] Comando SQL peligroso detectado: "${patron.source}". Restauración bloqueada.`
      );
    }
  }

  // 2. Verificar balance de comillas simples (ignorando escapes \')
  //    Elimina secuencias escapadas y luego cuenta comillas simples sueltas.
  const sinEscapes    = contenido.replace(/\\'/g, '').replace(/\\\"/g, '');
  const comillasSimples = (sinEscapes.match(/'/g) || []).length;
  const comillasDobles  = (sinEscapes.match(/"/g) || []).length;

  if (comillasSimples % 2 !== 0) {
    throw new Error(
      '[SANITIZADOR] Comillas simples desbalanceadas en el SQL. Restauración bloqueada por seguridad.'
    );
  }
  if (comillasDobles % 2 !== 0) {
    throw new Error(
      '[SANITIZADOR] Comillas dobles desbalanceadas en el SQL. Restauración bloqueada por seguridad.'
    );
  }

  // SQL aprobado ✓
  return true;
};

// Extra helpers: extraer nombres de tablas desde sentencias CREATE TABLE
const extractCreateTableNames = (sql) => {
  const names = new Set();
  const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`[^`]+`\.)?`([^`]+)`/gi;
  let m;
  while ((m = regex.exec(sql)) !== null) {
    names.add(m[1]);
  }
  return Array.from(names);
};

const makeDropsSql = (tables) => {
  const lines = ['SET FOREIGN_KEY_CHECKS=0;'];
  for (const t of tables) lines.push(`DROP TABLE IF EXISTS \`${t}\`;`);
  lines.push('SET FOREIGN_KEY_CHECKS=1;');
  return lines.join('\n');
};

// Divide un SQL grande en sentencias separadas por `;` respetando comillas
// y comentarios (línea/ bloque). No maneja directivas `DELIMITER` complejas.
const splitSqlStatements = (sql) => {
  const statements = [];
  let cur = '';
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];
    cur += ch;

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        // consume '/'
        cur += next;
        i++;
        inBlockComment = false;
      }
      continue;
    }

    // Detectar inicio de comentarios (solo si no estamos en comillas)
    if (!inSingle && !inDouble && !inBacktick) {
      if (ch === '-' && next === '-' && (i === 0 || sql[i - 1] === '\n' || sql[i - 1] === '\r')) {
        inLineComment = true;
        continue;
      }
      if (ch === '#') {
        inLineComment = true;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        // consume '*' will be handled at next iteration
        continue;
      }
    }

    // Manejar comillas (respetando escapes) y backticks
    if (ch === "'" && !inDouble && !inBacktick) {
      // contar escapes precedentes
      let escaped = false;
      let j = i - 1;
      while (j >= 0 && sql[j] === '\\') { escaped = !escaped; j--; }
      if (!escaped) inSingle = !inSingle;
      continue;
    }
    if (ch === '"' && !inSingle && !inBacktick) {
      let escaped = false;
      let j = i - 1;
      while (j >= 0 && sql[j] === '\\') { escaped = !escaped; j--; }
      if (!escaped) inDouble = !inDouble;
      continue;
    }
    if (ch === '`' && !inSingle && !inDouble) {
      inBacktick = !inBacktick;
      continue;
    }

    // Cuando encontremos un ';' fuera de comillas y comentarios, es fin de sentencia
    if (ch === ';' && !inSingle && !inDouble && !inBacktick && !inLineComment && !inBlockComment) {
      const stmt = cur.slice(0, -1).trim();
      if (stmt) statements.push(stmt);
      cur = '';
    }
  }

  if (cur.trim()) statements.push(cur.trim());
  return statements;
};

// Para INSERTs muy largos: divide la lista de tuplas VALUES(...) en trozos
// más pequeños para evitar paquetes enormes. Devuelve un array de sentencias.
const splitLargeInsert = (stmt, maxTuples = 500) => {
  const m = stmt.match(/^(INSERT\s+INTO\s+[\s\S]*?\bVALUES\b)([\s\S]*)$/i);
  if (!m) return [stmt];

  const prefix = m[1];
  const tail = m[2].trim().replace(/;$/, ''); // quitar ; final si existe

  const tuples = [];
  let cur = '';
  let depth = 0;
  let inSingle = false, inDouble = false, inBacktick = false, escaped = false;

  for (let i = 0; i < tail.length; i++) {
    const ch = tail[i];
    cur += ch;

    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === "'" && !inDouble && !inBacktick) { inSingle = !inSingle; continue; }
    if (ch === '"' && !inSingle && !inBacktick) { inDouble = !inDouble; continue; }
    if (ch === '`' && !inSingle && !inDouble) { inBacktick = !inBacktick; continue; }
    if (inSingle || inDouble || inBacktick) continue;

    if (ch === '(') {
      depth++;
      continue;
    }
    if (ch === ')') {
      depth--;
      if (depth === 0) {
        tuples.push(cur.trim());
        cur = '';
        // saltar separador ',' opcional inmediatamente siguiente
        let j = i + 1;
        while (j < tail.length && /\s/.test(tail[j])) j++;
        if (tail[j] === ',') i = j; // el for hará i++ y continuará después de la coma
      }
    }
  }

  if (tuples.length === 0) return [stmt];

  const out = [];
  for (let i = 0; i < tuples.length; i += maxTuples) {
    const chunk = tuples.slice(i, i + maxTuples).join(',');
    out.push(`${prefix} ${chunk}`);
  }
  return out;
};

// Ejecuta SQL seguro: divide en sentencias y maneja INSERTs muy largos.
// Captura y omite errores de 'Duplicate entry' para continuar la restauración
// cuando la tabla ya contiene filas con las mismas claves primarias.
const executeSqlSafely = async (conn, sql, options = {}) => {
  const ignoreDuplicate = options.ignoreDuplicate !== false; // true por defecto
  const stmts = splitSqlStatements(sql);
  let skippedDuplicates = 0;

  for (const s of stmts) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    // Evitar enviar bloques de comentarios
    if (/^(--|#)/.test(trimmed)) continue;

    // Helper para ejecutar una sentencia y capturar duplicados
    const execStmt = async (statement) => {
      try {
        await conn.query(statement);
      } catch (err) {
        const isDup = err && (err.code === 'ER_DUP_ENTRY' || /Duplicate entry/i.test(err.message || ''));
        if (isDup && ignoreDuplicate) {
          skippedDuplicates++;
          console.warn('[RESTORE] Duplicate entry skipped:', (err.message || err));
          return; // continuar
        }
        throw err;
      }
    };

    // Si es un INSERT muy grande, dividirlo
    if (/^INSERT\s+INTO\s+/i.test(trimmed) && trimmed.length > 1024 * 1024) {
      const parts = splitLargeInsert(trimmed, 500);
      for (const p of parts) {
        await execStmt(p);
      }
    } else {
      await execStmt(trimmed);
    }
  }

  if (skippedDuplicates > 0) {
    console.warn(`[RESTORE] Restauración completada ignorando ${skippedDuplicates} entradas duplicadas.`);
  }
};

// Nota: Las funciones de parsing y ejecución segura ya fueron definidas arriba
// (splitSqlStatements, splitLargeInsert, executeSqlSafely). Usaremos esas.

// ─── POST /api/restore/upload ─────────────────────────────────────────────
/**
 * Restaura a partir de un archivo .sql subido por el usuario (multipart).
 */
export const restoreFromUpload = async (req, res) => {
  if (!esAdmin(req)) return res.status(403).json({ error: 'No autorizado.' });
  if (!req.file)           return res.status(400).json({ error: 'No se recibió ningún archivo .sql.' });

  const filePath = req.file.path;

  try {
    const contenido = fs.readFileSync(filePath, 'utf-8');

    // ── Sanitización antes de cualquier ejecución ──────────────────────────
    sanitizarSQL(contenido); // Lanza excepción si hay comandos prohibidos
    // Intentar usar el cliente `mysql` del sistema si está disponible
    let shellAvailable = true;
    try {
      await execAsync('mysql --version');
    } catch (err) {
      shellAvailable = false;
    }

    if (shellAvailable) {
      const passFlag = DB_PASS ? `-p"${DB_PASS}"` : '';

      // Intentar dropear las tablas objetivo antes de importar para evitar
      // conflictos de tablespace (p. ej. archivos .ibd existentes).
      try {
        const tables = extractCreateTableNames(contenido);
        if (tables.length) {
          const dropsFile = path.join(process.env.PROJECT_ROOT || path.join(__dirname, '..'), 'uploads', 'restore_tmp', `drops_${Date.now()}.sql`);
          fs.mkdirSync(path.dirname(dropsFile), { recursive: true });
          fs.writeFileSync(dropsFile, makeDropsSql(tables));
          try {
            await execAsync(`mysql -u ${DB_USER} ${passFlag} -h ${DB_HOST} ${DB_NAME} < "${dropsFile}"`);
          } catch (err) {
            console.warn('[RESTORE] No se pudieron ejecutar los DROP previos:', err.message || err);
          } finally {
            try { fs.unlinkSync(dropsFile); } catch (e) { }
          }
        }
      } catch (err) {
        console.warn('[RESTORE] Error preparando drops previos:', err.message || err);
      }

      const cmd = `mysql -u ${DB_USER} ${passFlag} -h ${DB_HOST} ${DB_NAME} < "${filePath}"`;
      await execAsync(cmd);
      return res.status(200).json({ ok: true, message: 'Base de datos restaurada exitosamente desde el archivo subido.' });
    }

    // Fallback: ejecutar las sentencias SQL usando el driver JS (mysql2)
    try {
      const conn = await mysql.createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASS,
        database: DB_NAME,
        multipleStatements: true,
        charset: 'utf8mb4'
      });
      // Antes del fallback JS, intentar dropear tablas objetivo para evitar errores
      try {
        const tables = extractCreateTableNames(contenido);
        if (tables.length) {
          await conn.query('SET FOREIGN_KEY_CHECKS=0');
          for (const t of tables) {
            await conn.query(`DROP TABLE IF EXISTS \`${t}\``);
          }
          await conn.query('SET FOREIGN_KEY_CHECKS=1');
        }
      } catch (err) {
        console.warn('[RESTORE] No se pudieron dropear tablas via JS:', err.message || err);
      }

      // Ejecutar de forma segura en trozos para evitar paquetes demasiado grandes
      await executeSqlSafely(conn, contenido);
      await conn.end();
      return res.status(200).json({ ok: true, message: 'Base de datos restaurada exitosamente (fallback JS).' });
    } catch (err) {
      throw new Error(`Fallback JS falló: ${err.message}`);
    }
  } catch (err) {
    return res.status(400).json({ ok: false, message: err.message });
  } finally {
    // Eliminar archivo temporal siempre
    fs.unlink(filePath, () => {});
  }
};

// ─── POST /api/restore/server ─────────────────────────────────────────────
/**
 * Restaura a partir de un punto de control guardado en el servidor.
 * Body: { fileName: 'CVG_Backup_2026-05-27.sql' }
 */
export const restoreFromServer = async (req, res) => {
  if (!esAdmin(req)) return res.status(403).json({ error: 'No autorizado.' });

  const { fileName } = req.body;
  if (!fileName) return res.status(400).json({ error: 'Debes indicar el nombre del archivo.' });

  // Sanitizar el nombre del archivo para evitar path traversal
  const safeName = path.basename(fileName);
  const filePath = path.join(BACKUPS_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Archivo no encontrado en el servidor: ${safeName}` });
  }

  try {
    const contenido = fs.readFileSync(filePath, 'utf-8');

    // ── Sanitización antes de cualquier ejecución ──────────────────────────
    sanitizarSQL(contenido);

    // Intentar usar el cliente `mysql` del sistema si está disponible
    let shellAvailable = true;
    try {
      await execAsync('mysql --version');
    } catch (err) {
      shellAvailable = false;
    }

    if (shellAvailable) {
      const passFlag = DB_PASS ? `-p"${DB_PASS}"` : '';

      // Intentar dropear las tablas objetivo antes de importar para evitar
      // conflictos de tablespace (p. ej. archivos .ibd existentes).
      try {
        const tables = extractCreateTableNames(contenido);
        if (tables.length) {
          const dropsFile = path.join(process.env.PROJECT_ROOT || path.join(__dirname, '..'), 'uploads', 'restore_tmp', `drops_${Date.now()}.sql`);
          fs.mkdirSync(path.dirname(dropsFile), { recursive: true });
          fs.writeFileSync(dropsFile, makeDropsSql(tables));
          try {
            await execAsync(`mysql -u ${DB_USER} ${passFlag} -h ${DB_HOST} ${DB_NAME} < "${dropsFile}"`);
          } catch (err) {
            console.warn('[RESTORE] No se pudieron ejecutar los DROP previos:', err.message || err);
          } finally {
            try { fs.unlinkSync(dropsFile); } catch (e) { }
          }
        }
      } catch (err) {
        console.warn('[RESTORE] Error preparando drops previos:', err.message || err);
      }

      const cmd = `mysql -u ${DB_USER} ${passFlag} -h ${DB_HOST} ${DB_NAME} < "${filePath}"`;
      await execAsync(cmd);
      return res.status(200).json({ ok: true, message: `Base de datos restaurada desde el punto de control: ${safeName}` });
    }

    // Fallback: ejecutar por partes usando el driver JS (mysql2)
    try {
      const conn = await mysql.createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASS,
        database: DB_NAME,
        multipleStatements: true,
        charset: 'utf8mb4'
      });
      // Antes del fallback JS, intentar dropear tablas objetivo para evitar errores
      try {
        const tables = extractCreateTableNames(contenido);
        if (tables.length) {
          await conn.query('SET FOREIGN_KEY_CHECKS=0');
          for (const t of tables) {
            await conn.query(`DROP TABLE IF EXISTS \`${t}\``);
          }
          await conn.query('SET FOREIGN_KEY_CHECKS=1');
        }
      } catch (err) {
        console.warn('[RESTORE] No se pudieron dropear tablas via JS:', err.message || err);
      }

      // Ejecutar de forma segura en trozos para evitar paquetes demasiado grandes
      await executeSqlSafely(conn, contenido);
      await conn.end();
      return res.status(200).json({ ok: true, message: `Base de datos restaurada desde el punto de control: ${safeName} (fallback JS).` });
    } catch (err) {
      throw new Error(`Fallback JS falló: ${err.message}`);
    }
  } catch (err) {
    return res.status(400).json({ ok: false, message: err.message });
  }
};
