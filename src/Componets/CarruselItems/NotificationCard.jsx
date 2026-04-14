import React, { useState, useEffect } from 'react';
import { Modal } from '../componentes dashboard/Modal';

const NotificationCard = ({ title = 'Notificación', message = '', items = [] }) => {
    const [open, setOpen] = useState(false);
    const [notes, setNotes] = useState(items.map(i => ({ ...i })));

    useEffect(() => {
        setNotes(items.map(i => ({ ...i })));
    }, [items]);

    const openModal = () => setOpen(true);
    const closeModal = () => setOpen(false);

    const markAsRead = (id) => setNotes(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const markAllRead = () => setNotes(prev => prev.map(n => ({ ...n, read: true })));

    const unreadCount = notes.filter(n => !n.read).length;

    return (
        <>
            {/* Trigger Card - Diseño Pulido */}
         
                <div className="flex flex-col h-full p-4 rounded-xl border border-gray-200 h-full bg-white shadow-sm max-w-sm">
                    <div className="text-sm flex gap-2 font-semibold mb-1">
                        <svg className='text-blue-600' xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M8 9h8" /><path d="M8 13h6" /><path d="M9 18h-3a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-3l-3 3l-3 -3" /></svg>       <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</h3>
                    </div>
                    <div className="text-[10px] text-slate-500">{message}</div>
                    <div className="flex mt-1 ">
                        <button onClick={openModal} className="text-xs w-full px-2 py-1 bg-indigo-600 text-white rounded">Ver</button>
                    </div>
                </div>

             

            {/* Modal - Diseño Estilo Centro de Actividad */}
            {open && (
                <Modal onClose={closeModal} contenido={
                    <div className="flex flex-col w-full max-w-md">
                        {/* Header del Modal */}
                        <div className="flex items-end justify-between mb-8 border-b border-slate-100 pb-5">
                            <div>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Inbox</h3>
                                <p className="text-sm font-medium text-slate-500">Tienes <span className="text-blue-600 font-bold">{unreadCount}</span> sin leer</p>
                            </div>
                            <button
                                onClick={markAllRead}
                                className="text-[11px] font-bold uppercase tracking-wider px-4 py-2 bg-slate-100 text-slate-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-all active:scale-95"
                            >
                                Limpiar bandeja
                            </button>
                        </div>

                        {/* Lista Scrollable */}
                        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                            {notes.length === 0 ? (
                                <div className="py-10 text-center">
                                    <p className="text-slate-400 font-medium italic">No hay mensajes pendientes</p>
                                </div>
                            ) : (
                                notes.map(n => (
                                    <div
                                        key={n.id}
                                        className={`group relative p-4 rounded-2xl border transition-all duration-200 ${n.read
                                                ? 'bg-slate-50/50 border-slate-100 opacity-70'
                                                : 'bg-white border-white shadow-md ring-1 ring-slate-100'
                                            }`}
                                    >
                                        {!n.read && (
                                            <div className="absolute left-0 top-4 bottom-4 w-1 bg-blue-600 rounded-r-full"></div>
                                        )}

                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className={`text-[13px] font-bold mb-0.5 ${n.read ? 'text-slate-500' : 'text-slate-900'}`}>
                                                    {n.title}
                                                </div>
                                                <div className={`text-xs leading-relaxed ${n.read ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                                                    {n.message}
                                                </div>
                                            </div>

                                            <div className="flex-shrink-0">
                                                {!n.read ? (
                                                    <button
                                                        onClick={() => markAsRead(n.id)}
                                                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm shadow-blue-100"
                                                        title="Marcar como leído"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                                                    </button>
                                                ) : (
                                                    <div className="p-1.5 text-emerald-500">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                                ))}
                        </div>
                    </div>
                } />
            )}
        </>
    );
};

export default NotificationCard;