import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthToken';

const SocketContext = createContext();

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
        setGlobalMessages((prev) => [...prev, data]);
      });

      socketRef.current.on('receive_notification', (data) => {
        console.log('🔔 Notificación recibida en Global:', data);
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
    throw new Error('useSocket debe ser utilizado dentro de un SocketProvider');
  }
  return context;
};
