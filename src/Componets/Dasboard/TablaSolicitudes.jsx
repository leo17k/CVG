import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Box,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Download,
  Eye,
  FileText,
  Filter,
  HelpCircle,
  MessageSquare,
  Package,
  PackageOpen,
  Printer,
  Search,
  CheckCircle,
  ShoppingCart,
  Trash2,
  X,
  ChevronLeft,
  XCircle,
  Edit3,
  RotateCw
} from 'lucide-react';
import { Modal, FullModal } from '../componentes dashboard/Modal.jsx';
import ModalEditarSolicitud from './ModalEditarSolicitud';
import { TextArea, Select, Input } from '../Inputs';
import { Boton } from "../componentes dashboard/Numsolisitud.jsx";
import { BotonReporte } from "../CarruselItems/botonreporte.jsx";
import { toast } from '../GoeyToaster';
import ConfirmationModal from '../Confirmacion.jsx';
import { Avatar, AvatarFallback, AvatarImage } from "../Avatar.jsx";

const TablaSolicitudes = ({ data = [], loading: apiLoading, currentPage = 1, totalPages = 1, onPageChange, isAdmin, onRefresh, onFilter, filtrosValue = {}, onMessageSent, datauser }) => {
  // --- ESTADOS DE UI ---

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detalles, setDetalles] = useState([]);   // ← productos/servicios de la solicitud
  const [loadingDetalles, setLoadingDetalles] = useState(false);
  const [visualLoading, setVisualLoading] = useState(true);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [localBusqueda, setLocalBusqueda] = useState(filtrosValue.busqueda || '');
  const [localEstado, setLocalEstado] = useState(filtrosValue.estado || '');
  const [localTipo, setLocalTipo] = useState(filtrosValue.tipo || '');
  const [localUsuario, setLocalUsuario] = useState(filtrosValue.id_usuario || '');
  const [localGerencia, setLocalGerencia] = useState(filtrosValue.id_gerencia || '');
  const [usuariosOptions, setUsuariosOptions] = useState([]);
  const [gerenciasOptions, setGerenciasOptions] = useState([]);

  // Sincronizar valores locales cuando cambian los filtros desde el padre
  useEffect(() => {
    setLocalBusqueda(filtrosValue.busqueda || '');
    setLocalEstado(filtrosValue.estado || '');
    setLocalTipo(filtrosValue.tipo || '');
    setLocalUsuario(filtrosValue.id_usuario || '');
    setLocalGerencia(filtrosValue.id_gerencia || '');
  }, [filtrosValue]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [usersRes, gerenciasRes] = await Promise.all([
          fetch(`http://${window.location.hostname}:5000/users`, { credentials: 'include' }),
          fetch(`http://${window.location.hostname}:5000/gerencias`, { credentials: 'include' })
        ]);

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          const usuarios = (usersData.usuarios || []).map((user) => ({
            value: user.id_usuario,
            label: `${user.nombres || ''} ${user.apellidos || ''}`.trim() || user.username || `Usuario #${user.id_usuario}`,
            avatar: user.avatar,
          }));
          setUsuariosOptions([{ value: '', label: 'Todos los usuarios' }, ...usuarios]);
        }

        if (gerenciasRes.ok) {
          const gerenciasData = await gerenciasRes.json();
          const gerencias = (gerenciasData.gerencias || []).map((gerencia) => ({
            value: gerencia.id_gerencia,
            label: gerencia.nombre_gerencia,
          }));
          setGerenciasOptions([{ value: '', label: 'Todas las gerencias' }, ...gerencias]);
        }
      } catch (error) {
        console.error('Error cargando filtros:', error);
      }
    };

    loadFilterOptions();
  }, []);

  // --- ESTADOS DE PROCESAMIENTO SUAVE ---
  const [isProcessingLocal, setIsProcessingLocal] = useState(false);
  const [processSuccessMessage, setProcessSuccessMessage] = useState('');

  // --- ESTADOS DE AJUSTES ---
  const [askAdjustOpen, setAskAdjustOpen] = useState(false);
  const [adjustField, setAdjustField] = useState('resumen');
  const [adjustMessage, setAdjustMessage] = useState('');
  const [includeContext, setIncludeContext] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [hasTempEditPermission, setHasTempEditPermission] = useState(false);

  // --- ESTADO DE MODAL DE CONFIRMACIÓN DINÁMICO ---
  const [confModal, setConfModal] = useState({
    isOpen: false,
    type: 'question',
    title: '',
    message: '',
    onConfirm: () => { }
  });

  // --- DETECCIÓN DE ROLES ---
  const rolStr = typeof isAdmin === 'string' ? isAdmin.toLowerCase().trim() : '';
  const rolId = typeof isAdmin === 'number' ? isAdmin : null;

  const isSuperAdmin = rolId === 5 || rolStr === 'superadministrador';
  const isAdministrador = rolId === 11 || rolStr === 'administrador';
  const isGerente = rolId === 8 || rolStr.includes('gerente');
  const isComprador = rolId === 10 || rolStr === 'comprador';
  const isAlmacenista = rolId === 9 || rolStr === 'almacenista';
  const isPersonal = rolId === 12 || rolStr === 'personal';

  // isAdminView: cualquier rol con acceso al panel (no Personal)
  const isAdminView = isSuperAdmin || isAdministrador || isGerente || isComprador || isAlmacenista;

  // Manejo de Skeleton
  useEffect(() => {
    if (apiLoading) {
      setVisualLoading(true);
    } else {
      const timer = setTimeout(() => setVisualLoading(false), 200);
      return () => clearTimeout(timer);
    }
  }, [apiLoading, currentPage]);

  // using global `toast` from GoeyToaster

  // --- FUNCIONES DE ACCIÓN ---
  const openModal = async (row) => {
    setSelected(row);
    setDetalles([]);
    setModalOpen(true);
    setHasTempEditPermission(false);
    // Carga los detalles desde el servidor
    try {
      setLoadingDetalles(true);
      const resp = await fetch(
        `http://${window.location.hostname}:5000/solicitudes/${row.id_solicitud}`,
        { credentials: 'include' }
      );
      if (resp.ok) {
        const data = await resp.json();
        console.log('detalles :', data)
        setSelected({ ...(data.solicitud || {}), aprobador: data.aprobador || null, historial: data.historial || [] });  // datos completos (incluye requerimientos_texto, pdf, etc.)
        setDetalles(data.detalles || []);
      }

      // Verificar si el solicitante actual tiene permiso de edición temporal
      const permResp = await fetch(
        `http://${window.location.hostname}:5000/solicitudes/${row.id_solicitud}/permiso-edicion`,
        { credentials: 'include' }
      );
      if (permResp.ok) {
        const permData = await permResp.json();
        setHasTempEditPermission(permData.hasPermission);
      }
    } catch (e) {
      console.error('Error cargando detalles:', e);
    } finally {
      setLoadingDetalles(false);
    }
  };

  const closeModal = () => {
    setSelected(null);
    setDetalles([]);
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
        const isAprobado = String(newStatus).toLowerCase().includes('aprob') || String(newStatus).toLowerCase().includes('aprov');
        setProcessSuccessMessage(isAprobado ? '¡Solicitud Aprobada!' : 'Solicitud actualizada');

        // Cierra de inmediato en la primera respuesta exitosa del backend,
        // antes de refrescar la tabla o esperar estados intermedios.
        setModalOpen(false);
        setSelected(null);

        if (onRefresh) onRefresh();
        setIsProcessingLocal(false);
        setProcessSuccessMessage('');

        if (isAprobado) {
          const codigo = selected?.codigo_solicitud || `#${id}`;
          toast.success(`Operación Finalizada`, {
            description: `La solicitud ${codigo} ha sido aprobada correctamente.`,
          });
        } else {
          const codigo = selected?.codigo_solicitud || `#${id}`;
          toast.warning(`Operación Finalizada`, {
            description: `La solicitud ${codigo} ha sido rechazada correctamente.`,
          });
        }






      } else {
        const err = await resp.json();
        setIsProcessingLocal(false);
        toast.error('Error', { description: err.message || 'No se pudo actualizar el estado.' });
      }
    } catch (error) {
      setIsProcessingLocal(false);
      toast.error('Error', { description: 'Error de conexión con el servidor.' });
    }
  };

  const handleApprove = (id, targetStatus = 'Aprobado Gerencia') => {
    const targetId = id || selected?.id_solicitud || selected?.id || null;
    if (!targetId) { toast.error('Error', { description: 'ID de solicitud no encontrado' }); return; }
    triggerAction({
      title: "¿Confirmar Aprobación?",
      message: `Estás por aprobar la solicitud ${selected?.codigo_solicitud || `#${targetId}`}. Esta acción notificará al usuario y cambiará el estado del expediente.`,
      type: "question",
      action: () => changeStatus(targetId, targetStatus)
    });
  };

  const handleReject = (id) => {
    const targetId = id || selected?.id_solicitud || selected?.id || null;
    if (!targetId) { toast.error('Error', { description: 'ID de solicitud no encontrado' }); return; }
    triggerAction({
      title: "¿Rechazar Solicitud?",
      message: `¿Estás seguro de rechazar la solicitud ${selected?.codigo_solicitud || `#${targetId}`}? Esta acción es definitiva.`,
      type: "danger",
      action: () => changeStatus(targetId, 'Rechazado')
    });
  };

  const handleGrantEditPermission = async () => {
    if (!selected?.id_solicitud) return;
    try {
      const resp = await fetch(`http://${window.location.hostname}:5000/solicitudes/${selected.id_solicitud}/permitir-edicion`, {
        method: 'POST',
        credentials: 'include'
      });
      if (resp.ok) {
        setHasTempEditPermission(true);
        toast.success('Permiso de edición temporal otorgado con éxito.');
      } else {
        const err = await resp.json();
        toast.error('Error', { description: err.error || 'No se pudo otorgar el permiso.' });
      }
    } catch (error) {
      toast.error('Error de conexión', { description: 'Error al comunicarse con el servidor.' });
    }
  };

  const submitAdjustment = async () => {
    if (!adjustMessage.trim()) {
      toast.error('Campo vacío', { description: 'Por favor, ingresa un mensaje de ajuste.' });
      return;
    }

    try {
      let message = includeContext
        ? `Ajuste en "${adjustField}": ${adjustMessage}. Valor actual: ${selected[adjustField]}`
        : adjustMessage;
      // Si la solicitud existe, enviamos al endpoint específico de la solicitud (chat grupal)
      if (selected?.id_solicitud) {
        const resp = await fetch(`http://${window.location.hostname}:5000/solicitudes/${selected.id_solicitud}/mensaje`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mensaje: message })
        });

        if (resp.ok) {
          setAskAdjustOpen(false);
          toast.success('Enviado', { description: 'La solicitud de ajuste fue enviada con éxito.' });
          setAdjustMessage('');
          if (onMessageSent) onMessageSent();
        } else {
          const err = await resp.json().catch(() => ({}));
          toast.error('Error', { description: err.message || 'No se pudo enviar la solicitud al servidor.' });
        }
      } else {
        // Fallback: mensaje privado al endpoint general
        const body = { mensaje: message, toId: selected?.id_solicitante, tipo: 'ajuste' };
        const resp = await fetch(`http://${window.location.hostname}:5000/mensajes`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (resp.ok) {
          setAskAdjustOpen(false);
          toast.success('Enviado', { description: 'La solicitud de ajuste fue enviada con éxito.' });
          setAdjustMessage('');
          if (onMessageSent) onMessageSent();
        } else {
          const err = await resp.json().catch(() => ({}));
          toast.error('Error', { description: err.message || 'No se pudo enviar la solicitud al servidor.' });
        }
      }
    } catch (error) {
      toast.error('Error', { description: 'Error de conexión con el servidor.' });
    }
  };

  const obtenerIniciales = (nombre) => {
    if (!nombre) return "";
    return nombre
      .split(" ")                   // Divide el nombre por cada espacio
      .filter(word => word !== "")  // Elimina espacios extra si los hay
      .map(word => word[0])         // Toma el primer caracter de cada palabra
      .join("")                     // Une las letras
      .toUpperCase();               // Lo pone en mayúsculas
  };

  const renderUserOption = (option) => {
    if (!option || option.value === '') {
      return <span className="text-sm text-slate-700">{option?.label || 'Selecciona una opción'}</span>;
    }

    const initials = (option.label || '').split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase();
    return (
      <div className="flex items-center gap-2">
        <Avatar size="sm" className="border border-slate-200">
          <AvatarImage src={option.avatar} className="object-cover" />
          <AvatarFallback className="bg-slate-100 text-[10px] text-slate-600">{initials}</AvatarFallback>
        </Avatar>
        <span className="text-sm text-slate-700">{option.label}</span>
      </div>
    );
  };

  const renderUserValue = (option) => {
    if (!option || option.value === '') {
      return <span className="text-sm text-slate-700">{option?.label || 'Selecciona una opción'}</span>;
    }

    const initials = (option.label || '').split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase();
    return (
      <div className="flex items-center gap-2">
        <Avatar size="sm" className="border border-slate-200">
          <AvatarImage src={option.avatar} className="object-cover" />
          <AvatarFallback className="bg-slate-100 text-[10px] text-slate-600">{initials}</AvatarFallback>
        </Avatar>
        <span className="truncate text-sm text-slate-700">{option.label}</span>
      </div>
    );
  };

  return (
    <>
      {/* toasts handled globally by GoeyToaster */}

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
          <h2 className="font-bold text-slate-800">
            {isPersonal ? 'Mis Solicitudes' : 'Listado de Solicitudes'}
          </h2>
          {/* Solo admins/gerentes ven controles de filtro y reporte */}
          {isAdminView && (
            <>
              <button
                onClick={() => setFilterModalOpen(true)}
                className="ml-4 p-2 rounded-2xl bg-white shadow-sm t-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors flex items-center gap-2 text-xs font-semibold"
              >
                <Filter size={16} />
                <span className="max-lg:hidden">Filtros</span>
              </button>

              <button
                onClick={onRefresh}
                disabled={apiLoading}
                className="p-2 rounded-2xl bg-white shadow-sm text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors flex items-center gap-2 text-xs font-semibold disabled:opacity-50"
                title="Refrescar tabla"
              >
                <RotateCw size={16} className={apiLoading ? 'animate-spin' : ''} />
                <span className="max-lg:hidden">Refrescar</span>
              </button>

              <Boton onRefresh={onRefresh} />
              {/* {(isSuperAdmin || isAdministrador) && (
                // <BotonReporte idSolicitud={1} />
              )} */}
            </>
          )}
          {/* Personal solo ve botón de actualizar y refrescar */}
          {isPersonal && (
            <>
              <button
                onClick={onRefresh}
                disabled={apiLoading}
                className="ml-4 p-2 rounded-2xl bg-white shadow-sm text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors flex items-center gap-2 text-xs font-semibold disabled:opacity-50"
                title="Refrescar tabla"
              >
                <RotateCw size={16} className={apiLoading ? 'animate-spin' : ''} />
                <span className="max-lg:hidden">Refrescar</span>
              </button>
              <Boton onRefresh={onRefresh} />
            </>
          )}
          <div className='flex justify-center items-center ml-auto gap-2'>
            {[...Array(Math.min(totalPages, 5))].map((_, i) => (
              <div key={i} className={`size-2 rounded-full transition-all ${currentPage === i + 1 ? 'bg-blue-600 size-3' : 'bg-gray-300'}`}></div>
            ))}
          </div>
        </div>

        {/* Pestañas de Roles / Vistas */}
        {(() => {
          const showTabMisSolicitudes = true;
          const showTabCompras = isComprador || isSuperAdmin || isAdministrador;
          const showTabAuditar = isSuperAdmin || isAdministrador;
          const activeTab = filtrosValue.vista || '';

          const totalTabs = (showTabMisSolicitudes ? 1 : 0) + (showTabCompras ? 1 : 0) + (showTabAuditar ? 1 : 0);
          if (totalTabs <= 1) return null;

          return (
            <div id="tabs-roles" className="flex justify-start ml-12 mt-2 gap-2 items-end  z-2">
              {showTabMisSolicitudes && (
                <button
                  onClick={() => onFilter && onFilter({ ...filtrosValue, vista: 'mis_solicitudes' })}
                  className={`p-2 px-4 rounded-2xl bg-white/50 backdrop-blur-md shadow-[4px_0_4px_0px_rgba(0,0,0,0.1)] rounded-b-none transition-colors flex items-center gap-2 text-xs font-semibold ${activeTab === 'mis_solicitudes' ? 'text-blue-600 bg-slate-100' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  Mis Solicitudes
                </button>
              )}
              {showTabCompras && (
                <button
                  onClick={() => onFilter && onFilter({ ...filtrosValue, vista: 'compras' })}
                  className={`p-2 px-4 rounded-2xl bg-white/50 backdrop-blur-md shadow-[4px_0_4px_0px_rgba(0,0,0,0.1)] rounded-b-none transition-colors flex items-center gap-2 text-xs font-semibold ${activeTab === 'compras' ? 'text-blue-600 bg-slate-100' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  Compras
                </button>
              )}
              {showTabAuditar && (
                <button
                  onClick={() => onFilter && onFilter({ ...filtrosValue, vista: 'auditar' })}
                  className={`p-2 px-4 rounded-2xl bg-white/50 backdrop-blur-md shadow-[4px_0_4px_0px_rgba(0,0,0,0.1)] rounded-b-none transition-colors flex items-center gap-2 text-xs font-semibold ${activeTab === 'auditar' ? 'text-blue-600 bg-slate-100' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  Auditar todas
                </button>
              )}
            </div>
          );
        })()}

        {/* Tabla */}
   
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-sm border-collapse table-fixed min-w-[800px]">
            <thead className="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-bold sticky top-0 z-10">
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80">ID</th>
                <th className="w-[200px] px-6 py-4 backdrop-blur-sm bg-slate-50/80">Resumen</th>

                <th className="px-6 py-4 backdrop-blur-sm w-[230px]  bg-slate-50/80">Gerencia</th>
                <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80">Estado</th>
                <th className="px-6 py-4 text-right backdrop-blur-sm bg-slate-50/80">Tipo</th>
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
                    <td className="px-6 py-3.5 font-bold text-slate-400 w-max whitespace-nowrap">{row.codigo_solicitud || `#${row.id_solicitud}`}</td>
                    <td className="px-6 py-3.5 font-semibold text-slate-700 truncate">{row.resumen}</td>

                    <td className="px-6 py-3.5 whitespace-nowrap text-left text-nowrap font-bold text-slate-800">
                      <span
                        className="group relative inline-flex max-w-[200px]  rounded-md text-slate-700 transition-colors hover:text-slate-900"
                        data-title={row.nombre_gerencia || 'Sin gerencia'}
                        style={{ maxWidth: '200px' }}
                      >
                        <span className="block truncate rounded-md px-2 py-1 hover:bg-slate-100">
                          {row.nombre_gerencia || 'Sin gerencia'}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-nowrap w-max ">
                      <span style={{ backgroundColor: "", color: row.estado_color, borderColor: row.estado_color }} className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border `}>

                        {row.estado_nombre} 
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-800">
                      {row.tipo_solicitud}
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

      {/* MODAL DETALLE SOLICITUD - VISTA EXPANDIDA */}
      {modalOpen && selected && (
        <Modal
          onClose={closeModal}
          padding={false}
          contenido={
            <div id="solicitud-modal" data-tour-root="solicitud" className="flex flex-col h-[90vh] bg-slate-50 w-[1100px] max-lg:w-[95vw] max-sm:w-full max-sm:h-full overflow-hidden relative shadow-2xl rounded-4xl border border-white">

              {/* HEADER SUPERIOR */}
              <div data-tour="solicitud-header" className="bg-white px-10 py-7 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-5">
                  <div className="bg-linear-to-br from-blue-600 to-indigo-700 p-3.5 rounded-2xl shadow-xl shadow-blue-200/50">
                    <FileText className="text-white w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.25em]">Sistema ERP</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                      <span className="text-[10px] max-sm:opacity-0 font-bold text-slate-400 uppercase">Expediente Digital</span>
                    </div>
                    <h3 className="text-3xl max-sm:text-xl font-black text-slate-900 leading-none">
                      Solicitud <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">{selected.codigo_solicitud || `#${selected.id_solicitud}`}</span>
                    </h3>
                  </div>
                </div>





                <div className="flex items-center gap-6 mr-4">
                  <div className="text-right hidden md:block">
        
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Tipo de Gestión</p>
                    <p className="text-sm font-black text-blue-800">{selected.tipo_solicitud}</p>
                  </div>
                  
                  <div className="px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider border shadow-sm transition-all"
                    style={{
                      color: selected.estado_color || '#334155',
                      borderColor: selected.estado_color || '#cbd5e1',
                      backgroundColor: selected.estado_color ? `${selected.estado_color}1A` : 'rgba(148,163,184,0.1)'
                    }}
                  >
                    {selected.estado_nombre}
                  </div>

                </div>
              </div>


              {/* CONTENIDO PRINCIPAL */}

              <div className="flex flex-1 max-sm:h-fit overflow-hidden max-sm:overflow-auto max-sm:flex-col">

                {/* COLUMNA IZQUIERDA: RESUMEN (60%) */}
                <div className="w-[62%] max-sm:w-full max-sm:overflow-visible overflow-y-auto p-10 space-y-10 bg-white custom-scrollbar">
                   <div className="flex md:hidden items-center gap-4">
                      <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                        <AvatarImage src={selected.avatar} className="object-cover" />
                        <AvatarFallback className="bg-linear-to-tr from-blue-600 to-indigo-700 text-white text-sm font-black uppercase">
                          {obtenerIniciales(selected.nombre_completo)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Solicitante</p>
                        <p className="text-sm font-black text-slate-900">{selected.nombre_completo}</p>
                      </div>
                    </div>
                  <div className="hidden max-sm:block">                 <p className="text-xl font-bold text-slate-400 uppercase tracking-tighter">Tipo de Gestión</p>
                    <p className="text-sm font-black text-blue-800">{selected.tipo_solicitud}</p></div>
                  {/* Título y Gerencia */}
                  <section className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Gerencia: {selected.nombre_gerencia} CC:{selected.centro_costo || 'N/A'}</span>
                    </div>
                    <h4 className="text-2xl font-black text-slate-800 leading-tight tracking-tight">
                      {selected.resumen}
                    </h4>
                  </section>

                  {/* Justificación */}
                  <section>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-3">
                      Justificación del Pedido <div className="h-px flex-1 bg-slate-100"></div>
                    </h4>
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-linear-to-r from-blue-100 to-indigo-100 rounded-4xl blur opacity-25"></div>
                      <div className="relative bg-white p-8 rounded-3xl border border-slate-200 shadow-sm leading-relaxed text-slate-600 text-base whitespace-pre-wrap">
                        {selected.justificacion || "Sin justificación técnica detallada."}
                      </div>
                    </div>

                    {selected?.justificacion_pdf_url && (
                      <div className="mt-4 bg-cyan-50/60 p-4 rounded-2xl border border-cyan-200 flex items-center gap-3">
                        <FileText size={16} className="text-cyan-600 shrink-0" />
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-cyan-700 uppercase">Justificación en PDF</p>
                          <p className="text-xs text-cyan-800 font-medium truncate">{selected.justificacion_pdf_url}</p>
                        </div>
                        <a
                          href={`http://${window.location.hostname}:5000/uploads/solicitudes/${selected.justificacion_pdf_url}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-[10px] font-bold text-cyan-700 underline"
                        >Ver PDF</a>
                      </div>
                    )}
                  </section>

                  {/* Métricas Inferiores */}
                  <div className="grid grid-cols-1 gap-8 pt-4">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col justify-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Fecha de Emisión</p>
                      <p className="text-sm font-black text-slate-700 uppercase">
                        {selected.fecha_creacion
                          ? new Date(selected.fecha_creacion).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })
                          : "Fecha no registrada"}
                      </p>
                    </div>

                    {selected?.historial && selected.historial.length > 0 && (
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Historial de Estados</p>
                        <div className="space-y-3">
                          {selected.historial.map((h, idx) => (
                            <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-700">{h.estado_nuevo}</span>
                                  <span className="text-[10px] text-slate-500">{h.fecha_cambio ? new Date(h.fecha_cambio).toLocaleString() : ''}</span>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  {h.responsable && (h.responsable.nombres ? `${h.responsable.nombres} ${h.responsable.apellidos || ''}` : h.responsable.nombre)}
                                </p>
                                {h.comentarios && <p className="text-[11px] italic text-slate-400">{h.comentarios}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUMNA DERECHA: ESPECIFICACIONES (38%) */}
                <div className="flex-1 max-sm:h-fit max-sm:overflow-visible overflow-y-auto p-10 space-y-6 bg-slate-50/80 custom-scrollbar border-l border-slate-100">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
                    <ClipboardList size={18} className="text-blue-600" /> Especificaciones Técnicas
                  </h4>

                  {/* Listado de items reales de la solicitud */}
                  <div data-tour="solicitud-items" className="space-y-4">
                    {loadingDetalles ? (
                      <div className="flex items-center gap-3 p-4 text-slate-400 text-sm">
                        <span className="animate-spin">⏳</span> Cargando ítems...
                      </div>
                    ) : detalles.length === 0 ? (
                      <div className="bg-slate-100 p-5 rounded-2xl text-slate-400 text-xs text-center">
                        Sin productos o servicios registrados en esta solicitud.
                      </div>
                    ) : (
                      detalles.map((item, i) => (
                        <div key={item.id_detalle} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black px-2 py-1 bg-slate-100 rounded text-slate-500 uppercase">Ítem #{i + 1}</span>
                            <Package size={16} className="text-slate-300" />
                          </div>

                          {item.id_producto ? (
                            <>
                              <p className="text-sm font-bold text-slate-800 mb-1 leading-snug">{item.nombre_item}</p>
                              <p className="text-xs text-slate-500 mb-3 line-clamp-2">{item.descripcion_detalle || ''}</p>
                              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <div className="text-center">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">Código</p>
                                  <p className="text-xs font-black text-blue-700 font-mono">{item.codigo_item || '—'}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">Cantidad</p>
                                  <p className="text-xs font-black text-slate-700">{item.cantidad}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">Unidad</p>
                                  <p className="text-xs font-black text-slate-700">{item.unidad_abreviatura || item.nombre_unidad || '—'}</p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-bold text-slate-800 mb-1 leading-snug">{item.nombre_item || `Servicio #${item.id_servicio}`}</p>
                              <p className="text-xs text-slate-500 mb-3 line-clamp-2">{item.descripcion_detalle || 'Sin descripción del servicio.'}</p>
                              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <div className="text-center">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">Código</p>
                                  <p className="text-xs font-black text-blue-700 font-mono">{item.codigo_item || '—'}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">Cantidad</p>
                                  <p className="text-xs font-black text-slate-700">{item.cantidad}</p>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}

                    {/* Requerimientos adicionales */}
                    {selected?.requerimientos_texto && (
                      <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-100">
                        <p className="text-[10px] font-black text-blue-700 uppercase mb-2">Requerimientos Adicionales</p>
                        <p className="text-[11px] text-blue-900 leading-relaxed">{selected.requerimientos_texto}</p>
                      </div>
                    )}

                    {/* PDF adjunto */}
                    {selected?.requerimientos_pdf_url && (
                      <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 flex items-center gap-3">
                        <FileText size={16} className="text-amber-600 shrink-0" />
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-amber-700 uppercase">Documento Adjunto</p>
                          <p className="text-xs text-amber-800 font-medium truncate">{selected.requerimientos_pdf_url}</p>
                        </div>
                        <a
                          href={`http://${window.location.hostname}:5000/uploads/solicitudes/${selected.requerimientos_pdf_url}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-[10px] font-bold text-amber-700 underline"
                        >Ver PDF</a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* FOOTER - ACCIONES: Lógica de estados */}
              {(() => {
                const estadoActual = String(selected.estado_nombre || selected.estado || '').toLowerCase().trim();
                const esPendiente = estadoActual === 'pendiente';
                const esAprobadoGerencia = estadoActual.includes('aprobado gerencia');
                const esEnCompras = estadoActual.includes('en compras');
                const esRechazado = estadoActual.includes('rechazado');
                const esEstadoAvanzado = estadoActual.includes('verificado') || esEnCompras || estadoActual.includes('aprovadas');
                // Estado que ya no requiere acción de Gerente (pero sí puede requerir acción de Comprador)
                const esFinalOAprobado = esAprobadoGerencia || esRechazado || esEstadoAvanzado;

                // ¿Puede actuar el Comprador en este estado?
                const compradorPuedeActuar = esEnCompras && (isComprador || isSuperAdmin || isAdministrador);
                // ¿Puede actuar el Gerente/Admin en este estado?
                const gerentePuedeActuar = esPendiente && (isGerente || isSuperAdmin || isAdministrador);

                return (
                  <div data-tour="solicitud-actions" className="bg-white  px-10 py-7 border-t border-slate-100 flex justify-between items-center shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                    <div className="flex max-sm:hidden items-center gap-4">
                      <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                        <AvatarImage src={selected.avatar} className="object-cover" />
                        <AvatarFallback className="bg-linear-to-tr from-blue-600 to-indigo-700 text-white text-sm font-black uppercase">
                          {obtenerIniciales(selected.nombre_completo)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Solicitante</p>
                        <p className="text-sm font-black text-slate-900">{selected.nombre_completo}</p>
                      </div>
                    </div>

                  

                    <div className="flex gap-3">
                      {(() => {
                        const isOwner = selected && Number(selected.id_solicitante) === Number(datauser?.userId);
                        const isEditableState = selected && (selected.estado_nombre === 'Pendiente' || selected.estado_nombre === 'Borrador');
                        const canEdit = selected && (isSuperAdmin || isAdministrador || (isOwner && (isEditableState || hasTempEditPermission)));

                        return canEdit && (
                          <button
                            onClick={() => setEditModalOpen(true)}
                            className="px-6 py-3 rounded-xl border border-blue-200 text-blue-600 font-bold text-[11px] uppercase hover:bg-blue-50 transition-all flex items-center gap-2"
                          >
                            <Edit3 size={16} /> <span className='max-sm:hidden'>Editar</span>
                          </button>
                        );
                      })()}

                      {(() => {
                        const canGrant = selected && (isSuperAdmin || isAdministrador || isComprador);
                        const isSolPersonal = selected && selected.solicitante_rol_id === 12;
                        const isEditableState = selected && (selected.estado_nombre === 'Pendiente' || selected.estado_nombre === 'Borrador');
                        const showGrantButton = canGrant && isSolPersonal && !isEditableState && !hasTempEditPermission;

                        return showGrantButton && (
                          <button
                            onClick={handleGrantEditPermission}
                            className="px-6 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[11px] uppercase hover:bg-blue-100 transition-all flex items-center gap-2"
                          >
                            <AlertCircle size={16} /> <span className='max-sm:hidden'>Habilitar Edición</span>
                          </button>
                        );
                      })()}

                      {isPersonal ? (
                        /* ── VISTA PERSONAL: solo puede imprimir ── */
                        <button
                          onClick={() => window.open(`http://${window.location.hostname}:5000/reporte/${selected.id_solicitud}`, '_blank')}
                          className="px-8 py-3 rounded-xl bg-slate-900 text-white font-black text-[11px] uppercase flex items-center gap-2 hover:bg-black transition-all"
                        >
                          <Printer size={16} /><span className='max-sm:hidden'>Imprimir Copia</span>
                        </button>

                      ) : isAdminView ? (
                        /* ── VISTA ADMIN/GERENTE/COMPRADOR ── */
                        compradorPuedeActuar ? (
                          /* Comprador: estado 'En Compras' → puede marcar como Aprovadas */
                          <>
                            <button onClick={() => handleReject()} className="px-6 py-3 rounded-xl border border-rose-100 text-rose-600 font-bold text-[11px] uppercase hover:bg-rose-50 transition-all flex items-center gap-2">
                              <XCircle size={16} /> <span className='max-sm:hidden'>Rechazar</span>
                            </button>
                            <button onClick={openAdjustModal} className="px-6 py-3 rounded-xl border border-blue-200 text-blue-600 font-bold text-[11px] uppercase hover:bg-blue-50 transition-all flex items-center gap-2">
                              <MessageSquare size={16} /><span className='max-sm:hidden'>Seguimiento</span>
                            </button>
                            <button onClick={() => handleApprove(null, 'Aprovadas')} className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-black text-[11px] uppercase shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all transform active:scale-95 flex items-center gap-2">
                              <CheckCircle size={16} /><span className='max-sm:hidden'>Aprobar Compra</span>
                            </button>
                          </>
                        ) : esFinalOAprobado ? (
                          /* Estado ya aprobado o avanzado (sin acción de comprador): solo seguimiento y PDF */
                          <>
                            <button onClick={openAdjustModal} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-[11px] uppercase hover:bg-slate-50 transition-all flex items-center gap-2">
                              <MessageSquare size={16} /> Seguimiento
                            </button>
                            <button
                              onClick={() => window.open(`http://${window.location.hostname}:5000/reporte/${selected.id_solicitud}`, '_blank')}
                              className="px-8 py-3 rounded-xl bg-slate-900 text-white font-black text-[11px] uppercase shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center gap-2"
                            >
                              <Download size={16} /> <span className='max-sm:hidden'>Generar PDF</span>
                            </button>
                          </>
                        ) : gerentePuedeActuar ? (
                          /* Estado Pendiente: Gerente/Admin puede Aprobar o Rechazar */
                          <>
                            <button onClick={() => handleReject()} className="px-6 py-3 rounded-xl border border-rose-100 text-rose-600 font-bold text-[11px] uppercase hover:bg-rose-50 transition-all flex items-center gap-2">
                              <XCircle size={16} /> <span className='max-sm:hidden'>Rechazar</span>
                            </button>
                            <button onClick={openAdjustModal} className="px-6 py-3 rounded-xl border border-blue-200 text-blue-600 font-bold text-[11px] uppercase hover:bg-blue-50 transition-all flex items-center gap-2">
                              <MessageSquare size={16} /><span className='max-sm:hidden'>Ajustes</span>
                            </button>
                            <button onClick={() => handleApprove(null, 'Aprobado Gerencia')} className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-black text-[11px] uppercase shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all transform active:scale-95 flex items-center gap-2">
                              <CheckCircle size={16} /><span className='max-sm:hidden'>Aprobar</span>
                            </button>
                          </>
                        ) : (
                          /* Borrador u otro estado sin acción disponible: solo seguimiento */
                          <button onClick={openAdjustModal} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-[11px] uppercase hover:bg-slate-50 transition-all flex items-center gap-2">
                            <MessageSquare size={16} /> Seguimiento
                          </button>
                        )
                      ) : (
                        /* ── OTROS USUARIOS: solo imprimir ── */
                        <button
                          onClick={() => window.open(`http://${window.location.hostname}:5000/reporte/${selected.id_solicitud}`, '_blank')}
                          className="px-8 py-3 rounded-xl bg-slate-900 text-white font-black text-[11px] uppercase flex items-center gap-2 hover:bg-black transition-all"
                        >
                          <Printer size={16} /><span className='max-sm:hidden'>Imprimir Copia</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
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
                <h3 className="text-2xl font-bold bg-linear-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent">
                  Pedir Ajustes
                </h3>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Solicitud #{selected.id_solicitud}
                </p>
              </div>


              <div 
                onClick={() => setIncludeContext(prev => !prev)}
                className="flex items-center cursor-pointer mb-4 select-none"
              >
                <div className={`w-5 h-5 rounded-lg border-2 border-blue-500 transition-all duration-300 relative flex-shrink-0 ${includeContext ? 'bg-blue-500 border-0' : ''}`}>
                  {includeContext && <CheckCircle size={14} className="text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                </div>
                <span className="ml-3 text-sm font-medium text-slate-700">
                  Adjuntar contexto de campo
                </span>
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
                      ]}
                      defaultValue={adjustField}
                      onChange={e => setAdjustField(e.target.value)}
                    />
                    <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1"> Valor actual</span>
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
            </div >
          }
        />
      )}

      {/* MODAL DE FILTROS */}
      {
        filterModalOpen && (
          <Modal
            onClose={() => setFilterModalOpen(false)}

            contenido={
              <div className=" w-full h-full flex flex-col  jus  gap-4">
                <div className=" bg-linear-to-b from-slate-50/50 to-white">
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
                      { value: 'Aprobado Gerencia', label: 'Aprobado Gerencia' },
                      { value: 'Aprovadas', label: 'Aprovadas' },
                      { value: 'En Compras', label: 'En Compras' },
                      { value: 'Finalizado', label: 'Finalizado' },
                      { value: 'Rechazado', label: 'Rechazado' },
                    ]}
                  />

                  <Select
                    label="Filtrar por Tipo"
                    name="tipo"
                    value={localTipo}
                    onChange={(e) => setLocalTipo(e.target.value)}
                    options={[
                      { value: '', label: 'Todos los tipos' },
                      { value: 'Compra', label: 'Compra' },
                      { value: 'Servicio', label: 'Servicio' },
                      { value: 'Obra', label: 'Obra' }
                    ]}
                  />

                  <Select
                    label="Filtrar por Usuario"
                    name="id_usuario"
                    value={localUsuario}
                    onChange={(e) => setLocalUsuario(e.target.value)}
                    options={usuariosOptions}
                    renderOption={renderUserOption}
                    renderValue={renderUserValue}
                  />

                  <Select
                    label="Filtrar por Gerencia"
                    name="id_gerencia"
                    value={localGerencia}
                    onChange={(e) => setLocalGerencia(e.target.value)}
                    options={gerenciasOptions}
                  />
                </div>

                <div className="mt-2 flex w-full px-4 justify-between gap-3">

                  <button
                    onClick={() => {
                      // Limpiar filtros localmente y en el padre
                      setLocalBusqueda('');
                      setLocalEstado('');
                      setLocalTipo('');
                      setLocalUsuario('');
                      setLocalGerencia('');
                      if (onFilter) onFilter({ ...filtrosValue, busqueda: '', estado: '', tipo: '', id_usuario: '', id_gerencia: '' });
                      setFilterModalOpen(false);
                    }}
                    className="px-4 w-1/2 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Limpiar
                  </button>

                  <button
                    onClick={() => {
                      if (onFilter) {
                        onFilter({ ...filtrosValue, busqueda: localBusqueda, estado: localEstado, tipo: localTipo, id_usuario: localUsuario, id_gerencia: localGerencia });
                      }
                      setFilterModalOpen(false);
                    }}
                    className="px-6 w-1/2 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                  >
                    Filtrar
                  </button>

                </div>
              </div >
            }
          />
        )
      }

      {/* MODAL DE EDICIÓN */}
      {
        editModalOpen && selected && (
          <ModalEditarSolicitud
            solicitud={selected}
            detallesIniciales={detalles}
            onClose={() => setEditModalOpen(false)}
            onRefresh={() => {
              if (onRefresh) onRefresh();
              closeModal();
            }}
          />
        )
      }
    </>
  );
};

export default TablaSolicitudes;