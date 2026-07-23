import React, { useEffect } from 'react';
import { useAuth } from '../../Constext/AuthToken';

const SectionCard = ({ section = 'General', description = '', count = 0 }) => {
  const { isAuthenticated, getDataUser, datauser } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !datauser) getDataUser();
  }, [isAuthenticated, datauser, getDataUser]);

  const name = datauser?.data?.name || 'Invitado';
  const role = datauser?.data?.rol || '—';
  const expires = datauser?.data?.expires ? new Date(datauser.data.expires).toLocaleDateString() : null;

  return (
    <div className="flex flex-col h-full p-3 rounded-xl border border-gray-200 bg-white shadow-sm max-w-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">{name.charAt(0).toUpperCase()}</div>
        <div className="flex-1">
          <div className="text-sm font-semibold truncate">{name}</div>
          <div className="text-xs text-slate-500">{role}</div>
        </div>
      </div>
    
      {expires && <div className="mt-2 text-[11px] w-full flex justify-center text-slate-400">Expira: {datauser.data.expires.toLocaleString('es-VE', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</div>}
    </div>
  );
};

export default SectionCard;
