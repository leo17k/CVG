import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthToken';
import { toast } from '../Componets/GoeyToaster';

const SocketContext = createContext();

const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playChime = (time, freq, duration) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.2, time + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      
      osc.start(time);
      osc.stop(time + duration);
    };

    const now = ctx.currentTime;
    // Chime 1 (F5 - 698.46 Hz)
    playChime(now, 698.46, 0.3);
    // Chime 2 (A5 - 880 Hz)
    playChime(now + 0.08, 880, 0.35);
  } catch (error) {
    console.warn("Failed to play notification sound:", error);
  }
};

export const SocketProvider = ({ children }) => {
  const { datauser } = useAuth();
  const socketRef = useRef(null);
  const [globalMessages, setGlobalMessages] = useState([]);
  const [globalNotifications, setGlobalNotifications] = useState([]);

  useEffect(() => {
    // Solo conectar si hay usuario y NO hay socket activo
    if (datauser?.userId && !socketRef.current) {
      socketRef.current = io(`http://${window.location.hostname}:5000`, {
        withCredentials: true,
        reconnection: true, // Asegura que se reconecte solo
      });

      socketRef.current.on('connect', () => {
        console.log('✅ Socket Conectado:', socketRef.current.id);
      });

      socketRef.current.on('receive_message', (data) => {
        console.log('📩 Mensaje recibido en Global:', data);
        const fromId = data?.id_emisor ?? data?.fromId ?? data?.idEmisor ?? null;
        if (fromId && Number(fromId) !== Number(datauser?.userId)) {
          playNotificationSound();
          toast.info(`Mensaje de ${data?.remitente || 'Colaborador'}`, {
            description: data?.contenido || 'Has recibido un nuevo mensaje.'
          });
        }
        setGlobalMessages((prev) => {
          const incomingId = data?.id_mensaje ?? data?.idMensaje ?? data?.id ?? null;
          if (incomingId && prev.some(p => (p?.id_mensaje ?? p?.idMensaje ?? p?.id ?? null) == incomingId)) return prev;
          return [...prev, data];
        });
      });

      socketRef.current.on('nuevo_mensaje', (data) => {
        console.log('📨 Nuevo mensaje de solicitud (grupo):', data);
        const fromId = data?.id_emisor ?? data?.fromId ?? data?.idEmisor ?? null;
        if (fromId && Number(fromId) !== Number(datauser?.userId)) {
          playNotificationSound();
          toast.info(`Nuevo mensaje en solicitud`, {
            description: `${data?.remitente || 'Alguien'}: ${data?.contenido || 'Mensaje de grupo.'}`
          });
        }
        setGlobalMessages((prev) => {
          const incomingId = data?.id_mensaje ?? data?.idMensaje ?? data?.id ?? null;
          if (incomingId && prev.some(p => (p?.id_mensaje ?? p?.idMensaje ?? p?.id ?? null) == incomingId)) return prev;
          return [...prev, data];
        });
      });

      socketRef.current.on('receive_notification', (data) => {
        console.log('🔔 Notificación recibida en Global:', data);
        playNotificationSound();
        toast.success(data?.resumen || 'Nueva Notificación', {
          description: data?.contenido || 'Tienes una nueva notificación.'
        });
        setGlobalNotifications((prev) => [...prev, data]);
      });

    }

    // Cleanup: Solo desconectar si el usuario cierra sesión (datauser es null)
    if (!datauser && socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [datauser]);

  const joinChat = (chatId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_chat', chatId);
    }
  };

  const sendMessage = (chatId, messageData) => {
    if (socketRef.current?.connected) {
      // Enviamos TODO en un solo nivel
      socketRef.current.emit('send_message', {
        ...messageData,
        chatId
      });
    }
  };

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      globalMessages,
      globalNotifications,
      joinChat,
      sendMessage,
      clearGlobalMessages: () => setGlobalMessages([]),
      clearGlobalNotifications: () => setGlobalNotifications([])
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    // Proveer fallback seguro para evitar que la app se rompa si el provider no está presente.
    // Esto permite que componentes que usan `useSocket` sigan funcionando (sin realtime).
    // También ayuda durante el render en páginas públicas donde el provider podría no envolver todo.
    console.warn('useSocket: SocketProvider no encontrado — devolviendo fallback seguro.');
    return {
      socket: null,
      globalMessages: [],
      globalNotifications: [],
      joinChat: () => {},
      sendMessage: () => {},
      clearGlobalMessages: () => {},
      clearGlobalNotifications: () => {}
    };
  }
  return context;
};
