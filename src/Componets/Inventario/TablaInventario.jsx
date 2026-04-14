import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, Building2, Boxes, Hash, Package, User, CheckCircle, XCircle, Mail, Filter, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Modal } from '../componentes dashboard/Modal.jsx';
import { TextArea, Select, Input } from '../Inputs';
import AlertItem from '../Alerts';
import ConfirmationModal from '../Confirmacion';
import { Avatar, AvatarFallback, AvatarImage } from '../Avatar';
import ModalEstacion from '../ModalEstacion';
import { div, select } from 'motion/react-client';



const TablaInventario = ({ data = [], alSeleccionar, loading: apiLoading, currentPage = 1, totalPages = 1, onPageChange, isAdmin, onFilter, gerencias = [], roles = [], filtrosActuales = {}, onCreated, GerenciasPresupuesto = [] }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [alerts, setAlerts] = useState([]);
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
    const [contextData, setContextData] = useState({ categorias: [], gerencias: [], productos: [] });
    const [activeTab, setActiveTab] = useState('productos');

    const manejarCambio = (tabName) => {
        if (alSeleccionar) alSeleccionar(tabName);
    };

    useEffect(() => {
        const fetchContext = async () => {
            try {
                const [cats, prods, gers] = await Promise.all([
                    fetch(`http://${window.location.hostname}:5000/categorias`, { credentials: 'include' }).then(res => res.json()),
                    fetch(`http://${window.location.hostname}:5000/productos`, { credentials: 'include' }).then(res => res.json()),
                    fetch(`http://${window.location.hostname}:5000/context`, { credentials: 'include' }).then(res => res.json())
                ]);
                setContextData({
                    categorias: cats.data || [],
                    productos: prods.data || [],
                    gerencias: gers.gerencias || []
                });
                console.log(contextData)
            } catch (err) {
                console.error("Error al cargar context:", err);
            }
        };
        fetchContext();
    }, [activeTab]); // Refresh context periodically or depending on tab change

    const handleCreateChange = (e) => {
        const { name, value } = e.target;
        setCreateData(prev => ({ ...prev, [name]: value }));
    };

    const submitCreate = async () => {
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
                addAlert('success', 'Operación Finalizada', `Registro creado con éxito en ${activeTab}`);
                setCreateModalOpen(false);
                setCreateData({});
                if (onCreated) onCreated();
            } else {
                const err = await resp.json();
                addAlert('error', 'Operación Fallida', `Error: ${err.error}`);
            }
        } catch (error) {
            console.error("Error al crear:", error);
            addAlert('error', 'Error', "Error interno al comunicar con el servidor");
        } finally {
            setIsProcessingLocal(false);
        }
    };

    // Estados locales para el modal de filtros
    const [localBusqueda, setLocalBusqueda] = useState(filtrosActuales.busqueda || '');
    const [localColumna, setLocalColumna] = useState(filtrosActuales.columna || 'nombres');
    const [localGerencia, setLocalGerencia] = useState(filtrosActuales.gerencia || '');

    useEffect(() => {
        if (filterModalOpen) {
            setLocalBusqueda(filtrosActuales.busqueda || '');
            setLocalColumna(filtrosActuales.columna || 'nombres');
            setLocalGerencia(filtrosActuales.gerencia || '');
        }
    }, [filterModalOpen, filtrosActuales.busqueda, filtrosActuales.columna, filtrosActuales.gerencia]);

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
        setModalOpen(true);
    };

    const closeModal = () => {
        setSelected(null);
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


    const addAlert = useCallback((type, title, message) => {
        const id = Date.now();
        setAlerts(prev => [...prev, { id, type, title, message }]);
    }, []);

    const removeAlert = useCallback((id) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    }, []);



    return (
        <>

            <div className="fixed top-6 right-6 z-[100] flex flex-col items-end pointer-events-none">
                {alerts.map(alert => (
                    <AlertItem key={alert.id} {...alert} onClose={removeAlert} />
                ))}
            </div>

            <div className="g:col-span-7 h-full flex flex-col   bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full animate-in fade-in duration-700">

                <div className="p-4 border-b border-slate-50 overflow-x-auto custom-scrollbar flex items-center gap-3 shrink-0">
                    <Package className="w-5 h-5 text-blue-500" />
                    <h2 className="font-bold text-slate-800 whitespace-nowrap">Inventario de Activos</h2>

                    {1 == 1 && (
                        <div className="flex gap-2"> {/* Contenedor para agrupar botones */}

                            {/* Botón de Filtros */}
                            <button
                                onClick={() => {
                                    setFilterModalOpen(true);
                                }}
                                className={`ml-4 p-2 rounded-2xl bg-white shadow-sm text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-all flex items-center gap-2 text-xs font-semibold`}
                            >
                                <Filter size={16} />
                                <span className="max-xl:hidden">Filtros</span>
                            </button>

                            {/* Botón Nuevo */}
                            <button
                                onClick={() => setCreateModalOpen(true)}
                                className={`p-2 px-4 flex justify-center items-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-200 hover:bg-blue-700 transition-all gap-2 text-xs font-semibold`}
                            >
                                <Plus size={16} strokeWidth={3} />
                                <span className="max-xl:hidden">Nuevo</span>
                            </button>

                        </div>
                    )}
                    <div className='flex gap-2 ml-auto justify-end items-end -mb-8 z-2'>
                        <button
                            onClick={() => {
                                setActiveTab('categorias');
                                manejarCambio('categorias');
                            }}
                            className={`p-2 px-4 rounded-2xl bg-white/50 backdrop-blur-md shadow-[4px_0_4px_0px_rgba(0,0,0,0.1)] rounded-b-none transition-colors flex items-center gap-2 text-xs font-semibold ${activeTab === 'categorias' ? 'text-blue-600 bg-slate-100' : 'text-slate-600 hover:bg-slate-100'}`}>
                            <ClipboardList size={16} />
                            Categorías
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('productos');
                                manejarCambio('productos');
                            }}
                            className={`p-2 px-4 rounded-2xl bg-white/50 backdrop-blur-md shadow-[4px_0_4px_0px_rgba(0,0,0,0.1)] rounded-b-none transition-colors flex items-center gap-2 text-xs font-semibold ${activeTab === 'productos' ? 'text-blue-600 bg-slate-100' : 'text-slate-600 hover:bg-slate-100'}`}>
                            <Package size={16} />
                            Productos
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('movimientos');
                                manejarCambio('movimientos');
                            }}
                            className={`p-2 px-4 rounded-2xl bg-white/50 backdrop-blur-md shadow-[4px_0_4px_0px_rgba(0,0,0,0.1)] rounded-b-none transition-colors flex items-center gap-2 text-xs font-semibold ${activeTab === 'movimientos' ? 'text-blue-600 bg-slate-100' : 'text-slate-600 hover:bg-slate-100'}`}>
                            <ClipboardList size={16} />
                            Mov.
                        </button>
                    </div>
                    <div className='flex justify-center items-center ml-auto gap-2'>
                        {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                            <div key={i} className={`size-2 rounded-full transition-all ${currentPage === i + 1 ? 'bg-blue-600 size-3' : 'bg-gray-300'}`}></div>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left text-sm custom-scrollbar border-collapse">
                        <thead className="bg-slate-50/50  z-20 text-slate-500 uppercase text-[10px] font-bold sticky top-0 z-10">
                            <tr className="border-b border-slate-100">
                                {activeTab === 'categorias' && (
                                    <>
                                        <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80">ID</th>
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
                                {activeTab === 'movimientos' && (
                                    <>
                                        <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80 whitespace-nowrap">ID Movimiento</th>
                                        <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80 whitespace-nowrap">Producto</th>
                                        <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80 whitespace-nowrap">Tipo</th>
                                        <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80 whitespace-nowrap">Cantidad</th>
                                        <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80 whitespace-nowrap">Fecha</th>
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
                            ) : (data && data.length > 0) ? (
                                data.map((row, i) => (
                                    <tr key={row.id_producto || row.id_categoria || row.id_movimiento || i} className="hover:bg-slate-50/50 transition-colors animate-in fade-in duration-300">
                                        {activeTab === 'categorias' && (
                                            <>
                                                <td className="px-6 py-4 text-slate-500">{row.id_categoria}</td>
                                                <td className="px-6 py-4 font-semibold text-slate-700">{row.nombre_categoria}</td>
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
                                                <td className="px-6 py-4 text-slate-500">{row.nombre_categoria || row.id_categoria}</td>
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
                                        {activeTab === 'movimientos' && (
                                            <>
                                                <td className="px-6 py-4 text-slate-500">{row.id_movimiento}</td>
                                                <td className="px-6 py-4 font-semibold text-slate-700">{row.nombre_producto || row.id_producto}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${row.tipo_movimiento === 'Entrada' ? 'bg-blue-100 text-blue-600' : row.tipo_movimiento === 'Salida' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                                                        {row.tipo_movimiento}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-700 font-bold">{row.cantidad}</td>
                                                <td className="px-6 py-4 text-slate-500">{row.fecha_movimiento ? new Date(row.fecha_movimiento).toLocaleDateString() : 'N/A'}</td>
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

                {/* Footer de Paginación */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between shrink-0">
                    <p className="text-xs text-slate-500 font-medium">
                        Página <span className="text-slate-800">{currentPage}</span> de <span className="text-slate-800">{totalPages}</span>
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1 || visualLoading}
                            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || visualLoading}
                            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>
                </div>
            </div >

            {createModalOpen && (
                <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title={`Nuevo/a en ${activeTab}`}
                    contenido={
                        <div className="flex flex-col gap-4">
                            {activeTab === 'categorias' && (
                                <>
                                    <Input label="Nombre Categoría" name="nombre_categoria" onChange={handleCreateChange} value={createData.nombre_categoria || ''} />
                                    <TextArea label="Descripción" name="descripcion" onChange={handleCreateChange} value={createData.descripcion || ''} />
                                </>
                            )}
                            {activeTab === 'productos' && (
                                <>
                                    <Input label="Código" name="codigo_producto" onChange={handleCreateChange} value={createData.codigo_producto || ''} />
                                    <Input label="Nombre Producto" name="nombre_producto" onChange={handleCreateChange} value={createData.nombre_producto || ''} />
                                    <TextArea label="Descripción" name="descripcion" onChange={handleCreateChange} value={createData.descripcion || ''} />
                                    <Select label="Categoría" name="id_categoria" value={createData.id_categoria || ''} onChange={handleCreateChange}>
                                        <option value="">Seleccione...</option>
                                        {contextData.categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria}</option>)}
                                    </Select>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input label="Stock Actual" type="number" name="stock_actual" onChange={handleCreateChange} value={createData.stock_actual || ''} />
                                        <Input label="Stock Mínimo" type="number" name="stock_minimo" onChange={handleCreateChange} value={createData.stock_minimo || ''} />
                                    </div>
                                    <Input label="Precio Unitario" type="number" step="0.01" name="precio_unitario" onChange={handleCreateChange} value={createData.precio_unitario || ''} />
                                    <Select label="Gerencia" name="id_gerencia" value={createData.id_gerencia || ''} onChange={handleCreateChange}>
                                        <option value="">Seleccione...</option>
                                        {contextData.gerencias.map(g => <option key={g.id_gerencia} value={g.id_gerencia}>{g.nombre_gerencia}</option>)}
                                    </Select>
                                </>
                            )}
                            {activeTab === 'movimientos' && (
                                <>
                                    <Select label="Producto" name="id_producto" value={createData.id_producto || ''} onChange={handleCreateChange}>
                                        <option value="">Seleccione...</option>
                                        {contextData.productos.map(p => <option key={p.id_producto} value={p.id_producto}>{p.nombre_producto}</option>)}
                                    </Select>
                                    <Select label="Tipo Movimiento" name="tipo_movimiento" value={createData.tipo_movimiento || ''} onChange={handleCreateChange}>
                                        <option value="">Seleccione...</option>
                                        <option value="Entrada">Entrada</option>
                                        <option value="Salida">Salida</option>
                                        <option value="Ajuste">Ajuste</option>
                                    </Select>
                                    <Input label="Cantidad" type="number" name="cantidad" onChange={handleCreateChange} value={createData.cantidad || ''} />
                                    <TextArea label="Motivo (Opcional)" name="motivo" onChange={handleCreateChange} value={createData.motivo || ''} />
                                </>
                            )}

                            <div className="flex justify-end gap-2 mt-4">
                                <button onClick={() => setCreateModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                                <button onClick={submitCreate} disabled={isProcessingLocal} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                                    {isProcessingLocal ? 'Procesando...' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    }

                />


            )}

            {modalOpen && selected && (
                <Modal isOpen={modalOpen} onClose={closeModal} title={`Detalles de ${activeTab === 'categorias' ? 'Categoría' : activeTab === 'productos' ? 'Producto' : 'Movimiento'}`}
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
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-4">
                                                    <Hash size={12} /> Registro de Sistema
                                                </span>
                                                <h3 className="text-3xl font-black text-slate-900 mb-2">{selected.nombre_categoria}</h3>
                                                <p className="text-slate-500 text-sm leading-relaxed max-w-md">
                                                    {selected.descripcion || 'Sin descripción detallada para esta categoría en la base de datos.'}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">ID Interno</span>
                                                    <span className="font-mono font-bold text-slate-700">CAT-{selected.id_categoria.toString().padStart(3, '0')}</span>
                                                </div>
                                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Estado</span>
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
                                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 animate-in fade-in slide-in-from-right-4 duration-400">
                                            {/* Card Principal de Producto */}
                                            <div className="md:col-span-4 p-6 bg-white border border-slate-200 rounded-[2rem] shadow-sm flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <span className="px-3 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold uppercase tracking-tighter">
                                                            {selected.codigo_producto}
                                                        </span>
                                                        <Package className="text-slate-200" size={32} />
                                                    </div>
                                                    <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none mb-4">
                                                        {selected.nombre_producto}
                                                    </h2>
                                                    <p className="text-slate-500 text-sm line-clamp-2 italic">
                                                        {selected.descripcion || 'Este producto no cuenta con especificaciones técnicas registradas.'}
                                                    </p>
                                                </div>

                                                <div className="mt-8 pt-6 border-t border-slate-100 flex gap-6">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Precio Unitario</span>
                                                        <span className="text-2xl font-black text-slate-900">${selected.precio_unitario}</span>
                                                    </div>
                                                    <div className="h-10 w-[1px] bg-slate-100 self-center" />
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Gerencia Dueña</span>
                                                        <span className="text-sm font-bold text-blue-600">{selected.nombre_gerencia || 'Uso Global'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card de Stock (Visualizer) */}
                                            <div className="md:col-span-2 space-y-4">
                                                <div className="p-6 bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-[2rem] text-center shadow-sm">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-4">Disponibilidad</span>
                                                    <div className="relative inline-flex items-center justify-center mb-4">
                                                        {/* Un círculo decorativo de progreso */}
                                                        <svg className="w-24 h-24 transform -rotate-90">
                                                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                                                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent"
                                                                strokeDasharray={251}
                                                                strokeDashoffset={251 - (251 * Math.min(selected.stock_actual, 100)) / 100}
                                                                className={`${selected.stock_actual <= selected.stock_minimo ? 'text-red-500' : 'text-emerald-500'}`}
                                                            />
                                                        </svg>
                                                        <span className="absolute text-2xl font-black">{selected.stock_actual}</span>
                                                    </div>
                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${selected.stock_actual <= selected.stock_minimo ? 'text-red-600' : 'text-emerald-600'}`}>
                                                        {selected.stock_actual <= selected.stock_minimo ? 'Stock Crítico' : 'Stock Correcto'}
                                                    </p>
                                                </div>

                                                <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                                                    <span className="text-[10px] font-bold opacity-70 uppercase block mb-1">Mínimo de Alerta</span>
                                                    <p className="text-lg font-black">{selected.stock_minimo} unidades</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB: MOVIMIENTOS */}
                                    {activeTab === 'movimientos' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-400">
                                            {/* Timeline Header */}
                                            <div className="flex items-center gap-4 p-2">
                                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm">
                                                    <User size={20} className="text-slate-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 leading-none">{selected.nombre_usuario || 'Operador de Sistema'}</h4>
                                                    <span className="text-[10px] text-slate-400 font-medium">{selected.fecha_movimiento ? new Date(selected.fecha_movimiento).toLocaleString() : 'Fecha no disponible'}</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className={`p-6 rounded-3xl border-2 flex flex-col justify-center items-center ${selected.tipo_movimiento === 'Entrada' ? 'bg-blue-50/50 border-blue-100' : 'bg-orange-50/50 border-orange-100'}`}>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest mb-2 ${selected.tipo_movimiento === 'Entrada' ? 'text-blue-600' : 'text-orange-600'}`}>Tipo</span>
                                                    {selected.tipo_movimiento === 'Entrada' ? <ArrowDownCircle className="text-blue-500 mb-2" size={32} /> : <ArrowUpCircle className="text-orange-500 mb-2" size={32} />}
                                                    <span className={`text-xl font-black ${selected.tipo_movimiento === 'Entrada' ? 'text-blue-700' : 'text-orange-700'}`}>{selected.tipo_movimiento}</span>
                                                </div>

                                                <div className="md:col-span-2 p-6 bg-white border border-slate-200 rounded-3xl relative overflow-hidden">
                                                    <div className="relative z-10">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Detalle de Operación</span>
                                                        <div className="flex items-center gap-4 mb-4">
                                                            <div className="text-4xl font-black text-slate-900">{selected.cantidad}</div>
                                                            <div className="text-xs font-bold text-slate-500 uppercase leading-tight">Unidades de<br />{selected.nombre_producto}</div>
                                                        </div>
                                                        <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed border border-slate-100">
                                                            <strong>Nota:</strong> {selected.motivo || 'No se registraron observaciones adicionales para este movimiento.'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {selected.resumen_solicitud && (
                                                <div className="group p-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl text-white flex items-center justify-between shadow-md hover:shadow-purple-200 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                                                            <ClipboardList size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold opacity-80 uppercase tracking-tighter">Vinculado a Solicitud de Compra</p>
                                                            <p className="text-sm font-bold">{selected.resumen_solicitud}</p>
                                                        </div>
                                                    </div>
                                                    <ArrowRight size={20} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Botón de Cierre con Efecto */}
                                <div className="flex justify-center mt-4">
                                    <button
                                        onClick={closeModal}
                                        className="group relative px-12 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] overflow-hidden hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
                                    >
                                        <span className="relative z-10">Cerrar Detalle</span>
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    </button>
                                </div>
                            </div>
                        </>
                    }
                />


            )}

        </>
    );
};

export default TablaInventario;