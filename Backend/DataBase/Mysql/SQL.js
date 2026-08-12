const sqlBase =
    `SELECT
  p.id_usuario,
  p.codigo_producto,
  p.nombre,
  p.descripcion,
  p.precio,
  p.fecha_creacion,
  p.marca,
  p.tipo,
  p.imagen_url,
  c.nombre_categoria,
  pv.tipo_variable,
  pv.valor_variable,
  pv.tipo_variable2,
  pv.valor_variable2,
  pv.imagen_variable_url
FROM
  productos AS p
LEFT JOIN
  producto_variables AS pv ON p.id = pv.id_producto
LEFT JOIN
  categorias AS c ON p.id_categoria = c.id_categoria`;


const sqlusuario = `
    SELECT 
      u.id_usuario,
      u.username, 
      u.password,
      u.email,
      u.nombres,
      u.avatar,
      u.apellidos,
      u.id_rol,
      u.activo,
      r.nombre_rol
    FROM 
      usuarios AS u
    LEFT JOIN
      roles AS r ON r.id_rol = u.id_rol`;


const insertUsuarioSQL = `
        INSERT INTO usuarios (username, password, email, nombres, apellidos, id_rol, id_gerencia, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
const insertProductosSQL = `
        INSERT INTO productos (codigo_producto, nombre, descripcion, precio, id_categoria, marca, tipo, imagen_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
const insertVariablesProductosSQL = `INSERT INTO producto_variables (id_producto, tipo_variable, valor_variable, imagen_variable_url, tipo_variable2, valor_variable2)
         VALUES (?, ?, ?, ?, ?, ?)`

const solicitudes = `
SELECT 
    s.id_solicitud,
    s.fecha_creacion,
    g.nombre_gerencia,

    s.id_solicitante,
    CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo, -- Traemos el nombre real
    s.justificacion,
    s.resumen, 
    
    s.estado
FROM solicitudes_compra s
JOIN gerencias g ON s.id_gerencia = g.id_gerencia
JOIN usuarios u ON s.id_solicitante = u.id_usuario -- Unimos con la tabla de usuarios

ORDER BY s.fecha_creacion DESC

         `;
const solicitudesUsuario = `
SELECT 
    s.id_solicitud,
    s.fecha_creacion,
    g.nombre_gerencia,

    s.id_solicitante,
    CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo, -- Traemos el nombre real
    s.justificacion,
    s.resumen, 

    s.estado
FROM solicitudes_compra s
JOIN gerencias g ON s.id_gerencia = g.id_gerencia
JOIN usuarios u ON s.id_solicitante = u.id_usuario -- Unimos con la tabla de usuarios
WHERE s.id_solicitante = ?
ORDER BY s.fecha_creacion DESC
  
         `;


const insetarSolicitud = `
INSERT INTO solicitudes_compra (
    resumen,
    justificacion,
    justificacion_pdf_url,
    requerimientos_texto,
    requerimientos_pdf_url,
    tipo_solicitud,
    prioridad,
    id_estado,
    id_gerencia,
    id_solicitante
)
VALUES (
    ?,                -- 1. resumen
    ?,                -- 2. justificacion
    ?,                -- 3. justificacion_pdf_url
    ?,                -- 4. requerimientos_texto
    ?,                -- 5. requerimientos_pdf_url
    ?,                -- 6. tipo_solicitud
    ?,                -- 7. prioridad
    (SELECT id_estado FROM estados_solicitud WHERE nombre = 'Pendiente' LIMIT 1),
    ?,                -- 8. id_gerencia
    ?                 -- 9. id_solicitante
);
`






// Insertar un producto/servicio en detalles_solicitud
export const insertarDetalleSQL = `
INSERT INTO detalles_solicitud (id_solicitud, id_producto, id_servicio, cantidad)
VALUES (?, ?, ?, ?)
`;

// Buscar si ya existe un chat privado entre dos usuarios
export const buscarChatPrivadoSQL = `
    SELECT cp1.id_chat 
    FROM chat_participantes cp1
    JOIN chat_participantes cp2 ON cp1.id_chat = cp2.id_chat
    JOIN chats c ON cp1.id_chat = c.id_chat
    WHERE cp1.id_usuario = ? AND cp2.id_usuario = ? AND c.tipo = 'individual'
`;

// Crear un nuevo chat
export const crearChatSQL = `INSERT INTO chats (tipo, id_solicitud) VALUES (?, ?)`;

// Añadir participante
export const insertarParticipanteSQL = `INSERT INTO chat_participantes (id_chat, id_usuario) VALUES (?, ?)`;

// Obtener mensajes de un chat específico
export const mensajesPorChatSQL = `
    SELECT 
        m.id_mensaje,
        m.contenido as mensaje,
        m.fecha_envio,
        m.leido,
        m.id_emisor as id_remitente,
        u.nombres as remitente_nombres,
        u.apellidos as remitente_apellidos,
        u.avatar as remitente_avatar,
        m.id_respuesta,
        m_resp.contenido AS respuesta_contenido,
        u_resp.nombres AS respuesta_nombres,
        u_resp.apellidos AS respuesta_apellidos,
        u_resp.avatar AS respuesta_avatar
    FROM mensajes m
    JOIN usuarios u ON m.id_emisor = u.id_usuario
    LEFT JOIN mensajes m_resp ON m.id_respuesta = m_resp.id_mensaje
    LEFT JOIN usuarios u_resp ON m_resp.id_emisor = u_resp.id_usuario
    WHERE m.id_chat = ?
    
`;

// Insertar mensaje con id_chat
export const insertMensajeSQL = `
    INSERT INTO mensajes (id_chat, id_emisor, contenido, id_respuesta, leido)
    VALUES (?, ?, ?, ?, FALSE)
`;

export const chatSQL = `
SELECT 
    c.id_chat,
    c.tipo,
    c.id_solicitud,
    s.resumen AS referencia_solicitud,
    -- Información del otro participante (si existe)
    (SELECT u2.username FROM chat_participantes cp2 JOIN usuarios u2 ON cp2.id_usuario = u2.id_usuario WHERE cp2.id_chat = c.id_chat AND cp2.id_usuario != ? LIMIT 1) AS from_username,
    (SELECT u2.nombres FROM chat_participantes cp2 JOIN usuarios u2 ON cp2.id_usuario = u2.id_usuario WHERE cp2.id_chat = c.id_chat AND cp2.id_usuario != ? LIMIT 1) AS from_nombres,
    (SELECT u2.apellidos FROM chat_participantes cp2 JOIN usuarios u2 ON cp2.id_usuario = u2.id_usuario WHERE cp2.id_chat = c.id_chat AND cp2.id_usuario != ? LIMIT 1) AS from_apellidos,
    (SELECT u2.avatar FROM chat_participantes cp2 JOIN usuarios u2 ON cp2.id_usuario = u2.id_usuario WHERE cp2.id_chat = c.id_chat AND cp2.id_usuario != ? LIMIT 1) AS from_avatar,
    (SELECT cp2.id_usuario FROM chat_participantes cp2 WHERE cp2.id_chat = c.id_chat AND cp2.id_usuario != ? LIMIT 1) AS from_id,
    m_ultimo.contenido AS ultimo_mensaje,
    m_ultimo.fecha_envio AS fecha_ultimo_mensaje,
    m_ultimo.leido AS view,
    m_ultimo.id_emisor AS id_emisor
FROM chats c
LEFT JOIN solicitudes_compra s ON c.id_solicitud = s.id_solicitud
-- Información del usuario actual (para mantener compatibilidad con el mapeo existente)
INNER JOIN usuarios u ON u.id_usuario = ?
-- Traemos el último mensaje usando una subconsulta correlacionada
JOIN mensajes m_ultimo ON m_ultimo.id_mensaje = (
    SELECT id_mensaje 
    FROM mensajes 
    WHERE id_chat = c.id_chat 
    ORDER BY fecha_envio ASC 
    LIMIT 1
)
-- Filtramos para que solo aparezcan chats donde YO participo
WHERE c.id_chat IN (
    SELECT id_chat 
    FROM chat_participantes 
    WHERE id_usuario = ?
)
ORDER BY m_ultimo.fecha_envio ASC;`

export const sqlUsuarios = `
 SELECT 
    u.id_usuario, 
    u.username, 
    u.email, 
    u.nombres, 
    u.apellidos, 
    u.id_rol, 
    u.avatar,
    u.id_gerencia, 
    u.en_linea,
    u.ultima_conexion,
    u.activo,
    r.nombre_rol, 
    g.nombre_gerencia
FROM usuarios u
LEFT JOIN gerencias g ON u.id_gerencia = g.id_gerencia
LEFT JOIN roles r ON u.id_rol = r.id_rol

`;

const datatimesemanas = `
SELECT 
    dias.name,
    COUNT(s.id_solicitud) AS solicitudes,
    SUM(CASE WHEN e.nombre = 'Finalizado' THEN 1 ELSE 0 END) AS aprobadas
FROM (
    SELECT 2 AS dw, 'Lun' AS name UNION ALL
    SELECT 3, 'Mar' UNION ALL
    SELECT 4, 'Mie' UNION ALL
    SELECT 5, 'Jue' UNION ALL
    SELECT 6, 'Vie' UNION ALL
    SELECT 7, 'Sab' UNION ALL
    SELECT 1, 'Dom'
) AS dias
LEFT JOIN solicitudes_compra s ON DAYOFWEEK(s.fecha_creacion) = dias.dw 
    AND s.fecha_creacion >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
LEFT JOIN estados_solicitud e ON s.id_estado = e.id_estado
GROUP BY dias.dw, dias.name
ORDER BY CASE WHEN dias.dw = 1 THEN 7 ELSE dias.dw - 1 END;
`



const datatimeSqluser = `SELECT 
    meses.name AS name,
    COUNT(s.id_solicitud) AS solicitudes,
    SUM(CASE WHEN e.nombre = 'Finalizado' THEN 1 ELSE 0 END) AS aprobadas,
    IFNULL(SUM(s.monto_estimado), 0) AS monto_total
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
LEFT JOIN solicitudes_compra s
    ON MONTH(s.fecha_creacion) = meses.m
    AND YEAR(s.fecha_creacion) = YEAR(CURDATE())
    AND s.id_gerencia = (SELECT id_gerencia FROM usuarios WHERE id_usuario = ?)
LEFT JOIN estados_solicitud e ON s.id_estado = e.id_estado
GROUP BY meses.m, meses.name
ORDER BY meses.m;`;


const datatimeSqladmin = `SELECT 
    meses.name AS name,
    COUNT(s.id_solicitud) AS solicitudes,
    SUM(CASE WHEN e.nombre = 'Finalizado' THEN 1 ELSE 0 END) AS aprobadas,
    IFNULL(SUM(s.monto_estimado), 0) AS monto_total
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
LEFT JOIN solicitudes_compra s
    ON MONTH(s.fecha_creacion) = meses.m
    AND YEAR(s.fecha_creacion) = YEAR(CURDATE())
LEFT JOIN estados_solicitud e ON s.id_estado = e.id_estado
GROUP BY meses.m, meses.name
ORDER BY meses.m;
`


export const gerenciassqladmin = `
            SELECT  
                cc.id_centro_costo, 
                cc.codigo_centro,   
                cc.id_gerencia,
                cc.presupuesto_asignado,
                g.nombre_gerencia,
                COALESCE(SUM(s.monto_estimado), 0) AS total_gastado,
                (cc.presupuesto_asignado - COALESCE(SUM(s.monto_estimado), 0)) AS saldo_disponible
            FROM centro_costo cc 
            INNER JOIN gerencias g ON cc.id_gerencia = g.id_gerencia
            LEFT JOIN solicitudes_compra s ON cc.id_gerencia = s.id_gerencia 
                AND YEAR(s.fecha_creacion) = YEAR(CURDATE())
            LEFT JOIN estados_solicitud e ON s.id_estado = e.id_estado
            WHERE e.nombre IS NULL OR e.nombre != 'Rechazado'
            GROUP BY 
                cc.id_centro_costo, cc.codigo_centro, cc.id_gerencia, 
                cc.presupuesto_asignado, g.nombre_gerencia`

    // Variantes para instalaciones donde la columna `monto_estimado` NO existe
    export const gerenciassqladmin_nomonto = `
                SELECT
                    cc.id_centro_costo,
                    cc.codigo_centro,
                    cc.id_gerencia,
                    cc.presupuesto_asignado,
                    g.nombre_gerencia,
                    0 AS total_gastado,
                    (cc.presupuesto_asignado - 0) AS saldo_disponible
                FROM centro_costo cc
                INNER JOIN gerencias g ON cc.id_gerencia = g.id_gerencia
                LEFT JOIN solicitudes_compra s ON cc.id_gerencia = s.id_gerencia
                    AND YEAR(s.fecha_creacion) = YEAR(CURDATE())
                LEFT JOIN estados_solicitud e ON s.id_estado = e.id_estado
                WHERE e.nombre IS NULL OR e.nombre != 'Rechazado'
                GROUP BY
                    cc.id_centro_costo, cc.codigo_centro, cc.id_gerencia,
                    cc.presupuesto_asignado, g.nombre_gerencia`;

    export const gerenciassqluser_nomonto = `
                SELECT
                    cc.id_centro_costo,
                    cc.codigo_centro,
                    cc.id_gerencia,
                    cc.presupuesto_asignado,
                    g.nombre_gerencia,
                    0 AS total_gastado,
                    (cc.presupuesto_asignado - 0) AS saldo_disponible
                FROM centro_costo cc
                INNER JOIN gerencias g ON cc.id_gerencia = g.id_gerencia
                LEFT JOIN solicitudes_compra s ON cc.id_gerencia = s.id_gerencia
                    AND YEAR(s.fecha_creacion) = YEAR(CURDATE())
                LEFT JOIN estados_solicitud e ON s.id_estado = e.id_estado
                WHERE cc.id_gerencia = (SELECT id_gerencia FROM usuarios WHERE id_usuario = ?)
                  AND (e.nombre IS NULL OR e.nombre != 'Rechazado')
                GROUP BY
                    cc.id_centro_costo, cc.codigo_centro, cc.id_gerencia,
                    cc.presupuesto_asignado, g.nombre_gerencia`;


export const gerenciassqluser = `
            SELECT  
                cc.id_centro_costo, 
                cc.codigo_centro,   
                cc.id_gerencia,
                cc.presupuesto_asignado,
                g.nombre_gerencia,
                COALESCE(SUM(s.monto_estimado), 0) AS total_gastado,
                (cc.presupuesto_asignado - COALESCE(SUM(s.monto_estimado), 0)) AS saldo_disponible
            FROM centro_costo cc 
            INNER JOIN gerencias g ON cc.id_gerencia = g.id_gerencia
            LEFT JOIN solicitudes_compra s ON cc.id_gerencia = s.id_gerencia 
                AND YEAR(s.fecha_creacion) = YEAR(CURDATE())
            LEFT JOIN estados_solicitud e ON s.id_estado = e.id_estado
            WHERE cc.id_gerencia = (SELECT id_gerencia FROM usuarios WHERE id_usuario = ?)
              AND (e.nombre IS NULL OR e.nombre != 'Rechazado')
            GROUP BY 
                cc.id_centro_costo, cc.codigo_centro, cc.id_gerencia, 
                cc.presupuesto_asignado, g.nombre_gerencia`


export { sqlBase, insetarSolicitud, datatimeSqladmin, datatimeSqluser, solicitudes, solicitudesUsuario, sqlusuario, insertUsuarioSQL, insertProductosSQL, insertVariablesProductosSQL, datatimesemanas };




