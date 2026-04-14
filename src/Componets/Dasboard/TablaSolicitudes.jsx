import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, ChevronLeft, ChevronRight, Eye, Trash2, CheckCircle, XCircle, AlertTriangle, HelpCircle, Filter, Download } from 'lucide-react';
import { Modal } from '../componentes dashboard/Modal.jsx';
import { TextArea, Select, Input } from '../Inputs';
import { Boton } from "../componentes dashboard/Numsolisitud.jsx";
import { BotonReporte } from "../CarruselItems/botonreporte.jsx";
import AlertItem from '../Alerts.jsx';
import ConfirmationModal from '../Confirmacion.jsx';

const TablaSolicitudes = ({ data = [], loading: apiLoading, currentPage = 1, totalPages = 1, onPageChange, isAdmin, onRefresh, onFilter, filtrosValue = {}, onMessageSent }) => {
  // --- ESTADOS DE UI ---
  const [alerts, setAlerts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [visualLoading, setVisualLoading] = useState(true);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [localBusqueda, setLocalBusqueda] = useState(filtrosValue.busqueda || '');
  const [localEstado, setLocalEstado] = useState(filtrosValue.estado || '');

  // --- ESTADOS DE PROCESAMIENTO SUAVE ---
  const [isProcessingLocal, setIsProcessingLocal] = useState(false);
  const [processSuccessMessage, setProcessSuccessMessage] = useState('');

  // --- ESTADOS DE AJUSTES ---
  const [askAdjustOpen, setAskAdjustOpen] = useState(false);
  const [adjustField, setAdjustField] = useState('resumen');
  const [adjustMessage, setAdjustMessage] = useState('');
  const [includeContext, setIncludeContext] = useState(true);

  // --- ESTADO DE MODAL DE CONFIRMACIÓN DINÁMICO ---
  const [confModal, setConfModal] = useState({
    isOpen: false,
    type: 'question',
    title: '',
    message: '',
    onConfirm: () => { }
  });

  const isAdminView = isAdmin === 'SuperAdministrador' || isAdmin === 5 || isAdmin === 1 || isAdmin === 'administrador';

  // Manejo de Skeleton
  useEffect(() => {
    if (apiLoading) {
      setVisualLoading(true);
    } else {
      const timer = setTimeout(() => setVisualLoading(false), 200);
      return () => clearTimeout(timer);
    }
  }, [apiLoading, currentPage]);

  // --- GESTIÓN DE ALERTAS (TOASTS) ---
  const addAlert = useCallback((type, title, message) => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, type, title, message }]);
  }, []);

  const removeAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  // --- FUNCIONES DE ACCIÓN ---
  const openModal = (row) => {
    setSelected(row);
    setModalOpen(true);
  };

  const closeModal = () => {
    setSelected(null);
    setModalOpen(false);
  };

  const openAdjustModal = () => {
    setAdjustField('resumen');
    setAdjustMessage('');
    setAskAdjustOpen(true);
  };

  const closeAdjustModal = () => {
    setAskAdjustOpen(false);
  };

  // Función genérica para disparar confirmaciones
  const triggerAction = (config) => {
    setConfModal({
      isOpen: true,
      title: config.title,
      message: config.message,
      type: config.type,
      onConfirm: () => {
        config.action();
        setConfModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Función para cambiar estado en el servidor
  const changeStatus = async (id, newStatus) => {
    try {
      setIsProcessingLocal(true);
      const resp = await fetch(`http://${window.location.hostname}:5000/solicitudes/${id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ estado: newStatus })
      });
      if (resp.ok) {
        setProcessSuccessMessage(newStatus === 'Aprobado' ? '¡Solicitud Aprobada!' : 'Solicitud Rechazada');

        // Retrasamos el cierre brusco para mostrar la animación suave de éxito en el modal
        // 1. Iniciamos el cierre tras mostrar el mensaje de éxito por 2 segundos
        setTimeout(() => {
          // Cerramos el modal de detalles/formulario primero
          setModalOpen(false);

          // 2. Damos un pequeño margen para que el modal principal empiece a cerrar
          // y luego quitamos el mensaje de éxito para que el usuario vea la tabla limpia
          setTimeout(() => {
            // Ejecutamos el refresh de los datos de la tabla antes de quitar el overlay
            if (onRefresh) onRefresh();

            // Quitamos el estado de procesamiento (el overlay con blur)
            setIsProcessingLocal(false);

            // Limpiamos el mensaje para la próxima vez
            setProcessSuccessMessage('');

            // Lanzamos la alerta global (Toast)
            addAlert(
              'success',
              'Operación Finalizada',
              `La solicitud #${id} ha sido ${newStatus.toLowerCase()} correctamente.`
            );
          }, 600); // 600ms es el tiempo ideal para que el modal cierre visualmente

        }, 2500); // 2.5s es el tiempo que el usuario necesita para leer "Solicitud Aprobada"

      } else {
        const err = await resp.json();
        setIsProcessingLocal(false);
        addAlert('error', 'Error', err.message || 'No se pudo actualizar el estado.');
      }
    } catch (error) {
      setIsProcessingLocal(false);
      addAlert('error', 'Error crítico', 'Error de conexión con el servidor.');
    }
  };

  const handleApprove = (id) => {
    // IMPORTANTE: Asegúrate de que tu ConfirmationModal.jsx tenga el caso 'success'
    // Si no lo tiene, puedes usar 'question' temporalmente para evitar el error de "theme undefined"
    triggerAction({
      title: "¿Confirmar Aprobación?",
      message: `Estás por aprobar la solicitud #${id}. Esta acción notificará al usuario y cambiará el estado del expediente.`,
      type: "question", // Cambiado a 'question' para asegurar compatibilidad con tu componente actual
      action: () => changeStatus(id, 'Aprobado')
    });
  };

  const handleReject = (id) => {
    triggerAction({
      title: "¿Rechazar Solicitud?",
      message: `¿Estás seguro de rechazar la solicitud #${id}? Esta acción es definitiva.`,
      type: "danger",
      action: () => changeStatus(id, 'Rechazado')
    });
  };

  const submitAdjustment = async () => {
    if (!adjustMessage.trim()) {
      addAlert('error', 'Campo vacío', 'Por favor, ingresa un mensaje de ajuste.');
      return;
    }

    try {
      let message = includeContext
        ? `Ajuste en "${adjustField}": ${adjustMessage}. Valor actual: ${selected[adjustField]}`
        : adjustMessage;

      const body = { mensaje: message, toId: selected.id_solicitante, tipo: 'ajuste' };
      const resp = await fetch(`http://${window.location.hostname}:5000/mensajes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (resp.ok) {
        setAskAdjustOpen(false);
        addAlert('success', 'Enviado', 'La solicitud de ajuste fue enviada con éxito.');
        setAdjustMessage('');
        if (onMessageSent) onMessageSent(); // Refrescar chats padre
      } else {
        addAlert('error', 'Error', 'No se pudo enviar la solicitud al servidor.');
      }
    } catch (error) {
      addAlert('error', 'Error Crítico', 'Error de conexión con el servidor.');
    }
  };

  return (
    <>
      {/* CONTENEDOR DE ALERTAS FLOTANTES */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col items-end pointer-events-none">
        {alerts.map(alert => (
          <AlertItem key={alert.id} {...alert} onClose={removeAlert} />
        ))}
      </div>

      {/* MODAL DE CONFIRMACIÓN ÚNICO Y DINÁMICO */}
      <ConfirmationModal
        isOpen={confModal.isOpen}
        title={confModal.title}
        message={confModal.message}
        type={confModal.type}
        onConfirm={confModal.onConfirm}
        onCancel={() => setConfModal(p => ({ ...p, isOpen: false }))}
      />

      <div className="g:col-span-7 h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-700">
        {/* Cabecera de Tabla */}
        <div className="p-4 border-b border-slate-50 flex items-center gap-3 shrink-0">
          <ClipboardList className="w-5 h-5 text-blue-500" />
          <h2 className="font-bold text-slate-800">Listado de Solicitudes</h2>
          {isAdmin && (
            <>
              <button
                onClick={() => setFilterModalOpen(true)}
                className="ml-4 p-2 rounded-2xl bg-white shadow-sm t-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors flex items-center gap-2 text-xs font-semibold"
              >
                <Filter size={16} />
                <span className="max-lg:hidden">
                  Filtros
                </span>
              </button>

              <Boton datauser={data} onRefresh={() => setRefreshKey(prev => prev + 1)} ></Boton>
              {isAdminView && (<>
                <BotonReporte idSolicitud={1} />
              </>)}
            </>

          )}
          <div className='flex justify-center items-center ml-auto gap-2'>
            {[...Array(Math.min(totalPages, 5))].map((_, i) => (
              <div key={i} className={`size-2 rounded-full transition-all ${currentPage === i + 1 ? 'bg-blue-600 size-3' : 'bg-gray-300'}`}></div>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-sm border-collapse table-fixed min-w-[800px]">
            <thead className="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-bold sticky top-0 z-10">
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80">ID</th>
                <th className="w-[200px] px-6 py-4 backdrop-blur-sm bg-slate-50/80">Resumen</th>
                <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80">Estado</th>
                <th className="px-6 py-4 text-right backdrop-blur-sm bg-slate-50/80">Monto</th>
                <th className="px-6 py-4 text-right backdrop-blur-sm bg-slate-50/80">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visualLoading ? (
                // Skeleton que dura exactamente 200ms tras recibir la data
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-full"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : (data && data.length > 0) ? (
                data.map((row) => (
                  <tr key={row.id_solicitud} className="hover:bg-slate-50/50 transition-colors animate-in fade-in duration-300">
                    <td className="px-6 py-3.5 font-bold text-slate-400">#{row.id_solicitud}</td>
                    <td className="px-6 py-3.5 font-semibold text-slate-700 truncate">{row.resumen}</td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${row.estado === 'Aprobado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        row.estado === 'Rechazado' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                        {row.estado}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-800">
                      ${Number(row.monto_estimado || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button onClick={() => openModal(row)} className="text-blue-600 hover:scale-110 transition-transform">
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-slate-400">No hay solicitudes disponibles</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500 font-medium">Página {currentPage} de {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-30"><ChevronLeft size={16} /></button>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* MODAL DETALLE SOLICITUD */}
      {modalOpen && selected && (
        <Modal
          onClose={closeModal}
          contenido={
            <div className="flex flex-col h-full bg-white w-[600px] max-sm:w-[90dvw] max-sm:h-[90dvh] overflow-y-auto px-4 py-6 custom-scrollbar relative">

              {/* CORTINA PANTALLA CARGA/ÉXITO SUAVE */}
              {isProcessingLocal && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 rounded-[32px] overflow-hidden group">
                  {/* Fondo con desenfoque profundo y capa de color sutil */}
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-md animate-in fade-in duration-500" />

                  {/* Contenedor de contenido con elevación */}
                  <div className="relative z-10 flex flex-col items-center text-center">
                    {processSuccessMessage ? (
                      <div className="flex flex-col items-center gap-6 animate-in zoom-in-90 slide-in-from-bottom-4 duration-500 ease-out">
                        {processSuccessMessage === 'Solicitud Rechazada' ? (
                          <div className="relative">
                            {/* Brillo de fondo para error */}
                            <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-full animate-pulse" />
                            <div className="relative bg-rose-50 p-5 rounded-[24px] border border-rose-100 shadow-xl shadow-rose-500/10">
                              <XCircle className="w-14 h-14 text-rose-500 animate-in spin-in-90 duration-700" />
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            {/* Brillo de fondo para éxito */}
                            <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full animate-pulse" />
                            <div className="relative bg-emerald-50 p-5 rounded-[24px] border border-emerald-100 shadow-xl shadow-emerald-500/10">
                              <CheckCircle className="w-14 h-14 text-emerald-500 animate-in zoom-in duration-500 ease-out" />
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                            {processSuccessMessage}
                          </h3>
                          <p className="text-slate-500 text-sm font-medium">
                            {processSuccessMessage === 'Solicitud Rechazada'
                              ? 'La acción ha sido cancelada'
                              : 'Operación completada con éxito'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="relative w-20 h-20 flex items-center justify-center">
                          {/* Spinner Moderno: Doble anillo */}
                          <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
                          <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-sm" />
                          <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                          </div>
                        </div>

                        <div className="flex flex-col items-center">
                          <span className="text-lg font-extrabold text-slate-800 tracking-tight uppercase text-[11px] bg-slate-100 px-3 py-1 rounded-full mb-2">
                            Sistema de Control
                          </span>
                          <span className="text-blue-600 font-bold animate-pulse text-lg">
                            Procesando acción...
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="border-l-4 border-blue-500 pl-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Expediente de Gestión</span>
                    <h3 className="text-2xl font-bold text-slate-800">Solicitud #{selected.id_solicitud}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase border ${selected.estado === 'Aprobado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    selected.estado === 'Rechazado' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                    {selected.estado}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="md:col-span-2 space-y-6">
                  <section>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Resumen del Proyecto
                    </h4>
                    <p className="text-slate-700 text-lg leading-relaxed font-medium">
                      {selected.resumen}
                    </p>
                  </section>

                  <section>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Justificación Detallada
                    </h4>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-slate-600 text-sm italic leading-relaxed">
                        "{selected.justificacion || 'No se proporcionó una justificación detallada para esta solicitud.'}"
                      </p>
                    </div>
                  </section>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-900 rounded-2xl p-5 shadow-lg shadow-blue-100">
                    <p className="text-[10px] font-bold text-blue-300 uppercase mb-1">Presupuesto Estimado</p>
                    <p className="text-3xl font-mono font-bold text-white">
                      ${Number(selected.monto_estimado).toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Información Adicional</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Fecha:</span>
                        <span className="font-semibold text-slate-700">24/02/2026</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Prioridad:</span>
                        <span className="font-semibold text-amber-600">Alta</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer: Acciones con Lógica de Estado y Rol */}
              <div className="mt-auto pt-6 border-t border-slate-100">
                {selected.estado === 'Aprobado' ? (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-center gap-3">
                      <div className="size-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <p className="text-emerald-700 text-xs font-medium">
                        Esta solicitud ya ha sido aprobada y no requiere más acciones de estado.
                      </p>
                    </div>
                    <button
                      onClick={() => addAlert('info', 'Seguimiento', 'Funcionalidad de mensajes en desarrollo.')}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-all"
                    >
                      Enviar Mensaje de Seguimiento
                    </button>
                    {/* Botón de Descargar Planilla */}
                    <button
                      onClick={async () => {
                        addAlert('info', 'Descargando...', 'Preparando PDF para descarga');
                        try {
                          // Se asume el endpoint /reporte/id (ajustalo si en tu backend la ruta cambia)
                          const res = await fetch(`http://${window.location.hostname}:5000/reporte/${selected.id_solicitud}`);
                          if (!res.ok) throw new Error("No se pudo generar el reporte");
                          const blob = await res.blob();
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.setAttribute('download', `Solicitud_Aprobada_${selected.id_solicitud}.pdf`);
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (err) {
                          addAlert('error', 'Error', 'Ocurrió un problema al descargar el archivo.');
                        }
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 text-white flex justify-center items-center gap-2 font-bold py-3 rounded-xl transition-all"
                    >
                      <Download size={18} /> Descargar Planilla (PDF)
                    </button>
                  </div>
                ) : isAdminView ? (
                  <>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-4 text-center tracking-widest">
                      Acciones de Administrador
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        onClick={() => handleApprove(selected.id_solicitud)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm"
                      >
                        Aprobar
                      </button>

                      <button
                        onClick={() => handleReject(selected.id_solicitud)}
                        className="bg-white border-2 border-rose-100 text-rose-600 hover:bg-rose-50 font-bold py-3 px-4 rounded-xl transition-all"
                      >
                        Rechazar
                      </button>

                      <button
                        onClick={openAdjustModal}
                        className="bg-white border-2 border-blue-100 text-blue-600 hover:bg-blue-50 font-bold py-3 px-4 rounded-xl transition-all"
                      >
                        Pedir Ajustes
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col items-center text-center gap-2">
                    <p className="text-slate-500 text-xs font-medium italic">
                      Tu solicitud está en revisión. Se te notificará cuando un administrador realice un cambio de estado.
                    </p>
                  </div>
                )}
              </div>
            </div>
          }
        />
      )}

      {/* MODAL PEDIR AJUSTES */}
      {askAdjustOpen && selected && (
        <Modal
          onClose={closeAdjustModal}
          contenido={
            <div className="flex flex-col h-full bg-white text-gray-800 p-6 w-[450px] max-sm:w-[90vw]">
              <div className="mb-6">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent">
                  Pedir Ajustes
                </h3>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Solicitud #{selected.id_solicitud}
                </p>
              </div>

              <div className="flex items-center mb-6">
                <label className="relative flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includeContext}
                    onChange={e => setIncludeContext(e.target.checked)}
                    className="peer sr-only"
                    id="ctx-toggle"
                  />
                  <div className="w-5 h-5 rounded-lg border-2 border-blue-500 transition-all duration-300 peer-checked:bg-blue-500 peer-checked:border-0 relative">
                    {includeContext && <CheckCircle size={14} className="text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                  </div>
                  <span className="ml-3 text-sm font-medium text-slate-700">
                    Adjuntar contexto de campo
                  </span>
                </label>
              </div>

              <div className="space-y-4">
                {includeContext && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-bold text-blue-600 mb-1 block uppercase">Campo a corregir</label>
                    <Select
                      label="Selecciona un campo"
                      options={[
                        { value: 'resumen', label: 'Resumen' },
                        { value: 'justificacion', label: 'Justificación' },
                        { value: 'monto_estimado', label: 'Monto estimado' },
                      ]}
                      defaultValue={adjustField}
                      onChange={e => setAdjustField(e.target.value)}
                    />
                    <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Valor actual</span>
                      <p className="text-sm text-slate-600 italic truncate">
                        "{selected[adjustField] || 'Sin contenido previo'}"
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-blue-600 mb-1 block uppercase">Mensaje de ajuste</label>
                  <TextArea
                    label="Escribe las correcciones necesarias..."
                    defaultValue={adjustMessage}
                    onChange={e => setAdjustMessage(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={closeAdjustModal}
                  className="px-6 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitAdjustment}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                >
                  Enviar Solicitud
                </button>
              </div>
            </div>
          }
        />
      )}

      {/* MODAL DE FILTROS */}
      {filterModalOpen && (
        <Modal
          onClose={() => setFilterModalOpen(false)}
          contenido={
            <div className=" w-full h-full flex flex-col  jus  gap-4">
              <div className=" bg-gradient-to-b from-slate-50/50 to-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                    <Filter size={22} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold tracking-tight text-slate-900">Filtros de Búsqueda</h3>
                    <p className="text-sm text-slate-500 font-medium">Personaliza los resultados de tu tabla</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-slate-700 ml-1 tracking-wide uppercase">
                  Estado de la solicitud
                </label>
                <Input
                  label="Buscar por ID o Resumen"
                  name="busqueda"

                  value={localBusqueda}
                  onChange={(e) => setLocalBusqueda(e.target.value)}
                />

                <Select
                  label="Filtrar por Estado"
                  name="estado"
                  value={localEstado}
                  onChange={(e) => setLocalEstado(e.target.value)}
                  options={[
                    { value: '', label: 'Todos los estados' },
                    { value: 'Pendiente', label: 'Pendiente' },
                    { value: 'Aprobado', label: 'Aprobado' },
                    { value: 'Rechazado', label: 'Rechazado' },
                  ]}
                />
              </div>

              <div className="mt-2 flex w-full px-4 justify-between gap-3">


                <button
                  onClick={() => {
                    if (onFilter) {
                      onFilter({ busqueda: localBusqueda, estado: localEstado });
                    }
                    setFilterModalOpen(false);
                  }}
                  className="px-6 w-full flex-1 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                >
                  Filtrar
                </button>


              </div>
            </div >
          }
        />
      )}
    </>
  );
};

export default TablaSolicitudes;