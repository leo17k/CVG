import { Modal } from "./Modal"
import React, { useState, useEffect } from 'react';
import { Input, TextArea, InputNumber } from "../Inputs";
import { useAuth } from "../../Constext/AuthToken";
import { Plus, CheckCircle } from "lucide-react";
import { ToastContainer, Toast } from "../Alert";

import { Select } from "../Inputs";


const Numsolisitud = ({ title, number, description }) => {

    return (
        <>
            <div className="flex flex-col whitespace-nowrap h-full p-4 rounded-xl border border-gray-200 bg-white shadow-sm max-w-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {title}
                </h3>
                <span className="text-xl font-bold text-blue-700 leading-tight">
                    {number}
                </span>
                <p className="text-[10px] text-gray-900/50 mt-1 leading-relaxed">
                    {description}
                </p>
            </div>

        </>
    )


}

const HacerSolisitud = () => {
    return (
        <div className="flex h-full gap-3 z-15 whitespace-nowrap flex-col p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Hacer una solicitud
            </h3>

            <div className="flex items-center justify-center">
                <Boton />
            </div>
        </div>
    );
}


export const Boton = ({ onRefresh }) => { // Usamos destructuring para datauser
    const [activo, setActivo] = useState(false);
    const [users, setUsers] = useState([]); // Cambié 'user' a 'users' porque esperas una lista
    const [selectedUser, setSelectedUser] = useState("");
    const { datauser } = useAuth();

    // Estados de animación suave
    const [isProcessingLocal, setIsProcessingLocal] = useState(false);
    const [processSuccessMessage, setProcessSuccessMessage] = useState('');

    const { insertarSolicitud } = useAuth();

    // Validamos el rol con seguridad
    const isAdmin = datauser?.data?.rol === 'administrador' || datauser?.data?.rol === 'SuperAdministrador';

    const [toasts, setToasts] = useState([]);

    const addToast = (type, message) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, message }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    useEffect(() => {
        // La condición va ADENTRO del efecto
        if (isAdmin) {
            const fetchUsers = async () => {
                try {
                    const url = `http://${window.location.hostname}:5000/users`;
                    const response = await fetch(url, { credentials: 'include' });

                    if (!response.ok) throw new Error(`Error: ${response.status}`);

                    const data = await response.json();
                    setUsers(data);
                    console.log("Usuarios cargados para admin:", data);
                } catch (error) {
                    console.error("Error cargando usuarios:", error);
                }
            };
            fetchUsers();
        }
    }, [isAdmin]);

    const handleSubmit = async (e) => {
        e.preventDefault(); // Evita recargar la página
        setIsProcessingLocal(true);

        const formData = new FormData(e.target);
        const nuevaSolicitud = Object.fromEntries(formData);

        try {
            const response = await insertarSolicitud(
                nuevaSolicitud.titulo,
                nuevaSolicitud.justificacion,
                nuevaSolicitud.monto
            );
            console.log("Respuesta del servidor:", response);
            setProcessSuccessMessage('¡Solicitud Creada!');

            // Pausa para que el usuario lea el éxito
            setTimeout(() => {
                setActivo(false); // Cierra el modal

                // Limpieza tras animar salida
                setTimeout(() => {
                    setIsProcessingLocal(false);
                    setProcessSuccessMessage('');
                    e.target.reset(); // Limpia el formulario
                    if (onRefresh) onRefresh(); // Refresca la tabla en DasboaradAdmi
                    addToast('success', 'La solicitud se guardó correctamente.');
                }, 500);
            }, 2500);

        }
        catch (error) {
            console.error("Error al enviar:", error);
            setIsProcessingLocal(false);
            addToast('error', 'Ocurrió un error al confirmar el envío.');
        }
    };
    return (
        <>



            <button
                onClick={() => setActivo(true)}
                className="flex items-center max-sm:text-xs text-xs  h-max justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-3xl transition-all shadow-md shadow-blue-100 font-medium">
                <Plus size={18} />
                <span className="max-sm:hidden">Nueva Solicitud</span>
            </button>



            {activo && <Modal onClose={() => setActivo(false)}
                contenido={<div className=" overflow-hidden w-full h-full flex flex-col">

                    {/* CORTINA PANTALLA CARGA/ÉXITO SUAVE */}
                    {isProcessingLocal && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-white/60 backdrop-blur-md animate-in fade-in duration-500 rounded-2xl group">
                            <div className="relative z-10 flex flex-col items-center text-center">
                                {processSuccessMessage ? (
                                    <div className="flex flex-col items-center gap-6 animate-in zoom-in-90 slide-in-from-bottom-4 duration-500 ease-out">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full animate-pulse" />
                                            <div className="relative bg-emerald-50 p-5 rounded-[24px] border border-emerald-100 shadow-xl shadow-emerald-500/10">
                                                <CheckCircle className="w-14 h-14 text-emerald-500 animate-in zoom-in duration-500 ease-out" />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                                                {processSuccessMessage}
                                            </h3>
                                            <p className="text-slate-500 text-sm font-medium">
                                                Generada exitosamente en el sistema
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
                                                Generando Solicitud
                                            </span>
                                            <span className="text-blue-600 font-bold animate-pulse text-lg">
                                                Comunicando con el servidor...
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="border-l-4 border-blue-500 pl-4 mb-6">
                        <span className="text-sm font-medium text-blue-500 uppercase tracking-widest">Formulario</span>

                        <h3 className="text-3xl font-light text-slate-800">Solicitud de compra
                            <span className="font-semibold"></span>
                        </h3>
                    </div>
                    <form className="flex flex-col gap-2 items-center" onSubmit={handleSubmit}>
                        <div className="flex gap-2 items-center justify-center">
                            {isAdmin && (
                                <Select
                                    label={'Usuario'}
                                    name={'usuario'}
                                    options={users.usuarios.map(u => ({
                                        value: u.id_usuario,
                                        label: u.username,
                                        id: u.id_usuario
                                    }))}
                                />
                            )}
                            <Input label={'Titulo de Solicitud'}
                                estilos={{ background: 'white' }}
                                name={'titulo'}
                            />

                        </div>

                        <div className="w-full">
                            <TextArea label={'Descripcion'}
                                estilos={{ background: 'white', width: '100%', minWidth: '100%' }}
                                name={'justificacion'} />
                            <InputNumber label={'Monto estimado'}
                                estilos={{ background: 'white', width: '100%', minWidth: '100%' }}
                                name={'monto'}
                            />
                        </div>


                        <button type="submit" disabled={isProcessingLocal} className={`py-2 px-6 rounded-2xl w-full text-white flex justify-center items-center transition-colors ${isProcessingLocal ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                            {isProcessingLocal ? 'Enviando...' : 'Enviar Solicitud'}
                        </button>



                    </form>




                </div>
                }
            />}

            {/* Contenedor de Notificaciones (Toasts) */}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </>
    );
};

export { Numsolisitud, HacerSolisitud }