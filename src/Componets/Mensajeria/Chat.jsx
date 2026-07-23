
const chatStyles = `  @keyframes chatIn {
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
  }`;


import { data } from "react-router-dom";
import { useSocket } from "../../Constext/SocketContext";
import { useEffect, useState, useRef, useMemo } from "react";
import UserCarrucel from "../componentes dashboard/UserCarrucel";
import { Avatar, AvatarImage, AvatarFallback } from "../Avatar";

// ... (chatStyles se mantiene igual)

const ChatPopup = ({ user, currentUser, userId, myId, onClose, datauser, newAlert, setNewAlert }) => {

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [loadingMore, setLoadingMore] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef(null);
  const [isOnline, setIsOnline] = useState(user?.en_linea ?? false);
  const [lastSeen, setLastSeen] = useState(user?.ultima_conexion || null);
  const isGroup = !!(user?.isGroup || user?.idSolicitud || user?.id_solicitud);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showContext, setShowContext] = useState(false);
  const [solicitudContext, setSolicitudContext] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [partsLoading, setPartsLoading] = useState(false);

  // Traer la conexión y métodos desde nuestro Contexto
  const { socket, joinChat, sendMessage: sendGlobalMessage, globalMessages } = useSocket();
  
  const currentUserId = useMemo(() => {
    const cand = userId || myId || datauser?.userId || datauser?.data?.id_usuario || datauser?.data?.userId || currentUser?.id || currentUser?.userId || (datauser && datauser.id_user) || null;
    return cand ? Number(cand) : null;
  }, [userId, myId, datauser, currentUser]);

  const currentUserName = useMemo(() => {
    if (datauser?.data?.nombres) return `${datauser.data.nombres} ${datauser.data.apellidos || ''}`.trim();
    return datauser?.data?.username || datauser?.username || currentUser?.username || currentUser?.name || null;
  }, [datauser, currentUser]);
  // 1. Entrar automáticamente a la sala del chat cuando abrimos el pop-up
  useEffect(() => {
    if (!socket || !user) return;
    joinChat(user.chatId);
    if (isGroup && (user.idSolicitud || user.id_solicitud)) {
      joinChat(`solicitud_${user.idSolicitud || user.id_solicitud}`);
    }
  }, [socket, user?.chatId]);

  // Escuchar cambios de estado de usuarios (online/offline) desde el socket
  useEffect(() => {
    if (!socket || isGroup) return; // los chats grupales no muestran estado por usuario
    const handler = (data) => {
      if (!data || !user) return;
      if (Number(data.userId) === Number(user.id) || Number(data.userId) === Number(user.to?.id) || Number(data.userId) === Number(user.to_id) ) {
        setIsOnline(Boolean(data.en_linea));
        if (data.ultima_conexion) setLastSeen(data.ultima_conexion);
      }
    };
    socket.on('user_status_changed', handler);
    return () => socket.off('user_status_changed', handler);
  }, [socket, user, isGroup]);

  // 2. Escuchar nuevos mensajes usando al gestor global de Context
useEffect(() => {
  if (globalMessages.length > 0) {
    const lastMsg = globalMessages[globalMessages.length - 1];
    const lastChatId = lastMsg.chatId || lastMsg.id_chat || lastMsg.idChat;

    // Usamos el ID del chat de la prop 'user'
    if (String(lastChatId) === String(user?.chatId)) {
      const rawFrom = lastMsg.fromId || lastMsg.id_emisor || lastMsg.from || lastMsg.id_remitente || lastMsg.from_id;
      const lastFrom = rawFrom ? Number(rawFrom) : null;

      console.log("Comparando IDs:", lastFrom, currentUserId); // Esto es lo que ves en consola

      if (lastFrom !== currentUserId) {
        setMessages((prev) => {
          const text = lastMsg.mensaje || lastMsg.contenido || lastMsg.message || '';
          const time = lastMsg.time || lastMsg.fecha_envio || new Date().toISOString();
          
          // Verificamos si el mensaje ya existe por ID para evitar duplicados del socket
          const isDuplicated = prev.some(m => (m.id === lastMsg.id_mensaje || m.id === lastMsg.id));
          if (isDuplicated) return prev;

          const mapped = {
            ...lastMsg,
            id: lastMsg.id_mensaje || lastMsg.id,
            mensaje: text,
            ismy: false,
            time: new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          return [...prev, mapped];
        });
        scrollToBottom();
      } else {
        // Lógica para tus propios mensajes (reemplazar local por real)
        setMessages((prev) => {
          const text = lastMsg.mensaje || lastMsg.contenido || lastMsg.message || '';
          const localIdx = prev.findLastIndex(m => 
            String(m.id).startsWith('local_') && (m.mensaje === text)
          );

          if (localIdx >= 0) {
            const newPrev = [...prev];
            newPrev[localIdx] = {
              ...lastMsg,
              id: lastMsg.id_mensaje || lastMsg.id,
              mensaje: text,
              ismy: true,
              time: new Date(lastMsg.fecha_envio || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            return newPrev;
          }
          return prev;
        });
      }
    }
  }
  // IMPORTANTE: Incluir estas dependencias para que el efecto se refresque
}, [globalMessages, user?.chatId, currentUserId]);
  // Cargar historial inicial
  useEffect(() => {
    if (user?.id) {
      setMessages([]);
      setOffset(0);
      setHasMore(true);
      fetchMessages(user.id, 0, true);
    }
  }, [user?.id]);

  // Si el chat está asociado a una solicitud, traer contexto (items, stock, etc.)
  useEffect(() => {
    const idSolicitud = user?.idSolicitud || user?.idSolicitud || user?.id_solicitud || user?.to?.idSolicitud || user?.to_id;
    if (!idSolicitud) return;
    (async () => {
      try {
        const resp = await fetch(`http://${window.location.hostname}:5000/solicitudes/${idSolicitud}`, { credentials: 'include' });
        if (resp.ok) {
          const j = await resp.json();
          setSolicitudContext(j);
        }
      } catch (err) {
        console.error('Error fetching solicitud context:', err);
      }
    })();
  }, [user?.idSolicitud, user?.to, user?.id]);

  // Traer participantes para mostrar en header (UserCarrucel)
  useEffect(() => {
    const idSolicitud = user?.idSolicitud || user?.id_solicitud || user?.to?.idSolicitud || user?.to_id;
    if (!isGroup || !idSolicitud) return;
    let mounted = true;
    setPartsLoading(true);
    fetch(`http://${window.location.hostname}:5000/solicitudes/${idSolicitud}/participants`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (!mounted) return;
        if (j && j.participants) {
          const users = j.participants.map(u => ({ id: u.id_usuario, avatar: u.avatar, name: `${u.nombres || ''} ${u.apellidos || ''}`.trim(), initials: ((u.nombres || '')[0] || '') + ((u.apellidos || '')[0] || '') }));
          setParticipants(users);
        } else setParticipants([]);
      })
      .catch(err => { console.error('Error fetching participants:', err); if (mounted) setParticipants([]); })
      .finally(() => mounted && setPartsLoading(false));
    return () => { mounted = false; };
  }, [isGroup, user?.idSolicitud, user?.id_solicitud]);

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

  const parsePersistedMessage = (content) => {
    if (!content || !content.startsWith('>>REPLY<<')) return { replyMeta: null, text: content };
    try {
      const endIdx = content.indexOf('>>\n');
      if (endIdx === -1) return { replyMeta: null, text: content };
      const header = content.substring('>>REPLY<<'.length, endIdx);
      const rest = content.substring(endIdx + 3);
      const parts = header.split('|');
      const meta = {};
      parts.forEach(p => {
        const [k, ...v] = p.split(':');
        meta[k] = v.join(':');
      });
      if (meta.msg) meta.msg = decodeURIComponent(meta.msg);
      return { replyMeta: meta, text: rest };
    } catch (err) {
      return { replyMeta: null, text: content };
    }
  };

  const buildPersistedMessage = (reply, messageText) => {
    // Ya no persistimos metadatos de reply dentro del texto.
    // Devolvemos el texto tal cual para guardar en la DB.
    return messageText;
  };

  const fetchMessages = async (userId, currentOffset, isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      const chatIdParam = user?.chatId || user?.idChat || user?.id_chat || null;
      const withParam = chatIdParam ? null : userId;
      const url = `http://${window.location.hostname}:5000/mensajes?${chatIdParam ? `idChat=${encodeURIComponent(chatIdParam)}` : `with=${encodeURIComponent(withParam)}`}&offset=${currentOffset}`;

      const resp = await fetch(url, { credentials: 'include' });
      const result = await resp.json();

      // Normalize response: soporta { mensaje: [] } | { data: [] } | { rows: [] } | []
      let nuevosMensajes = [];
      if (Array.isArray(result)) nuevosMensajes = result;
      else if (Array.isArray(result.mensaje)) nuevosMensajes = result.mensaje;
      else if (Array.isArray(result.data)) nuevosMensajes = result.data;
      else if (Array.isArray(result.rows)) nuevosMensajes = result.rows;
      else if (result && typeof result === 'object' && Object.keys(result).length === 0) nuevosMensajes = [];

      if (!Array.isArray(nuevosMensajes)) nuevosMensajes = [];

      if (nuevosMensajes.length < 20) setHasMore(false);

      const mapped = nuevosMensajes.map(m => {
        const id = m.id_mensaje || m.idMensaje || m.id || null;
        const contenido = m.contenido || m.mensaje || m.message || '';
        const fecha = m.fecha_envio || m.time || null;
        const idEmisor = m.id_emisor || m.idRemitente || m.fromId || m.id_usuario || null;

        const incomingIsMy = (typeof m.ismy !== 'undefined' && m.ismy !== null)
          ? (m.ismy === true || m.ismy === 1 || m.ismy === '1' || m.ismy === 'true')
          : (idEmisor && currentUserId ? Number(idEmisor) === Number(currentUserId) : false);

        const remitenteName = m.nombre_emisor || (m.remitente && (m.remitente.name || `${m.remitente.nombres || ''} ${m.remitente.apellidos || ''}`.trim())) || (m.remitente_nombres ? `${m.remitente_nombres} ${m.remitente_apellidos || ''}`.trim() : (incomingIsMy ? currentUserName : 'Usuario'));
        const avatar = m.remitente?.avatar || m.avatar || (m.remitente && (m.remitente.avatar || m.remitente_avatar)) || m.respuesta_avatar || null;
        const resolvedChatId = m.id_chat || m.chatId || chatIdParam || null;

        const mappedMsg = {
          id: id,
          id_mensaje: id,
          mensaje: contenido,
          contenido: contenido,
          fecha_envio: fecha,
          time: fecha ? new Date(fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          ismy: !!incomingIsMy,
          id_emisor: idEmisor,
          remitente: { name: remitenteName, avatar },
          id_chat: resolvedChatId,
          chatId: resolvedChatId
        };

        // Reply metadata
        if (m.reply) mappedMsg.reply = m.reply;
        else if (m.respuesta || m.respuesta_contenido || m.respuesta_nombres) {
          mappedMsg.reply = {
            id: m.id_respuesta || m.idRespuesta || null,
            mensaje: m.respuesta_contenido || m.respuesta || null,
            remitente: { name: m.respuesta_nombres ? `${m.respuesta_nombres} ${m.respuesta_apellidos || ''}`.trim() : null, avatar: m.respuesta_avatar || null }
          };
        } else {
          const parsed = parsePersistedMessage(contenido);
          if (parsed?.replyMeta) {
            mappedMsg.reply = { id: parsed.replyMeta.id || null, mensaje: parsed.replyMeta.msg || null, remitente: { name: parsed.replyMeta.from || null } };
            mappedMsg.mensaje = parsed.text;
          }
        }

        return mappedMsg;
      });

      if (isInitial) {
        setMessages(mapped);
        scrollToBottom('auto');
      } else {
        const prevHeight = scrollRef.current ? scrollRef.current.scrollHeight : null;
        setMessages(prev => [...mapped, ...prev]);
        if (prevHeight !== null) {
          setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight;
          }, 0);
        } else {
          // Mensaje proveniente de esta misma sesión: reemplazar preview local si existe
          setMessages((prev) => {
            const text = lastMsg.mensaje || lastMsg.contenido || lastMsg.message || '';
            const fecha = lastMsg.fecha_envio || lastMsg.time || new Date().toISOString();
            const id = lastMsg.id_mensaje || lastMsg.idMensaje || lastMsg.id || null;
            const idEmisor = lastMsg.id_emisor || lastMsg.fromId || lastMsg.from || lastMsg.idRemitente || null;

            const remitenteSrc = lastMsg.remitente || null;
            const remitenteName = remitenteSrc?.name || currentUserName || 'Tú';
            const remitenteAvatar = remitenteSrc?.avatar || datauser?.data?.avatar || currentUser?.avatar || null;

            const mappedMsg = {
              id: id,
              id_mensaje: id,
              mensaje: text,
              contenido: text,
              fecha_envio: fecha,
              time: fecha ? new Date(fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
              ismy: true,
              id_emisor: idEmisor || currentUserId,
              remitente: { name: remitenteName, avatar: remitenteAvatar },
              id_chat: lastChatId,
              chatId: lastChatId
            };

            // Buscar preview local para reemplazar
            let found = -1;
            for (let i = prev.length - 1; i >= 0; i--) {
              const m = prev[i];
              if (m && m.id && String(m.id).startsWith('local_') && (m.mensaje === text || m.contenido === text)) { found = i; break; }
            }

            if (found >= 0) {
              const copy = [...prev];
              copy[found] = mappedMsg;
              return copy;
            }

            return [...prev, mappedMsg];
          });

          scrollToBottom();
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

    const replyId = replyTo?.id || null;
    const replyContent = replyTo?.mensaje || replyTo?.text || null;

    const messageData = {
      toId: user.id,
      fromId: currentUserId || userId || myId || datauser?.userId || datauser?.data?.id_usuario || currentUser?.id, // ID del usuario actual
      mensaje: newMsg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ismy: true,
      replyToId: replyId,
      replyToContent: replyContent,
      chatId: user.chatId
    };

    try {
      // 1. Adjuntar metadata del remitente para consistencia visual
      const myName = currentUserName || 'Tú';
      const myAvatar = datauser?.data?.avatar || currentUser?.avatar || null;
      messageData.remitente = { id: currentUserId, name: myName, avatar: myAvatar };

      // 2. Actualizar UI (previsualización local). Crear estructura `reply` para que el render la lea.
      const preview = {
        id: `local_${Date.now()}`,
        mensaje: newMsg,
        ismy: true,
        time: messageData.time,
        remitente: messageData.remitente
      };
      if (replyId || replyContent) {
        preview.reply = { id: replyId, mensaje: replyContent, remitente: { name: replyTo?.remitente?.name || replyTo?.remitente?.nombres || replyTo?.from || null, avatar: replyTo?.remitente?.avatar || null } };
      }

      setMessages(prev => [...prev, preview]);
      setNewMsg('');
      setReplyTo(null);
      scrollToBottom();

      // 4. Guardar en DB: enviamos texto plano y el id de la respuesta separadamente
      // El servidor se encargará de emitir el evento socket tras persistir.
      await fetch(`http://${window.location.hostname}:5000/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ toId: user.id, mensaje: newMsg, idSolicitud: user.idSolicitud || user.id_solicitud || null, replyToId: replyId, remitente: messageData.remitente })
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
    <div className={`${isFullScreen ? 'fixed inset-0 w-full h-full rounded-none' : 'fixed right-4 bottom-4 w-96 max-h-[600px]'} max-sm:top-0 max-sm:h-dvh max-sm:max-h-dvh bg-white border border-slate-200 rounded-[24px] shadow-2xl z-100 flex flex-col overflow-hidden mobile-fullscreen origin-bottom ${isClosing ? 'animate-chat-out' : 'animate-chat-in'}`}>

      <style>{chatStyles}</style>

      {/* Header - Fixed at top */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            {isGroup ? (
              <div className="mr-3">
                <UserCarrucel users={participants} loading={partsLoading} datauser={datauser} interactive={false} />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm overflow-hidden">
                {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user.initials}
                {!isGroup && <span className={`absolute bottom-0 right-0 w-3 h-3 ${isOnline ? 'bg-green-500' : 'bg-slate-300'} border-2 border-white rounded-full`}></span>}
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-slate-800 text-sm">{isGroup ? (solicitudContext?.solicitud?.resumen || user.name || `Solicitud #${user.idSolicitud || user.id_solicitud || ''}`) : user.name}</span>
              {isGroup ? (
                <span className="text-[10px] text-slate-500 font-medium">Solicitud</span>
              ) : isOnline ? (
                <span className="text-[10px] text-green-600 font-medium">En línea</span>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium">Últ. conexión {lastSeen ? new Date(lastSeen).toLocaleString() : 'desconocida'}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          { (user.idSolicitud || user.id_solicitud || solicitudContext) && (
            <button onClick={() => setShowContext(s => !s)} title="Contexto de la solicitud" className="p-2 hover:bg-slate-100 text-slate-500 rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h18"/><path d="M3 12h18"/><path d="M3 17h18"/></svg>
            </button>
          )}
          <button onClick={() => setIsFullScreen(s => !s)} title={isFullScreen ? 'Restaurar' : 'Pantalla completa'} className="p-2 hover:bg-slate-100 text-slate-500 rounded-full transition-colors">
            {isFullScreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2h-4"/><path d="M3 9V5a2 2 0 0 1 2-2h4"/><path d="M21 9l-6 6"/><path d="M3 15l6-6"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            )}
          </button>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 text-slate-400 rounded-full transition-colors active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      {/* Context panel (opcional) */}
      {showContext && solicitudContext && (
        <div className="p-3 border-b border-slate-100 bg-white/50">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h4 className="text-sm font-bold">Contexto: {solicitudContext.solicitud.resumen}</h4>
              <p className="text-xs text-slate-500">{solicitudContext.solicitud.justificacion}</p>
            </div>
            <div className="text-xs text-slate-400">Solicitud #{solicitudContext.solicitud.id_solicitud}</div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 max-h-36 overflow-y-auto">
            {solicitudContext.detalles?.map(d => (
              <div key={d.id_detalle} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold">{d.nombre_item} <span className="text-[11px] text-slate-400">x{d.cantidad}</span></span>
                  <span className="text-[11px] text-slate-500">Código: {d.codigo_item || '—'}</span>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-bold">Stock: {d.stock_actual ?? '—'}</div>
                  <div className="text-[11px] text-slate-400">Mín: {d.stock_minimo ?? '—'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
        
  messages.map((msg, index) => {
      const parsed = parsePersistedMessage(msg.mensaje || msg.message || msg.contenido || '');

      const senderRaw = msg.fromId || msg.id_emisor || msg.from || msg.id_remitente || msg.remitente?.id || msg.remitente?.id_usuario || null;
      const senderId = senderRaw ? Number(senderRaw) : null;

      // El resto de tu lógica de procesamiento (isMy, senderName, avatarSrc, etc.)
      const isMy = (typeof msg.ismy !== 'undefined' && msg.ismy !== null)
        ? (msg.ismy === true || msg.ismy === 1 || msg.ismy === '1' || msg.ismy === 'true')
        : (senderId && currentUserId ? Number(senderId) === Number(currentUserId) : false);

      const senderName = msg.remitente?.name || msg.nombre_emisor || (isGroup && senderId ? (participants.find(p => Number(p.id) === Number(senderId))?.name) : null) || (isMy ? (currentUserName || 'Tú') : 'Usuario');

      let avatarSrc = msg.remitente?.avatar || msg.remitente_avatar || msg.avatar || msg.avatar_emisor || msg.senderAvatar || null;
      
      if (!avatarSrc && isGroup && senderId && participants && participants.length) {
        const found = participants.find(p => Number(p.id) === Number(senderId) || Number(p.id_usuario) === Number(senderId));
        if (found) avatarSrc = found.avatar || null;
      }
      if (!avatarSrc && isMy) avatarSrc = datauser?.data?.avatar || currentUser?.avatar || null;

      let replySource = null;
      if (msg.reply) replySource = msg.reply;
      else if (msg.respuesta) replySource = msg.respuesta;
      else if (parsed.replyMeta) replySource = { id: parsed.replyMeta.id, mensaje: parsed.replyMeta.msg, remitente: { name: parsed.replyMeta.from } };
      else if (msg.id_respuesta || msg.idRespuesta) {
        const rContent = msg.respuesta_contenido || msg.respuesta || null;
        const rName = msg.respuesta_nombres ? `${msg.respuesta_nombres} ${msg.respuesta_apellidos || ''}`.trim() : null;
        replySource = { id: msg.id_respuesta || msg.idRespuesta, mensaje: rContent, remitente: { name: rName, avatar: msg.respuesta_avatar || null } };
      }

      return (
        <div key={msg.id || msg.id_mensaje || index} className={`flex items-start ${isMy ? 'justify-end' : 'justify-start'}`}>
          {/* Tu código de renderizado (Avatar y Burbuja) se mantiene igual... */}
          <div className={`${isMy ? 'order-2 ml-3' : 'mr-3'}`}>
            <Avatar size="sm">
              {avatarSrc ? <AvatarImage src={avatarSrc} alt={senderName} /> : <AvatarFallback>{(senderName || '').substring(0, 2).toUpperCase()}</AvatarFallback>}
            </Avatar>
          </div>

          <div className={`max-w-[85%] flex flex-col ${isMy ? 'items-end text-right' : 'items-start text-left'}`}>
            <div className={`text-[11px] font-medium mb-1 ${isMy ? 'text-blue-100' : 'text-slate-700'}`}>{senderName}</div>
            <div className={`px-4 py-2.5 shadow-sm text-sm ${isMy ? 'bg-blue-600 text-white rounded-[18px] rounded-br-none' : 'bg-white text-slate-700 border border-slate-200 rounded-[18px] rounded-bl-none'}`}>
              {replySource && (
                <div className={`mb-2 rounded p-2 text-xs ${isMy ? 'bg-white/5' : 'bg-slate-50'} border ${isMy ? 'border-white/10' : 'border-slate-100'}`}>
                  <div className="text-[11px] font-medium text-slate-600 mb-1">{replySource.remitente?.name || '...'}</div>
                  <div className="text-[11px] opacity-80 line-clamp-2">{replySource.mensaje}</div>
                </div>
              )}
              <div>{msg.contenido || msg.mensaje}</div>
              <div className={`text-[9px] mt-1 opacity-60 ${isMy ? 'text-blue-50' : 'text-slate-500'}`}>{msg.time}</div>
              <div className="mt-2 text-[11px] flex gap-2 justify-end">
                <button onClick={() => setReplyTo({ id: msg.id || msg.id_mensaje || index, mensaje: parsed.text || msg.contenido, remitente: { name: isMy ? (currentUserName || 'Tú') : (msg.remitente?.name || ''), avatar: msg.remitente?.avatar || null } })} className="text-slate-400 hover:text-slate-600">Responder</button>
              </div>
            </div>
          </div>
        </div>
      );
    })

        )}
      </div>

      {/* Input - Always at the bottom */}
      <div className="p-4 bg-white border-t border-slate-100 pb-safe">
        {replyTo && (
          <div className="mb-2 p-2 bg-slate-50 border border-slate-100 rounded-md flex items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              {replyTo.remitente?.avatar ? (
                <img src={replyTo.remitente.avatar} alt="" className="w-8 h-8 rounded-md object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-[12px] font-bold text-slate-600">{(replyTo.remitente?.name || '').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() || '—'}</div>
              )}
              <div className="text-[12px]">
                <div className="font-semibold text-[13px]">Respondiendo a {replyTo.remitente?.name || '...'}</div>
                <div className="text-[12px] text-slate-600 line-clamp-2">{replyTo.mensaje}</div>
              </div>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-600">Cancelar</button>
          </div>
        )}

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
