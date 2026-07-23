import React, { useState, useMemo } from 'react';
import { Wrench, Plus, ChevronLeft, ChevronRight, Grid, List, Edit } from 'lucide-react';
import ServiceCard from './ServiceCard';
import { Input } from '../Inputs.jsx';

export default function TablaServicios({
    data = [], visualLoading = false, currentPage = 1, totalPages = 1, onPageChange = () => { },
    openModal = () => { }, setCreateModalOpen = () => { }, isAdmin = false
}) {
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

    const filtered = useMemo(() => {
        const q = (search || '').trim().toLowerCase();
        if (!q) return data || [];
        return (data || []).filter(d => (
            String(d.codigo_servicio || '').toLowerCase().includes(q)
            || String(d.nombre_servicio || '').toLowerCase().includes(q)
            || String(d.descripcion || '').toLowerCase().includes(q)
        ));
    }, [data, search]);

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full animate-in fade-in duration-500">

            {/* Header */}
            <div className="p-4 border-b max-sm:block border-slate-50 flex items-center gap-4 bg-white shrink-0">
                <div className="p-2 bg-blue-50 rounded-lg">
                    <Wrench className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                    <h2 className="font-bold text-slate-800 text-lg">Catálogo de Servicios</h2>
                    <p className="text-xs text-slate-400">Administra los servicios disponibles</p>
                </div>

                <div className="flex items-center gap-3 ml-auto">
                    <div className="">
                        <Input label="Buscar" value={search} onChange={e => setSearch(e.target.value)} className="h-10" />
                    </div>
                    {/* Botón Vista de Tabla / Lista */}

                    <div className=" sm:flex items-center gap-0.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 shadow-sm select-none">

                        <button
                            onClick={() => setViewMode('table')}
                            title="Vista de lista"
                            className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center active:scale-95
      ${viewMode === 'table'
                                    ? 'bg-white text-indigo-600 shadow-sm font-medium'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                                }`}
                        >
                            <List size={16} className={viewMode === 'table' ? 'stroke-[2.5]' : 'stroke-[2]'} />
                        </button>
                        {/* Botón Vista de Grid / Tarjetas */}
                        <button
                            onClick={() => setViewMode('grid')}
                            title="Vista de cuadrícula"
                            className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center active:scale-95
      ${viewMode === 'grid'
                                    ? 'bg-white text-indigo-600 shadow-sm font-medium'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                                }`}
                        >
                            <Grid size={16} className={viewMode === 'grid' ? 'stroke-[2.5]' : 'stroke-[2]'} />
                        </button>
                    </div>

                    <button
                        onClick={() => setCreateModalOpen()}
                        className="ml-3 p-2 px-4 flex items-center rounded-3xl bg-blue-600 text-white hover:bg-blue-700 transition-all gap-2 text-sm font-semibold shadow-lg"
                    >
                        <Plus size={16} strokeWidth={2.2} />
                        <span className='max-sm:hidden'>Nuevo Servicio</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
                {visualLoading ? (
                    <div className="space-y-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-14 rounded bg-slate-100 animate-pulse" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-10 text-center text-slate-400">No se encontraron servicios</div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map(item => (
                            <ServiceCard key={item.codigo_servicio || item.id_servicio} item={item} onEdit={() => openModal(item)} onView={() => openModal(item)} />
                        ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50/50 text-slate-500 uppercase text-[11px] font-bold sticky top-0 z-10">
                                <tr className="border-b border-slate-100">
                                    <th className="px-6 py-3">Código</th>
                                    <th className="px-6 py-3">Nombre</th>
                                    <th className="px-6 py-3">Descripción</th>
                                    <th className="px-6 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((row, idx) => (
                                    <tr key={row.codigo_servicio || idx} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-3 font-mono text-blue-600">{row.codigo_servicio}</td>
                                        <td className="px-6 py-3 font-bold text-slate-700">{row.nombre_servicio}</td>
                                        <td className="px-6 py-3 text-slate-500 italic text-xs truncate max-w-[400px]">{row.descripcion}</td>
                                        <td className="px-6 py-3 text-right">
                                            <button onClick={() => openModal(row)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"><Edit size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Paginación */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <span className="text-xs text-slate-500">Página {currentPage} de {totalPages}</span>
                <div className="flex gap-2">
                    <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1 border rounded disabled:opacity-30 hover:bg-slate-50"><ChevronLeft size={16} /></button>
                    <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="p-1 border rounded disabled:opacity-30 hover:bg-slate-50"><ChevronRight size={16} /></button>
                </div>
            </div>
        </div>
    );
}