/**
 * SolicitudesController.js
 * CRUD completo de solicitudes de compra/servicio/obra:
 *   - listar, detalle, crear, cambiar estado, verificar (almacén),
 *     vistas especiales de almacén y compras.
 */

import pool from '../DataBase/Mysql/ConexionSQL.js';
import { insetSolicitud } from '../DataBase/Mysql/InsertSQL.js';
import { consultarproductos, solicitudESCOMPRA } from '../DataBase/Mysql/ConsultasSQL.js';
import { getIO } from '../socket.js';
import { generarPDFBuffer } from '../Milaware/PDF.js';
import { sendStatusChangeEmail, sendApprovalEmail } from '../Funciones/mailer.js';
import { connection as connectionAccess } from '../DataBase/Acces/ConexionACCES.js';
import { sendSolicitudToAccess } from '../DataBase/Acces/accessJobs.js';
import { normalizarNombreEstado, obtenerAliasesEstado } from '../Funciones/estadosSolicitud.js';

// ── Helper privado ────────────────────────────────────────────────────────────
const getEstadoId = async (nombre) => {
    const candidatos = obtenerAliasesEstado(nombre);

    for (const candidato of candidatos) {
        const [rows] = await pool.query(
            'SELECT id_estado, color_hex FROM estados_solicitud WHERE nombre = ? LIMIT 1',
            [candidato]
        );
        if (rows.length) return rows[0];
    }

    throw new Error(`Estado '${nombre}' no existe en estados_solicitud`);
};

// GET /solicitudes
export const getSolicitudes = async (req, res) => {
    try {
        const userId   = req.session.userId  ?? null;
        const userRole = req.session.rol      ?? null;

        if (!req.session.isLoggedIn || !userId) {
            return res.status(401).json({ err: 'No autenticado' });
        }

        const page     = parseInt(req.query.page)   || 1;
        const limit    = parseInt(req.query.limit)  || 10;
        const estado   = req.query.estado   || null;
        const busqueda = req.query.busqueda || null;
        const tipo     = req.query.tipo     || null;
        const vista    = req.query.vista    || null;
        const id_usuario = req.query.id_usuario || null;
        const id_gerencia = req.query.id_gerencia || null;

        const isAdmin = Number(userRole) === 1 || Number(userRole) === 5 || Number(userRole) === 11;
        const result  = isAdmin
            ? await solicitudESCOMPRA({ page, limit, estado, busqueda, tipo, roleId: userRole, userId, vista, id_usuario, id_gerencia })
            : await solicitudESCOMPRA({ userId, roleId: userRole, page, limit, estado, busqueda, tipo, vista, id_usuario, id_gerencia });

        res.status(200).json({
            mensaje: result.rows,
            total:   result.totalRows.total,
            counts:  result.totalRows,
            page,
            limit
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ err: 'error del servidor' });
    }
};

// GET /solicitudes/almacen
export const getSolicitudesAlmacen = async (req, res) => {
    if (!req.session.isLoggedIn) return res.status(401).json({ error: 'No autenticado' });
    try {
        const [rows] = await pool.query(`
            SELECT
                s.id_solicitud,
                s.codigo_solicitud,
                s.fecha_creacion,
                s.resumen,
                s.justificacion,
                s.tipo_solicitud,
                g.nombre_gerencia,
                CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
                u.avatar,
                e.nombre     AS estado,
                e.color_hex  AS estado_color,
                IFNULL((
                    SELECT GROUP_CONCAT(CONCAT(
                        COALESCE(p.nombre_producto, srv.nombre_servicio), '::',
                        ds.cantidad, '::',
                        COALESCE(p.stock_actual, 0), '::',
                        COALESCE(p.stock_minimo, 0)
                    ) SEPARATOR '||')
                    FROM detalles_solicitud ds
                    LEFT JOIN productos_almacen p  ON ds.id_producto = p.id_producto
                    LEFT JOIN servicios         srv ON ds.id_servicio = srv.id_servicio
                    WHERE ds.id_solicitud = s.id_solicitud
                ), '') AS items
            FROM solicitudes_compra s
            JOIN gerencias         g ON s.id_gerencia   = g.id_gerencia
            JOIN usuarios          u ON s.id_solicitante = u.id_usuario
            JOIN estados_solicitud e ON s.id_estado      = e.id_estado
            WHERE e.nombre = 'Aprobado Gerencia'
              AND s.tipo_solicitud = 'Compra'
            ORDER BY CASE e.nombre
                WHEN 'Aprobado Gerencia' THEN 0
                WHEN 'En Compras' THEN 1
                WHEN 'Aprovadas' THEN 2
                WHEN 'Pendiente' THEN 3
                ELSE 99
            END ASC,
            s.fecha_creacion DESC
        `);
        res.status(200).json({ data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
};

// GET /solicitudes/compras
export const getSolicitudesCompras = async (req, res) => {
    if (!req.session.isLoggedIn) return res.status(401).json({ error: 'No autenticado' });
    try {
        const [rows] = await pool.query(`
            SELECT
                s.id_solicitud,
                s.codigo_solicitud,
                s.fecha_creacion,
                s.resumen,
                s.justificacion,
                s.tipo_solicitud,
                g.nombre_gerencia,
                CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
                u.avatar,
                e.nombre     AS estado,
                e.color_hex  AS estado_color
            FROM solicitudes_compra s
            JOIN gerencias         g ON s.id_gerencia   = g.id_gerencia
            JOIN usuarios          u ON s.id_solicitante = u.id_usuario
            JOIN estados_solicitud e ON s.id_estado      = e.id_estado
            WHERE e.nombre = 'En Compras'
            ORDER BY CASE e.nombre
                WHEN 'En Compras' THEN 0
                WHEN 'Aprobado Gerencia' THEN 1
                WHEN 'Aprovadas' THEN 2
                WHEN 'Pendiente' THEN 3
                ELSE 99
            END ASC,
            s.fecha_creacion DESC
        `);
        res.json({ data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
};

// GET /solicitudes/:id
export const getSolicitudById = async (req, res) => {
    const { id } = req.params;
    try {
        const [soliRows] = await pool.execute(`
            SELECT
                s.id_solicitud,
                s.codigo_solicitud,
                s.fecha_creacion,
                s.resumen,
                s.justificacion,
                s.justificacion_pdf_url,
                s.requerimientos_texto,
                s.requerimientos_pdf_url,
                s.tipo_solicitud,
                s.prioridad,
                s.id_solicitante,
                g.nombre_gerencia,
                CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
                CONCAT(u.nombres, ' ', u.apellidos) AS nombre_solicitante,
                u.avatar,
                u.email,
                u.id_rol    AS solicitante_rol_id,
                e.nombre    AS estado_nombre,
                e.color_hex AS estado_color
            FROM solicitudes_compra s
            LEFT JOIN gerencias         g ON s.id_gerencia    = g.id_gerencia
            LEFT JOIN usuarios          u ON s.id_solicitante  = u.id_usuario
            LEFT JOIN estados_solicitud e ON s.id_estado       = e.id_estado
            WHERE s.id_solicitud = ?
            LIMIT 1
        `, [id]);

        if (!soliRows.length) return res.status(404).json({ error: 'Solicitud no encontrada' });

        const [detalleRows] = await pool.execute(`
            SELECT
                d.id_detalle,
                d.cantidad,
                d.id_producto,
                d.id_servicio,
                COALESCE(p.nombre_producto,  s.nombre_servicio)  AS nombre_item,
                COALESCE(p.codigo_producto,  s.codigo_servicio)  AS codigo_item,
                COALESCE(p.descripcion,      s.descripcion)      AS descripcion_detalle,
                u_p.nombre_unidad,
                u_p.abreviatura AS unidad_abreviatura
            FROM detalles_solicitud d
            LEFT JOIN productos_almacen p  ON d.id_producto = p.id_producto
            LEFT JOIN servicios          s  ON d.id_servicio = s.id_servicio
            LEFT JOIN unidades_medida   u_p ON p.id_unidad   = u_p.id_unidad
            WHERE d.id_solicitud = ?
            ORDER BY d.id_detalle ASC
        `, [id]);

        // Buscar historial (últimos cambios) para mostrar stack de estados y aprobador
        try {
            const [histRows] = await pool.execute(`
                SELECT usuario_responsable, estado_anterior, estado_nuevo, fecha_cambio, comentarios_observacion
                FROM historial_estados
                WHERE id_solicitud = ?
                ORDER BY fecha_cambio DESC
                LIMIT 10
            `, [id]);

            const historial = [];
            for (const h of histRows || []) {
                let responsableInfo = null;
                if (h.usuario_responsable) {
                    try {
                        let [uRows] = await pool.execute(`SELECT id_usuario, nombres, apellidos, avatar, username FROM usuarios WHERE username = ? LIMIT 1`, [h.usuario_responsable]);
                        if ((!uRows || !uRows.length) && /^\d+$/.test(String(h.usuario_responsable))) {
                            const [uRowsById] = await pool.execute(`SELECT id_usuario, nombres, apellidos, avatar, username FROM usuarios WHERE id_usuario = ? LIMIT 1`, [Number(h.usuario_responsable)]);
                            uRows = uRowsById;
                        }
                        if (uRows && uRows.length) {
                            const u = uRows[0];
                            responsableInfo = { id_usuario: u.id_usuario, nombres: u.nombres, apellidos: u.apellidos, avatar: u.avatar, username: u.username };
                        } else {
                            responsableInfo = { nombre: h.usuario_responsable };
                        }
                    } catch (e) {
                        responsableInfo = { nombre: h.usuario_responsable };
                    }
                }

                historial.push({
                    usuario_responsable: h.usuario_responsable,
                    responsable: responsableInfo,
                    estado_anterior: h.estado_anterior,
                    estado_nuevo: h.estado_nuevo,
                    fecha_cambio: h.fecha_cambio,
                    comentarios: h.comentarios_observacion || null
                });
            }

            const aprobador = historial.length ? historial[0] : null;

            return res.json({ solicitud: soliRows[0], detalles: detalleRows, historial, aprobador });
        } catch (errHist) {
            console.error('Error buscando historial de estados:', errHist);
            return res.json({ solicitud: soliRows[0], detalles: detalleRows, historial: [], aprobador: null });
        }
    } catch (error) {
        console.error('Error obteniendo detalle de solicitud:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// POST /crearsolicitud
export const createSolicitud = async (req, res) => {
    const {
        resumen,
        justificacion,
        requerimientos_texto,
        tipo_solicitud = 'Compra',
        prioridad = 'Media',
        usuario,
        productos: productosRaw
    } = req.body;

    let productos = [];
    try {
        if (Array.isArray(productosRaw)) {
            productos = productosRaw;
        } else if (productosRaw && typeof productosRaw === 'string') {
            productos = JSON.parse(productosRaw);
        } else if (productosRaw && typeof productosRaw === 'object') {
            productos = Array.isArray(productosRaw.items) ? productosRaw.items : [];
        }
    } catch {
        productos = [];
    }

    const justificacion_pdf_url = req.files && req.files['justificacion_pdf'] ? req.files['justificacion_pdf'][0].filename : null;
    const requerimientos_pdf_url = req.files && req.files['requerimientos_pdf'] ? req.files['requerimientos_pdf'][0].filename : null;
    const idUsuario = usuario || req.session.userId;

    let id_gerencia = null;
    try {
        const [gRows] = await pool.query('SELECT id_gerencia FROM usuarios WHERE id_usuario = ? LIMIT 1', [idUsuario]);
        id_gerencia = gRows[0]?.id_gerencia || null;
    } catch (e) {
        console.error('Error obteniendo gerencia del usuario:', e);
    }

    try {
        const result = await insetSolicitud({
            resumen,
            justificacion,
            justificacion_pdf_url: justificacion_pdf_url || null,
            requerimientos_texto: requerimientos_texto || null,
            requerimientos_pdf_url: requerimientos_pdf_url || null,
            tipo_solicitud,
            prioridad,
            productos,
            id_usuario: idUsuario,
            id_gerencia
        });

        if (result.codigo && result.codigo !== 201) {
            return res.status(result.codigo).json(result);
        }

        res.status(201).json({
            mensaje: 'Solicitud creada con éxito',
            id: result.id,
            codigo_solicitud: result.codigo_solicitud,
            pdf: requerimientos_pdf_url
        });
    } catch (error) {
        console.error('Error creando solicitud:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

// PUT /solicitudes/:id/estado
export const updateEstado = async (req, res) => {
    try {
        const { id }    = req.params;
        const { estado } = req.body;
        const userId     = req.session.userId;
        const userRole   = req.session.rol ?? null;

        if (!req.session.isLoggedIn) return res.status(401).json({ success: false, message: 'No autenticado' });
        if (!estado)                 return res.status(400).json({ success: false, message: 'Estado requerido' });

        const estadoSolicitado = normalizarNombreEstado(estado);

        const [soliRows] = await pool.query(
            `SELECT s.*, e.nombre AS estado_actual, s.tipo_solicitud
             FROM solicitudes_compra s
             LEFT JOIN estados_solicitud e ON s.id_estado = e.id_estado
             WHERE s.id_solicitud = ?`,
            [id]
        );
        if (!soliRows.length) return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });

        const solicitud = soliRows[0];

        // Enrutamiento automático: Servicio/Obra aprobado por gerencia → En Compras directamente
        let estadoFinal = estadoSolicitado;
        if (estadoSolicitado === 'Aprobado Gerencia' && ['Servicio', 'Obra'].includes(solicitud.tipo_solicitud)) {
            estadoFinal = 'En Compras';
        }

        // Validaciones de permisos por rol antes de aplicar ciertos estados
        const roleId = Number(userRole || 0);
        const isSuper = roleId === 1 || roleId === 5 || roleId === 11; // roles administrativos

        // Comprador (id_rol = 10) es el que puede marcar como 'Aprovadas'
        if (String(estadoFinal) === 'Aprovadas' && !isSuper && roleId !== 10) {
            return res.status(403).json({ success: false, message: 'No autorizado para aprobar esta solicitud' });
        }

        // Solo Gerente (id_rol = 8) o admins pueden marcar 'Aprobado Gerencia'
        if (String(estadoFinal) === 'Aprobado Gerencia' && !isSuper && roleId !== 8) {
            return res.status(403).json({ success: false, message: 'No autorizado para aprobar en nombre de gerencia' });
        }

        const estadoInfo = await getEstadoId(estadoFinal);
        const estadoPersistido = estadoInfo.nombre || estadoFinal;
        await pool.execute('UPDATE solicitudes_compra SET id_estado = ? WHERE id_solicitud = ?', [estadoInfo.id_estado, id]);

        // Historial
        const nombreUsuario = req.session.username || 'Sistema';
        await pool.query(
            `INSERT INTO historial_estados (id_solicitud, estado_anterior, estado_nuevo, usuario_responsable)
             VALUES (?, ?, ?, ?)`,
            [id, solicitud.estado_actual, estadoPersistido, nombreUsuario]
        );

        // Notificación al solicitante via DB + Socket
        const dbStatus = estadoPersistido === 'Rechazado' ? 'error' : estadoPersistido === 'Finalizado' ? 'ok' : 'info';
        const contenido = `Tu solicitud "${solicitud.resumen}" pasó a: ${estadoPersistido}.`;
        const [resNotif] = await pool.query(
            'INSERT INTO notificaciones (id_solicitud, contenido, status) VALUES (?, ?, ?)',
            [id, contenido, dbStatus]
        );

        try {
            getIO().to(`user_${solicitud.id_solicitante}`).emit('receive_notification', {
                id_notificacion: resNotif.insertId,
                id_solicitud: id,
                contenido,
                status: dbStatus,
                fecha: new Date().toISOString(),
                resumen: solicitud.resumen,
                estado_color: estadoInfo.color_hex
            });
        } catch (_) { /* Socket no crítico */ }

        // ── Enviar Notificación por Correo (Asíncrono en segundo plano) ────────────────
        (async () => {
            try {
                const [userRows] = await pool.query(
                    'SELECT email, nombres, apellidos FROM usuarios WHERE id_usuario = ? LIMIT 1',
                    [solicitud.id_solicitante]
                );

                if (userRows.length > 0) {
                    const requester = userRows[0];
                    let destEmail = requester.email || 'esteysertorres2@gmail.com';
                    const nombresCompletos = `${requester.nombres} ${requester.apellidos}`;

                    const codigoVisible = solicitud.codigo_solicitud || `#${id}`;

                    if (estadoPersistido === 'Aprovadas' || estadoPersistido === 'Aprobadas') {
                        // Generar PDF y enviar correo de aprobación con adjunto
                        const pdfBuffer = await generarPDFBuffer(id);
                        await sendApprovalEmail(destEmail, nombresCompletos, codigoVisible, solicitud.resumen, pdfBuffer);
                    } else {
                        // Notificación de cambio de estado
                        await sendStatusChangeEmail(destEmail, nombresCompletos, codigoVisible, solicitud.resumen, estadoPersistido);
                    }
                }
            } catch (emailErr) {
                console.error('[Notification Email Error] Error enviando correo de cambio de estado:', emailErr);
            }
        })();

        // Si fue aprobado por gerencia, notificar a usuarios de Almacén (no crear chats automáticamente)
        if (estadoFinal === 'Aprobado Gerencia') {
            try {
                const [almacenUsers] = await pool.execute('SELECT id_usuario FROM usuarios WHERE id_rol = 9');
                for (const u of almacenUsers) {
                    try {
                        const [resAlmNotif] = await pool.query('INSERT INTO notificaciones (id_solicitud, contenido, status) VALUES (?, ?, ?)', [id, contenido, 'info']);
                        try {
                            getIO().to(`user_${u.id_usuario}`).emit('receive_notification', {
                                id_notificacion: resAlmNotif.insertId,
                                id_solicitud: id,
                                contenido: contenido,
                                status: 'info',
                                fecha: new Date().toISOString(),
                                resumen: solicitud.resumen,
                                estado_color: estadoInfo.color_hex
                            });
                        } catch (_) {}
                    } catch (_) {
                        // ignore per-user notification failures
                    }
                }
            } catch (errNotify) {
                console.error('Error notificando a almacén tras aprobación de gerencia:', errNotify);
            }
        }

        // Si la solicitud es de tipo Compra/Servicio/Obra y llegó a Aprovadas, sincronizar a Access en segundo plano
        // sin bloquear la respuesta del backend ni el cierre del modal en frontend.
        if (
            ['Aprovadas', 'Aprobadas', 'En Compras'].includes(estadoPersistido)
            && ['Compra', 'Servicio', 'Obra'].includes(solicitud.tipo_solicitud)
        ) {
            void (async () => {
                try {
                    await sendSolicitudToAccess(id);
                } catch (accessErr) {
                    try {
                        const fs = await import('fs');
                        const path = await import('path');
                        const { fileURLToPath } = await import('url');
                        const __filename = fileURLToPath(import.meta.url);
                        const __dirname = path.dirname(__filename);
                        const logPath = path.resolve(__dirname, '..', 'logs', 'access-sync.log');
                        const msg = `${new Date().toISOString()} - Error envío inmediato Access solicitud ${id}: ${accessErr.message || accessErr}\n`;
                        fs.appendFileSync(logPath, msg);
                    } catch (logErr) {
                        console.error('[AccessRealtime] Error registrando fallo al log:', logErr);
                    }
                }
            })();
        }

        res.status(200).json({
            success: true,
            message: `Estado actualizado a: ${estadoPersistido}`,
            estado: estadoPersistido,
            color: estadoInfo.color_hex
        });
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        res.status(500).json({ success: false, message: error.message || 'Error interno del servidor' });
    }
};

// PUT /solicitudes/:id/verificar  (Almacén → En Compras)
export const verificarSolicitud = async (req, res) => {
    if (!req.session.isLoggedIn) return res.status(401).json({ error: 'No autenticado' });
    try {
        const { id }           = req.params;
        const { observacion }  = req.body;

        const [soliRows] = await pool.query(
            `SELECT s.*, e.nombre AS estado_actual FROM solicitudes_compra s
             LEFT JOIN estados_solicitud e ON s.id_estado = e.id_estado
             WHERE s.id_solicitud = ?`,
            [id]
        );
        if (!soliRows.length) return res.status(404).json({ error: 'Solicitud no encontrada' });

        const estadoInfo = await getEstadoId('En Compras');
        await pool.execute('UPDATE solicitudes_compra SET id_estado = ? WHERE id_solicitud = ?', [estadoInfo.id_estado, id]);

        await pool.query(
            `INSERT INTO historial_estados (id_solicitud, estado_anterior, estado_nuevo, usuario_responsable, comentarios_observacion)
             VALUES (?, ?, ?, ?, ?)`,
            [id, soliRows[0].estado_actual, 'En Compras', req.session.username || 'Almacén', observacion || null]
        );

        res.json({ success: true, message: 'Verificado. Solicitud enviada a Compras.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Error del servidor' });
    }
};

// GET /solicitudes/:id/participants
export const getParticipants = async (req, res) => {
    if (!req.session.isLoggedIn) return res.status(401).json({ error: 'No autenticado' });
    const { id } = req.params;
    try {
        const [chatRows] = await pool.execute('SELECT id_chat FROM chats WHERE id_solicitud = ? LIMIT 1', [id]);
        let participants = [];

        if (chatRows && chatRows.length) {
            const idChat = chatRows[0].id_chat;
            const [rows] = await pool.execute(
                `SELECT u.id_usuario, u.nombres, u.apellidos, u.avatar
                 FROM chat_participantes cp
                 JOIN usuarios u ON cp.id_usuario = u.id_usuario
                 WHERE cp.id_chat = ?
                 LIMIT 50`,
                [idChat]
            );
            participants = rows.map(r => ({ id_usuario: r.id_usuario, nombres: r.nombres, apellidos: r.apellidos, avatar: r.avatar }));
        } else {
            const [srows] = await pool.execute('SELECT id_solicitante, id_gerencia FROM solicitudes_compra WHERE id_solicitud = ? LIMIT 1', [id]);
            if (srows && srows.length) {
                const s = srows[0];
                if (s.id_solicitante) {
                    const [sr] = await pool.execute('SELECT id_usuario, nombres, apellidos, avatar FROM usuarios WHERE id_usuario = ? LIMIT 1', [s.id_solicitante]);
                    if (sr && sr.length) participants.push({ id_usuario: sr[0].id_usuario, nombres: sr[0].nombres, apellidos: sr[0].apellidos, avatar: sr[0].avatar });
                }
                if (s.id_gerencia) {
                    const [gr] = await pool.execute('SELECT id_usuario, nombres, apellidos, avatar FROM usuarios WHERE id_rol = 8 AND id_gerencia = ?', [s.id_gerencia]);
                    for (const g of gr) participants.push({ id_usuario: g.id_usuario, nombres: g.nombres, apellidos: g.apellidos, avatar: g.avatar });
                }
            }
        }

        return res.json({ participants });
    } catch (err) {
        console.error('Error obteniendo participantes de solicitud:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// GET /solicitudes/:id/mensajes
export const getMensajesBySolicitud = async (req, res) => {
    if (!req.session.isLoggedIn) return res.status(401).json({ error: 'No autenticado' });
    const { id } = req.params;

    try {
                
        const senderId = req.session.userId;
        console.log('Obteniendo mensajes para solicitud:', id, 'Usuario:', senderId);
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
        `, [senderId, Chat]);
        
        return res.json({ data: rows });
    } catch (err) {
        console.error('Error al obtener mensajes por solicitud:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// POST /solicitudes/:id/mensaje
export const postMensajeSolicitud = async (req, res) => {
    if (!req.session.isLoggedIn) return res.status(401).json({ error: 'No autenticado' });
    try {
        const { id } = req.params;
        const { mensaje } = req.body;
        const senderId = req.session.userId;

        if (!mensaje || !String(mensaje).trim()) return res.status(400).json({ error: 'Mensaje requerido' });

        const [soliRows] = await pool.execute('SELECT id_solicitante, id_gerencia, resumen FROM solicitudes_compra WHERE id_solicitud = ? LIMIT 1', [id]);
        if (!soliRows.length) return res.status(404).json({ error: 'Solicitud no encontrada' });
        const solicitud = soliRows[0];

        const [chatRows] = await pool.execute('SELECT id_chat FROM chats WHERE id_solicitud = ? LIMIT 1', [id]);
        let idChat;
        if (!chatRows.length) {
            const [chatRes] = await pool.execute(`INSERT INTO chats (tipo, id_solicitud) VALUES (?, ? )`, ['group', id]);
            idChat = chatRes.insertId;
            try { await pool.execute('INSERT IGNORE INTO chat_participantes (id_chat, id_usuario) VALUES (?, ?)', [idChat, senderId]); } catch (e) { }
            if (solicitud.id_solicitante && solicitud.id_solicitante !== senderId) {
                try { await pool.execute('INSERT IGNORE INTO chat_participantes (id_chat, id_usuario) VALUES (?, ?)', [idChat, solicitud.id_solicitante]); } catch (e) { }
            }
            if (solicitud.id_gerencia) {
                const [gerentes] = await pool.execute('SELECT id_usuario FROM usuarios WHERE id_rol = 8 AND id_gerencia = ?', [solicitud.id_gerencia]);
                for (const g of gerentes) {
                    if (g?.id_usuario) {
                        try { await pool.execute('INSERT IGNORE INTO chat_participantes (id_chat, id_usuario) VALUES (?, ?)', [idChat, g.id_usuario]); } catch (e) { }
                    }
                }
            }
        } else {
            idChat = chatRows[0].id_chat;
            const [existsSender] = await pool.execute('SELECT 1 FROM chat_participantes WHERE id_chat = ? AND id_usuario = ? LIMIT 1', [idChat, senderId]);
            if (!existsSender.length) {
                try { await pool.execute('INSERT IGNORE INTO chat_participantes (id_chat, id_usuario) VALUES (?, ?)', [idChat, senderId]); } catch (e) { }
            }
            if (solicitud.id_solicitante && solicitud.id_solicitante !== senderId) {
                const [existsSol] = await pool.execute('SELECT 1 FROM chat_participantes WHERE id_chat = ? AND id_usuario = ? LIMIT 1', [idChat, solicitud.id_solicitante]);
                if (!existsSol.length) {
                    try { await pool.execute('INSERT IGNORE INTO chat_participantes (id_chat, id_usuario) VALUES (?, ?)', [idChat, solicitud.id_solicitante]); } catch (e) { }
                }
            }
        }

        const idRespuesta = req.body.replyTo?.id || req.body.replyToId || null;
        const [mRes] = await pool.execute('INSERT INTO mensajes (id_chat, id_emisor, contenido, id_respuesta) VALUES (?, ?, ?, ?)', [idChat, senderId, mensaje.trim(), idRespuesta]);

        const payload = {
            id_mensaje: mRes.insertId,
            id_chat: idChat,
            id_emisor: senderId,
            contenido: mensaje.trim(),
            fecha_envio: new Date().toISOString()
        };

        // Añadir metadata del remitente (nombre y avatar) para el socket
        try {
            const [uRows] = await pool.query('SELECT nombres, apellidos, avatar FROM usuarios WHERE id_usuario = ? LIMIT 1', [senderId]);
            if (uRows && uRows.length) {
                const u = uRows[0];
                payload.remitente = { name: `${u.nombres || ''} ${u.apellidos || ''}`.trim() || (req.session.username || 'Usuario'), avatar: u.avatar || null };
            } else {
                payload.remitente = { name: req.session.username || 'Usuario', avatar: null };
            }
        } catch (e) {
            payload.remitente = { name: req.session.username || 'Usuario', avatar: null };
        }

        if (idRespuesta) {
            try {
                const [rrows] = await pool.execute(`SELECT m.contenido AS respuesta_contenido, u.nombres, u.apellidos, u.avatar FROM mensajes m JOIN usuarios u ON m.id_emisor = u.id_usuario WHERE m.id_mensaje = ? LIMIT 1`, [idRespuesta]);
                if (rrows && rrows.length) {
                    payload.respuesta = {
                        id: idRespuesta,
                        mensaje: rrows[0].respuesta_contenido,
                        remitente: { name: `${rrows[0].nombres} ${rrows[0].apellidos}`, avatar: rrows[0].avatar }
                    };
                }
            } catch (e) { }
        }

        try {
            getIO().to(`solicitud_${id}`).emit('nuevo_mensaje', payload);
        } catch (_) { }

        const [participants] = await pool.execute('SELECT id_usuario FROM chat_participantes WHERE id_chat = ?', [idChat]);
        for (const p of participants) {
            if (p.id_usuario === senderId) continue;
            try {
                const [resNot] = await pool.query('INSERT INTO notificaciones (id_solicitud, contenido, status) VALUES (?, ?, ?)', [id, mensaje, 'info']);
                try {
                    getIO().to(`user_${p.id_usuario}`).emit('receive_notification', {
                        id_notificacion: resNot.insertId,
                        id_solicitud: id,
                        contenido: mensaje,
                        status: 'info',
                        fecha: new Date().toISOString(),
                        resumen: solicitud.resumen || '',
                        estado_color: null
                    });
                } catch (_) { }
            } catch (_) { }
        }

        return res.status(201).json({ success: true, chatId: idChat, messageId: mRes.insertId });
    } catch (err) {
        console.error('Error enviando mensaje por solicitud:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// GET /solicitudes/stats/gerencia
export const getStatsGerencia = async (req, res) => {
    if (!req.session.isLoggedIn) return res.status(401).json({ error: 'No autenticado' });
    try {
        const mes = req.query.mes || null;
        const [rows] = await pool.query(`
            SELECT
                g.id_gerencia,
                g.nombre_gerencia,
                COUNT(s.id_solicitud) AS total
            FROM gerencias g
            LEFT JOIN solicitudes_compra s ON s.id_gerencia = g.id_gerencia
                ${mes ? "AND DATE_FORMAT(s.fecha_creacion, '%Y-%m') = ?" : ''}
            GROUP BY g.id_gerencia, g.nombre_gerencia
            ORDER BY total DESC
        `, mes ? [mes] : []);
        res.json({ data: rows });
    } catch (err) {
        console.error('Error stats gerencia:', err);
        res.status(500).json({ error: 'Error del servidor' });
    }
};

// GET /solicitudes-producto
export const getSolicitudesProducto = async (req, res) => {
    if (!req.session.isLoggedIn) return res.status(401).json({ error: 'No autenticado' });
    try {
        const [rows] = await pool.query(`
            SELECT
                sp.id_sol_prod,
                sp.nombre_producto,
                sp.descripcion,
                sp.cantidad_requerida,
                sp.id_categoria,
                sp.estado,
                sp.fecha_creacion,
                c.nombre_categoria,
                CONCAT(u.nombres, ' ', u.apellidos) AS solicitante,
                u.avatar
            FROM solicitudes_creacion_producto sp
            LEFT JOIN categorias c ON sp.id_categoria = c.id_categoria
            JOIN usuarios u ON sp.id_solicitante = u.id_usuario
            ORDER BY sp.fecha_creacion DESC
        `);
        res.json({ data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener solicitudes de producto' });
    }
};

// POST /solicitudes-producto
export const createSolicitudProducto = async (req, res) => {
    if (!req.session.isLoggedIn) return res.status(401).json({ error: 'No autenticado' });
    const { nombre_producto, descripcion, cantidad_requerida = 1, id_categoria } = req.body;
    if (!nombre_producto?.trim()) return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
    try {
        const [result] = await pool.query(
            `INSERT INTO solicitudes_creacion_producto
             (nombre_producto, descripcion, cantidad_requerida, id_categoria, id_solicitante)
             VALUES (?, ?, ?, ?, ?)`,
            [nombre_producto.trim(), descripcion || null, cantidad_requerida, id_categoria || null, req.session.userId]
        );
        const id = result.insertId;
        try { getIO().to('almacen').emit('nueva_solicitud_producto', { id_sol_prod: id, nombre_producto: nombre_producto.trim(), cantidad_requerida, solicitante: req.session.username || 'Usuario', fecha_creacion: new Date().toISOString() }); } catch (_) {}
        res.status(201).json({ success: true, id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear la solicitud de producto' });
    }
};

// POST /solicitudes-producto/:id/codificar
export const codificarSolicitudProducto = async (req, res) => {
    if (!req.session.isLoggedIn) return res.status(401).json({ error: 'No autenticado' });
    const { id } = req.params;
    const { nombre_producto, descripcion, id_categoria, codigo_producto, stock_minimo = 0, stock_actual } = req.body;

    if (!nombre_producto?.trim() || !id_categoria) {
        return res.status(400).json({ error: 'Nombre y categoría son obligatorios.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        let stockToInsert = 0;
        if (typeof stock_actual !== 'undefined' && stock_actual !== null && stock_actual !== '') {
            stockToInsert = Number(stock_actual) || 0;
        } else {
            const [solRows] = await connection.query(`SELECT cantidad_requerida FROM solicitudes_creacion_producto WHERE id_sol_prod = ? LIMIT 1`, [id]);
            stockToInsert = (solRows && solRows[0] && solRows[0].cantidad_requerida) ? Number(solRows[0].cantidad_requerida) : 0;
        }

        const [prodResult] = await connection.query(`INSERT INTO productos_almacen (nombre_producto, descripcion, id_categoria, codigo_producto, stock_actual, stock_minimo) VALUES (?, ?, ?, ?, ?, ?)`, [nombre_producto.trim(), descripcion || null, id_categoria, codigo_producto || null, stockToInsert, stock_minimo]);

        const [[solRow]] = await connection.query(`SELECT id_solicitante FROM solicitudes_creacion_producto WHERE id_sol_prod = ? LIMIT 1`, [id]);
        const idSolicitante = solRow?.id_solicitante || null;
        let idGerencia = null;
        if (idSolicitante) {
            const [[urow]] = await connection.query(`SELECT id_gerencia FROM usuarios WHERE id_usuario = ? LIMIT 1`, [idSolicitante]);
            idGerencia = urow?.id_gerencia || null;
        }

        await connection.query(`DELETE FROM solicitudes_creacion_producto WHERE id_sol_prod = ?`, [id]);

        const contenidoAlert = `Producto creado: ${nombre_producto.trim()} (Solicitud #${id})`;
        const [resAlert] = await connection.query(`INSERT INTO notificaciones_not_solisitud (id_gerencia, contenido, status) VALUES (?, ?, ?)`, [idGerencia || 1, contenidoAlert, 'ok']);

        await connection.commit();

        // Insertar también en Access (InventarioRepuestos e InventarioFisico)
        (async () => {
            try {
                const [catRows] = await pool.query('SELECT codigo FROM categorias WHERE id_categoria = ? LIMIT 1', [id_categoria]);
                const cod_tipo = catRows[0]?.codigo || 'CO01';

                // 1. InventarioRepuestos
                await connectionAccess.execute(`
                    INSERT INTO [InventarioRepuestos] ([cod_almacen], [cod_tipo], [cod_repuesto], [descripcion_repuesto], [cant_minima])
                    VALUES ('CA', '${cod_tipo.trim().replace(/'/g, "''").slice(0, 10)}', '${codigo_producto.trim().replace(/'/g, "''").slice(0, 5)}', '${nombre_producto.trim().replace(/'/g, "''").slice(0, 100)}', ${Number(stock_minimo) || 0})
                `);

                // 2. InventarioFisico
                await connectionAccess.execute(`
                    INSERT INTO [InventarioFisico] ([cod_almacen], [cod_tipo], [cod_repuesto], [inv_fisico], [gRUPO], [fec_fisico])
                    VALUES ('CA', '${cod_tipo.trim().replace(/'/g, "''").slice(0, 10)}', '${codigo_producto.trim().replace(/'/g, "''").slice(0, 5)}', ${Number(stockToInsert) || 0}, '2', NOW())
                `);
                console.log('[Access Setup] Producto codificado insertado en Access.');
            } catch (accessErr) {
                console.error('Error al insertar producto codificado en Access:', accessErr);
            }
        })();

        try { getIO().to('almacen').emit('producto_creado', { id_producto: prodResult.insertId, nombre_producto: nombre_producto.trim(), fecha_creacion: new Date().toISOString(), stock_actual: stockToInsert }); } catch (_) {}

        try {
            const [[gRow]] = await pool.query('SELECT nombre_gerencia FROM gerencias WHERE id_gerencia = ? LIMIT 1', [idGerencia]);
            const gerenciaName = gRow?.nombre_gerencia || 'Gerencia';
            const [usersToNotify] = await pool.query('SELECT id_usuario FROM usuarios WHERE id_rol IN (1,5) OR id_gerencia = ?', [idGerencia]);
            for (const u of usersToNotify) {
                try {
                    getIO().to(`user_${u.id_usuario}`).emit('receive_notification', { id_notificacion: resAlert.insertId, id_solicitud: null, contenido: contenidoAlert, status: 'ok', fecha: new Date().toISOString(), resumen: `Alerta: ${gerenciaName}`, nombres: 'Sistema', apellidos: '' });
                } catch (_) { }
            }
        } catch (emitErr) {
            console.error('Error notificando creación de producto:', emitErr);
        }

        res.status(201).json({ success: true, id_producto: prodResult.insertId, message: 'Producto creado en inventario y solicitud eliminada.' });
    } catch (err) {
        if (connection) {
            try { await connection.rollback(); } catch (e) { console.error('Rollback failed:', e); }
        }
        console.error(err);
        res.status(500).json({ error: 'Error al codificar el producto.' });
    } finally {
        if (connection) connection.release();
    }
};

// PUT /solicitudes/:id
export const updateSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            resumen,
            justificacion,
            requerimientos_texto,
            tipo_solicitud,
            prioridad,
            productos: productosRaw
        } = req.body;

        if (!req.session.isLoggedIn) {
            return res.status(401).json({ success: false, message: 'No autenticado' });
        }

        // 1. Obtener la solicitud actual con el nombre del estado
        const [soliRows] = await pool.query(
            `SELECT s.*, e.nombre AS estado_nombre 
             FROM solicitudes_compra s
             LEFT JOIN estados_solicitud e ON s.id_estado = e.id_estado
             WHERE s.id_solicitud = ?`,
            [id]
        );
        if (!soliRows.length) {
            return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
        }

        const solicitud = soliRows[0];
        const userId = req.session.userId;
        const userRole = Number(req.session.rol || 0);

        // 2. Verificar permisos:
        // - Admin/SuperAdmin (rol 5, 11, 1) siempre pueden editar.
        // - El solicitante puede editar si:
        //   a) El estado es 'Pendiente' o 'Borrador'.
        //   b) Tiene un permiso especial en solicitudes_edicion_permisos.
        const isSuper = userRole === 1 || userRole === 5 || userRole === 11;
        const isSolicitante = Number(solicitud.id_solicitante) === Number(userId);

        let canEdit = isSuper;
        if (isSolicitante) {
            const estadoActual = String(solicitud.estado_nombre || '').toLowerCase().trim();
            if (estadoActual === 'pendiente' || estadoActual === 'borrador') {
                canEdit = true;
            } else {
                // Verificar permiso temporal
                const [permRows] = await pool.query(
                    'SELECT 1 FROM solicitudes_edicion_permisos WHERE id_solicitud = ? AND id_usuario = ?',
                    [id, userId]
                );
                if (permRows.length > 0) {
                    canEdit = true;
                }
            }
        }

        if (!canEdit) {
            return res.status(403).json({ success: false, message: 'No tiene permisos para editar esta solicitud en su estado actual.' });
        }

        // Determinar si hay nuevos archivos PDF o si se eliminan los existentes
        let just_pdf_url = solicitud.justificacion_pdf_url;
        let req_pdf_url = solicitud.requerimientos_pdf_url;

        if (req.files) {
            if (req.files['justificacion_pdf']) {
                just_pdf_url = req.files['justificacion_pdf'][0].filename;
            }
            if (req.files['requerimientos_pdf']) {
                req_pdf_url = req.files['requerimientos_pdf'][0].filename;
            }
        }

        // Limpiar si el frontend envía una cadena vacía o nula explícitamente
        if (req.body.justificacion_pdf_url === 'null' || req.body.justificacion_pdf_url === null || req.body.justificacion_pdf_url === '') {
            just_pdf_url = null;
        }
        if (req.body.requerimientos_pdf_url === 'null' || req.body.requerimientos_pdf_url === null || req.body.requerimientos_pdf_url === '') {
            req_pdf_url = null;
        }

        // 3. Actualizar la solicitud
        await pool.execute(
            `UPDATE solicitudes_compra 
             SET resumen = ?, justificacion = ?, justificacion_pdf_url = ?, requerimientos_texto = ?, requerimientos_pdf_url = ?, tipo_solicitud = ?, prioridad = ?
             WHERE id_solicitud = ?`,
            [
                resumen || solicitud.resumen,
                justificacion || solicitud.justificacion,
                just_pdf_url,
                requerimientos_texto !== undefined ? requerimientos_texto : solicitud.requerimientos_texto,
                req_pdf_url,
                tipo_solicitud || solicitud.tipo_solicitud,
                prioridad || solicitud.prioridad,
                id
            ]
        );

        // 4. Actualizar productos/detalles si se proporcionan
        if (productosRaw !== undefined) {
            let productos = [];
            try {
                productos = typeof productosRaw === 'string' ? JSON.parse(productosRaw) : productosRaw;
            } catch (e) {
                productos = productosRaw || [];
            }

            // Eliminar detalles anteriores
            await pool.execute('DELETE FROM detalles_solicitud WHERE id_solicitud = ?', [id]);

            // Insertar nuevos detalles
            if (productos && productos.length > 0) {
                for (const p of productos) {
                    await pool.execute(
                        `INSERT INTO detalles_solicitud (id_solicitud, id_producto, id_servicio, cantidad)
                         VALUES (?, ?, ?, ?)`,
                        [
                            id,
                            p.id_producto || null,
                            p.id_servicio || null,
                            Number(p.cantidad) || 1
                        ]
                    );
                }
            }
        }

        // Registrar en historial
        const nombreUsuario = req.session.username || 'Sistema';
        await pool.query(
            `INSERT INTO historial_estados (id_solicitud, estado_anterior, estado_nuevo, usuario_responsable, comentarios_observacion)
             VALUES (?, ?, ?, ?, ?)`,
            [
                id,
                solicitud.estado_nombre || 'Pendiente',
                solicitud.estado_nombre || 'Pendiente',
                nombreUsuario,
                'Solicitud editada por el usuario'
            ]
        );

        // 5. Eliminar el permiso temporal si fue utilizado
        if (isSolicitante) {
            await pool.execute(
                'DELETE FROM solicitudes_edicion_permisos WHERE id_solicitud = ? AND id_usuario = ?',
                [id, userId]
            );
        }

        res.status(200).json({ success: true, message: 'Solicitud actualizada con éxito' });
    } catch (error) {
        console.error('Error al editar solicitud:', error);
        res.status(500).json({ success: false, message: error.message || 'Error interno del servidor' });
    }
};

// POST /solicitudes/:id/permitir-edicion  (Compras, Admin, SuperAdmin otorgan permiso temporal)
export const permitirEdicion = async (req, res) => {
    try {
        if (!req.session.isLoggedIn) return res.status(401).json({ error: 'No autenticado' });
        const { id } = req.params;
        const userRole = Number(req.session.rol || 0);
        const isAuthorized = [1, 5, 10, 11].includes(userRole);

        if (!isAuthorized) {
            return res.status(403).json({ error: 'No autorizado para otorgar permisos de edición.' });
        }

        // Obtener el id_solicitante y resumen de la solicitud
        const [soliRows] = await pool.query('SELECT id_solicitante, resumen FROM solicitudes_compra WHERE id_solicitud = ?', [id]);
        if (!soliRows.length) return res.status(404).json({ error: 'Solicitud no encontrada' });
        const { id_solicitante: idSolicitante, resumen } = soliRows[0];

        if (!idSolicitante) return res.status(400).json({ error: 'La solicitud no tiene un solicitante válido.' });

        // Insertar permiso de edición temporal
        await pool.execute(
            'INSERT IGNORE INTO solicitudes_edicion_permisos (id_solicitud, id_usuario) VALUES (?, ?)',
            [id, idSolicitante]
        );

        // Crear notificación física en la base de datos
        const contenido = `Se ha habilitado la edición temporal para tu solicitud #${id}.`;
        const [resNotif] = await pool.query(
            'INSERT INTO notificaciones (id_solicitud, contenido, status) VALUES (?, ?, ?)',
            [id, contenido, 'info']
        );

        // Emitir notificación en tiempo real vía socket
        try {
            getIO().to(`user_${idSolicitante}`).emit('receive_notification', {
                id_notificacion: resNotif.insertId,
                id_solicitud: id,
                contenido,
                status: 'info',
                fecha: new Date().toISOString(),
                resumen: resumen,
                estado_color: '#3b82f6' // color azul para info/permisos
            });
        } catch (sockErr) {
            console.error('Error enviando socket de notificación de edición:', sockErr);
        }

        return res.status(200).json({ success: true, message: 'Permiso de edición temporal otorgado con éxito y usuario notificado.' });
    } catch (err) {
        console.error('Error al permitir edición:', err);
        return res.status(500).json({ error: err.message || 'Error interno del servidor' });
    }
};

// GET /solicitudes/:id/permiso-edicion  (Verifica si el solicitante actual tiene permiso temporal de edición)
export const checkPermisoEdicion = async (req, res) => {
    try {
        if (!req.session.isLoggedIn) return res.status(401).json({ error: 'No autenticado' });
        const { id } = req.params;
        const userId = req.session.userId;

        const [permRows] = await pool.query(
            'SELECT 1 FROM solicitudes_edicion_permisos WHERE id_solicitud = ? AND id_usuario = ?',
            [id, userId]
        );

        return res.status(200).json({ hasPermission: permRows.length > 0 });
    } catch (err) {
        console.error('Error al verificar permiso:', err);
        return res.status(500).json({ error: err.message || 'Error interno del servidor' });
    }
};

// GET /solicitudes/stats/dashboard
export const getDashboardStats = async (req, res) => {
    if (!req.session.isLoggedIn) return res.status(401).json({ error: 'No autenticado' });
    try {
        const userId = req.session.userId;
        const userRole = Number(req.session.rol || 0);

        // Obtener gerenciaId
        let gerenciaId = null;
        if (userId) {
            const [gRows] = await pool.query('SELECT id_gerencia FROM usuarios WHERE id_usuario = ? LIMIT 1', [userId]);
            gerenciaId = gRows[0]?.id_gerencia ?? null;
        }

        // Definir condiciones de rol
        let filterClause = '';
        const params = [];

        const isAdmin = [1, 5, 11].includes(userRole);
        const isComprador = userRole === 10;
        const isGerente = userRole === 8;
        const isPersonal = userRole === 12;

        if (isPersonal) {
            filterClause = ' AND s.id_solicitante = ?';
            params.push(userId);
        } else if (isGerente) {
            if (gerenciaId !== null) {
                filterClause = ' AND s.id_gerencia = ?';
                params.push(gerenciaId);
            } else {
                filterClause = ' AND 1 = 0';
            }
        }

        // 1. Solicitudes por Gerencia (unificando estados: En Compras, Aprobado Gerencia, Aprovadas)
        const [gerenciaRows] = await pool.query(`
            SELECT
                g.id_gerencia,
                g.nombre_gerencia,
                COUNT(s.id_solicitud) AS total,
                COALESCE(SUM(CASE WHEN e.nombre IN ('En Compras','Aprobado Gerencia','Aprovadas') THEN 1 ELSE 0 END), 0) AS total_unificado
            FROM gerencias g
            LEFT JOIN solicitudes_compra s ON s.id_gerencia = g.id_gerencia ${filterClause}
            LEFT JOIN estados_solicitud e ON s.id_estado = e.id_estado
            GROUP BY g.id_gerencia, g.nombre_gerencia
            ORDER BY total_unificado DESC
        `, params);

        // 2. Tendencia Mensual
        // Contamos sólo los estados unificados en la tendencia mensual
        const [monthlyRows] = await pool.query(`
            SELECT 
                meses.name AS name,
                COALESCE(SUM(CASE WHEN e.nombre IN ('En Compras','Aprobado Gerencia','Aprovadas') THEN 1 ELSE 0 END), 0) AS solicitudes
            FROM (
                SELECT 1 AS m, 'Ene' AS name UNION ALL
                SELECT 2, 'Feb' UNION ALL
                SELECT 3, 'Mar' UNION ALL
                SELECT 4, 'Abr' UNION ALL
                SELECT 5, 'May' UNION ALL
                SELECT 6, 'Jun' UNION ALL
                SELECT 7, 'Jul' UNION ALL
                SELECT 8, 'Ago' UNION ALL
                SELECT 9, 'Sep' UNION ALL
                SELECT 10, 'Oct' UNION ALL
                SELECT 11, 'Nov' UNION ALL
                SELECT 12, 'Dic'
            ) AS meses
            LEFT JOIN solicitudes_compra s ON MONTH(s.fecha_creacion) = meses.m 
                AND YEAR(s.fecha_creacion) = YEAR(CURDATE())
                ${filterClause}
            LEFT JOIN estados_solicitud e ON s.id_estado = e.id_estado
            GROUP BY meses.m, meses.name
            ORDER BY meses.m
        `, params);

        // 3. Distribución por Tipo
        const [typeRows] = await pool.query(`
            SELECT 
                s.tipo_solicitud AS name, 
                COUNT(s.id_solicitud) AS value
            FROM solicitudes_compra s
            WHERE 1=1 ${filterClause}
            GROUP BY s.tipo_solicitud
        `, params);

        // 4. Distribución por Prioridad
        const [priorityRows] = await pool.query(`
            SELECT 
                s.prioridad AS name, 
                COUNT(s.id_solicitud) AS value
            FROM solicitudes_compra s
            WHERE 1=1 ${filterClause}
            GROUP BY s.prioridad
        `, params);

        res.json({
            success: true,
            gerencias: gerenciaRows,
            tendencia: monthlyRows,
            tipos: typeRows,
            prioridades: priorityRows
        });
    } catch (err) {
        console.error('Error in getDashboardStats:', err);
        res.status(500).json({ error: 'Error del servidor al obtener estadísticas.' });
    }
};
