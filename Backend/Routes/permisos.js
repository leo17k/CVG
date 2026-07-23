import express from 'express';
import * as PermisosController from '../Controllers/PermisosController.js';

const router = express.Router();

router.get('/modules', PermisosController.listByModule);

export default router;
