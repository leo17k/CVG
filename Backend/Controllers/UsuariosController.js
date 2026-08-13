/**
 * UsuariosController.js
 * CRUD de usuarios y perfil del usuario autenticado.
 */

import pool from '../DataBase/Mysql/ConexionSQL.js';
import bcrypt from 'bcrypt';
import { sqlUsuarios, insertUsuarioSQL } from '../DataBase/Mysql/SQL.js';
import { buscarUsuario } from '../DataBase/Mysql/ConsultasSQL.js';

// GET /users
export const getUsers = async (req, res) => {
    const { gerencia, columna, busqueda, page = 1, limit = 12 } = req.query;
    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, Number(limit) || 12));
    const offset = (pageNumber - 1) * limitNumber;

    let baseSql = sqlUsuarios;
    const params = [];
    const conditions = [];

    const isAdmin = req.session.rol === 5 || req.session.rol === 1;
    if (!isAdmin) {
        conditions.push(`u.id_gerencia = (SELECT id_gerencia FROM usuarios WHERE id_usuario = ?)`);
        params.push(req.session.userId);
    }

    if (gerencia) {
        conditions.push('g.id_gerencia = ?');
        params.push(gerencia);
    }

    if (columna && busqueda) {
        const camposPermitidos = ['nombres', 'apellidos', 'email', 'username', 'cedula', 'id_usuario'];
        if (camposPermitidos.includes(columna)) {
            conditions.push(`u.${columna} LIKE ?`);
            params.push(`%${busqueda}%`);
        } else if (columna === 'rol' || columna === 'nombre_rol') {
            conditions.push(`r.nombre_rol LIKE ?`);
            params.push(`%${busqueda}%`);
        }
    }

    if (conditions.length > 0) {
        baseSql += ' WHERE ' + conditions.join(' AND ');
    }

    const countSql = `SELECT COUNT(*) AS total FROM (${baseSql}) AS filtered_users`;

    try {
        const [[countRow]] = await pool.query(countSql, params);
        const total = Number(countRow?.total || 0);
        const totalPages = Math.max(1, Math.ceil(total / limitNumber));
        const safePage = Math.min(pageNumber, totalPages || pageNumber);

        const listSql = `${baseSql} LIMIT ? OFFSET ?`;
        const [usuarios] = await pool.query(listSql, [...params, limitNumber, offset]);

        return res.json({
            usuarios,
            total,
            page: safePage,
            limit: limitNumber,
            totalPages,
            hasNextPage: safePage < totalPages
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /context
export const getContext = async (req, res) => {
    try {
        const gerencias = await pool.query(`
            SELECT g.id_gerencia, g.nombre_gerencia, cc.codigo_centro AS codigo
            FROM gerencias g
            INNER JOIN centro_costo cc ON cc.id_gerencia = g.id_gerencia;
        `);
        const roles  = await pool.query('SELECT id_rol, nombre_rol FROM roles;');
        const campos = await pool.query('SHOW COLUMNS FROM usuarios');
        // Estadísticas rápidas del módulo de almacén (compatibilidad con frontend)
        const almacen = await pool.query(`
            SELECT
                (SELECT SUM(CASE WHEN stock_actual < stock_minimo THEN 1 ELSE 0 END) FROM productos_almacen) AS total_criticos,
                (SELECT COUNT(*) FROM productos_almacen) AS total_productos,
                (SELECT COUNT(*) FROM categorias) AS total_categorias,
                (SELECT COUNT(*) FROM solicitudes_compra s WHERE s.id_estado = 3) AS total_solicitudes
        `);

        res.status(200).json({
            gerencias: gerencias[0],
            roles: roles[0],
            almacen: almacen[0],
            campos: campos[0].map(c => c.Field)
        });
    } catch (error) {
        console.error('Error en /context:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};

// POST /usuarios
export const createUser = async (req, res) => {
    try {
        const { username, email, cedula, password, nombres, apellidos, id_rol, id_gerencia } = req.body;

        if (!username || !email || !cedula || !password || !nombres || !apellidos || !id_rol || !id_gerencia) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        if (Number(id_rol) === 1) {
            const [gerenciaCheck] = await pool.query('SELECT nombre_gerencia FROM gerencias WHERE id_gerencia = ?', [id_gerencia]);
            if (gerenciaCheck.length > 0) {
                const nombreG = gerenciaCheck[0].nombre_gerencia.toLowerCase();
                if (!nombreG.includes('informática') && !nombreG.includes('informatica') && !nombreG.includes('compra')) {
                    return res.status(403).json({ error: 'Un Administrador solo puede pertenecer a Informática o a Compra y Venta' });
                }
            } else {
                return res.status(400).json({ error: 'Gerencia no válida' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const avatarPadre = 'avatar-1.png';
        const valores = [
            username, hashedPassword, email, cedula, nombres, apellidos,
            id_rol, id_gerencia, avatarPadre
        ];

        const [resultado] = await pool.query(insertUsuarioSQL, valores);
        res.status(201).json({ message: 'Usuario creado exitosamente', id: resultado.insertId });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El username, email o cédula ya están en uso' });
        }
        res.status(500).json({ error: 'Error del servidor al crear usuario' });
    }
};

// PUT /usuarios/:id_usuario
export const updateUser = async (req, res) => {
    const id = req.params.id_usuario;
    if (!req.session.isLoggedIn) return res.status(401).json({ error: 'No autenticado' });

    const isAdmin = Number(req.session.rol) === 1 || Number(req.session.rol) === 5;
    if (!isAdmin && Number(req.session.userId) !== Number(id)) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        const allowedFields = ['nombres', 'apellidos', 'email', 'cedula', 'id_rol', 'id_gerencia', 'avatar', 'username', 'activo'];
        const updates = [];
        const values  = [];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                if (field === 'id_rol' && !isAdmin) {
                    return res.status(401).json({ error: 'Solo administradores pueden cambiar roles' });
                }
                updates.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        }

        if (updates.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });

        if (req.body.id_rol && Number(req.body.id_rol) === 1) {
            const [gerenciaCheck] = await pool.query('SELECT nombre_gerencia FROM gerencias WHERE id_gerencia = ?', [req.body.id_gerencia]);
            if (gerenciaCheck.length > 0) {
                const nombreG = (gerenciaCheck[0].nombre_gerencia || '').toLowerCase();
                if (!nombreG.includes('informática') && !nombreG.includes('informatica') && !nombreG.includes('compra')) {
                    return res.status(403).json({ error: 'Un Administrador solo puede pertenecer a Informática o a Compra y Venta' });
                }
            } else {
                return res.status(400).json({ error: 'Gerencia no válida' });
            }
        }

        values.push(id);
        const sql = `UPDATE usuarios SET ${updates.join(', ')} WHERE id_usuario = ?`;
        const [result] = await pool.query(sql, values);
        return res.json({ success: true, affectedRows: result.affectedRows });
    } catch (err) {
        console.error('Error al actualizar usuario:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El username, email o cédula ya están en uso' });
        }
        res.status(500).json({ error: 'Error interno' });
    }
};

// POST /perfil
export const getPerfil = async (req, res) => {
    try {
        const respuestaSQL = await buscarUsuario({ id: req.session.userId });
        const usuario = respuestaSQL.rows?.[0];

        if (req.session.isLoggedIn && usuario) {
            const expires    = req.session.cookie._expires;
                const expiresDate = new Date(expires);
                res.json({
                    userId: req.session.userId,
                    data: {
                        name: `${usuario.nombres} ${usuario.apellidos}`,
                        email: usuario.email,
                        rol: usuario.nombre_rol,
                        id_rol: Number(usuario.id_rol),
                        isAdmin: Number(usuario.id_rol) === 1 || usuario.nombre_rol === 'administrador',
                        avatar: usuario.avatar,
                        expires: expiresDate.toLocaleString('es-VE', {
                            year: 'numeric', month: 'long', day: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                        }),
                        expiresAt: expiresDate.toISOString()
                    }
                });
        } else {
            res.status(401).json({ message: 'Acceso denegado o usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error en perfil:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// POST /usuarios/:id_usuario/avatar
export const uploadAvatar = async (req, res) => {
    const id = req.params.id_usuario;
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        // Permisos: solo admin o el mismo usuario
        const isAdmin = Number(req.session.rol) === 1 || Number(req.session.rol) === 5;
        if (!isAdmin && Number(req.session.userId) !== Number(id)) return res.status(401).json({ error: 'No autorizado' });

        const filename = req.file.filename;
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const avatarUrl = `${baseUrl}/uploads/avatars/${filename}`;

        const [result] = await pool.query('UPDATE usuarios SET avatar = ? WHERE id_usuario = ?', [avatarUrl, id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

        return res.json({ success: true, avatar: avatarUrl });
    } catch (error) {
        console.error('Error subiendo avatar:', error);
        return res.status(500).json({ error: 'Error al subir avatar' });
    }
};

// POST /usuarios/:id_usuario/password
export const changePassword = async (req, res) => {
    const id = req.params.id_usuario;
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6) return res.status(400).json({ error: 'La nueva contraseña es demasiado corta' });

    try {
        const isAdmin = Number(req.session.rol) === 1 || Number(req.session.rol) === 5;
        if (!isAdmin && Number(req.session.userId) !== Number(id)) return res.status(401).json({ error: 'No autorizado' });

        // Si no es admin, verificar la contraseña actual
        if (!isAdmin) {
            const [rows] = await pool.query('SELECT password FROM usuarios WHERE id_usuario = ? LIMIT 1', [id]);
            if (!rows || rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
            const hashed = rows[0].password;
            const ok = await bcrypt.compare(currentPassword || '', hashed);
            if (!ok) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        }

        const newHashed = await bcrypt.hash(newPassword, 12);
        const [result] = await pool.query('UPDATE usuarios SET password = ? WHERE id_usuario = ?', [newHashed, id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

        return res.json({ success: true, message: 'Contraseña actualizada' });
    } catch (err) {
        console.error('Error cambiando contraseña:', err);
        return res.status(500).json({ error: 'Error interno' });
    }
};
