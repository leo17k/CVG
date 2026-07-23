/**
 * multerConfig.js
 * Configuraciones de Multer centralizadas.
 *  - uploadPDF   → para archivos de justificación de solicitudes (.pdf, máx 10 MB)
 *  - uploadBackup → para archivos de respaldo SQL (cualquier tipo, destino /uploads)
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Raíz del Backend (un nivel arriba de Milaware)
const backendDir = path.resolve(__dirname, '..');

// ── Multer para PDFs de justificación de solicitudes ────────────────────────
const storagePDF = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const dir = path.join(backendDir, 'uploads', 'solicitudes');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `sol_${Date.now()}${ext}`);
    }
});

export const uploadPDF = multer({
    storage: storagePDF,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Solo se permiten archivos PDF'));
    }
});

// ── Multer para respaldos de base de datos (import SQL) ──────────────────────
export const uploadBackup = multer({
    dest: path.join(backendDir, 'uploads/')
});

// ── Multer para subir avatares de usuario ───────────────────────────────
const storageAvatar = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const dir = path.join(backendDir, 'uploads', 'avatars');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || '.png';
        cb(null, `avatar_${Date.now()}${ext}`);
    }
});

export const uploadAvatar = multer({
    storage: storageAvatar,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    }
});
