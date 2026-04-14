import React, { useState } from 'react';
import { MessageSquare, Bell, ChevronDown } from 'lucide-react';
import { useSocket } from '../../Constext/SocketContext';
import { useAuth } from '../../Constext/AuthToken';
import { Avatar, AvatarFallback, AvatarGroupCount, AvatarImage, AvatarBadge } from '../Avatar';



const BotonBandeja = ({ totalAlerts = 5, onClick, newAlert, isOpen = false }) => {

    return (
        <>
            <div className="relative inline-flex items-center">
                <button
                    onClick={() => onClick()}
                    className={`
          group relative flex items-center gap-3 px-4 py-2.5 
          rounded-2xl transition-all duration-500 ease-in-out
          border border-slate-200/60 backdrop-blur-md

            bg-white/80 text-slate-600 hover:bg-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-blue-200
                    
        `}
                >
                    {/* Capa de brillo interno (Solo visible en hover o activo) */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {/* Icono de Mensaje con Badge Inteligente */}
                    <div className="relative">
                        <MessageSquare className={`w-[18px] h-[18px] transition-transform duration-300 ${isOpen ? 'scale-110' : 'group-hover:-rotate-12'}`} />
                        {newAlert && !isOpen && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600 border border-white"></span>
                            </span>
                        )}
                    </div>

                    {/* Separador Vertical Minimalista */}
                    <div className={`w-[1px] h-4 transition-colors duration-300 bg-slate-200}`} />

                    {/* Sección de Texto/Estado */}
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-tighter">
                            Actividad
                        </span>
                        <ChevronDown className={`w-3 h-3 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-400' : 'text-slate-400'}`} />
                    </div>

                    {/* Efecto de borde animado inferior */}

                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg--500 group-hover:w-1/2 transition-all duration-500 rounded-full" />

                </button>


            </div>

        </>
    );
};

export default BotonBandeja;