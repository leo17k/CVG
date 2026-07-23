import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Asegúrate de que esta ruta sea correcta para tu estructura de archivos:
// Si el compilador falla, verifica la existencia de src/Context/AuthToken.jsx
import { useAuth } from '../Constext/AuthToken.jsx';
import { Input } from '../Componets/Inputs.jsx';
import Logo from '../Componets/logo.jsx';
import Bg from '../Componets/bg.jsx';




const Login = () => {
    // 🔑 Uso del hook de autenticación
    const { login, api } = useAuth();
    const navigate = useNavigate();

    // Estados del componente
    const [page, setPage] = useState('login');
    const [step, setStep] = useState(1);
    const [resultServer, setResultServer] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Estado del formulario unificado
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        address: '',
        token: ''
    });

    // Detectar token en URL para restablecimiento de contraseña
    React.useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const token = query.get('token');
        if (token) {
            setPage('reset');
            setFormData(prev => ({ ...prev, token }));
        }
    }, []);

    const onNavigate = (targetPage) => {
        setPage(targetPage);
        setStep(1);
        setResultServer('');
        setErrors({});
    };

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: value }));
        if (errors[name]) {
            setErrors(prev => {
                const newErr = { ...prev };
                delete newErr[name];
                return newErr;
            });
        }
    };

    // --- Lógica del Registro Multi-paso ---

    const handleNext = async () => {
        const stepErrors = {};
        if (step === 1) {
            if (!formData.firstName?.trim()) stepErrors.firstName = "El nombre es obligatorio";
            if (!formData.lastName?.trim()) stepErrors.lastName = "El apellido es obligatorio";
            if (!formData.username?.trim()) stepErrors.username = "El nombre de usuario es obligatorio";
        } else if (step === 2) {
            if (!formData.email?.trim()) {
                stepErrors.email = "El correo electrónico es obligatorio";
            } else if (!validateEmail(formData.email)) {
                stepErrors.email = "El formato de correo no es válido";
            }
            if (!formData.phone?.trim()) stepErrors.phone = "El teléfono es obligatorio";
        } else if (step === 3) {
            if (!formData.password) {
                stepErrors.password = "La contraseña es obligatoria";
            } else if (formData.password.length < 6) {
                stepErrors.password = "La contraseña debe tener al menos 6 caracteres";
            }
            if (!formData.confirmPassword) {
                stepErrors.confirmPassword = "Debe confirmar la contraseña";
            } else if (formData.password !== formData.confirmPassword) {
                stepErrors.confirmPassword = "Las contraseñas no coinciden";
            }
        }

        if (Object.keys(stepErrors).length > 0) {
            setErrors(stepErrors);
            setResultServer("Por favor, complete todos los campos requeridos correctamente.");
            return;
        }

        setErrors({});
        setResultServer('');
        setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
            setResultServer('');
            setErrors({});
        }
    };

    // Función de Registro (Usa fetch, no usa el contexto Auth, tal como en tu código original)
    const handleSubmitRegister = async (e) => {
        e.preventDefault();
        setResultServer('');

        if (!formData.address?.trim()) {
            setErrors({ address: "La dirección es obligatoria" });
            setResultServer("Por favor, complete todos los campos requeridos.");
            return;
        }

        setErrors({});
        try {
            // Nota: Aquí estás usando el puerto 5005 para Register, y 5000 para Login (en AuthToken.jsx)
            const response = await fetch('http://localhost:5005/Register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                // Leer el mensaje de error del backend si está disponible
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            // Registro exitoso
            onNavigate('login');
            setResultServer('¡Cuenta creada exitosamente! Inicia sesión ahora.');
        } catch (error) {
            console.error("Error al enviar el formulario:", error);
            setResultServer(`Error al registrar: ${error.message}`);
        }
    };


    // 🔑 LÓGICA DE LOGIN (Usando useAuth) - ahora redirige según rol
    const handleLogin = async (e) => {
        e.preventDefault();
        setResultServer('');

        const loginErrors = {};
        if (!formData.username?.trim()) loginErrors.username = "El nombre de usuario es obligatorio";
        if (!formData.password) loginErrors.password = "La contraseña es obligatoria";

        if (Object.keys(loginErrors).length > 0) {
            setErrors(loginErrors);
            return;
        }

        setErrors({});
        setResultServer('Verificando credenciales...');
        setLoading(true);

        try {
            const result = await login(formData.username, formData.password);
            console.log('handleLogin result from context.login:', result);

            if (result?.success) {
                setResultServer('Autenticación exitosa. Redirigiendo...');
                const roleName = result.role?.nombre_rol?.toString()?.toLowerCase() || '';
                console.log("Rol del usuario:", roleName);
                if (roleName.includes('admin') || roleName.includes('administrador')) {
                    navigate('/dashboard-admin');
                } else {
                    navigate('/dashboard');
                }
                return;
            }

            const errorMsg = typeof result?.error === 'object'
                ? (result.error.message || result.error.error || JSON.stringify(result.error) || 'Nombre de usuario o contraseña incorrectos.')
                : (result?.error || 'Nombre de usuario o contraseña incorrectos.');
            setResultServer(errorMsg);
        } catch (err) {
            console.error('handleLogin exception:', err);
            setResultServer(err.message || 'Ocurrió un error al iniciar sesión.');
        } finally {
            setLoading(false);
        }
    };

    // Lógica para enviar correo de recuperación
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setResultServer('');

        if (!formData.email?.trim()) {
            setErrors({ email: "El correo electrónico es obligatorio" });
            setResultServer('Por favor, ingresa tu correo electrónico.');
            return;
        } else if (!validateEmail(formData.email)) {
            setErrors({ email: "El formato de correo no es válido" });
            setResultServer('El formato de correo no es válido.');
            return;
        }

        setErrors({});
        setLoading(true);
        try {
            const response = await api.post('/auth/forgot-password', { email: formData.email });
            if (response.data?.success) {
                setResultServer('Se ha enviado un correo con instrucciones para restablecer tu contraseña.');
            } else {
                setResultServer(response.data?.message || 'Error al solicitar el enlace de recuperación.');
            }
        } catch (error) {
            console.error('Error in forgot password request:', error);
            setResultServer(error.response?.data?.message || 'Ocurrió un error al procesar tu solicitud.');
        } finally {
            setLoading(false);
        }
    };

    // Lógica para restablecer contraseña
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setResultServer('');

        const resetErrors = {};
        if (!formData.password) {
            resetErrors.password = "La contraseña es obligatoria";
        } else if (formData.password.length < 6) {
            resetErrors.password = "La contraseña debe tener al menos 6 caracteres";
        }
        if (!formData.confirmPassword) {
            resetErrors.confirmPassword = "Debe confirmar la contraseña";
        } else if (formData.password !== formData.confirmPassword) {
            resetErrors.confirmPassword = "Las contraseñas no coinciden";
        }

        if (Object.keys(resetErrors).length > 0) {
            setErrors(resetErrors);
            setResultServer('Por favor, completa correctamente todos los campos.');
            return;
        }

        setErrors({});
        setLoading(true);
        try {
            const response = await api.post('/auth/reset-password', {
                token: formData.token,
                newPassword: formData.password
            });
            if (response.data?.success) {
                setResultServer('Contraseña restablecida con éxito. Redirigiendo al login...');
                setTimeout(() => {
                    window.history.replaceState({}, document.title, window.location.pathname);
                    setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
                    onNavigate('login');
                }, 3000);
            } else {
                setResultServer(response.data?.message || 'Error al restablecer la contraseña.');
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            setResultServer(error.response?.data?.message || 'Ocurrió un error al restablecer la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    // ----------------------------------------------------
    // RENDERS
    // ----------------------------------------------------

    const renderRegisterForm = () => {
        // Envolvemos los pasos en un <form> que maneja la acción final
        if (page !== 'register') return null;

        return (
            <div className="flex relative flex-col items-center w-full">

                {resultServer && <p className="text-red-600 text-sm mt-2 mb-4 font-medium">{resultServer}</p>}

                {step === 1 && (
                    <form className="flex flex-col items-center w-full" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
                        <h1 className="text-2xl mb-4 text-gray-800 font-bold">Información Personal</h1>
                        <Input label="Nombre" name="firstName" value={formData.firstName} onChange={handleChange} error={errors.firstName} />
                        <Input label="Apellido" name="lastName" value={formData.lastName} onChange={handleChange} error={errors.lastName} />
                        <Input label="Nombre de usuario" name="username" value={formData.username} onChange={handleChange} error={errors.username} />
                        <button
                            type="submit"
                            className="mt-4 bg-blue-700 text-white rounded-lg w-full max-w-xs shadow-md px-6 py-3 flex items-center justify-center text-sm font-medium hover:bg-blue-800 hover:scale-[1.02] transition-all duration-200"
                        >
                            Siguiente
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form className="flex flex-col items-center w-full" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
                        <h1 className="text-2xl mb-4 text-gray-800 font-bold">Información de Contacto</h1>
                        <Input label="Correo Electrónico" type="email" name="email" value={formData.email} onChange={handleChange} error={errors.email} />
                        <Input label="Teléfono" type="tel" name="phone" value={formData.phone} onChange={handleChange} error={errors.phone} />
                        <div className="flex justify-between gap-4 w-full mt-4 max-w-xs">
                            <button
                                type="button"
                                onClick={handleBack}
                                className="bg-gray-300 w-1/2 text-gray-700 rounded-lg px-6 py-3 flex items-center justify-center text-sm font-medium hover:bg-gray-400 transition-all duration-200"
                            >
                                Volver
                            </button>
                            <button
                                type="submit"
                                className="bg-blue-700 w-1/2 text-white rounded-lg px-6 py-3 flex items-center justify-center text-sm font-medium hover:bg-blue-800 hover:scale-[1.02] transition-all duration-200"
                            >
                                Siguiente
                            </button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <form className="flex flex-col items-center w-full" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
                        <h1 className="text-2xl mb-4 text-gray-800 font-bold">Contraseña</h1>
                        <Input label="Contraseña" type="password" name="password" value={formData.password} onChange={handleChange} error={errors.password} />
                        <Input label="Confirmar Contraseña" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword} />
                        <div className="flex justify-between gap-4 w-full mt-4 max-w-xs">
                            <button
                                type="button"
                                onClick={handleBack}
                                className="bg-gray-300 w-1/2 text-gray-700 rounded-lg px-6 py-3 flex items-center justify-center text-sm font-medium hover:bg-gray-400 transition-all duration-200"
                            >
                                Volver
                            </button>
                            <button
                                type="submit"
                                className="bg-blue-700 w-1/2 text-white rounded-lg px-6 py-3 flex items-center justify-center text-sm font-medium hover:bg-blue-800 hover:scale-[1.02] transition-all duration-200"
                            >
                                Siguiente
                            </button>
                        </div>
                    </form>
                )}

                {step === 4 && (
                    <form className="flex flex-col items-center w-full" onSubmit={handleSubmitRegister}>
                        <h1 className="text-2xl mb-4 text-gray-800 font-bold">Dirección</h1>
                        <Input label="Dirección" name="address" value={formData.address} onChange={handleChange} error={errors.address} />
                        <div className="flex justify-between gap-4 w-full mt-4 max-w-xs">
                            <button
                                type="button"
                                onClick={handleBack}
                                className="bg-gray-300 w-1/2 text-gray-700 rounded-lg px-6 py-3 flex items-center justify-center text-sm font-medium hover:bg-gray-400 transition-all duration-200"
                            >
                                Volver
                            </button>
                            <button
                                type="submit"
                                className="bg-green-600 w-1/2 text-white rounded-lg px-6 py-3 flex items-center justify-center text-sm font-medium hover:bg-green-700 hover:scale-[1.02] transition-all duration-200 shadow-lg"
                            >
                                Crear Cuenta
                            </button>
                        </div>
                    </form>
                )}
            </div>
        );
    };

    const renderLoginForm = () => {
        const loginMessage = resultServer || (loading ? 'Verificando credenciales...' : '');
        const isError = loginMessage && !loginMessage.includes('exitosa') && !loginMessage.includes('Verificando') && !loginMessage.includes('exitosamente');
        const isSuccess = loginMessage && (loginMessage.includes('exitosa') || loginMessage.includes('exitosamente'));

        return (
            <form onSubmit={handleLogin} className="flex flex-col items-center w-full mt-4">
                {loginMessage && (
                    <div className={`text-xs w-full max-w-xs mb-4 text-center rounded-xl p-3 border font-semibold ${
                        isError 
                            ? 'bg-rose-50 text-rose-700 border-rose-100' 
                            : isSuccess
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-blue-50 text-blue-700 border-blue-100'
                    }`} aria-live="polite">
                        {loginMessage}
                    </div>
                )}

                <Input
                    label="Usuario"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    error={errors.username}
                />
                <Input
                    label="Contraseña"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-700 w-full max-w-xs mt-4 mb-2 text-white rounded-lg px-6 py-3 flex items-center justify-center text-base font-medium hover:bg-blue-800 hover:scale-[1.02] transition-all duration-200 shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? 'Verificando...' : 'Iniciar Sesión'}
                </button>

                <button
                    type="button"
                    onClick={() => onNavigate('forgot')}
                    className="text-sm text-blue-700 font-medium hover:underline mt-2"
                >
                    ¿Olvidaste tu contraseña?
                </button>
            </form>
        );
    };

    const renderForgotForm = () => (
        <form onSubmit={handleForgotPassword} className="flex flex-col items-center w-full mt-4">
            <p className="text-sm text-gray-500 mb-4 text-center max-w-xs">
                Ingresa el correo electrónico asociado a tu cuenta para recibir un enlace de recuperación.
            </p>
            {resultServer && (
                <p className={`text-sm mt-2 mb-4 font-medium text-center ${resultServer.includes('enviado') || resultServer.includes('instrucciones') ? 'text-green-600' : 'text-red-600'}`}>
                    {resultServer}
                </p>
            )}

            <Input
                label="Correo Electrónico"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
            />

            <button
                type="submit"
                disabled={loading}
                className="bg-blue-700 w-full max-w-xs mt-4 mb-2 text-white rounded-lg px-6 py-3 flex items-center justify-center text-base font-medium hover:bg-blue-800 hover:scale-[1.02] transition-all duration-200 shadow-lg disabled:opacity-50"
            >
                {loading ? 'Enviando...' : 'Enviar Instrucciones'}
            </button>
        </form>
    );

    const renderResetForm = () => (
        <form onSubmit={handleResetPassword} className="flex flex-col items-center w-full mt-4">
            <p className="text-sm text-gray-500 mb-4 text-center max-w-xs">
                Ingresa tu nueva contraseña para restablecer el acceso a tu cuenta.
            </p>
            {resultServer && (
                <p className={`text-sm mt-2 mb-4 font-medium text-center ${resultServer.includes('éxito') || resultServer.includes('correctamente') ? 'text-green-600' : 'text-red-600'}`}>
                    {resultServer}
                </p>
            )}

            <Input
                label="Nueva Contraseña"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
            />
            <Input
                label="Confirmar Contraseña"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
            />

            <button
                type="submit"
                disabled={loading}
                className="bg-blue-700 w-full max-w-xs mt-4 mb-2 text-white rounded-lg px-6 py-3 flex items-center justify-center text-base font-medium hover:bg-blue-800 hover:scale-[1.02] transition-all duration-200 shadow-lg disabled:opacity-50"
            >
                {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
            </button>
        </form>
    );

    return (
        <div className="flex justify-center relative items-center min-h-screen bg-gray-50 p-4">
            <Bg />
            <div className="flex z-10 flex-col animacion-entrada items-center bg-white justify-center shadow-2xl h-auto w-full max-w-md py-8 px-6 sm:px-12 rounded-xl border border-gray-100">
                <div className="text-center x flex-col items-center flex w-full">
                    <Logo width={'auto'} height={'80px'} />
                    <h1 className="text-3xl font-extrabold my-4 text-gray-800">
                        {page === 'register' 
                            ? 'Crear Cuenta' 
                            : page === 'forgot' 
                            ? 'Recuperar Contraseña' 
                            : page === 'reset' 
                            ? 'Nueva Contraseña' 
                            : 'Iniciar Sesión'}
                    </h1>

                    {page === 'register' 
                        ? renderRegisterForm() 
                        : page === 'forgot' 
                        ? renderForgotForm() 
                        : page === 'reset' 
                        ? renderResetForm() 
                        : renderLoginForm()}

                    <span className="mt-5 text-sm text-gray-600">
                        {page === 'register' ? (
                            <>
                                ¿Ya tienes una cuenta?{" "}
                                <button type="button" onClick={() => onNavigate('login')} className="text-blue-700 font-medium hover:underline">
                                    Iniciar Sesión
                                </button>
                            </>
                        ) : page === 'forgot' || page === 'reset' ? (
                            <>
                                ¿Recordaste tu contraseña?{" "}
                                <button type="button" onClick={() => onNavigate('login')} className="text-blue-700 font-medium hover:underline">
                                    Iniciar Sesión
                                </button>
                            </>
                        ) : (<> </>
                        )}
                    </span>
                </div>
            </div>
        </div>
    );
};
export default Login;