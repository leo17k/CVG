import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, Building2, User, CheckCircle, XCircle, Mail, Filter, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Modal } from '../componentes dashboard/Modal.jsx';
import { TextArea, Select, Input } from '../Inputs';
import AlertItem from '../Alerts';
import ConfirmationModal from '../Confirmacion';
import { Avatar, AvatarFallback, AvatarImage } from '../Avatar';
import ModalEstacion from '../ModalEstacion';
import { div, select } from 'motion/react-client';



const TablaUsuarios = ({ data = [], alSeleccionar, loading: apiLoading, currentPage = 1, totalPages = 1, onPageChange, isAdmin, onFilter, gerencias = [], roles = [], filtrosActuales = {}, onUserCreated, GerenciasPresupuesto = [] }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [result, setResult] = useState(false)
    const [isProcessingLocal, setIsProcessingLocal] = useState(false);
    const [processSuccessMessage, setProcessSuccessMessage] = useState('');

    const [askAdjustOpen, setAskAdjustOpen] = useState(false);
    const [adjustField, setAdjustField] = useState('resumen');
    const [adjustMessage, setAdjustMessage] = useState('');
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [includeContext, setIncludeContext] = useState(true);

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createData, setCreateData] = useState({ id_rol: 4, id_gerencia: '' });

    // Estados locales para el modal de filtros
    const [localBusqueda, setLocalBusqueda] = useState(filtrosActuales.busqueda || '');
    const [localColumna, setLocalColumna] = useState(filtrosActuales.columna || 'nombres');
    const [localGerencia, setLocalGerencia] = useState(filtrosActuales.gerencia || '');

    useEffect(() => {
        if (filterModalOpen) {
            setLocalBusqueda(filtrosActuales.busqueda || '');
            setLocalColumna(filtrosActuales.columna || 'nombres');
            setLocalGerencia(filtrosActuales.gerencia || '');
        }
    }, [filterModalOpen, filtrosActuales.busqueda, filtrosActuales.columna, filtrosActuales.gerencia]);

    const optionsColumna = [
        { value: 'nombres', label: 'Nombre' },
        { value: 'cedula', label: 'Cédula' },
        { value: 'email', label: 'Correo' },
        { value: 'username', label: 'Usuario' },

    ];



    console.log('isadmin: ', isAdmin)
    const [visualLoading, setVisualLoading] = useState(true);
    // ... dentro del componente TablaUsuarios
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editData, setEditData] = useState({});

    const openEditModal = (row) => {
        setEditData(row); // Cargamos los datos actuales de la fila
        setEditModalOpen(true);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
        console.log(editData);
    };

    const submitEdit = async () => {
        try {
            const apiUrl = `http://${window.location.hostname}:5000/usuarios/${editData.id_usuario}`;
            const resp = await fetch(apiUrl, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editData)
            });

            if (resp.ok) {
                alert('Usuario actualizado con éxito');
                setEditModalOpen(false);
                if (onUserCreated) onUserCreated();
            }
        } catch (error) {
            console.error("Error al editar:", error);
        }
    };

    const handleCreateChange = (e) => {
        const { name, value } = e.target;
        setCreateData(prev => ({
            ...prev,
            [name]: value
        }));
    };
    const xd = async () => {
        setIsProcessingLocal(true);
        setTimeout(() => {
            setProcessSuccessMessage('¡Solicitud Aprobada!');


        }, 2500);

        setTimeout(() => {
            setIsProcessingLocal(false);
            setProcessSuccessMessage('');
            setCreateModalOpen(false)
            addAlert(
                'success',
                'Operación Finalizada',
                `Usuario creado con exito`
            );
        }, 5000);
    }

    const submitCreate = async () => {
        try {
            setIsProcessingLocal(true);
            console.log(createData);
            const apiUrl = `http://${window.location.hostname}:5000/usuarios`;
            const resp = await fetch(apiUrl, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createData)
            });


            const responseData = await resp.json();
            if (resp.ok) {


                setTimeout(() => {
                    setProcessSuccessMessage('¡Usuario creado con exito!');


                }, 2500);

                setTimeout(() => {
                    setIsProcessingLocal(false);
                    setProcessSuccessMessage('');
                    setCreateModalOpen(false)
                    addAlert(
                        'success',
                        'Operación Finalizada',
                        `Usuario creado con exito`
                    );
                }, 6000);



                setCreateData({ id_rol: 4, id_gerencia: '' });
                if (onUserCreated) onUserCreated();
            } else {
                setTimeout(() => {
                    setProcessSuccessMessage('¡Operación Fallida!');


                }, 1500);

                setTimeout(() => {
                    setIsProcessingLocal(false);
                    setProcessSuccessMessage('');
                    setCreateModalOpen(false)
                    addAlert(
                        'error',
                        'Operación Fallida',
                        `Error al crear usuario: ${responseData.error}`
                    );
                }, 6000);

            }
        } catch (error) {
            console.error("Error al crear usuario:", error);
            alert("Error interno al comunicar con el servidor");
        }
    };

    // Efecto para forzar que el esqueleto dure al menos 200ms
    useEffect(() => {
        if (apiLoading) {
            setVisualLoading(true);
        } else {
            const timer = setTimeout(() => {
                setVisualLoading(false);
            }, 200); // <-- Aquí controlas la duración (200ms)

            return () => clearTimeout(timer);
        }
    }, [apiLoading, currentPage]); // Se dispara al cargar o cambiar de página

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


    const addAlert = useCallback((type, title, message) => {
        const id = Date.now();
        setAlerts(prev => [...prev, { id, type, title, message }]);
    }, []);

    const removeAlert = useCallback((id) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    }, []);



    return (
        <>

            <div className="fixed top-6 right-6 z-[100] flex flex-col items-end pointer-events-none">
                {alerts.map(alert => (
                    <AlertItem key={alert.id} {...alert} onClose={removeAlert} />
                ))}
            </div>

            <div className="g:col-span-7 h-full flex flex-col   bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full animate-in fade-in duration-700">

                <div className="p-4 border-b border-slate-50 overflow-x-auto custom-scrollbar flex items-center gap-3 shrink-0">
                    <ClipboardList className="w-5 h-5 text-blue-500" />
                    <h2 className="font-bold text-slate-800 whitespace-nowrap">Listado de Usuarios</h2>

                    {isAdmin && (
                        <div className="flex gap-2"> {/* Contenedor para agrupar botones */}

                            {/* Botón de Filtros */}
                            <button
                                onClick={() => {
                                    setFilterModalOpen(true);
                                }}
                                className={`ml-4 p-2 rounded-2xl bg-white shadow-sm text-slate-600 transition-all flex items-center gap-2 text-xs font-semibold opacity-100 hover:bg-slate-100 hover:text-blue-600`}
                            >
                                <Filter size={16} />
                                <span className="max-xl:hidden">Filtros</span>
                            </button>

                            {/* Botón Nuevo Usuario */}
                            <button
                                onClick={() => setCreateModalOpen(true)}
                                className={`p-2 px-4 flex justify-center items-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-200 transition-all gap-2 text-xs font-semibold opacity-100 hover:bg-blue-700`}
                            >
                                <Plus size={16} strokeWidth={3} />
                                <span className="max-xl:hidden">Nuevo Usuario</span>
                            </button>

                        </div>
                    )}
                    <div className='flex justify-center items-center ml-auto gap-2'>
                        {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                            <div key={i} className={`size-2 rounded-full transition-all ${currentPage === i + 1 ? 'bg-blue-600 size-3' : 'bg-gray-300'}`}></div>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left text-sm custom-scrollbar border-collapse">
                        <thead className="bg-slate-50/50  z-20 text-slate-500 uppercase text-[10px] font-bold sticky top-0 z-10">
                            <tr className="border-b border-slate-100">
                                        <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80">Perfil</th>
                                        <th className="px-6 py-4 backdrop-blur-sm bg-slate-50/80">Gerencia</th>
                                        <th className="px-6 py-4 text-center backdrop-blur-sm bg-slate-50/80">Rol</th>
                                        <th className="px-6 py-4 text-right backdrop-blur-sm bg-slate-50/80">Acciones</th>

                            </tr>
                        </thead>


                        <tbody className="divide-y divide-slate-100 ">
                            {visualLoading ? (
                                // Skeleton que dura exactamente 200ms tras recibir la data
                                [...Array(8)].map((_, i) => (
                                    <tr key={i}>
                                        {[...Array(6)].map((_, j) => (
                                            <td key={j} className="px-6 py-4">
                                                <div className="h-4 bg-slate-100 rounded animate-pulse w-full"></div>
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (data && data.length > 0) ? (
                                data.map((row, i) => (
                                    <tr key={row.id_solicitud || i} className="hover:bg-slate-50/50 transition-colors animate-in fade-in duration-300">
                                        <td className="px-6 py-4 whitespace-nowrap group">
                                            <div className="flex items-center gap-4">
                                                <div className="">

                                                    <Avatar size='lg'>
                                                        <AvatarImage src={row.avatar} className="object-cover" />
                                                        <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white text-[13px] font-black tracking-tighter uppercase">
                                                            {row.nombres.charAt(0) + row.apellidos.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>

                                                </div>

                                                {/* Información con Jerarquía de Tipografía Dinámica */}
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[15px] font-semibold text-slate-600 leading-tight tracking-tight truncate group-hover:text-indigo-600 transition-colors">
                                                            {row.nombres} {row.apellidos}
                                                        </span>
                                                        {/* Pequeño Badge de ID opcional para estilo 'Developer' */}
                                                        <span className="text-[10px] font-bold  bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100 text-blue-500  ">
                                                            ID-{row.id_usuario || '??'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 mt-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                                                        <div className="p-1 bg-slate-100 rounded-md text-slate-400">
                                                            <Mail size={10} strokeWidth={3} className='text-blue-500' />
                                                        </div>
                                                        <span className="text-xs font-semibold text-slate-500 tracking-tight truncate">
                                                            {row.email.toLowerCase()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-3.5 text-slate-500 truncate">{row.nombre_gerencia}</td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center">
                                                <span className={`
      px-4 py-1.5 rounded-[14px] text-[10px] font-black uppercase tracking-[0.08em]
      flex items-center gap-2 border-2 transition-all duration-300
      ${row.id_rol === 1
                                                        ? 'bg-indigo-50/50 text-indigo-600 border-indigo-200/60 shadow-sm shadow-indigo-50'
                                                        : 'bg-slate-50 text-slate-500 border-slate-200/60'
                                                    }
    `}>
                                                    {/* Indicador visual de punto (Dot) */}
                                                    <span className={`w-1.5 h-1.5 rounded-full ${row.id_rol === 1 ? 'bg-indigo-500 animate-pulse' : 'bg-slate-400'}`} />

                                                    {row.nombre_rol || 'Usuario'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                            <button
                                                onClick={() => openModal(row)}
                                                className="text-blue-600 cursor-pointer p-1 hover:scale-110 transition-transform"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr >
                                    <td colSpan="6" className="px-6 py-10 text-center text-slate-400">No hay solicitudes disponibles</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer de Paginación */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between shrink-0">
                    <p className="text-xs text-slate-500 font-medium">
                        Página <span className="text-slate-800">{currentPage}</span> de <span className="text-slate-800">{totalPages}</span>
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1 || visualLoading}
                            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || visualLoading}
                            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>
                </div>
            </div >

            {modalOpen && selected && (
                <Modal
                    onClose={closeModal}
                    contenido={
                        <div className='flex flex-col items-center max-w-sm mx-auto'>

                            {/* Contenedor del Avatar con Anillo Azul */}
                            <div className="p-1 rounded-full bg-gradient-to-tr from-blue-600 to-blue-300">
                                <Avatar className='h-28 w-28  rounded-full object-cover border-4 border-white'>
                                    <AvatarImage src={selected.avatar} className="object-cover" />
                                    <AvatarFallback className="text-[30px]  bg-gradient-to-br from-indigo-600 to-violet-700 text-white  font-black tracking-tighter uppercase">
                                        {selected.nombres.charAt(0) + selected.apellidos.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>



                            </div>

                            {/* Encabezado */}
                            <div className="text-center mt-5 mb-8">
                                <h3 className='text-2xl font-bold text-gray-800 tracking-tight'>
                                    {selected.nombres} {selected.apellidos}
                                </h3>
                                <span className='inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-50 text-blue-600'>
                                    {selected.nombre_rol}
                                </span>
                            </div>

                            {/* Detalles con diseño limpio */}
                            <div className='w-full space-y-1 mb-8'>
                                <div className='flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 transition-colors'>
                                    <span className='text-sm font-medium text-gray-400'>Gerencia</span>
                                    <span className='text-sm font-semibold text-gray-700'>{selected.nombre_gerencia}</span>
                                </div>
                                <div className='h-px bg-gray-100 w-full mx-auto'></div>
                                <div className='flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 transition-colors'>
                                    <span className='text-sm font-medium text-gray-400'>Estado</span>
                                    <span className='text-sm font-semibold text-green-600'>Activo</span>
                                </div>
                            </div>

                            {/* Acciones */}
                            <div className='flex flex-col w-full gap-3'>
                                {/* Botón Principal: Mensaje */}
                                <button className='w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all active:scale-[0.98]'>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                    Enviar Mensaje
                                </button>

                                {/* Botones Secundarios */}
                                <div className='grid grid-cols-2 gap-3'>
                                    <button
                                        onClick={() => {
                                            // Pasamos los datos del usuario seleccionado al estado de edición
                                            setEditData(selected);
                                            // Cerramos el modal de detalles
                                            closeModal();
                                            // Abrimos el modal de edición después de un breve delay o directo
                                            setEditModalOpen(true);
                                        }}
                                        className='flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition-colors'>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                        Editar
                                    </button>
                                    <button className='flex items-center justify-center gap-2 py-2.5 border border-red-100 text-red-500 hover:bg-red-50 rounded-xl font-medium transition-colors'>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                        </svg>
                                        Desactivar
                                    </button>
                                </div>
                            </div>
                        </div>
                    }
                />
            )
            }

            {
                result && (

                    <Modal
                        contenido={
                            <>
                                <h1 className='text-4xl text-green-500'>Solisitud enviada</h1>
                            </>
                        } />


                )
            }
            {/* Modal para pedir ajustes */}
            {
                askAdjustOpen && selected && (
                    <Modal
                        onClose={closeAdjustModal}
                        contenido={
                            <div className="flex flex-col h-full bg-white text-gray-800">
                                {/* Cabecera con jerarquía clara */}
                                <div className="mb-6">
                                    <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent">
                                        Pedir Ajustes
                                    </h3>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Solicitud #{selected.id_solicitud}
                                    </p>
                                </div>

                                {/* Checkbox Estilizado (Tu diseño) */}
                                <div className="flex items-center mb-6">
                                    <label className="relative flex items-center cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={includeContext}
                                            onChange={e => setIncludeContext(e.target.checked)}
                                            className="peer sr-only"
                                            id="ctx-toggle"
                                        />
                                        {/* El cuadro del checkbox que pediste */}
                                        <div className="w-5 h-5 rounded-lg border-2 border-blue-500 transition-all duration-300 ease-in-out 
        peer-checked:bg-gradient-to-br from-blue-500 to-pink-500 peer-checked:border-0 peer-checked:rotate-12 
        after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 
        after:w-4 after:h-4 after:opacity-0 after:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWxpbmUgcG9pbnRzPSIyMCA2IDkgMTcgNCAxMiI+PC9wb2x5bGluZT48L3N2Zz4=')] 
        after:bg-contain after:bg-no-repeat peer-checked:after:opacity-100 after:transition-opacity after:duration-300 
        hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                                        </div>
                                        <span className="ml-3 text-sm font-medium text-slate-700">
                                            Adjuntar contexto de campo
                                        </span>
                                    </label>
                                </div>

                                {/* Sección Dinámica (Aquí brilla la interpolación de tamaño) */}
                                <div className="space-y-4">
                                    {includeContext && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                            <label className="text-xs font-bold text-blue-600 mb-1 block">Campo a corregir</label>
                                            <Select
                                                label="Selecciona un campo"
                                                name="campoAjuste"
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
                                                <p className="text-sm text-slate-600 italic">
                                                    "{selected[adjustField] || 'Sin contenido previo'}"
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs font-bold text-blue-600 mb-1 block">Mensaje de ajuste</label>
                                        <TextArea
                                            label="Escribe las correcciones necesarias..."
                                            name="ajusteMensaje"
                                            defaultValue={adjustMessage}
                                            onChange={e => setAdjustMessage(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Botones de Acción */}
                                <div className="mt-8 flex justify-end gap-3">
                                    <button
                                        onClick={closeAdjustModal}
                                        className="px-6 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={submitAdjustment}
                                        className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-600 rounded-xl 
      shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 transition-all active:scale-95"
                                    >
                                        Enviar Solicitud
                                    </button>


                                </div>
                            </div>
                        }
                    />
                )
            }

            {
                editModalOpen && (
                    <Modal
                        onClose={() => setEditModalOpen(false)}
                        contenido={
                            <div className="flex flex-col gap-5 p-2">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Editar Perfil</h3>
                                    <p className="text-sm text-slate-500">Modifica la información del colaborador</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 max-lg:flex max-lg:flex-col">
                                    <Input
                                        label="Nombres"
                                        name="nombres"
                                        value={editData.nombres || ''}
                                        onChange={handleEditChange}
                                    />
                                    <Input
                                        label="Apellidos"
                                        name="apellidos"
                                        value={editData.apellidos || ''}
                                        onChange={handleEditChange}
                                    />
                                </div>

                                <Input
                                    label="Correo Electrónico"
                                    name="email"
                                    value={editData.email || ''}
                                    onChange={handleEditChange}
                                />

                                <Select
                                    label="Gerencia"
                                    name="id_gerencia"
                                    defaultValue={editData.id_gerencia}
                                    options={gerencias}
                                    onChange={handleEditChange}

                                />

                                <div className="flex justify-end gap-3 mt-4">
                                    <button
                                        onClick={() => setEditModalOpen(false)}
                                        className="px-6 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={submitEdit}
                                        className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-100 transition-all"
                                    >
                                        Guardar Cambios
                                    </button>
                                </div>
                            </div>
                        }
                    />
                )
            }


            {
                filterModalOpen && (
                    <Modal
                        onClose={() => setFilterModalOpen(false)}
                        contenido={
                            <div className="flex flex-col h-full overflow-hidden  gap-5  bg-white  text-slate-800 rounded-2xl">
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

                                <div className="flex flex-col gap-4 w-full">
                                    <Select
                                        label="Gerencia"
                                        name="gerencia"
                                        value={localGerencia}
                                        onChange={(e) => setLocalGerencia(e.target.value)}
                                        options={[{ value: '', label: 'Todas las áreas' }, ...gerencias]}
                                    />
                                    <Select
                                        label="Buscar por"
                                        name="columna"

                                        onChange={(e) => setLocalColumna(e.target.value)}
                                        options={optionsColumna}
                                    />
                                    <Input
                                        label="Término de Búsqueda"
                                        name="busqueda"
                                        placeholder="Escribe aquí..."
                                        value={localBusqueda}
                                        onChange={(e) => setLocalBusqueda(e.target.value)}
                                    />
                                </div>

                                <div className="mt-2 flex w-full px-4 justify-between gap-3">
                                    <button
                                        onClick={() => {
                                            setLocalBusqueda('');
                                            setLocalGerencia('');
                                            setLocalColumna('nombres');
                                            if (onFilter) {
                                                onFilter({ busqueda: '', gerencia: '', columna: 'nombres' });
                                            }
                                            setFilterModalOpen(false);
                                        }}
                                        className="px-6 py-2.5 text-sm font-bold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all active:scale-95"
                                    >
                                        Limpiar
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (onFilter) {
                                                onFilter({ busqueda: localBusqueda, gerencia: localGerencia, columna: localColumna });
                                            }
                                            setFilterModalOpen(false);
                                        }}
                                        className="px-6 flex-1 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                                    >
                                        Aplicar Filtros
                                    </button>
                                </div>
                            </div>
                        }
                    />
                )
            }



            {
                createModalOpen && (
                    <Modal
                        onClose={() => setCreateModalOpen(false)}
                        contenido={




                            <div className="flex relative flex-col gap-1 p-4  max-lg:overflow-auto">

                                {isProcessingLocal && (
                                    <div className="fixed inset-0 z-[100] flex h-dvh flex-col items-center justify-center p-6 rounded-[32px] overflow-hidden group">
                                        {/* Fondo con desenfoque profundo y capa de color sutil */}
                                        <div className="absolute inset-0 bg-white/60 backdrop-blur-md animate-in fade-in duration-500" />

                                        {/* Contenedor de contenido con elevación */}
                                        <div className="relative z-10 flex flex-col items-center text-center">
                                            {processSuccessMessage ? (
                                                <div className="flex flex-col items-center gap-6 animate-in zoom-in-90 slide-in-from-bottom-4 duration-500 ease-out">
                                                    {processSuccessMessage === '¡Operación Fallida!' ? (
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
                                                            {processSuccessMessage === '¡Operación Fallida!'
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
                                <div className="border-l-4 border-blue-500 pl-4 mb-1">
                                    <h3 className="text-xl font-bold text-slate-800">Crear Nuevo Usuario</h3>
                                    <p className="text-sm text-slate-500">Ingresa los datos para registrar un colaborador</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 max-lg:flex max-lg:flex-col gr">
                                    <Input label="Nombres" name="nombres" value={createData.nombres || ''} onChange={handleCreateChange} />
                                    <Input label="Apellidos" name="apellidos" value={createData.apellidos || ''} onChange={handleCreateChange} />
                                </div>

                                <div className="grid grid-cols-2 gap-4 max-lg:flex max-lg:flex-col">
                                    <Input label="Cédula" name="cedula" value={createData.cedula || ''} onChange={handleCreateChange} />
                                    <Input label="Teléfono" name="telf" value={createData.telf || ''} onChange={handleCreateChange} />
                                </div>

                                <Input label="Correo Electrónico" name="email" value={createData.email || ''} onChange={handleCreateChange} />

                                <div className="grid grid-cols-2 gap-4 max-lg:flex max-lg:flex-col">
                                    <Input label="Username" value={createData.username || ''} name="username" autoComplete="off" onChange={handleCreateChange} />
                                    <Input label="Contraseña" autocomplete="new-password" value={createData.password || ''} autoComplete="off" type="password" name="password" onChange={handleCreateChange} />
                                </div>

                                <Select
                                    label="Gerencia"
                                    name="id_gerencia"
                                    value={createData.id_gerencia || ''}
                                    onChange={handleCreateChange}
                                    options={gerencias}
                                />

                                <Select
                                    label="Rol del Sistema"
                                    name="id_rol"
                                    value={createData.id_rol}
                                    options={roles}
                                    onChange={handleCreateChange}
                                />

                                <div className="flex justify-end gap-3 mt-4">
                                    <button
                                        onClick={() => setCreateModalOpen(false)}
                                        className="px-6 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => submitCreate()}
                                        className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-100 transition-all"
                                    >
                                        Registrar Usuario
                                    </button>
                                </div>
                            </div>


                        }
                    />
                )
            }
        </>
    );
};

export default TablaUsuarios;