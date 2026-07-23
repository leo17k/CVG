/**
 * MensajesController.js
 * Maneja mensajes, chats y notificaciones del sistema.
 */

import pool from '../DataBase/Mysql/ConexionSQL.js';
import { registrarMensaje, germensaje, getChat, getMensajes as dbGetMensajes } from '../DataBase/Mysql/ConsultasSQL.js';
import { getIO } from '../socket.js';

// GET /notificaciones
export const getNotificaciones = async (req, res) => {
    const id = req.session.userId;
    const sql = `
        SELECT 
            n.id_notificacion,
            n.id_solicitud,
            n.contenido,
            n.status,
            n.fecha,
            s.id_solicitante as id_usuario,
            CONCAT('Solicitud: ', s.resumen) AS resumen,
            u.nombres,
            u.apellidos
        FROM notificaciones n
        INNER JOIN solicitudes_compra s ON n.id_solicitud = s.id_solicitud
        INNER JOIN usuarios u ON s.id_solicitante = u.id_usuario
        WHERE s.id_solicitante = ?
        UNION ALL
        SELECT
            ns.id_not_soli AS id_notificacion,
            NULL AS id_solicitud,
            ns.contenido,
            ns.status,
            ns.fecha,
            ? AS id_usuario,
            CONCAT('Alerta: ', g.nombre_gerencia) AS resumen,
            'Sistema' AS nombres,
            '' AS apellidos
        FROM notificaciones_not_solisitud ns
        INNER JOIN gerencias g ON ns.id_gerencia = g.id_gerencia
        INNER JOIN usuarios u ON u.id_usuario = ?
        WHERE (u.id_rol = 1) OR (ns.id_gerencia = u.id_gerencia)
        ORDER BY fecha DESC;
    `;
    try {
        const notificaciones = await pool.query(sql, [id, id, id]);
        res.status(200).json({
            notificaciones: notificaciones[0],
            newalert: notificaciones[0].length > 0
        });
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};

// POST /mensajes
export const postMensaje = async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: 'No autorizado' });

    const fromId = req.session.userId;
    const { mensaje, toId, idSolicitud, replyTo } = req.body;
    const idRespuesta = replyTo?.id || req.body.replyToId || null;

    const result = await registrarMensaje(fromId, toId, mensaje, idSolicitud, idRespuesta);

    if (result.success) {
        const newMsg = {
            idMensaje:  result.insertId,
            id_mensaje: result.insertId,
            idChat:     result.idChat,
            id_chat:    result.idChat,
            fromId,
            id_emisor:  fromId,
            toId,
            mensaje,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        // Añadir metadata del remitente (nombre y avatar) para el socket
        try {
            const [uRows] = await pool.query('SELECT nombres, apellidos, avatar FROM usuarios WHERE id_usuario = ? LIMIT 1', [fromId]);
            if (uRows && uRows.length) {
                const u = uRows[0];
                newMsg.remitente = { name: `${u.nombres || ''} ${u.apellidos || ''}`.trim() || (req.session.username || 'Usuario'), avatar: u.avatar || null };
            } else {
                newMsg.remitente = { name: req.session.username || 'Usuario', avatar: null };
            }
        } catch (e) {
            newMsg.remitente = { name: req.session.username || 'Usuario', avatar: null };
        }
        // Si hay una respuesta referenciada, obtener metadatos para enviarlos por socket
        if (idRespuesta) {
            try {
                const [r] = await pool.query(`SELECT m.contenido AS respuesta_contenido, u.nombres, u.apellidos, u.avatar FROM mensajes m JOIN usuarios u ON m.id_emisor = u.id_usuario WHERE m.id_mensaje = ? LIMIT 1`, [idRespuesta]);
                if (r && r.length) {
                    newMsg.reply = {
                        id: idRespuesta,
                        mensaje: r[0].respuesta_contenido,
                        remitente: { name: `${r[0].nombres} ${r[0].apellidos}`, avatar: r[0].avatar }
                    };
                }
            } catch (e) { /* no crítico */ }
        }

        try {
            // Obtener participantes del chat
            let participants = [];
            try {
                const [pRows] = await pool.execute('SELECT id_usuario FROM chat_participantes WHERE id_chat = ?', [result.idChat]);
                participants = pRows || [];
            } catch (e) {
                participants = [];
            }

            // Seleccionar sala y evento según si es grupal (solicitud) o privado
            const isGroup = !!idSolicitud;
            const roomKey = isGroup ? `solicitud_${idSolicitud}` : String(result.idChat);
            const eventName = isGroup ? 'nuevo_mensaje' : 'receive_message';

            // Construir payload base
            const eventPayload = isGroup ? {
                id_mensaje: result.insertId,
                id_chat: result.idChat,
                id_emisor: fromId,
                contenido: mensaje,
                fecha_envio: new Date().toISOString(),
                remitente: newMsg.remitente,
                respuesta: newMsg.reply || null
            } : { ...newMsg };

            // Emitir por-socket en la sala (payload incluye id_mensaje e id_emisor)
            const roomSockets = getIO().sockets.adapter.rooms.get(roomKey) || new Set();
            const presentUserIds = new Set();
            for (const sid of roomSockets) {
                const s = getIO().sockets.sockets.get(sid);
                if (!s) continue;
                const sidUserId = s.request?.session?.userId;
                if (sidUserId) presentUserIds.add(Number(sidUserId));
                try { s.emit(eventName, eventPayload); } catch (_) { }
            }

            // Notificar por `user_{id}` sólo a participantes ausentes en la sala
            for (const p of participants) {
                const pid = p.id_usuario || p.id;
                if (!pid) continue;
                if (Number(pid) === Number(fromId)) continue;
                if (presentUserIds.has(Number(pid))) continue;
                try { getIO().to(`user_${pid}`).emit(eventName, eventPayload); } catch (_) { }
            }

        } catch (err) { console.error('Socket emit error:', err); }

        return res.status(201).json({ success: true, message: newMsg });
    }
    res.status(500).json({ error: 'Error DB' });
};

const getMensajesByidchat = async (idchat, offset, req) => {
    const id = idchat;
    try {
        const senderId = req.session.userId;
        const Chat = id;

        const [rows] = await pool.execute(`
            SELECT
                m.id_mensaje,
                m.contenido AS mensaje,
                m.fecha_envio,
                m.leido,
                m.id_emisor,
                CONCAT(u.nombres, ' ', u.apellidos) AS nombre_emisor,
                u.avatar,
                (m.id_emisor = ?) AS ismy,
                m.id_respuesta,
                m_resp.contenido AS respuesta_contenido,
                u_resp.nombres  AS respuesta_nombres,
                u_resp.apellidos AS respuesta_apellidos,
                u_resp.avatar AS respuesta_avatar
            FROM mensajes m
            JOIN usuarios u ON m.id_emisor = u.id_usuario
            LEFT JOIN mensajes m_resp ON m.id_respuesta = m_resp.id_mensaje
            LEFT JOIN usuarios u_resp ON m_resp.id_emisor = u_resp.id_usuario
            WHERE m.id_chat = ?
            ORDER BY m.fecha_envio DESC
            LIMIT 20 OFFSET ?
        `, [senderId, Chat, String(offset)]); // Asegúrate que offset sea string o número según tu driver

        // IMPORTANTE: Invertimos el array para que al llegar al frontend 
        // el mensaje más reciente esté al final del bloque cargado.
        return rows.reverse(); 
    } catch (err) {
        console.error('Error al obtener mensajes por solicitud:', err);
        throw err; // Lanzamos el error para que lo capture el catch del padre
    }
};

// GET /mensajes
// GET /mensajes
export const getMensajes = async (req, res) => {
    try {
        const idChat = req.query?.idChat;
        const offset = Number(req.query?.offset) || 0;
        const myId = req.session?.userId;

        if (!myId) return res.status(401).json({ error: 'No autorizado' });
        if (!idChat) return res.status(400).json({ error: 'idChat requerido' });

        // Obtenemos los datos directamente
        const mensajes = await getMensajesByidchat(idChat, offset, req);

        // Enviamos la respuesta. Tu frontend espera "mensaje" o "data".
        // Según tu Chat.jsx: nuevosMensajes = result.mensaje || result.data;
        return res.status(200).json({ 
            success: true,
            mensaje: mensajes 
        });

    } catch (err) {
        console.error('Error en controlador getMensajes:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// GET /chats
export const getChats = async (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'No has iniciado sesión' });

    const result = await getChat(userId);
    if (!result.success) return res.status(500).json({ error: result.error });

    const formatted = result.rows.map(m => {
        const isGroup = !!m.id_solicitud;
        const displayName = isGroup ? (m.referencia_solicitud || `Solicitud #${m.id_solicitud}`) : `${m.from_nombres} ${m.from_apellidos}`;
        return {
            chatId:    m.id_chat,
            idMensaje: m.id_mensaje,
            idSolicitud: m.id_solicitud,
            isGroup: isGroup,
            id:        m.from_id,
            name:      displayName,
            avatar:    isGroup ? null : m.from_avatar,
            initials:  displayName ? displayName.charAt(0).toUpperCase() : '?',
            to: {
                id:       m.from_id,
                username: m.from_username,
                name:     `${m.from_nombres} ${m.from_apellidos}`,
                avatar:   m.from_avatar
            },
            from: {
                id:       m.to_id,
                username: m.to_username,
                name:     `${m.to_nombres} ${m.to_apellidos}`,
                avatar:   m.to_avatar
            },
            mensaje: m.ultimo_mensaje,
            time:    m.fecha_ultimo_mensaje,
            view:    m.view,
            unread:  m.view === 0 && m.id_emisor !== userId
        };
    });

    return res.status(200).json({ mensaje: formatted, count: formatted.length, data: result });
};

// DELETE /notificaciones/:id
export const deleteNotification = async (req, res) => {
    if (!req.session.isLoggedIn) return res.status(401).json({ error: 'No autenticado' });
    const { id } = req.params;
    const idNum = Number(id);
    if (!Number.isFinite(idNum) || idNum <= 0) return res.status(400).json({ error: 'Id de notificación inválido' });
    const userId = req.session.userId;
    try {
        // 1) Intentar borrar notificación ligada a solicitud (propietario o admin)
        const [delRes] = await pool.query(
            `DELETE n FROM notificaciones n
             INNER JOIN solicitudes_compra s ON n.id_solicitud = s.id_solicitud
             WHERE n.id_notificacion = ? AND (s.id_solicitante = ? OR ? IN (1,5))
             LIMIT 1`,
            [idNum, userId, Number(req.session.rol || 0)]
        );
        if (delRes.affectedRows > 0) {
            try { getIO().to(`user_${userId}`).emit('notification_deleted', { id: Number(id) }); } catch (_) {}
            return res.json({ success: true });
        }

        // 2) Intentar borrar alerta de gerencia (notificaciones_not_solisitud)
        const [[row]] = await pool.query('SELECT id_gerencia FROM notificaciones_not_solisitud WHERE id_not_soli = ? LIMIT 1', [idNum]);
        if (!row) return res.status(404).json({ error: 'Notificación no encontrada' });

        const idGerencia = row.id_gerencia;
        const [[uRow]] = await pool.query('SELECT id_gerencia, id_rol FROM usuarios WHERE id_usuario = ? LIMIT 1', [userId]);
        const userGer = uRow?.id_gerencia;
        const userRol = Number(uRow?.id_rol || 0);

        if (userRol === 1 || userRol === 5 || userGer === idGerencia) {
            const [delRes2] = await pool.query('DELETE FROM notificaciones_not_solisitud WHERE id_not_soli = ? LIMIT 1', [idNum]);
            if (delRes2.affectedRows > 0) {
                try { getIO().to(`user_${userId}`).emit('notification_deleted', { id: Number(id) }); } catch (_) {}
                return res.json({ success: true });
            }
            return res.status(500).json({ error: 'No se pudo eliminar la notificación' });
        }

        return res.status(403).json({ error: 'No autorizado para eliminar esta notificación' });
    } catch (err) {
        console.error('Error eliminando notificación:', err);
        return res.status(500).json({ error: 'Error del servidor' });
    }
};
