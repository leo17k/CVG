const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/Componets/Almacen/Tabla.jsx');
let content = fs.readFileSync(file, 'utf8');

// Normalize to LF for reliable replacement
content = content.replace(/\r\n/g, '\n');

const CLOSING = `        </>
    );
};

export default Tabla;`;

const MODALS = `
            {/* Modal: Enviar Mensaje sobre Solicitud */}
            {mensajeModalOpen && mensajeSolicitud && (
                <Modal
                    isOpen={mensajeModalOpen}
                    onClose={() => setMensajeModalOpen(false)}
                    contenido={
                        <div className="flex flex-col gap-5">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                                    <MessageSquare size={22} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold tracking-tight text-slate-900">Enviar Mensaje</h3>
                                    <p className="text-sm text-slate-500 font-medium">
                                        Solicitud #{mensajeSolicitud.id_solicitud} — {mensajeSolicitud.resumen}
                                    </p>
                                </div>
                            </div>
                            <TextArea
                                label="Observación / Mensaje"
                                name="mensaje"
                                value={mensajeTexto}
                                onChange={e => setMensajeTexto(e.target.value)}
                                placeholder="Escribe tu observación sobre esta solicitud..."
                            />
                            <div className="flex justify-between gap-2 mt-1">
                                <button
                                    onClick={() => setMensajeModalOpen(false)}
                                    className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors text-sm font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleEnviarMensaje}
                                    disabled={isSendingMensaje || !mensajeTexto.trim()}
                                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-bold shadow-md shadow-blue-200"
                                >
                                    <MessageSquare size={14} />
                                    {isSendingMensaje ? 'Enviando...' : 'Enviar mensaje'}
                                </button>
                            </div>
                        </div>
                    }
                />
            )}

            {/* Modal: Codificar — Crear Producto en Inventario */}
            {codificarOpen && codificarSolicitud && (
                <Modal
                    isOpen={codificarOpen}
                    onClose={() => setCodificarOpen(false)}
                    contenido={
                        <div className="flex flex-col gap-5">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-100">
                                    <Sparkles size={22} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold tracking-tight text-slate-900">Crear en Inventario</h3>
                                    <p className="text-sm text-slate-500 font-medium">
                                        Solicitud #{codificarSolicitud.id_sol_prod} — verifica los datos antes de registrar
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <Input
                                        label="Nombre del producto *"
                                        name="nombre_producto"
                                        value={codificarData.nombre_producto || ''}
                                        onChange={e => setCodificarData(p => ({ ...p, nombre_producto: e.target.value }))}
                                    />
                                </div>
                                <Input
                                    label="Código de referencia"
                                    name="codigo_producto"
                                    value={codificarData.codigo_producto || ''}
                                    onChange={e => setCodificarData(p => ({ ...p, codigo_producto: e.target.value }))}
                                />
                                <Input
                                    label="Stock mínimo de alerta"
                                    name="stock_minimo"
                                    type="number"
                                    value={codificarData.stock_minimo ?? 0}
                                    onChange={e => setCodificarData(p => ({ ...p, stock_minimo: e.target.value }))}
                                />
                                <div className="col-span-2">
                                    <Select
                                        label="Categoría *"
                                        name="id_categoria"
                                        value={codificarData.id_categoria || ''}
                                        onChange={e => setCodificarData(p => ({ ...p, id_categoria: e.target.value }))}
                                        options={contextData.categorias.map(c => ({ value: c.id_categoria, label: c.nombre_categoria }))}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <TextArea
                                        label="Descripción / Especificaciones técnicas"
                                        name="descripcion"
                                        value={codificarData.descripcion || ''}
                                        onChange={e => setCodificarData(p => ({ ...p, descripcion: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between gap-2 mt-1">
                                <button
                                    onClick={() => setCodificarOpen(false)}
                                    className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors text-sm font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        if (!codificarData.nombre_producto?.trim() || !codificarData.id_categoria) {
                                            toast.error('Error — Nombre y categoría son obligatorios.');
                                            return;
                                        }
                                        setConfirmCodificarOpen(true);
                                    }}
                                    disabled={isCodifying}
                                    className="flex items-center gap-2 px-5 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors text-sm font-bold shadow-md shadow-amber-200"
                                >
                                    <Sparkles size={14} />
                                    {isCodifying ? 'Creando...' : 'Crear en inventario'}
                                </button>
                            </div>
                        </div>
                    }
                />
            )}

            {/* Confirmación: crear producto */}
            <ConfirmationModal
                isOpen={confirmCodificarOpen}
                type="warning"
                title="¿Crear este producto?"
                message={"Se registrará \\"" + (codificarData.nombre_producto || 'el producto') + "\\" en el inventario y la solicitud quedará marcada como procesada."}
                onConfirm={() => { setConfirmCodificarOpen(false); handleCodificarSubmit(); }}
                onCancel={() => setConfirmCodificarOpen(false)}
            />

        </>
    );
};

export default Tabla;`;

if (!content.includes(CLOSING)) {
    console.error('ERROR: Closing marker not found');
    process.exit(1);
}

content = content.replace(CLOSING, MODALS);
fs.writeFileSync(file, content, 'utf8');
console.log('OK - modals inserted. Total lines:', content.split('\n').length);
