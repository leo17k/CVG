import pool from './ConexionSQL.js';

// Model: Operaciones sobre roles y sus permisos
export const getAllRoles = async () => {
  const [rows] = await pool.query('SELECT id_rol, nombre_rol FROM roles ORDER BY nombre_rol ASC');
  return rows;
};

export const getRoleById = async (id) => {
  const [rows] = await pool.query('SELECT id_rol, nombre_rol FROM roles WHERE id_rol = ?', [id]);
  return rows[0] || null;
};

export const getRolePermissions = async (id) => {
  const [rows] = await pool.query(`
    SELECT p.id_permiso, p.id_modulo, p.accion, p.descripcion, p.accion AS nombre_permiso
    FROM permisos p
    JOIN rol_permisos rp ON p.id_permiso = rp.id_permiso
    WHERE rp.id_rol = ?
  `, [id]);
  return rows;
};

export const createRole = async (nombre_rol) => {
  const [result] = await pool.query('INSERT INTO roles (nombre_rol) VALUES (?)', [nombre_rol]);
  return result.insertId;
};

export const updateRole = async (id, nombre_rol) => {
  const [result] = await pool.query('UPDATE roles SET nombre_rol = ? WHERE id_rol = ?', [nombre_rol, id]);
  return result.affectedRows > 0;
};

export const deleteRole = async (id) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM rol_permisos WHERE id_rol = ?', [id]);
    const [res] = await conn.query('DELETE FROM roles WHERE id_rol = ?', [id]);
    await conn.commit();
    return res.affectedRows > 0;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const syncRolePermissions = async (id, permisoIds = []) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM rol_permisos WHERE id_rol = ?', [id]);

    // Filtrar valores nulos/falsy antes de insertar
    const validIds = permisoIds.filter(pid => pid != null && pid !== '');
    if (validIds.length > 0) {
      // Insertar en bloque los pares (id_rol, id_permiso)
      const values = validIds.map(pid => [id, pid]);
      await conn.query('INSERT INTO rol_permisos (id_rol, id_permiso) VALUES ?', [values]);
    }

    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export default {
  getAllRoles,
  getRoleById,
  getRolePermissions,
  createRole,
  updateRole,
  deleteRole,
  syncRolePermissions
};
