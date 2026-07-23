/**
 * socket.js
 * Módulo singleton de Socket.io.
 * Inicializa el servidor WebSocket una sola vez y exporta `getIO()`
 * para que cualquier controlador pueda emitir eventos.
 */

import { Server } from 'socket.io';

let _io = null;

/**
 * Inicializa Socket.io sobre el servidor HTTP dado.
 * @param {import('http').Server} httpServer
 * @param {object} corsOptions  - mismas opciones CORS del servidor
 * @returns {import('socket.io').Server}
 */
export const initSocket = (httpServer, corsOptions) => {
    _io = new Server(httpServer, { cors: corsOptions });

    // Manejo de conexiones y eventos básicos
    _io.on('connection', (socket) => {
        try {
            const session = socket.request?.session;
            const userId = session?.userId || session?.userId;
            if (userId) {
                socket.join(`user_${userId}`);
                // Anunciar estado online al resto de la app
                _io.emit('user_status_changed', { userId: Number(userId), en_linea: true, ultima_conexion: new Date().toISOString() });
            }
        } catch (e) {
            console.error('Error leyendo sesión en socket:', e);
        }

        // Unirse a salas de chat (pueden ser ids numéricos o nombres como 'solicitud_XX')
        socket.on('join_chat', (chatId) => {
            if (!chatId) return;
            try { socket.join(String(chatId)); } catch (e) { /* no crítico */ }
        });

        // Enviar mensajes en tiempo real (reenvío a sala correspondiente)
        socket.on('send_message', (payload) => {
            try {
                const chatRoom = payload?.chatId || payload?.id_chat || null;
                const toId = payload?.toId || payload?.to_id || null;
                const fromId = payload?.fromId || payload?.id_emisor || null;

                if (chatRoom) {
                    const isGroup = String(chatRoom).startsWith('solicitud_');
                    const eventName = isGroup ? 'nuevo_mensaje' : 'receive_message';

                    // Emitir por-socket en la sala y construir lista de usuarios presentes
                    const roomSockets = _io.sockets.adapter.rooms.get(String(chatRoom)) || new Set();
                    let recipientPresent = false;
                    for (const sid of roomSockets) {
                        const s = _io.sockets.sockets.get(sid);
                        if (!s) continue;
                        const sidUserId = s.request?.session?.userId;
                        if (sidUserId && Number(sidUserId) === Number(toId)) recipientPresent = true;
                        try { s.emit(eventName, payload); } catch (e) { /* ignore */ }
                    }

                    // Si el destinatario no está en la sala, envíale por su room `user_{id}`
                    if (toId && !recipientPresent) {
                        try { _io.to(`user_${toId}`).emit(isGroup ? 'nuevo_mensaje' : 'receive_message', payload); } catch (e) { }
                    }
                } else if (toId) {
                    // Mensaje directo sin sala: emitir por user room
                    try { _io.to(`user_${toId}`).emit('receive_message', payload); } catch (e) { }
                }
            } catch (err) {
                console.error('Error en send_message handler:', err);
            }
        });

        socket.on('disconnect', () => {
            try {
                const session = socket.request?.session;
                const userId = session?.userId || session?.userId;
                if (userId) {
                    _io.emit('user_status_changed', { userId: Number(userId), en_linea: false, ultima_conexion: new Date().toISOString() });
                }
            } catch (e) { /* ignore */ }
        });

    });

    return _io;
};

/**
 * Devuelve la instancia de Socket.io ya inicializada.
 * Lanza un error si se llama antes de initSocket().
 * @returns {import('socket.io').Server}
 */
export const getIO = () => {
    if (!_io) throw new Error('Socket.io no ha sido inicializado. Llama a initSocket primero.');
    return _io;
};
