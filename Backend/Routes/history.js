import { Router } from 'express';
import * as History from '../Controllers/HistoryController.js';

const router = Router();

router.get('/api/history/list', History.listHistory);
router.post('/api/history/add', History.addHistory);

export default router;
