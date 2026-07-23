import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../Constext/AuthToken';
import { Modal } from '../Componets/componentes dashboard/Modal.jsx';
import {
  Database, ArrowDownToLine, ArrowUpFromLine, HardDrive,
  RotateCcw, Loader2, CheckCircle2, XCircle, Clock,
  User, Activity, AlertTriangle, Upload, Server,
  Download, FolderOpen, ShieldAlert,
} from 'lucide-react';
import ConfirmationModal from '../Componets/Confirmacion.jsx';
import { toast } from '../Componets/GoeyToaster';

// ─── Datos de prueba ──────────────────────────────────────────────────────
const HISTORIAL_MOCK = [

];

// ─── Badge de grado ───────────────────────────────────────────────────────
const GradoBadge = ({ grado }) => {
  const m = {
    Bajo: 'bg-zinc-100 text-zinc-500 border-zinc-200',
    Medio: 'bg-amber-50  text-amber-700 border-amber-200',
    Crítico: 'bg-rose-50   text-rose-600  border-rose-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${m[grado] || m.Bajo}`}>
      {grado}
    </span>
  );
};

// ─── Feedback de estado ───────────────────────────────────────────────────
const Feedback = ({ status, message }) => {
  if (status === 'idle') return null;
  const cfg = {
    loading: { Icon: Loader2, cls: 'text-zinc-500', spin: true, text: 'Procesando…' },
    success: { Icon: CheckCircle2, cls: 'text-emerald-600', spin: false, text: message },
    error: { Icon: XCircle, cls: 'text-rose-600', spin: false, text: message },
  };
  const { Icon, cls, spin, text } = cfg[status] ?? cfg.loading;
  return (
    <p className={`flex items-start gap-1.5 text-[12px] font-medium mt-2 leading-snug ${cls}`}>
      <Icon size={13} className={`shrink-0 mt-0.5 ${spin ? 'animate-spin' : ''}`} />
      {text}
    </p>
  );
};

// ─── Tarjeta de opción para los modales ───────────────────────────────────
const OptionCard = ({ icon: Icon, label, description, onClick, loading, variant = 'default' }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-all
      disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]
      ${variant === 'danger'
        ? 'border-rose-200 hover:bg-rose-50 hover:border-rose-300'
        : 'border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'}`}
  >
    <div className={`p-2 rounded-lg shrink-0 ${variant === 'danger' ? 'bg-rose-50' : 'bg-zinc-100'}`}>
      {loading
        ? <Loader2 size={15} className="animate-spin text-zinc-500" />
        : <Icon size={15} className={variant === 'danger' ? 'text-rose-600' : 'text-zinc-600'} />
      }
    </div>
    <div>
      <p className="text-[13px] font-semibold text-zinc-800">{label}</p>
      <p className="text-[11px] text-zinc-400 mt-0.5">{description}</p>
    </div>
  </button>
);

const SectionLabel = ({ children }) => (
  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">{children}</p>
);

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════════
export default function GestionBaseDatos() {
  const { datauser } = useAuth();

  // Detección de rol — id_rol en datauser.data
  const idRol = Number(datauser?.data?.id_rol);
  const rolStr = (datauser?.data?.rol || '').toLowerCase();
  const esAdmin = idRol === 5 || idRol === 11 || rolStr.includes('admin');

  // Estados por operación
  const initS = () => ({ status: 'idle', message: '' });
  const [migrState, setMigrState] = useState(initS());
  const [exportState, setExportState] = useState(initS());
  const [backupState, setBackupState] = useState(initS());
  const [restState, setRestState] = useState(initS());

  // Control de modales
  const [backupModal, setBackupModal] = useState(false);
  const [restoreModal, setRestoreModal] = useState(false);

  // Modal y datos para seleccionar backups en servidor
  const [serverListModal, setServerListModal] = useState(false);
  const [serverBackups, setServerBackups] = useState([]);
  const [selectedServerBackup, setSelectedServerBackup] = useState(null);
  const [loadingServerRestore, setLoadingServerRestore] = useState(false);
  const [confModal, setConfModal] = useState({
    isOpen: false,
    type: 'question',
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const triggerAction = (config) => {
    setConfModal({
      isOpen: true,
      title: config.title,
      message: config.message,
      type: config.type || 'question',
      onConfirm: () => {
        config.action();
        setConfModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Historial local
  const [historial, setHistorial] = useState(HISTORIAL_MOCK);
  const fileInputRef = useRef(null);

  const BASE = `http://${window.location.hostname}:5000`;

  // ── Helper fetch (Corregido para descargas nativas confiables) ────────────
  const callApi = async (url, opts, setState, etiqueta, grado) => {
    setState({ status: 'loading', message: '' });
    try {
      const res = await fetch(`${BASE}${url}`, { credentials: 'include', ...opts });

      // Verificar si la respuesta es un flujo de descarga binario
      const ct = res.headers.get('Content-Type') || '';
      const cd = res.headers.get('Content-Disposition') || '';

      if (ct.includes('octet-stream') || cd.includes('attachment') || url.includes('destino=download')) {
        if (!res.ok) throw new Error('Error al compilar el stream del backup.');

        const blob = await res.blob();

        // Intentar parsear el nombre real enviado por Express
        let fileName = `Seguridad_CVG_${Date.now()}.sql`;
        if (cd && cd.includes('filename=')) {
          const match = cd.match(/filename="?([^"]+)"?/);
          if (match && match[1]) fileName = match[1];
        }

        // Simular clic forzado en el DOM de forma limpia
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();

        // Limpieza de memoria inmediata
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        setState({ status: 'success', message: 'Copia empaquetada y enviada a descargas locales.' });
        registrar('Backup → Descarga Local', 'Bajo');
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok !== false) {
        setState({ status: 'success', message: json.message || 'Operación completada con éxito.' });
        registrar(etiqueta, grado);
      } else {
        setState({ status: 'error', message: json.message || json.error || 'Error interno en la ejecución.' });
      }
    } catch (err) {
      setState({ status: 'error', message: err.message || 'No se pudo establecer comunicación con el servidor.' });
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${BASE}/api/history/list`, { credentials: 'include' });
      if (!res.ok) return;
      const j = await res.json().catch(() => ({}));
      setHistorial(j.history || []);
    } catch (err) {
      console.error('Error cargando historial:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registrar = async (accion, grado) => {
    const entry = {
      accion,
      grado,
      responsable: datauser?.data?.name || 'Cesar A. Torres',
      tiempo: new Date().toLocaleString('es-VE', { hour12: false }),
    };
    try {
      const res = await fetch(`${BASE}/api/history/add`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (res.ok) {
        const j = await res.json().catch(() => ({}));
        setHistorial(prev => [(j.entry || entry), ...prev]);
        return;
      }
    } catch (err) {
      console.error('Error guardando historial remoto:', err);
    }
    // Fallback local
    setHistorial(prev => ([{ id: Date.now(), ...entry }, ...prev]));
  };

  // ── Acciones ─────────────────────────────────────────────────────────────
  const handleMigrar = () =>
    callApi('/migracion/ejecutar', { method: 'POST' }, setMigrState, 'Pipeline Migración (3 pasos)', 'Crítico');

  const handleExport = () =>
    callApi('/migracion/exportar', { method: 'POST' }, setExportState, 'Exportación a Access', 'Medio');

  const handleBackupServer = () => {
    setBackupModal(false);
    callApi('/api/backup/export?destino=server', {}, setBackupState, 'Backup → Servidor', 'Bajo');
  };

  const handleBackupDownload = () => {
    setBackupModal(false);
    // Ejecuta la descarga encapsulando las credenciales de sesión automáticamente
    callApi('/api/backup/export?destino=download', {}, setBackupState, 'Backup → Descarga Local', 'Bajo');
  };

  const handleRestoreServer = (fileName) => {
    if (!fileName?.trim()) return;
    setRestoreModal(false);
    callApi('/api/restore/server', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: fileName.trim() }),
    }, setRestState, 'Restauración desde Servidor', 'Crítico');
  };

  const fetchServerBackups = async () => {
    try {
      const res = await fetch(`${BASE}/api/backup/list`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      setServerBackups(data.backups || []);
    } catch (err) {
      console.error('Error trayendo backups del servidor:', err);
    }
  };

  const handleRestoreUpload = (file) => {
    if (!file) return;
    setRestoreModal(false);
    const form = new FormData();
    form.append('sqlfile', file);
    callApi('/api/restore/upload', { method: 'POST', body: form },
      setRestState, 'Restauración desde Archivo', 'Crítico');
  };

  // ─── Contenido del Modal de Backup ────────────────────────────────────────
  const contenidoBackup = (
    <div className="flex flex-col gap-3 w-[400px] max-sm:w-auto">
      <p className="text-xs text-zinc-500 mb-1">Elige dónde guardar el archivo <code className="bg-zinc-100 px-1 rounded">.sql</code> generado:</p>
      <OptionCard
        icon={Server}
        label="Guardar en Servidor"
        description="El archivo queda en /backups con timestamp. Sin descarga al navegador."
        onClick={() => triggerAction({ title: 'Generar backup en servidor', message: 'Se generará una copia de seguridad y se guardará en el servidor (/backups). ¿Deseas continuar?', type: 'question', action: handleBackupServer })}
      />
      <OptionCard
        icon={Download}
        label="Descargar Copia Local"
        description="Streaming directo al navegador. También se guarda una copia en el servidor."
        onClick={() => triggerAction({ title: 'Descargar backup', message: 'Descargarás una copia local de la base de datos. ¿Confirmas la descarga?', type: 'question', action: handleBackupDownload })}
      />
    </div>
  );

  // ─── Contenido del Modal de Restauración ──────────────────────────────────
  const contenidoRestore = (
    <div className="flex flex-col gap-3 w-[420px] max-sm:w-auto">
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
        <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800 leading-relaxed">
          Acción irreversible. El sanitizador SQL bloqueará el archivo si contiene
          comandos peligrosos (<code>DROP DATABASE</code>, <code>GRANT</code>, etc.).
        </p>
      </div>

      <OptionCard
        icon={FolderOpen}
        label="Usar Punto del Servidor"
        description="Selecciona un punto de restauración guardado en /backups del servidor."
        onClick={() => {
          setServerListModal(true);
          fetchServerBackups();
        }}
      />

      <div>
        <OptionCard
          icon={Upload}
          label="Subir Archivo SQL Externo"
          description="Sube un .sql desde tu equipo. Será sanitizado antes de ejecutarse."
          onClick={() => fileInputRef.current?.click()}
          variant="danger"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".sql"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) {
              triggerAction({
                title: 'Restaurar desde archivo',
                message: 'Vas a restaurar la base de datos desde un archivo local. Esto reemplazará la base de datos actual. ¿Deseas continuar?',
                type: 'danger',
                action: () => handleRestoreUpload(file)
              });
            }
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );

 const contenidoServerList = (
  <div className="max-w-2xl w-full bg-white rounded-2xl">
    {/* Mensaje Informativo */}
    <div className="mb-4 text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2">
      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shrink-0" />
      Selecciona un archivo .sql desde los puntos de control almacenados en el servidor.
    </div>

    {/* Contenedor de la Tabla */}
    <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm bg-white">
      <div className="overflow-y-auto max-h-[50vh]">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr className="text-slate-600 font-semibold text-xs uppercase tracking-wider">
              <th className="py-3 px-4 w-10"></th> {/* Espacio para el selector */}
              <th className="py-3 px-4">Archivo</th>
              <th className="py-3 px-4">Fecha</th>
              <th className="py-3 px-4 text-right">Tamaño</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {serverBackups.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                  No se encontraron puntos de restauración en el servidor.
                </td>
              </tr>
            ) : (
              serverBackups.map((b, i) => {
                const isSelected = selectedServerBackup === b.name;
                return (
                  <tr 
                    key={i} 
                    onClick={() => setSelectedServerBackup(prev => prev === b.name ? null : b.name)}
                    className={`cursor-pointer transition-all duration-150 select-none
                      ${isSelected 
                        ? 'bg-emerald-50/70 border-l-4 border-l-emerald-500' 
                        : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                      }`}
                  >
                    {/* Selector visual */}
                    <td className="py-3 px-4 text-center">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all
                        ${isSelected 
                          ? 'border-emerald-500 bg-emerald-500' 
                          : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </td>
                    
                    {/* Nombre del Archivo */}
                    <td className={`py-3 px-4 font-medium transition-colors ${isSelected ? 'text-emerald-900' : 'text-slate-700'}`}>
                      {b.name}
                    </td>
                    
                    {/* Fecha */}
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(b.date).toLocaleString('es-VE', { dateStyle: 'long', timeStyle: 'short' })}
                    </td>
                    
                    {/* Tamaño */}
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-500 whitespace-nowrap">
                      {b.size}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* Acciones del Modal */}
    <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-4">
      <button 
        onClick={() => { setServerListModal(false); setSelectedServerBackup(null); }} 
        className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm transition-colors active:scale-[0.98]"
      >
        Cerrar
      </button>
      
      <button
        onClick={() => {
          if (!selectedServerBackup) { toast.error('Selecciona un punto de restauración primero'); return; }
          triggerAction({
            title: 'Restaurar punto de control',
            message: `Vas a restaurar la base de datos desde: ${selectedServerBackup}. Esto reemplazará la base actual. ¿Deseas continuar?`,
            type: 'danger',
            action: () => {
              setLoadingServerRestore(true);
              handleRestoreServer(selectedServerBackup);
              setServerListModal(false);
              setSelectedServerBackup(null);
              setLoadingServerRestore(false);
            }
          });
        }}
        disabled={!selectedServerBackup}
        className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm active:scale-[0.98]
          ${!selectedServerBackup 
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100'
          }`}
      >
        Restaurar seleccionado
      </button>
    </div>
  </div>
);

  return (
    <div className="ml-[60px] max-lg:ml-0 min-h-[calc(100dvh-60px)] bg-zinc-50 p-6 md:p-8 flex flex-col gap-8">

      {/* Encabezado */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-white border border-zinc-200 rounded-xl shadow-sm">
          <Database size={22} className="text-zinc-700" />
        </div>
        <div>
          <h1 className="text-xl font-black text-zinc-900 leading-none tracking-tight">
            Módulo de Base de Datos
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Migraciones, respaldos y restauraciones con sanitización de seguridad.
          </p>
        </div>
      </div>

      {/* Bloqueo para no-admins */}
      {!esAdmin && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-5 py-4">
          <ShieldAlert size={18} className="text-rose-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-rose-800">Acceso restringido</p>
            <p className="text-xs text-rose-600 mt-0.5">
              Solo <strong>Administrador</strong> y <strong>SuperAdministrador</strong> pueden operar este módulo.
            </p>
          </div>
        </div>
      )}

      {/* Panel de Acciones */}
      <div className={`bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm transition-opacity ${!esAdmin ? 'opacity-40 pointer-events-none select-none' : ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Migración */}
          <div>
            <SectionLabel>Migración Access ↔ MySQL</SectionLabel>
            <div className="flex flex-col gap-2">
              <button onClick={() => triggerAction({ title: 'Ejecutar pipeline', message: 'Vas a ejecutar el pipeline de migración (Access → MySQL). Esta operación modificará la base de datos. ¿Deseas continuar?', type: 'danger', action: handleMigrar })} disabled={migrState.status === 'loading'}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-[13px] font-semibold hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all">
                {migrState.status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <ArrowDownToLine size={14} />}
                Ejecutar Pipeline (Access → MySQL)
              </button>
              <button onClick={() => triggerAction({ title: 'Exportar Solicitudes', message: 'Se exportarán las solicitudes a Access. ¿Confirmas la exportación?', type: 'question', action: handleExport })} disabled={exportState.status === 'loading'}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-[13px] font-semibold hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all">
                {exportState.status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpFromLine size={14} />}
                Exportar Solicitudes a Access
              </button>
            </div>
            <Feedback {...migrState} />
            <Feedback {...exportState} />
          </div>

          {/* Respaldos */}
          <div className="md:border-l md:border-zinc-100 md:pl-8">
            <SectionLabel>Respaldos y Restauración</SectionLabel>
            <div className="flex flex-col gap-2">
              <button onClick={() => setBackupModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-[13px] font-semibold hover:bg-zinc-50 active:scale-95 transition-all">
                <HardDrive size={14} /> Generar Backup
              </button>
              <button onClick={() => setRestoreModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-[13px] font-semibold hover:bg-rose-100 active:scale-95 transition-all">
                <RotateCcw size={14} /> Restaurar Base de Datos
              </button>
            </div>
            <Feedback {...backupState} />
            <Feedback {...restState} />
          </div>

        </div>
      </div>

      {/* Historial */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden custom-scrollba">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2 custom-scrollba">
          <Activity size={15} className="text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-800">Historial de Operaciones</h2>
          <span className="ml-auto text-[11px] font-semibold text-zinc-400">{historial.length} registros</span>
        </div>
        <div className="overflow-auto flex-1 max-h-[58dvh] custom-scrollba">
          <table className="w-full text-left text-sm overflow-auto h-full custom-scrollbar">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60">
                {['Acción', 'Responsable', 'Grado', 'Tiempo'].map(h => (
                  <th key={h} className="px-6 py-3 text-[11px] font-bold text-zinc-400 uppercase tracking-wider last:text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 custom-scrollba">
              {historial.map(row => (
                <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />
                      <span className="font-medium text-zinc-800 text-[13px]">{row.accion}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2 text-zinc-500 text-[13px]">
                      <User size={12} className="shrink-0" />{row.responsable}
                    </div>
                  </td>
                  <td className="px-6 py-3.5"><GradoBadge grado={row.grado} /></td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5 text-zinc-400 text-[12px] font-mono">
                      <Clock size={11} />{row.tiempo}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-zinc-100 flex items-center gap-2 bg-zinc-50/40">
          <AlertTriangle size={12} className="text-amber-500 shrink-0" />
          <p className="text-[11px] text-zinc-400">
            Sanitizador activo — bloquea: <code className="bg-zinc-100 px-1 rounded">DROP DATABASE</code>·
            <code className="bg-zinc-100 px-1 rounded">ALTER USER</code>·
            <code className="bg-zinc-100 px-1 rounded">GRANT</code>·
            <code className="bg-zinc-100 px-1 rounded">SHUTDOWN</code> y comillas desbalanceadas.
          </p>
        </div>
      </div>

      {/* Modales */}
      {backupModal && (
        <Modal
          onClose={() => setBackupModal(false)}
          title="Generar Copia de Seguridad"
          contenido={contenidoBackup}
          padding={true}
        />
      )}

      {restoreModal && (
        <Modal
          onClose={() => setRestoreModal(false)}
          title="Restaurar Base de Datos"
          contenido={contenidoRestore}
          padding={true}
        />
      )}

      {serverListModal && (
        <Modal
          onClose={() => setServerListModal(false)}
          title="Puntos de restauración en servidor"
          contenido={contenidoServerList}
          padding={true}
        />
      )}

      {confModal.isOpen && (
        <ConfirmationModal
          isOpen={confModal.isOpen}
          title={confModal.title}
          message={confModal.message}
          type={confModal.type}
          onConfirm={confModal.onConfirm}
          onCancel={() => setConfModal(p => ({ ...p, isOpen: false }))}
        />
      )}

    </div>
  );
}