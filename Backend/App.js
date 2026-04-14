import express from 'express';
import session from 'express-session';
import cors from 'cors';
import os from 'os';
import { generarPDF, generarPlanillaPDF } from './Milaware/PDF.js';
import logger from 'morgan'
import { createServer } from 'http';
import { Server } from 'socket.io';
import { consultasSimples, registrarMensaje, germensaje, getChat, verificarUsuarios, buscarUsuario, solicitudESCOMPRA } from './DataBase/ConsultasSQL.js';
import { insetSolicitud, } from './DataBase/InsertSQL.js';
import { sqlUsuarios, insertUsuarioSQL, datatimeSqladmin, datatimeSqluser, gerenciassqladmin, gerenciassqluser } from './DataBase/SQL.js';
import morgan from 'morgan';
import pool from './DataBase/ConexionSQL.js';
import bcrypt from 'bcrypt';
import { toFormData } from 'axios';

// MODULOS PARA BASE DE DATOS BACKUP
import { exec } from 'child_process';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de almacenamiento interno de subidas de base de datos temporal
const uploadBackup = multer({ dest: path.join(__dirname, 'uploads/') });


// --- CONFIGURACIÓN DE RED ---
const getLocalIp = () => {
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
};

const localIp = getLocalIp();
const app = express();


// --- MIDDLEWARES ---
const sessionMiddleware = session({
    secret: 'tu_secreto_muy_seguro',
    name: 'mi_sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        sameSite: 'lax',
    },
});


const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", `http://${getLocalIp()}:5173`],
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.engine.use(sessionMiddleware);

io.on('connection', (socket) => {
    const session = socket.request.session;
    const myId = session?.userId;

    if (myId) {
        socket.join(`user_${myId}`);
        console.log(`Usuario conectado (${socket.id}) asociado a sala personal: user_${myId}`);
    }

    socket.on('join_chat', (chatId) => {
        socket.join(chatId);
        console.log(`Usuario asociado a la sala: ${chatId}`);
    });

    socket.on('send_message', (data) => {
        const chatId = data.chatId;
        const msg = data.msg || data;

        if (!chatId || !msg) {
            return console.error("❌ Datos incompletos recibidos:", data);
        }

        // ismy en este contexto es false para el que lo recibe, pero el cliente se encarga de checar el fromId
        const payload = {
            toId: msg.toId,
            mensaje: msg.mensaje,
            time: msg.time,
            ismy: false,
            fromId: myId || msg.fromId || msg.from,
            chatId: msg.chatId
        };

        // Re-transmitimos a los demás en la sala de chat, 
        // y de forma paralela a la sala personal del destinatario
        // (Socket.io se encarga de no duplicarlo)
        const roomsToEmit = [chatId];
        if (msg.toId) {
            roomsToEmit.push(`user_${msg.toId}`);
        }

        socket.to(roomsToEmit).emit('receive_message', payload);

        console.log(`Mensaje emitido a salas [${roomsToEmit.join(', ')}]:`, msg?.mensaje || "Sin texto");
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
    });
});

app.use(sessionMiddleware);
app.use(express.json());
app.use(cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));


app.get('/reporte', async (req, res) => {


    // Configura el tipo de contenido
    res.setHeader('Content-Type', 'application/pdf');
    // 'attachment' fuerza la descarga, 'inline' lo abre en una pestaña nueva
    res.setHeader('Content-Disposition', 'attachment; filename=reporte-logistica.pdf');

    const pdf = generarPDF(req, res);


});

app.get('/reporte/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // La lógica del PDF configurará el header y pipeará.
        await generarPlanillaPDF(req, res, id);
    } catch (e) {
        console.error(e);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generando la planilla' });
        }
    }
});
app.get('/context', async (req, res) => {
    console.log('context')
    const gerencias = await pool.query('SELECT id_gerencia, nombre_gerencia, codigo FROM gerencias');
    const roles = await pool.query('SELECT id_rol, nombre_rol FROM roles');
    const campos = await pool.query('SHOW COLUMNS FROM usuarios');
    res.status(200).json({ gerencias: gerencias[0], roles: roles[0], campos: campos[0].map(c => c.Field) })





});


// --- ENDPOINTS DE RECUPERACIÓN / RESPALDO SAFE  ---
app.get('/api/backup/list', (req, res) => {
    if (!req.session.isLoggedIn || Number(req.session.rol) !== 1) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    const backupsDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupsDir)) return res.json({ backups: [] });

    fs.readdir(backupsDir, (err, files) => {
        if (err) return res.status(500).json({ error: 'Error interno' });
        const backups = files.filter(f => f.endsWith('.sql')).map(file => {
            const stats = fs.statSync(path.join(backupsDir, file));
            return {
                name: file,
                size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
                date: stats.mtime
            };
        }).sort((a, b) => b.date - a.date);
        res.json({ backups });
    });
});

app.get('/api/backup/export', (req, res) => {
    // Protección estricta, solo Admin (rol 1)
    if (!req.session.isLoggedIn || Number(req.session.rol) !== 1) {
        return res.status(401).json({ error: 'No tienes privilegios de Superadministrador para respaldar.' });
    }

    const backupsDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir);

    const fileName = `CVGCabelum_Backup_${Date.now()}.sql`;
    const filePath = path.join(backupsDir, fileName);

    // Usa mysqldump de mysql. En XAMPP/WAMP por lo general el usuario no tiene clave. 
    // Asegurarse de que `mysqldump` existe en el PATH del sistema o fallará y devolverá status 500.
    const command = `mysqldump -u root -h localhost proyecto-cvg > "${filePath}"`;

    exec(command, (error) => {
        if (error) {
            console.error(`🔴 Error ejecutando mysqldump: ${error.message}`);
            return res.status(500).json({ error: 'No se pudo exportar la base de datos de los registros locales.' });
        }

        // Si es exitoso, enviamos al cliente como descarga forzada y conservamos la copia local
        res.download(filePath, `Seguridad_BaseCVG_${new Date().toISOString().split('T')[0]}.sql`, (err) => {
            if (err) console.error("Error al transferir descarga al usuario", err);
        });
    });
});

app.post('/api/backup/import', uploadBackup.single('backup'), (req, res) => {
    // Protección estricta, solo Admin (rol 1)
    if (!req.session.isLoggedIn || Number(req.session.rol) !== 1) {
        if (req.file) fs.unlink(req.file.path, () => { });
        return res.status(401).json({ error: 'No tienes privilegios de Superadministrador para restaurar el sistema.' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No se procesó ningún archivo .sql' });
    }

    const filePath = req.file.path;
    // Pasa el script .sql usando mysql. Es una carga destructiva en la DB que regenera la BD
    const command = `mysql -u root -h localhost proyecto-cvg < "${filePath}"`;

    exec(command, (error) => {
        fs.unlink(filePath, () => { }); // Siempre eliminamos el archivo subido a temp

        if (error) {
            console.error(`🔴 Error ejecutando recuperación: ${error.message}`);
            return res.status(500).json({ error: 'El archivo SQL está corrupto, es inválido o no se tiene acceso al motor.' });
        }

        res.status(200).json({ success: true, message: 'La matriz logística ha sido restaurada con éxito.' });
    });
});


app.get('/notificaciones', async (req, res) => {
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
        res.status(200).json({ notificaciones: notificaciones[0], newalert: notificaciones[0].length > 0 });
    } catch (error) {
        console.error("Error al obtener notificaciones:", error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});
app.get('/gerencias', async (req, res) => {
    try {

        let sql = req.session.rol === 1 || req.session.rol === 5 ? gerenciassqladmin : gerenciassqluser;
        let values = req.session.rol === 1 || req.session.rol === 5 ? [] : [req.session.userId];
        const [gerencias] = await pool.query(sql, values);

        // --- LÓGICA DE NOTIFICACIONES DINÁMICAS ---
        for (const g of gerencias) {
            const presupuesto = Number(g.presupuesto_asignado) || 0;
            const restante = Number(g.saldo_disponible) || 0;
            const porcentaje = presupuesto > 0 ? (restante / presupuesto) * 100 : 100;

            // CASO A: ESTADO CRÍTICO (Menos del 20%)
            if (porcentaje <= 20 && presupuesto > 0) {
                // Verificar si ya existe la alerta de hoy
                const [existing] = await pool.query(
                    'SELECT id_not_soli FROM notificaciones_not_solisitud WHERE id_gerencia = ? AND status = "warning" LIMIT 1',
                    [g.id_gerencia]
                );

                if (existing.length === 0) {
                    const contenido = `ALERTA: Presupuesto crítico (${porcentaje.toFixed(1)}%). Disponible: $${restante.toLocaleString('es-VE')}`;
                    await pool.query(
                        'INSERT INTO notificaciones_not_solisitud (id_gerencia, contenido, status) VALUES (?, ?, ?)',
                        [g.id_gerencia, contenido, 'warning']
                    );
                }
            }
            // CASO B: RECUPERACIÓN (Más del 20%)
            // Si el presupuesto subió o se liberó dinero, eliminamos la alerta de "warning"
            else {
                await pool.query(
                    'DELETE FROM notificaciones_not_solisitud WHERE id_gerencia = ? AND status = "warning"',
                    [g.id_gerencia]
                );
            }
        }

        res.status(200).json({ gerencias });

    } catch (e) {
        console.error("Error en el módulo de gerencias:", e);
        res.status(500).json({ error: "Error al procesar presupuestos" });
    }
});

app.get('/users', async (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.status(401).json({ message: 'No autenticado' });
    }

    const { gerencia, columna, busqueda } = req.query;
    let sql = sqlUsuarios;

    let params = [];
    let conditions = [];

    console.log(req.query, gerencia)

    let isadmin = req.session.rol === 5 || req.session.rol === 1
    console.log('isadmin:', isadmin)
    if (isadmin == false) {
        console.log('paso pero se hizo el loco')
        conditions.push(` u.id_gerencia = (
    SELECT id_gerencia 
    FROM usuarios 
    WHERE id_usuario = ? )
`);
        params.push(req.session.userId);
    }
    // Filtro por Gerencia
    if (gerencia) {
        conditions.push("g.id_gerencia = ?");
        params.push(gerencia);
    }

    // Filtro por Campo e Input (Búsqueda parcial con LIKE)
    if (columna && busqueda) {
        // Importante: Validar que 'columna' sea un campo real para evitar SQL Injection
        // Aquí puedes usar una lista blanca de campos permitidos
        const camposPermitidos = ['nombres', 'apellidos', 'email', 'username', 'telf', 'cedula', 'id_usuario'];
        if (camposPermitidos.includes(columna)) {
            conditions.push(`u.${columna} LIKE ?`);
            params.push(`%${busqueda}%`);
        } else if (columna === 'rol' || columna === 'nombre_rol') {
            conditions.push(`r.nombre_rol LIKE ?`);
            params.push(`%${busqueda}%`);
        }
    }

    if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
    }
    console.log(sql, params)
    try {
        const [usuarios] = await pool.query(sql, params);
        res.json({ usuarios });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/usuarios', async (req, res) => {
    if (!req.session.isLoggedIn || req.session.rol !== 1) {
        console.log('No autenticado')
        return res.status(401).json({ error: 'Solo los administradores pueden crear usuarios' });
    }

    try {
        const { username, email, password, nombres, apellidos, id_rol, id_gerencia, telf, direccion, sexo, cedula } = req.body;
        if (!username || !email || !password || !nombres || !apellidos || !id_rol || !id_gerencia || !telf || !direccion || !sexo || !cedula) {
            console.log('Todos los campos son obligatorios')
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }
        // Validar si el rol seleccionado es Administrador (1) y la gerencia es válida
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
        const avatarPadre = 'avatar-1.png'; // Avatar por defecto
        const valores = [
            username, hashedPassword, email, nombres, apellidos,
            telf || null, sexo || 'Masculino', direccion || null,
            id_rol, id_gerencia, cedula || '', avatarPadre
        ];

        console.log(valores)

        const [resultado] = await pool.query(insertUsuarioSQL, valores);
        res.status(201).json({ message: 'Usuario creado exitosamente', id: resultado.insertId });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El username, email o cédula ya están en uso' });
        }
        res.status(500).json({ error: 'Error del servidor al crear usuario' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const usuarioSQL = await verificarUsuarios({ username, password });

        if (!usuarioSQL || !usuarioSQL.success) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        req.session.isLoggedIn = true;
        req.session.rol = usuarioSQL.data.id_rol;
        req.session.userId = usuarioSQL.data.id_usuario;
        req.session.username = username;

        return res.status(200).json({ message: "Sesión iniciada", data: usuarioSQL });
    } catch (error) {
        res.status(500).json({ message: "Error interno" });
        console.log(error)
    }
});

app.get('/check-session', (req, res) => {
    if (req.session.isLoggedIn) {
        return res.status(200).json({ isAuthenticated: true, userId: req.session.userId, datauser: req.session });
    }
    res.status(401).json({ isAuthenticated: false });
});

app.post('/mensajes', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: 'No autorizado' });

    const fromId = req.session.userId;
    const { mensaje, toId, idSolicitud } = req.body;

    const result = await registrarMensaje(fromId, toId, mensaje, idSolicitud);

    if (result.success) {
        const newMsg = {
            idMensaje: result.insertId,
            idChat: result.idChat,
            fromId,
            toId,
            mensaje,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Emitir a través del socket
        io.to(`user_${toId}`).emit('receive_message', { ...newMsg, ismy: false });

        return res.status(201).json({ success: true, message: newMsg });
    }
    res.status(500).json({ error: 'Error DB' });
});
// --- RUTAS DE AUTENTICACIÓN ---

app.get('/12', async (req, res) => {
    res.json({ sexo: '12', iduser: req.session.userId, name: 'cesar' })
})


app.post('/crearsolicitud', async (req, res) => {
    const { titulo, justificacion, id_usuario, monto } = req.body


    console.log('creando solicitud usuario con el id :', req.session.userId)
    try {
        insetSolicitud({ titulo, justificacion, id_usuario: req.session.userId, monto })
        res.status(201).json({ mensage: 'solicitud creada con exito' })
    }
    catch (error) {
        res.status(500).json({ mensage: 'erro interno del servidor' })
    }
})

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Llamada a la base de datos
        const usuarioSQL = await verificarUsuarios({ username, password });

        if (!usuarioSQL || !usuarioSQL.success || usuarioSQL.success === false) {
            return res.status(401).json({ message: usuarioSQL?.error || 'Credenciales inválidas' });
        }

        req.session.isLoggedIn = true;
        req.session.rol = usuarioSQL.data.id_rol;
        req.session.userId = usuarioSQL.data.id_usuario;
        req.session.username = username; // guardar nombre de usuario para mensajería

        return res.status(200).json({
            message: "Sesión iniciada",
            data: {
                ...usuarioSQL.data,
                isAdmin: Number(usuarioSQL.data.id_rol) === 1 || usuarioSQL.data.nombre_rol === 'administrador'
            }
        });

    } catch (error) {
        console.error("Error en el login:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
});

// Ruta de Verificación de Sesión
app.get('/check-session', (req, res) => {

    if (req.session.isLoggedIn) {
        return res.status(200).json({
            isAuthenticated: true,
            userId: req.session.userId,
            datauser: {
                ...req.session,
                isAdmin: Number(req.session.rol) === 1
            }
        });
    } else {
        return res.status(401).json({ isAuthenticated: false, message: 'No autenticado' });
    }
});

// Ruta de Logout
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error al destruir la sesión:', err);
            return res.status(500).json({ message: 'Error al cerrar sesión' });
        }
        res.clearCookie('mi_sid');
        return res.status(200).json({ message: 'Sesión cerrada correctamente' });
    });
});

app.post('/rol', (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.status(200).json({ message: 'SIN USO DE SECCION!!!!' })
    }
})

app.get('/mensajes', async (req, res) => {
    try {
        const withUserId = req.query.with;
        const offset = req.query.offset || 0;
        const myId = req.session.userId;

        const mensajes = await germensaje(withUserId, myId, offset);
        res.json({ mensaje: mensajes });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
app.get('/chats', async (req, res) => {

    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).json({ error: 'No has iniciado sesión' });
    }

    const result = await getChat(userId);


    if (!result.success) {
        return res.status(500).json({ error: result.error });
    }

    const formatted = result.rows.map(m => ({
        chatId: m.id_chat,
        idMensaje: m.id_mensaje,
        idSolicitud: m.id_solicitud,
        id: m.from_id,
        name: `${m.from_nombres + ' ' + m.from_apellidos}`,
        avatar: m.from_avatar,
        initials: m.to_nombres ? m.to_nombres.charAt(0).toUpperCase() : '?',
        to: {
            id: m.from_id,
            username: m.from_username,
            name: `${m.from_nombres + ' ' + m.from_apellidos}`,
            avatar: m.from_avatar
        },
        from: {
            id: m.to_id,
            username: m.to_username,
            name: `${m.to_nombres + ' ' + m.to_apellidos}`,
            avatar: m.to_avatar
        },
        mensaje: m.ultimo_mensaje,
        time: m.fecha_ultimo_mensaje,
        view: m.view,
        unread: m.view === 0 && m.id_emisor !== userId,

    }));


    return res.status(200).json({
        mensaje: formatted,
        count: formatted.length,
        data: result
    });
});




app.get('/solicitudes', async (req, res) => {
    try {
        const userId = req.session.userId;
        const userRole = req.session.rol;

        // 1. Extraer SIEMPRE los parámetros de la query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const estado = req.query.estado || null;
        const busqueda = req.query.busqueda || null;

        let result;
        const isAdmin = Number(userRole) === 1 || Number(userRole) === 5;
        console.log(isAdmin, userRole)
        if (isAdmin) {
            result = await solicitudESCOMPRA({ page, limit, estado, busqueda });
        } else {
            // Un usuario normal solo puede consultar lo que le pertenece
            result = await solicitudESCOMPRA({ id: userId, page, limit, estado, busqueda });
        }

        let datatimeSql = datatimeSqladmin
        let datatimeParams = []

        if (!isAdmin) {
            datatimeSql = datatimeSqluser
            datatimeParams.push(userId)
        }



        const datatime = await pool.execute(datatimeSql, datatimeParams);

        // 'result' ahora es un objeto { rows, totalRows }
        // totalRows incluye todas las cuentas (total, pendientes, aprobados, rechazados)
        res.status(200).json({
            mensaje: result.rows,
            total: result.totalRows.total,          // valor numérico utilizado por el frontend
            counts: result.totalRows,
            datatime: datatime[0],      // objeto completo para desglose si se necesita
            page,
            limit
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ err: 'error del servidor' });
    }
});
app.put('/solicitudes/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!req.session.rol == 5 || req.session.rol == 1) {
            return res.status(401).json({ success: false, message: 'No tienes permisos para realizar esta acción' });
        }

        const sql = `UPDATE solicitudes_compra SET estado = ? WHERE id_solicitud = ?`;
        await pool.execute(sql, [estado, id]);

        // LOGICA DE NOTIFICACIONES (cuando se aprueba o rechaza)
        try {
            const [soliData] = await pool.query('SELECT resumen, id_solicitante FROM solicitudes_compra WHERE id_solicitud = ?', [id]);
            if (soliData.length > 0) {
                const solicitud = soliData[0];
                const dbStatus = estado === 'Aprobado' ? 'ok' : estado === 'Rechazado' ? 'error' : 'info';
                const contenido = `Tu solicitud "${solicitud.resumen}" ha sido ${estado}.`;

                const [resNotif] = await pool.query(
                    'INSERT INTO notificaciones (id_solicitud, contenido, status) VALUES (?, ?, ?)',
                    [id, contenido, dbStatus]
                );

                // Notificar en tiempo real por el socket si el usuario está conectado a la sala de notificaciones
                io.to(`user_${solicitud.id_solicitante}`).emit('receive_notification', {
                    id_notificacion: resNotif.insertId,
                    id_solicitud: id,
                    contenido,
                    status: dbStatus,
                    fecha: new Date().toISOString(),
                    resumen: solicitud.resumen
                });
            }
        } catch (notifErr) {
            console.error("Error creando notificación:", notifErr);
        }

        res.status(200).json({ success: true, message: 'Estado actualizado correctamente' });
    } catch (error) {
        console.error("Error al actualizar estado:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
});

// --- RUTAS DE INVENTARIO ---
app.get('/categorias', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM categorias ORDER BY nombre_categoria ASC');
        res.json({ data: rows });
    } catch (error) {
        console.error("Error al obtener categorias:", error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.post('/categorias', async (req, res) => {
    if (!req.session.isLoggedIn || req.session.rol !== 1) return res.status(401).json({ error: 'No autorizado' });
    try {
        const { nombre_categoria, descripcion } = req.body;
        const [result] = await pool.query('INSERT INTO categorias (nombre_categoria, descripcion) VALUES (?, ?)', [nombre_categoria, descripcion]);
        res.status(201).json({ message: 'Categoría creada', id: result.insertId });
    } catch (error) {
        console.error("Error al crear categoria:", error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.get('/productos', async (req, res) => {
    try {
        const [rows] = await pool.query(`
          SELECT  p.*, c.nombre_categoria ,
   g.nombre_gerencia
            FROM productos p 
            INNER JOIN gerencias g ON p.id_gerencia = g.id_gerencia
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria 
            ORDER BY p.nombre_producto ASC;
        `);
        res.json({ data: rows });
    } catch (error) {
        console.error("Error al obtener productos:", error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.post('/productos', async (req, res) => {
    if (!req.session.isLoggedIn || req.session.rol !== 1) return res.status(401).json({ error: 'No autorizado' });
    try {
        const { codigo_producto, nombre_producto, descripcion, id_categoria, stock_minimo, stock_actual, precio_unitario, id_gerencia } = req.body;
        const insertSql = `
            INSERT INTO productos 
            (codigo_producto, nombre_producto, descripcion, id_categoria, stock_minimo, stock_actual, precio_unitario, id_gerencia) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [codigo_producto, nombre_producto, descripcion, id_categoria, stock_minimo, stock_actual, precio_unitario, id_gerencia];

        const [result] = await pool.query(insertSql, params);
        res.status(201).json({ message: 'Producto creado', id: result.insertId });
    } catch (error) {
        console.error("Error al crear producto:", error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.get('/movimientos', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT m.*, p.nombre_producto,
            CONCAT(u.nombres, ' ', u.apellidos) AS nombre_usuario,
            s.resumen AS resumen_solicitud
            FROM inventario_movimientos m 
            LEFT JOIN productos p ON m.id_producto = p.id_producto 
            LEFT JOIN usuarios u ON m.id_usuario = u.id_usuario
            LEFT JOIN solicitudes_compra s ON m.id_solicitud = s.id_solicitud
            ORDER BY m.fecha_movimiento DESC
        `);
        res.json({ data: rows });
    } catch (error) {
        console.error("Error al obtener movimientos:", error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.post('/movimientos', async (req, res) => {
    if (!req.session.isLoggedIn || req.session.rol !== 1) return res.status(401).json({ error: 'No autorizado' });
    try {
        const { id_producto, tipo_movimiento, cantidad, motivo } = req.body;
        const id_usuario = req.session.userId;

        // Registrar movimiento
        const [result] = await pool.query(`
            INSERT INTO inventario_movimientos (id_producto, id_usuario, tipo_movimiento, cantidad, motivo) 
            VALUES (?, ?, ?, ?, ?)
        `, [id_producto, id_usuario, tipo_movimiento, cantidad, motivo]);

        // Actualizar stock del producto
        if (tipo_movimiento === 'Entrada') {
            await pool.query('UPDATE productos SET stock_actual = stock_actual + ? WHERE id_producto = ?', [cantidad, id_producto]);
        } else if (tipo_movimiento === 'Salida') {
            await pool.query('UPDATE productos SET stock_actual = stock_actual - ? WHERE id_producto = ?', [cantidad, id_producto]);
        } else if (tipo_movimiento === 'Ajuste') {
            await pool.query('UPDATE productos SET stock_actual = ? WHERE id_producto = ?', [cantidad, id_producto]);
        }

        res.status(201).json({ message: 'Movimiento registrado', id: result.insertId });
    } catch (error) {
        console.error("Error al registrar movimiento:", error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Ruta Protegida de Ejemplo
app.post('/perfil', async (req, res) => {
    try {
        const respuestaSQL = await buscarUsuario({ id: req.session.userId });

        const usuario = respuestaSQL.rows && respuestaSQL.rows[0];

        if (req.session.isLoggedIn && usuario) {
            const expires = req.session.cookie._expires;
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
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                }
            });
        } else {
            res.status(401).json({ message: 'Acceso denegado o usuario no encontrado' });
        }
    } catch (error) {
        console.error("Error en perfil:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

// // --- RUTA DE MENSAJES (POST) ---
// app.post('/mensajes', async (req, res) => {
//     if (!req.session || !req.session.userId) {
//         return res.status(401).json({ error: 'Sesión no iniciada' });
//     }

//     const fromId = req.session.userId;
//     const { mensaje, toId, idSolicitud } = req.body;

//     if (!toId || !mensaje) return res.status(400).json({ error: 'Datos incompletos' });

//     // Guardar en Base de Datos
//     const result = await registrarMensaje(fromId, toId, mensaje, idSolicitud);

//     if (result.success) {
//         const newMsg = {
//             idMensaje: result.insertId,
//             idChat: result.idChat,
//             fromId: fromId,
//             toId: toId,
//             mensaje,
//             time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
//         };

//         // ENVIAR POR SOCKET:
//         // 1. Al destinatario (a su sala privada)
//         io.to(`user_${toId}`).emit('receive_message', { ...newMsg, ismy: false });

//         // 2. A una sala de chat específica si la usas
//         io.to(`chat_${result.idChat}`).emit('newMessage', newMsg);

//         return res.status(201).json({ success: true, message: newMsg });
//     }
//     res.status(500).json({ error: 'Error al guardar mensaje' });
// });

const PORT = process.env.PORT || 5000;

/**
 * Escuchamos en '0.0.0.0' para que sea accesible desde la IP de tu PC 
 * en la red local (celulares, tablets u otras laptops).
 */
server.listen(PORT, '0.0.0.0', () => {
    const networkInterfaces = os.networkInterfaces();
    let localIp = 'localhost';

    for (const interfaceName in networkInterfaces) {
        for (const iface of networkInterfaces[interfaceName]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIp = iface.address;
            }
        }
    }

    console.log(`--------------------------------------------------`);
    console.log(`Servidor local:   http://localhost:${PORT}`);
    console.log(`Servidor en red:  http://${localIp}:${PORT}`);
    console.log(`--------------------------------------------------`);
});