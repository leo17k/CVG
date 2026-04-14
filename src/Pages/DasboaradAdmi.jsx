import Nav from '../Componets/Nav';
import Bg from '../Componets/bg';
import Sidebar from '../Componets/Componentes Grandes/Siderbar';
import WeeklyEvolution from "../Componets/Dasboard/WeeklyEvolution";
import { Boton } from "../Componets/componentes dashboard/Numsolisitud";
import CarInfo from "../Componets/Dasboard/CarInfo";
import { BotonReporte } from "../Componets/CarruselItems/botonreporte";
import { Avatar, AvatarBadge, AvatarImage, AvatarGroup, AvatarFallback } from "../Componets/Avatar";
import { Mensageria } from "../Componets/Mensajeria/Mensageria";
import TablaSolicitudes from "../Componets/Dasboard/TablaSolicitudes";
import { HacerSolisitud } from "../Componets/componentes dashboard/Numsolisitud";
import { useAuth } from "../Constext/AuthToken";
import { useSocket } from "../Constext/SocketContext";
import UserCarrucel from "../Componets/componentes dashboard/UserCarrucel";
import { CarMESAJES } from "../Componets/Mensajeria/Mensageria";
import { LayoutDashboard, ChartBar, DollarSign, ClipboardList } from 'lucide-react';
import StatusDashboard from "../Componets/componentes dashboard/Graficas";
import AlertItem from "../Componets/Alerts";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import {
  Plus,
  Search,
  Zap,
  CheckCircle,
  Clock,
  XCircle,
  MoreVertical,
  FileText,
  Filter,
  ArrowUpRight,
  Package,
  User,

} from 'lucide-react';
import ChatPopup from "../Componets/Mensajeria/Chat";

import { useState, useMemo, useEffect } from "react";
const Card = ({ children, className = "" }) => (
  <div className={`bg-white w-max rounded-2xl border border-slate-100 shadow-sm ${className}`}>
    {children}
  </div>
);

const Dashboard = () => {
  const { datauser } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatPopupOpen, setChatPopupOpen] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);       // Página actual
  const [totalRecords, setTotalRecords] = useState(0); // Total de filas en la DB
  const [counts, setCounts] = useState({ total: 0, pendientes: 0, aprobados: 0, rechazados: 0 });
  const [dataTime, setDataTime] = useState([

  ]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filtros, setFiltros] = useState({ busqueda: '', estado: '' });
  const limit = 10; // Cantidad de filas por página


  // calculamos los valores de los "cards" con la información recibida del backend
  const stats = useMemo(() => {
    const total = counts.total || totalRecords || data.length;
    const pendientes = (counts.pendientes !== undefined ? counts.pendientes : data.filter(i => i.estado === 'Pendiente').length);
    const rechazados = (counts.rechazados !== undefined ? counts.rechazados : data.filter(i => i.estado === 'Rechazado').length);
    const aprobadas = (counts.aprobados !== undefined ? counts.aprobados : data.filter(i => i.estado === 'Aprobado').length);

    return [
      { label: "Total Solicitudes", value: total, icon: FileText, color: "blue" },
      { label: "Pendientes", value: pendientes, icon: Clock, color: "amber" },
      { label: "Rechazados", value: rechazados, icon: Zap, color: "red" },
      { label: "Aprobadas", value: aprobadas, icon: CheckCircle, color: "emerald" },
    ];
  }, [data, totalRecords, counts]);


  const [users, setUsers] = useState([]);

  const handleOpenChat = (user, clickChatId = null) => {
    setSelectedUser(user);
    setChatPopupOpen(true);

    // Si abrimos desde CarMESAJES (le pasamos chatId), limpiar estado unread
    if (clickChatId || user.chatId) {
      const targetId = clickChatId || user.chatId;
      setMessages(prev => prev.map(m =>
        m.chatId === targetId ? { ...m, unread: false } : m
      ));
    }
  };
  const formatShortDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();

    // Verificamos si es el mismo día, mes y año
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      // Retorna 12:20 (Formato 24h)
      return date.toLocaleTimeString('es-VE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else {
      // Retorna 14/02/26 (Año corto)
      return date.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    }
  };
  const [messages, setMessages] = useState([]);

  const [messagesLoading, setMessagesLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      setMessagesLoading(true);
      const base = `http://${window.location.hostname}:5000`;
      const resp = await fetch(`${base}/chats`, { credentials: 'include' });
      const result = await resp.json();


      if (resp.ok) {
        const rawMsgs = result.mensaje;
        const myId = datauser?.id_usuario || 1;


        setUsers(result.mensaje);
        // Unirse a la sala globalmente para este historial
        rawMsgs.forEach(m => joinChat(m.chatId));
        setMessages(rawMsgs.map(m => ({ ...m, time: formatShortDate(m.time || m.fecha_envio), unread: m.unread || false })));
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const { globalMessages, clearGlobalMessages, joinChat } = useSocket();

  useEffect(() => {
    // fetch all conversations on load (admin sees sent + received)
    fetchMessages();
  }, []);

  // Escuchar mensajes globales en tiempo real
  useEffect(() => {
    if (globalMessages.length > 0) {
      const lastMsg = globalMessages[globalMessages.length - 1];

      setMessages(prev => {
        // Encontrar el chat viejo original
        const chatExistente = prev.find(m => m.chatId === lastMsg.chatId);

        // Remover el chat viejo para moverlo arriba
        const filtrados = prev.filter(m => m.chatId !== lastMsg.chatId);

        // Evaluar si es unread (si el mensaje NO lo enviamos nosotros)
        const isNotByMe = lastMsg.fromId !== datauser.userId;

        if (chatExistente) {
          const chatActualizado = {
            ...chatExistente,
            mensaje: lastMsg.mensaje,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: isNotByMe
          };

          return [chatActualizado, ...filtrados];
        } else {
          // Si no existe, es un chat totalmente nuevo: mandamos a recargar la bandeja entera
          fetchMessages();
          return prev;
        }
      });
    }
  }, [globalMessages]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Construimos la URL con parámetros reales
        const base = `http://${window.location.hostname}:5000`;
        const url = new URL(`${base}/solicitudes`);
        url.searchParams.append('page', page);
        url.searchParams.append('limit', limit);

        if (filtros.busqueda) url.searchParams.append('busqueda', filtros.busqueda);
        if (filtros.estado) url.searchParams.append('estado', filtros.estado);

        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) throw new Error('Error al obtener datos');

        const result = await response.json();

        // Guardamos los datos de las filas
        setData(result.mensaje || []);
        console.log(result);
        console.log('sexo1')

        // Guardamos el total que viene del COUNT(*) para calcular las páginas
        setTotalRecords(result.total || 0);
        // si el backend nos devuelve el objeto de conteos, lo guardamos también
        if (result.counts) {
          setCounts(result.counts);
        }
        if (result.datatime) {
          console.log(result.datatime)
          setDataTime(result.datatime);


        }


      } catch (err) {
        console.error("Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, refreshKey]);

  const pieData = useMemo(() => {
    // si tenemos conteos globales, úsalos para el gráfico
    if (counts && counts.total > 0) {
      return [
        { name: 'Pendiente', value: counts.pendientes },
        { name: 'Aprobado', value: counts.aprobados },
        { name: 'Rechazado', value: counts.rechazados },
      ];
    }

    if (!data || data.length === 0) return [];

    const groups = data.reduce((acc, item) => {
      const status = item.estado || 'Desconocido';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(groups).map(name => ({ name, value: groups[name] }));
  }, [data, counts]);

  // Estado para el item activo (empezamos en null o un objeto vacío seguro)
  const [activeItem, setActiveItem] = useState(null);

  // Efecto para establecer el valor por defecto cuando carguen los datos
  useEffect(() => {
    if (pieData.length > 0) {
      const topEntry = pieData.reduce((prev, current) =>
        (prev.value > current.value) ? prev : current
        , pieData[0]); // Valor inicial seguro
      setActiveItem(topEntry);
    }
  }, [pieData]);

  const onPieEnter = (_, index) => {
    if (pieData[index]) {
      setActiveItem(pieData[index]);
    }
  };

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center max-w-md">
          <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error de conexión</h2>
          <p className="text-gray-500 mb-6">{error}. Asegúrate de que el servidor en el puerto 5000 esté corriendo y tengas la sesión iniciada.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
            <Nav />
            <Bg />
            <Sidebar />

                  
      <div className="z-10 ml-[60px] max-lg:ml-0 md:h-[calc(100dvh-60px)] h-auto bg-gray-50 flex overflow-hidden">

        <div className="grid max-lg:flex max-lg:flex-col   max-lg:pb-40 overflow-hidden h-screen max-lg:overflow-y-auto  z-10 grid-cols-5 grid-rows-10 gap-2  w-full p-2 iten  ">

          <div className="col-start-1  col-end-4 row-start-1 row-end-10 relative max-lg:calc(90vh-140px)] ">
            {loading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-20 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-blue-600 font-medium text-sm">Buscando...</span>
                </div>
              </div>
            )}
            <TablaSolicitudes
              data={data}
              currentPage={page}
              loading={loading}
              totalPages={Math.ceil(totalRecords / limit)}
              isAdmin={datauser?.data?.rol}
              onPageChange={(newPage) => setPage(newPage)}
              onRefresh={() => setRefreshKey(prev => prev + 1)}
              onMessageSent={fetchMessages}
              filtrosValue={filtros}
              onFilter={(nuevosFiltros) => {
                setFiltros(nuevosFiltros);
                setPage(1);
                setRefreshKey(prev => prev + 1);
              }}
            />

          </div>

          <div className="col-start-4 relative col-end-6 row-start-1 row-end-10 flex flex-col w-full overflow-visible  bg-white/50 gap-4 rounded-2xl shadow-lg p-4">

            <div className="flex items-center gap-2 ml-2  mb-4 shrink-0 absolute top-4 left-3">
              <ChartBar className="w-5 h-5 text-emerald-500" />

              <h2 className="font-bold text-slate-800">Distribución de Estados</h2>

            </div>

            <div className="mt-10">
              <CarInfo data={stats} />

            </div>

            <div className="relative  flex-1 flex justify-between">
              <WeeklyEvolution timeData={dataTime} />
            </div>
          </div>



        </div>

        {chatPopupOpen && selectedUser && (
          <ChatPopup
            user={selectedUser}
            datauser={datauser}
            myId={datauser.userId}
            onClose={() => setChatPopupOpen(false)}
          />
        )}

      </div>

    </>
  );
}

export default Dashboard;