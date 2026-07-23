import express from 'express';
import * as MensajesController from '../Controllers/MensajesController.js';

const router = express.Router();

router.get('/notificaciones', MensajesController.getNotificaciones);
router.delete('/notificaciones/:id', MensajesController.deleteNotification);

router.get('/chats', MensajesController.getChats);

router.get('/mensajes', MensajesController.getMensajes);
router.post('/mensajes', MensajesController.postMensaje);

export default router;
