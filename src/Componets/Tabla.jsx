import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '../utils';

const Tabla = ({ className }) => {
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSolicitudes = async () => {
            try {
                const response = await fetch('http://localhost:5000/solicitudes', {
                    method: 'GET',
                    credentials: 'include',
                });
                const result = await response.json();
                console.log(result)

                // Verificamos si result.mensage es un arreglo. 
                // Si es un objeto solo, lo metemos dentro de un arreglo [].
                const datosValidados = Array.isArray(result.mensage)
                    ? result.mensage
                    : [result.mensage];

                setData(datosValidados);
            } catch (err) {
                console.error("Error al cargar datos:", err);
                setData([]); // En caso de error, dejamos la tabla vacía para que no explote
            } finally {
                setLoading(false);
            }
        };
        fetchSolicitudes();
    }, []);

    // 1. Definimos las cabeceras basadas en los datos de tu SQL
    const columnas = [
        { key: 'id_solicitud', label: 'ID' },
        { key: 'nombre_gerencia', label: 'Gerencia' },
        { key: 'nombre_completo', label: "Solicitante" },
        { key: 'justificacion', label: 'Justificación' },
        { key: 'monto_estimado', label: 'Monto' },
        { key: 'estado', label: 'Estado' },
        { key: 'fecha_creacion', label: 'Fecha' }
    ];

    const filteredData = useMemo(() => {
        return data.filter((item) =>
            Object.values(item).some((value) =>
                value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [data, searchTerm]);

    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const currentData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
    };

    if (loading) return <div className="p-10 text-center">Cargando solicitudes...</div>;

    return (
        <div className={cn("w-full h-full flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden", className)}>
            {/* Buscador */}
            <div className="shrink-0 p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar solicitud..."
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Filas:</span>
                    <select
                        className="border border-gray-300 rounded-lg text-sm p-1"
                        value={rowsPerPage}
                        onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                    </select>
                </div>
            </div>

            {/* Tabla Dinámica */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                            {columnas.map((col) => (
                                <th key={col.key} className="px-6 py-3 font-semibold">{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {currentData.length > 0 ? (
                            currentData.map((row) => (
                                <tr key={row.id_solicitud} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-900">#{row.id_solicitud}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-700">{row.nombre_gerencia}</div>
                                        <div className="text-xs text-gray-400">{row.codigo_gerencia}</div>
                                    </td>
                                    <td className="px-6 py-4">{row.nombre_completo}</td>
                                    <td className="px-6 py-4 max-w-xs truncate">{row.justificacion}</td>
                                    <td className="px-6 py-4 font-mono text-green-600">${Number(row.monto_estimado).toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-full text-xs font-bold",
                                            row.estado === 'Aprobado' ? "bg-green-100 text-green-700" :
                                                row.estado === 'Rechazado' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                                        )}>
                                            {row.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(row.fecha_creacion).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={columnas.length} className="px-6 py-10 text-center text-gray-500">No hay datos disponibles</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer de Paginación */}
            <div className="p-4 border-t flex items-center justify-between bg-white">
                <span className="text-sm text-gray-500">Página {currentPage} de {totalPages || 1}</span>
                <div className="flex gap-2">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 border rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 border rounded-lg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>
        </div>
    );
};

export default Tabla;