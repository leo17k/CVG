/**
 * Routes/backup.js  —  Backup + Restauración con sanitizador
 */
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import * as Backup from '../Controllers/BackupController.js';
import * as Restore from '../Controllers/RestoreController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '..', '..');
const uploadRestore = multer({ dest: path.join(projectRoot, 'uploads', 'restore_tmp') });

const router = Router();

// ── Backup ──────────────────────────────────────────────────────────────────
router.get('/api/backup/list', Backup.listBackups);
// ?destino=server   →  guarda .sql en /backups con timestamp
// ?destino=download →  streaming directo al navegador
router.get('/api/backup/export', Backup.exportBackup);

// ── Restauración ─────────────────────────────────────────────────────────────
// Subir archivo SQL externo
router.post('/api/restore/upload', uploadRestore.single('sqlfile'), Restore.restoreFromUpload);
// Usar punto de control del servidor  { fileName: '...' }
router.post('/api/restore/server', Restore.restoreFromServer);

export default router;
