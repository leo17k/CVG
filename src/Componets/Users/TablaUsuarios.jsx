
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ClipboardList, Plus, Mail, Filter, Search, X, CheckCircle, XCircle, Building2, Shield } from 'lucide-react';
import { Modal } from '../componentes dashboard/Modal.jsx';
import { TextArea, Select, Input } from '../Inputs';
import { toast } from '../GoeyToaster';

import ConfirmationModal from '../Confirmacion';
import { Avatar, AvatarFallback, AvatarImage } from '../Avatar';
import { useAuth } from '../../Constext/AuthToken.jsx';

// ── Role badge colours ──────────────────────────────────────────────────────
const roleMeta = (idRol) => {
    const map = {
        1: { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500', pulse: true },
        2: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', pulse: false },
        3: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', pulse: false },
    };
    return map[idRol] || { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', pulse: false };
};

// ── Skeleton card ────────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col items-center gap-3 animate-pulse">
        <div className="w-20 h-20 rounded-full bg-slate-100" />
        <div className="h-4 w-28 bg-slate-100 rounded-full" />
        <div className="h-3 w-20 bg-slate-100 rounded-full" />
        <div className="h-6 w-24 bg-slate-100 rounded-full mt-1" />
        <div className="h-8 w-full bg-slate-100 rounded-xl mt-2" />
    </div>
);

// ── Profile card ─────────────────────────────────────────────────────────────
const UserCard = ({ row, onView }) => {
    const rm = roleMeta(row.id_rol);
    return (
        <div
            className={`group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-5 flex flex-col items-center gap-2 cursor-pointer h-full justify-between ${row.activo === 0 ? 'opacity-60 grayscale-[30%]' : ''}`}
            onClick={() => onView(row)}
        >
            {/* Top section */}
            <div className="flex flex-col items-center gap-2 w-full">
                {/* Avatar */}
                <div className="p-[3px] rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 mb-1">
                    <Avatar className="h-20 w-20 rounded-full border-2 border-white">
                        <AvatarImage src={row.avatar} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white text-xl font-black uppercase">
                            {row.nombres?.charAt(0)}{row.apellidos?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                </div>

                {/* Name */}
                <p className="text-[15px] font-bold text-slate-800 text-center leading-tight group-hover:text-indigo-600 transition-colors">
                    {row.nombres} {row.apellidos}
                </p>

                {/* Email */}
                <div className="flex items-center gap-1 opacity-70">
                    <Mail size={11} className="text-blue-400 shrink-0" />
                    <span className="text-[11px] text-slate-500 truncate max-w-[140px]">{row.email?.toLowerCase()}</span>
                </div>

                {/* Role badge */}
                <span className={`mt-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${rm.bg} ${rm.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${rm.dot} ${rm.pulse ? 'animate-pulse' : ''}`} />
                    {row.nombre_rol || 'Usuario'}
                </span>

                {/* Gerencia */}
                <div className="flex items-center gap-1 mt-0.5">
                    <Building2 size={11} className="text-slate-400" />
                    <span className="text-[11px] text-slate-400 truncate max-w-[150px]">{row.nombre_gerencia}</span>
                </div>
            </div>

            {/* Bottom — ID chip always at bottom */}
            <span className="text-[9px] font-bold bg-slate-50 border border-slate-100 text-blue-400 px-2 py-0.5 rounded-md">
                ID-{row.id_usuario}
            </span>
        </div>
    );
};

// ── Main component ───────────────────────────────────────────────────────────
const TablaUsuarios = ({
    data = [], alSeleccionar, loading: apiLoading,
    currentPage = 1, totalPages = 1, onPageChange,
    isAdmin, onFilter, gerencias = [], roles = [],
    filtrosActuales = {}, onUserCreated, GerenciasPresupuesto = []
}) => {

    // ── State ──
    const [modalOpen, setModalOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editData, setEditData] = useState({});
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createData, setCreateData] = useState({ id_rol: 4, id_gerencia: '' });
    const [editErrors, setEditErrors] = useState({});
    const [createErrors, setCreateErrors] = useState({});

    const { permiso, datauser } = useAuth();
    const effectiveRole = Number(permiso?.id_rol ?? datauser?.data?.id_rol ?? 0);
    const isAdminFlag = Boolean(datauser?.data?.isAdmin) || [1, 5].includes(effectiveRole);
    const canCreateUser = Boolean(isAdmin) || isAdminFlag;

    // Search / filter
    const [search, setSearch] = useState(filtrosActuales.busqueda || '');
    const [gerencia, setGerencia] = useState(filtrosActuales.gerencia || '');
    const [columna, setColumna] = useState(filtrosActuales.columna || 'nombres');

    // Filter modal
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [tmpGerencia, setTmpGerencia] = useState(gerencia);
    const [tmpColumna, setTmpColumna] = useState(columna);

    const openFilterModal = () => { setTmpGerencia(gerencia); setTmpColumna(columna); setFilterModalOpen(true); };
    const applyFilters = () => { setGerencia(tmpGerencia); setColumna(tmpColumna); setFilterModalOpen(false); };
    const clearFilters = () => { setSearch(''); setGerencia(''); setColumna('nombres'); setTmpGerencia(''); setTmpColumna('nombres'); setFilterModalOpen(false); };

    const columnaLabel = { nombres: 'Nombre', email: 'Correo', username: 'Usuario' };
    const hasActiveFilters = gerencia || columna !== 'nombres';

    // Infinite scroll
    const [visibleCount, setVisibleCount] = useState(12);
    const loaderRef = useRef(null);

    // Visual loading skeleton (min 200 ms)
    const [visualLoading, setVisualLoading] = useState(true);
    useEffect(() => {
        if (apiLoading) { setVisualLoading(true); return; }
        const t = setTimeout(() => setVisualLoading(false), 200);
        return () => clearTimeout(t);
    }, [apiLoading, currentPage]);

    // Reset visible count when data changes
    useEffect(() => { setVisibleCount(12); }, [data]);

    // Infinite scroll observer
    useEffect(() => {
        const el = loaderRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setVisibleCount(c => c + 12); },
            { threshold: 0.1 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    // ── Filtering (client side on current page data) ──
    const filtered = data.filter(row => {
        const matchG = !gerencia || String(row.id_gerencia) === String(gerencia);
        const term = search.toLowerCase().trim();
        const matchS = !term || String(row[columna] || '').toLowerCase().includes(term);
        return matchG && matchS;
    });
    const visible = filtered.slice(0, visibleCount);
    const hasMore = visibleCount < filtered.length || currentPage < totalPages;

    // Apply search to parent (debounced)
    useEffect(() => {
        const t = setTimeout(() => {
            if (onFilter) onFilter({ busqueda: search, gerencia, columna });
        }, 400);
        return () => clearTimeout(t);
    }, [search, gerencia, columna]);

    // ── Confirmation modal ──
    const [confModal, setConfModal] = useState({ isOpen: false, type: 'question', title: '', message: '', onConfirm: () => { } });
    const triggerAction = (cfg) => setConfModal({
        isOpen: true, title: cfg.title, message: cfg.message, type: cfg.type || 'question',
        onConfirm: () => { try { cfg.action(); } catch (e) { console.error(e); } setConfModal(p => ({ ...p, isOpen: false })); }
    });

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    // ── Handlers ──
    const openModal = (row) => { setSelected(row); setModalOpen(true); };
    const closeModal = () => { setSelected(null); setModalOpen(false); };

    const handleEditChange = e => {
        const { name, value } = e.target;
        setEditData(p => ({ ...p, [name]: value }));
        if (editErrors[name]) {
            setEditErrors(prev => {
                const newErr = { ...prev };
                delete newErr[name];
                return newErr;
            });
        }
    };
    const handleCreateChange = e => {
        const { name, value } = e.target;
        setCreateData(p => ({ ...p, [name]: value }));
        if (createErrors[name]) {
            setCreateErrors(prev => {
                const newErr = { ...prev };
                delete newErr[name];
                return newErr;
            });
        }
    };

    const submitEdit = async () => {
        try {
            const res = await fetch(`http://${window.location.hostname}:5000/usuarios/${editData.id_usuario}`, {
                method: 'PUT', credentials: 'include',
                headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editData)
            });
            if (res.ok) {
                toast.success('Usuario actualizado — Cambios guardados con éxito');
                setEditModalOpen(false);
                setEditErrors({});
                onUserCreated?.();
            }
            else { const e = await res.json().catch(() => ({})); toast.error(`Error — ${e.error || 'No se pudo actualizar'}`); }
        } catch { toast.error('Error interno al comunicarse con el servidor'); }
    };

    const toggleUserStatus = async (user) => {
        const currentlyActive = user.activo === undefined || user.activo === 1 || user.activo === true;
        const newStatus = currentlyActive ? 0 : 1;
        const actionWord = currentlyActive ? 'desactivado' : 'activado';
        
        try {
            const res = await fetch(`http://${window.location.hostname}:5000/usuarios/${user.id_usuario}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activo: newStatus })
            });
            if (res.ok) {
                toast.success(`Usuario ${actionWord} con éxito`);
                closeModal();
                onUserCreated?.();
            } else {
                const e = await res.json().catch(() => ({}));
                toast.error(`Error — ${e.error || 'No se pudo cambiar el estado del usuario'}`);
            }
        } catch {
            toast.error('Error interno al comunicarse con el servidor');
        }
    };

    const handleToggleStatusClick = (user) => {
        const currentlyActive = user.activo === undefined || user.activo === 1 || user.activo === true;
        const title = currentlyActive ? 'Desactivar usuario' : 'Activar usuario';
        const message = currentlyActive 
            ? `¿Estás seguro de que deseas desactivar a ${user.nombres} ${user.apellidos}? No podrá iniciar sesión.`
            : `¿Deseas activar a ${user.nombres} ${user.apellidos}?`;
            
        triggerAction({
            title,
            message,
            type: currentlyActive ? 'danger' : 'question',
            action: () => toggleUserStatus(user)
        });
    };

    const startUserChat = (user) => {
        const formattedUser = {
            id: user.id_usuario,
            name: `${user.nombres} ${user.apellidos || ''}`.trim(),
            avatar: user.avatar || null,
            username: user.username
        };
        window.dispatchEvent(new CustomEvent('open_user_chat', { detail: formattedUser }));
        closeModal();
    };

    const handleEditSaveClick = () => {
        const errors = {};
        if (!editData.nombres?.trim()) errors.nombres = "El nombre es obligatorio";
        if (!editData.apellidos?.trim()) errors.apellidos = "El apellido es obligatorio";
        if (!editData.email?.trim()) {
            errors.email = "El correo electrónico es obligatorio";
        } else if (!validateEmail(editData.email)) {
            errors.email = "El formato de correo no es válido";
        }
        if (!editData.id_rol) errors.id_rol = "El rol es obligatorio";
        if (!editData.id_gerencia) errors.id_gerencia = "La gerencia es obligatoria";

        if (Object.keys(errors).length > 0) {
            setEditErrors(errors);
            toast.error("Por favor, complete los campos obligatorios correctamente.");
            return;
        }

        setEditErrors({});
        triggerAction({
            title: 'Confirmar cambios',
            message: `¿Actualizar a ${editData.nombres} ${editData.apellidos}?`,
            type: 'question',
            action: submitEdit
        });
    };

    const submitCreate = async () => {
        const errors = {};
        if (!createData.nombres?.trim()) errors.nombres = "El nombre es obligatorio";
        if (!createData.apellidos?.trim()) errors.apellidos = "El apellido es obligatorio";
        if (!createData.email?.trim()) {
            errors.email = "El correo electrónico es obligatorio";
        } else if (!validateEmail(createData.email)) {
            errors.email = "El formato de correo no es válido";
        }
        if (!createData.username?.trim()) errors.username = "El nombre de usuario es obligatorio";
        if (!createData.password) {
            errors.password = "La contraseña es obligatoria";
        } else if (createData.password.length < 6) {
            errors.password = "La contraseña debe tener al menos 6 caracteres";
        }
        if (!createData.id_gerencia) errors.id_gerencia = "La gerencia es obligatoria";
        if (!createData.id_rol) errors.id_rol = "El rol es obligatorio";

        if (Object.keys(errors).length > 0) {
            setCreateErrors(errors);
            toast.error("Por favor, complete todos los campos obligatorios correctamente.");
            return;
        }

        setCreateErrors({});
        try {
            const res = await fetch(`http://${window.location.hostname}:5000/usuarios`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createData)
            });
            const d = await res.json();

            if (res.ok) {
                toast.success('Usuario creado con éxito');
                setCreateModalOpen(false);
                setCreateData({ id_rol: 4, id_gerencia: '' });
                setCreateErrors({});
                onUserCreated?.();
                return;
            }

            toast.error(`Operación Fallida — ${d.error || 'No se pudo crear el usuario'}`);
        } catch {
            toast.error('Error interno al comunicar con el servidor');
        }
    };

    // ── Render ──
    return (
        <>
            <ConfirmationModal
                isOpen={confModal.isOpen} title={confModal.title}
                message={confModal.message} type={confModal.type}
                onConfirm={confModal.onConfirm}
                onCancel={() => setConfModal(p => ({ ...p, isOpen: false }))}
            />

            <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full animate-in fade-in duration-700">

                {/* ── Header ── */}
                <div className="p-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3 mb-3">
                        <ClipboardList className="w-5 h-5 text-blue-500 shrink-0" />
                        <h2 className="font-bold text-slate-800 whitespace-nowrap">Listado de Usuarios</h2>
                        <span className="ml-1 text-xs text-slate-400 font-medium">{filtered.length} usuarios</span>
                        {canCreateUser && (
                            <button
                                onClick={() => setCreateModalOpen(true)}
                                className="ml-auto p-2 px-4 flex items-center gap-2 rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-200 text-xs font-semibold hover:bg-blue-700 transition-all"
                            >
                                <Plus size={15} strokeWidth={3} />
                                <span className="max-sm:hidden">Nuevo Usuario</span>
                            </button>
                        )}
                    </div>

                    {/* Search bar + Filter button */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar usuario..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-8 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Botón filtros */}
                        <button
                            onClick={openFilterModal}
                            className={`relative flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                                hasActiveFilters
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            <Filter size={14} />
                            <span className="max-sm:hidden">Filtros</span>
                            {hasActiveFilters && (
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                                    {(gerencia ? 1 : 0) + (columna !== 'nombres' ? 1 : 0)}
                                </span>
                            )}
                        </button>

                        {/* Limpiar todo */}
                        {(search || hasActiveFilters) && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-500 text-xs font-semibold hover:bg-rose-100 transition-all"
                            >
                                <X size={13} />
                                <span className="max-sm:hidden">Limpiar</span>
                            </button>
                        )}
                    </div>

                    {/* Chips de filtros activos */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {columna !== 'nombres' && (
                                <span className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[11px] font-semibold rounded-full border border-indigo-100">
                                    Buscar por: {columnaLabel[columna]}
                                    <button onClick={() => setColumna('nombres')} className="ml-0.5 hover:text-indigo-800"><X size={10} /></button>
                                </span>
                            )}
                            {gerencia && (
                                <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[11px] font-semibold rounded-full border border-emerald-100">
                                    {gerencias.find(g => String(g.value) === String(gerencia))?.label || 'Área'}
                                    <button onClick={() => setGerencia('')} className="ml-0.5 hover:text-emerald-800"><X size={10} /></button>
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Cards grid ── */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    {visualLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 py-20">
                            <Shield size={40} strokeWidth={1.5} />
                            <p className="text-sm font-medium">No se encontraron usuarios</p>
                            {search && (
                                <button onClick={() => setSearch('')} className="text-xs text-blue-500 hover:underline">Limpiar búsqueda</button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {visible.map((row, i) => (
                                    <div key={row.id_usuario || i} className="animate-in fade-in zoom-in-95 duration-300" style={{ animationDelay: `${(i % 12) * 30}ms` }}>
                                        <UserCard row={row} onView={openModal} />
                                    </div>
                                ))}
                            </div>

                            {/* Infinite scroll trigger */}
                            {hasMore && (
                                <div ref={loaderRef} className="flex justify-center py-6">
                                    {visibleCount >= filtered.length && currentPage < totalPages ? (
                                        <button
                                            onClick={() => onPageChange(currentPage + 1)}
                                            disabled={apiLoading}
                                            className="px-6 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all disabled:opacity-50"
                                        >
                                            Cargar más usuarios
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-xs">Cargando...</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/40 shrink-0 flex items-center justify-between">
                    <p className="text-xs text-slate-400 font-medium">
                        Mostrando <span className="text-slate-700 font-semibold">{Math.min(visibleCount, filtered.length)}</span> de <span className="text-slate-700 font-semibold">{filtered.length}</span> · Página {currentPage}/{totalPages}
                    </p>
                    <div className="flex gap-1">
                        {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                            <div key={i} className={`rounded-full transition-all ${currentPage === i + 1 ? 'bg-blue-500 w-4 h-2' : 'bg-slate-200 w-2 h-2'}`} />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Detail modal ── */}
            {modalOpen && selected && (
                <Modal onClose={closeModal} contenido={
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                        <div className="p-1 rounded-full bg-gradient-to-tr from-blue-600 to-blue-300">
                            <Avatar className="h-28 w-28 rounded-full border-4 border-white">
                                <AvatarImage src={selected.avatar} className="object-cover" />
                                <AvatarFallback className="text-[30px] bg-gradient-to-br from-indigo-600 to-violet-700 text-white font-black uppercase">
                                    {selected.nombres?.charAt(0)}{selected.apellidos?.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="text-center mt-5 mb-6">
                            <h3 className="text-2xl font-bold text-gray-800 tracking-tight">{selected.nombres} {selected.apellidos}</h3>
                            <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-50 text-blue-600">{selected.nombre_rol}</span>
                        </div>
                        <div className="w-full space-y-1 mb-6">
                            {[['Gerencia', selected.nombre_gerencia], ['Estado', (selected.activo === undefined || selected.activo === 1 || selected.activo === true) ? 'Activo' : 'Inactivo']].map(([k, v]) => (
                                <div key={k} className="flex justify-between items-center p-3 rounded-xl hover:bg-gray-50">
                                    <span className="text-sm font-medium text-gray-400">{k}</span>
                                    <span className={`text-sm font-semibold ${k === 'Estado' ? (v === 'Activo' ? 'text-green-600' : 'text-rose-500') : 'text-gray-700'}`}>{v || '—'}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col w-full gap-3">
                            <button 
                                onClick={() => startUserChat(selected)}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all"
                            >
                                <Mail size={16} /> Enviar Mensaje
                            </button>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => { setEditData(selected); closeModal(); setEditModalOpen(true); }}
                                    className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition-colors">
                                    Editar
                                </button>
                                <button 
                                    onClick={() => handleToggleStatusClick(selected)}
                                    className={`flex items-center justify-center gap-2 py-2.5 border rounded-xl font-medium transition-colors ${
                                        (selected.activo === undefined || selected.activo === 1 || selected.activo === true)
                                            ? 'border-red-100 text-red-500 hover:bg-red-50'
                                            : 'border-green-100 text-green-600 hover:bg-green-50'
                                    }`}
                                >
                                    {(selected.activo === undefined || selected.activo === 1 || selected.activo === true) ? 'Desactivar' : 'Activar'}
                                </button>
                            </div>
                        </div>
                    </div>
                } />
            )}

            {/* ── Edit modal ── */}
            {editModalOpen && (
                <Modal onClose={() => { setEditModalOpen(false); setEditErrors({}); }} contenido={
                    <div className="flex flex-col gap-5 p-2">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Editar Perfil</h3>
                            <p className="text-sm text-slate-500">Modifica la información del colaborador</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 max-lg:flex max-lg:flex-col">
                            <Input label="Nombres" name="nombres" value={editData.nombres || ''} onChange={handleEditChange} error={editErrors.nombres} />
                            <Input label="Apellidos" name="apellidos" value={editData.apellidos || ''} onChange={handleEditChange} error={editErrors.apellidos} />
                        </div>
                        <Input label="Correo Electrónico" name="email" value={editData.email || ''} onChange={handleEditChange} error={editErrors.email} />
                        <Select label="Rol del Sistema" name="id_rol" defaultValue={editData.id_rol} options={roles} onChange={handleEditChange} error={editErrors.id_rol} />
                        <Select label="Gerencia" name="id_gerencia" defaultValue={editData.id_gerencia} options={gerencias} onChange={handleEditChange} error={editErrors.id_gerencia} />
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => { setEditModalOpen(false); setEditErrors({}); }} className="px-6 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl">Cancelar</button>
                            <button onClick={handleEditSaveClick}
                                className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-100 transition-all">
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                } />
            )}

            {/* ── Create modal ── */}
            {createModalOpen && (
                <Modal onClose={() => { setCreateModalOpen(false); setCreateErrors({}); setCreateData({ id_rol: 4, id_gerencia: '' }); }} contenido={
                    <div className="flex relative flex-col gap-1 p-4 max-lg:overflow-auto">
                        <div className="border-l-4 border-blue-500 pl-4 mb-1">
                            <h3 className="text-xl font-bold text-slate-800">Crear Nuevo Usuario</h3>
                            <p className="text-sm text-slate-500">Ingresa los datos para registrar un colaborador</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 max-lg:flex max-lg:flex-col">
                            <Input label="Nombres" name="nombres" value={createData.nombres || ''} onChange={handleCreateChange} error={createErrors.nombres} />
                            <Input label="Apellidos" name="apellidos" value={createData.apellidos || ''} onChange={handleCreateChange} error={createErrors.apellidos} />
                        </div>
                        <Input label="Correo Electrónico" name="email" value={createData.email || ''} onChange={handleCreateChange} error={createErrors.email} />
                        <div className="grid grid-cols-2 gap-4 max-lg:flex max-lg:flex-col">
                            <Input label="Username" name="username" value={createData.username || ''} autoComplete="off" onChange={handleCreateChange} error={createErrors.username} />
                            <Input label="Contraseña" name="password" type="password" value={createData.password || ''} autoComplete="new-password" onChange={handleCreateChange} error={createErrors.password} />
                        </div>
                        <Select label="Gerencia" required name="id_gerencia" value={createData.id_gerencia || ''} onChange={handleCreateChange} options={gerencias} error={createErrors.id_gerencia} />
                        <Select label="Rol del Sistema" required name="id_rol" value={createData.id_rol} options={roles} onChange={handleCreateChange} error={createErrors.id_rol} />
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => { setCreateModalOpen(false); setCreateErrors({}); setCreateData({ id_rol: 4, id_gerencia: '' }); }} className="px-6 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl">Cancelar</button>
                            <button onClick={submitCreate} className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-100 transition-all">
                                Registrar Usuario
                            </button>
                        </div>
                    </div>
                } />
            )}

            {/* ── Filter modal ── */}
            {filterModalOpen && (
                <Modal onClose={() => setFilterModalOpen(false)} contenido={
                    <div className="flex flex-col gap-5">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                                <Filter size={20} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="text-xl font-extrabold tracking-tight text-slate-900">Filtros de Búsqueda</h3>
                                <p className="text-sm text-slate-500 font-medium">Personaliza los resultados</p>
                            </div>
                        </div>

                        {/* Fields */}
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Buscar por campo</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: 'nombres',  label: 'Nombre'  },
                                        { value: 'email',    label: 'Correo'  },
                                        { value: 'username', label: 'Usuario' },
                                    ].map(op => (
                                        <button
                                            key={op.value}
                                            onClick={() => setTmpColumna(op.value)}
                                            className={`py-2.5 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                                                tmpColumna === op.value
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                                            }`}
                                        >
                                            {op.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {gerencias.length > 0 && (
                                <Select
                                    label="Gerencia / Área"
                                    name="gerencia"
                                    value={tmpGerencia}
                                    onChange={e => setTmpGerencia(e.target.value)}
                                    options={[{ value: '', label: 'Todas las áreas' }, ...gerencias]}
                                />
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-2">
                            <button
                                onClick={clearFilters}
                                className="px-5 py-2.5 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all active:scale-95"
                            >
                                Limpiar todo
                            </button>
                            <button
                                onClick={applyFilters}
                                className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
                            >
                                Aplicar Filtros
                            </button>
                        </div>
                    </div>
                } />
            )}
        </>
    );
};

export default TablaUsuarios;