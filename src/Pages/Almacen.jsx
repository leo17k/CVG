import Tabla from "../Componets/Almacen/Tabla";
import { useAuth } from "../Constext/AuthToken";
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { gooeyToast } from "goey-toast";
import {
    Package,
    Plus,
    Filter,
    AlertCircle,
    Activity,
    FileText,
    User,
    CheckCircle2
} from 'lucide-react';

const SOCKET_URL = `http://${window.location.hostname}:5000`;
const LIMIT = 30;

const AlmacenDasboard = () => {
    const { datauser } = useAuth();
    const [activeTab, setActiveTab] = useState('solicitudes');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const socketRef = useRef(null);

    // Estado para las estadísticas globales (Dashboard)
    const [stats, setStats] = useState({
        total_categorias: 0,
        total_productos: 0,
        total_criticos: 0,
        total_solicitudes: 0
    });

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Filtros
    const [filtros, setFiltros] = useState({ search: '', categoria: '', stockStatus: '' });

    // 1. Cargar Estadísticas Globales (La consulta doble que mencionaste)
    const fetchStats = async () => {
        try {
            const resp = await fetch(`${SOCKET_URL}/context`, { credentials: 'include' });
            if (resp.ok) {
                const result = await resp.json();
                console.log(result)
                setStats(result.almacen[0]); // Guardamos: total_criticos, total_productos, total_categorias, total_solicitudes
            }
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
        }
    };

    // 2. Cargar Datos de la Tabla
    const fetchData = async (tab, page = 1, filters = filtros) => {
        setLoading(true);
        try {
            let url;
            if (tab === 'productos') {
                const params = new URLSearchParams({ page, limit: LIMIT });
                if (filters.search) params.set('search', filters.search);
                if (filters.categoria) params.set('id_categoria', filters.categoria);
                if (filters.stockStatus) params.set('stock_status', filters.stockStatus);
                url = `${SOCKET_URL}/productos?${params}`;
            } else {
                url = `${SOCKET_URL}/${tab}`;
            }

            const resp = await fetch(url, { credentials: 'include' });
            if (resp.ok) {
                const result = await resp.json();
                setData(result.data || []);
                if (tab === 'productos') {
                    setCurrentPage(result.currentPage || 1);
                    setTotalPages(result.totalPages || 1);
                    setTotalItems(result.total || 0);
                }
            }
        } catch (error) {
            console.error('Error al obtener datos:', error);
        } finally {
            setLoading(false);
        }
    };

    // Efecto Inicial y cambio de pestaña
    useEffect(() => {
        setCurrentPage(1);
        fetchData(activeTab, 1);
        fetchStats(); // Actualizamos los números laterales cada vez que cambiamos de pestaña
    }, [activeTab]);

    const handleFilter = (newFiltros) => {
        setFiltros(newFiltros);
        setCurrentPage(1);
        fetchData(activeTab, 1, newFiltros);
    };

    // WebSockets
    useEffect(() => {
        const socket = io(SOCKET_URL, { withCredentials: true });
        socketRef.current = socket;
        socket.on('connect', () => socket.emit('join_almacen'));
        socket.on('nueva_solicitud_producto', (payload) => {
            gooeyToast.info(`📦 Nueva solicitud: ${payload.nombre_producto}`, { duration: 8000 });
            fetchStats(); // Refrescar contador de solicitudes
            if (activeTab === 'solicitudes-producto') fetchData('solicitudes-producto');
        });
        return () => socket.disconnect();
    }, [activeTab]);

    return (
        <div id="almacen-page" className="z-10 ml-[60px] max-lg:ml-0 h-[calc(100dvh-60px)] bg-gray-50 flex overflow-hidden max-sm:overflow-auto">
            <div className="grid grid-cols-5 gap-4 w-full p-4 max-sm:p-1 max-sm:flex max-sm:flex-col">

                {/* COLUMNA TABLA (LADO IZQUIERDO) */}
                <div className="col-span-4 max-sm:h-[calc(100dvh-60px)] relative overflow-hidden flex flex-col max-sm:overflow-visible">
                    <Tabla
                        data={data}
                        loading={loading}
                        alSeleccionar={setActiveTab}
                        activeTab={activeTab}
                        onCreated={() => { fetchData(activeTab, currentPage); fetchStats(); }}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        filtrosActuales={filtros}
                        onFilter={handleFilter}
                        onPageChange={(newPage) => {
                            setCurrentPage(newPage);
                            fetchData(activeTab, newPage);
                        }}
                    />
                </div>

                {/* PANEL LATERAL (LADO DERECHO) */}
                <div className="col-span-1 flex flex-col max-sm:h-max  gap-4 bg-white/80 backdrop-blur-md rounded-[2.5rem] shadow-2xl p-6 border border-blue-50 overflow-y-auto max-sm:overflow-visible">

                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-black text-[#1a237e] uppercase tracking-tighter leading-none">Almacén<br /><span className="text-blue-400 text-xs">Cabelum</span></h3>
                        <Activity className="text-blue-500" size={24} />
                    </div>

                    {/* Cards Estadísticas */}
                    <div className="space-y-4">
                        {/* Categorías */}
                        <div className="p-5 bg-white border border-blue-100 rounded-3xl shadow-sm relative overflow-hidden group">
                            <Filter className="absolute -right-2 -bottom-2 text-blue-50 group-hover:scale-110 transition-transform" size={60} />
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Categorías</span>
                            <p className="text-3xl font-black text-[#1a237e]">{stats.total_categorias}</p>
                        </div>

                        {/* Solicitudes Pendientes */}
                        <div className="p-5 bg-[#4169E1] rounded-3xl text-white shadow-lg shadow-blue-100 relative overflow-hidden group">
                            <FileText className="absolute -right-2 -bottom-2 opacity-20 group-hover:scale-110 transition-transform" size={60} />
                            <span className="text-[10px] font-black opacity-80 uppercase tracking-widest">Solicitudes</span>
                            <p className="text-3xl font-black">{stats.total_solicitudes}</p>
                        </div>

                        {/* Stock Crítico */}
                        <div className="p-5 bg-white border-2 border-rose-100 rounded-3xl shadow-sm relative overflow-hidden group">
                            <AlertCircle className="absolute -right-2 -bottom-2 text-rose-50 group-hover:scale-110 transition-transform" size={60} />
                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Stock Crítico</span>
                            <p className="text-3xl font-black text-rose-600">{stats.total_criticos}</p>
                        </div>
                    </div>
                    {/* Card Total de Productos */}
                    <div className="p-6 bg-white border border-blue-100 rounded-[2.5rem] shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        {/* Icono de fondo decorativo */}
                        <div className="absolute -right-4 -bottom-4 text-slate-50 group-hover:text-blue-50 transition-colors duration-500">
                            <Package size={120} strokeWidth={1} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-[#4169E1]" />
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                                    Inventario Global
                                </span>
                            </div>

                            <h4 className="text-4xl font-black text-[#1a237e] tracking-tighter">
                                {stats.total_productos}
                            </h4>

                            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-full">
                                <Package size={12} className="text-[#4169E1]" />
                                <span className="text-[9px] font-bold text-[#4169E1] uppercase">
                                    Productos registrados
                                </span>
                            </div>
                        </div>

                        {/* Barra de progreso decorativa inferior */}
                        <div className="absolute bottom-0 left-0 h-1 bg-linear-to-r from-[#4169E1] to-blue-300 w-full opacity-20" />
                    </div>


                    <div className="flex-1"></div>


                </div>
            </div>
        </div>
    );
}

export default AlmacenDasboard;