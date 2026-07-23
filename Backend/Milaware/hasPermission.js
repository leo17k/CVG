/**
 * hasPermission.js
 * Helper centralizado para verificar si un usuario tiene un permiso específico.
 * Soporta permisos directos por usuario y permisos heredados desde el rol.
 */

import pool from '../DataBase/Mysql/ConexionSQL.js';

/**
 * Verifica si el usuario (userId) tiene el permiso indicado (permissionName).
 * Primero revisa permisos directos del usuario, luego los del rol.
 * Los SuperAdministradores (id_rol = 5) siempre tienen acceso total.
 *
 * @param {number} userId
 * @param {string} permissionName - nombre de la acción en la tabla `permisos`
 * @returns {Promise<boolean>}
 */
const hasPermission = async (userId, permissionName) => {
    // 1. Permisos asignados directamente al usuario
    try {
        const [rows] = await pool.query(`
            SELECT 1 FROM usuario_permisos up
            JOIN permisos p ON up.id_permiso = p.id_permiso
            WHERE up.id_usuario = ? AND (p.accion = ? OR p.accion = 'Total')
        `, [userId, permissionName]);
        if (rows.length > 0) return true;
    } catch (error) {
        if (error?.code !== 'ER_NO_SUCH_TABLE' && error?.errno !== 1146) {
            console.error('hasPermission — Error permisos directos:', error);
        }
    }

    // 2. Permisos heredados desde el rol
    try {
        // SuperAdministrador (id_rol = 5): acceso total
        const [urows] = await pool.query(
            'SELECT u.id_rol, r.nombre_rol FROM usuarios u LEFT JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = ?',
            [userId]
        );
        if (
            urows?.[0] &&
            (Number(urows[0].id_rol) === 5 ||
                (urows[0].nombre_rol || '').toLowerCase() === 'superadministrador')
        ) {
            return true;
        }

        const [rows] = await pool.query(`
            SELECT 1 FROM usuarios u
            JOIN rol_permisos rp ON u.id_rol = rp.id_rol
            JOIN permisos p ON rp.id_permiso = p.id_permiso
            WHERE u.id_usuario = ? AND (p.accion = ? OR p.accion = 'Total')
        `, [userId, permissionName]);

        return rows.length > 0;
    } catch (error) {
        console.error('hasPermission — Error permisos por rol:', error);
        return false;
    }
};


export default hasPermission;
