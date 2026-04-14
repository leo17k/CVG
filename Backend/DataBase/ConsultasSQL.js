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
        return err
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

    // userDB recibe { rows: [...], condicion: ... }
    const userDB = await buscarUsuario({ username: username })

    if (!userDB) {
        return { success: false, error: "Usuario no encontrado" };
    }

    // CORRECCIÓN: Accedemos a .rows[0] en lugar de acceder al objeto directamente
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
    const { id, page = 1, limit = 10, estado, busqueda } = body;
    const offset = (page - 1) * limit;


    let baseSelect = `
      SELECT 
    s.id_solicitud,
    s.fecha_creacion,
    g.nombre_gerencia,
    g.codigo,
    s.id_solicitante,
    CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
    s.justificacion,
    s.resumen, 
    s.monto_estimado,
    s.estado
FROM solicitudes_compra s
JOIN gerencias g ON s.id_gerencia = g.id_gerencia
JOIN usuarios u ON s.id_solicitante = u.id_usuario

    `;

    let baseCount = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN estado = 'Aprobado' THEN 1 END) as aprobados,
          COUNT(CASE WHEN estado = 'Pendiente' THEN 1 END) as pendientes,
          COUNT(CASE WHEN estado = 'Rechazado' THEN 1 END) as rechazados
        FROM solicitudes_compra s
        WHERE 1=1
    `;

    let conditions = [];
    let values = [];

    if (id) {
        conditions.push("s.id_gerencia = (SELECT id_gerencia FROM usuarios WHERE id_usuario = ?)");
        values.push(id);

    }

    if (estado) {
        conditions.push("s.estado = ?");
        values.push(estado);
    }

    if (busqueda) {
        conditions.push("(s.id_solicitud LIKE ? OR s.resumen LIKE ?)");
        const term = `%${busqueda}%`;
        values.push(term, term);
    }

    if (conditions.length > 0) {
        const condStr = " AND " + conditions.join(" AND ");
        baseSelect += condStr;
        baseCount += condStr;
    }

    baseSelect += " ORDER BY s.fecha_creacion DESC LIMIT ? OFFSET ?";

    const valuesCount = [...values];
    const valuesSelect = [...values, Number(limit), Number(offset)];

    const [rows] = await pool.execute(baseSelect, valuesSelect);
    const [countResult] = await pool.execute(baseCount, valuesCount);

    return {
        rows,
        totalRows: {
            total: countResult[0].total || 0,
            pendientes: countResult[0].pendientes || 0,
            aprobados: countResult[0].aprobados || 0,
            rechazados: countResult[0].rechazados || 0,
        }
    };
}

const getMensajes = async (userId, withUser = null, limitChats = null) => {
    try {

        let sql = `
         SELECT 
    m.id_mensaje,
    c.id_solicitud,
    m.id_emisor AS fromId,
    m.contenido AS mensaje,
    m.fecha_envio AS time,
    m.leido AS view,
    -- Datos completos del Emisor (Remitente)
    u_emi.id_usuario AS id_remitente,
    u_emi.username AS remitente_username,
    u_emi.nombres AS remitente_nombres,
    u_emi.apellidos AS remitente_apellidos,
    u_emi.avatar AS remitente_avatar,
    -- Datos completos del Destinatario (La otra persona en el chat)
    u_dest.id_usuario AS toId,
    u_dest.username AS destinatario_username,
    u_dest.nombres AS destinatario_nombres,
    u_dest.apellidos AS destinatario_apellidos,
    u_dest.avatar AS destinatario_avatar
FROM chats c
INNER JOIN  mensajes m ON m.id_chat = c.id_chat
INNER JOIN usuarios u_emi ON m.id_emisor = u_emi.id_usuario

INNER JOIN chat_participantes cp ON c.id_chat = cp.id_chat AND m.id_emisor != ?
INNER JOIN usuarios u_dest ON cp.id_usuario = u_dest.id_usuario

WHERE   u_dest.id_usuario != ?;

         
        `;

        const params = [userId, userId];



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
        const params = [userId, userId, userId];
        const sql = chatSQL
        const [rows] = await pool.execute(sql, params);

        return { success: true, rows };

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

const insertMensaje = async (idRemitente, idDestinatario, mensaje, tipo = 'general', idSolicitud = null) => {
    try {
        // 1. Buscamos o creamos el chat entre estas dos personas
        const idChat = await obtenerOCrearChat(idRemitente, idDestinatario, idSolicitud);

        // 2. Insertamos el mensaje usando el idChat obtenido
        // Nota: insertMensajeSQL ahora solo debe pedir [id_chat, id_emisor, contenido]
        const [result] = await pool.execute(insertMensajeSQL, [idChat, idRemitente, mensaje]);

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


// Función para obtener o crear un chat entre dos personas
const obtenerOCrearChat = async (id1, id2, idSolicitud = null) => {
    // 1. Buscar si ya existe
    const [existente] = await pool.execute(buscarChatPrivadoSQL, [id1, id2]);

    if (existente.length > 0) return existente[0].id_chat;

    // 2. Si no existe, crear el chat
    const [nuevoChat] = await pool.execute(crearChatSQL, ['individual', idSolicitud]);
    const idChat = nuevoChat.insertId;

    // 3. Añadir a ambos participantes
    await pool.execute(insertarParticipanteSQL, [idChat, id1]);
    await pool.execute(insertarParticipanteSQL, [idChat, id2]);

    return idChat;
};

// Modifica tu función de insertar mensaje
const registrarMensaje = async (idEmisor, idReceptor, contenido, idSolicitud = null) => {
    try {
        const idChat = await obtenerOCrearChat(idEmisor, idReceptor, idSolicitud);
        const [result] = await pool.execute(insertMensajeSQL, [idChat, idEmisor, contenido]);
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
