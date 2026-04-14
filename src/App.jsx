import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './Constext/AuthToken';
import ProtectedRoute from './Constext/ProtectedRoute';
import GuestRoute from './Constext/GuestRoute';
import Login from './Pages/login';
import Lading from './Pages/Lading';
import Sidebar from './Componets/Componentes Grandes/Siderbar';
import Bg from './Componets/bg';
import Nav from './Componets/Nav';
import Dashboard from './Pages/Dashboard';
import DashboardAdmin from './Pages/DasboaradAdmi';
import Formulario from './Pages/Formullario';
import User from './Pages/Users';
import CentroCostes from './Pages/CentroCoste';
import { Form } from 'lucide-react';
import { SocketProvider } from './Constext/SocketContext';
import { Outlet } from 'react-router-dom';
import Inventario from './Pages/Inventario';
import BackupDatabase from './Pages/BackupDatabase';

const Settings = () => <h1>Ajustes (PROTEGIDA)</h1>;

function App() {
  return (
    <BrowserRouter>
      {/* Envuelve toda la aplicación con el proveedor de autenticación */}
      <AuthProvider>




        <Routes>
          {/* Rutas Públicas */}
          <Route element={<SocketProvider><Outlet /></SocketProvider>}>

            <Route path="/" element={<Lading />} />
          </Route>

          <Route element={<GuestRoute />}>
            <Route path="/login" element={<Login />} />

          </Route>

          {/* Rutas Protegidas:
             ProtectedRoute como elemento padre.
            Todas las rutas anidadas solo serán accesibles si isAuthenticated es TRUE.
          */}

          <Route element={<ProtectedRoute />}>
            <Route element={<SocketProvider><Outlet /></SocketProvider>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard-admin" element={<DashboardAdmin />} />
              <Route path='/Formulario' element={<Formulario />} />
              <Route path='/usuarios' element={<User />} />

              <Route path='/centro-costes' element={<CentroCostes />} />
              <Route path='/Inventario' element={<Inventario />} />
              <Route path='/backup' element={<BackupDatabase />} />
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