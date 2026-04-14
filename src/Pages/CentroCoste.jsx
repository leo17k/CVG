import Nav from '../Componets/Nav';
import Bg from '../Componets/bg';
import Sidebar from '../Componets/Componentes Grandes/Siderbar';
import React, { useState, useEffect, useCallback } from "react";
import TablaUsuarios from "../Componets/Users/TablaUsuarios";
import TablaGerencias from "../Componets/Users/TablaGerencias";
import { Filter, User as UserIcon, Building2 } from "lucide-react";
import { useAuth } from "../Constext/AuthToken";
import { TextArea, Select, Input } from '../Componets/Inputs';
import DashboardPresupuesto from "../Componets/Users/Presupuesto";
import ResumenLogisticoStats from "../Componets/Users/Card";
import DashboardGastoPorUsuario from "../Componets/Users/PresupuestoUser";

const CentroCostes = () => {
    const { datauser } = useAuth();

    // Estados de datos
    const [users, setUsers] = useState([]);
    const [gerencias, setGerencias] = useState([]);
    const [loading, setLoading] = useState(false);
    const [GerenciasPresupuesto, setGerenciasPresupuesto] = useState([]);
    const isAdmin = datauser?.data?.isAdmin || false;

    // Estados de filtros
    const [selectedGerencia, setSelectedGerencia] = useState("");
    const [selectedColumna, setSelectedColumna] = useState("nombres");
    const [valorBusqueda, setValorBusqueda] = useState("");
    const [isUserorGerencia, setIsUserorGerencia] = useState(true);

    useEffect(() => {
        const fetchGerencias = async () => {
            try {
                const response = await fetch(`http://${window.location.hostname}:5000/gerencias`, {
                    credentials: 'include'
                });
                const data = await response.json();
                setGerenciasPresupuesto(data.gerencias);

            } catch (error) {
                console.error('Error al obtener gerencias:', error);
            }
        };

        fetchGerencias();
    }, []);

    // 1. Cargar Contexto Inicial (Gerencias)
    useEffect(() => {
        const hostname = window.location.hostname;
        fetch(`http://${hostname}:5000/context`, { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                const ops = data.gerencias.map(g => ({
                    value: g.id_gerencia,
                    label: g.nombre_gerencia
                }));
                setGerencias(ops);
            })
            .catch(err => console.error("Error al cargar contexto:", err));
    }, []);

    // 2. Función de Petición al Backend (Filtrado Server-side)
    const fetchFilteredData = useCallback(() => {
        setLoading(true);
        const hostname = window.location.hostname;

        // Construimos los Query Params
        const query = new URLSearchParams();
        if (selectedGerencia) query.append("gerencia", selectedGerencia);
        if (selectedColumna && valorBusqueda) {
            query.append("columna", selectedColumna);
            query.append("busqueda", valorBusqueda);
        }

        fetch(`http://${hostname}:5000/users?${query.toString()}`, {
            credentials: 'include'
        })
            .then(res => res.json())
            .then(data => {
                setUsers(data.usuarios || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error en búsqueda:", err);
                setLoading(false);
            });
    }, [selectedGerencia, selectedColumna, valorBusqueda]);

    // 3. Implementación de Debounce
    // Esto evita que se haga una petición por cada letra escrita.
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchFilteredData();
        }, 500); // Espera 500ms después de que el usuario deja de interactuar

        return () => clearTimeout(timer);
    }, [fetchFilteredData]);

    return (
        <>
            <Nav />
            <Bg />
            <Sidebar />

            <div className="z-10 ml-[60px] max-lg:ml-0 md:h-[calc(100dvh-60px)] h-auto bg-gray-50 flex overflow-hidden">

                <div className="grid max-lg:flex max-lg:flex-col   max-lg:pb-40 overflow-hidden h-screen max-lg:overflow-y-auto  z-10 grid-cols-5 grid-rows-10 gap-2  w-full p-2 iten  ">

                    <div className="col-start-1  col-end-4 row-start-1 row-end-10 relative max-lg:calc(90vh-140px)] flex flex-col pt-3">
                        {loading && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-20 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-blue-600 font-bold text-xs tracking-widest uppercase">Cargando...</span>
                                </div>
                            </div>
                        )}



                        <TablaGerencias
                            gerencias={GerenciasPresupuesto}
                            loading={loading}
                        />


                    </div>
                    <div className="col-start-4 relative col-end-6 row-start-1 row-end-10 flex flex-col w-full overflow-visible  bg-white/50 gap-4 rounded-2xl shadow-lg p-4">

                        {/* Gráfica de Recharts */}
                        <div className="flex flex-col px-2 gap-2  flex-1 w-full ">
                            <ResumenLogisticoStats solicitudes={GerenciasPresupuesto} />

                            <DashboardPresupuesto gerencias={GerenciasPresupuesto} />
                        </div>

                    </div>
                </div>
            </div >
        </>
    );
};

export default CentroCostes;