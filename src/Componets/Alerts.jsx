import React, { useState, useEffect, useCallback } from 'react';
import {
    X,
    Check,
    AlertCircle,
    Info,
    Bell,
    Trash2,
    ChevronRight
} from 'lucide-react';

/**
 * Configuración para un diseño minimalista y moderno
 */
const ALERT_TYPES = {
    success: {
        icon: <Check className="w-4 h-4 text-emerald-500" />,
        accent: 'bg-emerald-500',
        label: 'Éxito'
    },
    error: {
        icon: <X className="w-4 h-4 text-rose-500" />,
        accent: 'bg-rose-500',
        label: 'Error'
    },
    warning: {
        icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
        accent: 'bg-amber-500',
        label: 'Aviso'
    },
    info: {
        icon: <Info className="w-4 h-4 text-blue-500" />,
        accent: 'bg-blue-500',
        label: 'Info'
    }
};

const AlertItem = ({ id, title, message, type = 'info', onClose, duration = 5000 }) => {
    const config = ALERT_TYPES[type];

    useEffect(() => {
        const timer = setTimeout(() => onClose(id), duration);
        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    return (
        <div
            className="group relative overflow-hidden mb-3 w-80 md:w-85 bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 pointer-events-auto"
            style={{ animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
        >
            <div className="p-4 flex items-start gap-3">
                {/* Icono con contenedor minimalista */}
                <div className="shrink-0 w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm">
                    {config.icon}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {config.label}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <h4 className="text-sm font-semibold text-slate-800 truncate">{title}</h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2 font-medium">
                        {message}
                    </p>
                </div>

                <button
                    onClick={() => onClose(id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-all p-1 rounded-lg hover:bg-slate-100"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Indicador de tiempo ultra-fino */}
            <div className="absolute bottom-0 left-0 h-[2px] w-full bg-slate-100/50">
                <div
                    className={`h-full ${config.accent} opacity-40`}
                    style={{ animation: `progress linear forwards ${duration}ms` }}
                />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes slideInRight {
          from { transform: translateX(20px); opacity: 0; filter: blur(4px); }
          to { transform: translateX(0); opacity: 1; filter: blur(0); }
        }
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}} />
        </div>
    );
};


export default AlertItem;