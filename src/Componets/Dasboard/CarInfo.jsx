import React from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { Package, Zap, CheckCircle, Clock, ArrowUpRight } from 'lucide-react';

const Card = ({ children, className = "" }) => (
    <div className={`bg-white rounded-2xl border border-slate-200/60 shadow-sm transition-all duration-200 ${className}`}>
        {children}
    </div>
);

const CarInfo = ({ data = {} }) => {
    const colorMap = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        violet: "bg-violet-50 text-violet-600 border-violet-100",
        red: "bg-red-50 text-red-600 border-red-100",
        cyan: "bg-cyan-50 text-cyan-600 border-cyan-100",
    };

    const PIE_COLORS = {
        blue: '#3b82f6',
        emerald: '#10b981',
        amber: '#f59e0b',
        violet: '#8b5cf6',
        red: '#ef4444',
        cyan: '#06b6d4'
    };

    const isStatsObject = data && typeof data === 'object' && !Array.isArray(data);
    const sourceCounts = isStatsObject ? (data.counts || data) : {};
    const fallbackTotal = Array.isArray(data) ? data.length : 0;

    if (!data) return null;

    const counts = {
        pendiente: Number(sourceCounts?.pendientes ?? sourceCounts?.pendiente ?? 0),
        en_compras: Number(sourceCounts?.en_compras ?? 0),
        finalizados: Number(sourceCounts?.finalizados ?? 0),
        aprobado: Number(sourceCounts?.aprobados ?? sourceCounts?.aprobado ?? 0),
        rechazado: Number(sourceCounts?.rechazados ?? sourceCounts?.rechazado ?? 0),
        total: Number(data?.total ?? sourceCounts?.total ?? sourceCounts?.total_unificado ?? fallbackTotal)
    };
    const cards = [
        { 
            id: 'total', 
            label: 'Total Solicitudes', 
            value: counts.total, 
            icon: ArrowUpRight, 
            color: 'blue' 
        },
        { 
            id: 'pendientes', 
            label: 'Pendientes', 
            value: counts.pendiente, 
            icon: Clock, 
            color: 'amber' 
        },

        {
            id: 'en_compras', 
            // Manteniendo tu lógica: Compras + Aprobado (puedes ajustar la suma si el backend cambia la regla)
            label: 'Compras', 
            value: counts.en_compras , 
            icon: Package, 
            color: 'violet'
        },
          { 
            id: 'aprobadas_gerencia', 
            label: 'Aprobadas por Gerencia', 
            value: counts.aprobado, 
            icon: CheckCircle, 
            color: 'cyan' 
        },
        { 
            id: 'rechazados', 
            label: 'Rechazados', 
            value: counts.rechazado, 
            icon: Zap, 
            color: 'red' 
        },
        { 
            id: 'aprobadas', 
            label: 'Aprobadas', 
            value: counts.finalizados, 
            icon: CheckCircle, 
            color: 'emerald' 
        },
         { 
            id: 'Total', 
            label: 'Total', 
            value: counts.total, 
            icon: ArrowUpRight, 
            color: 'blue' 
        }
    ];

    // Datos para el gráfico de pastel: excluimos la tarjeta "Total" del pieData para que el donut muestre solo segmentos reales
 const pieData = cards
    .slice(1)
    .filter(item => item.label !== 'Total Solicitudes' && item.label !== 'Total')
    .map(item => ({
        name: item.label,
        value: item.value,
        color: PIE_COLORS[item.color] || '#cbd5e1'
    }));
    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full relative">

            {/* Columna Izquierda: Pendientes y Compras + Aprobado */}
            <div className="flex flex-col gap-4 flex-1 w-full">
                {cards.slice(1, 4).map((item) => (
                    <StatCard key={item.id} item={item} colorMap={colorMap} />
                ))}
            </div>

            {/* Centro: Gráfico de Dona */}
            <div className='bg-white/10 md:absolute static backdrop-blur-sm p-1 rounded-full z-10 mx-auto md:mx-0 flex justify-center items-center shrink-0'>
                <div className="relative flex items-center justify-center shrink-0 group">
                    <div className="h-20 w-20 overflow-visible">
                        <PieChart width={80} height={80}>
                            <Pie
                                data={pieData}
                                innerRadius={30}
                                outerRadius={40}
                                paddingAngle={6}
                                dataKey="value"
                                stroke="none"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                        className="hover:opacity-80 transition-opacity outline-none"
                                    />
                                ))}
                            </Pie>
                        </PieChart>
                    </div>

                    {/* Centro del Donut: Total General */}
                    <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xl font-black text-slate-800 leading-none">
                            {counts.total}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Total</span>
                    </div>
                </div>
            </div>

            {/* Columna Derecha: Rechazados y Aprobadas */}
            <div className="flex flex-col gap-4 flex-1 w-full">
                {cards.slice(4).map((item) => (
                    <StatCard key={item.id} item={item} colorKey={item.color} colorMap={colorMap} />
                ))}
            </div>

        </div>
    );
};

// Sub-componente para las tarjetas de estadísticas
const StatCard = ({ item, colorKey, colorMap }) => {
    const finalColorKey = colorKey || item.color;
    return (
        <Card className="py-3 px-4 flex items-center gap-4 relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 size-16 rounded-full opacity-0 group-hover:opacity-10 transition-opacity ${colorMap[finalColorKey]?.split(' ')[0]}`} />
            <div className={`p-2 rounded-xl border ${colorMap[finalColorKey]} shrink-0 shadow-sm bg-white`}>
                <item.icon size={14} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5 gap-2">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider leading-none truncate">{item.label}</p>
                    {item.trend && (
                        <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100 flex items-center shrink-0">
                            <ArrowUpRight size={10} className="mr-0.5" />{item.trend}
                        </span>
                    )}
                </div>
                <p className="text-sm font-black text-slate-800 tracking-tighter tabular-nums">{item.value}</p>
            </div>
        </Card>
    );
};

export default CarInfo;