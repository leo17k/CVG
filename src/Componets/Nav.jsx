import { useState, useEffect } from 'react';
import Logo from "./logo.jsx"
import ChatPopup from './Mensajeria/Chat.jsx';
import { useAuth } from '../Constext/AuthToken.jsx';
import { Avatar } from './Avatar.jsx';
import { Mensageria } from './Mensajeria/Mensageria.jsx';
import BotonBandeja from './Mensajeria/BotonBandeja.jsx';
import { useSocket } from '../Constext/SocketContext.jsx';




export default function Nav() {


  const { isAuthenticated, logout, getDataUser, datauser } = useAuth();
  const { globalMessages, joinChat, globalNotifications } = useSocket();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBandejaOpen, setIsBandejaOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [newAlert, setNewAlert] = useState(false);
  const [dbNotifications, setDbNotifications] = useState([]);
  const [chats, setChats] = useState([]);
  const handleSelectUser = (user, chatId) => {
    setIsBandejaOpen(false);
    setSelectedChatUser({ ...user, chatId });
  };
  const toggleBandeja = () => {
    setIsBandejaOpen(!isBandejaOpen);
    setIsMenuOpen(false);
    if (!isBandejaOpen) {
      setNewAlert(false);
    }
  }

  useEffect(() => {

    if (isAuthenticated && !datauser) {
      getDataUser();

    }



  }, [isAuthenticated, datauser, getDataUser]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const base = `http://${window.location.hostname}:5000`;
        const respChats = await fetch(`${base}/chats`, { credentials: 'include' });
        const resultChats = await respChats.json();
        if (respChats.ok && resultChats.mensaje) {
          resultChats.mensaje.forEach(m => {
            if (m.chatId) joinChat(m.chatId);
          });
          const hasUnread = resultChats.mensaje.some(m => m.unread);
          if (hasUnread) setNewAlert(true);
        }

        const respNoti = await fetch(`${base}/notificaciones`, { credentials: 'include' });
        const resultNoti = await respNoti.json();
        if (respNoti.ok && resultNoti.notificaciones) {
          setDbNotifications(resultNoti.notificaciones);
          if (resultNoti.newalert) setNewAlert(true);
        }
      } catch (err) {
        console.error('Error fetching data from Nav:', err);
      }
    };
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (globalMessages && globalMessages.length > 0) {
      const lastMsg = globalMessages[globalMessages.length - 1];
      const isMyMsg = lastMsg.fromId === datauser?.userId || lastMsg.fromId === datauser?.id_usuario;
      if (!isMyMsg) {
        setNewAlert(true);
      }
    }
  }, [globalMessages, datauser]);

  useEffect(() => {
    if (globalNotifications && globalNotifications.length > 0) {
      setNewAlert(true);
      setDbNotifications(prev => {
        const lastNotif = globalNotifications[globalNotifications.length - 1];
        if (!prev.find(n => n.id_notificacion === lastNotif.id_notificacion)) {
          return [lastNotif, ...prev];
        }
        return prev;
      });
    }
  }, [globalNotifications]);
  return (
    <>
      <div className="relative z-2 h-13 isolate flex items-center  gap-x-6 overflow-hidden bg-white/50 backdrop-blur-sm px-6 py-2.5  after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:ml-[0px] after:bg-blue-500/30 sm:px-3.5 sm:before:flex-1">
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-[max(-7rem,calc(50%-52rem))] -z-10 -translate-y-1/2 transform-gpu blur-2xl"
        >
        </div>
        <div className="flex flex-wrap w-full justify-between items-center gap-x-4 gap-y-2">
          <div className="flex ml-10 items-center text-gray-900">
            <Logo height={'40px'} width={'auto'} />
          </div>


          {!isAuthenticated ? (


            <a
              href="#"
              className="group flex transition duration-300 items-center hover:scale-105 gap-2 rounded-full bg-white/10 px-3.5 py-1 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-700/20 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span className="transition duration-300 ">Iniciar Sesión</span>
              <span
                aria-hidden="true"
                className="transition duration-300 group-hover:translate-x-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="icon icon-tabler icons-tabler-outline icon-tabler-arrow-narrow-right"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M5 12l14 0" />
                  <path d="M15 16l4 -4" />
                  <path d="M15 8l4 4" />
                </svg>
              </span>
            </a>
          ) : datauser ? (
            <div className="relative flex items-center gap-2">

              <BotonBandeja onClick={() => toggleBandeja()} newAlert={newAlert} isOpen={isBandejaOpen} />

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex relative z-20 justify-center items-center focus:outline-none"
              >


                <img
                  src={`${datauser.data.avatar}`}
                  className="w-8 h-8 rounded-full aspect-square object-cover ring-2 ring-white"
                  alt="Perfil"
                />
                <div className="absolute p-0.5 flex items-center backdrop-blur-sm bg-white/90 rounded-full bottom-0 -right-1">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </button>


            </div>
          ) : (
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
            </div>
          )}
        </div>

      </div>

      {isBandejaOpen && <Mensageria
        onClose={() => setIsBandejaOpen(false)}
        onSelectUser={handleSelectUser}
        notifications={dbNotifications}
      />
      }

      {selectedChatUser && (
        <ChatPopup
          user={selectedChatUser}
          datauser={datauser?.data} // Pasamos la info del usuario logueado
          onClose={() => setSelectedChatUser(null)}
          newAlert={newAlert}
          setNewAlert={setNewAlert}
        />
      )}

      {isMenuOpen && datauser && (

        <div className="absolute mt-1 right-2 z-20 w-72 origin-top-right rounded-xl bg-white/70 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 focus:outline-none z-10 transition-all duration-200 ease-out transform opacity-100 scale-100">
          <div className="p-4 border-b relative border-gray-100">

            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                {datauser.data.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{datauser.data.name}</p>
                <p className="text-xs text-gray-500">{datauser.data.email}</p>
              </div>
            </div>
            <div className="flex p-2 justify-between items-center text-xs text-blue-600/80">
              <span>Rol:</span>
              <span className="font-semibold">{datauser.data.rol}</span>
            </div>
            <div className="bg-blue-50/50 rounded-lg p-2.5">
              <p className="text-xs font-medium text-blue-800 mb-1">Estado de la Sesión</p>
              <div className="flex justify-between items-center text-xs text-blue-600/80">
                <span>Expira:</span>
                <span className="font-semibold">{datauser.data.expires.toLocaleString('es-VE', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
            </div>
          </div>

          <div className="p-1">
            <button
              onClick={() => {
                logout();
                setIsMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </>
  )
}