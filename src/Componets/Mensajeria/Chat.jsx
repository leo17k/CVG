
const chatStyles = `
  @keyframes chatIn {
    0% { opacity: 0; transform: translateY(20px) scale(0.95); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes chatOut {
    from { opacity: 1; transform: translateY(0) scale(1); }
    to { opacity: 0; transform: translateY(15px) scale(0.98); }
  }

  .animate-chat-in { 
    animation: chatIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  }

  .animate-chat-out { 
    animation: chatOut 0.25s ease-out forwards; 
  }

  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

  /* Ajuste para móviles: Ocupar todo el alto visual disponible */
  @media (max-width: 640px) {
    .mobile-fullscreen {
      height: 100dvh !important; 
      width: 100vw !important;
      bottom: 0 !important;
      right: 0 !important;
      border-radius: 0 !important;
    }
  }
`;


import { data } from "react-router-dom";
import { useSocket } from "../../Constext/SocketContext";
import { useEffect, useState, useRef, useMemo } from "react";

// ... (chatStyles se mantiene igual)

const ChatPopup = ({ user, currentUser, onClose, datauser, newAlert, setNewAlert }) => {

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [loadingMore, setLoadingMore] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef(null);

  // Traer la conexión y métodos desde nuestro Contexto
  const { socket, joinChat, sendMessage: sendGlobalMessage, globalMessages } = useSocket();

  // 1. Entrar automáticamente a la sala del chat cuando abrimos el pop-up
  useEffect(() => {
    if (!socket || !user) return;
    joinChat(user.chatId);
  }, [socket, user?.chatId]);

  // 2. Escuchar nuevos mensajes usando al gestor global de Context
  useEffect(() => {
    if (globalMessages.length > 0) {
      const lastMsg = globalMessages[globalMessages.length - 1];
      
      // Si el mensaje de globalMessages pertenece a ESTE chat 
      // y NO ha sido enviado por nosotros en esta misma terminal...
      if (lastMsg.chatId == user.chatId && lastMsg.fromId !== (datauser?.userId || currentUser?.id)) {
        
        setMessages((prev) => {
          // Prevenir duplicados en base al texto y al tiempo exacto (como fallback)
          const isDuplicated = prev.some(m => m.mensaje === lastMsg.mensaje && m.time === lastMsg.time && !m.ismy);
          if (isDuplicated) return prev;
          
          return [...prev, { ...lastMsg, ismy: false }];
        });

        scrollToBottom();
        if (setNewAlert) setNewAlert(true);
      }
    }
  }, [globalMessages, user?.chatId]);

  // Cargar historial inicial
  useEffect(() => {
    if (user?.id) {
      setMessages([]);
      setOffset(0);
      setHasMore(true);
      fetchMessages(user.id, 0, true);
    }
  }, [user?.id]);

  const scrollToBottom = (behavior = "smooth") => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior
        });
      }
    }, 100);
  };

  const fetchMessages = async (userId, currentOffset, isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      const resp = await fetch(`http://${window.location.hostname}:5000/mensajes?with=${userId}&offset=${currentOffset}`, {
        credentials: 'include'
      });
      const result = await resp.json();

      if (resp.ok) {
        const nuevosMensajes = result.mensaje || [];
        if (nuevosMensajes.length < 20) setHasMore(false);

        if (isInitial) {
          setMessages(nuevosMensajes);
          scrollToBottom("auto");
        } else {
          const prevHeight = scrollRef.current.scrollHeight;
          setMessages(prev => [...nuevosMensajes, ...prev]);
          // Mantener la posición del scroll tras cargar mensajes antiguos
          setTimeout(() => {
            if (scrollRef.current)
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight;
          }, 0);
        }
      }
    } catch (err) {
      console.error('Fetch error', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleScroll = (e) => {
    if (e.currentTarget.scrollTop === 0 && !loadingMore && hasMore && !loading) {
      const nextOffset = offset + 20;
      setOffset(nextOffset);
      fetchMessages(user.id, nextOffset, false);
    }
  };

  const sendMessage = async () => {
    if (!newMsg.trim()) return;

    const messageData = {
      toId: user.id,
      fromId: datauser?.userId || currentUser?.id, // ID del usuario actual
      mensaje: newMsg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ismy: true
    };

    try {
      // 1. Emitir por Socket Global
      sendGlobalMessage(user.chatId, messageData);

      // 2. Actualizar UI
      setMessages(prev => [...prev, messageData]);
      setNewMsg('');
      scrollToBottom();

      // 3. Guardar en DB
      await fetch(`http://${window.location.hostname}:5000/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ toId: user.id, mensaje: newMsg })
      });
    } catch (err) {
      console.error('Send error', err);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 250);
  };

  if (!user) return null;

  return (
    <div className={`fixed right-4 bottom-4 w-96 max-h-[600px] 
      max-sm:top-0 max-sm:h-dvh max-sm:max-h-dvh 
      bg-white border border-slate-200 rounded-[24px] 
      shadow-2xl z-100 flex flex-col overflow-hidden
      mobile-fullscreen
      origin-bottom ${isClosing ? 'animate-chat-out' : 'animate-chat-in'}`}>

      <style>{chatStyles}</style>

      {/* Header - Fixed at top */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm overflow-hidden">
              {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user.initials}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 text-sm">{user.name}</span>
            <span className="text-[10px] text-green-600 font-medium">En línea</span>
          </div>
        </div>
        <button onClick={handleClose} className="p-2 hover:bg-slate-100 text-slate-400 rounded-full transition-colors active:scale-90">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {/* Messages Area - Grows to fill space */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar scroll-smooth"
      >
        {loadingMore && (
          <div className="flex justify-center py-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-2">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={msg.id || index} className={`flex ${msg.ismy ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-2.5 shadow-sm text-sm ${msg.ismy ? 'bg-blue-600 text-white rounded-[18px] rounded-br-none' : 'bg-white text-slate-700 border border-slate-200 rounded-[18px] rounded-bl-none'}`}>
                {msg.mensaje}
                <div className={`text-[9px] mt-1 opacity-60 text-right ${msg.ismy ? 'text-blue-50' : 'text-slate-500'}`}>
                  {msg.time}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input - Always at the bottom */}
      <div className="p-4 bg-white border-t border-slate-100 pb-safe">
        <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-1">
          <input
            type="text"
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 bg-transparent border-none py-2.5 text-sm focus:ring-0 outline-none"
            placeholder="Escribe un mensaje..."
          />
          <button
            onClick={sendMessage}
            disabled={!newMsg.trim()}
            className="text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg disabled:opacity-30 transition-all active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPopup;
