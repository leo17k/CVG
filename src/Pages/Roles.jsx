import React, { useEffect, useState, useCallback, useMemo } from 'react';
import RolePermissions from '../Componets/Users/RolePermissions.jsx';
import { toast } from '../Componets/GoeyToaster';
import ConfirmationModal from '../Componets/Confirmacion.jsx';

const RolesPage = () => {
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [originalPerms, setOriginalPerms] = useState([]);  // permisos al cargar el rol
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePerms, setNewRolePerms] = useState([]);


  // ¿Hay cambios pendientes respecto a lo que se cargó del servidor?
  const hasChanges = useMemo(() => {
    const a = [...selectedPerms].sort((x, y) => x - y);
    const b = [...originalPerms].sort((x, y) => x - y);
    return a.length !== b.length || a.some((v, i) => v !== b[i]);
  }, [selectedPerms, originalPerms]);

  // use global toast (GoeyToaster) via `toast` import

  const fetchRoles = async () => {
    const res = await fetch(`http://${window.location.hostname}:5000/roles`, { credentials: 'include' });
    if (res.ok) {
      const j = await res.json();
      setRoles(j.data || []);
    }
  };

  const fetchModules = async () => {
    const res = await fetch(`http://${window.location.hostname}:5000/permisos/modules`, { credentials: 'include' });
    if (res.ok) {
      const j = await res.json();
      setModules(j.data || []);
    }
  };

  const fetchRoleDetails = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:5000/roles/${id}`, { credentials: 'include' });
      if (res.ok) {
        const j = await res.json();
        setSelectedRole(j.data);
        const perms = (j.data.permisos || []).map(p => p.id_permiso);
        setSelectedPerms(perms);
        setOriginalPerms(perms); // guardar referencia para comparar
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchModules();
  }, []);

  useEffect(() => {
    if (selectedRole) fetchRoleDetails(selectedRole.id_rol);
  }, [selectedRole && selectedRole.id_rol]);

  const handleSave = async () => {
    if (!selectedRole) return;
    setShowConfirm(false);
    const res = await fetch(`http://${window.location.hostname}:5000/roles/${selectedRole.id_rol}/permissions`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permisos: selectedPerms })
    });
    if (res.ok) {
      setOriginalPerms([...selectedPerms]); // actualizar referencia tras guardar
      toast.success(`Permisos guardados `, { description: `Los permisos de "${selectedRole.nombre_rol}" fueron actualizados correctamente.` });
    } else {
      const j = await res.json();
      toast.error(`Error al guardar `, { description: `${j.error || 'Ocurrió un error desconocido.'}` });
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName || newRoleName.trim() === '') {
      return toast.error(`Error al crear rol `, { description: `El nombre del rol no puede estar vacío.` });
    }
    try {
      // 1) crear rol
      const resCreate = await fetch(`http://${window.location.hostname}:5000/roles`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_rol: newRoleName.trim() })
      });
      if (!resCreate.ok) {
        const j = await resCreate.json();
        return toast.error(`Error al crear rol `, { description: `${j.error || resCreate.statusText}` });
      }
      const created = await resCreate.json();
      const newId = created.id;

      // 2) asignar permisos si hay
      if (newRolePerms && newRolePerms.length > 0) {
        const resSync = await fetch(`http://${window.location.hostname}:5000/roles/${newId}/permissions`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permisos: newRolePerms })
        });
        if (!resSync.ok) {
          const j = await resSync.json();
          toast.warn(`Rol creado con advertencia `, { description: `Permisos no pudieron asignarse: ${j.error || resSync.statusText}` });
        }
      }

      // 3) refrescar lista y seleccionar el nuevo rol
      await fetchRoles();
      const r = roles.find(x => Number(x.id_rol) === Number(newId));
      if (r) setSelectedRole(r);
      setShowCreate(false);
      setNewRoleName('');
      setNewRolePerms([]);
      toast.success(`Rol creado `, { description: `El rol "${newRoleName.trim()}" fue creado y activado correctamente.` });
    } catch (err) {
      console.error(err);
      toast.error('Error inesperado ', { description: `Ocurrió un error al intentar crear el rol.` });
    }
  };

  return (
    <>
      <div className="ml-[60px] max-lg:ml-0 h-[calc(100dvh-60px)] bg-slate-100 flex flex-col font-sans overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-4 md:px-8 md:py-5 bg-white border-b border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Accesos <span className="text-indigo-600">&</span> Privilegios
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Gestiona roles y sus permisos de sistema en un solo lugar.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(s => !s)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${showCreate
              ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
              }`}
          >
            {showCreate ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                Cancelar
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                Nuevo Rol
              </>
            )}
          </button>
        </header>

        {/* ── Split Layout ────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden gap-4 p-2 md:p-4">

          {/* ── Panel Izquierdo: Lista de Roles ──────────────────── */}
          <aside className={`${(selectedRole || showCreate) ? 'hidden md:flex' : 'flex'} w-full md:w-72 flex-shrink-0 flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden`}>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Roles del sistema</span>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                {roles.length}
              </span>
            </div>

            {/* Formulario de creación inline */}
            {showCreate && (
              <div className="p-4 border-b border-slate-100 bg-indigo-50/50 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">Nuevo rol</p>
                <input
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateRole()}
                  placeholder="Nombre del rol..."
                  className="w-full px-3 py-2.5 text-sm border-2 border-indigo-200 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none transition-all bg-white font-medium placeholder:text-slate-300"
                  autoFocus
                />
                <button
                  onClick={handleCreateRole}
                  className="mt-3 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all active:scale-95 shadow shadow-indigo-200"
                >
                  Crear y asignar permisos
                </button>
              </div>
            )}

            {/* Lista scrollable de roles */}
            <ul className="flex-1 overflow-y-auto custom-scrollbar py-2">
              {roles.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-slate-400">
                  No hay roles registrados.
                </li>
              )}
              {roles.map(r => {
                const isActive = selectedRole && String(selectedRole.id_rol) === String(r.id_rol);
                return (
                  <li key={r.id_rol}>
                    <button
                      onClick={() => {
                        setShowCreate(false);
                        setSelectedRole(r);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 group
                        ${isActive
                          ? 'bg-indigo-600 text-white'
                          : 'hover:bg-slate-50 text-slate-700'
                        }`}
                    >
                      <div className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-xs font-black
                        ${isActive ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'}`}>
                        {r.nombre_rol.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>
                          {r.nombre_rol}
                        </p>
                        <p className={`text-xs truncate ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                          ID: {r.id_rol}
                        </p>
                      </div>
                      {isActive && (
                        <svg className="w-4 h-4 text-indigo-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* ── Panel Derecho: Permisos ──────────────────────────── */}
          <main className={`${(selectedRole || showCreate) ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden`}>

            {/* Sin selección */}
            {!selectedRole && !showCreate && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center mb-5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-700">Selecciona un rol</h3>
                <p className="text-slate-400 text-sm mt-1 max-w-xs">
                  Elige un rol de la lista para configurar su matriz de permisos.
                </p>
              </div>
            )}

            {/* Modo creación: permisos del nuevo rol */}
            {showCreate && (
              <div className="flex flex-col h-full animate-in fade-in duration-300">
                <div className="flex-shrink-0 px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <button 
                      onClick={() => { setShowCreate(false); }}
                      className="md:hidden flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-black mb-2 uppercase tracking-wider"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                      Volver a la lista
                    </button>
                    <h2 className="text-lg font-black text-slate-800">Permisos iniciales</h2>
                    <p className="text-slate-400 text-sm">Selecciona los accesos para el nuevo rol.</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                    Nuevo rol
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <RolePermissions modules={modules} selected={newRolePerms} onChange={setNewRolePerms} />
                </div>
              </div>
            )}

            {/* Modo edición: permisos del rol seleccionado */}
            {selectedRole && !showCreate && (
              <div className="flex flex-col h-full animate-in fade-in duration-300">
                {/* Sub-header */}
                <div className="flex-shrink-0 px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <button 
                      onClick={() => { setSelectedRole(null); }}
                      className="md:hidden flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-black mb-2 uppercase tracking-wider"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                      Volver a la lista
                    </button>
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                      {selectedRole.nombre_rol}
                    </h2>
                    <p className="text-slate-400 text-sm">
                      Matriz de acceso · Los cambios afectan a todos los usuarios con este rol.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {loading && (
                      <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                    )}
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
                      ID {selectedRole.id_rol}
                    </span>
                  </div>
                </div>

                {/* Permisos scrollables */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <RolePermissions
                    modules={modules}
                    selected={selectedPerms}
                    onChange={setSelectedPerms}
                  />
                </div>

                {/* Footer sticky de acciones */}
                <div className="flex-shrink-0 px-8 py-4 border-t border-slate-100 bg-slate-50/80 backdrop-blur flex items-center gap-3">
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={!hasChanges}
                    className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all
                      ${hasChanges
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow shadow-emerald-200 active:scale-95'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {hasChanges ? 'Guardar cambios' : 'Sin cambios'}
                  </button>
                  <button
                    onClick={() => setSelectedPerms([...originalPerms])}
                    disabled={!hasChanges}
                    className={`px-6 py-2.5 border-2 text-sm font-bold rounded-xl transition-all
                      ${hasChanges
                        ? 'border-slate-200 text-slate-500 hover:bg-white'
                        : 'border-slate-100 text-slate-300 cursor-not-allowed'
                      }`}
                  >
                    Descartar
                  </button>
                  {hasChanges && (
                    <span className="ml-auto text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg animate-in fade-in duration-300">
                      ● Cambios sin guardar
                    </span>
                  )}
                </div>
              </div>
            )}
          </main>

        </div>
      </div>

      {/* ── Modal de Confirmación ────────────────────────────────── */}
      <ConfirmationModal
        isOpen={showConfirm}
        type="question"
        title="¿Guardar cambios?"
        message={`Se actualizarán los permisos del rol "${selectedRole?.nombre_rol}". Esta acción afectará a todos los usuarios con este rol.`}
        onConfirm={handleSave}
        onCancel={() => setShowConfirm(false)}
      />

      {/* toasts handled globally by GoeyToaster */}
    </>
  );
};

export default RolesPage;
