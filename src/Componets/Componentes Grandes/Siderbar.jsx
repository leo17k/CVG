// sidebarConfig.js
import Logo from "../logo.jsx"
import { useAuth } from '../../Constext/AuthToken';
import { HandCoins, Users, Key, Building2, Package, Database, Warehouse, ShoppingCart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const sidebarLinks = [
    {
        id: 1,
        text: 'Solicitudes',
        href: '/dashboard-admin',
        iconPath: <HandCoins className="size-5 stroke-1.5" />,
        roles: ['admin']
    },
    {
        id: 8,
        text: 'Solicitudes',
        href: '/dashboard',
        iconPath: <HandCoins className="size-5 stroke-1.5" />,
        roles: ['usuario', 'almacenista', 'comprador', 'gerente', 'personal']
    },
    {
        id: 2,
        text: 'Usuarios',
        href: '/usuarios',
        iconPath: <Users className="size-5 stroke-1.5" />,
        roles: ['admin']
    },
    {
        id: 7,
        text: 'Centro de costes',
        href: '/centro-costes',
        iconPath: <Building2 className="size-5 stroke-1.5" />,
        roles: ['admin', 'gerente']
    },
    {
        id: 3,
        text: 'Servicios',
        href: '/Servicios',
        iconPath: <Package className="size-5 stroke-1.5" />,
        roles: ['admin', 'comprador']
    },

    {
        id: 6,
        text: 'Almacen',
        href: '/Almacen',
        iconPath: <Warehouse className="size-5 stroke-1.5" />,
        roles: ['admin', 'almacenista']
    },
    {
        id: 4,
        text: 'Base de Datos',
        href: '/gestion-db',
        iconPath: <Database className="size-5 stroke-1.5" />,
        roles: ['admin']
    },
    {
        id: 5,
        text: 'Roles y permisos',
        href: '/roles',
        iconPath: <Key className="size-5 stroke-1.5" />,
        roles: ['admin']
    }
];

import React, { useState, useEffect } from 'react';
import '../../assets/Style/Sidebar.css';

const IconsSiderbar = ({ isOpen, isActive, text, iconPath, href }) => {
    const baseClasses = `group relative flex items-center p-2 rounded-xl 
        transition-all duration-300 ease-in-out cursor-pointer w-full mb-1`;

    const activeClasses = isActive
        ? 'bg-blue-600/10 text-blue-600 shadow-sm'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900';

    return (
        <Link to={href} className={`${baseClasses} ${activeClasses} ${!isOpen ? 'justify-center' : ''}`}>
            {/* Contenedor del Icono */}
            <div className={`flex items-center justify-center transition-all duration-300 ${isOpen ? 'mr-3' : 'w-full'}`}>
                {iconPath}
            </div>

            {/* Texto */}
            <span className={`overflow-hidden transition-all duration-300 whitespace-nowrap text-sm font-semibold 
                ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                {text}
            </span>

            {/* Indicador Activo sutil */}
            {isActive && isOpen && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-600"></div>
            )}
        </Link>
    );
};

const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const currentPath = location.pathname;
    const { datauser } = useAuth();
    
    // Función para determinar el rol del usuario de manera robusta
    const getUserRole = () => {
        const role = datauser?.data?.rol?.toString()?.toLowerCase() || '';
        const id   = Number(datauser?.data?.id_rol);

        if (role.includes('superadmin') || id === 5) return 'admin';
        if (role.includes('admin')      || id === 11) return 'admin';
        if (role.includes('gerente')    || id === 8)  return 'gerente';
        if (role.includes('comprador')  || id === 10) return 'comprador';
        if (role.includes('almacen')    || id === 9)  return 'almacenista';
        if (role.includes('personal')   || id === 12) return 'personal';
        return 'usuario';
    };

    const userRole = getUserRole();
    const isAdmin  = userRole === 'admin';

    const toggleSidebar = () => setIsOpen(!isOpen);

    // Cerrar sidebar automáticamente al cambiar de ruta
    useEffect(() => {
        setIsOpen(false);
    }, [currentPath]);

    // Función para filtrar los links según el rol
    const getFilteredLinks = () => {
        return sidebarLinks.filter(link => {
            // Si el link no tiene roles definidos, se muestra a todos
            if (!link.roles) return true;
            
            // Verificar si el rol del usuario está permitido para este link
            return link.roles.includes(userRole);
        });
    };

    const filteredLinks = getFilteredLinks();

    return (
        <aside
            className={`absolute left-0 top-0 h-screen transition-all duration-500 ease-in-out 
                border-r border-slate-200/60 bg-white/70 backdrop-blur-xl flex flex-col
                ${isOpen
                    ? 'w-60 px-4' // Abierto: Ancho normal (240px)
                    : 'w-14 px-2 max-lg:w-0 max-lg:px-0 max-lg:border-none' // Cerrado: 56px (approx 60px) y 0 en móvil
                } 
                ${isOpen ? 'max-lg:z-12 z-12' : 'max-lg:z-10 z-10'} 
            `}
        >
            {/* Contenedor del Botón Hamburger */}
            <div className={`h-16 flex transition-all duration-500 ease-in-out items-center ${isOpen ? 'justify-end max-lg:translate-x-48' : 'justify-center'} 
                max-lg:fixed max-lg:z-10 max-lg:left-0 max-lg:top-0 -mt-2 max-lg:w-12 max-lg:h-16`}>
                <label className="hamburger cursor-pointer scale-75">
                    <input type="checkbox" onClick={toggleSidebar} checked={isOpen} readOnly />
                    <svg viewBox="0 0 32 32">
                        <path className="line line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"></path>
                        <path className="line" d="M7 16 27 16"></path>
                    </svg>
                </label>
            </div>

            {/* Envoltorio para ocultar contenido cuando está cerrado */}
            <div className={`flex flex-col h-full transition-opacity duration-300 ${!isOpen ? 'max-lg:opacity-0 max-lg:pointer-events-none' : 'opacity-100'}`}>
                {/* Sección del Logo */}
                <div className={`flex items-center mb-6 mt-12 sm:mt-0 transition-all duration-300 ${isOpen ? 'px-2' : 'justify-center'}`}>
                    <div className="w-8 h-8 bg-blue-600 rounded-lg shrink-0 flex items-center justify-center text-white shadow-md">
                        <span className="text-xs font-bold">A</span>
                    </div>
                    {isOpen && <span className="ml-3 font-bold text-slate-800 truncate">AdminPanel</span>}
                </div>

                {/* Navegación */}
                <nav className="flex-1 flex flex-col">
                    {filteredLinks.map((link) => (
                        <IconsSiderbar
                            key={link.id}
                            isOpen={isOpen}
                            text={link.text}
                            href={link.href}
                            isActive={currentPath === link.href}
                            iconPath={link.iconPath}
                        />
                    ))}
                </nav>
            </div>
        </aside>
    );
};

export default Sidebar;