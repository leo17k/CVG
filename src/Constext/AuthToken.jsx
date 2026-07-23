// src/Context/AuthToken.jsx

import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';



// =========================================================
// 1. CREACIÓN DEL CONTEXTO
// =========================================================
const AuthContext = createContext();

// =========================================================
// 2. HOOK PERSONALIZADO
// Permite que cualquier componente acceda fácilmente al contexto
// =========================================================
export const useAuth = () => {
    return useContext(AuthContext);
};

// =========================================================
// 3. PROVEEDOR DEL CONTEXTO
// =========================================================
export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [datauser, setDatauser] = useState(null);
    const [permiso, setPermiso] = useState({id_rol: "", nombre_rol: ""});

    // Catálogos compartidos
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [services, setServices] = useState([]);

    // Configura Axios para enviar credenciales (cookies)
    // Asumiendo que tu backend Express corre en el puerto 5000
    const api = axios.create({
        baseURL: `http://${window.location.hostname}:5000`,
        withCredentials: true, // ¡Crucial para enviar la cookie de sesión!
    });

    // Axios instance configured for API calls (no global loader)

    const getDataUser = async () => {
        try {
            const response = await api.post('/perfil');
            
            setDatauser(response.data);
            console.log("datauser", response.data);

        } catch (error) {
            console.error('Error al obtener datos del usuario:', error);
        }
    };
    
    const fetchCatalogs = async () => {
        try {
            // Solo categorías y servicios se usan desde el contexto global.
            // Los productos se cargan localmente en cada módulo que los necesita
            // para evitar traer miles de registros al arrancar la app.
            const [catRes, servRes] = await Promise.all([
                api.get('/categorias'),
                api.get('/Servicios')
            ]);

            setCategories(catRes?.data?.data || catRes?.data || []);
            setServices(servRes?.data?.data  || servRes?.data  || []);
        } catch (err) {
            console.warn('No se pudieron cargar catálogos:', err.message || err);
            setCategories([]);
            setServices([]);
        }
    };
    const getUsuarios = async () => {


    }
const insertarSolicitud = async (
    resumen,
    justificacion,
    requerimientos_texto,
    justificacionFile,    // File | null — el objeto File del PDF de justificación
    requerimientosFile,   // File | null — el objeto File del PDF de requerimientos
    productos,            // [{ id_producto, nombre_producto, cantidad }]
    tipo_solicitud,
    prioridad,
    usuario
) => {
    try {
        let response;
        const productosJSON = JSON.stringify(productos || []);

        if (justificacionFile instanceof File || requerimientosFile instanceof File) {
            // Hay PDF(s): enviar como multipart/form-data
            const fd = new FormData();
            fd.append('resumen',              resumen              || '');
            fd.append('justificacion',        justificacion        || '');
            fd.append('requerimientos_texto', requerimientos_texto || '');
            fd.append('productos',            productosJSON);
            fd.append('tipo_solicitud',       tipo_solicitud || 'Compra');
            fd.append('prioridad',            prioridad      || 'Media');
            if (usuario) fd.append('usuario', usuario);

            if (justificacionFile instanceof File) {
                fd.append('justificacion_pdf', justificacionFile);
            }
            if (requerimientosFile instanceof File) {
                fd.append('requerimientos_pdf', requerimientosFile);
            }

            response = await api.post('/crearsolicitud', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        } else {
            // Sin PDF: enviar como JSON normal
            response = await api.post('/crearsolicitud', {
                resumen,
                justificacion,
                requerimientos_texto,
                productos:     productosJSON,
                tipo_solicitud,
                prioridad,
                usuario
            });
        }

        return response.data;
    } catch (error) {
        console.error('Error al insertar solicitud:', error);
        throw error;
    }
}
    const permite = async () => {
        try {
            const response = await api.post('/perfil');
           
            const role = { id_rol: response.data.data.id_rol, nombre_rol: response.data.data.rol };
            setPermiso(role);

            return role;

        } catch (error) {
            console.error('Error al obtener datos del usuario:', error);
            return null;
        }
    };

    // 🔑 FUNCIÓN CRUCIAL: Maneja la petición de login (Código que ya tenías)
    const login = async (username, password) => {
        try {
            const response = await api.post('/auth/login', {
                username: username,
                password: password,
            });

            console.log('/login response:', response?.status, response?.data);
            if (response.status === 200) {
                console.log('Sesión iniciada. Cookie guardada por el navegador.');
              
                const role = await permite();

                setIsAuthenticated(true);
                console.log('login() obtuvo role:', role);
                return { success: true, role };
            }
            return { success: false };
        } catch (error) {
            const errorData = error.response?.data;
            let errorMessage = 'Nombre de usuario o contraseña incorrectos.';
            if (errorData) {
                if (typeof errorData === 'string') {
                    errorMessage = errorData;
                } else if (typeof errorData.message === 'string') {
                    errorMessage = errorData.message;
                } else if (typeof errorData.error === 'string') {
                    errorMessage = errorData.error;
                } else if (errorData.data) {
                    if (typeof errorData.data.message === 'string') {
                        errorMessage = errorData.data.message;
                    } else if (typeof errorData.data.error === 'string') {
                        errorMessage = errorData.data.error;
                    }
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            console.error('Error al intentar iniciar sesión:', errorMessage);
            setIsAuthenticated(false);
            return { success: false, error: errorMessage };
        }
    };

    // 🚪 FUNCIÓN DE LOGOUT
    const logout = async () => {
        try {
            // Llama a la ruta de logout en el backend para destruir la sesión y la cookie
            await api.post('/auth/logout');
            setIsAuthenticated(false);
            console.log('Sesión cerrada correctamente.');
            window.location.reload();
        } catch (error) {
            console.error('Error al cerrar sesión', error);
            // Aunque falle la llamada, por seguridad, asumimos que la sesión ha terminado en el frontend
            setIsAuthenticated(false);
        }
    };

    // 🔄 EFECTO: VERIFICAR LA SESIÓN AL CARGAR LA APP
    // Esto se ejecuta una vez cuando el componente se monta para saber si la cookie ya existe.
    useEffect(() => {
        const checkSession = async () => {
            try {
                // Llama a una ruta simple que solo devuelve 200 si la cookie/sesión es válida
                await api.get('/auth/check-session');
                setIsAuthenticated(true);
                // Obtener y almacenar el rol si la sesión es válida
                await permite();
            } catch (error) {
                // Si falla (ej: 401 Unauthorized), no hay sesión o la cookie ha expirado
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
            }
        };
        checkSession();
    }, []); // El array vacío asegura que se ejecute solo al montar

    // Cargar catálogos al montar para que estén disponibles en toda la app
    useEffect(() => {
        fetchCatalogs();
    }, []);

    // =========================================================
    // 4. VALOR DEL CONTEXTO
    // =========================================================
    const value = {
        isAuthenticated,
        loading,
        login,
        logout,
        permite,
        permiso,
        insertarSolicitud,
        api,
        getDataUser,
        datauser,
        // Permite actualizar el avatar en el contexto sin recargar desde el servidor
        updateAvatar: (avatarUrl) => setDatauser(prev => prev ? ({ ...prev, data: { ...prev.data, avatar: avatarUrl } }) : prev),
        // Catálogos de productos/servicios para el formulario de solicitudes
        categories,
        products,
        services,
        fetchCatalogs,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};