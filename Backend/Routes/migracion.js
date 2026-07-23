/**
 * Routes/migracion.js  —  Migración bidireccional MySQL ↔ Access
 */
import { Router } from 'express';
import { ejecutarMigracion, exportToAccess } from '../Controllers/MigracionController.js';

const router = Router();

// POST /migracion/ejecutar  →  Pipeline Access → MySQL (3 pasos secuenciales)
router.post('/migracion/ejecutar', ejecutarMigracion);
router.post('/migracion/importar', ejecutarMigracion);

// POST /migracion/exportar  →  MySQL → Access
router.post('/migracion/exportar', exportToAccess);

export default router;
