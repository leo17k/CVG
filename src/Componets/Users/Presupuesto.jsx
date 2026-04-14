import React, { useState } from 'react';
import { ChartNoAxesColumn } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';

const DashboardPresupuesto = ({ gerencias = [] }) => {
    const [filtro, setFiltro] = useState('todas');

    // Procesamiento de datos con lógica de alertas
    const rawData = gerencias.map(g => {
        const presupuesto = Number(g.presupuesto_asignado);
        const gastado = Number(g.total_gastado);
        const porcentaje = ((gastado / presupuesto) * 100);

        return {
            name: gerencias.length > 4
                ? g.nombre_gerencia.substring(0, 4).toUpperCase() + '.'
                : g.nombre_gerencia,
            fullName: g.nombre_gerencia,
            Asignado: presupuesto,
            Gastado: gastado,
            porcentaje: porcentaje.toFixed(1),
            isCritico: porcentaje > 90
        };
    });

    // Verificamos si existen críticas para bloquear el botón
    const tieneCriticas = rawData.some(item => item.isCritico);

    // Filtro interactivo
    const data = rawData.filter(item => {
        if (filtro === 'criticas') return item.isCritico;
        return true;
    });

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-white/50 p-4 shadow-2xl border border-slate-100 backdrop-blur-[2px] rounded-2xl">
                    <p className="font-bold mb-2 ">{d.fullName}</p>
                    <div className="space-y-1 text-sm">
                        <p className="text-[#51a2ff] font-bold flex justify-between gap-6">
                            <span>Asignado:</span>
                            <span>${d.Asignado.toLocaleString('de-DE')}</span>
                        </p>
                        <p className={`${d.isCritico ? 'text-red-500' : 'text-[#1b64ad]'} font-bold flex justify-between gap-6`}>
                            <span>Gasto:</span>
                            <span>${d.Gastado.toLocaleString('de-DE')}</span>
                        </p>
                        <div className="mt-2 pt-2 ">
                            <span className={`text-[10px] font-black uppercase ${d.isCritico ? 'text-red-600 animate-pulse' : 'text-slate-400'}`}>
                                {d.isCritico ? 'NIVEL CRÍTICO: ' : 'EJECUCIÓN: '}{d.porcentaje}%
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className='flex gap-2 items-center'>
                    <ChartNoAxesColumn className="w-5 h-5 text-blue-500" />
                    <h2 className="font-bold text-slate-800 whitespace-nowrap">Presupuesto Anual</h2>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-full border border-slate-200">
                    {/* Botón Todas */}
                    <button
                        onClick={() => setFiltro('todas')}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${filtro === 'todas'
                            ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
                            : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        todas
                    </button>

                    {/* Botón Críticas con bloqueo lógico */}
                    <button
                        disabled={!tieneCriticas}
                        onClick={() => setFiltro('criticas')}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all flex items-center gap-2 ${filtro === 'criticas'
                            ? 'bg-white text-red-600 shadow-sm ring-1 ring-slate-200'
                            : !tieneCriticas
                                ? 'opacity-30 cursor-not-allowed text-slate-300'
                                : 'text-slate-400 hover:text-red-500'
                            }`}
                        title={!tieneCriticas ? "No hay gerencias excedidas" : "Ver críticas"}
                    >
                        críticas
                        {tieneCriticas && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping"></span>}
                    </button>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={-25}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 600 }}
                            tickFormatter={(v) => `$${v / 1000}k`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />

                        <ReferenceLine
                            y={Math.max(...rawData.map(d => d.Asignado)) * 0.9}
                            stroke="#fee2e2"
                            strokeDasharray="5 5"
                            label={{ position: 'right', value: 'Límite', fill: '#ef4444', fontSize: 8, fontWeight: 900 }}
                        />

                        <Bar
                            dataKey="Asignado"
                            fill="#51a2ff"
                            radius={[12, 12, 0, 0]}
                            barSize={gerencias.length > 4 ? 28 : 48}
                            opacity={0.2}
                        />

                        <Bar
                            dataKey="Gastado"
                            radius={[10, 10, 0, 0]}
                            barSize={gerencias.length > 4 ? 16 : 32}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.isCritico ? '#ef4444' : '#1b64ad'}
                                    className="transition-all duration-700"
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex flex-wrap gap-6 justify-center ">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-1.5 rounded-full bg-blue-100"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Presupuesto</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-1.5 rounded-full bg-[#1b64ad]"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gasto Normal</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Gasto Crítico (+90%)</span>
                </div>
            </div>
        </div>
    );
};

export default DashboardPresupuesto;