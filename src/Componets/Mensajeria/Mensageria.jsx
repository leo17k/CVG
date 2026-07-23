
import React, { useEffect, useState } from "react";
import { MessageSquare, Bell, X, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../Avatar";
import { saneaFecha } from "../../utils";
import UserCarrucel from "../componentes dashboard/UserCarrucel";
import { useAuth } from "../../Constext/AuthToken";
import ChatPopup from "./Chat";
import { SocketProvider } from "../../Constext/SocketContext";
import ConfirmationModal from '../Confirmacion';
import { toast } from '../GoeyToaster';



const Close = ({ onClose }) => {
  return (
    <>
      <button onClick={onClose}>
        <svg className="absolute top-3 right-3 hover:scale-110 ease-out duration-300 stroke-blue-600" xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M10 10l4 4m0 -4l-4 4" /><path d="M12 3c7.2 0 9 1.8 9 9c0 7.2 -1.8 9 -9 9c-7.2 0 -9 -1.8 -9 -9c0 -7.2 1.8 -9 9 -9" /></svg>
      </button>
    </>

  )
}





export const Mensageria = ({ onClose, onSelectUser, notifications = [], onDeleteNotification }) => {
  const { datauser,userId } = useAuth();
  const [show, setShow] = useState(false);
  const [activeTab, setActiveTab] = useState("messages");
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);


  useEffect(() => {

    const fetchChats = async () => {

      try {
        setLoading(true);

        const base = `http://${window.location.hostname}:5000`;
        const resp = await fetch(`${base}/chats`, { credentials: 'include' });
        const result = await resp.json().catch(() => ({}));

          if (resp.ok && result.mensaje) {
          const normalized = result.mensaje.map(m => ({
            ...m,
            isGroup: !!m.isGroup || !!m.idSolicitud || !!m.id_solicitud || !!m.idSolicitud,
            time: saneaFecha(m.time || m.fecha_ultimo_mensaje || m.fecha_envio || new Date().toISOString()),
            unread: !!m.unread || (m.view === 0 && m.id_emisor !== (datauser?.data?.id_usuario || datauser?.userId))
          }));

          setChats(normalized);
        } else {
          setChats([]);
        }

      } catch (err) {
        console.error('Error fetching chats:', err);
      } finally {
        setLoading(false);
      }

    };

    fetchChats();

    const timer = requestAnimationFrame(() => setShow(true));

    return () => cancelAnimationFrame(timer);

  }, []);



  const handleClose = () => {

    setShow(false);

    setTimeout(() => onClose(), 300);

  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    if (!onDeleteNotification) {
      setPendingDelete(null);
      return;
    }
    try {
      const ok = await onDeleteNotification(pendingDelete.id_notificacion);
      if (ok) toast.success('Notificación eliminada');
      else toast.error('No se pudo eliminar la notificación');
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar la notificación');
    } finally {
      setPendingDelete(null);
    }
  };



  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      {/* Estilos de animación optimizados */}
      <style>{`
        .drawer-overlay {
          transition: opacity 0.4s ease-out;
          background: rgba(15, 23, 42, 0.15);
          backdrop-filter: blur(2px);
        }
        .drawer-content {
          transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
          will-change: transform;
        }
        .drawer-hidden { transform: translateX(100%); }
        .drawer-visible { transform: translateX(0); }
      `}</style>

      {/* Overlay con fade-in suave */}
      <div
        className={`drawer-overlay absolute inset-0 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Panel lateral con transform (GPU Accelerated) */}
      <div
        className={`drawer-content relative bg-white flex flex-col h-full shadow-2xl border-l border-slate-100
          w-full sm:w-[420px] ${show ? "drawer-visible" : "drawer-hidden"}`}
      >
        {/* Header con Tabs */}
        <div className="p-6 border-b border-slate-100 shrink-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Centro de Actividad</h2>
            <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex bg-slate-100/50 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("messages")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${activeTab === "messages" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <MessageSquare className="w-4 h-4" />
              Mensajes
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${activeTab === "notifications" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <Bell className="w-4 h-4" />
              Alertas
            </button>
          </div>
        </div>

        {/* Contenido Scrolleable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {activeTab === "messages" ? (
            <div className="space-y-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sincronizando...</span>
                </div>
              ) : chats.length > 0 ? (
                chats.map((chat, i) => (
                  <MessageItem key={i} chat={chat} authUser={datauser} onSelect={onSelectUser} />
                ))
              ) : (
                <EmptyState icon={<MessageSquare />} text="No hay conversaciones" />
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.length > 0 ? (
                notifications.map((notif, idx) => {
                  const timeStr = saneaFecha(notif.fecha);

                  return (
                    <NotificationItem
                      key={notif.id_notificacion || idx}
                      notif={notif}
                      time={timeStr}
                      onDelete={onDeleteNotification}
                      onRequestDelete={(n) => setPendingDelete(n)}
                    />
                  );
                })
              ) : (
                <EmptyState icon={<Bell />} text="No tienes alertas nuevas" />
              )}
              {notifications.length > 0 && (
                <p className="text-center text-[10px] font-bold text-slate-400 py-10 uppercase tracking-widest">Fin de las notificaciones recientes</p>
              )}
            </div>
          )}
        </div>
        {/* Confirmation modal for deleting notifications */}
      
      </div>
        <ConfirmationModal
          isOpen={!!pendingDelete}
          title="Eliminar notificación?"
          message={pendingDelete?.contenido || '¿Eliminar esta notificación?'}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
          type="danger"
        />
    </div>
  );
};

// Sub-componente para Items de Mensaje
const MessageItem = ({ chat, authUser, onSelect }) => {
  const myId = authUser?.userId || authUser?.id || authUser?.data?.id_usuario || null;
  const isGroup = !!chat.isGroup || !!chat.idSolicitud || !!chat.id_solicitud;

  const contact = isGroup
    ? { id: chat.chatId, name: chat.name || chat.referencia_solicitud || `Solicitud #${chat.id_solicitud || chat.idSolicitud}`, avatar: chat.avatar, isGroup: true, idSolicitud: chat.idSolicitud || chat.id_solicitud }
    : (Number(myId) === Number(chat.to?.id) ? chat.from : chat.to);

  const isMe = !isGroup && Number(myId) === Number(chat.from?.id);

  const [participants, setParticipants] = useState([]);
  const [partsLoading, setPartsLoading] = useState(false);

  const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    let mounted = true;
    const idSol = chat.idSolicitud || chat.id_solicitud;
    if (!isGroup || !idSol) return;
    setPartsLoading(true);
    const base = `http://${window.location.hostname}:5000`;
    fetch(`${base}/solicitudes/${idSol}/participants`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (!mounted) return;
        if (j && j.participants) {
          const users = j.participants.map(u => ({
            id: u.id_usuario,
            avatar: u.avatar || null,
            name: u.nombres || u.name || `${u.nombres || ''} ${u.apellidos || ''}`.trim(),
            initials: getInitials(u.nombres || (u.name || `${u.nombres || ''} ${u.apellidos || ''}`))
          }));
          setParticipants(users);
        } else {
          setParticipants([]);
        }
      })
      .catch(err => {
        console.error('Error fetching participants:', err);
        if (mounted) setParticipants([]);
      })
      .finally(() => mounted && setPartsLoading(false));

    return () => { mounted = false; };
  }, [chat.idSolicitud, chat.id_solicitud]);

  return (
    <div
      onClick={() => onSelect(contact, chat.chatId)}
      className={`group flex items-center gap-4 p-3 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-blue-100 hover:bg-blue-50/30 ${chat.unread ? 'bg-blue-50/60 shadow-sm' : ''}`}
    >
      <div className="relative shrink-0 w-fit ">
        {isGroup ? (
          <div className="w-15 h-fit flex justify-center items-center w-20 ">
            <UserCarrucel users={participants} loading={partsLoading} datauser={authUser} interactive={false} />
          </div>
        ) : (
          <div className="flex justify-center items-center  w-21">
            <Avatar className=" border-2 border-white shadow-sm">
              <AvatarImage src={contact.avatar} className="object-cover" />
              <AvatarFallback className="bg-slate-200 text-slate-600 font-bold">{(contact.name || '').substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
        )}
       
      </div>
      <div className="flex-1 relative min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <h4 className={`text-sm truncate ${chat.unread ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>{contact.name}</h4>
          <span className="text-[10px] font-bold text-slate-400">{chat.time}</span>
        </div>
        <p className="text-xs text-slate-500 truncate">
          {isMe && <span className="text-blue-500 font-bold">Tú: </span>}
          {chat.mensaje}
        </p>
       {chat.unread && <span className="absolute -bottom-1 -right-1 h-4 w-4 bg-blue-600 rounded-full border-2 border-white" />}
      </div>
    </div>
  );
};

// Sub-componente para Items de Notificación
const NotificationItem = ({ notif, onDelete, onRequestDelete, time }) => {
  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    warning: <AlertCircle className="w-4 h-4 text-amber-500" />,
    info: <Clock className="w-4 h-4 text-blue-500" />
  };

  const parsedType = notif.status === 'ok' ? 'success' : notif.status === 'error' ? 'warning' : 'info';
  const title = notif.resumen ? `${notif.resumen}` : 'Notificación de Compra';

  const handleDelete = async () => {
    if (onRequestDelete) {
      return onRequestDelete(notif);
    }
    if (!onDelete) return;
    if (!notif?.id_notificacion) return;
    const ok = window.confirm('¿Eliminar esta notificación?');
    if (!ok) return;
    await onDelete(notif.id_notificacion);
  };

  return (
    <div className="flex gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 transition-all group">
      <div className={`mt-1 p-2 rounded-xl h-fit ${parsedType === 'success' ? 'bg-emerald-100/50' : 'bg-amber-100/50'}`}>
        {icons[parsedType]}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{title}</h4>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-slate-400">{time}</span>
            <button onClick={handleDelete} title="Eliminar" className="text-slate-400 hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">{notif.contenido}</p>
      </div>
    </div>
  );
};

// Confirmación global para eliminar notificación
// (Se renderiza dentro del componente principal mediante estado `pendingDelete`)


const EmptyState = ({ icon, text }) => (
  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
    {React.cloneElement(icon, { className: "w-12 h-12 mb-4 opacity-20" })}
    <p className="text-[10px] font-black uppercase tracking-[0.2em]">{text}</p>
  </div>
);

export const CarMESAJES = ({ users, onSelectUser }) => {
  const { user: authUser } = useAuth();

  return (
    <div className="overflow-hidden overflow-y-auto custom-scrollbar shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1)] rounded-xl h-full w-full flex flex-col">
      <div className="flex flex-col gap-2 w-full p-2 py-2">
        {users.map((item, index) => {
          const contact = authUser?.userId === item.to.id ? item.from : item.to;
          const isUnread = item.unread;

          return (
            <div
              key={item.idMensaje || index}
              className={`flex items-start gap-4 p-3 py-2 rounded-lg transition-colors duration-200 cursor-pointer ${isUnread ? 'bg-blue-50/50' : 'hover:bg-blue-50'}`}
              // ESTO PERMITE QUE ABRA EL CHATPOPUP
              onClick={() => onSelectUser(contact, item.chatId)}
            >
              <Avatar size="default" className="shrink-0 mt-0.5 border w-fit border-gray-100 shadow-sm relative">
                <AvatarImage src={`${item.avatar}`} alt={item.name} />
                <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                  {item.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>

              </Avatar>

              <div className="flex flex-col  max-h-10">
                <div className="flex justify-between items-baseline gap-2">
                  <span className={`text-[14px] truncate ${isUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                    {item.name}
                  </span>
                  <div className="flex items-center flex-col h-[10px] overflow-visible gap-1">
                    <span className={`text-[10px] relative uppercase whitespace-nowrap flex flex-col items-center ${isUnread ? 'font-bold text-blue-600' : 'font-medium text-gray-400'}`}>
                      {item.time}
                      {isUnread && (
                        <span className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-red-500 ring-2 ring-white shadow-sm animate-pulse"></span>
                      )}
                    </span>

                  </div>
                </div>
                <p className={`text-[12px] line-clamp-1 leading-relaxed ${isUnread ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                  {authUser?.userId === item.from.id ? "Tú: " : ""}{item.mensaje}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};