import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../Mysql/ConexionSQL.js';
import { connectionCompras, statusconnectionCompras } from './ConexionACCES.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..', '..');
const logsDir = path.resolve(backendDir, 'logs');
const backupsDir = path.resolve(backendDir, 'backups', 'access');

if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

const LOG_FILE = path.join(logsDir, 'access-sync.log');
const appendLog = (msg) => {
  const time = new Date().toISOString();
  try {
    fs.appendFileSync(LOG_FILE, `${time} - ${msg}\n`);
  } catch (e) {
    console.error('[AccessJobs] Error escribiendo log:', e.message || e);
  }
};

const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (d) => {
  if (!d) d = new Date(0);
  const dateObj = new Date(d);
  const mm = pad(dateObj.getMonth() + 1);
  const dd = pad(dateObj.getDate());
  const yyyy = dateObj.getFullYear();
  const hh = pad(dateObj.getHours());
  const min = pad(dateObj.getMinutes());
  const ss = pad(dateObj.getSeconds());
  return `#${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}#`;
};

const esc = (str) => {
  if (str === null || str === undefined) return '';
  return String(str).replace(/'/g, "''");
};

const num = (v, defaultVal = 0) => {
  if (v === null || v === undefined) return defaultVal;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const s = String(v).trim().replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
  const n = Number(s);
  return Number.isNaN(n) ? defaultVal : n;
};

const getAccessRequestType = (tipo) => {
  switch (tipo) {
    case 'Compra':
      return { prefix: 'C', tipoRC: 'CO', detalleTipo: 'CO01' };
    case 'Obra':
      return { prefix: 'O', tipoRC: 'OB', detalleTipo: 'OB01' };
    case 'Servicio':
    default:
      return { prefix: 'S', tipoRC: 'SV', detalleTipo: 'ST01' };
  }
};

// Schema detection cache
let schemaDetected = false;
let nreqIsNumeric = false;
let compradorIsNumeric = true;
let ccostoIsNumeric = false;
let codPriorIsNumeric = false;
let nrenglonIsNumeric = true;
let cantidadIsNumeric = true;

async function detectSchema() {
  if (schemaDetected) return;
  schemaDetected = true;
  try {
    const headerSample = await connectionCompras.query('SELECT TOP 1 * FROM [REQCOMPRA]');
    if (headerSample && headerSample.length > 0) {
      const row = headerSample[0];
      for (const key of Object.keys(row)) {
        const val = row[key];
        const k = key.toLowerCase();
        if (k.includes('nreq')) nreqIsNumeric = typeof val === 'number';
        if (k.includes('comprador')) compradorIsNumeric = typeof val === 'number';
        if (k.includes('ccosto')) ccostoIsNumeric = typeof val === 'number';
        if (k.includes('cod_prioridad') || k.includes('cod prioridad') || k.includes('prioridad')) codPriorIsNumeric = typeof val === 'number';
      }
      appendLog('[AccessJobs] REQCOMPRA schema detected: ' + JSON.stringify({ nreqIsNumeric, compradorIsNumeric, ccostoIsNumeric, codPriorIsNumeric }));
    }
  } catch (err) {
    appendLog('[AccessJobs] No se pudo leer esquema de REQCOMPRA: ' + (err.message || err));
  }

  try {
    const detailSample = await connectionCompras.query('SELECT TOP 1 * FROM [REQCOMPRADETALLE]');
    if (detailSample && detailSample.length > 0) {
      const row = detailSample[0];
      for (const key of Object.keys(row)) {
        const val = row[key];
        const k = key.toLowerCase();
        if (k.includes('nrenglon')) nrenglonIsNumeric = typeof val === 'number';
        if (k.includes('cantidad')) cantidadIsNumeric = typeof val === 'number';
      }
      appendLog('[AccessJobs] REQCOMPRADETALLE schema detected: ' + JSON.stringify({ nrenglonIsNumeric, cantidadIsNumeric }));
    }
  } catch (err) {
    appendLog('[AccessJobs] No se pudo leer esquema de REQCOMPRADETALLE: ' + (err.message || err));
  }
}

export async function sendSolicitudToAccess(id_solicitud) {
  try {
    if (!id_solicitud) throw new Error('id_solicitud requerido');

    const okConn = await statusconnectionCompras();
    if (!okConn) {
      appendLog(`[AccessJobs] Conexión a Access (Compras) no disponible antes de sincronizar ${id_solicitud}`);
      return { ok: false, reason: 'access-unavailable' };
    }

    // Traer cabecera
    const [rows] = await pool.query(`
      SELECT 
        s.id_solicitud, 
        s.fecha_creacion, 
        s.id_gerencia, 
        s.resumen, 
        s.justificacion, 
        s.prioridad, 
        s.id_solicitante, 
        s.tipo_solicitud, 
        s.id_estado,
        es.nombre AS estado_nombre
      FROM solicitudes_compra s
      LEFT JOIN estados_solicitud es ON s.id_estado = es.id_estado
      WHERE s.id_solicitud = ?
      LIMIT 1
    `, [id_solicitud]);

    if (!rows || rows.length === 0) {
      appendLog(`[AccessJobs] Solicitud ${id_solicitud} no encontrada en MySQL`);
      return { ok: false, reason: 'not-found' };
    }
    const s = rows[0];
    if (s.id_estado !== 6 && s.estado_nombre !== 'Aprovadas') {
      appendLog(`[AccessJobs] Solicitud ${id_solicitud} no exportada a Access porque su estado es ${s.estado_nombre} (id ${s.id_estado})`);
      return { ok: false, reason: 'not-approved' };
    }
    const accessType = getAccessRequestType(s.tipo_solicitud);
    const typePrefix = accessType.prefix;
    const NReqCompra = `${typePrefix}-${s.id_solicitud}`;

    await detectSchema();

    const nreqSqlValue = nreqIsNumeric ? `${num(s.id_solicitud)}` : `'${esc(NReqCompra)}'`;

    // Revisar existencia
    let existsInAccess = [];
    try {
      existsInAccess = await connectionCompras.query(`SELECT [NReqCompra] FROM [REQCOMPRA] WHERE [NReqCompra] = ${nreqSqlValue}`);
    } catch (qErr) {
      appendLog(`[AccessJobs] checkQuery falló para ${NReqCompra}: ${qErr.message || qErr}`);
      // Intentar fallbacks
      const attempts = [];
      if (!nreqIsNumeric) attempts.push(`SELECT [NReqCompra] FROM [REQCOMPRA] WHERE [NReqCompra] = ${num(s.id_solicitud)}`);
      if (nreqIsNumeric) attempts.push(`SELECT [NReqCompra] FROM [REQCOMPRA] WHERE [NReqCompra] = '${esc(NReqCompra)}'`);
      for (const a of attempts) {
        try {
          existsInAccess = await connectionCompras.query(a);
          break;
        } catch (e) {
          appendLog('[AccessJobs] intento fallback falló: ' + (e.message || e));
        }
      }
    }

    // Preparar valores
    const estadoRC = ['Aprovadas', 'Finalizado', 'Aprobado'].includes(s.estado_nombre) ? 'AP' : 'IN';
    const prioridadRC = s.prioridad === 'Alta' ? 1 : (s.prioridad === 'Media' ? 2 : 3);
    const tipoRC = accessType.tipoRC;

    let codigoCentro = null;
    try {
      const [ccRows] = await pool.query(
        'SELECT codigo_centro FROM centro_costo WHERE id_gerencia = ? LIMIT 1',
        [s.id_gerencia]
      );
      codigoCentro = ccRows[0]?.codigo_centro ?? null;
    } catch (err) {
      appendLog(`[AccessJobs] Error obteniendo codigo_centro para gerencia ${s.id_gerencia}: ${err.message || err}`);
    }

    let compradorValue = s.id_solicitante;
    try {
      const [histRows] = await pool.query(
        `SELECT usuario_responsable FROM historial_estados
         WHERE id_solicitud = ? AND estado_nuevo IN ('En Compras', 'Aprovadas')
         ORDER BY fecha_cambio DESC
         LIMIT 1`,
        [s.id_solicitud]
      );
      const responsable = histRows[0]?.usuario_responsable;
      if (responsable) {
        if (/^\d+$/.test(String(responsable))) {
          compradorValue = Number(responsable);
        } else {
          const [userRows] = await pool.query('SELECT id_usuario FROM usuarios WHERE username = ? LIMIT 1', [responsable]);
          if (userRows && userRows.length) {
            compradorValue = userRows[0].id_usuario;
          }
        }
      }
    } catch (err) {
      appendLog(`[AccessJobs] Error obteniendo comprador desde historial de solicitud ${s.id_solicitud}: ${err.message || err}`);
    }

    const ccostoValue = codigoCentro !== null && codigoCentro !== undefined ? codigoCentro : s.id_gerencia;
    const ccostoSql = ccostoIsNumeric ? `${num(ccostoValue, 300)}` : `'${esc(String(ccostoValue || 300))}'`;
    const compradorSql = compradorIsNumeric ? `${num(compradorValue, 6)}` : `'${esc(String(compradorValue || 6))}'`;
    const codPriorSql = codPriorIsNumeric ? `${num(prioridadRC, 3)}` : `'${esc(String(prioridadRC))}'`;

    // Si ya existe: actualizar cabecera y reemplazar detalles
    if (existsInAccess && existsInAccess.length > 0) {
      try {
        const updateHeaderQuery = `
          UPDATE [REQCOMPRA] SET
            [FechaT] = ${fmtDate(s.fecha_creacion)},
            [FechaA] = ${fmtDate(s.fecha_creacion)},
            [Descripción] = '${esc(s.resumen)}',
            [Modalidad] = 'UN',
            [MontoRC] = 0,
            [CCosto] = ${ccostoSql},
            [Estado] = '${estadoRC}',
            [FechaRecC] = ${fmtDate(s.fecha_creacion)},
            [Comprador] = ${compradorSql},
            [FechaRecC1] = ${fmtDate(s.fecha_creacion)},
            [Fecha] = ${fmtDate(s.fecha_creacion)},
            [TipoCompra] = '${tipoRC}',
            [ControlPrevio] = False,
            [Cod_Prioridad] = ${codPriorSql}
          WHERE [NReqCompra] = ${nreqSqlValue}
        `;
        await connectionCompras.execute(updateHeaderQuery);
        await connectionCompras.execute(`DELETE FROM [REQCOMPRADETALLE] WHERE [NReqCompra] = ${nreqSqlValue}`);
        appendLog(`[AccessJobs] Actualizado header y limpiado detalles para ${NReqCompra}`);
      } catch (updErr) {
        appendLog(`[AccessJobs] Error actualizando cabecera para ${NReqCompra}: ${updErr.message || updErr}`);
        // continuamos intentando insertar detalles para no dejar inconsistencia
      }
    } else {
      try {
        const insertHeaderQuery = `
          INSERT INTO [REQCOMPRA] (
            [NReqCompra], [FechaT], [FechaA], [Descripción], [Modalidad], [MontoRC], 
            [CCosto], [Estado], [FechaRecC], [Comprador], [FechaRecC1], [Fecha], 
            [TipoCompra], [ControlPrevio], [Cod_Prioridad]
          ) VALUES (
            ${nreqSqlValue}, 
            ${fmtDate(s.fecha_creacion)}, 
            ${fmtDate(s.fecha_creacion)}, 
            '${esc(s.resumen)}', 
            'UN', 
            0, 
            ${ccostoSql}, 
            '${estadoRC}', 
            ${fmtDate(s.fecha_creacion)}, 
            ${compradorSql}, 
            ${fmtDate(s.fecha_creacion)}, 
            ${fmtDate(s.fecha_creacion)}, 
            '${tipoRC}',
            False,
            ${codPriorSql}
          )
        `;
        await connectionCompras.execute(insertHeaderQuery);
        appendLog(`[AccessJobs] Cabecera insertada en Access: ${NReqCompra}`);
      } catch (insErr) {
        appendLog(`[AccessJobs] Error insertando cabecera ${NReqCompra}: ${insErr.message || insErr}`);
        throw insErr;
      }
    }

    // Insertar detalles
    const [details] = await pool.query(`
      SELECT
        d.cantidad,
        p.codigo_producto,
        p.nombre_producto,
        um.abreviatura AS unidad_producto,
        srv.codigo_servicio,
        srv.nombre_servicio,
        c_p.codigo AS categoria_producto
      FROM detalles_solicitud d
      LEFT JOIN productos_almacen p ON d.id_producto = p.id_producto
      LEFT JOIN servicios srv ON d.id_servicio = srv.id_servicio
      LEFT JOIN unidades_medida um ON p.id_unidad = um.id_unidad
      LEFT JOIN categorias c_p ON p.id_categoria = c_p.id_categoria
      WHERE d.id_solicitud = ?
    `, [id_solicitud]);

    for (let index = 0; index < details.length; index++) {
      const d = details[index];
      const NRenglon = index + 1;
      const CodRenglon = d.codigo_producto || d.codigo_servicio || '00001';
      const Descripcion = d.nombre_producto || d.nombre_servicio || 'SIN DESCRIPCION';
      const Unidad = d.unidad_producto || 'C/U';
      const Cantidad = num(d.cantidad, 1);
      const Cod_Tipo = d.categoria_producto || accessType.detalleTipo;

      const nrenglonSql = nrenglonIsNumeric ? `${NRenglon}` : `'${NRenglon}'`;
      const cantidadSql = cantidadIsNumeric ? `${Cantidad}` : `'${Cantidad}'`;

      const insertDetailQuery = `
        INSERT INTO [REQCOMPRADETALLE] (
          [NReqCompra], [NRenglon], [CodRenglon], [Descripcion], [Unidad], [Cantidad], [Cod_Tipo]
        ) VALUES (
          ${nreqSqlValue}, 
          ${nrenglonSql}, 
          '${esc(CodRenglon)}', 
          '${esc(Descripcion)}', 
          '${esc(Unidad)}', 
          ${cantidadSql}, 
          '${esc(Cod_Tipo)}'
        )
      `;
      try {
        await connectionCompras.execute(insertDetailQuery);
      } catch (dErr) {
        appendLog(`[AccessJobs] Error insertando detalle ${NReqCompra} renglon=${NRenglon}: ${dErr.message || dErr}`);
      }
    }

    appendLog(`[AccessJobs] Sincronización completada para solicitud ${id_solicitud} -> ${NReqCompra}`);
    return { ok: true, id: id_solicitud };
  } catch (err) {
    appendLog(`[AccessJobs] Error sincronizando solicitud ${id_solicitud}: ${err.message || err}`);
    return { ok: false, error: err.message || err };
  }
}

export async function incrementalMigrationSince(hours = 1) {
  try {
    const sinceExpr = `DATE_SUB(NOW(), INTERVAL ${Number(hours)} HOUR)`;
    const [created] = await pool.query(`SELECT id_solicitud FROM solicitudes_compra WHERE fecha_creacion >= ${sinceExpr}`);
    const [histRows] = await pool.query(`SELECT DISTINCT id_solicitud FROM historial_estados WHERE fecha_cambio >= ${sinceExpr}`);

    const ids = new Set();
    for (const r of created) ids.add(r.id_solicitud);
    for (const r of histRows) ids.add(r.id_solicitud);

    if (!ids.size) {
      appendLog(`[AccessJobs] No hay solicitudes nuevas/modificadas en las últimas ${hours} horas.`);
      return { processed: 0 };
    }

    appendLog(`[AccessJobs] Iniciando migración incremental para ${ids.size} solicitudes.`);
    let processed = 0;
    for (const id of ids) {
      try {
        const r = await sendSolicitudToAccess(id);
        if (r && r.ok) processed++;
      } catch (e) {
        appendLog(`[AccessJobs] Error procesando solicitud ${id}: ${e.message || e}`);
      }
    }
    appendLog(`[AccessJobs] Migración incremental finalizada. Procesadas: ${processed}`);
    return { processed };
  } catch (err) {
    appendLog('[AccessJobs] Error en incrementalMigrationSince: ' + (err.message || err));
    return { processed: 0, error: err.message || err };
  }
}

export async function backupAccessFiles() {
  try {
    const almacenPath = process.env.ACCESS_ALMACEN_PATH;
    const comprasPath = process.env.ACCESS_COMPRAS_PATH;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const results = [];

    const tryCopy = (src) => {
      if (!src) return { ok: false, reason: 'no-path' };
      if (!fs.existsSync(src)) return { ok: false, reason: 'not-found' };
      const base = path.basename(src);
      const dest = path.join(backupsDir, `${base.replace(/\.(mdb|accdb)$/i, '')}_${timestamp}${path.extname(base)}`);
      try {
        fs.copyFileSync(src, dest, fs.constants.COPYFILE_FICLONE || 0);
        return { ok: true, src, dest };
      } catch (e) {
        return { ok: false, src, error: e.message || e };
      }
    };

    results.push(tryCopy(almacenPath));
    results.push(tryCopy(comprasPath));

    appendLog('[AccessJobs] Resultado backup: ' + JSON.stringify(results));
    return results;
  } catch (err) {
    appendLog('[AccessJobs] Error creando backup de Access: ' + (err.message || err));
    return { ok: false, error: err.message || err };
  }
}

export default {
  sendSolicitudToAccess,
  incrementalMigrationSince,
  backupAccessFiles
};
