import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../Constext/AuthToken";
import TablaServicios from "../Componets/Servicios/TablaServicios";
import ModalServicio from "../Componets/Servicios/ModalServicios"; // Crea este archivo
import ModalNuevoServicio from "../Componets/Servicios/ModalNuevoServicio"; // Crea este archivo

const Servicios = () => {
    const { datauser } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    // Estados para Modales
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null); // Si es null, es "Nuevo"

    const fetchData = useCallback(async (page = currentPage) => {
        setLoading(true);
        try {
            const apiUrl = `http://${window.location.hostname}:5000/Servicios?page=${page}&limit=10`;
            const resp = await fetch(apiUrl, { credentials: 'include' });
            if (resp.ok) {
                const result = await resp.json();
                setData(result.data || []);
                setTotalPages(result.totalPages || 1);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    }, [currentPage]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Abrir modal para Crear
    const handleNuevo = () => {
        setSelectedItem(null);
        setCreateModalOpen(true);
    };

    // Abrir modal para Editar
    const handleEditar = (item) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    return (
        <div className="z-10 ml-[60px] max-lg:ml-0 md:h-[calc(100dvh-60px)] max-sm:h-[calc(100dvh-60px)] bg-gray-50 flex overflow-hidden">
            <div className="flex flex-col w-full p-4">
                <TablaServicios
                    data={data}
                    visualLoading={loading}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setCurrentPage(page)}
                    openModal={handleEditar} // Ahora abre edición
                    setCreateModalOpen={handleNuevo} // Abre creación
                    isAdmin={datauser?.isAdmin}
                />

                {isModalOpen && (
                    <ModalServicio
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        item={selectedItem}
                        onSuccess={() => {
                            setIsModalOpen(false);
                            fetchData();
                        }}
                    />
                )}
                <ModalNuevoServicio
                    isOpen={isCreateModalOpen}
                    onClose={() => setCreateModalOpen(false)}
                    onSuccess={() => {
                        setCreateModalOpen(false);
                        fetchData(); // Recarga la tabla para ver el nuevo servicio
                    }}
                />

            </div>
        </div>
    );
};

export default Servicios;