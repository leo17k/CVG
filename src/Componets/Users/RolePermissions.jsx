import React, { useState, useEffect, useMemo } from 'react';

// ─── Toggle Switch inline ────────────────────────────────────────────────────
const ToggleSwitch = ({ checked, onChange, label, description }) => (
  <div
    className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer group hover:bg-indigo-50/60"
    onClick={onChange}
  >
    <div className="flex-1 min-w-0">
      <p className={`text-sm first-letter:uppercase font-semibold truncate transition-colors ${checked ? 'text-indigo-700' : 'text-slate-700'}`}>
        {label}
      </p>
      {description && (
        <p className="text-xs text-slate-400 truncate mt-0.5">{description}</p>
      )}
    </div>

    {/* Track */}
    <div
      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-300 shadow-inner
        ${checked ? 'bg-indigo-600' : 'bg-slate-200 group-hover:bg-slate-300'}`}
    >
      {/* Thumb */}
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md
          transform transition-transform duration-300 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </div>
  </div>
);

// ─── Module Toggle (seleccionar/deseleccionar módulo completo) ───────────────
const ModuleToggle = ({ checked, indeterminate, onChange, label }) => (
  <button
    type="button"
    onClick={onChange}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200
      ${checked
        ? 'bg-indigo-600 text-white shadow shadow-indigo-200'
        : indeterminate
          ? 'bg-amber-100 text-amber-700 border border-amber-200'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
      }`}
  >
    {checked ? '✓ Todo' : indeterminate ? '— Parcial' : '○ Ninguno'}
  </button>
);

// ─── Componente principal ────────────────────────────────────────────────────
// Props:
// - modules: [{ id_modulo, nombre_modulo, permisos: [{ id_permiso, accion, descripcion, nombre_permiso }] }]
// - selected: array of id_permiso
// - onChange: (selectedArray) => void
const RolePermissions = ({ modules = [], selected = [], onChange = () => { }, className = '' }) => {
  const [selectedSet, setSelectedSet] = useState(new Set(selected));

  useEffect(() => {
    setSelectedSet(new Set(selected));
  }, [selected]);

  const allPermissionIds = useMemo(() =>
    modules.flatMap(m => (m.permisos || []).map(p => p.id_permiso)),
    [modules]
  );

  const emitChange = (nextSet) => {
    setSelectedSet(new Set(nextSet));
    onChange(Array.from(nextSet));
  };

  const togglePermission = (id) => {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id); else next.add(id);
    emitChange(next);
  };

  const toggleModule = (module) => {
    const ids = (module.permisos || []).map(p => p.id_permiso);
    const next = new Set(selectedSet);
    const allSelected = ids.every(id => next.has(id));
    if (allSelected) ids.forEach(id => next.delete(id));
    else ids.forEach(id => next.add(id));
    emitChange(next);
  };

  const toggleAll = () => {
    const next = new Set(selectedSet);
    const allSelected = allPermissionIds.length > 0 && allPermissionIds.every(id => next.has(id));
    if (allSelected) allPermissionIds.forEach(id => next.delete(id));
    else allPermissionIds.forEach(id => next.add(id));
    emitChange(next);
  };

  const allSelected = allPermissionIds.length > 0 && allPermissionIds.every(id => selectedSet.has(id));

  return (
    <div className={`${className}`}>
      {/* Header de control global */}
      <div className="flex items-center justify-between p-6  pb-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-700">Permisos del sistema</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
            {selectedSet.size} / {allPermissionIds.length} activos
          </span>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className={`text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200
            ${allSelected
              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow shadow-indigo-200'
            }`}
        >
          {allSelected ? 'Quitar todo' : 'Activar todo'}
        </button>
      </div>

      {modules.length === 0 && (
        <div className="text-sm text-slate-500 text-center py-8">
          No hay módulos o permisos disponibles.
        </div>
      )}

      {/* Grid de módulos */}
      <div className="grid p-3 grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((mod) => {
          const permisoIds = (mod.permisos || []).map(p => p.id_permiso);
          const activeCount = permisoIds.filter(id => selectedSet.has(id)).length;
          const moduleAllSelected = permisoIds.length > 0 && activeCount === permisoIds.length;
          const moduleIndeterminate = activeCount > 0 && activeCount < permisoIds.length;

          return (
            <div
              key={mod.id_modulo}
              className={`rounded-2xl border-2 overflow-hidden transition-all duration-200
                ${moduleAllSelected
                  ? 'border-indigo-200 bg-indigo-50/30'
                  : moduleIndeterminate
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-slate-100 bg-white'
                }`}
            >
              {/* Cabecera del módulo */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100/80">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${moduleAllSelected ? 'bg-indigo-500' : moduleIndeterminate ? 'bg-amber-400' : 'bg-slate-300'}`} />
                  <span className="text-sm font-bold first-letter:uppercase text-slate-800 truncate">
                    {mod.nombre_modulo || mod.nombre || `Módulo ${mod.id_modulo}`}
                  </span>
                </div>
                <div className="flex  items-center gap-2 flex-shrink-0">
                  <span className="text-xs  text-slate-400 font-medium">{activeCount}/{permisoIds.length}</span>
                  <ModuleToggle
                    checked={moduleAllSelected}
                    indeterminate={moduleIndeterminate}
                    onChange={() => toggleModule(mod)}
                  />
                </div>
              </div>

              {/* Lista de permisos con Toggle Switch */}
              <div className="divide-y divide-slate-50 ">
                {(mod.permisos || []).map(p => (
                  <ToggleSwitch
                    key={p.id_permiso}
                    checked={selectedSet.has(p.id_permiso)}
                    onChange={() => togglePermission(p.id_permiso)}
                    label={p.nombre_permiso || p.accion}
                    description={p.descripcion}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RolePermissions;
