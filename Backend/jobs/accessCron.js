import cron from 'node-cron';
import { incrementalMigrationSince, backupAccessFiles } from '../DataBase/Acces/accessJobs.js';
import { syncProductosYStockCondicional } from '../DataBase/Migracion/MigracionACCES-MYSQL.js';

export function startAccessJobs() {
  try {
    const migrationCron = process.env.ACCESS_MIGRATION_CRON || '0 * * * *';
    const migrationHours = Number(process.env.MIGRATION_INTERVAL_HOURS) || 1;

    console.log(`[AccessCron] Configuración cargada: Cron = "${migrationCron}", Intervalo = ${migrationHours} hora(s)`);

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
    }, { scheduled: true });

    // Job diario: respaldo de archivos Access (cron configurable vía ACCESS_BACKUP_CRON)
    const backupCron = process.env.ACCESS_BACKUP_CRON || '0 0 * * *';
    const backupJob = cron.schedule(backupCron, async () => {
      console.log(`[AccessCron] [Backup] Iniciando respaldo programado de bases de datos Access (${backupCron})...`);
      try {
        await backupAccessFiles();
        console.log(`[AccessCron] [Backup] Respaldo finalizado correctamente.`);
      } catch (e) {
        console.error('[AccessCron] [Backup] Error en backup de Access:', e.message || e);
      }
    }, { scheduled: true });

    // Start jobs
    migrJob.start();
    backupJob.start();

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
        
        console.log(`[AccessCron] [Inicio] Sincronización inicial completada exitosamente. Acción de catálogo tomada: "${res.action}"`);
      } catch (e) {
        console.error('[AccessCron] [Inicio] Error en la ejecución inicial de sincronización:', e.message || e);
      }
    })();

    console.log(`[AccessCron] Jobs inicializados correctamente: Sincronización (cron: "${migrationCron}") y Respaldo (cron: "${backupCron}")`);
    return { migrJob, backupJob };
  } catch (err) {
    console.error('[AccessCron] No se pudieron iniciar los jobs:', err.message || err);
    return null;
  }
}

export default { startAccessJobs };
