import React, { useEffect, useState } from 'react';

const PermisosPage = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:5000/permisos/modules`, { credentials: 'include' });
      if (res.ok) {
        const j = await res.json();
        setModules(j.data || []);
      }
    } catch (err) {
      console.error(err);
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchModules(); }, []);

  return (
  <div className="z-12 ml-[60px] overflow-y-auto  max-lg:ml-0 h-[calc(100dvh-60px)] bg-slate-50 flex flex-col p-6 lg:p-10">
  
      <h1 className="text-2xl font-bold mb-4">Permisos por Módulo</h1>
      {loading && <div className="text-sm text-slate-500">Cargando...</div>}

      <div className="grid gap-4">
        {modules.map(mod => (
          <div key={mod.id_modulo} className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">{mod.nombre_modulo || 'General'}</h3>
              <span className="text-xs text-slate-400">{(mod.permisos || []).length} permisos</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(mod.permisos || []).map(p => (
                <div key={p.id_permiso} className="p-2 rounded hover:bg-slate-50 border">
                  <div className="font-medium">{p.nombre_permiso || p.accion}</div>
                  {p.descripcion && <div className="text-xs text-slate-400">{p.descripcion}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PermisosPage;
