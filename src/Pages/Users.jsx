import React, { useEffect, useState } from 'react';
import TablaUsuarios from "../Componets/Users/TablaUsuarios";

export default function User() {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [gerencias, setGerencias] = useState([]);
    const [roles, setRoles] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const host = window.location.hostname;

    const fetchContext = async () => {
        try {
            const resp = await fetch(`http://${host}:5000/context`, { credentials: 'include' });
            if (resp.ok) {
                const data = await resp.json();
                const gOpts = (data.gerencias || []).map(g => ({ value: g.id_gerencia, label: g.nombre_gerencia }));
                const rOpts = (data.roles || []).map(r => ({ value: r.id_rol, label: r.nombre_rol }));
                setGerencias(gOpts);
                setRoles(rOpts);
            }
        } catch (e) {
            console.error('Error fetching context', e);
        }
    };

    const fetchSession = async () => {
        try {
            const resp = await fetch(`http://${host}:5000/auth/check-session`, { credentials: 'include' });
            if (resp.ok) {
                const js = await resp.json();
                const rol = js?.datauser?.rol ?? js?.datauser?.id_rol ?? null;
                setIsAdmin(Number(rol) === 1 || Number(rol) === 5 || Boolean(js?.datauser?.isAdmin));
            } else {
                setIsAdmin(false);
            }
        } catch (e) {
            console.error('Session check error', e);
            setIsAdmin(false);
        }
    };

    const fetchUsers = async (page = currentPage) => {
        setLoading(true);
        try {
            const resp = await fetch(`http://${host}:5000/users?page=${page}&limit=12`, { credentials: 'include' });
            if (resp.ok) {
                const j = await resp.json();
                setUsers(j.usuarios || []);
                setCurrentPage(Number(j.page) || 1);
                setTotalPages(Number(j.totalPages) || 1);
            } else {
                console.error('Failed to fetch users', resp.status);
            }
        } catch (e) {
            console.error('Error fetching users', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSession();
        fetchContext();
        fetchUsers(1);
    }, []);

    return (
        <>
            <div className="z-10 ml-[60px] max-lg:ml-0 md:h-[calc(100dvh-60px)] h-auto bg-gray-50 flex overflow-hidden">
                <div className="grid max-lg:flex max-lg:flex-col   max-lg:pb-40 overflow-hidden h-screen max-lg:overflow-y-auto  z-10 grid-cols-5 grid-rows-10 gap-2  w-full p-2 iten  ">
                    <div className="col-start-1  col-end-5 row-start-1 row-end-10 relative max-lg:calc(90vh-140px)] flex flex-col ">
                        <TablaUsuarios
                            data={users}
                            gerencias={gerencias}
                            roles={roles}
                            loading={loading}
                            isAdmin={isAdmin}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => {
                                if (page < 1 || page > totalPages) return;
                                setCurrentPage(page);
                                fetchUsers(page);
                            }}
                            onUserCreated={() => fetchUsers(currentPage)}
                        />
                    </div>
                    <div className="col-start-5 relative col-end-6 row-start-1 row-end-10 flex flex-col max-sm:h-max w-full  bg-white/80 backdrop-blur-md border border-gray-200 gap-6 rounded-3xl shadow-2xl p-6 transition-all duration-300 hover:shadow-blue-100/50">

                        {/* Cabecera del Panel Lateral */}
                        <div className="space-y-1">
                            <h3 className="text-xl  text-gray-800 tracking-tight">Panel de Control</h3>

                        </div>

                        <div className="flex flex-col gap-4">
                            {/* Card: Total Usuarios */}
                            <div className="group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 transition-transform hover:scale-[1.02]">
                                <div>
                                    <p className="text-xs font-bold text-blue-600 uppercase">Usuarios</p>
                                    <p className="text-2xl font-black text-blue-900">{users.length}</p>
                                </div>
                                <div className="p-3 bg-blue-500 rounded-xl shadow-lg shadow-blue-200">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                </div>
                            </div>

                            {/* Card: Roles */}
                            <div className="group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-100 transition-transform hover:scale-[1.02]">
                                <div>
                                    <p className="text-xs font-bold text-purple-600 uppercase">Roles</p>
                                    <p className="text-2xl font-black text-purple-900">{roles.length}</p>
                                </div>
                                <div className="p-3 bg-purple-500 rounded-xl shadow-lg shadow-purple-200">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                </div>
                            </div>

                            {/* Card: Gerencias */}
                            <div className="group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 transition-transform hover:scale-[1.02]">
                                <div>
                                    <p className="text-xs font-bold text-emerald-600 uppercase">Gerencias</p>
                                    <p className="text-2xl font-black text-emerald-900">{gerencias.length}</p>
                                </div>
                                <div className="p-3 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-200">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Footer de Estado con Estilo "Glass" */}
                        <div className="mt-auto">
                            <div className="p-4 rounded-2xl bg-gray-900 text-white shadow-xl overflow-hidden relative">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2">
                                        <span className={`relative flex h-3 w-3`}>
                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isAdmin ? 'bg-green-400' : 'bg-red-400'} opacity-75`}></span>
                                            <span className={`relative inline-flex rounded-full h-3 w-3 ${isAdmin ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        </span>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Acceso</p>
                                    </div>
                                    <p className="mt-1 text-sm font-medium italic">
                                        {isAdmin ? 'Administrador Maestro' : 'Acceso Restringido'}
                                    </p>
                                </div>
                                {/* Adorno visual de fondo */}
                                <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
                            </div>
                            <p className="text-center text-[10px] text-gray-400 mt-4 font-mono uppercase tracking-tighter">
                                Host: {host}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
