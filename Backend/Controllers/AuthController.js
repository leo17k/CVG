/**
 * AuthController.js
 * Maneja autenticación: login, logout, verificación de sesión y recuperación de contraseña.
 */

import { verificarUsuarios } from '../DataBase/Mysql/ConsultasSQL.js';
import pool from '../DataBase/Mysql/ConexionSQL.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { sendResetPasswordEmail } from '../Funciones/mailer.js';

// Auto-creación de columnas necesarias para la recuperación de contraseña
(async () => {
    try {
        await pool.query(`ALTER TABLE usuarios ADD COLUMN reset_token VARCHAR(255) NULL`);
        console.log('[Database Setup] Columna reset_token verificada/añadida.');
    } catch (e) {
        // Ignorar si la columna ya existe
    }
    try {
        await pool.query(`ALTER TABLE usuarios ADD COLUMN reset_token_expires DATETIME NULL`);
        console.log('[Database Setup] Columna reset_token_expires verificada/añadida.');
    } catch (e) {
        // Ignorar si la columna ya existe
    }
})();

// POST /login
export const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const usuarioSQL = await verificarUsuarios({ username, password });

        if (!usuarioSQL || !usuarioSQL.success) {
            return res.status(401).json({ message: usuarioSQL?.error || 'Credenciales inválidas' });
        }

        if (usuarioSQL.data.activo === 0) {
            return res.status(401).json({ message: 'Este usuario ha sido desactivado' });
        }

        req.session.isLoggedIn = true;
        req.session.rol        = usuarioSQL.data.id_rol;
        req.session.userId     = usuarioSQL.data.id_usuario;
        req.session.username   = username;

        return res.status(200).json({
            message: 'Sesión iniciada',
            data: {
                ...usuarioSQL.data,
                isAdmin: Number(usuarioSQL.data.id_rol) === 1 || usuarioSQL.data.nombre_rol === 'administrador'
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// GET /check-session
export const checkSession = (req, res) => {
    if (req.session.isLoggedIn) {
        return res.status(200).json({
            isAuthenticated: true,
            userId: req.session.userId,
            datauser: {
                ...req.session,
                isAdmin: Number(req.session.rol) === 1
            }
        });
    }
    return res.status(401).json({ isAuthenticated: false, message: 'No autenticado' });
};

// POST /logout
export const logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error al destruir la sesión:', err);
            return res.status(500).json({ message: 'Error al cerrar sesión' });
        }
        res.clearCookie('mi_sid');
        return res.status(200).json({ message: 'Sesión cerrada correctamente' });
    });
};

// POST /auth/forgot-password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'El correo electrónico es requerido.' });
        }

        // Buscar si el usuario existe
        const [users] = await pool.query(
            'SELECT id_usuario, nombres, email FROM usuarios WHERE email = ? LIMIT 1',
            [email]
        );

        if (!users.length) {
            return res.status(404).json({ success: false, message: 'No existe un usuario registrado con este correo.' });
        }

        const user = users[0];
        const token = crypto.randomBytes(32).toString('hex');
        
        // Expiración en 1 hora
        const expires = new Date(Date.now() + 3600000); 

        // Guardar token y expiración
        await pool.query(
            'UPDATE usuarios SET reset_token = ?, reset_token_expires = ? WHERE id_usuario = ?',
            [token, expires, user.id_usuario]
        );

        // Link de restablecimiento (port 5173 es el del frontend)
        const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
        const resetLink = `${frontendOrigin}/login?token=${token}`;

        let destEmail = user.email || 'esteysertorres2@gmail.com';

        const mailResult = await sendResetPasswordEmail(destEmail, user.nombres, resetLink);
        if (!mailResult.success) {
            return res.status(500).json({ success: false, message: 'Error al enviar el correo de recuperación.' });
        }

        return res.status(200).json({ success: true, message: 'Se ha enviado un correo con instrucciones para restablecer tu contraseña.' });
    } catch (error) {
        console.error('Error en forgotPassword:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// POST /auth/reset-password
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: 'El token y la nueva contraseña son obligatorios.' });
        }

        if (String(newPassword).length < 6) {
            return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        // Buscar usuario con token válido y que no haya expirado
        const [users] = await pool.query(
            'SELECT id_usuario FROM usuarios WHERE reset_token = ? AND reset_token_expires > NOW() LIMIT 1',
            [token]
        );

        if (!users.length) {
            return res.status(400).json({ success: false, message: 'El enlace de recuperación es inválido o ha expirado.' });
        }

        const user = users[0];
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Actualizar contraseña y limpiar token
        await pool.query(
            'UPDATE usuarios SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id_usuario = ?',
            [hashedPassword, user.id_usuario]
        );

        return res.status(200).json({ success: true, message: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.' });
    } catch (error) {
        console.error('Error en resetPassword:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};
