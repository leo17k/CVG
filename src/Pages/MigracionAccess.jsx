import { useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
  Info,
} from 'lucide-react';

// ─── Estado inicial de una tarjeta de acción ───────────────────────────────
const initCard = () => ({ status: 'idle', message: '', detail: null });

// ─── Componente de estado visual ───────────────────────────────────────────
const StatusBadge = ({ status, message }) => {
  if (status === 'idle') return null;
  const map = {
    loading: { Icon: Loader2, cls: 'text-slate-500', spin: true, label: 'Procesando…' },
    success: { Icon: CheckCircle2, cls: 'text-emerald-600', spin: false, label: message },
    error:   { Icon: XCircle,     cls: 'text-rose-600',    spin: false, label: message },
  };
  const { Icon, cls, spin, label } = map[status] || map.loading;
  return (
    <div className={`flex items-start gap-2 mt-4 text-sm font-medium ${cls}`}>
      <Icon size={16} className={`shrink-0 mt-0.5 ${spin ? 'animate-spin' : ''}`} />
      <span className="leading-snug">{label}</span>
    </div>
  );
};

// ─── Tarjeta de acción ─────────────────────────────────────────────────────
const ActionCard = ({ icon: Icon, title, description, buttonLabel, buttonColor, onAction, cardState }) => (
  <div className="border border-slate-200 rounded-2xl p-6 bg-white flex flex-col gap-3 shadow-sm">
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${buttonColor === 'emerald' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
        <Icon size={20} className={buttonColor === 'emerald' ? 'text-emerald-600' : 'text-blue-600'} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
    </div>

    <p className="text-xs text-slate-500 leading-relaxed">
      {buttonColor === 'emerald'
        ? 'Lee los datos históricos desde la base de datos Access y los inserta en MySQL. Los registros duplicados serán ignorados.'
        : 'Consulta todas las solicitudes en MySQL y prepara el payload para insertarlos en Access. Configura la sentencia INSERT en el controlador para activar la escritura real.'}
    </p>

    <button
      onClick={onAction}
      disabled={cardState.status === 'loading'}
      className={`mt-1 w-full py-2.5 px-4 rounded-xl text-[13px] font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2
        ${cardState.status === 'loading' ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
        ${buttonColor === 'emerald'
          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100'
          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-100'
        }`}
    >
      {cardState.status === 'loading' && <Loader2 size={14} className="animate-spin" />}
      {buttonLabel}
    </button>

    <StatusBadge status={cardState.status} message={cardState.message} />

    {/* Preview de registros exportados */}
    {cardState.status === 'success' && cardState.detail?.preview?.length > 0 && (
      <div className="mt-2 border border-slate-100 rounded-xl overflow-hidden">
        <div className="px-3 py-2 bg-slate-50 flex items-center gap-2 border-b border-slate-100">
          <Info size={12} className="text-slate-400" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vista previa (primeros 5)</span>
        </div>
        <div className="divide-y divide-slate-100">
          {cardState.detail.preview.map((row) => (
            <div key={row.id_solicitud} className="px-3 py-2 flex items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-slate-400">#{row.id_solicitud}</span>
              <span className="text-[11px] text-slate-700 truncate flex-1">{row.resumen}</span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                style={{ color: '#6366f1', borderColor: '#e0e7ff', backgroundColor: '#eef2ff' }}
              >
                {row.estado}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// ─── Página principal ──────────────────────────────────────────────────────
export default function MigracionAccess() {
  const [importState, setImportState] = useState(initCard());
  const [exportState, setExportState] = useState(initCard());

  const BASE = `http://${window.location.hostname}:5000`;

  const callEndpoint = async (endpoint, setState) => {
    setState({ status: 'loading', message: '', detail: null });
    try {
      const res  = await fetch(`${BASE}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setState({ status: 'success', message: json.message, detail: json });
      } else {
        setState({ status: 'error', message: json.message || 'Ocurrió un error inesperado.', detail: null });
      }
    } catch (err) {
      setState({ status: 'error', message: 'No se pudo conectar con el servidor.', detail: null });
    }
  };

  return (
    <div className="ml-[60px] max-lg:ml-0 min-h-[calc(100dvh-60px)] bg-slate-50 p-6 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <Database size={22} className="text-slate-700" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 leading-none">Migración de Datos</h1>
          <p className="text-xs text-slate-400 mt-0.5">Sincronización bidireccional MySQL ↔ Microsoft Access</p>
        </div>
      </div>

      {/* Aviso de configuración */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Configuración requerida:</strong> Antes de usar la migración real, configura la ruta de tu base de datos
          Access en <code className="bg-amber-100 px-1 rounded font-mono">Backend/config/dbAccess.js</code> y descomenta
          el bloque de conexión en <code className="bg-amber-100 px-1 rounded font-mono">Backend/Controllers/MigracionController.js</code>.
          Los botones funcionan en modo <strong>mock</strong> hasta entonces.
        </p>
      </div>

      {/* Tarjetas de acción */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        <ActionCard
          icon={ArrowDownToLine}
          title="Importar desde Access"
          description="Access → MySQL"
          buttonLabel="Iniciar Importación"
          buttonColor="emerald"
          cardState={importState}
          onAction={() => callEndpoint('/migracion/importar', setImportState)}
        />

        <ActionCard
          icon={ArrowUpFromLine}
          title="Exportar a Access"
          description="MySQL → Access"
          buttonLabel="Iniciar Exportación"
          buttonColor="blue"
          cardState={exportState}
          onAction={() => callEndpoint('/migracion/exportar', setExportState)}
        />
      </div>

    </div>
  );
}
