import express from 'express';
import * as ReportesController from '../Controllers/ReportesController.js';

const router = express.Router();

router.get('/reporte', ReportesController.getReporte);
router.get('/reporte/:id', ReportesController.getReportePlanilla);

export default router;
