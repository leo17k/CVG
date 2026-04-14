import React from 'react';

const ActionCard = ({ title = 'Acción rápida', onClick, children }) => {
  return (
    <div className="p-4 rounded-lg shadow-sm min-w-[220px] bg-white border">
      <div className="text-sm font-semibold mb-2">{title}</div>
      <div className="mb-3">{children}</div>
      <button onClick={onClick} className="px-3 py-1 bg-blue-600 text-white rounded">Ejecutar</button>
    </div>
  );
};

export default ActionCard;
