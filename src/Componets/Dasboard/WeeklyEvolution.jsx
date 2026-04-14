import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp } from 'lucide-react';

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl transition-all duration-200 h-full flex flex-col ${className}`}>
    {children}
  </div>
);

/**
 * WeeklyEvolution
 * Ajustado para evitar que la gráfica se corte en los bordes.
 */
const WeeklyEvolution = ({ timeData = [] }) => {
  const actualData = Array.isArray(timeData) ? timeData : [];

  if (actualData.length === 0) {
    return (
      <div className="w-full h-full min-h-[150px] flex items-center justify-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
        <div className="text-center">
          <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 font-medium text-sm">Cargando datos de evolución...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[350px]">
      <Card className=" border-slate-100">
        <div className="flex items-center gap-2 mb-4 ml-2">

          <TrendingUp size={20} strokeWidth={2.5} className="w-5 h-5 text-blue-500" />
          <h2 className="font-bold text-slate-800">Resumen Anual</h2>
        </div>

        {/* Contenedor del Gráfico con Padding Extra */}
        <div className="flex-1 w-full min-h-[240px] pb-4">
          <ResponsiveContainer width="100%" height="100%">
            {/* Se ajustan los márgenes para que no se corten las etiquetas de los ejes */}
            <AreaChart
              data={actualData}
              margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
            >
              <defs>
                <linearGradient id="colorSol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorApro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />

              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                dy={10} // Desplaza las etiquetas hacia abajo para que no se peguen al eje
              />


              <YAxis
                dataKey="solicitudes"
                yAxisId="left"
                orientation="left"
                stroke="#3b82f6"
                strokeWidth={0.5}
                fillOpacity={1}
                fill="url(#colorSol)"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#8b5cf6"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `$${value / 1000}k`} // Formato compacto
              />

              <Tooltip
                cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                contentStyle={{
                  borderRadius: '16px',
                  border: 'none',
                  backgroundColor: 'rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(2px)',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                  padding: '12px'
                }}
              />

              <Area
                type="monotone"
                dataKey="solicitudes"
                name="Total Solicitudes"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorSol)"
                activeDot={{ r: 6, strokeWidth: 0 }}
              />

              <Area
                type="monotone"
                dataKey="aprobadas"
                name="Aprobadas"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorApro)"
                activeDot={{ r: 6, strokeWidth: 0 }}
              />

              <Area
                type="monotone"
                dataKey="monto_total"
                name="Costo Estimado"
                stroke="#8b5cf6"
                yAxisId="right"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorMonto)"
                activeDot={{ r: 6, strokeWidth: 0 }}
              />

            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-6  px-2 ml-2 shrink-0 border-t border-slate-50 ">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-blue-500" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Solicitudes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aprobadas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-violet-500" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Costo Estimado</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default WeeklyEvolution;