import React from 'react';

const StatCard = ({ title = 'Estadística', value = '0', color = 'bg-indigo-600' }) => {
  return (
    <div className={`p-4 rounded-lg shadow-sm min-w-[220px] ${color} text-white`}>
      <div className="text-xs uppercase font-semibold opacity-90">{title}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
};

export default StatCard;
