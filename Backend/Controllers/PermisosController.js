import * as PermisosModel from '../DataBase/Mysql/PermisosModel.js';
import pool from '../DataBase/Mysql/ConexionSQL.js';

// En la estructura actual de la base de datos no existe `usuario_permisos`.
// Comprobamos permisos únicamente a través del rol del usuario (rol_permisos).
const hasPermission = async (userId, permissionName) => {
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

export const listByModule = async (req, res) => {
  if (!req.session.isLoggedIn || !await hasPermission(req.session.userId, 'ver_permisos')) return res.status(401).json({ error: 'No autorizado' });
  try {
    const rows = await PermisosModel.getAllPermissions();
    // Agrupar por módulo
    const map = new Map();
    rows.forEach(r => {
      const modId = r.id_modulo || 0;
      if (!map.has(modId)) map.set(modId, { id_modulo: modId, nombre_modulo: r.nombre_modulo || 'General', permisos: [] });
      map.get(modId).permisos.push({ id_permiso: r.id_permiso, accion: r.accion, descripcion: r.descripcion, nombre_permiso: r.nombre_permiso });
    });
    const modules = Array.from(map.values());
    console.log('Modules with permissions:', modules);
    res.json({ data: modules });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

export default { listByModule };
