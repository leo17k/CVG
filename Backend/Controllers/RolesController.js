import * as RolesModel from '../DataBase/Mysql/RolesModel.js';
import pool from '../DataBase/Mysql/ConexionSQL.js';

const hasPermission = async (userId, permissionName) => {
  try {
    const [rows] = await pool.query(`
      SELECT 1 FROM usuario_permisos up
      JOIN permisos p ON up.id_permiso = p.id_permiso
      WHERE up.id_usuario = ? AND p.accion = ?
    `, [userId, permissionName]);
    if (rows.length > 0) return true;
  } catch (error) {
    if (error && error.code !== 'ER_NO_SUCH_TABLE' && error.errno !== 1146) {
      console.error('Error checking user-specific permission:', error);
    }
  }

  try {
    // Si el usuario es SuperAdministrador (id_rol = 5) concedemos todo inmediatamente
    try {
      const [urows] = await pool.query('SELECT u.id_rol, r.nombre_rol FROM usuarios u LEFT JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = ?', [userId]);
      if (urows && urows[0] && (Number(urows[0].id_rol) === 5 || (urows[0].nombre_rol || '').toLowerCase() === 'superadministrador')) {
        return true;
      }
    } catch (err) {
      // no fatal
    }
    const [rows] = await pool.query(`
      SELECT 1 FROM usuarios u
      JOIN rol_permisos rp ON u.id_rol = rp.id_rol
      JOIN permisos p ON rp.id_permiso = p.id_permiso
      WHERE u.id_usuario = ? AND (p.accion = ? OR p.accion = 'Total')
    `, [userId, permissionName]);
    return rows.length > 0;
  } catch (error) {
    console.error('Error checking role permission:', error);
    return false;
  }
};

export const listRoles = async (req, res) => {
  if (!req.session.isLoggedIn || !await hasPermission(req.session.userId, 'ver_roles')) return res.status(401).json({ error: 'No autorizado' });
  try {
    const roles = await RolesModel.getAllRoles();
    res.json({ data: roles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

export const getRole = async (req, res) => {
  if (!req.session.isLoggedIn || !await hasPermission(req.session.userId, 'ver_roles')) return res.status(401).json({ error: 'No autorizado' });
  try {
    const { id } = req.params;
    const role = await RolesModel.getRoleById(id);
    if (!role) return res.status(404).json({ error: 'Rol no encontrado' });
    const permisos = await RolesModel.getRolePermissions(id);
    res.json({ data: { ...role, permisos } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

export const createRole = async (req, res) => {
  if (!req.session.isLoggedIn || !await hasPermission(req.session.userId, 'crear_roles')) return res.status(401).json({ error: 'No autorizado' });
  try {
    const { nombre_rol } = req.body;
    if (!nombre_rol) return res.status(400).json({ error: 'nombre_rol es requerido' });
    const id = await RolesModel.createRole(nombre_rol);
    res.status(201).json({ message: 'Rol creado', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

export const updateRole = async (req, res) => {
  if (!req.session.isLoggedIn || !await hasPermission(req.session.userId, 'editar_roles')) return res.status(401).json({ error: 'No autorizado' });
  try {
    const { id } = req.params;
    const { nombre_rol } = req.body;
    const ok = await RolesModel.updateRole(id, nombre_rol);
    if (!ok) return res.status(404).json({ error: 'Rol no encontrado' });
    res.json({ message: 'Rol actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

export const deleteRole = async (req, res) => {
  if (!req.session.isLoggedIn || !await hasPermission(req.session.userId, 'eliminar_roles')) return res.status(401).json({ error: 'No autorizado' });
  try {
    const { id } = req.params;
    const ok = await RolesModel.deleteRole(id);
    if (!ok) return res.status(404).json({ error: 'Rol no encontrado' });
    res.json({ message: 'Rol eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

export const setPermissions = async (req, res) => {
  if (!req.session.isLoggedIn || !await hasPermission(req.session.userId, 'asignar_permisos')) return res.status(401).json({ error: 'No autorizado' });
  try {
    const { id } = req.params;
    const { permisos } = req.body; // array de id_permiso
    if (!Array.isArray(permisos)) return res.status(400).json({ error: 'permisos debe ser un array de ids' });
    await RolesModel.syncRolePermissions(id, permisos);
    res.json({ message: 'Permisos sincronizados' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

export default {
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  setPermissions
};
