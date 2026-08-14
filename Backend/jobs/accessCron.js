import cron from 'node-cron';
import pool from '../DataBase/Mysql/ConexionSQL.js';
import { incrementalMigrationSince, backupAccessFiles } from '../DataBase/Acces/accessJobs.js';
import { syncProductosYStockCondicional, MigrarUnidadesAProductos } from '../DataBase/Migracion/MigracionACCES-MYSQL.js';

export async function resetSolicitudCountersIfYearChanged() {
  const currentYear = new Date().getFullYear();
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT tipo_solicitud FROM solicitud_counters WHERE anio <> ?`,
      [currentYear]
    );

    if (!rows || rows.length === 0) {
      const [currentRows] = await pool.query(
        `SELECT tipo_solicitud, anio, contador FROM solicitud_counters WHERE anio = ? ORDER BY tipo_solicitud`,
        [currentYear]
      );
      return { reset: false, current: currentRows || [] };
    }

    for (const row of rows) {
      await pool.query(
        `INSERT INTO solicitud_counters (tipo_solicitud, anio, contador)
         VALUES (?, ?, 0)
         ON DUPLICATE KEY UPDATE contador = 0, actualizado_en = CURRENT_TIMESTAMP`,
        [row.tipo_solicitud, currentYear]
      );
    }

    return { reset: true, types: rows.map(r => r.tipo_solicitud) };
  } catch (error) {
    console.error('[AccessCron] Error revisando reinicio del contador anual de solicitudes:', error.message || error);
    return { reset: false, error: error.message || error };
  }
}

export function startAccessJobs() {
  try {
    const migrationCron = process.env.ACCESS_MIGRATION_CRON || '0 * * * *';
    const migrationHours = Number(process.env.MIGRATION_INTERVAL_HOURS) || 1;
    const backupEnabled = process.env.ACCESS_BACKUP_ENABLED !== 'false';

    console.log(`[AccessCron] Configuración cargada: Cron = "${migrationCron}", Intervalo = ${migrationHours} hora(s), Backup habilitado = ${backupEnabled}`);

    // Job para sincronización/migración periódica
    const migrJob = cron.schedule(migrationCron, async () => {
      console.log(`[AccessCron] [Job] Iniciando ejecución periódica de sincronización...`);
      
      // 1. Migración incremental de solicitudes (MySQL -> Access)
      console.log(`[AccessCron] [Job] Ejecutando exportación incremental de solicitudes de compra (MySQL -> Access) de las últimas ${migrationHours} hora(s)`);
      try {
        await incrementalMigrationSince(migrationHours);
        console.log(`[AccessCron] [Job] Exportación incremental de solicitudes de compra finalizada.`);
      } catch (e) {
        console.error('[AccessCron] [Job] Error en exportación incremental de solicitudes:', e.message || e);
      }

      // 2. Sincronización condicional de productos y stock (Access -> MySQL)
      console.log(`[AccessCron] [Job] Ejecutando sincronización condicional de productos y stock (Access -> MySQL)`);
      try {
        const res = await syncProductosYStockCondicional();
        console.log(`[AccessCron] [Job] Sincronización condicional de productos finalizada. Acción tomada: "${res.action}" (Access: ${res.totalAccess} | MySQL: ${res.totalMysql})`);
      } catch (e) {
        console.error('[AccessCron] [Job] Error en sincronización condicional de productos y stock:', e.message || e);
      }

      // 3. Sincronización de unidades de medida (Access -> MySQL)
      console.log(`[AccessCron] [Job] Ejecutando sincronización de unidades de medida (Access -> MySQL)`);
      try {
        await MigrarUnidadesAProductos();
        console.log('[AccessCron] [Job] Sincronización de unidades de medida finalizada.');
      } catch (e) {
        console.error('[AccessCron] [Job] Error en sincronización de unidades de medida:', e.message || e);
      }
    }, { scheduled: true });

    let backupJob = null;
    if (backupEnabled) {
      // Job diario: respaldo de archivos Access (cron configurable vía ACCESS_BACKUP_CRON)
      const backupCron = process.env.ACCESS_BACKUP_CRON || '0 0 * * *';
      backupJob = cron.schedule(backupCron, async () => {
        console.log(`[AccessCron] [Backup] Iniciando respaldo programado de bases de datos Access (${backupCron})...`);
        try {
          await backupAccessFiles();
          console.log(`[AccessCron] [Backup] Respaldo finalizado correctamente.`);
        } catch (e) {
          console.error('[AccessCron] [Backup] Error en backup de Access:', e.message || e);
        }
      }, { scheduled: true });
    } else {
      console.log('[AccessCron] [Backup] Backup de Access deshabilitado por ACCESS_BACKUP_ENABLED=false');
    }

    const resetCounterJob = cron.schedule('0 0 * * *', async () => {
      console.log('[AccessCron] [Counter] Revisando reinicio automático del contador anual de solicitudes...');
      const result = await resetSolicitudCountersIfYearChanged();
      if (result.reset) {
        console.log(`[AccessCron] [Counter] Reinicio anual aplicado para: ${result.types.join(', ')}`);
      }
    }, { scheduled: true });

    // Start jobs
    migrJob.start();
    if (backupJob) backupJob.start();
    resetCounterJob.start();

    // Ejecutar una vez al arrancar
    (async () => {
      try {
        const result = await resetSolicitudCountersIfYearChanged();
        if (result.reset) {
          console.log(`[AccessCron] [Counter] Reinicio automático ejecutado al arrancar para: ${result.types?.join(', ') || 'n/a'}`);
        }
      } catch (e) {
        console.error('[AccessCron] [Counter] Error al validar reinicio automático al iniciar:', e.message || e);
      }
    })();

    // Ejecutar una vez al arrancar para sincronizar cambios recientes
    (async () => {
      try {
        console.log('[AccessCron] [Inicio] Primera ejecución: Sincronización inicial al arrancar el servidor');
        
        // 1. Exportación incremental de solicitudes inicial
        console.log(`[AccessCron] [Inicio] Ejecutando exportación incremental de solicitudes de compra (MySQL -> Access) de las últimas ${migrationHours} hora(s)`);
        await incrementalMigrationSince(migrationHours);
        
        // 2. Sincronización condicional de productos inicial
        console.log(`[AccessCron] [Inicio] Ejecutando sincronización condicional de productos y stock (Access -> MySQL)`);
        const res = await syncProductosYStockCondicional();

        // 3. Sincronización de unidades de medida inicial
        console.log(`[AccessCron] [Inicio] Ejecutando sincronización de unidades de medida (Access -> MySQL)`);
        await MigrarUnidadesAProductos();

        console.log(`[AccessCron] [Inicio] Sincronización inicial completada exitosamente. Acción de catálogo tomada: "${res.action}"`);
      } catch (e) {
        console.error('[AccessCron] [Inicio] Error en la ejecución inicial de sincronización:', e.message || e);
      }
    })();

    console.log(`[AccessCron] Jobs inicializados correctamente: Sincronización (cron: "${migrationCron}")${backupEnabled ? ` y Respaldo habilitado` : ' y Respaldo deshabilitado'}, reinicio anual de contador activo.`);
    return { migrJob, backupJob, resetCounterJob };
  } catch (err) {
    console.error('[AccessCron] No se pudieron iniciar los jobs:', err.message || err);
    return null;
  }
}

export default { startAccessJobs };
