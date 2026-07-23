import Nav from '../Componets/Nav';
import Bg from '../Componets/bg';
import Sidebar from '../Componets/Componentes Grandes/Siderbar';
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../Constext/AuthToken";
import TablaInventario from "../Componets/Inventario/TablaInventario";

const LIMIT = 30;

const inventario = () => {
    const { datauser } = useAuth();
    const [activeTab, setActiveTab] = useState('productos');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Estado de paginación — solo aplica a la pestaña "productos"
    const [currentPage, setCurrentPage]   = useState(1);
    const [totalPages,  setTotalPages]    = useState(1);
    const [totalItems,  setTotalItems]    = useState(0);
    const [searchQuery, setSearchQuery]   = useState('');
    const [filterCategoria, setFilterCategoria] = useState('');

    /**
     * Carga datos del servidor.
     * - Para "productos": paginación server-side con page / limit / search / id_categoria
     * - Para otras pestañas: carga completa sin paginación
     */
    const fetchData = useCallback(async (tab, page = 1, search = '', categoria = '') => {
        setLoading(true);
        try {
            let url;
            if (tab === 'productos') {
                const params = new URLSearchParams({
                    page,
                    limit: LIMIT,
                    ...(search    && { search }),
                    ...(categoria && { id_categoria: categoria }),
                });
                url = `http://${window.location.hostname}:5000/productos?${params}`;
            } else {
                url = `http://${window.location.hostname}:5000/${tab}`;
            }

            const resp = await fetch(url, { credentials: 'include' });
            if (resp.ok) {
                const result = await resp.json();
                setData(result.data || []);

                if (tab === 'productos') {
                    setCurrentPage(result.currentPage || 1);
                    setTotalPages(result.totalPages  || 1);
                    setTotalItems(result.total        || 0);
                }
            } else {
                setData([]);
            }
        } catch (error) {
            console.error("Error al obtener datos:", error);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Carga inicial y al cambiar de pestaña
    useEffect(() => {
        // Reset paginación al cambiar tab
        setCurrentPage(1);
        setTotalPages(1);
        setSearchQuery('');
        setFilterCategoria('');
        fetchData(activeTab, 1, '', '');
    }, [activeTab]);

    const handleSelectTab = (tab) => {
        setActiveTab(tab);
    };

    /** Cambio de página desde el footer de la tabla */
    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > totalPages) return;
        setCurrentPage(newPage);
        fetchData(activeTab, newPage, searchQuery, filterCategoria);
    };

    /** Filtros desde el modal de filtros de TablaInventario */
    const handleFilter = ({ search = '', categoria = '' } = {}) => {
        setSearchQuery(search);
        setFilterCategoria(categoria);
        setCurrentPage(1);
        fetchData(activeTab, 1, search, categoria);
    };

    return (
        <>
            <div className="z-10 ml-[60px] max-lg:ml-0 md:h-[calc(100dvh-60px)] h-auto bg-gray-50 flex overflow-hidden">
                <div className="grid max-lg:flex max-lg:flex-col max-lg:pb-40 overflow-hidden h-screen max-lg:overflow-y-auto z-10 grid-cols-5 grid-rows-10 gap-2 w-full p-2">
                    <div className="col-start-1 col-end-4 row-start-1 row-end-10 relative">
                        <TablaInventario
                            data={data}
                            loading={loading}
                            alSeleccionar={handleSelectTab}
                            isAdmin={datauser?.isAdmin}
                            onCreated={() => fetchData(activeTab, currentPage, searchQuery, filterCategoria)}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            onPageChange={handlePageChange}
                            onFilter={handleFilter}
                            searchQuery={searchQuery}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default inventario;