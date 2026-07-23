
import CarInfo from "../Componets/Dasboard/CarInfo";

import TablaSolicitudes from "../Componets/Dasboard/TablaSolicitudes";
import { useAuth } from "../Constext/AuthToken";
import { useSocket } from "../Constext/SocketContext";
import UserCarrucel from "../Componets/componentes dashboard/UserCarrucel";
import { CarMESAJES } from "../Componets/Mensajeria/Mensageria";
import { LayoutDashboard, ChartBar, ClipboardList } from 'lucide-react';

import { Select } from "../Componets/Inputs"


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
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

import { useState, useMemo, useEffect } from "react";
import { solicitudes } from "../../Backend/DataBase/Mysql/SQL";
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

  const [dataGerencias, setDataGerencias] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filtros, setFiltros] = useState({ busqueda: '', estado: '', vista: '', id_usuario: '', id_gerencia: '' });
  const limit = 10;

  // Pestaña por defecto según el rol del usuario
  const defaultVista = useMemo(() => {
    if (!datauser?.data?.rol) return '';
    const rolStr = String(datauser.data.rol).toLowerCase().trim();
    const rolId = Number(datauser.data.id_rol);

    if (rolId === 12 || rolStr === 'personal') return 'mis_solicitudes';
    if (rolId === 10 || rolStr === 'comprador') return 'compras';
    if (rolId === 5 || rolStr === 'superadministrador' || rolId === 11 || rolStr === 'administrador') return 'auditar';
    return '';
  }, [datauser]);

  // Sincronizar la pestaña por defecto cuando se cargue la sesión
  useEffect(() => {
    if (defaultVista) {
      setFiltros(prev => ({ ...prev, vista: defaultVista }));
      setRefreshKey(prev => prev + 1);
    }
  }, [defaultVista]);

  const [statsData, setStatsData] = useState({
    gerencias: [],
    tendencia: [],
    tipos: [],
    prioridades: []
  });
  const [activeStatTab, setActiveStatTab] = useState('gerencia');

  const canSeeGerencias = useMemo(() => {
    if (!datauser?.data) return false;
    const rolId = Number(datauser.data.id_rol);
    const rolStr = String(datauser.data.rol || '').toLowerCase().trim();
    return rolId === 10 || rolStr === 'comprador' || rolId === 11 || rolStr === 'administrador' || rolId === 5 || rolStr === 'superadministrador';
  }, [datauser]);

  useEffect(() => {
    if (!canSeeGerencias && activeStatTab === 'gerencia') {
      setActiveStatTab('tendencia');
    }
  }, [canSeeGerencias, activeStatTab]);

  useEffect(() => {
    setSetGerencia(0);
  }, [statsData.gerencias]);

  const [presupuesto, setPresupuesto] = useState({ asignado: 0, disponible: 0 });

  // ── Gráfica por gerencia ──
  const now = new Date();
  const defaultMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [mesGerencia, setMesGerencia] = useState(defaultMes);
  const [statsGerencia, setStatsGerencia] = useState([]);
  const [setGerencia, setSetGerencia] = useState(0); // página/set actual
  const SET_SIZE = 5; // gerencias por set

  useEffect(() => {
    const fetchStatsGerencia = async () => {
      try {
        const url = `http://${window.location.hostname}:5000/solicitudes/stats/gerencia?mes=${mesGerencia}`;
        const res = await fetch(url, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          setStatsGerencia(json.data || []);
          setSetGerencia(0);
        }
      } catch (e) { console.error(e); }
    };
    fetchStatsGerencia();
  }, [mesGerencia]);

  const statsGerenciaList = statsData.gerencias || [];
  const totalSets = Math.ceil(statsGerenciaList.length / SET_SIZE);
  const currentSetData = statsGerenciaList.slice(setGerencia * SET_SIZE, (setGerencia + 1) * SET_SIZE);
  const maxVal = Math.max(...statsGerenciaList.map(g => Number(g.total_unificado ?? g.total)), 1);

  const totalTendenciaSum = (statsData.tendencia || []).reduce((acc, m) => acc + Number(m.solicitudes || 0), 0);

  // Paleta de colores para las barras
  const BAR_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  // Meses disponibles (12 meses atrás)
  const mesesOpciones = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });
    return { val, label };
  });


  // calculamos los valores de los "cards" con la información recibida del backend
  const stats = useMemo(() => {
    // Preferir el total que provea el backend (total_unificado o total). Si no existe, calcular por fallback.
    const total = Number(counts?.total_unificado ?? counts?.total ?? ((counts.en_compras || 0) + (counts.aprobados || 0)));
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
        if (filtros.vista) url.searchParams.append('vista', filtros.vista);
        if (filtros.id_usuario) url.searchParams.append('id_usuario', filtros.id_usuario);
        if (filtros.id_gerencia) url.searchParams.append('id_gerencia', filtros.id_gerencia);

        const [response, gerenciasRes, dashboardStatsRes] = await Promise.all([
          fetch(url, { method: 'GET', credentials: 'include' }),
          fetch(`http://${window.location.hostname}:5000/gerencias`, { method: 'GET', credentials: 'include' }),
          fetch(`http://${window.location.hostname}:5000/solicitudes/stats/dashboard`, { method: 'GET', credentials: 'include' })
        ]);

        if (gerenciasRes.ok) {
          const gerData = await gerenciasRes.json();

          const totalAsignado = gerData.gerencias.reduce((acc, g) => acc + Number(g.presupuesto_asignado || 0), 0);
          const totalDisponible = gerData.gerencias.reduce((acc, g) => acc + Number(g.saldo_disponible || 0), 0);
          setDataGerencias(gerData.gerencias);
          setPresupuesto({ asignado: totalAsignado, disponible: totalDisponible });
        }

        if (dashboardStatsRes.ok) {
          const statData = await dashboardStatsRes.json();

          const rawTipos = statData.tipos || [];
          const requiredTipos = ['Compra', 'Servicio', 'Obra'];
          const tiposMap = new Map(rawTipos.map(t => [String(t.name || '').trim().toLowerCase(), Number(t.value || 0)]));
          const fullTipos = requiredTipos.map(name => ({
            name,
            value: tiposMap.get(name.toLowerCase()) || 0
          }));

          const rawPrioridades = statData.prioridades || [];
          const requiredPrioridades = ['Alta', 'Media', 'Baja'];
          const prioMap = new Map(rawPrioridades.map(p => [String(p.name || '').trim().toLowerCase(), Number(p.value || 0)]));
          const fullPrioridades = requiredPrioridades.map(name => ({
            name,
            value: prioMap.get(name.toLowerCase()) || 0
          }));

          setStatsData({
            gerencias: statData.gerencias || [],
            tendencia: statData.tendencia || [],
            tipos: fullTipos,
            prioridades: fullPrioridades
          });
        }

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
              datauser={datauser}
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
          <div className="col-start-4 relative col-end-6 row-start-1 row-end-10 flex flex-col max-sm:h-max w-full  bg-slate-50/40 backdrop-blur-sm gap-4 rounded-4xl shadow-2xl p-5 border border-white/50 ">

            {/* Header Principal con Glass Effect */}
            <div className="flex items-center gap-3 ml-2 mb-6 shrink-0 absolute top-6 left-4 z-20">
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-inner">
                <ChartBar className="w-5 h-5 text-emerald-600 animate-pulse" />
              </div>
              <h2 className="font-black text-slate-800 tracking-tight text-lg">
                Distribución <span className="text-emerald-600">de Estados</span>
              </h2>
            </div>

            {/* Contenedor de Info de Carros */}
            <div className="mt-14 transition-all duration-500 transform hover:scale-[1.02]">
              <CarInfo data={{ counts, total: counts.total || data.length }} />
            </div>

            {/* Card de Estadísticas por Gerencia */}
            <div className="relative flex-1 min-h-0 flex flex-col w-full bg-white/90 backdrop-blur-md rounded-4xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:border-blue-200/50">

              {/* Header Interno Estilizado */}
              <div className="flex items-start justify-between mb-4 gap-2 shrink-0">
                <div className="relative">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Análisis Global</p>
                  <p className="text-xl font-black text-slate-800 leading-none">
                    {activeStatTab === 'gerencia' ? 'Por Gerencia' :
                      activeStatTab === 'tendencia' ? 'Tendencia Mensual' :
                        activeStatTab === 'tipo' ? 'Por Tipo' : 'Por Prioridad'}
                  </p>
                  <div className="absolute -bottom-2 left-0 w-8 h-1 bg-blue-500 rounded-full"></div>
                </div>
              </div>

              {/* Selector de Pestañas de Estadísticas */}
              <div className="flex bg-slate-100/80 p-1 rounded-xl gap-1 mb-4 shrink-0">
                {[
                  { id: 'gerencia', label: 'Gerencias' },
                  { id: 'tendencia', label: 'Tendencia' },
                  { id: 'tipo', label: 'Tipos' },
                  { id: 'prioridad', label: 'Prioridades' }
                ]
                  .filter(tab => tab.id !== 'gerencia' || canSeeGerencias)
                  .map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveStatTab(tab.id)}
                      className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${activeStatTab === tab.id
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
              </div>

              {activeStatTab === 'gerencia' && (
                <>
                  {/* Lista de Barras */}
                  <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto py-1 pr-0.5 custom-scrollbar">
                    {currentSetData.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-300 italic gap-2 py-10">
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center">!</div>
                        <span className="text-xs font-medium">No hay registros</span>
                      </div>
                    ) : (
                      currentSetData.map((g, i) => { // Aquí quitamos la llave '{'
                        const gTotal = Number((g.total_unificado ?? g.total) || 0);
                        const pct = maxVal > 0 ? Math.round((gTotal / maxVal) * 100) : 0;
                        return (
                          <div key={g.id_gerencia} className="group flex flex-col gap-2 transition-all duration-300">
                            <div className="flex justify-between items-end">
                              <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors truncate max-w-[80%] flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-blue-500"></span>
                                {g.nombre_gerencia}
                              </span>
                              <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md group-hover:bg-blue-600 group-hover:text-white transition-all">
                                {gTotal}
                              </span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full p-0.5 shadow-inner">
                              <div
                                className="h-full rounded-full transition-all duration-1000 ease-out relative shadow-lg"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                                  boxShadow: `0 0 10px ${BAR_COLORS[i % BAR_COLORS.length]}40`
                                }}
                              >
                                <div className="absolute top-0 right-0 h-full w-2 bg-white/20 rounded-full"></div>
                              </div>
                            </div>
                          </div>
                        );
                      }) // Aquí quitamos la llave '}'
                    )}
                  </div>

                  {/* Navegación Estilo "Pill" */}
                  {totalSets > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100/60 shrink-0">
                      <button
                        onClick={() => setSetGerencia(s => Math.max(0, s - 1))}
                        disabled={setGerencia === 0}
                        className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:shadow-lg disabled:opacity-20 disabled:hover:shadow-none transition-all cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                      </button>

                      <div className="flex overflow-x-auto gap-1.5 bg-slate-50 px-3 py-2 rounded-full border border-slate-100">
                        {Array.from({ length: totalSets }).map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSetGerencia(idx)}
                            className={`rounded-full transition-all duration-500 cursor-pointer ${setGerencia === idx ? 'bg-blue-600 w-6 h-2 shadow-lg shadow-blue-200' : 'bg-slate-300 w-2 h-2 hover:bg-slate-400'}`}
                          />
                        ))}
                      </div>

                      <button
                        onClick={() => setSetGerencia(s => Math.min(totalSets - 1, s + 1))}
                        disabled={setGerencia === totalSets - 1}
                        className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:shadow-lg disabled:opacity-20 transition-all cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  )}

                  {/* Footer Meta-Data */}
                  <div className="mt-4 flex items-center justify-center gap-2 shrink-0">
                    <span className="h-px flex-1 bg-linear-to-r from-transparent to-slate-100"></span>
                    <p className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-tighter">
                      Visualizando {setGerencia * SET_SIZE + 1} – {Math.min((setGerencia + 1) * SET_SIZE, statsGerenciaList.length)}
                    </p>
                    <span className="h-px flex-1 bg-linear-to-l from-transparent to-slate-100"></span>
                  </div>
                </>
              )}

              {activeStatTab === 'tendencia' && (
                <div className="flex-1 min-h-0 w-full py-2">
                  {statsData.tendencia.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-20">Sin datos de tendencia</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-center mb-2">
                        <span className="text-2xl font-black text-slate-800">Total: {totalTendenciaSum}</span>
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statsData.tendencia} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                          <Bar dataKey="solicitudes" name="Solicitudes" fill="#4169E1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  )}
                </div>
              )}

              {activeStatTab === 'tipo' && (
                <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto py-2 pr-0.5 custom-scrollbar">
                  {statsData.tipos.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-20">Sin datos de tipo</p>
                  ) : (
                    statsData.tipos.map((t, idx) => {
                      const totalTypesSum = Math.max(...statsData.tipos.map(item => item.value), 1);
                      const pct = Math.round((t.value / totalTypesSum) * 100);
                      const colors = ['#3b82f6', '#f59e0b', '#10b981'];
                      return (
                        <div key={idx} className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-bold text-slate-700">
                            <span>{t.name}</span>
                            <span className="font-black text-slate-900">{t.value}</span>
                          </div>
                          <div className="h-3 w-full bg-slate-100 rounded-full p-0.5 shadow-inner">
                            <div
                              className="h-full rounded-full transition-all duration-500 shadow-md"
                              style={{ width: `${pct}%`, backgroundColor: colors[idx % colors.length] }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeStatTab === 'prioridad' && (
                <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto py-2 pr-0.5 custom-scrollbar">
                  {statsData.prioridades.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-20">Sin datos de prioridad</p>
                  ) : (
                    statsData.prioridades.map((p, idx) => {
                      const totalPrioSum = Math.max(...statsData.prioridades.map(item => item.value), 1);
                      const pct = Math.round((p.value / totalPrioSum) * 100);
                      const colors = ['#ef4444', '#f59e0b', '#3b82f6'];
                      return (
                        <div key={idx} className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-bold text-slate-700">
                            <span>{p.name}</span>
                            <span className="font-black text-slate-900">{p.value}</span>
                          </div>
                          <div className="h-3 w-full bg-slate-100 rounded-full p-0.5 shadow-inner">
                            <div
                              className="h-full rounded-full transition-all duration-500 shadow-md"
                              style={{ width: `${pct}%`, backgroundColor: colors[idx % colors.length] }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
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