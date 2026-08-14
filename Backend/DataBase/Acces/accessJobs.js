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

const sanitizeAccessText = (value, maxLength = 255) => {
  if (value === null || value === undefined) return '';
  let text = String(value).trim();
  if (!text) return '';
  text = text.replace(/\r?\n/g, ' ');
  text = text.replace(/\t/g, ' ');
  text = text.slice(0, maxLength);
  return text;
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
      return { prefix: 'C', tipoRC: 'CO', detalleTipo: 'SERV' };
    case 'Obra':
      return { prefix: 'O', tipoRC: 'SV', detalleTipo: 'SERV' };
    case 'Servicio':
    default:
      return { prefix: 'S', tipoRC: 'SV', detalleTipo: 'SERV' };
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
        s.codigo_solicitud,
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
    const exportableStates = new Set(['Aprovadas', 'Finalizado', 'Aprobado', 'Aprobado Gerencia', 'En Compras']);
    const estadoActual = String(s.estado_nombre || '').trim();
    if (!exportableStates.has(estadoActual) && Number(s.id_estado) !== 6) {
      appendLog(`[AccessJobs] Solicitud ${id_solicitud} no exportada a Access porque su estado es ${s.estado_nombre} (id ${s.id_estado})`);
      return { ok: false, reason: 'not-approved' };
    }
    const tipoSolicitudNormalizado = String(s.tipo_solicitud || '').trim();
    const accessType = getAccessRequestType(tipoSolicitudNormalizado);
    const codigoVisible = s.codigo_solicitud || String(s.id_solicitud);
    const NReqCompra = String(codigoVisible);

    await detectSchema();

    const legacyCandidates = new Set([
      String(s.id_solicitud),
      `${accessType.prefix}-${s.id_solicitud}`,
      `${accessType.prefix}${s.id_solicitud}`,
      `${accessType.prefix}-${new Date(s.fecha_creacion || Date.now()).getFullYear()}-${s.id_solicitud}`,
      String(s.codigo_solicitud || ''),
      NReqCompra
    ].filter(Boolean));

    let existingRows = [];
    for (const candidate of legacyCandidates) {
      const candidateSql = /^-?\d+(?:\.\d+)?$/.test(String(candidate).trim())
        ? `${num(candidate)}`
        : `'${esc(String(candidate))}'`;

      try {
        const rows = await connectionCompras.query(`SELECT [NReqCompra] FROM [REQCOMPRA] WHERE [NReqCompra] = ${candidateSql}`);
        if (rows && rows.length > 0) {
          existingRows = rows;
          break;
        }
      } catch (e) {
        appendLog(`[AccessJobs] Check legacy candidate falló para ${candidate}: ${e.message || e}`);
      }
    }

    const existingNreq = existingRows && existingRows.length > 0 ? String(existingRows[0].NReqCompra ?? '') : null;
    const canonicalNreq = NReqCompra;
    const upsertKey = existingNreq || canonicalNreq;
    const nreqSqlValue = nreqIsNumeric ? `${num(upsertKey)}` : `'${esc(upsertKey)}'`;

    // Revisar existencia usando el valor canónico y los antiguos alias del mismo documento.
    let existsInAccess = [];
    try {
      existsInAccess = await connectionCompras.query(`SELECT [NReqCompra] FROM [REQCOMPRA] WHERE [NReqCompra] = ${nreqSqlValue}`);
    } catch (qErr) {
      appendLog(`[AccessJobs] checkQuery falló para ${upsertKey}: ${qErr.message || qErr}`);
      const attempts = [];
      if (!nreqIsNumeric) attempts.push(`SELECT [NReqCompra] FROM [REQCOMPRA] WHERE [NReqCompra] = ${num(s.id_solicitud)}`);
      if (nreqIsNumeric) attempts.push(`SELECT [NReqCompra] FROM [REQCOMPRA] WHERE [NReqCompra] = '${esc(upsertKey)}'`);
      for (const a of attempts) {
        try {
          existsInAccess = await connectionCompras.query(a);
          break;
        } catch (e) {
          appendLog('[AccessJobs] intento fallback falló: ' + (e.message || e));
        }
      }
    }

    if (existingNreq && existingNreq !== canonicalNreq) {
      try {
        await connectionCompras.execute(`UPDATE [REQCOMPRA] SET [NReqCompra] = '${esc(canonicalNreq)}' WHERE [NReqCompra] = '${esc(existingNreq)}'`);
        appendLog(`[AccessJobs] Normalizado NReqCompra antiguo ${existingNreq} -> ${canonicalNreq}`);
      } catch (normalizeErr) {
        appendLog(`[AccessJobs] No se pudo normalizar NReqCompra ${existingNreq} -> ${canonicalNreq}: ${normalizeErr.message || normalizeErr}`);
      }
    }

    // Preparar valores
    const estadoRC = ['Aprovadas', 'Finalizado', 'Aprobado', 'Aprobado Gerencia', 'En Compras'].includes(estadoActual) ? 'AP' : 'IN';
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
        d.id_producto,
        d.id_servicio,
        p.codigo_producto,
        p.nombre_producto,
        p.id_categoria,
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

    let detailInsertError = null;

    for (let index = 0; index < details.length; index++) {
      const d = details[index];
      const NRenglon = Math.min(index + 1, 99999);
      const rawCodRenglon = String(d.codigo_servicio || d.codigo_producto || '00001').trim();
      const CodRenglon = sanitizeAccessText(rawCodRenglon.slice(0, 4), 4);
      const Descripcion = sanitizeAccessText(d.nombre_servicio || d.nombre_producto || 'SIN DESCRIPCION', 255);
      const Unidad = sanitizeAccessText(d.unidad_producto || 'C/U', 20);
      const Cantidad = num(d.cantidad, 1);
      const tipoEsServicioObra = ['Servicio', 'Obra'].includes(tipoSolicitudNormalizado)
        || (!d.id_producto && !!d.id_servicio)
        || (!d.codigo_producto && !!d.codigo_servicio);
      const Cod_Tipo = sanitizeAccessText(tipoEsServicioObra ? 'SERV' : (d.categoria_producto || accessType.detalleTipo), 4);

      const payload = {
        id_solicitud,
        NReqCompra,
        NRenglon,
        CodRenglon,
        Descripcion,
        Unidad,
        Cantidad,
        Cod_Tipo,
        tipoSolicitudNormalizado,
        row: d
      };

      console.log('[AccessJobs][DEBUG] payload detalle antes de INSERT:', payload);
      appendLog('[AccessJobs][DEBUG] payload detalle antes de INSERT: ' + JSON.stringify(payload));

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

      console.log('[AccessJobs][DEBUG] SQL detalle a ejecutar:', insertDetailQuery);
      appendLog('[AccessJobs][DEBUG] SQL detalle a ejecutar: ' + insertDetailQuery);

      try {
        await connectionCompras.execute(insertDetailQuery);
      } catch (dErr) {
        console.error('[AccessJobs][DEBUG] Error insertando detalle:', {
          NReqCompra,
          NRenglon,
          CodRenglon,
          Descripcion,
          Unidad,
          Cantidad,
          Cod_Tipo,
          sql: insertDetailQuery,
          error: dErr?.message || dErr
        });
        appendLog(`[AccessJobs] Error insertando detalle ${NReqCompra} renglon=${NRenglon}: ${dErr.message || dErr}`);
        appendLog('[AccessJobs][DEBUG] SQL fallido: ' + insertDetailQuery);
        detailInsertError = dErr;
        break;
      }
    }

    if (detailInsertError) {
      throw detailInsertError;
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

    const [created] = await pool.query(`
      SELECT DISTINCT s.id_solicitud
      FROM solicitudes_compra s
      INNER JOIN estados_solicitud es ON es.id_estado = s.id_estado
      WHERE s.fecha_creacion >= ${sinceExpr}
        AND es.nombre IN ('Aprovadas', 'Finalizado', 'Aprobado', 'Aprobado Gerencia', 'En Compras')
    `);

    const [histRows] = await pool.query(`
      SELECT DISTINCT h.id_solicitud
      FROM historial_estados h
      INNER JOIN solicitudes_compra s ON s.id_solicitud = h.id_solicitud
      INNER JOIN estados_solicitud es ON es.id_estado = s.id_estado
      WHERE h.fecha_cambio >= ${sinceExpr}
        AND h.estado_nuevo IN ('Aprovadas', 'Finalizado', 'Aprobado', 'Aprobado Gerencia', 'En Compras')
        AND es.nombre IN ('Aprovadas', 'Finalizado', 'Aprobado', 'Aprobado Gerencia', 'En Compras')
    `);

    const ids = new Set();
    for (const r of created) ids.add(r.id_solicitud);
    for (const r of histRows) ids.add(r.id_solicitud);

    if (!ids.size) {
      appendLog(`[AccessJobs] No hay solicitudes aprobadas nuevas/modificadas en las últimas ${hours} horas.`);
      return { processed: 0 };
    }

    appendLog(`[AccessJobs] Iniciando migración incremental para ${ids.size} solicitudes aprobadas.`);
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
