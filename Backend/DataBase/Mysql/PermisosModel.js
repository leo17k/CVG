import pool from './ConexionSQL.js';

export const getAllPermissions = async () => {
  const [rows] = await pool.query(`
    SELECT m.id_modulo, m.nombre AS nombre_modulo,
           p.id_permiso, p.accion, p.descripcion, p.accion AS nombre_permiso
    FROM modulos m
    LEFT JOIN permisos p ON p.id_modulo = m.id_modulo
    ORDER BY m.nombre, p.accion
  `);
  return rows;
};

export default { getAllPermissions };
