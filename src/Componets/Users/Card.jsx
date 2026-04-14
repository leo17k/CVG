import React from 'react';
import { Package, Clock, Leaf, TrendingDown } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, subtext, colorClass }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 flex-1 min-w-[200px]">
        <div className={`w-10 h-10 rounded-2xl ${colorClass} flex items-center justify-center shadow-inner`}>
            <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <h4 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h4>
            <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase">{subtext}</p>
        </div>
    </div>
);

const ResumenLogisticoStats = ({ solicitudes = [], ahorroSolar = 0 }) => {
    // Lógica simple para los contadores
    const pendientes = solicitudes.filter(s => s.estado === 'Pendiente').length;
    const enProceso = solicitudes.filter(s => s.estado === 'En Proceso').length;

    return (
        <div className="w-full flex flex-wrap gap-4 mb-6">

            {/* KPI Conexión con Tesis (Fotovoltaico) */}
            <StatCard
                icon={Leaf}
                label="Eficiencia"
                value={`${solicitudes.length * 10}%`}
                subtext="Optimización 850 NV"
                colorClass="bg-emerald-500"
            />

            <StatCard
                icon={TrendingDown}
                label="Ahorro Proyectado"
                value="$1,240"
                subtext="Mes de Marzo - Cabelum"
                colorClass="bg-slate-800"
            />
        </div>
    );
};

export default ResumenLogisticoStats;