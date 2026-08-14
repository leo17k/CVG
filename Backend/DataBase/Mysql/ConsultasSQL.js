import pool from "./ConexionSQL.js";
import { sqlBase, sqlusuario, solicitudes, chatSQL, mensajesPorChatSQL, solicitudesUsuario, buscarChatPrivadoSQL, crearChatSQL, insertarParticipanteSQL, insertMensajeSQL } from "./SQL.js";
import bcrypt from 'bcrypt'



// ----------consulta para obtener todos los productos con su varibles---------------


const consultarproductos = async (filtros = {}) => {
    try {
        let condicion = [];
        let values = [];

        const { id, codigo_producto, nombre, categorias, marca, rango_precio } = filtros;

        if (id) {
            condicion.push("p.id = ?");
            values.push(id);
        }
        if (codigo_producto) {
            condicion.push("p.codigo_producto = ?");
            values.push(codigo_producto);
        }
        if (nombre) {
            condicion.push("p.nombre = ?");
            values.push(nombre);
        }
        if (categorias && categorias.length > 0) {
            condicion.push("c.nombre_categoria IN (?)");
            values.push(categorias);
        }
        if (marca) {
            condicion.push("p.marca = ?");
            values.push(marca);
        }
        if (rango_precio && rango_precio.length === 2) {
            condicion.push("p.precio BETWEEN ? AND ?");
            values.push(rango_precio[0], rango_precio[1]);
        }

        let sql = sqlBase;
        if (condicion.length > 0) {
            sql += ` WHERE ` + condicion.join(' AND ');
        }

        const [rows] = await pool.execute(sql, values);

        // Corregido: Consolidar la verificación de resultados en un solo lugar
        if (rows.length === 0) {
            // Retorna un objeto de éxito pero con un array de datos vacío
            return { success: false, rows: 0, data: [] };
        }

        const productMap = new Map();

        rows.forEach(row => {
            const { id, tipo_variable, valor_variable, tipo_variable2, valor_variable2, imagen_variable_url, ...productDetails } = row;

            if (!productMap.has(id)) {
                const product = {
                    ...productDetails,
                    variables: []
                };
                productMap.set(id, product);
            }

            if (tipo_variable && valor_variable) {
                const variables = {};
                if (tipo_variable) variables[tipo_variable] = valor_variable;
                if (tipo_variable2) variables[tipo_variable2] = valor_variable2;
                if (imagen_variable_url) variables["imagen"] = imagen_variable_url;
                if (Object.keys(variables).length > 0) {
                    productMap.get(id).variables.push(variables);
                }
            }
        });

        const result = Array.from(productMap.values());

        // Corregido: La función debe retornar el valor directamente
        return { success: true, rows: result.length, data: result };

    } catch (err) {
        return { success: false, err };
    }
};
// ----------consulta para obtener datos de los usaurios---------------

const buscarUsuario = async (body = {}) => {
    try {
        let rows;
        let condicion = [];
        let values = [];

        const { id, username, email, rol } = body;


        if (id) {
            condicion.push("u.id_usuario = ?");
            values.push(id);
        }
        if (username) {
            condicion.push("u.username = ?");
            values.push(username);
        }
        if (email) {
            condicion.push("u.email = ?");
            values.push(email);
        }
        if (rol) {
            condicion.push("r.nombre_rol = ?");
            values.push(rol);
        }


        let sql = sqlusuario;
        if (condicion.length > 0) {
            sql += ` WHERE ` + condicion.join(' AND ');
        }


        [rows] = await pool.execute(sql, values);

        if (rows.length === 0) {
            return null;
        }

        return { rows, condicion }
    } catch (err) {
        console.error('Error in buscarUsuario:', err);
        return null;
    }
}


// ----------Consulta para verificar la contraseña del usuario---------------

const verificarUsuarios = async (body = {}) => {

    const { password, username, email } = body;

    if (!password || !username) {
        return { success: false, error: "Faltan datos importantes" };
    }
    if (password === null || password === '' || password === undefined) {
        return { success: false, error: "La contraseña no puede estar vacía" };
    }

    // userDB recibe { rows: [...], condicion: ... } o null en caso de error/no encontrado
    const userDB = await buscarUsuario({ username: username });

    if (!userDB || !userDB.rows || !Array.isArray(userDB.rows) || userDB.rows.length === 0) {
        return { success: false, error: "Usuario no encontrado" };
    }

    const usuarioEncontrado = userDB.rows[0];


    try {
        // Usamos usuarioEncontrado.password en lugar de userDB[0].password
        const passwordMatch = await bcrypt.compare(password, usuarioEncontrado.password);

        if (passwordMatch) {
            return { success: true, inf: "Contraseña y usuario verificados", data: usuarioEncontrado };
        } else {
            return { success: false, error: "Contraseña inválida" };
        }
    } catch (err) {
        console.error("Error al comparar contraseñas:", err);
        return { success: false, error: "Error interno del servidor" };
    }
};



const solicitudESCOMPRA = async (body = {}) => {
    const {
        userId: userIdParam,
        roleId: roleIdParam,
        gerenciaId: gerenciaIdParam,
        id: legacyId,
        page = 1,
        limit = 10,
        estado,
        busqueda,
        tipo,
        vista,
        id_usuario,
        id_gerencia
    } = body;

    const userId = userIdParam || legacyId || null;
    const roleId = roleIdParam ?? null;
    const offset = (Number(page) - 1) * Number(limit);

    // Si no se pasa gerenciaId, intentamos obtenerla desde la BD
    let gerenciaId = gerenciaIdParam ?? null;
    if (!gerenciaId && userId) {
        try {
            const [gRows] = await pool.execute('SELECT id_gerencia FROM usuarios WHERE id_usuario = ? LIMIT 1', [userId]);
            gerenciaId = gRows[0]?.id_gerencia ?? null;
        } catch (e) {
            gerenciaId = null;
        }
    }

    // Obtener nombre de rol si es necesario (para diferenciar 'Ventas' de 'Gerente')
    let nombreRol = null;
    if (roleId) {
        try {
            const [rRows] = await pool.execute('SELECT nombre_rol FROM roles WHERE id_rol = ? LIMIT 1', [roleId]);
            nombreRol = rRows[0]?.nombre_rol ?? null;
        } catch (e) {
            nombreRol = null;
        }
    }

    // Construcción dinámica del WHERE con visibilidad por rol
    let whereClause = ' WHERE 1=1';
    const values = [];

    // Búsqueda global por código visible de la solicitud, resumen o solicitante.
    if (busqueda) {
        const term = `%${busqueda.trim()}%`;
        whereClause += ' AND (s.codigo_solicitud LIKE ? OR s.resumen LIKE ? OR CONCAT(u.nombres, " ", u.apellidos) LIKE ?)';
        values.push(term, term, term);
    }

    // Construir condiciones de visibilidad (owner OR role-specific)
    const isAdmin = Number(roleId) === 1 || Number(roleId) === 5 || Number(roleId) === 11;
    if (!isAdmin) {
        const visibilityParts = [];

        // 1) Propietario: siempre ve sus propias solicitudes (sin importar estado)
        if (userId) {
            visibilityParts.push('s.id_solicitante = ?');
            values.push(userId);
        }

        // 2) Gerente (id_rol = 8) -> solo solicitudes de su gerencia (a menos que sea 'Ventas')
        if (Number(roleId) === 8 && nombreRol !== 'Ventas') {
            if (gerenciaId !== null) {
                visibilityParts.push('s.id_gerencia = ?');
                values.push(gerenciaId);
            } else {
                visibilityParts.push('1 = 0');
            }
        }

        // 3) Comprador (id_rol = 10): solo estados 3,5,6
        if (Number(roleId) === 10) {
            visibilityParts.push('s.id_estado IN (3,5,6)');
        }

        // 4) Ventas (detectar por nombre de rol): solo estados 5,6
        if (nombreRol === 'Ventas') {
            visibilityParts.push('s.id_estado IN (5,6)');
        }

        // 5) Almacén (id_rol = 9): solo ver estados iniciales; excluimos 3,5,6
        if (Number(roleId) === 9) {
            visibilityParts.push('s.id_estado NOT IN (3,5,6)');
        }

        // Si no hay ninguna regla (rol desconocido), permitir solo propias solicitudes si existe userId
        if (visibilityParts.length === 0) {
            if (!userId) {
                visibilityParts.push('1 = 0');
            }
        }

        // Combinamos por OR (propietario OR regla_rol)
        whereClause += ' AND (' + visibilityParts.join(' OR ') + ')';
    }

    // Filtro por Vista (Tabs)
    if (vista === 'mis_solicitudes') {
        whereClause += ' AND s.id_solicitante = ?';
        values.push(userId);
    } else if (vista === 'compras') {
        whereClause += ' AND e.nombre IN ("En Compras", "Aprobado Gerencia", "Aprovadas")';
    }

    const isComprasRole = Number(roleId) === 10 || vista === 'compras';
    const isAlmacenRole = Number(roleId) === 9;
    const isGerenteRole = Number(roleId) === 8 && nombreRol !== 'Ventas';

    let priorityOrder = ['Pendiente', 'Aprobado Gerencia', 'En Compras', 'Aprovadas', 'Rechazado'];

    if (isComprasRole) {
        priorityOrder = ['En Compras', 'Aprobado Gerencia', 'Aprovadas', 'Pendiente', 'Rechazado'];
    } else if (isAlmacenRole) {
        priorityOrder = ['Aprobado Gerencia', 'En Compras', 'Aprovadas', 'Pendiente', 'Rechazado'];
    } else if (isGerenteRole) {
        priorityOrder = ['Pendiente', 'Aprobado Gerencia', 'En Compras', 'Aprovadas', 'Rechazado'];
    }

    const orderCaseSql = priorityOrder
        .map((estado, index) => `WHEN '${estado}' THEN ${index}`)
        .join(' ');

    // Filtro por estado (aplica a registros visibles)
    if (estado) {
        whereClause += ' AND e.nombre = ?';
        values.push(estado);
    }

    // Filtro por tipo de solicitud (Compra/Servicio/Obra)
    if (tipo) {
        whereClause += ' AND s.tipo_solicitud = ?';
        values.push(tipo);
    }

    // Filtro por gerencia específica
    if (id_gerencia) {
        whereClause += ' AND s.id_gerencia = ?';
        values.push(id_gerencia);
    }

    // Filtro por usuario específico
    if (id_usuario) {
        whereClause += ' AND s.id_solicitante = ?';
        values.push(id_usuario);
    }

    // SELECT principal
    const baseSelect = `
      SELECT
    s.id_solicitud,
    s.codigo_solicitud,
    s.fecha_creacion,
    g.nombre_gerencia,
    s.id_gerencia,
    s.id_solicitante,
    CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
    s.justificacion,
    s.resumen,
    s.tipo_solicitud,
    u.avatar,
    u.id_usuario AS id_solicitante,
    e.id_estado,
    e.nombre AS estado_nombre,
    e.color_hex AS estado_color
FROM solicitudes_compra s
JOIN gerencias g ON s.id_gerencia = g.id_gerencia
JOIN usuarios u ON s.id_solicitante = u.id_usuario
LEFT JOIN estados_solicitud e ON s.id_estado = e.id_estado
${whereClause}
ORDER BY
    CASE e.nombre
        ${orderCaseSql}
        ELSE 99
    END ASC,
    s.fecha_creacion DESC
LIMIT ${Math.max(1, parseInt(limit) || 10)} OFFSET ${Math.max(0, parseInt(offset) || 0)}
    `;

    const baseCount = `
        SELECT
            COUNT(*) AS total,
            COUNT(CASE WHEN e.nombre = 'Aprobado Gerencia' THEN 1 END) AS aprobados,
            COUNT(CASE WHEN e.nombre = 'Pendiente'         THEN 1 END) AS pendientes,
            COUNT(CASE WHEN e.nombre = 'Rechazado'         THEN 1 END) AS rechazados,
            COUNT(CASE WHEN e.nombre = 'En Compras'        THEN 1 END) AS en_compras,
            COUNT(CASE WHEN e.nombre = 'Aprovadas'        THEN 1 END) AS finalizados
        FROM solicitudes_compra s
        JOIN gerencias g ON s.id_gerencia = g.id_gerencia
        JOIN usuarios u ON s.id_solicitante = u.id_usuario
        LEFT JOIN estados_solicitud e ON s.id_estado = e.id_estado
        ${whereClause}
    `;

    const [countResult] = await pool.execute(baseCount, values);
    const [rows] = await pool.execute(baseSelect, values);

    return {
        rows,
        totalRows: {
            total: countResult[0]?.total || 0,
            pendientes: countResult[0]?.pendientes || 0,
            aprobados: countResult[0]?.aprobados || 0,
            rechazados: countResult[0]?.rechazados || 0,
            en_compras: countResult[0]?.en_compras || 0,
            finalizados: countResult[0]?.finalizados || 0,
        }
    };
};

const getMensajes = async (userId, idChat, offset = 0, limit = 20) => {
        try {

                const sql = `
            SELECT 
                m.id_mensaje,
                m.contenido AS mensaje,
                mm.contenido AS respuesta,
                m.id_respuesta,
                m.fecha_envio,
                CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
                u.avatar,
                (m.id_emisor = ?) AS ismy,
                u.id_usuario
            FROM mensajes m
            LEFT JOIN usuarios u ON u.id_usuario = m.id_emisor
            LEFT JOIN mensajes mm ON mm.id_mensaje = m.id_respuesta
            WHERE m.id_chat = ?
            ORDER BY m.fecha_envio DESC
            LIMIT ? OFFSET ?;
                `;

                const params = [userId, idChat, Number(limit), Number(offset)];



        const [rows] = await pool.execute(sql, params);



        return { success: true, rows };

    } catch (error) {
        console.error('Error fetching messages:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
};


export const getChat = async (userId) => {

    try {
        if (!userId) {
            return { success: false, mensage: "NO HAS INICIADO SECCION" }
        }
        // El SQL `chatSQL` utiliza múltiples placeholders para el mismo userId
        const params = [userId, userId, userId, userId, userId, userId, userId];
        const sql = chatSQL
        const [rows] = await pool.execute(sql, params);

        // Como la consulta trae DESC para paginación, revertimos para enviar
        // los mensajes en orden cronológico ascendente al frontend.
        const ordered = Array.isArray(rows) ? rows.reverse() : rows;

        return { success: true, rows: ordered };

    } catch (error) {
        console.error('Error fetching messages:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}



// devuelve el id del solicitante para una solicitud de compra concreta
const getSolicitante = async (idSolicitud) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id_solicitante FROM solicitudes_compra WHERE id_solicitud = ?',
            [idSolicitud]
        );
        if (rows.length === 0) return { success: false, error: 'Solicitud no encontrada' };
        return { success: true, idSolicitante: rows[0].id_solicitante };
    } catch (error) {
        console.error('Error fetching solicitante:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
};

const insertMensaje = async (idRemitente, idDestinatario, mensaje, tipo = 'general', idSolicitud = null, idRespuesta = null) => {
    try {
        // 1. Buscamos o creamos el chat entre estas dos personas
        const idChat = await obtenerOCrearChat(idRemitente, idDestinatario, idSolicitud);

        // 2. Insertamos el mensaje usando el idChat obtenido
        // Nota: insertMensajeSQL ahora solo debe pedir [id_chat, id_emisor, contenido]
        const [result] = await pool.execute(insertMensajeSQL, [idChat, idRemitente, mensaje, idRespuesta]);

        return {
            success: true,
            insertId: result.insertId,
            idChat: idChat // Devolvemos el idChat para usarlo en Socket.io
        };
    } catch (error) {
        console.error('Error al insertar mensaje:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
};


// Función para obtener o crear un chat entre dos personas o asociado a una solicitud
const obtenerOCrearChat = async (id1, id2, idSolicitud = null) => {
    try {
        // Si se especificó una solicitud, tratamos el chat como grupal vinculado a la solicitud
        if (idSolicitud) {
            const [rows] = await pool.execute('SELECT id_chat FROM chats WHERE id_solicitud = ? LIMIT 1', [idSolicitud]);
            if (rows && rows.length > 0) return rows[0].id_chat;

            // Crear chat grupal asociado a la solicitud
            const [created] = await pool.execute(crearChatSQL, ['grupal', idSolicitud]);
            const idChat = created.insertId;

            // Insertar participante: solicitante (si existe en la solicitud)
            try {
                const [sol] = await pool.execute('SELECT id_solicitante FROM solicitudes_compra WHERE id_solicitud = ? LIMIT 1', [idSolicitud]);
                const solicitante = sol && sol.length ? sol[0].id_solicitante : null;
                if (solicitante) {
                    await pool.execute('INSERT IGNORE INTO chat_participantes (id_chat, id_usuario) VALUES (?, ?)', [idChat, solicitante]);
                }
            } catch (e) { /* no crítico */ }

            // Añadir al remitente y opcionalmente al receptor si se pasó
            if (id1) await pool.execute('INSERT IGNORE INTO chat_participantes (id_chat, id_usuario) VALUES (?, ?)', [idChat, id1]);
            if (id2 && id2 !== id1) await pool.execute('INSERT IGNORE INTO chat_participantes (id_chat, id_usuario) VALUES (?, ?)', [idChat, id2]);

            return idChat;
        }

        // Caso privado: buscamos por la relación entre dos participantes (tipo 'individual')
        const [existente] = await pool.execute(buscarChatPrivadoSQL, [id1, id2]);
        if (existente.length > 0) return existente[0].id_chat;

        // No existe: crear chat individual (sin id_solicitud)
        const [nuevoChat] = await pool.execute(crearChatSQL, ['individual', null]);
        const idChat = nuevoChat.insertId;
        await pool.execute(insertarParticipanteSQL, [idChat, id1]);
        if (id2) await pool.execute(insertarParticipanteSQL, [idChat, id2]);
        return idChat;
    } catch (err) {
        console.error('Error en obtenerOCrearChat:', err);
        throw err;
    }
};

// Modifica tu función de insertar mensaje
const registrarMensaje = async (idEmisor, idReceptor, contenido, idSolicitud = null, idRespuesta = null) => {
    try {
        const idChat = await obtenerOCrearChat(idEmisor, idReceptor, idSolicitud);
        const [result] = await pool.execute(insertMensajeSQL, [idChat, idEmisor, contenido, idRespuesta]);
        return { success: true, insertId: result.insertId, idChat };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
};


const germensaje = async (withUserId, myId, offset = 0) => {
    // 1. Buscamos el ID del chat entre ambos usuarios
    const [chat] = await pool.query(
        `SELECT cp1.id_chat
         FROM chat_participantes cp1
         JOIN chat_participantes cp2 ON cp1.id_chat = cp2.id_chat
         JOIN chats c ON cp1.id_chat = c.id_chat
         WHERE cp1.id_usuario = ? AND cp2.id_usuario = ? AND c.tipo = 'individual'`,
        [myId, withUserId]
    );

    if (!chat || chat.length === 0) return [];

    // 2. Buscamos los mensajes con LIMIT y OFFSET
    // Importante: Ordenamos por fecha DESC para traer los últimos 20, 
    // luego los siguientes 20, y así sucesivamente.
    const paginatedSQL = `
        ${mensajesPorChatSQL} 
        ORDER BY m.fecha_envio DESC 
        LIMIT 20 OFFSET ?`;

    // El offset debe ser un número entero
    const [rows] = await pool.query(paginatedSQL, [chat[0].id_chat, parseInt(offset)]);

    // Limpiar estado de no leídos para los mensajes que NO escribí yo en ese chat
    await pool.query(`UPDATE mensajes SET leido = 1 WHERE id_chat = ? AND id_emisor != ? AND leido = 0`, [chat[0].id_chat, myId]);

    // 3. Formateamos
    const mensajesFormateados = rows.map(m => ({
        id: m.id_mensaje,
        mensaje: m.mensaje,
        time: m.fecha_envio
            ? new Date(m.fecha_envio).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
            : '',
        ismy: m.id_remitente == myId,
        remitente: {
            name: `${m.remitente_nombres} ${m.remitente_apellidos}`,
            avatar: m.remitente_avatar
        }
    }));

    // Añadir metadatos de respuesta si existen
    mensajesFormateados.forEach((mf, idx) => {
        const row = rows[idx];
        if (row.id_respuesta) {
            mf.reply = {
                id: row.id_respuesta,
                mensaje: row.respuesta_contenido,
                remitente: {
                    name: row.respuesta_nombres ? `${row.respuesta_nombres} ${row.respuesta_apellidos}` : null,
                    avatar: row.respuesta_avatar || null
                }
            };
        }
    });

    // 4. Revertimos el array antes de enviarlo
    // Como los trajimos DESC (para la paginación), los invertimos para que 
    // el frontend los reciba en orden cronológico (el más viejo arriba).
    return mensajesFormateados.reverse();
};

export const consultasSimples = async (sql, params = []) => {
    try {
        if (!sql) {
            return { success: false, error: 'No se proporciono una consulta SQL' };
        }
        if (!params) {

        }
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
}


export { verificarUsuarios, germensaje, buscarUsuario, consultarproductos, solicitudESCOMPRA, getMensajes, insertMensaje, getSolicitante, registrarMensaje } 
