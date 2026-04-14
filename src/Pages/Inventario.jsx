import Nav from '../Componets/Nav';
import Bg from '../Componets/bg';
import Sidebar from '../Componets/Componentes Grandes/Siderbar';
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../Constext/AuthToken";
import TablaInventario from "../Componets/Inventario/TablaInventario";


const inventario = () => {
    const { datauser } = useAuth();
    const [activeTab, setActiveTab] = useState('productos');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchData = async (tab) => {
        setLoading(true);
        try {
            const apiUrl = `http://${window.location.hostname}:5000/${tab}`;
            const resp = await fetch(apiUrl, { credentials: 'include' });
            if (resp.ok) {
                const result = await resp.json();
                setData(result.data || []);
            } else {
                setData([]);
            }
        } catch (error) {
            console.error("Error al obtener datos:", error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(activeTab);
    }, [activeTab]);

    const handleSelectTab = (tab) => {
        setActiveTab(tab);
    };

    return (
        <>
            <Nav />
            <Bg />
            <Sidebar />

                                    

            <div className="z-10 ml-[60px] max-lg:ml-0 md:h-[calc(100dvh-60px)] h-auto bg-gray-50 flex overflow-hidden">

                <div className="grid max-lg:flex max-lg:flex-col   max-lg:pb-40 overflow-hidden h-screen max-lg:overflow-y-auto  z-10 grid-cols-5 grid-rows-10 gap-2  w-full p-2 iten  ">

                    <div className="col-start-1  col-end-4 row-start-1 row-end-10 relative max-lg:calc(90vh-140px)] ">
                        <TablaInventario 
                            data={data} 
                            loading={loading}
                            alSeleccionar={handleSelectTab} 
                            isAdmin={datauser?.isAdmin}
                            onCreated={() => fetchData(activeTab)} 
                        />
                    </div>
                </div>
            </div>

        </>
    );
};

export default inventario;