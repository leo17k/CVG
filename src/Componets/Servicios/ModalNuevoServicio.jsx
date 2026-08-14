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
    const [codigoManual, setCodigoManual] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData({ codigo_servicio: '', nombre_servicio: '', descripcion: '' });
            setCodigoManual(false);
            setErrors({});
        }
    }, [isOpen]);

    useEffect(() => {
        const cargarCodigoAutomatico = async () => {
            if (!isOpen || codigoManual) return;

            try {
                const res = await fetch(`http://${window.location.hostname}:5000/Servicios`, { credentials: 'include' });
                const data = await res.json().catch(() => ({ data: [] }));
                const items = Array.isArray(data?.data) ? data.data : [];
                const maxCodigo = items.reduce((max, item) => {
                    const value = Number(String(item.codigo_servicio || '').trim());
                    if (Number.isFinite(value) && value > max) return value;
                    return max;
                }, 0);

                if (maxCodigo >= 9999) {
                    setFormData(prev => ({ ...prev, codigo_servicio: '' }));
                    setErrors(prev => ({
                        ...prev,
                        codigo_servicio: 'Se alcanzó el máximo de 4 dígitos. El código 9999 ya existe.'
                    }));
                    return;
                }

                const nextCode = String((maxCodigo || 0) + 1).padStart(4, '0');
                setFormData(prev => ({ ...prev, codigo_servicio: nextCode }));
            } catch {
                setFormData(prev => ({ ...prev, codigo_servicio: '0001' }));
            }
        };

        cargarCodigoAutomatico();
    }, [isOpen, codigoManual]);

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

        const codigo = String(formData.codigo_servicio ?? '').trim();
        const codigoValido = /^\d{1,4}$/.test(codigo);

        const newErrors = {};
        if (codigoManual && !codigo) newErrors.codigo_servicio = "El código identificador es obligatorio";
        if (codigoManual && codigo && !codigoValido) newErrors.codigo_servicio = "El código debe ser numérico y máximo 4 dígitos";
        if (!codigoManual && !codigo) newErrors.codigo_servicio = 'No hay un código disponible. Ya se alcanzó el máximo permitido.';
        if (!formData.nombre_servicio?.trim()) newErrors.nombre_servicio = "El nombre del servicio es obligatorio";
        if (!formData.descripcion?.trim()) newErrors.descripcion = "La descripción es obligatoria";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error('Campos inválidos', { description: 'Por favor, revise el código y los campos obligatorios.' });
            return;
        }

        setErrors({});
        setLoading(true);

        try {
            const payload = {
                ...formData,
                codigo_servicio: codigoManual ? codigo : ''
            };

            const apiUrl = `http://${window.location.hostname}:5000/Servicios`;
            const resp = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
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
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nextManual = !codigoManual;
                                        setCodigoManual(nextManual);
                                        if (nextManual) {
                                            setFormData(prev => ({ ...prev, codigo_servicio: '' }));
                                            setErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors.codigo_servicio;
                                                return newErrors;
                                            });
                                        } else {
                                            setErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors.codigo_servicio;
                                                return newErrors;
                                            });
                                            const res = Number(String(formData.codigo_servicio || '').trim()) || 0;
                                            const nextCode = String(Math.min(res + 1, 9999)).padStart(4, '0');
                                            setFormData(prev => ({ ...prev, codigo_servicio: nextCode }));
                                        }
                                    }}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${codigoManual ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    {codigoManual ? 'Cambiar a código automático' : 'Código manual'}
                                </button>
                            </div>

                            <Input
                                label="Código Identificador"
                                name="codigo_servicio"
                                placeholder={codigoManual ? 'Ej: 0007' : 'Se generará automáticamente'}
                                value={formData.codigo_servicio}
                                disabled={!codigoManual}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                    handleInputChange('codigo_servicio', value);
                                }}
                                error={errors.codigo_servicio}
                            />

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