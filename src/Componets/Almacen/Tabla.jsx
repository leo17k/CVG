import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, Info, ShieldAlert, Pencil, MessageSquare, Building2, HandCoins, Boxes, Hash, Package, User, List, CheckCircle, XCircle, Mail, Calendar, Filter, ChevronLeft, ChevronRight, Eye, Truck, AlertTriangle, CheckCheck, Sparkles } from 'lucide-react';
import { Modal } from '../componentes dashboard/Modal.jsx';
import { TextArea, Select, Input } from '../Inputs';
import { toast } from '../GoeyToaster';
import ConfirmationModal from '../Confirmacion';
import { Avatar, AvatarFallback, AvatarImage } from '../Avatar';
import ModalEstacion from '../ModalEstacion';



const Tabla = ({ data = [], alSeleccionar, loading: apiLoading, currentPage = 1, totalPages = 1, totalItems = 0, onPageChange, isAdmin, onFilter, gerencias = [], roles = [], filtrosActuales = {}, onCreated, GerenciasPresupuesto = [], activeTab: propActiveTab = 'productos' }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [result, setResult] = useState(false)
    const [isProcessingLocal, setIsProcessingLocal] = useState(false);
    const [processSuccessMessage, setProcessSuccessMessage] = useState('');

    const [askAdjustOpen, setAskAdjustOpen] = useState(false);
    const [adjustField, setAdjustField] = useState('resumen');
    const [adjustMessage, setAdjustMessage] = useState('');
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [includeContext, setIncludeContext] = useState(true);

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createData, setCreateData] = useState({});
    const [createErrors, setCreateErrors] = useState({});
    const [editErrors, setEditErrors] = useState({});
    const [contextData, setContextData] = useState({ categorias: [], gerencias: [], productos: [] });
    const activeTab = propActiveTab;
    // Estados para búsqueda asincrónica de productos (carga por demanda)
    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState([]);
    const [productLoading, setProductLoading] = useState(false);

    const manejarCambio = (tabName) => {
        if (alSeleccionar) alSeleccionar(tabName);
    };

    // Carga categorías y gerencias al montar — SIN cargar todos los productos
    useEffect(() => {
        const fetchContext = async () => {
            try {
                const [cats, gers, units] = await Promise.all([
                    fetch(`http://${window.location.hostname}:5000/categorias`, { credentials: 'include' }).then(r => r.json()),
                    fetch(`http://${window.location.hostname}:5000/context`, { credentials: 'include' }).then(r => r.json()),
                    fetch(`http://${window.location.hostname}:5000/unidades`, { credentials: 'include' }).then(r => r.json())
                ]);
                setContextData(prev => ({
                    ...prev,
                    categorias: cats.data || [],
                    gerencias: gers.gerencias || [],
                    unidades: units.data || []
                }));
            } catch (err) {
                console.error('Error al cargar context:', err);
            }
        };
        fetchContext();
    }, [activeTab]);

    // Carga inicial (paginada) de productos al abrir el modal de movimientos
    useEffect(() => {
        if (!createModalOpen || activeTab !== 'movimientos') return;
        let cancelled = false;
        const controller = new AbortController();

        const loadInitial = async () => {
            setProductLoading(true);
            try {
                const params = new URLSearchParams({ page: 1, limit: 30 });
                const res = await fetch(`http://${window.location.hostname}:5000/productos?${params}`, { credentials: 'include', signal: controller.signal });
                if (!res.ok) return;
                const json = await res.json();
                if (!cancelled) setProductResults(json.data || []);
            } catch (err) {
                if (err.name !== 'AbortError') console.error('Error cargando productos (inicial):', err);
            } finally {
                if (!cancelled) setProductLoading(false);
            }
        };

        loadInitial();
        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [createModalOpen, activeTab]);

    // Búsqueda paginada (debounce) según lo que escribe el usuario
    useEffect(() => {
        if (!createModalOpen || activeTab !== 'movimientos') return;
        const controller = new AbortController();
        const handler = setTimeout(async () => {
            setProductLoading(true);
            try {
                const params = new URLSearchParams({ page: 1, limit: 30, ...(productSearch && { search: productSearch }) });
                const res = await fetch(`http://${window.location.hostname}:5000/productos?${params}`, { credentials: 'include', signal: controller.signal });
                if (!res.ok) return;
                const json = await res.json();
                setProductResults(json.data || []);
            } catch (err) {
                if (err.name !== 'AbortError') console.error('Error buscando productos:', err);
            } finally {
                setProductLoading(false);
            }
        }, 300);

        return () => {
            controller.abort();
            clearTimeout(handler);
        };
    }, [productSearch, createModalOpen, activeTab]);

    const handleCreateChange = (e) => {
        const { name, value } = e.target;
        setCreateData(prev => ({ ...prev, [name]: value }));
        if (createErrors[name]) {
            setCreateErrors(prev => {
                const newErr = { ...prev };
                delete newErr[name];
                return newErr;
            });
        }
    };

    const submitCreate = async () => {
        const errors = {};
        if (activeTab === 'productos') {
            if (!createData.codigo_producto?.trim()) {
                errors.codigo_producto = "El código del producto es obligatorio";
            } else if (createData.codigo_producto.trim().length > 20) {
                errors.codigo_producto = "El código no puede superar los 20 caracteres";
            }
            if (!createData.nombre_producto?.trim()) {
                errors.nombre_producto = "El nombre del producto es obligatorio";
            }
            if (!createData.id_categoria) {
                errors.id_categoria = "Debe seleccionar una categoría";
            }
            if (createData.stock_actual === undefined || createData.stock_actual === null || String(createData.stock_actual).trim() === '') {
                errors.stock_actual = "El stock actual es obligatorio";
            } else {
                const stockActualNum = Number(createData.stock_actual);
                if (isNaN(stockActualNum) || stockActualNum < 0) {
                    errors.stock_actual = "Debe ser mayor o igual a 0";
                }
            }
            if (createData.stock_minimo === undefined || createData.stock_minimo === null || String(createData.stock_minimo).trim() === '') {
                errors.stock_minimo = "El stock mínimo es obligatorio";
            } else {
                const stockMinimoNum = Number(createData.stock_minimo);
                if (isNaN(stockMinimoNum) || stockMinimoNum < 0) {
                    errors.stock_minimo = "Debe ser mayor o igual a 0";
                }
            }
        } else if (activeTab === 'categorias') {
            if (!createData.nombre_categoria?.trim()) {
                errors.nombre_categoria = "El nombre de la categoría es obligatorio";
            }
        }

        if (Object.keys(errors).length > 0) {
            setCreateErrors(errors);
            toast.error("Por favor, complete todos los campos obligatorios correctamente.");
            return;
        }

        setCreateErrors({});

        try {
            setIsProcessingLocal(true);
            const apiUrl = `http://${window.location.hostname}:5000/${activeTab}`;
            const resp = await fetch(apiUrl, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createData)
            });

            if (resp.ok) {
                toast.success(`Operación Finalizada — Registro creado con éxito en ${activeTab}`);
                setCreateModalOpen(false);
                setCreateData({});
                setCreateErrors({});
                if (onCreated) onCreated();
            } else {
                const err = await resp.json();
                toast.error(`Operación Fallida — Error: ${err.error || err.message || 'Error desconocido'}`);
            }
        } catch (error) {
            console.error("Error al crear:", error);
            toast.error('Error — Error interno al comunicar con el servidor');
        } finally {
            setIsProcessingLocal(false);
        }
    };

    // ── Estados locales del modal de filtros (productos) ─────────────────
    const [localSearch, setLocalSearch] = useState(filtrosActuales.search || '');
    const [localCategoria, setLocalCategoria] = useState(filtrosActuales.categoria || '');
    const [localStockStatus, setLocalStockStatus] = useState(filtrosActuales.stockStatus || '');
    const [localCategoriaSearch, setLocalCategoriaSearch] = useState('');

    // Sincroniza cuando el padre resetea los filtros (ej: al cambiar de tab)
    useEffect(() => {
        if (filterModalOpen) {
            setLocalSearch(filtrosActuales.search || '');
            setLocalCategoria(filtrosActuales.categoria || '');
            setLocalStockStatus(filtrosActuales.stockStatus || '');
            setLocalCategoriaSearch('');
        }
    }, [filterModalOpen, filtrosActuales.search, filtrosActuales.categoria, filtrosActuales.stockStatus]);

    const hayFiltrosActivos = activeTab === 'categorias'
        ? !!localCategoriaSearch
        : !!(filtrosActuales.search || filtrosActuales.categoria || filtrosActuales.stockStatus);
    const showTopActions = activeTab !== 'solicitudes' && activeTab !== 'creacion';
    const showFilterButton = showTopActions && (activeTab === 'productos' || activeTab === 'categorias');

    // ── Estados de edición de producto ─────────────────────────────────
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [confirmEditOpen, setConfirmEditOpen] = useState(false);

    const startEdit = () => {
        setEditData({
            nombre_producto: selected.nombre_producto || '',
            codigo_producto: selected.codigo_producto || '',
            descripcion: selected.descripcion || '',
            id_categoria: selected.id_categoria || '',
            id_unidad: selected.id_unidad ?? (contextData.unidades[0]?.id_unidad ?? ''),
            stock_minimo: selected.stock_minimo ?? 0,
        });
        setEditErrors({});
        setIsEditing(true);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
        if (editErrors[name]) {
            setEditErrors(prev => {
                const newErr = { ...prev };
                delete newErr[name];
                return newErr;
            });
        }
    };

    const submitEdit = async () => {
        const errors = {};
        if (!editData.nombre_producto?.trim()) {
            errors.nombre_producto = "El nombre del producto es obligatorio";
        }
        if (!editData.id_categoria) {
            errors.id_categoria = "La categoría es obligatoria";
        }
        if (editData.stock_minimo === undefined || editData.stock_minimo === null || String(editData.stock_minimo).trim() === '') {
            errors.stock_minimo = "El stock mínimo es obligatorio";
        } else {
            const stockMinimoNum = Number(editData.stock_minimo);
            if (isNaN(stockMinimoNum) || stockMinimoNum < 0) {
                errors.stock_minimo = "Debe ser mayor o igual a 0";
            }
        }

        if (Object.keys(errors).length > 0) {
            setEditErrors(errors);
            toast.error("Por favor, complete los campos obligatorios correctamente.");
            return;
        }

        setEditErrors({});
        setIsSaving(true);
        try {
            const res = await fetch(
                `http://${window.location.hostname}:5000/productos/${selected.id_producto}`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editData),
                }
            );
            const json = await res.json();
            if (res.ok) {
                toast.success('Producto actualizado — Los cambios se guardaron correctamente.');
                setSelected(json.data);   // actualiza el modal con los datos frescos
                setIsEditing(false);
                setEditErrors({});
                if (onCreated) onCreated(); // refresca la tabla
            } else {
                toast.error(`Error — ${json.error || 'No se pudo actualizar.'}`);
            }
        } catch (err) {
            console.error(err);
            toast.error('Error — Error de conexión con el servidor.');
        } finally {
            setIsSaving(false);
        }
    };

    const [visualLoading, setVisualLoading] = useState(true);

    // Efecto para forzar que el esqueleto dure al menos 200ms
    useEffect(() => {
        if (apiLoading) {
            setVisualLoading(true);
        } else {
            const timer = setTimeout(() => {
                setVisualLoading(false);
            }, 200); // <-- Aquí controlas la duración (200ms)

            return () => clearTimeout(timer);
        }
    }, [apiLoading, currentPage]); // Se dispara al cargar o cambiar de página

    const openModal = (row) => {
        setSelected(row);
        setIsEditing(false);  // siempre abrir en modo lectura
        setEditData({});
        setEditErrors({});
        setModalOpen(true);
    };

    const closeModal = () => {
        setSelected(null);
        setEditErrors({});
        setModalOpen(false);
    };

    const openAdjustModal = () => {
        setAdjustField('resumen');
        setAdjustMessage('');
        setAskAdjustOpen(true);
    };
    const closeAdjustModal = () => {
        setAskAdjustOpen(false);
    };


    // using global `toast` from GoeyToaster


    // ── Estado para solicitudes de almacén ─────────────────────────────────
    const [solicitudesAlmacen, setSolicitudesAlmacen] = useState([]);
    const [solicLoading, setSolicLoading] = useState(false);
    const [confirmVerificar, setConfirmVerificar] = useState(null);
    const [codificarOpen, setCodificarOpen] = useState(false);
    const [codificarData, setCodificarData] = useState({});
    const [codificarSolicitud, setCodificarSolicitud] = useState(null);
    const [isCodifying, setIsCodifying] = useState(false);
    const [confirmCodificarOpen, setConfirmCodificarOpen] = useState(false);

    // ── Modal de Mensaje sobre solicitud ──────────────────────────────
    const [mensajeModalOpen, setMensajeModalOpen] = useState(false);
    const [mensajeSolicitud, setMensajeSolicitud] = useState(null);
    const [mensajeTexto, setMensajeTexto] = useState('');
    const [isSendingMensaje, setIsSendingMensaje] = useState(false);

    const handleEnviarMensaje = async () => {
        if (!mensajeTexto.trim()) { toast.error('Error — El mensaje no puede estar vacío.'); return; }
        setIsSendingMensaje(true);
        try {
            const res = await fetch(
                `http://${window.location.hostname}:5000/solicitudes/${mensajeSolicitud.id_solicitud}/mensaje`,
                { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensaje: mensajeTexto }) }
            );
            const j = await res.json();
            if (res.ok) {
                toast.success('Mensaje enviado — La observación fue registrada correctamente.');
                // También crear/registrar el mensaje en el sistema de chats (/mensajes)
                // No bloqueamos el flujo si falla; sólo intentamos mantener consistencia.
                (async () => {
                    try {
                        const resMsg = await fetch(`http://${window.location.hostname}:5000/mensajes`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ mensaje: mensajeTexto, idSolicitud: mensajeSolicitud.id_solicitud })
                        });
                        if (!resMsg.ok) {
                            const txt = await resMsg.text().catch(() => 'no body');
                            console.warn('Warning: /mensajes responded with non-OK:', resMsg.status, txt);
                        }
                    } catch (err) {
                        console.warn('Error sending message to /mensajes:', err);
                    }
                })();

                setMensajeModalOpen(false);
                setMensajeTexto('');
            } else {
                toast.error(`Error — ${j.error}`);
            }
        } catch { toast.error('Error — Error de conexión.'); }
        finally { setIsSendingMensaje(false); }
    };

    // ── Solicitudes de creación de producto ─────────────────────────────
    const [solicProducto, setSolicProducto] = useState([]);
    const [solicProdLoading, setSolicProdLoading] = useState(false);

    const fetchSolicProducto = useCallback(async () => {
        setSolicProdLoading(true);
        try {
            const res = await fetch(`http://${window.location.hostname}:5000/solicitudes-producto`, { credentials: 'include' });
            const j = await res.json();
            setSolicProducto(j.data?.filter(s => s.estado !== 'Procesada') || []);
        } catch { setSolicProducto([]); }
        finally { setSolicProdLoading(false); }
    }, []);

    useEffect(() => {
        if (activeTab === 'creacion') fetchSolicProducto();
    }, [activeTab, fetchSolicProducto]);

    const fetchSolicitudesAlmacen = useCallback(async () => {
        setSolicLoading(true);
        try {
            const res = await fetch(`http://${window.location.hostname}:5000/solicitudes/almacen`, { credentials: 'include' });
            if (!res.ok) {
                let errMsg = res.statusText;
                try { const ej = await res.json(); errMsg = ej.error || ej.message || errMsg; } catch (e) { }
                if (res.status === 401) {
                    toast.error('No autenticado — Por favor inicia sesión para ver solicitudes.');
                } else {
                    toast.error(`Error — Error al cargar solicitudes: ${errMsg}`);
                }
                setSolicitudesAlmacen([]);
                return;
            }
            const j = await res.json();
            setSolicitudesAlmacen(j.data || []);
        } catch (e) {
            console.error(e);
            toast.error('Error — Error de red al obtener solicitudes.');
            setSolicitudesAlmacen([]);
        } finally {
            setSolicLoading(false);
        }
    }, []);

    // Fetch on mount so badge/count is populated even before clicking la pestaña
    useEffect(() => {
        fetchSolicitudesAlmacen();
    }, [fetchSolicitudesAlmacen]);

    useEffect(() => {
        if (activeTab === 'solicitudes') fetchSolicitudesAlmacen();
    }, [activeTab, fetchSolicitudesAlmacen]);

    const handleVerificar = async (row) => {
        try {
            const res = await fetch(`http://${window.location.hostname}:5000/solicitudes/${row.id_solicitud}/verificar`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ observacion: 'Verificado por Almacén. Producto en stock.' })
            });
            if (res.ok) {
                toast.success(`Visto bueno dado — La solicitud ${row.codigo_solicitud || `#${row.id_solicitud}`} pasó a Compras.`);
                fetchSolicitudesAlmacen();
            } else {
                const j = await res.json();
                toast.error(`Error — ${j.error || 'No se pudo verificar.'}`);
            }
        } catch (e) {
            toast.error('Error — Error de red.');
        }
        setConfirmVerificar(null);
    };

    // ── handleCodificarSubmit: crea el producto desde una solicitud-producto ──
    const handleCodificarSubmit = async () => {
        setIsCodifying(true);
        try {
            const res = await fetch(
                `http://${window.location.hostname}:5000/solicitudes-producto/${codificarSolicitud.id_sol_prod}/codificar`,
                { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(codificarData) }
            );
            const j = await res.json();
            if (res.ok) {
                toast.success('Producto creado — Registrado en inventario y solicitud marcada como procesada.');
                setCodificarOpen(false);
                setCodificarData({});
                fetchSolicProducto(); // refresca la pestaña de creación
            } else {
                toast.error(`Error — ${j.error}`);
            }
        } catch { toast.error('Error — Error de conexión.'); }
        finally { setIsCodifying(false); }
    };


    return (
        <>

            {/* toasts handled globally by GoeyToaster */}

            <div className="g:col-span-7 z-5 h-full flex flex-col relative  bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full animate-in fade-in duration-700">

                <div className="p-4 border-b max-sm:block border-slate-50 overflow-x-auto custom-scrollbar flex items-center gap-3 shrink-0">
                    <div className="flex max-sm:w-full max-sm:mb-8 justify-center items-center gap-2">
                        <Package className="w-5 h-5 text-blue-500" />
                        <h2 className="font-bold text-slate-800 whitespace-nowrap ">Almacen</h2>
                    </div>

                    <div
                        className="flex gap-2"
                        style={{ visibility: showTopActions ? 'visible' : 'hidden', pointerEvents: showTopActions ? 'auto' : 'none' }}
                    >
                        {/* Botón de Filtros — con badge cuando hay filtros activos */}
                        <button
                            onClick={() => setFilterModalOpen(true)}
                            className={`relative ml-4 p-2 max-sm:absolute max-sm:top-2 max-sm:right-2 rounded-2xl shadow-sm transition-all flex items-center gap-2 text-xs font-semibold ${hayFiltrosActivos
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-blue-600'
                                }`}
                            style={{ visibility: showFilterButton ? 'visible' : 'hidden', pointerEvents: showFilterButton ? 'auto' : 'none' }}
                        >
                            <Filter size={16} />
                            <span className="max-xl:hidden">Filtros</span>
                            {hayFiltrosActivos && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white" />
                            )}
                        </button>

                        {/* Botón Nuevo — solo en pestañas de inventario */}
                        <button
                            onClick={() => setCreateModalOpen(true)}
                            className={`p-2 max-sm:absolute max-sm:top-2 max-sm:left-2 px-4 flex justify-center items-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-200 hover:bg-blue-700 transition-all gap-2 text-xs font-semibold`}
                            style={{ visibility: showTopActions ? 'visible' : 'hidden', pointerEvents: showTopActions ? 'auto' : 'none' }}
                        >
                            <Plus size={16} strokeWidth={3} />
                            <span className="max-xl:hidden">Nuevo</span>
                        </button>
                    </div>
                    <div className='flex gap-2 ml-auto justify-end items-end max-sm:w-full max-sm:justify-center  -mb-8 z-2'>
                        <button
                            onClick={() => { manejarCambio('solicitudes'); }}
                            className={`p-2 px-4 rounded-2xl bg-white/50 backdrop-blur-md shadow-[4px_0_4px_0px_rgba(0,0,0,0.1)] rounded-b-none transition-colors flex items-center gap-2 text-xs font-semibold ${activeTab === 'solicitudes' ? 'text-blue-600 bg-slate-100' : 'text-slate-600 hover:bg-slate-100'}`}>
                            <Truck size={16} />
                            <span className="max-sm:hidden">Solicitudes</span>
                            {solicitudesAlmacen.length > 0 && (
                                <span className="bg-blue-600 max-sm:hidden  text-white text-[12px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                                    {solicitudesAlmacen.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => { manejarCambio('creacion'); }}
                            className={`p-2 px-4 rounded-2xl bg-white/50 backdrop-blur-md shadow-[4px_0_4px_0px_rgba(0,0,0,0.1)] rounded-b-none transition-colors flex items-center gap-2 text-xs font-semibold ${activeTab === 'creacion' ? 'text-amber-600 bg-amber-50' : 'text-slate-600 hover:bg-slate-100'}`}>
                            <Sparkles size={16} />
                            <span className="max-sm:hidden">Creación</span>
                            {solicProducto.length > 0 && (
                                <span className="bg-amber-500 max-sm:hidden text-white text-[12px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                                    {solicProducto.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => { manejarCambio('categorias'); }}
                            className={`p-2 px-4 rounded-2xl bg-white/50 backdrop-blur-md shadow-[4px_0_4px_0px_rgba(0,0,0,0.1)] rounded-b-none transition-colors flex items-center gap-2 text-xs font-semibold ${activeTab === 'categorias' ? 'text-blue-600 bg-slate-100' : 'text-slate-600 hover:bg-slate-100'}`}>
                            <ClipboardList size={16} />
                            <span className="max-sm:hidden">Categorías</span>
                        </button>
                        <button
                            onClick={() => { manejarCambio('productos'); }}
                            className={`p-2 px-4 rounded-2xl bg-white/50 backdrop-blur-md shadow-[4px_0_4px_0px_rgba(0,0,0,0.1)] rounded-b-none transition-colors flex items-center gap-2 text-xs font-semibold ${activeTab === 'productos' ? 'text-blue-600 bg-slate-100' : 'text-slate-600 hover:bg-slate-100'}`}>
                            <Package size={16} />
                            <span className="max-sm:hidden">Productoes</span>
                        </button>
                    </div>
                    <div className='flex justify-center max-sm:-translate-y-6 items-center ml-auto gap-2'>
                        {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                            <div key={i} className={`size-2 rounded-full transition-all ${currentPage === i + 1 ? 'bg-blue-600 size-3' : 'bg-gray-300'}`}></div>
                        ))}
                    </div>
                </div>

                {/* ── Vista de Solicitudes para Almacén ────────────────────────── */}
                {activeTab === 'solicitudes' ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50">
                        {solicLoading ? (
                            <div className="grid grid-cols-1 gap-4">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="h-40 bg-white border border-slate-100 rounded-3xl animate-pulse" />
                                ))}
                            </div>
                        ) : solicitudesAlmacen.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4 border border-emerald-100">
                                    <CheckCheck className="w-10 h-10 text-emerald-500" />
                                </div>
                                <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Almacén al día</h3>
                                <p className="text-slate-500 text-sm mt-1 max-w-xs">No hay requerimientos pendientes de verificación en este momento.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {solicitudesAlmacen.map(row => (
                                    <div key={row.id_solicitud}
                                        className="group bg-white border border-slate-200 rounded-3xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">

                                        {/* Header: ID y Estado */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform">
                                                    <HandCoins size={22} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[12px] font-black text-blue-600 uppercase tracking-widest">Solicitud {row.codigo_solicitud || `#${row.id_solicitud}`}</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-300" />

                                                    </div>
                                                    <h4 className="font-extrabold text-slate-800 leading-tight uppercase text-sm truncate max-w-[200px]">
                                                        {row.resumen}
                                                    </h4>
                                                </div>
                                            </div>

                                            <span className="text-[12px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                                <Calendar size={10} /> {new Date(row.fecha_creacion).toLocaleDateString('es-VE')}
                                            </span>
                                        </div>

                                        {/* Gerencia y Solicitante */}
                                        <div className="flex items-center gap-4 py-2 border-y border-slate-50">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center text-blue-500">
                                                    <User size={12} strokeWidth={2} />
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-600">{row.nombre_completo}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-400">
                                                <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center text-blue-500">
                                                    <Building2 size={12} strokeWidth={2} />
                                                </div>
                                                <span className="text-[11px] font-medium tracking-tight">{row.nombre_gerencia}</span>
                                            </div>
                                        </div>

                                        {/* Lista de Ítems Estilizada */}
                                        {row.items && row.items.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Análisis de Disponibilidad</p>
                                                <div className="grid gap-2">
                                                    {row.items.split('||').map((it, idx) => {
                                                        const [nombre, cantidad, stock, stockMin] = it.split('::');
                                                        const suficiente = Number(stock) >= Number(cantidad);

                                                        return (
                                                            <div key={idx} className={`p-3 rounded-2xl border flex items-center justify-between transition-colors ${suficiente ? 'bg-blue-50/30 border-blue-100' : 'bg-rose-50/30 border-rose-100'
                                                                }`}>
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`p-2 rounded-lg ${suficiente ? 'bg-white text-blue-500' : 'bg-white text-rose-500'} shadow-sm`}>
                                                                        <Package size={14} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-bold text-slate-700 leading-none">{nombre || 'Item'}</p>
                                                                        <p className="text-[12px] text-slate-400 mt-1 font-medium">
                                                                            Demanda: <span className="text-slate-600 font-bold">{cantidad}</span> ·
                                                                            Existencia: <span className={suficiente ? 'text-green-600' : 'text-rose-600'}>{stock}</span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {suficiente ? (
                                                                    <div className="text-blue-500"><CheckCircle size={16} /></div>
                                                                ) : (
                                                                    <div className="text-rose-500 animate-pulse"><AlertTriangle size={16} /></div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Botonera de Acciones Finales */}
                                        <div className="flex gap-2 mt-auto pt-2">
                                            <button
                                                onClick={() => setConfirmVerificar(row)}
                                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-100 group/btn"
                                            >
                                                <CheckCircle size={16} className="group-hover/btn:scale-120 transition-transform" />
                                                <span className="text-[11px] font-black uppercase tracking-wider">Aprobar Stock</span>
                                            </button>

                                            <button
                                                onClick={() => { setMensajeSolicitud(row); setMensajeTexto(''); setMensajeModalOpen(true); }}
                                                className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-slate-100 hover:border-blue-200 hover:text-blue-600 text-slate-400 rounded-2xl transition-all active:scale-95 shadow-sm"
                                                title="Enviar mensaje sobre esta solicitud"
                                            >
                                                <MessageSquare size={17} />
                                            </button>
                                        </div>

                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                ) : activeTab === 'creacion' ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-amber-50/30">
                        {solicProdLoading ? (
                            <div className="grid grid-cols-1 gap-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-40 bg-white border border-slate-100 rounded-3xl animate-pulse" />
                                ))}
                            </div>
                        ) : solicProducto.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                                <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-4 border border-amber-100">
                                    <CheckCheck className="w-10 h-10 text-amber-400" />
                                </div>
                                <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Sin pendientes</h3>
                                <p className="text-slate-500 text-sm mt-1 max-w-xs">No hay solicitudes de creación de productos pendientes.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {solicProducto.map(row => (
                                    <div key={row.id_sol_prod}
                                        className="group bg-white border border-amber-100 rounded-3xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-xl hover:shadow-amber-100/50 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">

                                        {/* Header */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-100 group-hover:scale-110 transition-transform">
                                                    <Sparkles size={22} />
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-black text-amber-600 uppercase tracking-widest">Solicitud #{row.id_sol_prod}</span>
                                                    <h4 className="font-extrabold text-slate-800 leading-tight uppercase text-sm truncate max-w-[200px]">
                                                        {row.nombre_producto}
                                                    </h4>
                                                </div>
                                            </div>
                                            <span className="text-[12px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                                <Calendar size={10} /> {new Date(row.fecha_creacion).toLocaleDateString('es-VE')}
                                            </span>
                                        </div>

                                        {/* Info */}
                                        <div className="flex flex-col gap-2 py-2 border-y border-slate-50">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center text-amber-500"><User size={12} /></div>
                                                <span className="text-[11px] font-bold text-slate-600">{row.solicitante}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                <span className="text-[11px] text-slate-400">Cant. solicitada: <b className="text-slate-600">{row.cantidad_requerida}</b></span>
                                            </div>
                                            {row.nombre_categoria && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center text-amber-500"><ClipboardList size={12} /></div>
                                                    <span className="text-[11px] text-slate-500">Categoría: <b className="text-slate-700">{row.nombre_categoria}</b></span>
                                                </div>
                                            )}
                                            {row.descripcion && (
                                                <p className="text-[11px] text-slate-400 italic pl-1 line-clamp-2">{row.descripcion}</p>
                                            )}
                                        </div>

                                        {/* Acción */}
                                            <button
                                            onClick={() => {
                                                setCodificarSolicitud(row);
                                                setCodificarData({
                                                    nombre_producto: row.nombre_producto,
                                                    descripcion: row.descripcion || '',
                                                    id_categoria: row.id_categoria || '',
                                                    codigo_producto: '',
                                                    stock_actual: row.cantidad_requerida || 0,
                                                    stock_minimo: 0,
                                                });
                                                setCodificarOpen(true);
                                            }}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl transition-all active:scale-95 shadow-lg shadow-amber-100 font-black text-[11px] uppercase tracking-wider"
                                        >
                                            <Plus size={16} strokeWidth={3} /> Crear en Inventario
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left text-sm custom-scrollbar border-collapse">

                            <thead className="bg-slate-50/50  z-20 text-slate-500 uppercase text-[12px] font-bold sticky top-0 z-10">
                                <tr className="border-b border-slate-100">
                                    {activeTab === 'categorias' && (
                                        <>
                                            <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80">Codigo</th>
                                            <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80">Nombre Categoría</th>
                                            <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80">Descripción</th>
                                            <th className="px-6 py-4 text-right backdrop-blur-sm bg-slate-50/80">Acciones</th>
                                        </>
                                    )}
                                    {activeTab === 'productos' && (
                                        <>
                                            <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80 whitespace-nowrap">Código</th>
                                            <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80 whitespace-nowrap">Producto</th>
                                            <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80 whitespace-nowrap">Categoría</th>
                                            <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80 whitespace-nowrap">Stock Actual</th>
                                            <th className="px-6 py-4 text-right backdrop-blur-sm bg-slate-50/80">Acciones</th>
                                        </>
                                    )}


                                </tr>
                            </thead>


                            <tbody className="divide-y divide-slate-100 ">
                                {visualLoading ? (
                                    // Skeleton que dura exactamente 200ms tras recibir la data
                                    [...Array(8)].map((_, i) => (
                                        <tr key={i}>
                                            {[...Array(6)].map((_, j) => (
                                                <td key={j} className="px-6 py-4">
                                                    <div className="h-4 bg-slate-100 rounded animate-pulse w-full"></div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : ((activeTab === 'categorias' ? (Array.isArray(data) ? data.filter((row) => {
                                    const q = localCategoriaSearch.trim().toLowerCase();
                                    if (!q) return true;
                                    const hayTexto = `${row.nombre_categoria || ''} ${row.codigo || ''}`.toLowerCase();
                                    return hayTexto.includes(q);
                                }) : []) : data) && (activeTab === 'categorias' ? (Array.isArray(data) ? data.filter((row) => {
                                    const q = localCategoriaSearch.trim().toLowerCase();
                                    if (!q) return true;
                                    const hayTexto = `${row.nombre_categoria || ''} ${row.codigo || ''}`.toLowerCase();
                                    return hayTexto.includes(q);
                                }) : []) : data).length > 0) ? (
                                    (activeTab === 'categorias' ? (Array.isArray(data) ? data.filter((row) => {
                                        const q = localCategoriaSearch.trim().toLowerCase();
                                        if (!q) return true;
                                        const hayTexto = `${row.nombre_categoria || ''} ${row.codigo || ''}`.toLowerCase();
                                        return hayTexto.includes(q);
                                    }) : []) : data).map((row, i) => (
                                        <tr key={row.id_producto || row.id_categoria || i} className="hover:bg-slate-50/50 transition-colors animate-in fade-in duration-300">
                                            {activeTab === 'categorias' && (
                                                <>
                                                    <td className="px-6 py-4 text-slate-500">{row.codigo}</td>
                                                    <td className="px-6 py-4 font-semibold text-slate-700 ">{row.nombre_categoria}</td>
                                                    <td className="px-6 py-4 text-slate-500 truncate">{row.descripcion}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => openModal(row)} className="text-blue-600 cursor-pointer p-1 hover:scale-110 transition-transform"><Eye size={18} /></button>
                                                    </td>
                                                </>
                                            )}
                                            {activeTab === 'productos' && (
                                                <>
                                                    <td className="px-6 py-4 font-bold text-slate-500">{row.codigo_producto}</td>
                                                    <td className="px-6 py-4 font-semibold text-slate-700">{row.nombre_producto}</td>
                                                    <td className="px-6 py-4 text-slate-500  cursor-default">
                                                        <span className='relative group '>


                                                            {row.nombre_categoria || row.id_categoria}
                                                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full 
                   opacity-0 group-hover:opacity-100 group-hover:-bottom-2
                   transition-all duration-200 ease-out pointer-events-none
                   bg-white/50 backdrop-blur-sm  px-2 py-1 rounded-md text-[12px] font-bold uppercase tracking-wider z-10 shadow-sm">
                                                                {row.codigo_categoria || 'Sin codigo de categoria'}
                                                            </span>
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 flex items-center justify-center">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${row.stock_actual <= row.stock_minimo ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                            {row.stock_actual}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => openModal(row)} className="text-blue-600 cursor-pointer p-1 hover:scale-110 transition-transform"><Eye size={18} /></button>
                                                    </td>
                                                </>
                                            )}

                                        </tr>
                                    ))
                                ) : (
                                    <tr >
                                        <td colSpan="6" className="px-6 py-10 text-center text-slate-400">No hay datos disponibles</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )} {/* ← cierra ternario solicitudes ? ... : tabla */}

                {/* Footer de Paginación — solo en pestañas de inventario */}
                {activeTab !== 'solicitudes' && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between shrink-0">
                        <div className="flex flex-col">
                            <p className="text-xs text-slate-500 font-medium">
                                Página <span className="font-bold text-slate-800">{currentPage}</span> de <span className="font-bold text-slate-800">{totalPages}</span>
                            </p>
                            {activeTab === 'productos' && totalItems > 0 && (
                                <p className="text-[10px] text-slate-400">
                                    {totalItems} producto{totalItems !== 1 ? 's' : ''} en total
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onPageChange && onPageChange(currentPage - 1)}
                                disabled={currentPage === 1 || visualLoading}
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 text-slate-600" />
                            </button>
                            <button
                                onClick={() => onPageChange && onPageChange(currentPage + 1)}
                                disabled={currentPage === totalPages || visualLoading}
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4 text-slate-600" />
                            </button>
                        </div>
                    </div>
                )}
            </div >

            {createModalOpen && activeTab !== 'solicitudes' && (
                <Modal isOpen={createModalOpen} onClose={() => { setCreateModalOpen(false); setCreateData({}); setCreateErrors({}); }}
                    contenido={
                        <div className="flex flex-col gap-4">
                            <h2 className="text-lg font-bold text-slate-800 mb-4">{`Nuevo/a en ${activeTab}`}</h2>
                            {activeTab === 'categorias' && (
                                <>
                                    <Input label="Nombre Categoría" name="nombre_categoria" onChange={handleCreateChange} value={createData.nombre_categoria || ''} error={createErrors.nombre_categoria} />
                                    <TextArea label="Descripción" name="descripcion" onChange={handleCreateChange} value={createData.descripcion || ''} error={createErrors.descripcion} />
                                </>
                            )}
                            {activeTab === 'productos' && (
                                <>
                                    <Input label="Código" name="codigo_producto" onChange={handleCreateChange} value={createData.codigo_producto || ''} error={createErrors.codigo_producto} />
                                    <Input label="Nombre Producto" name="nombre_producto" onChange={handleCreateChange} value={createData.nombre_producto || ''} error={createErrors.nombre_producto} />
                                    <Select
                                        label="Categoría"
                                        name="id_categoria"
                                        value={createData.id_categoria || ''}
                                        onChange={handleCreateChange}
                                        options={contextData.categorias.map(c => ({ value: c.id_categoria, label: c.nombre_categoria })) || []}
                                        error={createErrors.id_categoria}
                                    />
                                    <TextArea label="Descripción" name="descripcion" onChange={handleCreateChange} value={createData.descripcion || ''} error={createErrors.descripcion} />

                                    <div className="grid grid-cols-2 gap-2">
                                        <Input label="Stock Actual" type="number" name="stock_actual" onChange={handleCreateChange} value={createData.stock_actual || ''} error={createErrors.stock_actual} />
                                        <Input label="Stock Mínimo" type="number" name="stock_minimo" onChange={handleCreateChange} value={createData.stock_minimo || ''} error={createErrors.stock_minimo} />
                                    </div>

                                </>
                            )}


                            <div className="flex justify-end gap-2 mt-4">
                                <button onClick={() => { setCreateModalOpen(false); setCreateData({}); setCreateErrors({}); }} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                                <button onClick={submitCreate} disabled={isProcessingLocal} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                                    {isProcessingLocal ? 'Procesando...' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    }

                />


            )}

            {/* ── Modal confirmar visto bueno ── */}
            <ConfirmationModal
                isOpen={!!confirmVerificar}
                type="question"
                title="¿Dar visto bueno?"
                message={`La solicitud ${confirmVerificar?.codigo_solicitud || `#${confirmVerificar?.id_solicitud}`} “${confirmVerificar?.resumen}” será enviada a Compras. El producto existe en inventario.`}
                onConfirm={() => handleVerificar(confirmVerificar)}
                onCancel={() => setConfirmVerificar(null)}
            />



            {modalOpen && selected && (

                <Modal isOpen={modalOpen} onClose={closeModal} title={`Detalles de ${activeTab === 'categorias' ? 'Categoría' : activeTab === 'productos' ? 'Producto' : ''}`}
                    className={`h-[80dvh] overflow-auto`}
                    contenido={
                        <>

                            <div className="flex flex-col gap-6 p-2 text-slate-800">
                                {/* Sección de Contenido Dinámico */}
                                <div className="min-h-[350px] transition-all duration-500 ease-in-out">

                                    {/* TAB: CATEGORÍAS */}
                                    {activeTab === 'categorias' && (
                                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-400">
                                            <div className="relative overflow-hidden group p-6 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition-all">
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                    <Boxes size={80} />
                                                </div>
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-[12px] font-black uppercase tracking-widest mb-4">
                                                    <Hash size={12} /> Registro de Sistema
                                                </span>
                                                <h3 className="text-3xl font-black text-slate-900 mb-2">{selected.nombre_categoria}</h3>
                                                <p className="text-slate-500 text-sm leading-relaxed max-w-md">
                                                    {selected.descripcion || 'Sin descripción detallada para esta categoría en la base de datos.'}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                                    <span className="text-[12px] font-bold text-slate-400 uppercase block mb-1">ID Interno</span>
                                                    <span className="font-mono font-bold text-slate-700">CAT-{selected.id_categoria.toString().padStart(3, '0')}</span>
                                                </div>
                                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[12px] font-bold text-slate-400 uppercase block mb-1">Estado</span>
                                                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Activa
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB: PRODUCTOS */}
                                    {activeTab === 'productos' && (
                                        <div className="grid grid-cols-1 overflow-auto md:grid-cols-6 gap-4 animate-in fade-in slide-in-from-right-4 duration-400">

                                            {/* Card Principal de Producto */}
                                            <div className="md:col-span-4 p-8 overflow-auto bg-white border border-blue-100 rounded-[2.5rem] shadow-sm flex flex-col justify-between relative overflow-hidden">
                                                {/* Decoración de fondo sutil */}
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16" />

                                                <div className="relative flex-1">

                                                    <>
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div className="flex flex-col gap-2">
                                                                <span className="inline-flex w-fit px-4 py-1.5 rounded-xl bg-[#4169E1] text-white text-[12px] font-black uppercase tracking-widest shadow-md shadow-blue-200">
                                                                    Ref: {selected.codigo_producto}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest px-1">
                                                                    {selected.nombre_categoria} • {selected.codigo_categoria}
                                                                </span>
                                                            </div>
                                                            <Package className="text-blue-100" size={48} strokeWidth={1.5} />
                                                        </div>

                                                        <h2 className="text-4xl font-black max-w-[500px] text-[#1a237e] tracking-tight leading-none mb-6 uppercase">
                                                            {selected.nombre_producto}
                                                        </h2>

                                                        <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                            <div className="mt-1 text-blue-400"><Info size={16} /></div>
                                                            <p className="text-slate-500 text-sm leading-relaxed italic">
                                                                {selected.descripcion || 'Este producto no cuenta con especificaciones técnicas registradas en el sistema de inventario.'}
                                                            </p>
                                                        </div>

                                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">Unidad</span>
                                                                <span className="text-sm font-bold text-slate-700">
                                                                    {selected.nombre_unidad || selected.abreviatura || 'Sin unidad'}
                                                                    {selected.abreviatura && selected.nombre_unidad && selected.abreviatura !== selected.nombre_unidad ? ` (${selected.abreviatura})` : ''}
                                                                </span>
                                                            </div>
                                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">Categoría</span>
                                                                <span className="text-sm font-bold text-slate-700">{selected.nombre_categoria || 'Sin categoría'}</span>
                                                            </div>
                                                        </div>
                                                    </>

                                                </div>

                                                {/* Footer de la Card */}
                                                <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                                                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">System ID: {selected.id_producto}</span>



                                                </div>
                                            </div>

                                            {/* Card de Stock (Visualizer) */}
                                            <div className="md:col-span-2 space-y-4">
                                                <div className="p-8 bg-white border border-blue-100 rounded-[2.5rem] text-center shadow-sm relative overflow-hidden">
                                                    <span className="text-[11px] font-black text-blue-400 uppercase block mb-6 tracking-[0.2em]">Disponibilidad Real</span>

                                                    <div className="relative inline-flex items-center justify-center mb-6">
                                                        {/* SVG de Progreso */}
                                                        <svg className="w-32 h-32 transform -rotate-90">
                                                            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-blue-50" />
                                                            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="transparent"
                                                                strokeDasharray={351.8}
                                                                strokeDashoffset={351.8 - (351.8 * Math.min(selected.stock_actual, 100)) / 100}
                                                                strokeLinecap="round"
                                                                className={`transition-all duration-1000 ${selected.stock_actual <= selected.stock_minimo
                                                                    ? 'text-rose-500'
                                                                    : 'text-[#4169E1]'
                                                                    }`}
                                                            />
                                                        </svg>
                                                        <div className="absolute flex flex-col items-center justify-center">
                                                            <span className="text-3xl font-black text-[#1a237e]">{selected.stock_actual}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Unid.</span>
                                                        </div>
                                                    </div>

                                                    <div className={`py-2 px-4 rounded-xl inline-block ${selected.stock_actual <= selected.stock_minimo
                                                        ? 'bg-rose-50 text-rose-600'
                                                        : 'bg-emerald-50 text-emerald-600'
                                                        }`}>
                                                        <p className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                                                            {selected.stock_actual <= selected.stock_minimo ? (
                                                                <><AlertTriangle size={14} /> Stock Crítico</>
                                                            ) : (
                                                                <><CheckCircle size={14} /> Stock Óptimo</>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Card de Stock Mínimo con Royal Blue */}
                                                <div className="p-6 bg-[#4169E1] rounded-[2rem] text-white shadow-xl shadow-blue-200 flex items-center justify-between group">
                                                    <div>
                                                        <span className="text-[11px] font-bold opacity-80 uppercase block mb-1 tracking-wider">Mínimo de Alerta</span>
                                                        <p className="text-2xl font-black">{selected.stock_minimo} <span className="text-sm font-medium opacity-60">uds</span></p>
                                                    </div>
                                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                                                        <ShieldAlert size={24} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}


                                </div>

                                {/* Botón de Cierre con Efecto */}
                                <div className="flex justify-center items-center gap-4 mt-8 pb-4">
                                    {/* Botón Cerrar - Estilo Minimalista con Borde */}
                                    <button
                                        onClick={closeModal}
                                        className="group relative px-8 py-3 bg-white text-slate-500 border-2 border-slate-100 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] overflow-hidden hover:bg-slate-50 hover:text-slate-700 transition-all active:scale-95 shadow-sm"
                                    >
                                        <span className="relative z-10">Cerrar Detalle</span>
                                    </button>


                                    {activeTab === 'productos' && (<button
                                        onClick={startEdit}
                                        className="group relative px-10 py-3 bg-[#4169E1] text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] overflow-hidden hover:bg-[#27449a] transition-all active:scale-95 shadow-xl shadow-blue-200 flex items-center gap-3"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                                        <Pencil size={14} className="relative z-10" />
                                        <span className="relative z-10">Editar Producto</span>
                                    </button>
                                    )}

                                </div>
                            </div>
                        </>
                    }
                />


            )}

            {isEditing && (
                <Modal isOpen={isEditing} onClose={() => { setIsEditing(false); setEditErrors({}); }}
                    contenido={<div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-blue-600 text-white rounded-xl"><Pencil size={14} /></div>
                            <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Editar Producto</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <Input
                                    label="Nombre del producto *"
                                    name="nombre_producto"
                                    value={editData.nombre_producto}
                                    onChange={handleEditChange}
                                    error={editErrors.nombre_producto}
                                />
                            </div>
                            <Input
                                label="Código de referencia"
                                name="codigo_producto"
                                value={editData.codigo_producto}
                                onChange={handleEditChange}
                                error={editErrors.codigo_producto}
                            />
                            <Input
                                label="Stock mínimo de alerta"
                                name="stock_minimo"
                                type="number"
                                value={editData.stock_minimo}
                                onChange={handleEditChange}
                                error={editErrors.stock_minimo}
                            />
                            <div className="col-span-2">
                                <Select
                                    label="Categoría *"
                                    name="id_categoria"
                                    value={editData.id_categoria}
                                    onChange={handleEditChange}
                                    options={contextData.categorias.map(c => ({ value: c.id_categoria, label: c.nombre_categoria }))}
                                    error={editErrors.id_categoria}
                                />
                            </div>
                            <div className="col-span-2">
                                <Select
                                    label="Unidad de medida *"
                                    name="id_unidad"
                                    value={editData.id_unidad}
                                    onChange={handleEditChange}
                                    options={contextData.unidades.map(u => ({ value: u.id_unidad, label: `${u.nombre_unidad}${u.abreviatura ? ` (${u.abreviatura})` : ''}` }))}
                                    error={editErrors.id_unidad}
                                />
                            </div>
                            <div className="col-span-2">
                                <TextArea
                                    label="Descripción / Especificaciones técnicas"
                                    name="descripcion"
                                    value={editData.descripcion}
                                    onChange={handleEditChange}
                                    error={editErrors.descripcion}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => { setIsEditing(false); setEditErrors({}); }} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                            <button
                                onClick={() => {
                                    const errs = {};
                                    if (!editData.nombre_producto?.trim()) {
                                        errs.nombre_producto = "El nombre del producto es obligatorio";
                                    }
                                    if (!editData.codigo_producto?.trim()) {
                                        errs.codigo_producto = "El código del producto es obligatorio";
                                    } else if (editData.codigo_producto.trim().length > 20) {
                                        errs.codigo_producto = "El código no puede superar los 20 caracteres";
                                    }
                                    if (!editData.id_categoria) {
                                        errs.id_categoria = "La categoría es obligatoria";
                                    }
                                    if (!editData.id_unidad) {
                                        errs.id_unidad = "La unidad de medida es obligatoria";
                                    }
                                    if (editData.stock_minimo === undefined || editData.stock_minimo === null || String(editData.stock_minimo).trim() === '') {
                                        errs.stock_minimo = "El stock mínimo es obligatorio";
                                    } else {
                                        const stockMinimoNum = Number(editData.stock_minimo);
                                        if (isNaN(stockMinimoNum) || stockMinimoNum < 0) {
                                            errs.stock_minimo = "Debe ser mayor o igual a 0";
                                        }
                                    }

                                    if (Object.keys(errs).length > 0) {
                                        setEditErrors(errs);
                                        toast.error("Por favor, complete los campos obligatorios correctamente.");
                                        return;
                                    }

                                    setEditErrors({});
                                    setConfirmEditOpen(true);
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>}
                />

            )}

            {/* ── Confirmación de guardar cambios ────────────────────────── */}
            <ConfirmationModal
                isOpen={confirmEditOpen}
                type="success"
                title="¿Guardar cambios?"
                message={`Se actualizará "${editData.nombre_producto || 'este producto'}" con los nuevos datos. Esta acción no se puede deshacer.`}
                onConfirm={() => {
                    setConfirmEditOpen(false);
                    submitEdit();
                }}
                onCancel={() => setConfirmEditOpen(false)}
            />

            {/* ── Modal de Filtros de Productos ──────────────────────────── */}
            {filterModalOpen && (activeTab === 'productos' || activeTab === 'categorias') && (
                <Modal
                    isOpen={filterModalOpen}
                    onClose={() => setFilterModalOpen(false)}

                    contenido={
                        <div className="flex flex-col gap-5">
                            <div className=" bg-gradient-to-b from-slate-50/50 to-white">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                                        <Filter size={22} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-extrabold tracking-tight text-slate-900">Filtros de Búsqueda</h3>
                                        <p className="text-sm text-slate-500 font-medium">Personaliza los resultados</p>
                                    </div>
                                </div>
                            </div>

                            {activeTab === 'productos' ? (
                                <>
                                    <Input
                                        label="Nombre o código de producto"
                                        value={localSearch}
                                        onChange={e => setLocalSearch(e.target.value)}
                                        placeholder="Ej: Papel, PEN-001..."
                                    />

                                    <Select
                                        label="Categoría"
                                        value={localCategoria}
                                        name={'Categoria'}
                                        onChange={e => setLocalCategoria(e.target.value)}
                                        options={contextData.categorias.map(c => ({ value: c.id_categoria, label: c.nombre_categoria }))}
                                    />

                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Estado de Stock</p>
                                        <div className="flex gap-2 flex-wrap">
                                            {[
                                                { value: '', label: 'Todos', cls: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200' },
                                                { value: 'aceptable', label: '✅ Aceptable', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
                                                { value: 'critico', label: '🔴 Crítico', cls: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
                                            ].map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setLocalStockStatus(opt.value)}
                                                    className={`px-4 py-1.5 rounded-full border text-xs font-bold transition-all ${localStockStatus === opt.value
                                                        ? opt.value === 'critico'
                                                            ? 'bg-red-600 text-white border-red-600 shadow-md'
                                                            : opt.value === 'aceptable'
                                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                                                : 'bg-slate-700 text-white border-slate-700 shadow-md'
                                                        : opt.cls
                                                        }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <Input
                                    label="Nombre o código de categoría"
                                    value={localCategoriaSearch}
                                    onChange={e => setLocalCategoriaSearch(e.target.value)}
                                    placeholder="Ej: Herramientas, CAT-001..."
                                />
                            )}

                            <div className="flex justify-between gap-2 mt-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLocalSearch('');
                                        setLocalCategoria('');
                                        setLocalStockStatus('');
                                        setLocalCategoriaSearch('');
                                        if (onFilter) onFilter({ search: '', categoria: '', stockStatus: '' });
                                        setFilterModalOpen(false);
                                    }}
                                    className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors text-sm font-semibold"
                                >
                                    Limpiar filtros
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (activeTab === 'productos' && onFilter) onFilter({
                                            search: localSearch,
                                            categoria: localCategoria,
                                            stockStatus: localStockStatus,
                                        });
                                        setFilterModalOpen(false);
                                    }}
                                    className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold shadow-md shadow-blue-200"
                                >
                                    Aplicar filtros
                                </button>
                            </div>
                        </div>
                    }
                />
            )}

            {/* ── Modal: Enviar Mensaje sobre Solicitud ─────────────── */}
            {mensajeModalOpen && mensajeSolicitud && (
                <Modal
                    isOpen={mensajeModalOpen}
                    onClose={() => setMensajeModalOpen(false)}
                    contenido={
                        <div className="flex flex-col gap-5">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                                    <MessageSquare size={22} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold tracking-tight text-slate-900">Enviar Mensaje</h3>
                                    <p className="text-sm text-slate-500 font-medium">
                                        Solicitud {mensajeSolicitud.codigo_solicitud || `#${mensajeSolicitud.id_solicitud}`} — {mensajeSolicitud.resumen}
                                    </p>
                                </div>
                            </div>
                            <TextArea
                                label="Observación / Mensaje"
                                name="mensaje"
                                value={mensajeTexto}
                                onChange={e => setMensajeTexto(e.target.value)}
                                placeholder="Escribe tu observación sobre esta solicitud..."
                            />
                            <div className="flex justify-between gap-2 mt-1">
                                <button
                                    onClick={() => setMensajeModalOpen(false)}
                                    className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors text-sm font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleEnviarMensaje}
                                    disabled={isSendingMensaje || !mensajeTexto.trim()}
                                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-bold shadow-md shadow-blue-200"
                                >
                                    <MessageSquare size={14} />
                                    {isSendingMensaje ? 'Enviando...' : 'Enviar mensaje'}
                                </button>
                            </div>
                        </div>
                    }
                />
            )}

            {/* ── Modal: Codificar → Crear Producto en Inventario ──── */}
            {codificarOpen && codificarSolicitud && (
                <Modal
                    isOpen={codificarOpen}
                    onClose={() => setCodificarOpen(false)}
                    contenido={
                        <div className="flex flex-col gap-5">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-100">
                                    <Sparkles size={22} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold tracking-tight text-slate-900">Crear en Inventario</h3>
                                    <p className="text-sm text-slate-500 font-medium">
                                        Solicitud #{codificarSolicitud.id_sol_prod} — verifica los datos antes de registrar
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <Input
                                        label="Nombre del producto *"
                                        name="nombre_producto"
                                        value={codificarData.nombre_producto || ''}
                                        onChange={e => setCodificarData(p => ({ ...p, nombre_producto: e.target.value }))}
                                    />
                                </div>
                             
                                <Input
                                    label="Stock Actual"
                                    type="number"
                                    name="stock_actual"
                                    value={codificarData.stock_actual ?? codificarSolicitud.cantidad_requerida ?? 0}
                                    onChange={e => setCodificarData(p => ({ ...p, stock_actual: Number(e.target.value) }))}
                                />
                                <Input
                                    label="Stock mínimo de alerta"
                                    name="stock_minimo"
                                    type="number"
                                    value={codificarData.stock_minimo ?? 0}
                                    onChange={e => setCodificarData(p => ({ ...p, stock_minimo: e.target.value }))}
                                />
                                <div className="col-span-2">
                                    <Select
                                        label="Categoría *"
                                        name="id_categoria"
                                        value={codificarData.id_categoria || ''}
                                        onChange={e => setCodificarData(p => ({ ...p, id_categoria: e.target.value }))}
                                        options={contextData.categorias.map(c => ({ value: c.id_categoria, label: c.nombre_categoria }))}
                                    />
                                       <Input
                                    label="Código de referencia"
                                    name="codigo_producto"
                                    value={codificarData.codigo_producto || ''}
                                    onChange={e => setCodificarData(p => ({ ...p, codigo_producto: e.target.value }))}
                                />
                                </div>
                                <div className="col-span-2">
                                    <TextArea
                                        label="Descripción / Especificaciones técnicas"
                                        name="descripcion"
                                        value={codificarData.descripcion || ''}
                                        onChange={e => setCodificarData(p => ({ ...p, descripcion: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between gap-2 mt-1">
                                <button
                                    onClick={() => setCodificarOpen(false)}
                                    className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors text-sm font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        if (!codificarData.nombre_producto || !codificarData.nombre_producto.trim()) {
                                            toast.error('El nombre del producto es obligatorio.');
                                            return;
                                        }
                                        if (!codificarData.codigo_producto || !codificarData.codigo_producto.trim()) {
                                            toast.error('El código de referencia es obligatorio.');
                                            return;
                                        }
                                        if (codificarData.codigo_producto.trim().length > 20) {
                                            toast.error('El código de producto no puede tener más de 20 caracteres.');
                                            return;
                                        }
                                        if (!codificarData.id_categoria) {
                                            toast.error('Debe seleccionar una categoría.');
                                            return;
                                        }
                                        if (codificarData.stock_actual === undefined || codificarData.stock_actual === null || codificarData.stock_actual === '') {
                                            toast.error('El stock actual es obligatorio.');
                                            return;
                                        }
                                        const stockActualNum = Number(codificarData.stock_actual);
                                        if (isNaN(stockActualNum) || stockActualNum < 0) {
                                            toast.error('El stock actual debe ser un número mayor o igual a 0.');
                                            return;
                                        }
                                        if (codificarData.stock_minimo === undefined || codificarData.stock_minimo === null || codificarData.stock_minimo === '') {
                                            toast.error('El stock mínimo es obligatorio.');
                                            return;
                                        }
                                        const stockMinimoNum = Number(codificarData.stock_minimo);
                                        if (isNaN(stockMinimoNum) || stockMinimoNum < 0) {
                                            toast.error('El stock mínimo debe ser un número mayor o igual a 0.');
                                            return;
                                        }
                                        setConfirmCodificarOpen(true);
                                    }}
                                    disabled={isCodifying}
                                    className="flex items-center gap-2 px-5 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors text-sm font-bold shadow-md shadow-amber-200"
                                >
                                    <Sparkles size={14} />
                                    {isCodifying ? 'Creando...' : 'Crear en inventario'}
                                </button>
                            </div>
                        </div>
                    }
                />
            )}

            {/* ── Confirmación: crear producto desde solicitud ────────── */}
            <ConfirmationModal
                isOpen={confirmCodificarOpen}
                type="warning"
                title="¿Crear este producto?"
                message={`Se registrará "${codificarData.nombre_producto || 'el producto'}" en el inventario y la solicitud quedará marcada como Procesada.`}
                onConfirm={() => { setConfirmCodificarOpen(false); handleCodificarSubmit(); }}
                onCancel={() => setConfirmCodificarOpen(false)}
            />

        </>
    );
};

export default Tabla;