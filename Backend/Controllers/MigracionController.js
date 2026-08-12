/**
 * MigracionController.js
 * Pipeline secuencial de migración Access → MySQL.
 * Paso 1: Tablas Base  →  Paso 2: Inventario  →  Paso 3: Solicitudes
 * Cada paso espera al anterior con async/await.
 */

import pool from '../DataBase/Mysql/ConexionSQL.js';
import { Migraciondeproductos_almacen, MigracionStockAlmacen, MigrarUnidadesAProductos } from '../DataBase/Migracion/MigracionACCES-MYSQL.js'
import { connectionCompras as connectionAccess, statusconnectionCompras } from '../DataBase/Acces/ConexionACCES.js';

// req.session.rol = id_rol numérico (AuthController lo guarda así)
// SuperAdministrador = 5 | Administrador = 11
const ROLES_ADMIN = [5, 11];

const verificarRol = (req) => {
  const idRol = Number(req.session?.rol);
  if (!req.session?.isLoggedIn || !ROLES_ADMIN.includes(idRol)) {
    const err = new Error('Acceso denegado: se requiere rol Administrador o SuperAdministrador.');
    err.status = 403;
    throw err;
  }
};

// ─── Paso 1: Migrar tablas base (categorías, unidades, gerencias…) ─────────
const migrarTablasBase = async () => {
  // TODO: conectar a Access y ejecutar SELECT sobre tablas base.
  // Ejemplo con node-adodb:
  // const { ACCESS_DSN } = await import('../config/dbAccess.js');
  // const conn = ADODB.open(ACCESS_DSN);
  // const rows = await conn.query('SELECT * FROM Categorias');
  // for (const r of rows) {
  //   await pool.query(
  //     'INSERT IGNORE INTO categorias (codigo, nombre) VALUES (?,?)',
  //     [r.Codigo, r.Nombre]
  //   );
  // }
  return { paso: 1, descripcion: 'Tablas Base', registros: 0 };
};

// ─── Paso 2: Migrar inventario (productos, stock) ────────────────────────────
const migrarInventario = async () => {
  // TODO: SELECT de tabla Inventario en Access e INSERT en MySQL.
  // const rows = await conn.query('SELECT * FROM Inventario');
  // for (const r of rows) {
  //   await pool.query(
  //     'INSERT IGNORE INTO productos (codigo_item, nombre, stock) VALUES (?,?,?)',
  //     [r.Codigo, r.Nombre, r.Stock]
  //   );
  // }
  return { paso: 2, descripcion: 'Inventario', registros: 0 };
};

// ─── Paso 3: Migrar solicitudes históricas ───────────────────────────────────
const migrarSolicitudes = async () => {
  // TODO: SELECT de Solicitudes en Access e INSERT en MySQL.
  // const rows = await conn.query('SELECT * FROM Solicitudes');
  // for (const r of rows) {
  //   await pool.query(
  //     `INSERT IGNORE INTO solicitudes
  //        (resumen, justificacion, tipo_solicitud, id_estado, fecha_creacion)
  //      VALUES (?,?,?,2,?)`,
  //     [r.Resumen, r.Justificacion, r.Tipo, r.Fecha]
  //   );
  // }
  return { paso: 3, descripcion: 'Solicitudes', registros: 0 };
};

// ─── Endpoint: Ejecutar pipeline completo ────────────────────────────────────
export const ejecutarMigracion = async (req, res) => {
  try {
    const r1 = await Migraciondeproductos_almacen();
    const r2 = await MigracionStockAlmacen();
    const r3 = await MigrarUnidadesAProductos();

    return res.status(200).json({
      ok: true,
      message: 'Pipeline de migración completado exitosamente.',
      pasos: [r1, r2, r3],
    });
  } catch (err) {
    console.error('[MigracionController]', err.message);
    return res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};


// ─── Endpoint: Exportar MySQL → Access ───────────────────────────────────────
export const exportToAccess = async (req, res) => {
  try {
    verificarRol(req);

    // Verificar que la conexión a Access está disponible antes de empezar
    try {
      const ok = await statusconnectionCompras();
      if (!ok) {
        const err = new Error('Conexión a Access (Compras) no disponible. Ver logs del servidor y compruebe que el archivo .mdb/.accdb exista y no esté bloqueado.');
        err.status = 500;
        throw err;
      }
    } catch (connCheckErr) {
      console.error('[MigracionController] statusconnectionCompras fallo:', connCheckErr.message || connCheckErr);
      throw connCheckErr;
    }

    const [solicitudes] = await pool.query(`
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
      ORDER BY s.id_solicitud ASC
    `);

    // Auxiliares de formato para Access SQL
    // Access espera literales de fecha con formato US: #MM/DD/YYYY HH:MM:SS#
    const fmtDate = (d) => {
      if (!d) return '#01/01/1970 00:00:00#';
      const dateObj = new Date(d);
      const pad = (n) => String(n).padStart(2, '0');
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

    // Convierte valores a número seguro para SQL (reemplaza comas decimales)
    const num = (v, defaultVal = 0) => {
      if (v === null || v === undefined) return defaultVal;
      if (typeof v === 'number' && !Number.isNaN(v)) return v;
      const s = String(v).trim().replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
      const n = Number(s);
      return Number.isNaN(n) ? defaultVal : n;
    };

    // Defaults basados en esquema real de Compras.mdb:
    // NReqCompra=Text(130), CCosto=Text(130), Cod_Prioridad=Text(130)
    // Comprador=Number(5), MontoRC=Number(5), NRenglon=Number(5), Cantidad=Number(5)
    let nreqIsNumeric = false;
    let compradorIsNumeric = true;
    let ccostoIsNumeric = false;
    let codPriorIsNumeric = false;
    let nrenglonIsNumeric = true;
    let cantidadIsNumeric = true;
    try {
      const headerSample = await connectionAccess.query('SELECT TOP 1 * FROM [REQCOMPRA]');
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
        console.log('[Migracion] REQCOMPRA schema detected:', { nreqIsNumeric, compradorIsNumeric, ccostoIsNumeric, codPriorIsNumeric });
      } else {
        console.log('[Migracion] REQCOMPRA parece vacía — usando supuestos por defecto.');
      }
    } catch (schemaErr) {
      console.warn('[Migracion] No se pudo leer esquema de REQCOMPRA:', schemaErr.message || schemaErr);
    }

    try {
      const detailSample = await connectionAccess.query('SELECT TOP 1 * FROM [REQCOMPRADETALLE]');
      if (detailSample && detailSample.length > 0) {
        const row = detailSample[0];
        for (const key of Object.keys(row)) {
          const val = row[key];
          const k = key.toLowerCase();
          if (k.includes('nrenglon')) nrenglonIsNumeric = typeof val === 'number';
          if (k.includes('cantidad')) cantidadIsNumeric = typeof val === 'number';
        }
        console.log('[Migracion] REQCOMPRADETALLE schema detected:', { nrenglonIsNumeric, cantidadIsNumeric });
      } else {
        console.log('[Migracion] REQCOMPRADETALLE parece vacía — usando supuestos por defecto.');
      }
    } catch (schemaErr2) {
      console.warn('[Migracion] No se pudo leer esquema de REQCOMPRADETALLE:', schemaErr2.message || schemaErr2);
    }

    let exportados = 0;
    let omitidos = 0;
    let errores = 0;
    const errorDetails = [];
    const previewList = [];

    for (const s of solicitudes) {
      const typePrefix = s.tipo_solicitud === 'Compra' ? 'C' : 'S';
      const NReqCompra = `${typePrefix}-${s.id_solicitud}`;

      try {
        // Preparar los valores para el dialecto de Access según el esquema detectado
        const nreqSqlValue = nreqIsNumeric ? `${num(s.id_solicitud)}` : `'${esc(NReqCompra)}'`;
        const checkQuery = `SELECT [NReqCompra] FROM [REQCOMPRA] WHERE [NReqCompra] = ${nreqSqlValue}`;
        console.log('[Migracion] checkQuery:', checkQuery);
        let existsInAccess;
        try {
          existsInAccess = await connectionAccess.query(checkQuery);
        } catch (qErr) {
          console.warn(`[Migracion] checkQuery falló para ${NReqCompra}: ${qErr.message}. Intentando fallback.`);
          // Intentar con la parte numérica y con la parte textual para cubrir ambos casos
          const attempts = [];
          if (!nreqIsNumeric) attempts.push(`SELECT [NReqCompra] FROM [REQCOMPRA] WHERE [NReqCompra] = ${num(s.id_solicitud)}`);
          if (nreqIsNumeric) attempts.push(`SELECT [NReqCompra] FROM [REQCOMPRA] WHERE [NReqCompra] = '${esc(NReqCompra)}'`);
          let succ = false;
          for (const a of attempts) {
            console.log('[Migracion] intento fallback checkQuery:', a);
            try {
              existsInAccess = await connectionAccess.query(a);
              succ = true;
              break;
            } catch (eAttempt) {
              console.warn('[Migracion] intento fallback falló:', eAttempt.message || eAttempt);
            }
          }
          if (!succ) {
            console.error('[Migracion] Todos los intentos de checkQuery fallaron.');
            throw qErr;
          }
        }

        if (existsInAccess && existsInAccess.length > 0) {
          omitidos++;
          continue;
        }

        // Insertar cabecera REQCOMPRA
        const estadoRC = ['Aprovadas', 'Finalizado'].includes(s.estado_nombre) ? 'AP' : 'IN';
        const prioridadRC = s.prioridad === 'Alta' ? 1 : (s.prioridad === 'Media' ? 2 : 3);
        const tipoRC = s.tipo_solicitud === 'Compra' ? 'CO' : 'SV';

        // Preparar valores para inserción según el esquema detectado
        let codigoCentro = null;
        try {
          const [ccRows] = await pool.query(
            'SELECT codigo_centro FROM centro_costo WHERE id_gerencia = ? LIMIT 1',
            [s.id_gerencia]
          );
          codigoCentro = ccRows[0]?.codigo_centro ?? null;
        } catch (err) {
          console.warn(`[Migracion] Error obteniendo codigo_centro para gerencia ${s.id_gerencia}: ${err.message || err}`);
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
          console.warn(`[Migracion] Error obteniendo comprador desde historial de solicitud ${s.id_solicitud}: ${err.message || err}`);
        }

        const ccostoValue = codigoCentro !== null && codigoCentro !== undefined ? codigoCentro : s.id_gerencia;
        const ccostoSql = ccostoIsNumeric ? `${num(ccostoValue, 300)}` : `'${esc(String(ccostoValue || 300))}'`;
        const compradorSql = compradorIsNumeric ? `${num(compradorValue, 6)}` : `'${esc(String(compradorValue || 6))}'`;
        const codPriorSql = codPriorIsNumeric ? `${num(prioridadRC, 3)}` : `'${esc(String(prioridadRC))}'`;

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
        console.log('[Migracion] insertHeaderQuery:', insertHeaderQuery);
        await connectionAccess.execute(insertHeaderQuery);

        // Consultar renglones de la solicitud en MySQL
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
        `, [s.id_solicitud]);

        // Insertar cada renglón en REQCOMPRADETALLE
        for (let index = 0; index < details.length; index++) {
          const d = details[index];
          const NRenglon = index + 1;
          const CodRenglon = d.codigo_producto || d.codigo_servicio || '00001';
          const Descripcion = d.nombre_producto || d.nombre_servicio || 'SIN DESCRIPCION';
          const Unidad = d.unidad_producto || 'C/U';
          const Cantidad = num(d.cantidad, 1);
          const Cod_Tipo = d.categoria_producto || (s.tipo_solicitud === 'Compra' ? 'CO01' : 'ST01');

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
          console.log('[Migracion] insertDetailQuery:', insertDetailQuery);
          await connectionAccess.execute(insertDetailQuery);
          console.log(`[Migracion] Detalle insertado: ${nreqSqlValue} renglon=${nrenglonSql} cod=${CodRenglon} qty=${cantidadSql}`);
        }
        exportados++;
        if (previewList.length < 5) {
          previewList.push({
            id_solicitud: s.id_solicitud,
            resumen: s.resumen,
            estado: s.estado_nombre || 'Pendiente'
          });
        }
      } catch (itemErr) {
        console.error(`Error al exportar solicitud #${s.id_solicitud}:`, itemErr);
        errores++;
        errorDetails.push({ id_solicitud: s.id_solicitud, error: itemErr.message });
      }
    }

    return res.status(200).json({
      ok: true,
      message: `Exportación completada. Exitosos: ${exportados}, Omitidos (duplicados): ${omitidos}, Errores: ${errores}.`,
      exportados,
      omitidos,
      errores,
      errorDetails,
      preview: previewList
    });
  } catch (err) {
    console.error('[MigracionController] exportToAccess:', err.message);
    return res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};
