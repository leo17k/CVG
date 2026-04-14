import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthToken.jsx';

const ProtectedRoute = () => {
    const { isAuthenticated, loading, permiso } = useAuth();
    const location = useLocation();
    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="text-xl font-semibold text-blue-700">Cargando estado de la sesión...</div>
            </div>
        ); // O un spinner
    }


    if (isAuthenticated) {
        const roleName = permiso?.nombre_rol?.toString()?.toLowerCase() || '';


        if (location.pathname === '/login') {
            if (roleName.includes('admin') || roleName.includes('administrador')) {
                return <Navigate to="/dashboard-admin" replace />;
            }
            return <Navigate to="/dashboard" replace />;
        }

        // Protección por ruta específica: Solo admins pueden acceder a /dashboard-admin
        if (location.pathname === '/dashboard-admin') {
            if (roleName.includes('admin') || roleName.includes('administrador')) {
                return <Outlet />;
            }
            return <Navigate to="/dashboard" replace />;
        }

        // Si intenta acceder al dashboard de usuario y es admin => redirige al admin dashboard
        if (location.pathname === '/dashboard') {
            if (roleName.includes('admin') || roleName.includes('administrador')) {
                return <Navigate to="/dashboard-admin" replace />;
            }
            return <Outlet />;
        }

        // Restricción para que los usuarios no naveguen a rutas protegidas de administración
        const restrictedPaths = ['/usuarios', '/inventario', '/formulario', '/backup'];
        if (restrictedPaths.some(p => location.pathname.toLowerCase().startsWith(p))) {
            if (!(roleName.includes('admin') || roleName.includes('administrador'))) {
                return <Navigate to="/dashboard" replace />;
            }
        }

        // Por defecto permitir acceso a otras rutas protegidas
        return <Outlet />;
    }

    // Si NO está autenticado, redirige al componente de Login y guarda la ruta original
    return <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedRoute;