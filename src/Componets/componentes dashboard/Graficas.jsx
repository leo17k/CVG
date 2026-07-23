import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

 function StatusDashboard({ pieData }) {
  const [activeItem, setActiveItem] = useState(null);

  // Función para centralizar los colores y evitar repetir ternarios largos
  const getStatusColor = (name) => {
    const status = String(name).toUpperCase();
    if (status === 'APROBADO') return '#10b981';
    if (status === 'RECHAZADO') return '#ef4444';
    return '#f59e0b'; // Pendiente
  };

  const onPieEnter = (_, index) => {
    setActiveItem(pieData[index]);
  };

  return (
    <div className="flex items-center w-full h-full">
      {/* LADO IZQUIERDO: El Gráfico */}
      <div style={{ width: '50%', height: '100%' }} className="mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              innerRadius="60%"
              outerRadius="80%"
              paddingAngle={5}
              dataKey="value"
              onMouseEnter={onPieEnter}
              stroke="none"
            >
              {pieData.map((entry, i) => (
                <Cell 
                  key={`cell-${i}`} 
                  fill={getStatusColor(entry.name)} 
                  style={{ outline: 'none'}} 
                />
              ))}
            </Pie>
            <Tooltip  />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* LADO DERECHO: Contenedor Estático de Datos */}
      <div className="w-2/10 flex flex-col justify-center ml-auto mr-5">
        {activeItem ? (
          <>
            <p 
              className="text-[14px] m-0 uppercase font-bold tracking-wider"
              style={{ color: getStatusColor(activeItem.name) }}
            >
              {activeItem.name}
            </p>
            
            <h3 className="text-[28px] font-extrabold my-[2px] text-slate-900 leading-tight">
              {activeItem.value}
            </h3>
            
            <span className="text-[10px] text-gray-400 font-medium uppercase">
              Solicitudes
            </span>

            {/* Leyenda con tus estilos originales corregidos (class -> className) */}
            <div className="flex flex-col gap-2 -ml-5 mt-2 rounded-xl  w-64 text-[11px]">
              <div className="flex items-center space-x-3 px-4">
                <span className="size-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="font-medium text-green-700">Aprobado</span>
              </div>

              <div className="flex items-center space-x-3 px-4">
                <span className="size-2 rounded-full bg-yellow-500 animate-pulse"></span>
                <span className="font-medium text-yellow-700">Pendiente</span>
              </div>

              <div className="flex items-center space-x-3 px-4">
                <span className="size-2 rounded-full bg-red-500 animate-pulse"></span>
                <span className="font-medium text-red-700">Rechazado</span>
              </div>
            </div>
          </>
        ) : (
            <>
          <div className="flex flex-col items-start justify-center h-full">
            <p className="text-[12px] text-gray-400 animate-pulse uppercase tracking-widest">
              Hover para detalles
            </p>
          </div>
          
            <div className="flex flex-col gap-2 -ml-5 mt-2 rounded-xl w-64 text-[11px]">
              <div className="flex items-center space-x-3 px-4">
                <span className="size-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="font-medium text-green-700">Aprobado</span>
              </div>

              <div className="flex items-center space-x-3 px-4">
                <span className="size-2 rounded-full bg-yellow-500 animate-pulse"></span>
                <span className="font-medium text-yellow-700">Pendiente</span>
              </div>

              <div className="flex items-center space-x-3 px-4">
                <span className="size-2 rounded-full bg-red-500 animate-pulse"></span>
                <span className="font-medium text-red-700">Rechazado</span>
              </div>
            </div>
            </>
        )}
      </div>
    </div>
  );
}

export default StatusDashboard;