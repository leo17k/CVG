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
    const { login } = useAuth();
    const navigate = useNavigate();

    // Estados del componente
    const [page, setPage] = useState('login');
    const [step, setStep] = useState(1);
    const [resultServer, setResultServer] = useState('');

    // Estado del formulario unificado
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        address: ''
    });

    const onNavigate = (targetPage) => {
        setPage(targetPage);
        setStep(1);
        setResultServer('');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: value }));
    };

    // --- Lógica del Registro Multi-paso ---

    const handleNext = async () => {
        // Validación básica
        if (step === 1 && (!formData.firstName || !formData.lastName || !formData.username)) {
            setResultServer("Por favor, complete todos los campos requeridos.");
            return;
        }
        if (step === 2 && (!formData.email || !formData.phone)) {
            setResultServer("Por favor, complete todos los campos requeridos.");
            return;
        }
        if (step === 3 && (formData.password !== formData.confirmPassword || !formData.password)) {
            setResultServer("Las contraseñas no coinciden o están vacías.");
            return;
        }

        setResultServer('');
        setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
            setResultServer('');
        }
    };

    // Función de Registro (Usa fetch, no usa el contexto Auth, tal como en tu código original)
    const handleSubmitRegister = async (e) => {
        e.preventDefault();
        setResultServer('');

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
            setResultServer('¡Cuenta creada exitosamente! Inicia sesión ahora.');
            onNavigate('login');
        } catch (error) {
            console.error("Error al enviar el formulario:", error);
            setResultServer(`Error al registrar: ${error.message}`);
        }
    };


    // 🔑 LÓGICA DE LOGIN (Usando useAuth) - ahora redirige según rol
    const handleLogin = async (e) => {
        e.preventDefault();
        setResultServer('');

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
        } else {
            setResultServer('Nombre de usuario o contraseña incorrectos.');
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
                        <Input label="Nombre" name="firstName" value={formData.firstName} onChange={handleChange} />
                        <Input label="Apellido" name="lastName" value={formData.lastName} onChange={handleChange} />
                        <Input label="Nombre de usuario" name="username" value={formData.username} onChange={handleChange} />
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
                        <Input label="Correo Electrónico" type="email" name="email" value={formData.email} onChange={handleChange} />
                        <Input label="Teléfono" type="tel" name="phone" value={formData.phone} onChange={handleChange} />
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
                        <Input label="Contraseña" type="password" name="password" value={formData.password} onChange={handleChange} />
                        <Input label="Confirmar Contraseña" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} />
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
                        <Input label="Dirección" name="address" value={formData.address} onChange={handleChange} />
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

    const renderLoginForm = () => (
        <form onSubmit={handleLogin} className="flex flex-col items-center w-full mt-4">
            {resultServer && <p className="text-red-600 text-sm mt-2 mb-4 font-medium">{resultServer}</p>}

            <Input
                label="Usuario"
                name="username"
                value={formData.username}
                onChange={handleChange}
            />
            <Input
                label="Contraseña"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
            />

            {/* <button
                type="button"
                className="mt-4 bg-white border border-gray-300 rounded-lg w-full max-w-xs shadow-md px-6 py-3 flex items-center justify-center space-x-2 text-base font-medium hover:bg-gray-50 transition-all duration-200"
            >
                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="24" height="24" viewBox="0 0 48 48" className="mr-2">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                </svg>
                <span>Continuar con Google</span>
            </button> */}

            <button
                type="submit"
                className="bg-blue-700 w-full max-w-xs mt-4 mb-2 text-white rounded-lg px-6 py-3 flex items-center justify-center text-base font-medium hover:bg-blue-800 hover:scale-[1.02] transition-all duration-200 shadow-lg"
            >
                Iniciar Sesión
            </button>
        </form>
    );

    return (
        <div className="flex justify-center relative items-center min-h-screen bg-gray-50 p-4">
            <Bg />
            <div className="flex z-10 flex-col animacion-entrada items-center bg-white justify-center shadow-2xl h-auto w-full max-w-md py-8 px-12 rounded-xl border border-gray-100">
                <div className="text-center x flex-col items-center flex w-full">
                    <Logo width={'auto'} height={'80px'} />
                    <h1 className="text-3xl font-extrabold my-4 text-gray-800">
                        {page === 'register' ? 'Crear Cuenta' : 'Iniciar Sesión'}
                    </h1>

                    {page === 'register' ? renderRegisterForm() : renderLoginForm()}

                    <span className="mt-5 text-sm text-gray-600">
                        {page === 'register' ? (
                            <>
                                ¿Ya tienes una cuenta?{" "}
                                <button type="button" onClick={() => onNavigate('login')} className="text-blue-700 font-medium hover:underline">
                                    Iniciar Sesión
                                </button>
                            </>
                        ) : (
                            <>
                                ¿No tienes una cuenta?{" "}
                                <button type="button" onClick={() => onNavigate('register')} className="text-blue-700 font-medium hover:underline">
                                    Regístrate
                                </button>
                            </>
                        )}
                    </span>
                </div>
            </div>
        </div>



    );



};
export default Login;