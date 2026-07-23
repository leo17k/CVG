import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, CheckCircle2, XCircle, Clock, Package, User, Calendar, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '../Componets/GoeyToaster';
import ConfirmationModal from '../Componets/Confirmacion';

// ── Badge de estado con color dinámico ───────────────────────────────────
const EstadoBadge = ({ nombre, color }) => (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg"
        style={{ background: (color || '#8b5cf6') + '22', color: color || '#8b5cf6' }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color || '#8b5cf6' }} />
        {nombre}
    </span>
);

// ── Card de solicitud en Compras ──────────────────────────────────────────
const SolicitudCard = ({ row, onFinalizar, onRechazar }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden animate-in fade-in duration-300">
            {/* Header */}
            <div className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: (row.estado_color || '#8b5cf6') + '22' }}>
                        <ShoppingCart className="w-5 h-5" style={{ color: row.estado_color || '#8b5cf6' }} />
                    </div>
                    <div className="min-w-0">
                        <p className="font-black text-slate-800 text-sm truncate">
                            #{row.id_solicitud} — {row.resumen}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{row.nombre_gerencia}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <EstadoBadge nombre={row.tipo_solicitud} color={row.estado_color} />
                    <button onClick={() => setExpanded(p => !p)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {/* Detalle expandible */}
            {expanded && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3 flex flex-col gap-3 animate-in fade-in duration-200">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-50 rounded-xl p-3">
                            <span className="text-slate-400 font-bold uppercase block mb-1 text-[10px]">Solicitado por</span>
                            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                <User size={12} /> {row.nombre_completo}
                            </span>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                            <span className="text-slate-400 font-bold uppercase block mb-1 text-[10px]">Fecha</span>
                            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                <Calendar size={12} /> {new Date(row.fecha_creacion).toLocaleDateString('es-VE')}
                            </span>
                        </div>
                        {row.cantidad && (
                            <div className="bg-slate-50 rounded-xl p-3">
                                <span className="text-slate-400 font-bold uppercase block mb-1 text-[10px]">Cantidad</span>
                                <span className="font-semibold text-slate-700">{row.cantidad} {row.unidad || ''}</span>
                            </div>
                        )}
                    </div>
                    {row.justificacion && (
                        <div className="bg-slate-50 rounded-xl p-3 text-xs">
                            <span className="text-slate-400 font-bold uppercase block mb-1 text-[10px]">Justificación</span>
                            <p className="text-slate-600 leading-relaxed line-clamp-3">{row.justificacion}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Acciones */}
            <div className="px-4 pb-4 flex gap-2">
                <button
                    onClick={() => onFinalizar(row)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow shadow-violet-100">
                    <CheckCircle2 size={14} />
                    Finalizar compra
                </button>
                <button
                    onClick={() => onRechazar(row)}
                    className="px-4 flex items-center justify-center gap-2 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-all active:scale-95 border border-red-100">
                    <XCircle size={14} />
                    Rechazar
                </button>
            </div>
        </div>
    );
};

// ── Página principal de Compras ───────────────────────────────────────────
const ComprasPage = () => {
    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [confirmFinalizar, setConfirmFinalizar] = useState(null);
    const [confirmRechazar, setConfirmRechazar] = useState(null);

    // use global toast

    const fetchSolicitudes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`http://${window.location.hostname}:5000/solicitudes/compras`, { credentials: 'include' });
            if (res.ok) {
                const j = await res.json();
                setSolicitudes(j.data || []);
            }
            } catch (e) {
            console.error(e);
            toast.error('Error — No se pudo conectar al servidor.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSolicitudes(); }, [fetchSolicitudes]);

    const cambiarEstado = async (row, estado) => {
        try {
            const res = await fetch(`http://${window.location.hostname}:5000/solicitudes/${row.id_solicitud}/estado`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado })
            });
            if (res.ok) {
                const j = await res.json();
                toast.success(`${estado === 'Finalizado' ? '✅ Compra finalizada' : '❌ Solicitud rechazada'} — La solicitud #${row.id_solicitud} fue actualizada a: ${j.estado || estado}.`);
                fetchSolicitudes();
            } else {
                const j = await res.json();
                toast.error(`Error — ${j.message || 'No se pudo actualizar el estado.'}`);
            }
        } catch (e) {
            toast.error('Error de red — No se pudo conectar al servidor.');
        }
        setConfirmFinalizar(null);
        setConfirmRechazar(null);
    };

    return (
        <>
            {/* toasts handled globally by GoeyToaster */}

            {/* Confirmación Finalizar */}
            <ConfirmationModal
                isOpen={!!confirmFinalizar}
                type="question"
                title="¿Finalizar compra?"
                message={`La solicitud #${confirmFinalizar?.id_solicitud} "${confirmFinalizar?.resumen}" será marcada como Finalizada.`}
                onConfirm={() => cambiarEstado(confirmFinalizar, 'Finalizado')}
                onCancel={() => setConfirmFinalizar(null)}
            />

            {/* Confirmación Rechazar */}
            <ConfirmationModal
                isOpen={!!confirmRechazar}
                type="warning"
                title="¿Rechazar solicitud?"
                message={`La solicitud #${confirmRechazar?.id_solicitud} "${confirmRechazar?.resumen}" será rechazada. Esta acción no se puede deshacer.`}
                onConfirm={() => cambiarEstado(confirmRechazar, 'Rechazado')}
                onCancel={() => setConfirmRechazar(null)}
            />

            <div className="z-10 ml-[60px] max-lg:ml-0 h-[calc(100dvh-60px)] bg-gray-50 flex overflow-hidden">
                <div className="flex flex-col w-full h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden m-2">

                    {/* Header */}
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                                <ShoppingCart className="w-5 h-5 text-violet-600" />
                            </div>
                            <div>
                                <h1 className="font-black text-slate-800 text-lg leading-tight">Compras</h1>
                                <p className="text-xs text-slate-400">Solicitudes en proceso de procura</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Contador */}
                            <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-4 py-2">
                                <Clock className="w-4 h-4 text-violet-500" />
                                <span className="text-sm font-black text-violet-700">{solicitudes.length}</span>
                                <span className="text-xs text-violet-500 font-medium">pendientes</span>
                            </div>
                            {/* Refresh */}
                            <button onClick={fetchSolicitudes} disabled={loading}
                                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50">
                                <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col gap-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : solicitudes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center py-20">
                                <div className="w-20 h-20 rounded-3xl bg-violet-50 border-2 border-dashed border-violet-200 flex items-center justify-center mb-6">
                                    <Package className="w-10 h-10 text-violet-300" />
                                </div>
                                <p className="font-black text-slate-700 text-lg">Todo al día</p>
                                <p className="text-slate-400 text-sm mt-2 max-w-xs">
                                    No hay solicitudes en proceso de compra en este momento.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                {solicitudes.map(row => (
                                    <SolicitudCard
                                        key={row.id_solicitud}
                                        row={row}
                                        onFinalizar={setConfirmFinalizar}
                                        onRechazar={setConfirmRechazar}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ComprasPage;
