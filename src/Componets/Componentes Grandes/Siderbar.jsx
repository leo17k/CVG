// sidebarConfig.js
import Logo from "../logo.jsx"
import { useAuth } from '../../Constext/AuthToken';
import { HandCoins, Users, Building2, Package, Database, } from 'lucide-react';
// Nota: Reemplaza las rutas (href) y los paths SVG (figura) con tus valores reales.
export const sidebarLinks = [
    {
        id: 1,
        text: 'Peticion a Compra',
        href: '/dashboard-admin',
        iconPath: <HandCoins className="size-5 stroke-1.5" />
    },
    {
        id: 1,
        text: 'Peticion a Compra',
        href: '/dashboard',
        iconPath: <HandCoins className="size-5 stroke-1.5" />
    },
    {
        id: 2,
        text: 'Usuarios',
        href: '/usuarios',
        iconPath: <Users className="size-5 stroke-1.5" />
    },
    {
        id: 2,
        text: 'Centro de costes',
        href: '/centro-costes',
        iconPath: <Building2 className="size-5 stroke-1.5" />
    },

    {
        id: 3,
        text: 'Inventario',
        href: '/inventario',
        iconPath: <Package className="size-5 stroke-1.5" />
    },
    {
        id: 4,
        text: 'Respaldos DB',
        href: '/backup',
        iconPath: <Database className="size-5 stroke-1.5" />
    }
];

import React, { useState } from 'react';
import '../../assets/Style/Sidebar.css';

const Icono = ({ color, size, className, path }) => {
    // Si no hay path, usamos uno por defecto
    const defaultPath = '<path d="M12 2L2 12h3v8h14v-8h3z" />';
    const pathToRender = path ? path : defaultPath;

    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            stroke={color ? color : "currentColor"} // 'currentColor' es mejor en minúsculas
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            /* Esta es la clave para renderizar el string del path */
            dangerouslySetInnerHTML={{ __html: pathToRender }}
        />
    );
};
const IconsSiderbar = ({ isOpen, isActive, text, iconPath, href }) => {
    const baseClasses = `group relative flex items-center p-2 rounded-xl 
        transition-all duration-300 ease-in-out cursor-pointer w-full mb-1`;

    const activeClasses = isActive
        ? 'bg-blue-600/10 text-blue-600 shadow-sm'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900';

    return (
        <a href={href} className={`${baseClasses} ${activeClasses} ${!isOpen ? 'justify-center' : ''}`}>
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
        </a>
    );
};

const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const currentPath = window.location.pathname;
    const { datauser } = useAuth();
    // Obtenemos los datos del usuario logueado

    const roleName = datauser?.data?.rol?.toString()?.toLowerCase() || '';
    const isAdmin = roleName.includes('admin') || roleName === '1';

    const toggleSidebar = () => setIsOpen(!isOpen);

    return (
        <aside
            className={`absolute left-0 top-0 h-screen transition-all duration-500 ease-in-out 
    border-r border-slate-200/60 bg-white/70 backdrop-blur-xl flex flex-col


    ${isOpen
                    ? 'w-[240px] px-4' // Abierto: Ancho normal
                    : 'w-[60px] px-2 max-lg:w-0 max-lg:px-0 max-lg:border-none' // Cerrado: 0 ancho en móvil
                } 
    /* Configuración para Desktop (sm en adelante) */
    ${isOpen ? 'max-lg:z-12 z-12' : 'max-lg:z-10 z-10'} 
    `}
        >
            {/* Contenedor del Botón Hamburger - SIEMPRE VISIBLE en móvil */}
            <div className={`h-16 flex transition-all duration-500 ease-in-out items-center ${isOpen ? 'justify-end max-lg:translate-x-[190px]' : 'justify-center'} 
        max-lg:fixed max-lg:z-10 max-lg:left-0 max-lg:top-0 -mt-2  max-lg:w-12 max-lg:h-16 `}>
                <label className="hamburger cursor-pointer scale-75 ">
                    <input type="checkbox" onClick={toggleSidebar} checked={isOpen} readOnly />
                    <svg viewBox="0 0 32 32">
                        <path className="line line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"></path>
                        <path className="line" d="M7 16 27 16"></path>
                    </svg>
                </label>
            </div>

            {/* Envoltorio para ocultar contenido cuando el ancho es 0 */}
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
                    {sidebarLinks
                        .filter(link => {
                            const href = link.href.toLowerCase();
                            if (isAdmin) {
                                // Si es admin, oculta el dashboard del usuario estándar
                                if (href === '/dashboard') return false;
                                return true;
                            } else {
                                // Si no es admin, oculta las opciones de admin
                                const isRestricted = ['/dashboard-admin', '/usuarios', '/inventario', '/backup'].includes(href);
                                return !isRestricted;
                            }
                        })
                        .map((link) => (
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