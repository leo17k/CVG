import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { toast } from '../GoeyToaster';
import { Modal } from '../componentes dashboard/Modal.jsx';
import { Input, TextArea } from '../Inputs.jsx';

export default function ModalNuevoServicio({ isOpen, onClose, onSuccess }) {
    // Estado inicial limpio para la creación
    const [formData, setFormData] = useState({
        codigo_servicio: '',
        nombre_servicio: '',
        descripcion: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            setFormData({ codigo_servicio: '', nombre_servicio: '', descripcion: '' });
            setErrors({});
        }
    }, [isOpen]);

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
        if (!formData.codigo_servicio?.trim()) newErrors.codigo_servicio = "El código identificador es obligatorio";
        if (!formData.nombre_servicio?.trim()) newErrors.nombre_servicio = "El nombre del servicio es obligatorio";
        if (!formData.descripcion?.trim()) newErrors.descripcion = "La descripción es obligatoria";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error('Campos inválidos', { description: 'Por favor, complete todos los campos obligatorios.' });
            return;
        }

        setErrors({});
        setLoading(true);

        try {
            const apiUrl = `http://${window.location.hostname}:5000/Servicios`;
            const resp = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include'
            });

            const result = await resp.json().catch(() => ({}));

            if (resp.ok) {
                // Limpiar formulario y notificar éxito
                setFormData({ codigo_servicio: '', nombre_servicio: '', descripcion: '' });
                toast.success('Servicio creado', { description: result.message || '' });
                if (onSuccess) onSuccess();
            } else {
                toast.error('Error', { description: result.error || 'Error al crear el servicio' });
            }
        } catch (err) {
            toast.error('Error', { description: 'Error de conexión con el servidor' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={handleFormClose}  
            contenido={
                <>
                    {/* Header del Modal */}
                    <div className="p-6 border-b min-w-[500px] max-md:min-w-auto border-slate-100 flex justify-between items-center bg-white">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Crear Nuevo Servicio</h2>
                            <p className="text-xs text-slate-400">Introduce los detalles del servicio técnico</p>
                        </div>
                    </div>

                    {/* Formulario */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <div className="space-y-4">
                            {/* Campo Código */}
                            <Input
                                label="Código Identificador"
                                name="codigo_servicio"
                                placeholder="Ej: SERV-001"
                                value={formData.codigo_servicio}
                                onChange={(e) => handleInputChange('codigo_servicio', e.target.value)}
                                error={errors.codigo_servicio}
                            />

                            {/* Campo Nombre */}
                            <Input
                                label="Nombre del Servicio"
                                name="nombre_servicio"
                                placeholder="Nombre descriptivo"
                                value={formData.nombre_servicio}
                                onChange={(e) => handleInputChange('nombre_servicio', e.target.value)}
                                error={errors.nombre_servicio}
                            />

                            {/* Campo Descripción */}
                            <TextArea
                                label="Descripción"
                                name="descripcion"
                                placeholder="Detalles sobre el proceso o materiales..."
                                value={formData.descripcion}
                                onChange={(e) => handleInputChange('descripcion', e.target.value)}
                                error={errors.descripcion}
                            />
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleFormClose}
                                className="flex-1 py-3.5 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-[2] py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Guardar Servicio
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </>
            }
        />
    );
}