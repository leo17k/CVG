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

    // Configura Axios para enviar credenciales (cookies)
    // Asumiendo que tu backend Express corre en el puerto 5000
    const api = axios.create({
        baseURL: `http://${window.location.hostname}:5000`,
        withCredentials: true, // ¡Crucial para enviar la cookie de sesión!
    });

    const getDataUser = async () => {
        try {
            const response = await api.post('/perfil');
            
            setDatauser(response.data);
            console.log("datauser", response.data);

        } catch (error) {
            console.error('Error al obtener datos del usuario:', error);
        }
    };
    const getUsuarios = async () => {


    }
const insertarSolicitud = async (titulo, justificacion, monto) => {
try{
    const response = await api.post('/crearsolicitud', {
        titulo,
        justificacion,
        monto
    });
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
            setLoading(true);
            const response = await api.post('/login', {
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
            console.error('Error al intentar iniciar sesión:', error.response?.data?.message || error.message);
            setIsAuthenticated(false);
            return { success: false, error: error.response?.data || error.message };
        } finally {
            setLoading(false);
        }
    };

    // 🚪 FUNCIÓN DE LOGOUT
    const logout = async () => {
        try {
            // Llama a la ruta de logout en el backend para destruir la sesión y la cookie
            await api.post('/logout');
            setIsAuthenticated(false);
            console.log('Sesión cerrada correctamente.');
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
                await api.get('/check-session');
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
        datauser
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};