import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react"; // Opcional: Iconos para mejor estilo

export const BotonReporte = ({ idSolicitud }) => {
    const [cargando, setCargando] = useState(false);

    const manejarDescarga = async () => {
        setCargando(true);
        try {
            const response = await fetch(`http://${window.location.hostname}:5000/reporte`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/pdf',
                },
            });

            if (!response.ok) throw new Error('Error al generar el PDF');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Reporte_Solicitud_${idSolicitud}.pdf`);
            document.body.appendChild(link);
            link.click();

            // Limpieza
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error descargando el archivo:", error);
            alert("No se pudo generar el reporte. Inténtalo de nuevo.");
        } finally {
            setCargando(false);
        }
    };

    return (
        <button
            onClick={manejarDescarga}
            disabled={cargando}
            className={`flex items-center gap-2 text-xs   px-5 py-2.5 rounded-3xl  transition-all
                ${cargando
                    ? 'bg-blue-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-95'
                }`}
        >
            {cargando ? (
                <>
                    <Loader2 className="animate-spin w-4 h-4" />
                    <span className="max-sm:hidden">
                        Generando...
                    </span>
                </>
            ) : (
                <>
                    <FileDown className="w-4 h-4 " />
                    <span className="max-sm:hidden">
                        Descargar PDF
                    </span>
                </>
            )}
        </button>
    );
};