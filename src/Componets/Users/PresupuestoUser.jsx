import React from 'react';
import { User } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Avatar, AvatarImage, AvatarFallback } from '../Avatar';

const DashboardGastoPorUsuario = ({ usuarios = [] }) => {

    // Procesamiento de datos para la gráfica
    const data = usuarios
        .map(u => {
            const ppto = Number(u.presupuesto_asignado || 0);
            const gasto = Number(u.total_gastado || 0);
            const porcentaje = ppto > 0 ? (gasto / ppto) * 100 : 0;

            return {
                name: `${u.nombres.split(' ')[0]} ${u.apellidos.charAt(0)}.`,
                fullName: `${u.nombres} ${u.apellidos}`,
                Asignado: ppto,
                Gastado: gasto,
                porcentaje: porcentaje.toFixed(1),
                isCritico: porcentaje > 90,
                avatar: u.avatar
            };
        })
        .sort((a, b) => b.Gastado - a.Gastado)
        .slice(0, 6); // Top 6 para que no se amontone

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-white p-4 shadow-xl border border-slate-100 rounded-2xl">
                    <p className="font-bold text-slate-800 mb-1">{d.fullName}</p>
                    <p className="text-[10px] font-black text-indigo-500 uppercase mb-2">Ejecución: {d.porcentaje}%</p>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between gap-4 text-slate-500">
                            <span>Presupuesto:</span>
                            <span className="font-bold">${d.Asignado.toLocaleString('de-DE')}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-slate-800">
                            <span>Total Gastado:</span>
                            <span className={`font-black ${d.isCritico ? 'text-red-500' : 'text-indigo-600'}`}>
                                ${d.Gastado.toLocaleString('de-DE')}
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 rounded-xl">
                        <User className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Análisis por Responsable</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Top Ejecución Presupuestaria</p>
                    </div>
                </div>
            </div>

            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        barSize={12}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                            width={100}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />

                        {/* Barra de fondo (Presupuesto total opaco) */}
                        <Bar dataKey="Asignado" fill="#e2e8f0" radius={[0, 10, 10, 0]} background={{ fill: '#f1f5f9', radius: 10 }} />

                        {/* Barra de Gasto Real */}
                        <Bar dataKey="Gastado" radius={[0, 10, 10, 0]}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.isCritico ? '#ef4444' : '#6366f1'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-6 flex justify-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Gasto Normal</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Crítico (+90%)</span>
                </div>
            </div>
        </div>
    );
};

export default DashboardGastoPorUsuario;