import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthToken.jsx'; // RUTA CORREGIDA: Importa como archivo hermano

/**
 * Componente para proteger rutas públicas (como /login, /register).
 * Si el usuario ya está autenticado, lo redirige a la ruta que estaba intentando ver 
 * o al dashboard por defecto.
 */
const GuestRoute = () => {
    const { isAuthenticated, loading, permiso } = useAuth();
    const location = useLocation();

    // 1. Manejo del estado de carga 
    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="text-xl font-semibold text-blue-700">Cargando estado de la sesión...</div>
            </div>
        );
    }

    // 2. Lógica principal: Si está autenticado, redirige
    if (isAuthenticated) {
        // Busca la ruta anterior guardada por ProtectedRoute
        const intendedPath = location.state?.from?.pathname;
        console.log('GuestRoute: isAuthenticated true, permiso:', permiso, 'intendedPath:', intendedPath);

        if (intendedPath) {
            return <Navigate to={intendedPath} replace />;
        }

        // Si no hay ruta previa, redirige según el rol
        const roleName = permiso?.nombre_rol?.toString()?.toLowerCase() || '';
        if (roleName.includes('admin') || roleName.includes('administrador')) {
            return <Navigate to={'/dashboard-admin'} replace />;
        }

        return <Navigate to={'/dashboard'} replace />;
    }

    // 3. Si NO está autenticado, permite que renderice la ruta pública (ej: LoginApp)
    return <Outlet />;
};

export default GuestRoute;