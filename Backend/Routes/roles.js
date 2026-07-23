import express from 'express';
import * as RolesController from '../Controllers/RolesController.js';

const router = express.Router();

// Listar roles
router.get('/', RolesController.listRoles);

// Obtener rol con permisos
router.get('/:id', RolesController.getRole);

// Crear rol
router.post('/', RolesController.createRole);

// Actualizar rol
router.put('/:id', RolesController.updateRole);

// Eliminar rol
router.delete('/:id', RolesController.deleteRole);

// Sincronizar permisos de un rol
router.post('/:id/permissions', RolesController.setPermissions);

export default router;
