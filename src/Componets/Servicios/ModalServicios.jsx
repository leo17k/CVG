import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Modal } from '../componentes dashboard/Modal.jsx';
import { Input, TextArea } from '../Inputs.jsx';
import { toast } from '../GoeyToaster';

export default function ModalServicio({ isOpen, onClose, item, onSuccess }) {
    const [formData, setFormData] = useState({
        codigo_servicio: '',
        nombre_servicio: '',
        descripcion: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (item) {
            setFormData({
                codigo_servicio: item.codigo_servicio || '',
                nombre_servicio: item.nombre_servicio || '',
                descripcion: item.descripcion || ''
            });
        }
        setErrors({});
    }, [item, isOpen]);

    const handleFormClose = () => {
        setErrors({});
        onClose();
    };

    const handleInputChange = (field, val) => {
        setFormData(prev => ({ ...prev, [field]: val }));
        if (errors[field]) {
            setErrors(prev => {
                const newErr = { ...prev };
                delete newErr[field];
                return newErr;
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const newErrors = {};
        if (!formData.codigo_servicio?.trim()) newErrors.codigo_servicio = "El código es obligatorio";
        if (!formData.nombre_servicio?.trim()) newErrors.nombre_servicio = "El nombre del servicio es obligatorio";
        if (!formData.descripcion?.trim()) newErrors.descripcion = "La descripción es obligatoria";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error('Campos inválidos', { description: 'Por favor, complete todos los campos obligatorios.' });
            return;
        }

        setErrors({});
        const method = item ? 'PUT' : 'POST';
        const url = item
            ? `http://${window.location.hostname}:5000/Servicios/${item.codigo_servicio}`
            : `http://${window.location.hostname}:5000/Servicios`;

        try {
            const resp = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include'
            });

            const result = await resp.json().catch(() => ({}));
            if (resp.ok) {
                toast.success(item ? 'Servicio actualizado' : 'Servicio creado', { description: result.message || '' });
                if (onSuccess) onSuccess();
            } else {
                toast.error('Error', { description: result.error || 'No se pudo guardar el servicio' });
            }
        } catch (error) {
            console.error("Error al guardar:", error);
            toast.error('Error', { description: 'Error de conexión con el servidor' });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleFormClose}
            contenido={
                <>
                    <div className="relative p-6 flex justify-between items-center bg-white/80 backdrop-blur-xl border-b border-slate-100 rounded-t-[24px]">

                        {/* Decoración lateral sutil */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full shadow-[0_0_10px_rgba(37,99,235,0.4)]"></div>

                        <div className="flex flex-col ml-2">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
                                {item ? 'Editar Servicio' : 'Nuevo Servicio'}
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">
                                {item ? 'Modificar registro existente' : 'Configuración de entrada'}
                            </p>
                        </div>


                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div>
                            <Input
                                label="Código"
                                value={formData.codigo_servicio}
                                onChange={(e) => handleInputChange('codigo_servicio', e.target.value)}
                                disabled={!!item}
                                error={errors.codigo_servicio}
                            />
                        </div>

                        <div>
                            <Input
                                label="Nombre del Servicio"
                                value={formData.nombre_servicio}
                                onChange={(e) => handleInputChange('nombre_servicio', e.target.value)}
                                error={errors.nombre_servicio}
                            />
                        </div>

                        <div>
                            <TextArea
                                label="Descripción"
                                value={formData.descripcion}
                                onChange={(e) => handleInputChange('descripcion', e.target.value)}
                                error={errors.descripcion}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleFormClose}
                                className="flex-1 py-3.5 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="flex-[2] py-3.5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 flex items-center justify-center gap-2 transition-all"
                            >
                                <Save size={18} />
                                {item ? 'Guardar Cambios' : 'Crear Servicio'}
                            </button>
                        </div>
                    </form>
                </>
            } />
    );
}