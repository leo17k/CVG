import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, HelpCircle, CheckCircle } from 'lucide-react';

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, type = 'danger' }) => {
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    const [shouldRender, setShouldRender] = useState(isOpen);

    // Sincronizar el renderizado con la prop isOpen para permitir la animación de salida
    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setIsAnimatingOut(false);
        } else {
            setIsAnimatingOut(true);
            const timer = setTimeout(() => {
                setShouldRender(false);
                setIsAnimatingOut(false);
            }, 200); // Duración de la animación de salida
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!shouldRender) return null;

    const themes = {
        danger: {
            icon: <Trash2 className="w-6 h-6 text-rose-500" />,
            button: 'bg-rose-500 hover:bg-rose-600 shadow-rose-100',
            light: 'bg-rose-50'
        },
        warning: {
            icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
            button: 'bg-amber-500 hover:bg-amber-600 shadow-amber-100',
            light: 'bg-amber-50'
        },
        question: {
            icon: <HelpCircle className="w-6 h-6 text-indigo-500" />,
            button: 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-100',
            light: 'bg-indigo-50'
        },
        success: {
            icon: <CheckCircle className="w-6 h-6 text-emerald-500" />,
            button: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100',
            light: 'bg-emerald-50'
        }
    };

    const theme = themes[type] || themes.danger;

    const handleClose = (action) => {
        setIsAnimatingOut(true);
        setTimeout(() => {
            action();
        }, 200);
    };

    return (
        <>
            <style>
                {`
                @keyframes modalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes modalFadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                @keyframes modalZoomIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes modalZoomOut {
                    from { opacity: 1; transform: scale(1) translateY(0); }
                    to { opacity: 0; transform: scale(0.95) translateY(10px); }
                }
                .animate-modal-fade-in { animation: modalFadeIn 0.2s ease-out forwards; }
                .animate-modal-fade-out { animation: modalFadeOut 0.2s ease-in forwards; }
                .animate-modal-zoom-in { animation: modalZoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                .animate-modal-zoom-out { animation: modalZoomOut 0.2s ease-in forwards; }
                `}
            </style>

            <div className={`fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${isAnimatingOut ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`}>
                {/* Overlay para cerrar al hacer clic fuera */}
                <div className="absolute inset-0" onClick={() => handleClose(onCancel)}></div>

                <div
                    className={`relative bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-slate-100 ${isAnimatingOut ? 'animate-modal-zoom-out' : 'animate-modal-zoom-in'}`}
                >
                    <div className="p-8 text-center">
                        <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${theme.light}`}>
                            {theme.icon}
                        </div>

                        <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed px-2">
                            {message}
                        </p>
                    </div>

                    <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-2">
                        <button
                            onClick={() => handleClose(onConfirm)}
                            className={`w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg transition-all active:scale-[0.98] ${theme.button}`}
                        >
                            Confirmar acción
                        </button>
                        <button
                            onClick={() => handleClose(onCancel)}
                            className="w-full py-3.5 rounded-xl text-slate-500 font-bold text-sm hover:bg-white hover:text-slate-700 transition-all border border-transparent hover:border-slate-200"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ConfirmationModal;