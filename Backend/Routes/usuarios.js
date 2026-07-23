import express from 'express';
import * as UsuariosController from '../Controllers/UsuariosController.js';
import { uploadAvatar } from '../Milaware/multerConfig.js';

const router = express.Router();

router.get('/users', UsuariosController.getUsers);
router.get('/context', UsuariosController.getContext);
router.post('/usuarios', UsuariosController.createUser);
router.put('/usuarios/:id_usuario', UsuariosController.updateUser);
// Subir avatar (multipart/form-data -> campo 'avatar')
router.post('/usuarios/:id_usuario/avatar', uploadAvatar.single('avatar'), UsuariosController.uploadAvatar);
// Cambiar contraseña
router.post('/usuarios/:id_usuario/password', UsuariosController.changePassword);
router.post('/perfil', UsuariosController.getPerfil);

export default router;
