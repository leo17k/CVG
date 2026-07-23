import React, { useState, useEffect } from 'react';
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';

const TablaGerencias = ({ gerencias = [], loading = false, currentPage = 1, totalPages = 1, onPageChange }) => {
    const [visualLoading, setVisualLoading] = useState(true);

    useEffect(() => {
        if (loading) {
            setVisualLoading(true);
        } else {
            const timer = setTimeout(() => {
                setVisualLoading(false);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [loading, currentPage]);

    return (
        <div className="g:col-span-7 h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full animate-in fade-in duration-700">
            <div className="p-4 border-b border-slate-50 overflow-x-auto custom-scrollbar flex items-center gap-3 shrink-0">
                <Building2 className="w-5 h-5 text-blue-500" />
                <h2 className="font-bold text-slate-800 whitespace-nowrap">Listado de Gerencias</h2>
            </div>

            <div className="overflow-x-auto flex-1 custom-scrollbar">
                <table className="w-full text-left text-sm custom-scrollbar border-collapse">
                    <thead className="bg-slate-50/50 z-20 text-slate-500 uppercase text-[10px] font-bold sticky top-0">
                        <tr className="border-b border-slate-100">
                            <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80 whitespace-nowrap">Centro de costo</th>
                            <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80 whitespace-nowrap">Gerencia</th>
                            <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80 whitespace-nowrap text-right">Presupuesto</th>
                            <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80 whitespace-nowrap text-right">Total gastado</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                        {visualLoading ? (
                            [...Array(6)].map((_, i) => (
                                <tr key={i}>
                                    {[...Array(4)].map((_, j) => (
                                        <td key={j} className="px-6 py-4">
                                            <div className="h-4 bg-slate-100 rounded animate-pulse w-full"></div>
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (gerencias && gerencias.length > 0) ? (
                            gerencias.map((gerencia) => (
                                <tr key={gerencia.id_gerencia} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors duration-200 group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <span className="text-blue-500 font-bold mr-1.5 opacity-70 group-hover:opacity-100">#</span>
                                            <span className="text-slate-700 font-medium">{gerencia.codigo_centro}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-semibold text-slate-800 truncate max-w-[200px]" title={gerencia.nombre_gerencia}>
                                            {gerencia.nombre_gerencia}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                                            ${Number(gerencia.presupuesto_asignado).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-sm font-bold ${Number(gerencia.total_gastado) > Number(gerencia.presupuesto_asignado) ? 'text-red-500' : 'text-slate-600'}`}>
                                                ${Number(gerencia.total_gastado).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                            </span>
                                            {/* Barra de progreso visual */}
                                            <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${Number(gerencia.total_gastado) > Number(gerencia.presupuesto_asignado) ? 'bg-red-400' : 'bg-blue-400'}`}
                                                    style={{ width: `${Math.min((gerencia.total_gastado / gerencia.presupuesto_asignado) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="px-6 py-10 text-center text-slate-400">No hay gerencias disponibles</td>
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
        </div>
    );
};

export default TablaGerencias;
