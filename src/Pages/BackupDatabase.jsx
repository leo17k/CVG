import Nav from '../Componets/Nav';
import Bg from '../Componets/bg';
import Sidebar from '../Componets/Componentes Grandes/Siderbar';
import React, { useState, useEffect, useCallback } from 'react';
import { Database, Download, Upload, AlertTriangle, ShieldCheck, CheckCircle, History, X } from 'lucide-react';
import AlertItem from '../Componets/Alerts.jsx';
import ConfirmationModal from '../Componets/Confirmacion.jsx';

const BackupDatabase = () => {
    const [mostrarPoliticas, setMostrarPoliticas] = useState(true);
    const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
    const [loadingExport, setLoadingExport] = useState(false);
    const [loadingImport, setLoadingImport] = useState(false);
    const [file, setFile] = useState(null);
    const [backupsList, setBackupsList] = useState([]);

    // --- ESTADOS Y MANEJO DE ALERTAS GLOBALES ---
    const [alerts, setAlerts] = useState([]);
    const [confModal, setConfModal] = useState({
        isOpen: false,
        type: 'question',
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const addAlert = useCallback((type, title, message) => {
        const id = Date.now();
        setAlerts(prev => [...prev, { id, type, title, message }]);
    }, []);

    const removeAlert = useCallback((id) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    }, []);

    const triggerAction = (config) => {
        setConfModal({
            isOpen: true,
            title: config.title,
            message: config.message,
            type: config.type,
            onConfirm: () => {
                config.action();
                setConfModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    useEffect(() => {
        fetchBackups();
    }, []);

    const fetchBackups = async () => {
        try {
            const res = await fetch(`http://${window.location.hostname}:5000/api/backup/list`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setBackupsList(data.backups);
            }
        } catch (e) {
            console.error("Error trayendo lista:", e);
        }
    };

    const handleExport = async () => {
        setLoadingExport(true);
        try {
            const res = await fetch(`http://${window.location.hostname}:5000/api/backup/export`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!res.ok) throw new Error("Error en la exportación");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Backup_BaseCvg_${new Date().toISOString().split('T')[0]}.sql`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            addAlert('success', 'Backup Exitoso', 'Base de datos exportada con éxito. Archivo descargado en tu equipo y conservado localmente.');
            fetchBackups();
        } catch (error) {
            console.error(error);
            addAlert('error', 'Error Exportando', 'Ocurrió un error al procesar el respaldo: ' + error.message);
        } finally {
            setLoadingExport(false);
        }
    };

    const handleImportSubmit = (e) => {
        e.preventDefault();
        if (!file) {
            addAlert('error', 'Falta archivo', 'Por favor, selecciona un archivo SQL primero para importar.');
            return;
        }

        triggerAction({
            title: "¿Restaurar Base de Datos?",
            message: "¡Peligro! Vas a sustituir todos los registros actuales de Cabelum por la versión cargada. Esto eliminará irremediablemente los datos añadidos después de la copia de seguridad. ¿Estás seguro de que quieres continuar?",
            type: "danger",
            action: async () => {
                setLoadingImport(true);
                const formData = new FormData();
                formData.append('backup', file);

                try {
                    const res = await fetch(`http://${window.location.hostname}:5000/api/backup/import`, {
                        method: 'POST',
                        credentials: 'include',
                        body: formData
                    });

                    if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error || "Error al intentar importar la base de datos.");
                    }

                    addAlert('success', 'Restauración Exitosa', '¡Base de datos restaurada correctamente! Sistema reconstruido.');
                    setFile(null);
                    document.getElementById('file-upload').value = null;
                } catch (error) {
                    console.error(error);
                    addAlert('error', 'Importación Fallida', error.message);
                } finally {
                    setLoadingImport(false);
                }
            }
        });
    };

    return (
        <>
            <Nav />
            <Bg />
            <Sidebar />

            {mostrarPoliticas && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 overflow-hidden backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-8 overflow-hidden shadow-2xl transform transition-all  text-center relative ">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                        <div className="w-20 h-20 bg-blue-50 cursor-default rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100">
                            <ShieldCheck className="w-10 h-10 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-slate-800 mb-3">Políticas de Respaldo Cabelum</h2>
                        <p className="text-slate-600 text-[15px] leading-relaxed mb-8">
                            Para garantizar la integridad de la base matriz (proyecto-cvg), se requiere exportar diariamente localmente un respaldo en turnos nocturnos o al cierre logístico. Los respaldos se deben rotar y guardar en entorno físico aislado. Esta sección es exclusiva para el Superadministrador.
                        </p>
                        <button
                            onClick={() => setMostrarPoliticas(false)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-3xl shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2 hover:-translate-y-1"
                        >
                            <CheckCircle className="w-5 h-5" />
                            Aceptar y Continuar
                        </button>
                    </div >
                </div >
            )}

            <div className={`z-10 ml-[60px] max-lg:ml-0 h-[calc(100dvh-60px)] max-lg:h-max overflow-auto bg-gray-50 flex overflow-y-auto ${mostrarPoliticas ? 'blur-[2px] select-none pointer-events-none' : ''}`}>

                {/* CONTENEDOR DE ALERTAS FLOTANTES */}
                <div className="fixed top-6 right-6 z-[100] flex flex-col items-end pointer-events-none">
                    {alerts.map(alert => (
                        <AlertItem key={alert.id} {...alert} onClose={removeAlert} />
                    ))}
                </div>

                {/* MODAL DE CONFIRMACIÓN ÚNICO Y DINÁMICO */}
                <ConfirmationModal
                    isOpen={confModal.isOpen}
                    title={confModal.title}
                    message={confModal.message}
                    type={confModal.type}
                    onConfirm={confModal.onConfirm}
                    onCancel={() => setConfModal(p => ({ ...p, isOpen: false }))}
                />

                <div className=" p-4 px-10 max-lg:px-4 w-full h-max mx-auto overflow-y-auto">
                    <div className="mb-8 flex items-center gap-4">
                        <div className="size-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <Database className="size-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Gestión de Respaldos</h1>
                            <p className="text-slate-500 font-medium">Módulo de Seguridad Exclusivo para Superadministradores</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 ">
                        {/* PANEL DE EXPORTACIÓN */}
                        <div className="bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-200 hover:shadow-md transition-all flex flex-col">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>

                            <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-blue-600">
                                <Download className="w-6 h-6" />
                            </div>

                            <h3 className="text-xl font-bold text-slate-800 mb-2">Generar Backup</h3>
                            <p className="text-slate-500 text-sm mb-6 leading-relaxed flex-1">
                                Descarga una copia consolidada de todas las tablas, inventario y registros. Se exportará como <span className="font-mono text-slate-700 font-semibold bg-slate-100 px-1 rounded">.sql</span>.
                            </p>

                            <button
                                onClick={handleExport}
                                disabled={loadingExport}
                                className={`w-full py-4 px-6 rounded-2xl font-bold text-white shadow-md transition-all flex items-center justify-center gap-3 ${loadingExport ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 hover:-translate-y-0.5'}`}
                            >
                                {loadingExport ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Generando respaldo...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-5 h-5" />
                                        Descargar Base de Datos
                                    </>
                                )}
                            </button>
                        </div>

                        {/* PANEL DE IMPORTACIÓN */}
                        <div className="bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-200 hover:shadow-md transition-all flex flex-col">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500"></div>

                            <div className="bg-amber-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-amber-600">
                                <Upload className="w-6 h-6" />
                            </div>

                            <h3 className="text-xl font-bold text-slate-800 mb-2">Restaurar Sistema</h3>
                            <p className="text-slate-500 text-sm mb-4 leading-relaxed">
                                Selecciona un archivo <span className="font-mono text-slate-700 font-semibold bg-slate-100 px-1 rounded">.sql</span> de una copia de seguridad previa.
                            </p>
                            <div className="mb-4 bg-red-50 text-red-800 text-[11px] px-3 py-2 rounded-lg font-bold border border-red-100 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" /> ¡El reemplazo borrará la base actual!
                            </div>

                            <form onSubmit={handleImportSubmit} className="mt-auto">
                                <div className="mb-4 relative">
                                    <input
                                        type="file"
                                        id="file-upload"
                                        accept=".sql"
                                        onChange={(e) => setFile(e.target.files[0])}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${file ? 'border-amber-400 bg-amber-50' : 'border-slate-300 hover:border-amber-400 hover:bg-slate-50'}`}>
                                        <Database className={`w-6 h-6 mx-auto mb-2 ${file ? 'text-amber-500' : 'text-slate-400'}`} />
                                        {file ? (
                                            <p className="font-semibold text-amber-700 text-sm truncate px-2">{file.name}</p>
                                        ) : (
                                            <p className="text-xs text-slate-500 font-medium px-2">
                                                Arrastra o haz clic para subir archivo
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loadingImport || !file}
                                    className={`w-full py-4 px-6 rounded-2xl font-bold text-white shadow-md transition-all flex items-center justify-center gap-3 ${loadingImport || !file ? 'hidden' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-200 hover:-translate-y-0.5'}`}
                                >
                                    {loadingImport ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Restaurando Base de Datos...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-5 h-5" />
                                            Confirmar Restauración
                                        </>
                                    )}
                                </button>
                                {(!file && !loadingImport) && (
                                    <div className="w-full py-4 px-6 rounded-2xl font-bold text-slate-400 bg-slate-100 flex items-center justify-center gap-3 border border-slate-200 text-sm">
                                        Sube un archivo primero
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* PANEL DE HISTORIAL */}
                        <div className="bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-200 hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>

                            <div>
                                <div className="bg-emerald-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-emerald-600">
                                    <History className="w-6 h-6" />
                                </div>

                                <h3 className="text-xl font-bold text-slate-800 mb-2">Backups Locales</h3>
                                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                                    Registros preservados internamente en el servidor de Cabelum. Contiene la lista detallada.
                                </p>
                            </div>

                            <div>
                                <div className="mb-4 text-center font-semibold text-slate-700 bg-slate-50 rounded-xl py-2 border border-slate-100">
                                    <Database className="inline-block w-4 h-4 mr-2 text-emerald-500" /> {backupsList.length} Copias descubiertas
                                </div>
                                <button
                                    onClick={() => setMostrarModalHistorial(true)}
                                    className="w-full py-4 px-6 rounded-2xl font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 shadow-sm border border-emerald-200 transition-all flex items-center justify-center gap-3"
                                >
                                    <History className="w-5 h-5" />
                                    Ver copias de seguridad
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL HISTORIAL DE BACKUPS */}
            {
                mostrarModalHistorial && (
                    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-[24px] max-w-4xl w-full p-8 shadow-2xl relative max-h-[85vh] flex flex-col overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>

                            <button
                                onClick={() => setMostrarModalHistorial(false)}
                                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="bg-emerald-50 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                                    <History className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-800">Historial de Copias Locales</h3>
                                    <p className="text-slate-500 text-sm">Registro de archivos <span className="font-mono text-slate-700 font-semibold bg-slate-100 px-1 rounded">.sql</span> respaldados.</p>
                                </div>
                            </div>

                            <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 border border-slate-100 rounded-2xl">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50 sticky top-0 z-10">
                                        <tr className="border-b border-slate-200 text-slate-600 font-semibold">
                                            <th className="py-4 px-4">Archivo</th>
                                            <th className="py-4 px-4">Fecha de Creación</th>
                                            <th className="py-4 px-4 text-right">Tamaño</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {backupsList.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" className="text-center py-10 text-slate-400 font-medium">
                                                    No hay copias de seguridad resguardadas todavía en la carpeta.
                                                </td>
                                            </tr>
                                        ) : (
                                            backupsList.map((b, i) => (
                                                <tr key={i} className="border-b border-slate-50 hover:bg-emerald-50/50 transition-colors group/row">
                                                    <td className="py-4 px-4 font-medium text-blue-600 flex items-center gap-2">
                                                        <Database className="w-4 h-4 text-emerald-400" />
                                                        {b.name}
                                                    </td>
                                                    <td className="py-4 px-4 text-slate-500">
                                                        {new Date(b.date).toLocaleString('es-VE', { dateStyle: 'long', timeStyle: 'short' })}
                                                    </td>
                                                    <td className="py-4 px-4 text-slate-500 text-right font-medium">{b.size}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
};

export default BackupDatabase;
