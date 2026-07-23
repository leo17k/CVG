import express from 'express';
import { uploadPDF } from '../Milaware/multerConfig.js';
import * as SolicitudesController from '../Controllers/SolicitudesController.js';

const router = express.Router();

router.get('/solicitudes', SolicitudesController.getSolicitudes);
router.get('/solicitudes/almacen', SolicitudesController.getSolicitudesAlmacen);
router.get('/solicitudes/compras', SolicitudesController.getSolicitudesCompras);
router.get('/solicitudes/:id', SolicitudesController.getSolicitudById);

router.get('/solicitudes/:id/participants', SolicitudesController.getParticipants);
router.get('/solicitudes/:id/mensajes', SolicitudesController.getMensajesBySolicitud);
router.post('/solicitudes/:id/mensaje', uploadPDF.none(), SolicitudesController.postMensajeSolicitud);

router.get('/solicitudes/stats/gerencia', SolicitudesController.getStatsGerencia);
router.get('/solicitudes/stats/dashboard', SolicitudesController.getDashboardStats);

router.post('/crearsolicitud', uploadPDF.fields([
	{ name: 'justificacion_pdf', maxCount: 1 },
	{ name: 'requerimientos_pdf', maxCount: 1 }
]), SolicitudesController.createSolicitud);
router.put('/solicitudes/:id/estado', SolicitudesController.updateEstado);
router.post('/solicitudes/:id/permitir-edicion', SolicitudesController.permitirEdicion);
router.get('/solicitudes/:id/permiso-edicion', SolicitudesController.checkPermisoEdicion);
router.put('/solicitudes/:id', uploadPDF.fields([
	{ name: 'justificacion_pdf', maxCount: 1 },
	{ name: 'requerimientos_pdf', maxCount: 1 }
]), SolicitudesController.updateSolicitud);
router.put('/solicitudes/:id/verificar', SolicitudesController.verificarSolicitud);

// Solicitudes de creación de producto
router.get('/solicitudes-producto', SolicitudesController.getSolicitudesProducto);
router.post('/solicitudes-producto', SolicitudesController.createSolicitudProducto);
router.post('/solicitudes-producto/:id/codificar', SolicitudesController.codificarSolicitudProducto);

export default router;
