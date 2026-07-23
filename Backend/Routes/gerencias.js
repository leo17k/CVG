import express from 'express';
import * as GerenciasController from '../Controllers/GerenciasController.js';

const router = express.Router();

router.get('/gerencias', GerenciasController.getGerencias);

export default router;
