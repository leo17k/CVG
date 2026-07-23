import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './Constext/AuthToken';
import ProtectedRoute from './Constext/ProtectedRoute';
import GuestRoute from './Constext/GuestRoute';
import Login from './Pages/login';
import Markdowneditor from './Componets/Mackdown';
import Lading from './Pages/Lading';
import Sidebar from './Componets/Componentes Grandes/Siderbar';
import Bg from './Componets/bg';
import Nav from './Componets/Nav';
import Dashboard from './Pages/Dashboard';
import DashboardAdmin from './Pages/DasboaradAdmi';
import Formulario from './Pages/Formullario';
import User from './Pages/Users';
import RolesPage from './Pages/Roles';
import PermisosPage from './Pages/Permisos';
import CentroCostes from './Pages/CentroCoste';
import { Form } from 'lucide-react';
import { SocketProvider } from './Constext/SocketContext';
import { Outlet } from 'react-router-dom';
import Inventario from './Pages/Inventario';
import BackupDatabase from './Pages/BackupDatabase';
import AlmacenDasboard from './Pages/Almacen';
import ComprasPage from './Pages/Compras';
import Servicios from './Pages/Servicios';
import GoeyToaster, { GooeyToaster } from './Componets/GoeyToaster';
import MigracionAccess from './Pages/MigracionAccess';
import GestionBaseDatos from './Pages/GestionBaseDatos';
import FloatingHelpWidget from './Componets/Dasboard/FloatingHelpWidget';



const Settings = () => <h1>Ajustes (PROTEGIDA)</h1>;

// Layout for authenticated routes
const MainLayout = () => {
  return (
    <>
      <Nav />
      <Bg />
      <Sidebar />
      <Outlet />
      <FloatingHelpWidget />
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      {/* Envuelve toda la aplicación con el proveedor de autenticación */}
      <AuthProvider>
        <GooeyToaster position="top-center" closeButton showProgress preset="bouncy" />




        <Routes>
          {/* Rutas Públicas */}
          <Route element={<SocketProvider><Outlet /></SocketProvider>}>

            <Route path="/" element={<Lading />} />
          </Route>

          <Route element={<GuestRoute />}>
            <Route path="/login" element={<Login />} />

          </Route>

          <Route element={<SocketProvider><MainLayout /></SocketProvider>}>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard-admin" element={<DashboardAdmin />} />
              <Route path='/Formulario' element={<Formulario />} />
              <Route path='/usuarios' element={<User />} />
              <Route path='/roles' element={<RolesPage />} />
              <Route path='/permisos' element={<PermisosPage />} />
              <Route path='/Almacen' element={<AlmacenDasboard />} />
              <Route path='/centro-costes' element={<CentroCostes />} />
              <Route path='/roles' element={<RolesPage />} />
              <Route path='/Inventario' element={<Inventario />} />
              <Route path='/Servicios' element={<Servicios />} />
              <Route path='/compras' element={<ComprasPage />} />
              <Route path='/backup' element={<BackupDatabase />} />
              <Route path='/migracion' element={<MigracionAccess />} />
              <Route path='/gestion-db' element={<GestionBaseDatos />} />

            </Route>
          </Route>

          {/* Ruta para cualquier otra cosa */}
          <Route path="*" element={<h1>404 Not Found</h1>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;