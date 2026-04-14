import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Package, Zap, CheckCircle, Clock, ArrowUpRight } from 'lucide-react';

const Card = ({ children, className = "" }) => (
    <div className={`bg-white rounded-2xl border border-slate-200/60 shadow-sm transition-all duration-200 ${className}`}>
        {children}
    </div>
);

const CarInfo = ({ data = [] }) => {
    const colorMap = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        violet: "bg-violet-50 text-violet-600 border-violet-100",
        red: "bg-red-50 text-red-600 border-red-100",
    };

    // Colores reales para el gráfico de pastel
    const PIE_COLORS = {
        blue: '#3b82f6',
        emerald: '#10b981',
        amber: '#f59e0b',
        violet: '#8b5cf6',
        red: '#ef4444'
    };

    if (!data || data.length === 0) return null;

    /**
     * LÓGICA DE DATOS:
     * 'cardsData' incluye todo (incluyendo el Total para mostrar en las tarjetas).
     * 'pieData' filtra el Total para que el gráfico solo muestre la distribución.
     */
    const cardsData = data; // Las tarjetas muestran todo lo que llegue

    const pieData = data
        .filter(item => !['total', 'solicitudes', 'total solicitudes'].includes(item.label.toLowerCase()))
        .map(item => {
            const isAprobado = item.label.toLowerCase().includes('aprobado') || item.label.toLowerCase().includes('aprovado');
            const colorKey = isAprobado ? 'blue' : item.color;

            return {
                name: item.label,
                value: Number(item.value) || 0,
                color: PIE_COLORS[colorKey] || '#cbd5e1'
            };
        });

    // El total del centro se calcula de la suma de las partes del gráfico
    const grandTotal = pieData.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full">

            {/* Columna Izquierda: Primeras 2 tarjetas (pueden incluir el total si está en la data) */}
            <div className="flex flex-col gap-4 flex-1 w-full">
                {cardsData.slice(0, 2).map((item, i) => {
                    const isAprobado = item.label.toLowerCase().includes('aprobado') || item.label.toLowerCase().includes('aprovado');

                    return <StatCard key={i} item={item} colorMap={colorMap} />;
                })}
            </div>

            <div className='absolute bg-white/10 backdrop-blur-sm p-1 rounded-full z-10'>
                <div className="relative flex items-center justify-center shrink-0 group">
                    <div className="h-[80px] w-[80px] overflow-visible">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
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
                        </ResponsiveContainer>
                    </div>

                    {/* Centro del Donut: Suma de los estados mostrados */}
                    <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xl font-black text-slate-800 leading-none">
                            {grandTotal}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Total</span>
                    </div>
                </div>
            </div>


            {/* Columna Derecha: Resto de las tarjetas */}
            <div className="flex flex-col gap-4 flex-1 w-full">
                {cardsData.slice(2, 5).map((item, i) => {
                    const isAprobado = item.label.toLowerCase().includes('aprobado') || item.label.toLowerCase().includes('aprovado');
                    const colorKey = isAprobado ? 'blue' : item.color;
                    return <StatCard key={i} item={item} colorKey={colorKey} colorMap={colorMap} />;
                })}
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