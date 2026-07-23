import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
// Asegúrate de importar el contexto correcto
import { AuthContext } from '../Constext/AuthContext'; 

/**
 * Componente que protege una ruta, asegurando que solo usuarios autenticados accedan.
 * Usa Outlet para renderizar las rutas anidadas.
 */
const PrivateRoute = () => {
  // Asegúrate de que el path al AuthContext sea correcto
  const { user, loading } = useContext(AuthContext); 

  // 1. Si todavía está cargando la validación inicial
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="ml-3 text-indigo-700">Verificando sesión...</p>
      </div>
    );
  }

  // 2. Si NO hay usuario, redirige a la página de login
  if (!user) {
    // Reemplaza '/login' con la ruta de tu componente de login
    return (<><p>problemas</p></>);
  }

  // 3. Si hay usuario, renderiza el contenido de la ruta anidada
  // El contenido real (e.g., Dashboard) se renderizará en el <Outlet />
  return <Outlet />;
};

export default PrivateRoute;