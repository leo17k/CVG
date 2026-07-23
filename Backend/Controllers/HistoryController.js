import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const FILE_PATH = path.join(DATA_DIR, 'historial.json');

const DEFAULT_HISTORY = [
  { id: 1, accion: 'Pipeline Migración (3 pasos)', responsable: 'Leo17k', grado: 'Crítico', tiempo: '2026-05-27 14:32' },
  { id: 2, accion: 'Backup → Servidor', responsable: 'Cesar A. Torres', grado: 'Bajo', tiempo: '2026-05-27 11:05' },
  { id: 3, accion: 'Restauración desde Servidor', responsable: 'carlos12', grado: 'Crítico', tiempo: '2026-05-26 18:22' },
  { id: 4, accion: 'Exportación a Access', responsable: 'Leo17k', grado: 'Medio', tiempo: '2026-05-26 09:14' },
  { id: 5, accion: 'Backup → Descarga Local', responsable: 'Cesar A. Torres', grado: 'Bajo', tiempo: '2026-05-25 17:00' },
  { id: 6, accion: 'Restauración desde Archivo', responsable: 'kely', grado: 'Crítico', tiempo: '2026-05-24 13:47' },
];

const ensureFile = () => {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE_PATH)) {
    try {
      fs.writeFileSync(FILE_PATH, JSON.stringify(DEFAULT_HISTORY, null, 2), 'utf-8');
    } catch (e) {
      console.error('[HistoryController] No se pudo crear historial por defecto:', e.message);
    }
  }
};

export const listHistory = (req, res) => {
  ensureFile();
  try {
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    const data = JSON.parse(raw || '[]');
    return res.json({ ok: true, history: data });
  } catch (err) {
    console.error('[HistoryController] Error al leer historial:', err.message);
    return res.status(500).json({ ok: false, error: 'No se pudo leer el historial.' });
  }
};

export const addHistory = (req, res) => {
  ensureFile();
  try {
    const body = req.body || {};
    const accion = body.accion || body.action || 'Acción desconocida';
    const responsable = body.responsable || req.session?.user?.name || body.responsable || 'Sistema';
    const grado = body.grado || 'Medio';
    const tiempo = body.tiempo || new Date().toLocaleString('es-VE', { hour12: false });

    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    const arr = JSON.parse(raw || '[]');

    const entry = {
      id: Date.now(),
      accion,
      responsable,
      grado,
      tiempo
    };

    arr.unshift(entry);
    fs.writeFileSync(FILE_PATH, JSON.stringify(arr, null, 2), 'utf-8');

    return res.status(201).json({ ok: true, entry });
  } catch (err) {
    console.error('[HistoryController] Error guardando historial:', err.message);
    return res.status(500).json({ ok: false, error: 'No se pudo guardar el historial.' });
  }
};

export default { listHistory, addHistory };
