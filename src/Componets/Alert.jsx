import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

export const Toast = ({ message, type = 'success', duration = 3000, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(onClose, 300); // Espera a que termine la animación de salida
    };

    const icons = {
        success: <CheckCircle className="text-green-500" size={24} />,
        error: <XCircle className="text-red-500" size={24} />,
        warning: <AlertTriangle className="text-amber-500" size={24} />,
    };

    const colors = {
        success: 'border-green-100 bg-white',
        error: 'border-red-100 bg-white',
        warning: 'border-amber-100 bg-white',
    };

    return (
        <div className={`
      relative flex items-center gap-3 p-4 mb-3 min-w-[320px] rounded-2xl border shadow-2xl
      ${colors[type]} ${isExiting ? 'animate-toast-out' : 'animate-toast-in'}
    `}>
            {/* Icono Principal */}
            <div className="flex-shrink-0">{icons[type]}</div>

            {/* Mensaje */}
            <div className="flex-grow">
                <p className="text-sm font-semibold text-slate-800">{type.toUpperCase()}</p>
                <p className="text-xs text-slate-500">{message}</p>
            </div>

            {/* Botón Cerrar */}
            <button onClick={handleClose} className="text-slate-300 hover:text-slate-500 transition-colors">
                <X size={18} />
            </button>

            {/* Barra de progreso inferior (Estilo SweetAlert) */}
            <div
                className={`absolute bottom-0 left-0 h-1 rounded-b-2xl opacity-60
          ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-amber-500'} 
          animate-progress`}
                style={{ animationDuration: `${duration}ms` }}
            />
        </div>
    );
};


export const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="fixed top-5 right-5 z-[9999] flex flex-col items-end">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
};